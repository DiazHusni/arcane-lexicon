import type { EnemyType } from '../../types/enemy'

// ── Word pools by tier ────────────────────────────────────────────────────

/** 3-letter words (Wave 1–7 Acutus) */
const ACUTUS_3 = [
  'stab', 'fang', 'claw', 'gash', 'bolt', 'rage', 'bite', 'gore',
  'hack', 'jab', 'rip', 'cut', 'axe', 'grim', 'dark', 'fear',
  'hunt', 'kill', 'lash', 'maul', 'pain', 'scar', 'slay', 'void',
]

/** 4-letter words (Wave 8+ Acutus) */
const ACUTUS_4 = [
  'stab', 'fang', 'claw', 'gash', 'bolt', 'rage', 'bite', 'gore',
  'hack', 'rend', 'ruin', 'grim', 'dark', 'fear', 'hunt', 'kill',
  'lash', 'maul', 'pain', 'scar', 'slay', 'void', 'fury', 'bane',
  'doom', 'dusk', 'dusk', 'fell', 'gale', 'howl', 'lair', 'mire',
]

const SOLIDUS_WORDS = [
  'crush', 'smash', 'stomp', 'heavy', 'shred', 'smite',
  'blight', 'cleave', 'grind', 'pound', 'rend', 'wrath',
  'brutal', 'savage', 'terror', 'dread', 'plague', 'storm',
  'blaze', 'scorch', 'trample', 'ravage',
]

const PERFECTUS_WORDS = [
  'ancient', 'warden', 'crusher', 'endless', 'oblique', 'burning',
  'shadowed', 'stalker', 'forsaken', 'eternal', 'darkness',
  'conquest', 'dominant', 'ruthless', 'shattered', 'warlord',
  'fracture', 'torment', 'malice', 'corrupt',
]

const NEXUS_PHASE1_WORDS = [
  'sovereign', 'obliterate', 'destroyer', 'annihilate', 'cataclysm',
  'inevitable', 'apocalypse',
]

const NEXUS_PHASE2_WORDS = [
  'warden', 'tyrant', 'emperor', 'ravager',
]

// ── Registry: word → enemy id ─────────────────────────────────────────────

const registry = new Map<string, number>()

export function registerEnemy(id: number, word: string): void {
  registry.set(word, id)
}

export function unregisterEnemy(id: number, word: string): void {
  if (registry.get(word) === id) registry.delete(word)
}

export function clearRegistry(): void {
  registry.clear()
}

/** Returns the enemy id whose word exactly matches buffer, or null. */
export function findEnemyMatch(buffer: string): number | null {
  const id = registry.get(buffer)
  return id !== undefined ? id : null
}

/** Returns true if any registered word starts with buffer. */
export function hasEnemyPrefix(buffer: string): boolean {
  if (buffer.length === 0) return false
  for (const word of registry.keys()) {
    if (word.startsWith(buffer)) return true
  }
  return false
}

/** Returns the longest registered word length. */
export function getMaxEnemyWordLength(): number {
  let max = 0
  for (const word of registry.keys()) {
    if (word.length > max) max = word.length
  }
  return max
}

/** Assign a unique word for an enemy type given the current wave and used words. */
export function assignWord(
  type: EnemyType,
  wave: number,
  usedWords: Set<string>,
): string {
  const pool = getPool(type, wave)
  const available = pool.filter(w => !usedWords.has(w))
  const source = available.length > 0 ? available : pool
  return source[Math.floor(Math.random() * source.length)]
}

/** Assign a Nexus Phase 2 word (always shorter than Phase 1). */
export function assignNexusPhase2Word(
  phase1Word: string,
  usedWords: Set<string>,
): string {
  const available = NEXUS_PHASE2_WORDS.filter(
    w => w !== phase1Word && !usedWords.has(w),
  )
  const source = available.length > 0 ? available : NEXUS_PHASE2_WORDS
  return source[Math.floor(Math.random() * source.length)]
}

function getPool(type: EnemyType, wave: number): string[] {
  switch (type) {
    case 'acutus':    return wave >= 8 ? ACUTUS_4 : ACUTUS_3
    case 'solidus':   return SOLIDUS_WORDS
    case 'perfectus': return PERFECTUS_WORDS
    case 'nexus':     return NEXUS_PHASE1_WORDS
  }
}

/**
 * Startup constraint check: no spell word may be a prefix of an enemy word
 * and vice versa. Throws if a collision is found.
 */
export function checkPrefixCollisions(spellWords: string[]): void {
  const allEnemyWords = [
    ...ACUTUS_3, ...ACUTUS_4,
    ...SOLIDUS_WORDS, ...PERFECTUS_WORDS,
    ...NEXUS_PHASE1_WORDS, ...NEXUS_PHASE2_WORDS,
  ]
  for (const spell of spellWords) {
    for (const enemy of allEnemyWords) {
      if (spell === enemy) {
        throw new Error(`Exact collision: spell word "${spell}" is also an enemy word`)
      }
      if (enemy.startsWith(spell)) {
        throw new Error(`Prefix collision: enemy "${enemy}" starts with spell "${spell}"`)
      }
      if (spell.startsWith(enemy)) {
        throw new Error(`Prefix collision: spell "${spell}" starts with enemy "${enemy}"`)
      }
    }
  }
}
