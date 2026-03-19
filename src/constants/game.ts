/** Fixed logic timestep in milliseconds (60Hz) */
export const FIXED_STEP = 1000 / 60

/** Max dt before clamping — prevents spiral of death on tab resume */
export const MAX_DT = 100

/** Half-width of the square arena in world units (total size = 20×20) */
export const ARENA_HALF_SIZE = 10

/** Height of the arena boundary walls */
export const ARENA_WALL_HEIGHT = 2

/** Camera Y height above arena */
export const CAMERA_Y = 22

/** Camera Z offset for slight isometric angle */
export const CAMERA_Z_OFFSET = 14

/** Starting player health */
export const PLAYER_HEALTH = 100
