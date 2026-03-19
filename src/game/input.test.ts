import { describe, it, expect } from 'vitest'
import {
  createInputState,
  handleKeydown,
  getBufferString,
  clearBuffer,
} from './input'

describe('input buffer', () => {
  it('starts empty', () => {
    const state = createInputState()
    expect(getBufferString(state)).toBe('')
  })

  it('appends a lowercase letter', () => {
    const state = handleKeydown(createInputState(), 'a')
    expect(getBufferString(state)).toBe('a')
  })

  it('normalises uppercase to lowercase', () => {
    const state = handleKeydown(createInputState(), 'A')
    expect(getBufferString(state)).toBe('a')
  })

  it('builds a word from multiple keystrokes', () => {
    let state = createInputState()
    for (const ch of 'hello') state = handleKeydown(state, ch)
    expect(getBufferString(state)).toBe('hello')
  })

  it('backspace removes the last character', () => {
    let state = createInputState()
    state = handleKeydown(state, 'a')
    state = handleKeydown(state, 'b')
    state = handleKeydown(state, 'Backspace')
    expect(getBufferString(state)).toBe('a')
  })

  it('backspace on an empty buffer is a no-op', () => {
    const state = handleKeydown(createInputState(), 'Backspace')
    expect(getBufferString(state)).toBe('')
  })

  it('ignores digits', () => {
    const state = handleKeydown(createInputState(), '3')
    expect(getBufferString(state)).toBe('')
  })

  it('ignores symbols', () => {
    const state = handleKeydown(createInputState(), '!')
    expect(getBufferString(state)).toBe('')
  })

  it('ignores space', () => {
    const state = handleKeydown(createInputState(), ' ')
    expect(getBufferString(state)).toBe('')
  })

  it('ignores arrow keys', () => {
    const state = handleKeydown(createInputState(), 'ArrowLeft')
    expect(getBufferString(state)).toBe('')
  })

  it('ignores emoji / unicode multi-char sequences', () => {
    const state = handleKeydown(createInputState(), '😀')
    expect(getBufferString(state)).toBe('')
  })

  it('ignores accented / non-ASCII letters', () => {
    const state = handleKeydown(createInputState(), 'é')
    expect(getBufferString(state)).toBe('')
  })

  it('clearBuffer empties a non-empty buffer', () => {
    let state = createInputState()
    state = handleKeydown(state, 'a')
    state = handleKeydown(state, 'b')
    state = clearBuffer(state)
    expect(getBufferString(state)).toBe('')
  })

  it('clearBuffer on an already-empty buffer is a no-op', () => {
    const state = clearBuffer(createInputState())
    expect(getBufferString(state)).toBe('')
  })

  it('handleKeydown never mutates the previous state', () => {
    const original = createInputState()
    handleKeydown(original, 'x')
    expect(getBufferString(original)).toBe('')
  })
})
