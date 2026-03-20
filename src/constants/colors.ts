/** CSS hex strings — use in DOM / CSS custom properties */
export const COLORS = {
  BACKGROUND:       '#080816',
  ARENA_SURFACE:    '#0E0E28',
  COLD_BLUE:        '#4A6FA5',
  TEAL:             '#2DD4BF',
  AMBER:            '#F59E0B',
  GOLD:             '#EAB308',
  HOT_PINK:         '#EC4899',
  CRIMSON:          '#DC2626',
  SOFT_WHITE:       '#E8E4D8',
  PEAK_WHITE:       '#FFFFFF',
  HUD_TEXT:         '#C8C4BC',
  HUD_DIM:          '#5A5660',
  HEALTH_FULL:      '#2DD4BF',
  HEALTH_LOW:       '#EC4899',
  PROJECTILE_CORE:  '#F59E0B',
  PROJECTILE_OUTER: '#EA580C',
} as const

/** Three.js numeric hex values — use in material color/emissive */
export const HEX = {
  BACKGROUND:  0x080816,
  COLD_BLUE:   0x4A6FA5,
  TEAL:        0x2DD4BF,
  AMBER:       0xF59E0B,
  GOLD:        0xEAB308,
  HOT_PINK:    0xEC4899,
  CRIMSON:     0xDC2626,
  SOFT_WHITE:  0xE8E4D8,
  FULMEN:      0xEAB308,  // Gold
  GELU:        0x2DD4BF,  // Teal
  ARMA:        0xE8E4D8,  // Soft white
  BREVE:       0x4A6FA5,  // Cold blue
} as const

/** Per-spell primary CSS colors for HUD */
export const SPELL_COLORS: Record<string, string> = {
  fulmen: '#EAB308',
  gelu:   '#2DD4BF',
  arma:   '#E8E4D8',
  breve:  '#4A6FA5',
}
