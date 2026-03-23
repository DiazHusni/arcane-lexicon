"""
Generate the player mage model with armature and animations.
Run via: blender --background --python scripts/blender/generate_mage.py

Outputs: public/models/mage.glb
"""

import bpy
import math
import os
import sys

# Add scripts dir to path so we can import common
SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
PROJECT_DIR = os.path.dirname(os.path.dirname(SCRIPT_DIR))
sys.path.insert(0, SCRIPT_DIR)

from common import (
    clear_scene, create_material, create_armature, add_bone,
    parent_mesh_to_armature, set_keyframe, create_action,
    finalize_action, reset_pose, export_glb,
    create_cone, create_cylinder, create_uv_sphere, create_plane,
    join_objects, assign_vertex_group
)

# ── Colors ──────────────────────────────────────────────────────────────────
ROBE_COLOR  = '#5E2D9C'
HAT_COLOR   = '#3A1A6E'
HEAD_COLOR  = '#F0D9B0'
STAFF_COLOR = '#8B5E3C'
ORB_COLOR   = '#00D4FF'
CAPE_COLOR  = '#4A1D7A'

FPS = 24


def create_mage_materials():
    """Create all materials for the mage."""
    return {
        'robe': create_material('mage_robe', ROBE_COLOR, roughness=0.8),
        'hat': create_material('mage_hat', HAT_COLOR, roughness=0.75),
        'head': create_material('mage_head', HEAD_COLOR, roughness=0.9),
        'staff': create_material('mage_staff', STAFF_COLOR, roughness=0.85),
        'orb': create_material('mage_orb', ORB_COLOR, emission=3.0, roughness=0.2),
        'cape': create_material('mage_cape', CAPE_COLOR, roughness=0.8),
    }


def build_mage_mesh(mats):
    """Build the mage character mesh from primitives."""
    parts = []

    # ── Robe (tapered cylinder) ──
    # Use a cone with slight top radius for a robe shape
    bpy.ops.mesh.primitive_cone_add(
        vertices=12, radius1=0.45, radius2=0.18,
        depth=1.2, location=(0, 0, 0.6)
    )
    robe = bpy.context.active_object
    robe.name = 'robe'
    robe.data.materials.append(mats['robe'])

    # Add edge loops for better deformation
    bpy.ops.object.mode_set(mode='EDIT')
    bpy.ops.mesh.subdivide(number_cuts=3)
    bpy.ops.object.mode_set(mode='OBJECT')
    parts.append(robe)

    # ── Head ──
    bpy.ops.mesh.primitive_uv_sphere_add(
        segments=12, ring_count=8,
        radius=0.2, location=(0, 0, 1.38)
    )
    head = bpy.context.active_object
    head.name = 'head'
    head.data.materials.append(mats['head'])
    parts.append(head)

    # ── Brow ridge (slight bump) ──
    bpy.ops.mesh.primitive_uv_sphere_add(
        segments=8, ring_count=4,
        radius=0.06, location=(0, 0.15, 1.42)
    )
    brow = bpy.context.active_object
    brow.name = 'brow'
    brow.data.materials.append(mats['head'])
    parts.append(brow)

    # ── Hat brim ──
    bpy.ops.mesh.primitive_cylinder_add(
        vertices=12, radius=0.3,
        depth=0.06, location=(0, 0, 1.55)
    )
    brim = bpy.context.active_object
    brim.name = 'brim'
    brim.data.materials.append(mats['hat'])
    parts.append(brim)

    # ── Hat cone ──
    bpy.ops.mesh.primitive_cone_add(
        vertices=12, radius1=0.22, radius2=0.02,
        depth=0.6, location=(0, 0, 1.88)
    )
    hat_cone = bpy.context.active_object
    hat_cone.name = 'hat_cone'
    hat_cone.data.materials.append(mats['hat'])
    # Slight tip bend
    bpy.ops.object.mode_set(mode='EDIT')
    bpy.ops.mesh.subdivide(number_cuts=2)
    bpy.ops.object.mode_set(mode='OBJECT')
    parts.append(hat_cone)

    # ── Left arm (upper) ──
    bpy.ops.mesh.primitive_cone_add(
        vertices=6, radius1=0.065, radius2=0.05,
        depth=0.38, location=(-0.28, 0, 1.0)
    )
    arm_l_upper = bpy.context.active_object
    arm_l_upper.name = 'arm_l_upper'
    arm_l_upper.rotation_euler = (0, 0, math.radians(15))
    arm_l_upper.data.materials.append(mats['robe'])
    bpy.ops.object.mode_set(mode='EDIT')
    bpy.ops.mesh.subdivide(number_cuts=2)
    bpy.ops.object.mode_set(mode='OBJECT')
    parts.append(arm_l_upper)

    # ── Left forearm ──
    bpy.ops.mesh.primitive_cone_add(
        vertices=6, radius1=0.055, radius2=0.04,
        depth=0.32, location=(-0.32, 0, 0.65)
    )
    arm_l_lower = bpy.context.active_object
    arm_l_lower.name = 'arm_l_lower'
    arm_l_lower.data.materials.append(mats['robe'])
    bpy.ops.object.mode_set(mode='EDIT')
    bpy.ops.mesh.subdivide(number_cuts=1)
    bpy.ops.object.mode_set(mode='OBJECT')
    parts.append(arm_l_lower)

    # ── Left hand ──
    bpy.ops.mesh.primitive_uv_sphere_add(
        segments=6, ring_count=4,
        radius=0.05, location=(-0.33, 0, 0.48)
    )
    hand_l = bpy.context.active_object
    hand_l.name = 'hand_l'
    hand_l.data.materials.append(mats['head'])
    parts.append(hand_l)

    # ── Right arm (upper) ──
    bpy.ops.mesh.primitive_cone_add(
        vertices=6, radius1=0.065, radius2=0.05,
        depth=0.38, location=(0.28, 0, 1.0)
    )
    arm_r_upper = bpy.context.active_object
    arm_r_upper.name = 'arm_r_upper'
    arm_r_upper.rotation_euler = (0, 0, math.radians(-15))
    arm_r_upper.data.materials.append(mats['robe'])
    bpy.ops.object.mode_set(mode='EDIT')
    bpy.ops.mesh.subdivide(number_cuts=2)
    bpy.ops.object.mode_set(mode='OBJECT')
    parts.append(arm_r_upper)

    # ── Right forearm ──
    bpy.ops.mesh.primitive_cone_add(
        vertices=6, radius1=0.055, radius2=0.04,
        depth=0.32, location=(0.32, 0, 0.65)
    )
    arm_r_lower = bpy.context.active_object
    arm_r_lower.name = 'arm_r_lower'
    arm_r_lower.data.materials.append(mats['robe'])
    bpy.ops.object.mode_set(mode='EDIT')
    bpy.ops.mesh.subdivide(number_cuts=1)
    bpy.ops.object.mode_set(mode='OBJECT')
    parts.append(arm_r_lower)

    # ── Right hand ──
    bpy.ops.mesh.primitive_uv_sphere_add(
        segments=6, ring_count=4,
        radius=0.05, location=(0.33, 0, 0.48)
    )
    hand_r = bpy.context.active_object
    hand_r.name = 'hand_r'
    hand_r.data.materials.append(mats['head'])
    parts.append(hand_r)

    # ── Staff ──
    bpy.ops.mesh.primitive_cylinder_add(
        vertices=8, radius=0.03,
        depth=1.4, location=(0.38, 0, 0.7)
    )
    staff = bpy.context.active_object
    staff.name = 'staff'
    staff.data.materials.append(mats['staff'])
    parts.append(staff)

    # ── Staff orb ──
    bpy.ops.mesh.primitive_uv_sphere_add(
        segments=12, ring_count=8,
        radius=0.1, location=(0.38, 0, 1.42)
    )
    orb = bpy.context.active_object
    orb.name = 'orb'
    orb.data.materials.append(mats['orb'])
    parts.append(orb)

    # ── Cape (4-segment plane, draped from back) ──
    bpy.ops.mesh.primitive_plane_add(size=0.5, location=(0, -0.15, 0.9))
    cape = bpy.context.active_object
    cape.name = 'cape'
    cape.rotation_euler = (math.radians(10), 0, 0)
    cape.scale = (0.6, 1.0, 1.0)
    cape.data.materials.append(mats['cape'])
    # Subdivide for bone chain deformation
    bpy.ops.object.mode_set(mode='EDIT')
    bpy.ops.mesh.subdivide(number_cuts=4)
    bpy.ops.object.mode_set(mode='OBJECT')
    parts.append(cape)

    # ── Join all parts ──
    mage_mesh = join_objects(parts, 'mage')
    # Set origin to world origin
    bpy.context.scene.cursor.location = (0, 0, 0)
    bpy.ops.object.origin_set(type='ORIGIN_CURSOR')

    # Enable smooth shading for better GLTF export
    bpy.ops.object.shade_smooth()

    return mage_mesh


def build_mage_armature():
    """Build the mage skeleton."""
    arm_obj, arm_data = create_armature('mage')

    # Note: Blender uses (x, y, z) where z is up
    # Bone head/tail defines the bone direction

    # Root bone (at ground level)
    add_bone(arm_data, 'root', (0, 0, 0), (0, 0, 0.15))

    # Spine chain
    add_bone(arm_data, 'spine', (0, 0, 0.15), (0, 0, 0.55), 'root')
    add_bone(arm_data, 'chest', (0, 0, 0.55), (0, 0, 1.05), 'spine', connected=True)

    # Neck and head
    add_bone(arm_data, 'neck', (0, 0, 1.05), (0, 0, 1.25), 'chest', connected=True)
    add_bone(arm_data, 'head', (0, 0, 1.25), (0, 0, 1.6), 'neck', connected=True)
    add_bone(arm_data, 'hat', (0, 0, 1.6), (0, 0, 2.1), 'head', connected=True)

    # Left arm chain
    add_bone(arm_data, 'shoulder.L', (-0.15, 0, 1.05), (-0.25, 0, 1.02), 'chest')
    add_bone(arm_data, 'upper_arm.L', (-0.25, 0, 1.02), (-0.3, 0, 0.75), 'shoulder.L', connected=True)
    add_bone(arm_data, 'forearm.L', (-0.3, 0, 0.75), (-0.33, 0, 0.52), 'upper_arm.L', connected=True)
    add_bone(arm_data, 'hand.L', (-0.33, 0, 0.52), (-0.33, 0, 0.42), 'forearm.L', connected=True)

    # Right arm chain
    add_bone(arm_data, 'shoulder.R', (0.15, 0, 1.05), (0.25, 0, 1.02), 'chest')
    add_bone(arm_data, 'upper_arm.R', (0.25, 0, 1.02), (0.3, 0, 0.75), 'shoulder.R', connected=True)
    add_bone(arm_data, 'forearm.R', (0.3, 0, 0.75), (0.33, 0, 0.52), 'upper_arm.R', connected=True)
    add_bone(arm_data, 'hand.R', (0.33, 0, 0.52), (0.38, 0, 0.42), 'forearm.R', connected=True)

    # Cape bone chain (descending from upper back)
    add_bone(arm_data, 'cape.001', (0, -0.15, 1.0), (0, -0.18, 0.75), 'chest')
    add_bone(arm_data, 'cape.002', (0, -0.18, 0.75), (0, -0.2, 0.5), 'cape.001', connected=True)
    add_bone(arm_data, 'cape.003', (0, -0.2, 0.5), (0, -0.22, 0.25), 'cape.002', connected=True)
    add_bone(arm_data, 'cape.004', (0, -0.22, 0.25), (0, -0.24, 0.05), 'cape.003', connected=True)

    # Robe bottom bone (for sway)
    add_bone(arm_data, 'robe_bottom', (0, 0, 0.15), (0, 0, -0.05), 'spine')

    bpy.ops.object.mode_set(mode='OBJECT')
    return arm_obj


def rig_mage(mage_mesh, arm_obj):
    """Parent the mage mesh to the armature with automatic weights."""
    bpy.ops.object.select_all(action='DESELECT')
    mage_mesh.select_set(True)
    arm_obj.select_set(True)
    bpy.context.view_layer.objects.active = arm_obj
    bpy.ops.object.parent_set(type='ARMATURE_AUTO')
    bpy.ops.object.select_all(action='DESELECT')


def fix_rigid_weights(mage_mesh):
    """
    Fix vertex weights for rigid accessories after auto-weighting.

    Problem: auto-weights assign by proximity.
      - Orb is at (0.38, 0, z=1.42) — nearest bone is 'head' (center z≈1.42), NOT 'hand.R'.
      - Hat brim/cone may get split weights with 'head' instead of 'hat'.

    Fix: override weights for hat and staff/orb vertices based on their
    known world positions in the Blender Z-up coordinate system.
    """
    bpy.context.view_layer.objects.active = mage_mesh
    bpy.ops.object.mode_set(mode='OBJECT')

    mesh = mage_mesh.data

    def get_vg(name):
        if name in mage_mesh.vertex_groups:
            return mage_mesh.vertex_groups[name]
        return mage_mesh.vertex_groups.new(name=name)

    hat_vg    = get_vg('hat')
    hand_r_vg = get_vg('hand.R')
    all_vgs   = list(mage_mesh.vertex_groups)

    hat_verts    = []
    hand_r_verts = []

    for v in mesh.vertices:
        p = v.co  # Blender local coords (Z-up)

        # ── Hat (brim + cone) ─────────────────────────────────────────────
        # Hat brim: z≈1.52-1.58, radius 0-0.3
        # Hat cone: z≈1.58-2.18
        # Exclude top of head sphere (x≈0, y≈0) by requiring r² > 0.04
        r_sq = p.x * p.x + p.y * p.y
        if p.z > 1.5 and r_sq > 0.04:
            hat_verts.append(v.index)

        # ── Staff shaft ───────────────────────────────────────────────────
        # Cylinder at x=0.38, y=0, z center=0.7, radius=0.03, depth=1.4
        # Vertices: x in [0.35, 0.41], |y| < 0.05, z in [0, 1.4]
        is_staff = (abs(p.x - 0.38) < 0.06 and abs(p.y) < 0.06 and p.z < 1.42)

        # ── Orb ───────────────────────────────────────────────────────────
        # Sphere at (0.38, 0, 1.42), radius=0.1 — use generous radius to catch all verts
        dx = p.x - 0.38
        dy = p.y
        dz = p.z - 1.42
        is_orb = (dx * dx + dy * dy + dz * dz) < (0.14 * 0.14)

        if is_staff or is_orb:
            hand_r_verts.append(v.index)

    # Apply: clear all existing weights then assign 100% to target bone
    if hat_verts:
        for vg in all_vgs:
            try: vg.remove(hat_verts)
            except Exception: pass
        hat_vg.add(hat_verts, 1.0, 'REPLACE')

    if hand_r_verts:
        for vg in all_vgs:
            try: vg.remove(hand_r_verts)
            except Exception: pass
        hand_r_vg.add(hand_r_verts, 1.0, 'REPLACE')

    print(f'Weight fix: {len(hat_verts)} hat verts → hat bone, '
          f'{len(hand_r_verts)} staff/orb verts → hand.R bone')


def create_idle_animation(arm_obj):
    """Create the idle breathing/sway animation. 60 frames @ 24fps = 2.5s, loops."""
    create_action(arm_obj, 'idle')

    # Frame 0 = rest pose
    reset_pose(arm_obj)

    # Frame 0 (start = rest)
    set_keyframe(arm_obj, 'root', 0, location=(0, 0, 0))
    set_keyframe(arm_obj, 'spine', 0, rotation=(0, 0, 0))
    set_keyframe(arm_obj, 'chest', 0, rotation=(0, 0, 0))
    set_keyframe(arm_obj, 'neck', 0, rotation=(0, 0, 0))
    set_keyframe(arm_obj, 'head', 0, rotation=(0, 0, 0))
    set_keyframe(arm_obj, 'shoulder.L', 0, rotation=(0, 0, 0))
    set_keyframe(arm_obj, 'shoulder.R', 0, rotation=(0, 0, 0))
    set_keyframe(arm_obj, 'upper_arm.L', 0, rotation=(0, 0, 0))
    set_keyframe(arm_obj, 'upper_arm.R', 0, rotation=(0, 0, 0))
    set_keyframe(arm_obj, 'cape.001', 0, rotation=(0, 0, 0))
    set_keyframe(arm_obj, 'cape.002', 0, rotation=(0, 0, 0))
    set_keyframe(arm_obj, 'cape.003', 0, rotation=(0, 0, 0))
    set_keyframe(arm_obj, 'cape.004', 0, rotation=(0, 0, 0))
    set_keyframe(arm_obj, 'robe_bottom', 0, rotation=(0, 0, 0))

    # Frame 15 (inhale peak)
    set_keyframe(arm_obj, 'root', 15, location=(0, 0, 0.03))
    set_keyframe(arm_obj, 'spine', 15, rotation=(2, 0, 0))
    set_keyframe(arm_obj, 'chest', 15, rotation=(0, 1, 0))
    set_keyframe(arm_obj, 'neck', 15, rotation=(-1.5, 0, 0))
    set_keyframe(arm_obj, 'head', 15, rotation=(1, 0, 0.5))
    set_keyframe(arm_obj, 'shoulder.L', 15, rotation=(0, 0, -3))
    set_keyframe(arm_obj, 'shoulder.R', 15, rotation=(0, 0, 3))
    set_keyframe(arm_obj, 'upper_arm.L', 15, rotation=(2, 0, 0))
    set_keyframe(arm_obj, 'upper_arm.R', 15, rotation=(-1, 0, 0))
    set_keyframe(arm_obj, 'cape.001', 15, rotation=(3, 0, 0))
    set_keyframe(arm_obj, 'cape.002', 15, rotation=(2, 0, 1))
    set_keyframe(arm_obj, 'cape.003', 15, rotation=(1.5, 0, -1))
    set_keyframe(arm_obj, 'cape.004', 15, rotation=(1, 0, 0.5))
    set_keyframe(arm_obj, 'robe_bottom', 15, rotation=(1, 0, 1))

    # Frame 30 (exhale rest — mirror of 0)
    set_keyframe(arm_obj, 'root', 30, location=(0, 0, 0))
    set_keyframe(arm_obj, 'spine', 30, rotation=(0, 0, 0))
    set_keyframe(arm_obj, 'chest', 30, rotation=(0, -1, 0))
    set_keyframe(arm_obj, 'neck', 30, rotation=(0, 0, 0))
    set_keyframe(arm_obj, 'head', 30, rotation=(-0.5, 0, -0.5))
    set_keyframe(arm_obj, 'shoulder.L', 30, rotation=(0, 0, 2))
    set_keyframe(arm_obj, 'shoulder.R', 30, rotation=(0, 0, -2))
    set_keyframe(arm_obj, 'upper_arm.L', 30, rotation=(-1, 0, 0))
    set_keyframe(arm_obj, 'upper_arm.R', 30, rotation=(1, 0, 0))
    set_keyframe(arm_obj, 'cape.001', 30, rotation=(-2, 0, 0))
    set_keyframe(arm_obj, 'cape.002', 30, rotation=(-1.5, 0, -1))
    set_keyframe(arm_obj, 'cape.003', 30, rotation=(-1, 0, 1))
    set_keyframe(arm_obj, 'cape.004', 30, rotation=(-0.5, 0, -0.5))
    set_keyframe(arm_obj, 'robe_bottom', 30, rotation=(-1, 0, -1))

    # Frame 45 — slight inhale, different sway direction
    set_keyframe(arm_obj, 'root', 45, location=(0, 0, 0.02))
    set_keyframe(arm_obj, 'spine', 45, rotation=(1.5, 0, 0))
    set_keyframe(arm_obj, 'chest', 45, rotation=(0, 0.5, 0))
    set_keyframe(arm_obj, 'neck', 45, rotation=(-1, 0, 0))
    set_keyframe(arm_obj, 'head', 45, rotation=(0.5, 0, 0))
    set_keyframe(arm_obj, 'shoulder.L', 45, rotation=(0, 0, -2))
    set_keyframe(arm_obj, 'shoulder.R', 45, rotation=(0, 0, 2))
    set_keyframe(arm_obj, 'upper_arm.L', 45, rotation=(1.5, 0, 0))
    set_keyframe(arm_obj, 'upper_arm.R', 45, rotation=(-0.5, 0, 0))
    set_keyframe(arm_obj, 'cape.001', 45, rotation=(2, 0, 1))
    set_keyframe(arm_obj, 'cape.002', 45, rotation=(1.5, 0, 0))
    set_keyframe(arm_obj, 'cape.003', 45, rotation=(1, 0, -0.5))
    set_keyframe(arm_obj, 'cape.004', 45, rotation=(0.5, 0, 0.5))
    set_keyframe(arm_obj, 'robe_bottom', 45, rotation=(0.5, 0, 0.5))

    # Frame 60 = Frame 0 (seamless loop)
    set_keyframe(arm_obj, 'root', 60, location=(0, 0, 0))
    set_keyframe(arm_obj, 'spine', 60, rotation=(0, 0, 0))
    set_keyframe(arm_obj, 'chest', 60, rotation=(0, 0, 0))
    set_keyframe(arm_obj, 'neck', 60, rotation=(0, 0, 0))
    set_keyframe(arm_obj, 'head', 60, rotation=(0, 0, 0))
    set_keyframe(arm_obj, 'shoulder.L', 60, rotation=(0, 0, 0))
    set_keyframe(arm_obj, 'shoulder.R', 60, rotation=(0, 0, 0))
    set_keyframe(arm_obj, 'upper_arm.L', 60, rotation=(0, 0, 0))
    set_keyframe(arm_obj, 'upper_arm.R', 60, rotation=(0, 0, 0))
    set_keyframe(arm_obj, 'cape.001', 60, rotation=(0, 0, 0))
    set_keyframe(arm_obj, 'cape.002', 60, rotation=(0, 0, 0))
    set_keyframe(arm_obj, 'cape.003', 60, rotation=(0, 0, 0))
    set_keyframe(arm_obj, 'cape.004', 60, rotation=(0, 0, 0))
    set_keyframe(arm_obj, 'robe_bottom', 60, rotation=(0, 0, 0))

    finalize_action(arm_obj, 'idle')
    reset_pose(arm_obj)


def create_cast_animation(arm_obj):
    """Create the spell cast animation. 20 frames @ 24fps = 0.83s, no loop."""
    create_action(arm_obj, 'cast')
    reset_pose(arm_obj)

    # Frame 0: rest
    set_keyframe(arm_obj, 'root', 0, location=(0, 0, 0))
    set_keyframe(arm_obj, 'spine', 0, rotation=(0, 0, 0))
    set_keyframe(arm_obj, 'chest', 0, rotation=(0, 0, 0))
    set_keyframe(arm_obj, 'shoulder.R', 0, rotation=(0, 0, 0))
    set_keyframe(arm_obj, 'upper_arm.R', 0, rotation=(0, 0, 0))
    set_keyframe(arm_obj, 'forearm.R', 0, rotation=(0, 0, 0))
    set_keyframe(arm_obj, 'hand.R', 0, rotation=(0, 0, 0))
    set_keyframe(arm_obj, 'shoulder.L', 0, rotation=(0, 0, 0))
    set_keyframe(arm_obj, 'upper_arm.L', 0, rotation=(0, 0, 0))
    set_keyframe(arm_obj, 'head', 0, rotation=(0, 0, 0))
    set_keyframe(arm_obj, 'neck', 0, rotation=(0, 0, 0))
    set_keyframe(arm_obj, 'cape.001', 0, rotation=(0, 0, 0))
    set_keyframe(arm_obj, 'cape.002', 0, rotation=(0, 0, 0))

    # Frame 5: wind-up — lean back, raise staff arm
    set_keyframe(arm_obj, 'spine', 5, rotation=(-8, 0, 0))
    set_keyframe(arm_obj, 'chest', 5, rotation=(-5, 0, 0))
    set_keyframe(arm_obj, 'shoulder.R', 5, rotation=(-50, 0, -15))
    set_keyframe(arm_obj, 'upper_arm.R', 5, rotation=(-30, 0, 0))
    set_keyframe(arm_obj, 'forearm.R', 5, rotation=(-20, 0, 0))
    set_keyframe(arm_obj, 'head', 5, rotation=(5, 0, 0))
    set_keyframe(arm_obj, 'neck', 5, rotation=(3, 0, 0))
    set_keyframe(arm_obj, 'shoulder.L', 5, rotation=(0, 0, -10))
    set_keyframe(arm_obj, 'cape.001', 5, rotation=(5, 0, 0))
    set_keyframe(arm_obj, 'cape.002', 5, rotation=(3, 0, 0))

    # Frame 10: thrust forward — lunge, staff points forward
    set_keyframe(arm_obj, 'root', 10, location=(0, 0.15, 0))
    set_keyframe(arm_obj, 'spine', 10, rotation=(12, 0, 0))
    set_keyframe(arm_obj, 'chest', 10, rotation=(8, 0, 0))
    set_keyframe(arm_obj, 'shoulder.R', 10, rotation=(40, 0, 10))
    set_keyframe(arm_obj, 'upper_arm.R', 10, rotation=(25, 0, 0))
    set_keyframe(arm_obj, 'forearm.R', 10, rotation=(10, 0, 0))
    set_keyframe(arm_obj, 'hand.R', 10, rotation=(5, 0, 0))
    set_keyframe(arm_obj, 'shoulder.L', 10, rotation=(10, 0, -30))
    set_keyframe(arm_obj, 'upper_arm.L', 10, rotation=(15, 0, 0))
    set_keyframe(arm_obj, 'head', 10, rotation=(-3, 0, 0))
    set_keyframe(arm_obj, 'neck', 10, rotation=(-2, 0, 0))
    set_keyframe(arm_obj, 'cape.001', 10, rotation=(-10, 0, 0))
    set_keyframe(arm_obj, 'cape.002', 10, rotation=(-8, 0, 0))

    # Frame 15: begin recovery
    set_keyframe(arm_obj, 'root', 15, location=(0, 0.05, 0))
    set_keyframe(arm_obj, 'spine', 15, rotation=(3, 0, 0))
    set_keyframe(arm_obj, 'chest', 15, rotation=(2, 0, 0))
    set_keyframe(arm_obj, 'shoulder.R', 15, rotation=(10, 0, 0))
    set_keyframe(arm_obj, 'upper_arm.R', 15, rotation=(5, 0, 0))
    set_keyframe(arm_obj, 'forearm.R', 15, rotation=(0, 0, 0))
    set_keyframe(arm_obj, 'shoulder.L', 15, rotation=(3, 0, -8))
    set_keyframe(arm_obj, 'upper_arm.L', 15, rotation=(3, 0, 0))
    set_keyframe(arm_obj, 'head', 15, rotation=(0, 0, 0))
    set_keyframe(arm_obj, 'cape.001', 15, rotation=(8, 0, 0))
    set_keyframe(arm_obj, 'cape.002', 15, rotation=(6, 0, 0))

    # Frame 20: back to rest
    set_keyframe(arm_obj, 'root', 20, location=(0, 0, 0))
    set_keyframe(arm_obj, 'spine', 20, rotation=(0, 0, 0))
    set_keyframe(arm_obj, 'chest', 20, rotation=(0, 0, 0))
    set_keyframe(arm_obj, 'shoulder.R', 20, rotation=(0, 0, 0))
    set_keyframe(arm_obj, 'upper_arm.R', 20, rotation=(0, 0, 0))
    set_keyframe(arm_obj, 'forearm.R', 20, rotation=(0, 0, 0))
    set_keyframe(arm_obj, 'hand.R', 20, rotation=(0, 0, 0))
    set_keyframe(arm_obj, 'shoulder.L', 20, rotation=(0, 0, 0))
    set_keyframe(arm_obj, 'upper_arm.L', 20, rotation=(0, 0, 0))
    set_keyframe(arm_obj, 'head', 20, rotation=(0, 0, 0))
    set_keyframe(arm_obj, 'neck', 20, rotation=(0, 0, 0))
    set_keyframe(arm_obj, 'cape.001', 20, rotation=(0, 0, 0))
    set_keyframe(arm_obj, 'cape.002', 20, rotation=(0, 0, 0))

    finalize_action(arm_obj, 'cast')
    reset_pose(arm_obj)


def create_death_animation(arm_obj):
    """Create the death animation. 48 frames @ 24fps = 2s, no loop."""
    create_action(arm_obj, 'death')
    reset_pose(arm_obj)

    # Frame 0: rest
    set_keyframe(arm_obj, 'root', 0, location=(0, 0, 0), scale=(1, 1, 1))
    set_keyframe(arm_obj, 'spine', 0, rotation=(0, 0, 0))
    set_keyframe(arm_obj, 'chest', 0, rotation=(0, 0, 0))
    set_keyframe(arm_obj, 'shoulder.L', 0, rotation=(0, 0, 0))
    set_keyframe(arm_obj, 'shoulder.R', 0, rotation=(0, 0, 0))
    set_keyframe(arm_obj, 'upper_arm.L', 0, rotation=(0, 0, 0))
    set_keyframe(arm_obj, 'upper_arm.R', 0, rotation=(0, 0, 0))
    set_keyframe(arm_obj, 'hand.R', 0, rotation=(0, 0, 0))
    set_keyframe(arm_obj, 'head', 0, rotation=(0, 0, 0))
    set_keyframe(arm_obj, 'neck', 0, rotation=(0, 0, 0))
    set_keyframe(arm_obj, 'cape.001', 0, rotation=(0, 0, 0))

    # Frame 12: stagger back — hit reaction
    set_keyframe(arm_obj, 'spine', 12, rotation=(-20, 0, 8))
    set_keyframe(arm_obj, 'chest', 12, rotation=(-10, 0, 5))
    set_keyframe(arm_obj, 'shoulder.L', 12, rotation=(20, 0, -60))
    set_keyframe(arm_obj, 'shoulder.R', 12, rotation=(20, 0, 60))
    set_keyframe(arm_obj, 'upper_arm.L', 12, rotation=(-30, 0, 0))
    set_keyframe(arm_obj, 'upper_arm.R', 12, rotation=(-30, 0, 0))
    set_keyframe(arm_obj, 'hand.R', 12, rotation=(45, 0, 30))
    set_keyframe(arm_obj, 'head', 12, rotation=(-15, 0, -10))
    set_keyframe(arm_obj, 'neck', 12, rotation=(-10, 0, -5))
    set_keyframe(arm_obj, 'root', 12, location=(0, -0.1, 0))

    # Frame 24: begin collapse forward
    set_keyframe(arm_obj, 'spine', 24, rotation=(35, 0, 5))
    set_keyframe(arm_obj, 'chest', 24, rotation=(25, 0, 3))
    set_keyframe(arm_obj, 'root', 24, location=(0, -0.05, -0.3))
    set_keyframe(arm_obj, 'shoulder.L', 24, rotation=(40, 0, -20))
    set_keyframe(arm_obj, 'shoulder.R', 24, rotation=(40, 0, 20))
    set_keyframe(arm_obj, 'upper_arm.L', 24, rotation=(30, 0, 0))
    set_keyframe(arm_obj, 'upper_arm.R', 24, rotation=(30, 0, 0))
    set_keyframe(arm_obj, 'head', 24, rotation=(20, 0, 5))
    set_keyframe(arm_obj, 'neck', 24, rotation=(15, 0, 3))
    set_keyframe(arm_obj, 'cape.001', 24, rotation=(-15, 0, 0))

    # Frame 40: collapsed on ground, shrinking
    set_keyframe(arm_obj, 'spine', 40, rotation=(60, 0, 3))
    set_keyframe(arm_obj, 'chest', 40, rotation=(40, 0, 2))
    set_keyframe(arm_obj, 'root', 40, location=(0, 0, -0.6), scale=(0.5, 0.5, 0.5))
    set_keyframe(arm_obj, 'shoulder.L', 40, rotation=(60, 0, -10))
    set_keyframe(arm_obj, 'shoulder.R', 40, rotation=(60, 0, 10))
    set_keyframe(arm_obj, 'head', 40, rotation=(30, 0, 0))

    # Frame 48: gone
    set_keyframe(arm_obj, 'root', 48, location=(0, 0, -0.8), scale=(0.01, 0.01, 0.01))
    set_keyframe(arm_obj, 'spine', 48, rotation=(70, 0, 0))

    finalize_action(arm_obj, 'death')
    reset_pose(arm_obj)


def main():
    print('=== Generating mage model ===')

    clear_scene()

    # Set scene FPS
    bpy.context.scene.render.fps = FPS

    # Create materials
    mats = create_mage_materials()

    # Build mesh
    mage_mesh = build_mage_mesh(mats)

    # Build armature
    arm_obj = build_mage_armature()

    # Rig mesh to armature
    rig_mage(mage_mesh, arm_obj)

    # Fix auto-weight errors for rigid accessories (hat, staff, orb)
    fix_rigid_weights(mage_mesh)

    # Create animations
    create_idle_animation(arm_obj)
    create_cast_animation(arm_obj)
    create_death_animation(arm_obj)

    # Export
    output_path = os.path.join(PROJECT_DIR, 'public', 'models', 'mage.glb')
    export_glb(output_path)

    print('=== Mage model complete ===')


if __name__ == '__main__':
    main()
