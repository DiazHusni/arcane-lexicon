import type { SpellDefinition } from '../types/spell'
import {
  ARMA_SHIELD_EXPIRY_MS,
  GELU_SLOW_TOTAL_MS,
  BREVE_SHORTEN_LETTERS,
  BREVE_DURATION_MS,
  FULMEN_RADIUS,
} from '../constants/game'

export const SPELL_DEFINITIONS: SpellDefinition[] = [
  {
    word: 'fulmen',
    cooldownMs: 5000,
    target: 'all',
    effect: { type: 'aoe_clear', radius: FULMEN_RADIUS },
    vfxKey: 'fulmen',
    sfxKey: 'fulmen',
    unlockAtKills: 0,
  },
  {
    word: 'gelu',
    cooldownMs: 4000,
    target: 'all',
    effect: { type: 'freeze', durationMs: GELU_SLOW_TOTAL_MS },
    vfxKey: 'gelu',
    sfxKey: 'gelu',
    unlockAtKills: 5,
  },
  {
    word: 'arma',
    cooldownMs: 14000,
    target: 'player',
    effect: { type: 'shield', blocksNextHit: true, expiryMs: ARMA_SHIELD_EXPIRY_MS },
    vfxKey: 'arma',
    sfxKey: 'arma',
    unlockAtKills: 15,
  },
  {
    word: 'breve',
    cooldownMs: 6000,
    target: 'all',
    effect: { type: 'shorten', letters: BREVE_SHORTEN_LETTERS, durationMs: BREVE_DURATION_MS },
    vfxKey: 'breve',
    sfxKey: 'breve',
    unlockAtKills: 25,
  },
]

export const SPELL_WORDS = SPELL_DEFINITIONS.map(d => d.word)

export function getSpellDefinition(word: string): SpellDefinition | null {
  return SPELL_DEFINITIONS.find(d => d.word === word) ?? null
}

/** Returns true if any spell word starts with buffer. */
export function hasSpellPrefix(buffer: string, unlockedWords: string[]): boolean {
  if (buffer.length === 0) return false
  return unlockedWords.some(w => w.startsWith(buffer))
}
