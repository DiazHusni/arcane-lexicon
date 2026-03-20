/**
 * SFX — Web Audio API procedural sounds.
 * No audio files — all sounds are synthesized.
 */

export interface SfxContext {
  ctx: AudioContext
  masterGain: GainNode
  ambientNode: OscillatorNode | null
}

/** Create the AudioContext (must be called after a user gesture). */
export function initSfx(): SfxContext {
  const ctx = new AudioContext()
  const masterGain = ctx.createGain()
  masterGain.gain.value = 0.4
  masterGain.connect(ctx.destination)

  return { ctx, masterGain, ambientNode: null }
}

/** Start the ambient dungeon hum. Call once after AudioContext is unblocked. */
export function startAmbient(sfx: SfxContext): void {
  if (sfx.ambientNode) return

  const t = sfx.ctx.currentTime

  // Low bass hum
  const osc1 = sfx.ctx.createOscillator()
  osc1.type = 'sine'
  osc1.frequency.value = 55 // A1

  const osc2 = sfx.ctx.createOscillator()
  osc2.type = 'sine'
  osc2.frequency.value = 58 // slightly detuned for beating

  const lfo = sfx.ctx.createOscillator()
  lfo.type = 'sine'
  lfo.frequency.value = 0.1 // very slow modulation

  const lfoGain = sfx.ctx.createGain()
  lfoGain.gain.value = 3

  const ambGain = sfx.ctx.createGain()
  ambGain.gain.value = 0

  lfo.connect(lfoGain)
  lfoGain.connect(osc1.frequency)

  osc1.connect(ambGain)
  osc2.connect(ambGain)
  ambGain.connect(sfx.masterGain)

  osc1.start(t)
  osc2.start(t)
  lfo.start(t)

  // Fade in slowly
  ambGain.gain.setValueAtTime(0, t)
  ambGain.gain.linearRampToValueAtTime(0.15, t + 3)

  sfx.ambientNode = osc1
}

/** FULMEN — sharp crack + chain electricity buzz */
export function playFulmen(sfx: SfxContext): void {
  const t = sfx.ctx.currentTime + 0.01

  // Crack: short noise burst
  const bufferSize = sfx.ctx.sampleRate * 0.05
  const noiseBuffer = sfx.ctx.createBuffer(1, bufferSize, sfx.ctx.sampleRate)
  const data = noiseBuffer.getChannelData(0)
  for (let i = 0; i < bufferSize; i++) data[i] = Math.random() * 2 - 1

  const noise = sfx.ctx.createBufferSource()
  noise.buffer = noiseBuffer

  const noiseFilter = sfx.ctx.createBiquadFilter()
  noiseFilter.type = 'highpass'
  noiseFilter.frequency.value = 2000

  const noiseGain = sfx.ctx.createGain()
  noiseGain.gain.setValueAtTime(0.8, t)
  noiseGain.gain.exponentialRampToValueAtTime(0.001, t + 0.15)

  noise.connect(noiseFilter)
  noiseFilter.connect(noiseGain)
  noiseGain.connect(sfx.masterGain)
  noise.start(t)

  // Electrical buzz chain
  for (let i = 0; i < 3; i++) {
    const buzzT = t + i * 0.07
    const osc = sfx.ctx.createOscillator()
    osc.type = 'sawtooth'
    osc.frequency.value = 180 + i * 60
    const g = sfx.ctx.createGain()
    g.gain.setValueAtTime(0.15, buzzT)
    g.gain.exponentialRampToValueAtTime(0.001, buzzT + 0.12)
    osc.connect(g)
    g.connect(sfx.masterGain)
    osc.start(buzzT)
    osc.stop(buzzT + 0.15)
  }
}

/** GELU — high crystal ping + reverb tail */
export function playGelu(sfx: SfxContext): void {
  const t = sfx.ctx.currentTime + 0.01

  // Crystal ping: high sine bell
  const osc = sfx.ctx.createOscillator()
  osc.type = 'sine'
  osc.frequency.setValueAtTime(1200, t)
  osc.frequency.exponentialRampToValueAtTime(800, t + 0.5)

  const g = sfx.ctx.createGain()
  g.gain.setValueAtTime(0.5, t)
  g.gain.exponentialRampToValueAtTime(0.001, t + 1.2)

  osc.connect(g)
  g.connect(sfx.masterGain)
  osc.start(t)
  osc.stop(t + 1.3)

  // Second harmonic for shimmer
  const osc2 = sfx.ctx.createOscillator()
  osc2.type = 'sine'
  osc2.frequency.setValueAtTime(2400, t)
  osc2.frequency.exponentialRampToValueAtTime(1600, t + 0.3)
  const g2 = sfx.ctx.createGain()
  g2.gain.setValueAtTime(0.2, t)
  g2.gain.exponentialRampToValueAtTime(0.001, t + 0.8)
  osc2.connect(g2)
  g2.connect(sfx.masterGain)
  osc2.start(t)
  osc2.stop(t + 0.9)
}

/** ARMA — resonant bell strike on cast; glass-shatter on shield break */
export function playArma(sfx: SfxContext): void {
  const t = sfx.ctx.currentTime + 0.01

  // Bell strike: medium sine with slow decay
  const freqs = [300, 600, 900, 1500]
  for (const freq of freqs) {
    const osc = sfx.ctx.createOscillator()
    osc.type = 'sine'
    osc.frequency.value = freq
    const g = sfx.ctx.createGain()
    const vol = 0.3 / (freq / 300) // higher harmonics quieter
    g.gain.setValueAtTime(vol, t)
    g.gain.exponentialRampToValueAtTime(0.001, t + 2.5)
    osc.connect(g)
    g.connect(sfx.masterGain)
    osc.start(t)
    osc.stop(t + 2.6)
  }
}

/** ARMA shield shatter sound */
export function playArmaShatter(sfx: SfxContext): void {
  const t = sfx.ctx.currentTime + 0.01

  // High-freq noise burst
  const bufferSize = sfx.ctx.sampleRate * 0.15
  const buf = sfx.ctx.createBuffer(1, bufferSize, sfx.ctx.sampleRate)
  const data = buf.getChannelData(0)
  for (let i = 0; i < bufferSize; i++) data[i] = Math.random() * 2 - 1

  const src = sfx.ctx.createBufferSource()
  src.buffer = buf

  const filter = sfx.ctx.createBiquadFilter()
  filter.type = 'bandpass'
  filter.frequency.value = 4000
  filter.Q.value = 0.5

  const g = sfx.ctx.createGain()
  g.gain.setValueAtTime(0.6, t)
  g.gain.exponentialRampToValueAtTime(0.001, t + 0.4)

  src.connect(filter)
  filter.connect(g)
  g.connect(sfx.masterGain)
  src.start(t)
}

/** BREVE — rapid staccato clip */
export function playBreve(sfx: SfxContext): void {
  const t = sfx.ctx.currentTime + 0.01

  for (let i = 0; i < 5; i++) {
    const clipT = t + i * 0.04
    const osc = sfx.ctx.createOscillator()
    osc.type = 'square'
    osc.frequency.value = 400 - i * 30
    const g = sfx.ctx.createGain()
    g.gain.setValueAtTime(0.2, clipT)
    g.gain.exponentialRampToValueAtTime(0.001, clipT + 0.035)
    osc.connect(g)
    g.connect(sfx.masterGain)
    osc.start(clipT)
    osc.stop(clipT + 0.04)
  }
}

/** Kill projectile launch — low whoosh */
export function playLaunch(sfx: SfxContext): void {
  const t = sfx.ctx.currentTime + 0.01

  const osc = sfx.ctx.createOscillator()
  osc.type = 'sawtooth'
  osc.frequency.setValueAtTime(200, t)
  osc.frequency.exponentialRampToValueAtTime(80, t + 0.2)

  const filter = sfx.ctx.createBiquadFilter()
  filter.type = 'lowpass'
  filter.frequency.value = 600

  const g = sfx.ctx.createGain()
  g.gain.setValueAtTime(0.25, t)
  g.gain.exponentialRampToValueAtTime(0.001, t + 0.25)

  osc.connect(filter)
  filter.connect(g)
  g.connect(sfx.masterGain)
  osc.start(t)
  osc.stop(t + 0.3)
}

/** Projectile impact — crack */
export function playImpact(sfx: SfxContext, wordLength: number): void {
  const t = sfx.ctx.currentTime + 0.01
  const intensity = Math.min(1, (wordLength - 3) / 9)

  const bufferSize = sfx.ctx.sampleRate * 0.08
  const buf = sfx.ctx.createBuffer(1, bufferSize, sfx.ctx.sampleRate)
  const data = buf.getChannelData(0)
  for (let i = 0; i < bufferSize; i++) data[i] = Math.random() * 2 - 1

  const src = sfx.ctx.createBufferSource()
  src.buffer = buf

  const g = sfx.ctx.createGain()
  const vol = 0.3 + intensity * 0.4
  g.gain.setValueAtTime(vol, t)
  g.gain.exponentialRampToValueAtTime(0.001, t + 0.25)

  src.connect(g)
  g.connect(sfx.masterGain)
  src.start(t)
}

/** Player hit — thud */
export function playPlayerHit(sfx: SfxContext): void {
  const t = sfx.ctx.currentTime + 0.01

  const osc = sfx.ctx.createOscillator()
  osc.type = 'sine'
  osc.frequency.setValueAtTime(80, t)
  osc.frequency.exponentialRampToValueAtTime(40, t + 0.3)

  const g = sfx.ctx.createGain()
  g.gain.setValueAtTime(0.6, t)
  g.gain.exponentialRampToValueAtTime(0.001, t + 0.4)

  osc.connect(g)
  g.connect(sfx.masterGain)
  osc.start(t)
  osc.stop(t + 0.5)
}

/** Spell sound dispatch */
export function playSpell(sfx: SfxContext, spellWord: string): void {
  switch (spellWord) {
    case 'fulmen': playFulmen(sfx); break
    case 'gelu':   playGelu(sfx);   break
    case 'arma':   playArma(sfx);   break
    case 'breve':  playBreve(sfx);  break
  }
}
