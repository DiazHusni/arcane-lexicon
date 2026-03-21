/** CSS hex strings — use in DOM / CSS custom properties */
export const COLORS = {
  BACKGROUND:       '#0A1628',
  ARENA_SURFACE:    '#1C2F22',
  COLD_BLUE:        '#00D4FF',  // Sheikah blue
  TEAL:             '#7DD4F0',  // Ice blue (GELU / Zora)
  AMBER:            '#FF8C20',  // Sheikah orange
  GOLD:             '#F0C040',  // Triforce gold
  HOT_PINK:         '#FF3A00',  // Calamity Ganon malice
  CRIMSON:          '#C01800',  // Deep danger / Nexus Phase 2
  SOFT_WHITE:       '#E8D9B8',  // Hylian parchment / ARMA
  PEAK_WHITE:       '#FFFFFF',
  HUD_TEXT:         '#C8B89C',  // Warm Hylian stone
  HUD_DIM:          '#3A5848',  // Muted forest green
  HEALTH_FULL:      '#00D4FF',  // Sheikah blue — alive and powered
  HEALTH_LOW:       '#FF3A00',  // Calamity orange-red — danger
  PROJECTILE_CORE:  '#F0C040',  // Triforce gold
  PROJECTILE_OUTER: '#FF8C20',  // Sheikah orange
} as const

/** Three.js numeric hex values — use in material color/emissive */
export const HEX = {
  BACKGROUND:  0x0A1628,
  COLD_BLUE:   0x00D4FF,  // Sheikah blue
  TEAL:        0x7DD4F0,  // Ice blue (GELU / Zora)
  AMBER:       0xFF8C20,  // Sheikah orange
  GOLD:        0xF0C040,  // Triforce gold
  HOT_PINK:    0xFF3A00,  // Calamity malice
  CRIMSON:     0xC01800,  // Deep danger
  SOFT_WHITE:  0xE8D9B8,  // Hylian parchment
  FULMEN:      0xF0C040,  // Triforce gold
  GELU:        0x7DD4F0,  // Ice blue
  ARMA:        0xE8D9B8,  // Hylian parchment
  BREVE:       0x00D4FF,  // Sheikah blue
} as const

/** Per-spell primary CSS colors for HUD */
export const SPELL_COLORS: Record<string, string> = {
  fulmen: '#F0C040',
  gelu:   '#7DD4F0',
  arma:   '#E8D9B8',
  breve:  '#00D4FF',
}
