"""
Generate all 4 enemy wraith models with armatures and animations.
Run via: blender --background --python scripts/blender/generate_enemies.py

Outputs: public/models/{acutus,solidus,perfectus,nexus}.glb
"""

import bpy
import math
import os
import sys

SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
PROJECT_DIR = os.path.dirname(os.path.dirname(SCRIPT_DIR))
sys.path.insert(0, SCRIPT_DIR)

from common import (
    clear_scene, create_material, create_armature, add_bone,
    set_keyframe, create_action, finalize_action, reset_pose,
    export_glb, join_objects
)

FPS = 24

# ── Enemy type configurations ───────────────────────────────────────────────

ENEMY_TYPES = {
    'acutus': {
        'body_radius_top': 0.18,
        'body_radius_bottom': 0.08,
        'body_height': 0.85,
        'body_segments': 7,
        'head_radius': 0.16,
        'head_height': 0.52,
        'eye_radius': 0.04,
        'eye_spacing': 0.07,
        'eye_height': 0.55,
        'eye_color': '#FFFFFF',
        'eye_emission': 2.0,
        'arm_radius': 0.03,
        'arm_length': 0.3,
        'claw_radius': 0.02,
        'claw_length': 0.1,
        'num_wisps': 2,
        'wisp_radius': 0.04,
        'wisp_length': 0.12,
        'body_color': '#4A6FA5',
        'has_collar': False,
        'has_shoulders': False,
        'shoulder_radius': 0,
    },
    'solidus': {
        'body_radius_top': 0.25,
        'body_radius_bottom': 0.12,
        'body_height': 1.0,
        'body_segments': 8,
        'head_radius': 0.2,
        'head_height': 0.62,
        'eye_radius': 0.05,
        'eye_spacing': 0.09,
        'eye_height': 0.66,
        'eye_color': '#FFFFFF',
        'eye_emission': 2.0,
        'arm_radius': 0.05,
        'arm_length': 0.4,
        'claw_radius': 0.03,
        'claw_length': 0.13,
        'num_wisps': 2,
        'wisp_radius': 0.05,
        'wisp_length': 0.15,
        'body_color': '#4A6FA5',
        'has_collar': False,
        'has_shoulders': False,
        'shoulder_radius': 0,
    },
    'perfectus': {
        'body_radius_top': 0.22,
        'body_radius_bottom': 0.1,
        'body_height': 1.3,
        'body_segments': 8,
        'head_radius': 0.22,
        'head_height': 0.82,
        'eye_radius': 0.055,
        'eye_spacing': 0.1,
        'eye_height': 0.86,
        'eye_color': '#FFFFFF',
        'eye_emission': 2.0,
        'arm_radius': 0.04,
        'arm_length': 0.5,
        'claw_radius': 0.025,
        'claw_length': 0.12,
        'num_wisps': 3,
        'wisp_radius': 0.045,
        'wisp_length': 0.14,
        'body_color': '#4A6FA5',
        'has_collar': True,
        'has_shoulders': False,
        'shoulder_radius': 0,
    },
    'nexus': {
        'body_radius_top': 0.35,
        'body_radius_bottom': 0.15,
        'body_height': 1.5,
        'body_segments': 10,
        'head_radius': 0.3,
        'head_height': 0.95,
        'eye_radius': 0.08,
        'eye_spacing': 0.14,
        'eye_height': 1.0,
        'eye_color': '#FF6B20',
        'eye_emission': 3.0,
        'arm_radius': 0.08,
        'arm_length': 0.6,
        'claw_radius': 0.05,
        'claw_length': 0.18,
        'num_wisps': 3,
        'wisp_radius': 0.06,
        'wisp_length': 0.18,
        'body_color': '#4A6FA5',
        'has_collar': False,
        'has_shoulders': True,
        'shoulder_radius': 0.14,
    },
}


def create_wraith_materials(name: str, cfg: dict) -> dict:
    """Create materials for a wraith type."""
    return {
        'body': create_material(f'{name}_body', cfg['body_color'], roughness=0.75),
        'eye': create_material(f'{name}_eye', cfg['eye_color'], emission=cfg['eye_emission'], roughness=0.3),
        'wisp': create_material(f'{name}_wisp', cfg['body_color'], emission=1.5, roughness=0.5),
    }


def build_wraith_mesh(name: str, cfg: dict, mats: dict):
    """Build a wraith mesh from the configuration."""
    parts = []

    # ── Body (inverted teardrop cone — wider at top, tapers to ghostly point) ──
    bpy.ops.mesh.primitive_cone_add(
        vertices=cfg['body_segments'],
        radius1=cfg['body_radius_bottom'],
        radius2=cfg['body_radius_top'],
        depth=cfg['body_height'],
        location=(0, 0, cfg['body_height'] / 2 - 0.1)
    )
    body = bpy.context.active_object
    body.name = f'{name}_body'
    body.data.materials.append(mats['body'])
    # Subdivide for deformation
    bpy.ops.object.mode_set(mode='EDIT')
    bpy.ops.mesh.subdivide(number_cuts=3)
    bpy.ops.object.mode_set(mode='OBJECT')
    parts.append(body)

    # ── Head (sphere, slightly elongated vertically) ──
    bpy.ops.mesh.primitive_uv_sphere_add(
        segments=10, ring_count=8,
        radius=cfg['head_radius'],
        location=(0, 0, cfg['head_height'])
    )
    head = bpy.context.active_object
    head.name = f'{name}_head'
    head.scale = (1.0, 0.9, 1.15)  # elongate vertically
    head.data.materials.append(mats['body'])
    parts.append(head)

    # ── Eye sockets (inset spheres) ──
    eye_geo_params = dict(segments=8, ring_count=6, radius=cfg['eye_radius'])
    bpy.ops.mesh.primitive_uv_sphere_add(
        **eye_geo_params,
        location=(-cfg['eye_spacing'], cfg['head_radius'] * 0.7, cfg['eye_height'])
    )
    eye_l = bpy.context.active_object
    eye_l.name = f'{name}_eye_l'
    eye_l.data.materials.append(mats['eye'])
    parts.append(eye_l)

    bpy.ops.mesh.primitive_uv_sphere_add(
        **eye_geo_params,
        location=(cfg['eye_spacing'], cfg['head_radius'] * 0.7, cfg['eye_height'])
    )
    eye_r = bpy.context.active_object
    eye_r.name = f'{name}_eye_r'
    eye_r.data.materials.append(mats['eye'])
    parts.append(eye_r)

    # ── Arms (tapered cylinders) ──
    arm_y = cfg['body_height'] * 0.55
    arm_offset_x = cfg['body_radius_top'] + 0.05

    for side, sx in [('L', -1), ('R', 1)]:
        # Upper arm
        bpy.ops.mesh.primitive_cone_add(
            vertices=5,
            radius1=cfg['arm_radius'],
            radius2=cfg['arm_radius'] * 0.6,
            depth=cfg['arm_length'],
            location=(sx * arm_offset_x, 0, arm_y)
        )
        arm = bpy.context.active_object
        arm.name = f'{name}_arm_{side}'
        arm.rotation_euler = (0, sx * math.radians(25), 0)
        arm.data.materials.append(mats['body'])
        bpy.ops.object.mode_set(mode='EDIT')
        bpy.ops.mesh.subdivide(number_cuts=2)
        bpy.ops.object.mode_set(mode='OBJECT')
        parts.append(arm)

        # Claw (3 small cones)
        claw_base_x = sx * (arm_offset_x + cfg['arm_length'] * 0.4)
        claw_base_z = arm_y - cfg['arm_length'] * 0.3
        for ci, angle in enumerate([-25, 0, 25]):
            bpy.ops.mesh.primitive_cone_add(
                vertices=3,
                radius1=cfg['claw_radius'],
                radius2=0.002,
                depth=cfg['claw_length'],
                location=(
                    claw_base_x + sx * math.sin(math.radians(angle)) * 0.03,
                    math.sin(math.radians(angle)) * 0.03,
                    claw_base_z - ci * 0.01
                )
            )
            claw = bpy.context.active_object
            claw.name = f'{name}_claw_{side}_{ci}'
            claw.rotation_euler = (math.radians(angle * 0.5), sx * math.radians(15), 0)
            claw.data.materials.append(mats['body'])
            parts.append(claw)

    # ── Collar (Perfectus only) ──
    if cfg.get('has_collar'):
        collar_z = cfg['body_height'] * 0.65
        bpy.ops.mesh.primitive_cylinder_add(
            vertices=10, radius=cfg['body_radius_top'] + 0.12,
            depth=0.06, location=(0, 0, collar_z)
        )
        collar = bpy.context.active_object
        collar.name = f'{name}_collar'
        collar.data.materials.append(mats['body'])
        parts.append(collar)

    # ── Shoulder ridges (Nexus only) ──
    if cfg.get('has_shoulders'):
        sr = cfg['shoulder_radius']
        for side, sx in [('L', -1), ('R', 1)]:
            bpy.ops.mesh.primitive_uv_sphere_add(
                segments=8, ring_count=6,
                radius=sr,
                location=(sx * (cfg['body_radius_top'] + sr * 0.5), 0,
                          cfg['body_height'] * 0.6)
            )
            shoulder = bpy.context.active_object
            shoulder.name = f'{name}_shoulder_{side}'
            shoulder.scale = (1.2, 0.8, 1.0)
            shoulder.data.materials.append(mats['body'])
            parts.append(shoulder)

    # ── Wisps (small teardrop shapes trailing below body) ──
    for i in range(cfg['num_wisps']):
        angle = (i / cfg['num_wisps']) * math.pi * 2
        offset_x = math.sin(angle) * 0.08
        offset_y = math.cos(angle) * 0.08
        wisp_z = -0.15 - i * 0.08

        bpy.ops.mesh.primitive_cone_add(
            vertices=4,
            radius1=cfg['wisp_radius'],
            radius2=0.005,
            depth=cfg['wisp_length'],
            location=(offset_x, offset_y, wisp_z)
        )
        wisp = bpy.context.active_object
        wisp.name = f'{name}_wisp_{i}'
        wisp.data.materials.append(mats['wisp'])
        parts.append(wisp)

    # ── Join all parts ──
    wraith = join_objects(parts, name)
    bpy.context.scene.cursor.location = (0, 0, 0)
    bpy.ops.object.origin_set(type='ORIGIN_CURSOR')
    bpy.ops.object.shade_smooth()

    return wraith


def build_wraith_armature(name: str, cfg: dict):
    """Build the wraith skeleton."""
    arm_obj, arm_data = create_armature(name)

    body_h = cfg['body_height']
    arm_y = body_h * 0.55
    arm_offset_x = cfg['body_radius_top'] + 0.05

    # Root
    add_bone(arm_data, 'root', (0, 0, -0.1), (0, 0, 0.1))

    # Body
    add_bone(arm_data, 'body', (0, 0, 0.1), (0, 0, body_h * 0.7), 'root', connected=True)

    # Head
    add_bone(arm_data, 'head', (0, 0, body_h * 0.7), (0, 0, cfg['head_height'] + cfg['head_radius']),
             'body', connected=True)

    # Arms
    for side, sx in [('L', -1), ('R', 1)]:
        shoulder_pos = (sx * cfg['body_radius_top'] * 0.5, 0, arm_y + 0.1)
        arm_end = (sx * (arm_offset_x + cfg['arm_length'] * 0.3), 0, arm_y - cfg['arm_length'] * 0.2)
        claw_end = (sx * (arm_offset_x + cfg['arm_length'] * 0.5), 0, arm_y - cfg['arm_length'] * 0.5)

        add_bone(arm_data, f'shoulder.{side}', shoulder_pos,
                 (sx * arm_offset_x, 0, arm_y), 'body')
        add_bone(arm_data, f'arm.{side}',
                 (sx * arm_offset_x, 0, arm_y), arm_end,
                 f'shoulder.{side}', connected=True)
        add_bone(arm_data, f'claw.{side}', arm_end, claw_end,
                 f'arm.{side}', connected=True)

    # Wisps
    for i in range(cfg['num_wisps']):
        angle = (i / cfg['num_wisps']) * math.pi * 2
        ox = math.sin(angle) * 0.08
        oy = math.cos(angle) * 0.08
        wz = -0.15 - i * 0.08

        add_bone(arm_data, f'wisp.{i:03d}',
                 (ox, oy, 0.0), (ox, oy, wz - cfg['wisp_length']),
                 'root')

    bpy.ops.object.mode_set(mode='OBJECT')
    return arm_obj


def rig_wraith(mesh_obj, arm_obj):
    """Parent wraith mesh to armature."""
    bpy.ops.object.select_all(action='DESELECT')
    mesh_obj.select_set(True)
    arm_obj.select_set(True)
    bpy.context.view_layer.objects.active = arm_obj
    bpy.ops.object.parent_set(type='ARMATURE_AUTO')
    bpy.ops.object.select_all(action='DESELECT')


def create_wraith_idle(arm_obj, cfg: dict):
    """Idle animation: hover, pulse, sway. 72 frames @ 24fps = 3s, loops."""
    create_action(arm_obj, 'idle')
    reset_pose(arm_obj)

    num_wisps = cfg['num_wisps']

    # Frame 0 (rest)
    set_keyframe(arm_obj, 'root', 0, location=(0, 0, 0))
    set_keyframe(arm_obj, 'body', 0, rotation=(0, 0, 0), scale=(1, 1, 1))
    set_keyframe(arm_obj, 'head', 0, rotation=(0, 0, 0))
    set_keyframe(arm_obj, 'shoulder.L', 0, rotation=(0, 0, 0))
    set_keyframe(arm_obj, 'shoulder.R', 0, rotation=(0, 0, 0))
    set_keyframe(arm_obj, 'arm.L', 0, rotation=(0, 0, 0))
    set_keyframe(arm_obj, 'arm.R', 0, rotation=(0, 0, 0))
    for i in range(num_wisps):
        set_keyframe(arm_obj, f'wisp.{i:03d}', 0, rotation=(0, 0, 0), location=(0, 0, 0))

    # Frame 18 — hover up, pulse expand, arms sway out
    set_keyframe(arm_obj, 'root', 18, location=(0, 0, 0.07))
    set_keyframe(arm_obj, 'body', 18, scale=(1.05, 1.05, 1.05))
    set_keyframe(arm_obj, 'head', 18, rotation=(4, 8, 0))
    set_keyframe(arm_obj, 'shoulder.L', 18, rotation=(0, 0, -12))
    set_keyframe(arm_obj, 'shoulder.R', 18, rotation=(0, 0, 12))
    set_keyframe(arm_obj, 'arm.L', 18, rotation=(8, 0, 0))
    set_keyframe(arm_obj, 'arm.R', 18, rotation=(-5, 0, 0))
    for i in range(num_wisps):
        phase = i * 4
        set_keyframe(arm_obj, f'wisp.{i:03d}', 18,
                     rotation=(0, 0, 15 * (1 if i % 2 == 0 else -1)),
                     location=(0, 0, 0.05))

    # Frame 36 — hover down, pulse contract, arms sway opposite
    set_keyframe(arm_obj, 'root', 36, location=(0, 0, -0.03))
    set_keyframe(arm_obj, 'body', 36, rotation=(0, 0, 0), scale=(0.97, 0.97, 0.97))
    set_keyframe(arm_obj, 'head', 36, rotation=(-3, -6, 0))
    set_keyframe(arm_obj, 'shoulder.L', 36, rotation=(0, 0, 10))
    set_keyframe(arm_obj, 'shoulder.R', 36, rotation=(0, 0, -10))
    set_keyframe(arm_obj, 'arm.L', 36, rotation=(-6, 0, 0))
    set_keyframe(arm_obj, 'arm.R', 36, rotation=(6, 0, 0))
    for i in range(num_wisps):
        set_keyframe(arm_obj, f'wisp.{i:03d}', 36,
                     rotation=(0, 0, -12 * (1 if i % 2 == 0 else -1)),
                     location=(0, 0, -0.03))

    # Frame 54 — another hover peak
    set_keyframe(arm_obj, 'root', 54, location=(0, 0, 0.05))
    set_keyframe(arm_obj, 'body', 54, scale=(1.03, 1.03, 1.03))
    set_keyframe(arm_obj, 'head', 54, rotation=(2, 5, 0))
    set_keyframe(arm_obj, 'shoulder.L', 54, rotation=(0, 0, -8))
    set_keyframe(arm_obj, 'shoulder.R', 54, rotation=(0, 0, 8))
    set_keyframe(arm_obj, 'arm.L', 54, rotation=(5, 0, 0))
    set_keyframe(arm_obj, 'arm.R', 54, rotation=(-3, 0, 0))
    for i in range(num_wisps):
        set_keyframe(arm_obj, f'wisp.{i:03d}', 54,
                     rotation=(0, 0, 10 * (1 if i % 2 == 0 else -1)),
                     location=(0, 0, 0.03))

    # Frame 72 = Frame 0 (seamless loop)
    set_keyframe(arm_obj, 'root', 72, location=(0, 0, 0))
    set_keyframe(arm_obj, 'body', 72, rotation=(0, 0, 0), scale=(1, 1, 1))
    set_keyframe(arm_obj, 'head', 72, rotation=(0, 0, 0))
    set_keyframe(arm_obj, 'shoulder.L', 72, rotation=(0, 0, 0))
    set_keyframe(arm_obj, 'shoulder.R', 72, rotation=(0, 0, 0))
    set_keyframe(arm_obj, 'arm.L', 72, rotation=(0, 0, 0))
    set_keyframe(arm_obj, 'arm.R', 72, rotation=(0, 0, 0))
    for i in range(num_wisps):
        set_keyframe(arm_obj, f'wisp.{i:03d}', 72, rotation=(0, 0, 0), location=(0, 0, 0))

    finalize_action(arm_obj, 'idle')
    reset_pose(arm_obj)


def create_wraith_move(arm_obj, cfg: dict):
    """Move animation: lean forward, arms trail. 30 frames @ 24fps = 1.25s, loops."""
    create_action(arm_obj, 'move')
    reset_pose(arm_obj)

    num_wisps = cfg['num_wisps']

    # Frame 0
    set_keyframe(arm_obj, 'root', 0, location=(0, 0, 0))
    set_keyframe(arm_obj, 'body', 0, rotation=(8, 0, 0))
    set_keyframe(arm_obj, 'head', 0, rotation=(5, 0, 0))
    set_keyframe(arm_obj, 'shoulder.L', 0, rotation=(20, 0, -15))
    set_keyframe(arm_obj, 'shoulder.R', 0, rotation=(-10, 0, 15))
    set_keyframe(arm_obj, 'arm.L', 0, rotation=(10, 0, 0))
    set_keyframe(arm_obj, 'arm.R', 0, rotation=(-5, 0, 0))
    for i in range(num_wisps):
        set_keyframe(arm_obj, f'wisp.{i:03d}', 0, rotation=(15, 0, 0))

    # Frame 8 — bob up
    set_keyframe(arm_obj, 'root', 8, location=(0, 0, 0.06))
    set_keyframe(arm_obj, 'shoulder.L', 8, rotation=(-15, 0, -20))
    set_keyframe(arm_obj, 'shoulder.R', 8, rotation=(25, 0, 20))
    set_keyframe(arm_obj, 'arm.L', 8, rotation=(-8, 0, 0))
    set_keyframe(arm_obj, 'arm.R', 8, rotation=(12, 0, 0))

    # Frame 15 — bob down
    set_keyframe(arm_obj, 'root', 15, location=(0, 0, -0.02))
    set_keyframe(arm_obj, 'shoulder.L', 15, rotation=(25, 0, -12))
    set_keyframe(arm_obj, 'shoulder.R', 15, rotation=(-15, 0, 12))
    set_keyframe(arm_obj, 'arm.L', 15, rotation=(12, 0, 0))
    set_keyframe(arm_obj, 'arm.R', 15, rotation=(-8, 0, 0))

    # Frame 23 — bob up again
    set_keyframe(arm_obj, 'root', 23, location=(0, 0, 0.04))
    set_keyframe(arm_obj, 'shoulder.L', 23, rotation=(-10, 0, -18))
    set_keyframe(arm_obj, 'shoulder.R', 23, rotation=(20, 0, 18))
    set_keyframe(arm_obj, 'arm.L', 23, rotation=(-6, 0, 0))
    set_keyframe(arm_obj, 'arm.R', 23, rotation=(10, 0, 0))

    # Frame 30 = Frame 0 (loop)
    set_keyframe(arm_obj, 'root', 30, location=(0, 0, 0))
    set_keyframe(arm_obj, 'body', 30, rotation=(8, 0, 0))
    set_keyframe(arm_obj, 'head', 30, rotation=(5, 0, 0))
    set_keyframe(arm_obj, 'shoulder.L', 30, rotation=(20, 0, -15))
    set_keyframe(arm_obj, 'shoulder.R', 30, rotation=(-10, 0, 15))
    set_keyframe(arm_obj, 'arm.L', 30, rotation=(10, 0, 0))
    set_keyframe(arm_obj, 'arm.R', 30, rotation=(-5, 0, 0))
    for i in range(num_wisps):
        set_keyframe(arm_obj, f'wisp.{i:03d}', 30, rotation=(15, 0, 0))

    finalize_action(arm_obj, 'move')
    reset_pose(arm_obj)


def create_wraith_death(arm_obj, cfg: dict):
    """Death animation: burst + collapse. 10 frames @ 24fps = 0.42s ≈ 400ms, no loop."""
    create_action(arm_obj, 'death')
    reset_pose(arm_obj)

    num_wisps = cfg['num_wisps']

    # Frame 0: alive
    set_keyframe(arm_obj, 'root', 0, location=(0, 0, 0), rotation=(0, 0, 0), scale=(1, 1, 1))
    set_keyframe(arm_obj, 'body', 0, scale=(1, 1, 1))
    set_keyframe(arm_obj, 'head', 0, location=(0, 0, 0))
    set_keyframe(arm_obj, 'shoulder.L', 0, rotation=(0, 0, 0))
    set_keyframe(arm_obj, 'shoulder.R', 0, rotation=(0, 0, 0))
    for i in range(num_wisps):
        set_keyframe(arm_obj, f'wisp.{i:03d}', 0, location=(0, 0, 0), rotation=(0, 0, 0))

    # Frame 3: burst outward — expand, arms fling, head pops up
    set_keyframe(arm_obj, 'body', 3, scale=(1.5, 1.5, 1.5))
    set_keyframe(arm_obj, 'head', 3, location=(0, 0, 0.3))
    set_keyframe(arm_obj, 'shoulder.L', 3, rotation=(30, 0, -90))
    set_keyframe(arm_obj, 'shoulder.R', 3, rotation=(30, 0, 90))
    set_keyframe(arm_obj, 'root', 3, rotation=(0, 180, 0))
    for i in range(num_wisps):
        angle = (i / num_wisps) * 360
        set_keyframe(arm_obj, f'wisp.{i:03d}', 3,
                     location=(math.sin(math.radians(angle)) * 0.15, 0, -0.2),
                     rotation=(0, 0, 30 * (1 if i % 2 == 0 else -1)))

    # Frame 7: collapsing inward, spinning
    set_keyframe(arm_obj, 'body', 7, scale=(0.3, 0.3, 0.3))
    set_keyframe(arm_obj, 'head', 7, location=(0, 0, 0.1))
    set_keyframe(arm_obj, 'root', 7, rotation=(0, 540, 0), scale=(0.3, 0.3, 0.3))
    set_keyframe(arm_obj, 'shoulder.L', 7, rotation=(60, 0, -45))
    set_keyframe(arm_obj, 'shoulder.R', 7, rotation=(60, 0, 45))

    # Frame 10: gone
    set_keyframe(arm_obj, 'root', 10, rotation=(0, 720, 0), scale=(0.01, 0.01, 0.01))
    set_keyframe(arm_obj, 'body', 10, scale=(0.01, 0.01, 0.01))
    set_keyframe(arm_obj, 'head', 10, location=(0, 0, 0))

    finalize_action(arm_obj, 'death')
    reset_pose(arm_obj)


def generate_enemy(name: str, cfg: dict):
    """Generate a single enemy type."""
    print(f'  Generating {name}...')

    clear_scene()
    bpy.context.scene.render.fps = FPS

    mats = create_wraith_materials(name, cfg)
    mesh = build_wraith_mesh(name, cfg, mats)
    arm_obj = build_wraith_armature(name, cfg)
    rig_wraith(mesh, arm_obj)

    create_wraith_idle(arm_obj, cfg)
    create_wraith_move(arm_obj, cfg)
    create_wraith_death(arm_obj, cfg)

    output_path = os.path.join(PROJECT_DIR, 'public', 'models', f'{name}.glb')
    export_glb(output_path)


def main():
    print('=== Generating enemy models ===')

    for name, cfg in ENEMY_TYPES.items():
        generate_enemy(name, cfg)

    print('=== All enemy models complete ===')


if __name__ == '__main__':
    main()
