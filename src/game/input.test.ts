import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import {
  createInputState,
  handleKeydown,
  getBufferString,
  clearBuffer,
  findAutoFocusEnemy,
} from './input'
import { registerEnemy, clearRegistry } from '../entities/enemies/wordAssignment'
import type { SpellState } from '../types/spell'

// ── Helpers ───────────────────────────────────────────────────────────────

function noSpells(): SpellState[] { return [] }

function spells(words: string[], ready = true): SpellState[] {
  return words.map(w => ({
    word: w,
    cooldownRemaining: ready ? 0 : 5000,
    unlocked: true,
  }))
}

// ── Buffer basics (preserved from Phase 1) ────────────────────────────────

describe('input buffer basics', () => {
  beforeEach(() => clearRegistry())

  it('starts empty', () => {
    expect(getBufferString(createInputState())).toBe('')
  })

  it('typing with no registry → deadend, buffer cleared', () => {
    // With no enemies registered and no spells, any letter is a dead-end
    const r = handleKeydown(createInputState(), 'a', noSpells())
    expect(r.type).toBe('deadend')
    expect(getBufferString(r.newState)).toBe('')
  })

  it('normalises uppercase to lowercase', () => {
    const r = handleKeydown(createInputState(), 'A', noSpells())
    expect(getBufferString(r.newState)).toBe('')  // deadend clears
  })

  it('backspace removes last character', () => {
    clearRegistry()
    registerEnemy(1, 'stab')
    let state = createInputState()
    state = handleKeydown(state, 's', noSpells()).newState
    state = handleKeydown(state, 't', noSpells()).newState
    const r = handleKeydown(state, 'Backspace', noSpells())
    expect(getBufferString(r.newState)).toBe('s')
    expect(r.type).toBe('none')
  })

  it('backspace on empty buffer is a no-op', () => {
    const r = handleKeydown(createInputState(), 'Backspace', noSpells())
    expect(getBufferString(r.newState)).toBe('')
  })

  it('ignores digits', () => {
    const r = handleKeydown(createInputState(), '3', noSpells())
    expect(r.type).toBe('none')
    expect(getBufferString(r.newState)).toBe('')
  })

  it('ignores symbols', () => {
    const r = handleKeydown(createInputState(), '!', noSpells())
    expect(r.type).toBe('none')
    expect(getBufferString(r.newState)).toBe('')
  })

  it('ignores space', () => {
    const r = handleKeydown(createInputState(), ' ', noSpells())
    expect(r.type).toBe('none')
  })

  it('ignores arrow keys', () => {
    const r = handleKeydown(createInputState(), 'ArrowLeft', noSpells())
    expect(r.type).toBe('none')
  })

  it('ignores emoji', () => {
    const r = handleKeydown(createInputState(), '😀', noSpells())
    expect(r.type).toBe('none')
  })

  it('clearBuffer empties a non-empty buffer', () => {
    let state = createInputState()
    state = handleKeydown(state, 'a', noSpells()).newState
    // might be cleared by deadend — rebuild manually
    clearRegistry()
    registerEnemy(1, 'abc')
    state = createInputState()
    state = handleKeydown(state, 'a', noSpells()).newState
    state = handleKeydown(state, 'b', noSpells()).newState
    state = clearBuffer(state)
    expect(getBufferString(state)).toBe('')
  })

  it('handleKeydown never mutates previous state', () => {
    clearRegistry()
    registerEnemy(1, 'xyz')
    const original = createInputState()
    handleKeydown(original, 'x', noSpells())
    expect(getBufferString(original)).toBe('')
  })
})

// ── Dual match: enemy kills ───────────────────────────────────────────────

describe('enemy word match', () => {
  beforeEach(() => {
    clearRegistry()
    registerEnemy(42, 'stab')
    registerEnemy(99, 'crush')
  })
  afterEach(() => clearRegistry())

  it('exact enemy word match → type=enemy, buffer cleared', () => {
    let state = createInputState()
    for (const ch of 'sta') state = handleKeydown(state, ch, noSpells()).newState
    const r = handleKeydown(state, 'b', noSpells())
    expect(r.type).toBe('enemy')
    expect(r.enemyId).toBe(42)
    expect(getBufferString(r.newState)).toBe('')
  })

  it('returns correct enemyId for second registered enemy', () => {
    let state = createInputState()
    for (const ch of 'crus') state = handleKeydown(state, ch, noSpells()).newState
    const r = handleKeydown(state, 'h', noSpells())
    expect(r.type).toBe('enemy')
    expect(r.enemyId).toBe(99)
  })

  it('partial prefix keeps buffer (no match yet)', () => {
    const r = handleKeydown(createInputState(), 's', noSpells())
    expect(r.type).toBe('none')
    expect(getBufferString(r.newState)).toBe('s')
  })
})

// ── Dual match: spell casts ───────────────────────────────────────────────

describe('spell word match', () => {
  beforeEach(() => clearRegistry())

  it('unlocked + ready spell match → type=spell, buffer cleared', () => {
    let state = createInputState()
    const mySpells = spells(['fulmen'])
    for (const ch of 'fulme') state = handleKeydown(state, ch, mySpells).newState
    const r = handleKeydown(state, 'n', mySpells)
    expect(r.type).toBe('spell')
    expect(r.spellWord).toBe('fulmen')
    expect(getBufferString(r.newState)).toBe('')
  })

  it('spell on cooldown does NOT match — buffer accumulates as prefix', () => {
    const mySpells = spells(['fulmen'], false)  // cooldown active
    let state = createInputState()
    let lastResult: ReturnType<typeof handleKeydown> | null = null
    for (const ch of 'fulmen') {
      lastResult = handleKeydown(state, ch, mySpells)
      state = lastResult.newState
    }
    // Prefix is valid (fulmen is a spell word), so no deadend fires
    // But cooldown prevents cast, so type stays 'none'
    expect(lastResult!.type).toBe('none')
    expect(getBufferString(state)).toBe('fulmen')
  })

  it('locked spell does NOT match', () => {
    const lockedSpells: SpellState[] = [{ word: 'gelu', cooldownRemaining: 0, unlocked: false }]
    let state = createInputState()
    for (const ch of 'gelu') {
      const r = handleKeydown(state, ch, lockedSpells)
      state = r.newState
    }
    expect(getBufferString(state)).toBe('')
  })
})

// ── Dead-end detection ────────────────────────────────────────────────────

describe('dead-end detection', () => {
  beforeEach(() => {
    clearRegistry()
    registerEnemy(1, 'stab')
  })
  afterEach(() => clearRegistry())

  it('typing a letter with no prefix match → type=deadend, buffer cleared', () => {
    // 'x' has no prefix match in registry or spells
    const r = handleKeydown(createInputState(), 'x', noSpells())
    expect(r.type).toBe('deadend')
    expect(getBufferString(r.newState)).toBe('')
  })

  it('second letter that kills the prefix → deadend', () => {
    // 'sk' — 's' is a prefix of 'stab', but 'sk' is not
    let state = handleKeydown(createInputState(), 's', noSpells()).newState
    const r = handleKeydown(state, 'k', noSpells())
    expect(r.type).toBe('deadend')
    expect(getBufferString(r.newState)).toBe('')
  })
})

// ── Auto-focus ────────────────────────────────────────────────────────────

describe('findAutoFocusEnemy', () => {
  it('empty buffer → nearest enemy', () => {
    const words = new Map([[1, 'stab'], [2, 'crush']])
    const positions = new Map([
      [1, { x: 5, z: 0 }],
      [2, { x: 1, z: 0 }],
    ])
    const id = findAutoFocusEnemy('', words, 0, 0, positions)
    expect(id).toBe(2)  // enemy 2 is closer
  })

  it('empty buffer with no enemies → null', () => {
    const id = findAutoFocusEnemy('', new Map(), 0, 0, new Map())
    expect(id).toBeNull()
  })

  it('buffer prefix matches one enemy word', () => {
    const words = new Map([[1, 'stab'], [2, 'crush']])
    const positions = new Map([[1, { x: 5, z: 0 }], [2, { x: 1, z: 0 }]])
    const id = findAutoFocusEnemy('st', words, 0, 0, positions)
    expect(id).toBe(1)
  })

  it('buffer prefix matches no enemy → null', () => {
    const words = new Map([[1, 'stab']])
    const positions = new Map([[1, { x: 5, z: 0 }]])
    const id = findAutoFocusEnemy('xx', words, 0, 0, positions)
    expect(id).toBeNull()
  })
})
