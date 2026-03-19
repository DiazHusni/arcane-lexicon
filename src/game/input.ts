export interface InputState {
  readonly buffer: readonly string[]
}

export function createInputState(): InputState {
  return { buffer: [] }
}

/**
 * Process a single keydown event. Returns a new InputState.
 * Accepts only A-Z (case-insensitive) and Backspace — all other keys are silently ignored.
 */
export function handleKeydown(state: InputState, key: string): InputState {
  if (key === 'Backspace') {
    return { buffer: state.buffer.slice(0, -1) }
  }
  if (key.match(/^[A-Z]$/i)) {
    return { buffer: [...state.buffer, key.toLowerCase()] }
  }
  // Non-alpha, non-backspace: ignored silently per spec
  return state
}

/** Returns the current buffer as a single lowercase string. */
export function getBufferString(state: InputState): string {
  return state.buffer.join('')
}

/** Returns a new InputState with an empty buffer. */
export function clearBuffer(_state: InputState): InputState {
  return { buffer: [] }
}
