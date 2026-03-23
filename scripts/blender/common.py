"""
Shared utilities for Blender model generation scripts.
Creates materials, bones, weight painting, actions, and GLB export.
"""

import bpy
import math
import os


def hex_to_linear(hex_str: str) -> tuple:
    """Convert hex color string to linear RGB tuple (Blender uses linear)."""
    hex_str = hex_str.lstrip('#')
    r = int(hex_str[0:2], 16) / 255.0
    g = int(hex_str[2:4], 16) / 255.0
    b = int(hex_str[4:6], 16) / 255.0
    # sRGB to linear
    def to_linear(c):
        return c / 12.92 if c <= 0.04045 else ((c + 0.055) / 1.055) ** 2.4
    return (to_linear(r), to_linear(g), to_linear(b), 1.0)


def clear_scene():
    """Remove all objects, meshes, materials, and actions from the scene."""
    bpy.ops.object.select_all(action='SELECT')
    bpy.ops.object.delete()
    for block in bpy.data.meshes:
        bpy.data.meshes.remove(block)
    for block in bpy.data.materials:
        bpy.data.materials.remove(block)
    for block in bpy.data.armatures:
        bpy.data.armatures.remove(block)
    for block in bpy.data.actions:
        bpy.data.actions.remove(block)


def create_material(name: str, color_hex: str, emission: float = 0.0,
                    roughness: float = 0.7, metallic: float = 0.0) -> bpy.types.Material:
    """Create a Principled BSDF material."""
    mat = bpy.data.materials.new(name=name)
    mat.use_nodes = True
    bsdf = mat.node_tree.nodes.get('Principled BSDF')
    if bsdf is None:
        bsdf = mat.node_tree.nodes.new('ShaderNodeBsdfPrincipled')

    color = hex_to_linear(color_hex)
    bsdf.inputs['Base Color'].default_value = color
    bsdf.inputs['Roughness'].default_value = roughness
    bsdf.inputs['Metallic'].default_value = metallic

    if emission > 0:
        bsdf.inputs['Emission Color'].default_value = color
        bsdf.inputs['Emission Strength'].default_value = emission

    return mat


def create_armature(name: str) -> tuple:
    """Create an armature object and enter edit mode. Returns (armature_obj, armature_data)."""
    arm_data = bpy.data.armatures.new(name=f'{name}_armature')
    arm_obj = bpy.data.objects.new(name=f'{name}_rig', object_data=arm_data)
    bpy.context.collection.objects.link(arm_obj)
    bpy.context.view_layer.objects.active = arm_obj
    bpy.ops.object.mode_set(mode='EDIT')
    return arm_obj, arm_data


def add_bone(armature_data, name: str, head: tuple, tail: tuple,
             parent_name: str = None, connected: bool = False):
    """Add a bone to the armature (must be in edit mode)."""
    bone = armature_data.edit_bones.new(name)
    bone.head = head
    bone.tail = tail
    if parent_name and parent_name in armature_data.edit_bones:
        bone.parent = armature_data.edit_bones[parent_name]
        bone.use_connect = connected
    return bone


def parent_mesh_to_armature(mesh_obj, armature_obj, use_auto_weights: bool = True):
    """Parent a mesh to an armature with automatic weights."""
    mesh_obj.select_set(True)
    armature_obj.select_set(True)
    bpy.context.view_layer.objects.active = armature_obj
    if use_auto_weights:
        bpy.ops.object.parent_set(type='ARMATURE_AUTO')
    else:
        bpy.ops.object.parent_set(type='ARMATURE')
    bpy.ops.object.select_all(action='DESELECT')


def assign_vertex_group(mesh_obj, group_name: str, vertex_indices: list, weight: float = 1.0):
    """Manually assign vertices to a vertex group with given weight."""
    if group_name not in mesh_obj.vertex_groups:
        mesh_obj.vertex_groups.new(name=group_name)
    vg = mesh_obj.vertex_groups[group_name]
    vg.add(vertex_indices, weight, 'REPLACE')


def set_keyframe(armature_obj, bone_name: str, frame: int,
                 location: tuple = None, rotation: tuple = None, scale: tuple = None):
    """Set keyframes on a pose bone. rotation is (x,y,z) in degrees."""
    bpy.context.view_layer.objects.active = armature_obj
    bpy.ops.object.mode_set(mode='POSE')
    bone = armature_obj.pose.bones.get(bone_name)
    if bone is None:
        return

    bpy.context.scene.frame_set(frame)

    if location is not None:
        bone.location = location
        bone.keyframe_insert(data_path='location', frame=frame)

    if rotation is not None:
        bone.rotation_mode = 'XYZ'
        bone.rotation_euler = (
            math.radians(rotation[0]),
            math.radians(rotation[1]),
            math.radians(rotation[2])
        )
        bone.keyframe_insert(data_path='rotation_euler', frame=frame)

    if scale is not None:
        bone.scale = scale
        bone.keyframe_insert(data_path='scale', frame=frame)


def create_action(armature_obj, action_name: str):
    """Create a new action and assign it to the armature."""
    action = bpy.data.actions.new(name=action_name)
    if armature_obj.animation_data is None:
        armature_obj.animation_data_create()
    armature_obj.animation_data.action = action
    return action


def finalize_action(armature_obj, action_name: str):
    """Push the current action to NLA and clear it so the next action can be created."""
    if armature_obj.animation_data and armature_obj.animation_data.action:
        track = armature_obj.animation_data.nla_tracks.new()
        track.name = action_name
        action = armature_obj.animation_data.action
        track.strips.new(action_name, int(action.frame_range[0]), action)
        armature_obj.animation_data.action = None


def reset_pose(armature_obj):
    """Reset all pose bones to rest pose."""
    bpy.context.view_layer.objects.active = armature_obj
    bpy.ops.object.mode_set(mode='POSE')
    for bone in armature_obj.pose.bones:
        bone.location = (0, 0, 0)
        bone.rotation_mode = 'XYZ'
        bone.rotation_euler = (0, 0, 0)
        bone.scale = (1, 1, 1)


def export_glb(filepath: str):
    """Export the scene as a GLB file."""
    # Ensure we're in object mode
    if bpy.context.active_object and bpy.context.active_object.mode != 'OBJECT':
        bpy.ops.object.mode_set(mode='OBJECT')

    # Select all mesh and armature objects for export
    bpy.ops.object.select_all(action='DESELECT')
    for obj in bpy.context.scene.objects:
        if obj.type in ('MESH', 'ARMATURE'):
            obj.select_set(True)

    os.makedirs(os.path.dirname(filepath), exist_ok=True)

    bpy.ops.export_scene.gltf(
        filepath=filepath,
        export_format='GLB',
        use_selection=True,
        export_animations=True,
        export_skins=True,
        export_morph=False,
        export_lights=False,
        export_cameras=False,
        export_apply=True,
    )
    print(f'Exported: {filepath}')


def create_mesh_object(name: str, verts: list, faces: list,
                       material: bpy.types.Material = None) -> bpy.types.Object:
    """Create a mesh object from vertices and faces."""
    mesh = bpy.data.meshes.new(name=f'{name}_mesh')
    mesh.from_pydata(verts, [], faces)
    mesh.update()

    obj = bpy.data.objects.new(name, mesh)
    bpy.context.collection.objects.link(obj)

    if material:
        obj.data.materials.append(material)

    return obj


def create_cone(name: str, radius: float, height: float, segments: int,
                material: bpy.types.Material = None) -> bpy.types.Object:
    """Create a cone mesh object."""
    bpy.ops.mesh.primitive_cone_add(
        vertices=segments, radius1=radius, radius2=0,
        depth=height, location=(0, 0, 0)
    )
    obj = bpy.context.active_object
    obj.name = name
    if material:
        obj.data.materials.append(material)
    return obj


def create_cylinder(name: str, radius: float, height: float, segments: int,
                    material: bpy.types.Material = None) -> bpy.types.Object:
    """Create a cylinder mesh object."""
    bpy.ops.mesh.primitive_cylinder_add(
        vertices=segments, radius=radius,
        depth=height, location=(0, 0, 0)
    )
    obj = bpy.context.active_object
    obj.name = name
    if material:
        obj.data.materials.append(material)
    return obj


def create_uv_sphere(name: str, radius: float, segments: int = 12, rings: int = 8,
                     material: bpy.types.Material = None) -> bpy.types.Object:
    """Create a UV sphere mesh object."""
    bpy.ops.mesh.primitive_uv_sphere_add(
        segments=segments, ring_count=rings,
        radius=radius, location=(0, 0, 0)
    )
    obj = bpy.context.active_object
    obj.name = name
    if material:
        obj.data.materials.append(material)
    return obj


def create_plane(name: str, size: float, subdivisions: int = 0,
                 material: bpy.types.Material = None) -> bpy.types.Object:
    """Create a plane mesh object."""
    bpy.ops.mesh.primitive_plane_add(size=size, location=(0, 0, 0))
    obj = bpy.context.active_object
    obj.name = name
    if subdivisions > 0:
        mod = obj.modifiers.new('Subdivide', 'SUBSURF')
        mod.levels = subdivisions
        mod.render_levels = subdivisions
        bpy.ops.object.modifier_apply(modifier='Subdivide')
    if material:
        obj.data.materials.append(material)
    return obj


def join_objects(objects: list, name: str) -> bpy.types.Object:
    """Join multiple objects into one."""
    bpy.ops.object.select_all(action='DESELECT')
    for obj in objects:
        obj.select_set(True)
    bpy.context.view_layer.objects.active = objects[0]
    bpy.ops.object.join()
    result = bpy.context.active_object
    result.name = name
    return result
