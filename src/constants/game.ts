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
export const ARMA_SHIELD_EXPIRY_MS = 15000

/** ARMA: push + stun radius on contact trigger (world units) */
export const ARMA_PUSH_RADIUS = 2.5

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
