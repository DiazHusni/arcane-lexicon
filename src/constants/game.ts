/** Fixed logic timestep in milliseconds (60Hz) */
export const FIXED_STEP = 1000 / 60

/** Max dt before clamping — prevents spiral of death on tab resume */
export const MAX_DT = 100

/** Half-width of the square arena in world units (total size = 32×32) */
export const ARENA_HALF_SIZE = 16

/** Height of the arena boundary walls */
export const ARENA_WALL_HEIGHT = 2

/** Camera Y height above arena */
export const CAMERA_Y = 34

/** Camera Z offset for slight isometric angle */
export const CAMERA_Z_OFFSET = 22

/** Starting player health (0–100) */
export const PLAYER_HEALTH = 100

// ── Phase 2: Combat ───────────────────────────────────────────────────────

/** Damage dealt per contact hit */
export const CONTACT_DAMAGE = 10

/** Warning flash duration before contact damage is applied (ms) */
export const DAMAGE_WARNING_MS = 300

/** Per-enemy cooldown between damage ticks — prevents spam (ms) */
export const DAMAGE_COOLDOWN_MS = 500

/** Kill projectile travel speed (world units / second) */
export const PROJECTILE_SPEED = 12

/** Number of pre-allocated projectile pool slots */
export const PROJECTILE_POOL_SIZE = 10

/** ARMA: shield passive expiry time (ms) */
export const ARMA_SHIELD_EXPIRY_MS = 3000

/** ARMA: push + stun radius on contact trigger (world units) */
export const ARMA_PUSH_RADIUS = 6.0

/** ARMA: max push force applied to the nearest enemy (world units) */
export const ARMA_PUSH_FORCE = 8.0

/** ARMA: stun duration applied to nearby enemies on contact trigger (ms) */
export const ARMA_STUN_MS = 2000

/** GELU: total slow duration including ramp-back (ms) */
export const GELU_SLOW_TOTAL_MS = 7000

/** GELU: ramp-back duration at end of slow (ms) */
export const GELU_RAMP_BACK_MS = 2000

/** GELU: enemy speed multiplier at peak slow */
export const GELU_SLOW_FACTOR = 0.4

/** BREVE: number of letters stripped from the right of each enemy word */
export const BREVE_SHORTEN_LETTERS = 3

/** BREVE: duration of word shortening (ms) */
export const BREVE_DURATION_MS = 5000

/** Duration of WAVE_CLEAR state before next wave spawns (ms) */
export const WAVE_CLEAR_MS = 1500

/** Duration of DYING state before DEAD state (ms) */
export const DYING_MS = 2000

/** Combo: window in which kills chain into a multiplier (ms) */
export const COMBO_RESET_MS = 1000

/** Combo: maximum multiplier */
export const COMBO_MAX = 5.0

/** Combo: multiplier gain per kill */
export const COMBO_STEP = 0.5

/** FULMEN: AoE clear radius (covers full arena) */
export const FULMEN_RADIUS = 999

/** Enemy spawn Y position (just above floor) */
export const ENEMY_SPAWN_Y = 0.5

/**
 * Returns true if a point (x, z) is inside the hexagonal arena.
 * Uses the 3-axis constraint for a regular hexagon with circumradius R.
 */
export function isInsideArenaHex(x: number, z: number): boolean {
  const apothem = ARENA_HALF_SIZE * Math.sqrt(3) / 2
  if (Math.abs(z) > apothem) return false
  if (Math.abs(x * 0.8660254 + z * 0.5) > apothem) return false  // √3/2 ≈ 0.8660254
  if (Math.abs(x * 0.8660254 - z * 0.5) > apothem) return false
  return true
}

/** Large outer ground plane half-size (fills screen to horizon) */
export const GROUND_RADIUS = 150

/** Spawn boundary x half-width — matches screen left/right edges at y=0 */
export const SPAWN_HALF_W = 52

/** Spawn boundary z near edge — matches screen bottom edge at y=0 */
export const SPAWN_Z_NEAR = 20

/** Spawn boundary z far edge — matches screen top edge at y=0 */
export const SPAWN_Z_FAR = -36

// ── Phase 3: Visual Spectacle ─────────────────────────────────────────────

/** Number of pre-allocated point lights in the spell light pool */
export const POINT_LIGHT_POOL_SIZE = 6

/** Bloom strength at zero intensity (base) */
export const BLOOM_STRENGTH_BASE = 0.3

/** Bloom strength at full intensity (peak) */
export const BLOOM_STRENGTH_MAX = 1.2

/** Bloom radius (how far bloom bleeds) */
export const BLOOM_RADIUS = 0.5

/** Bloom threshold — only pixels brighter than this bloom */
export const BLOOM_THRESHOLD = 0.85

/** Vignette strength at rest */
export const VIGNETTE_BASE = 0.3

/** Vignette strength on player hit */
export const VIGNETTE_HIT = 0.6

/** Duration for vignette to fade back to base after hit (ms) */
export const VIGNETTE_FADE_MS = 1000

/** Intensity = Math.min(1, (wave - 1) / INTENSITY_WAVE_CAP) */
export const INTENSITY_WAVE_CAP = 6

/** FogExp2 density */
export const FOG_DENSITY = 0.02

/** Ambient particle count (always-present drifting particles) */
export const AMBIENT_PARTICLE_COUNT = 50

/** Enemy death animation duration (ms) — mesh fades/scales before hiding */
export const ENEMY_DEATH_ANIM_MS = 400

// Camera shake amplitudes and durations per event
export const SHAKE = {
  PROJECTILE_IMPACT_BASE:   0.03,
  PROJECTILE_IMPACT_PER:    0.006,
  PROJECTILE_IMPACT_MS:     150,
  FULMEN:                   0.15,
  FULMEN_MS:                400,
  ARMA_TRIGGER:             0.06,
  ARMA_TRIGGER_MS:          200,
  PLAYER_HIT:               0.08,
  PLAYER_HIT_MS:            250,
  NEXUS_PHASE2_DEATH:       0.25,
  NEXUS_PHASE2_DEATH_MS:    600,
  NEXUS_TRANSITION:         0.15,
  NEXUS_TRANSITION_MS:      400,
  COMBO_BIG:                0.10,
  COMBO_BIG_MS:             300,
} as const
