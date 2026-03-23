# Arcane Lexicon — Architecture

How the modules connect, what calls what, and how data flows through a frame.

---

## Module Dependency Graph

Arrows mean "imports from." `constants/*` and `types/*` are imported by nearly
everything and are omitted from the diagram to keep it readable.

```
main.ts
  ├── renderer/context.ts    ← Three.js scene, camera, EffectComposer
  ├── renderer/hud.ts        ← DOM HUD elements (no Three.js dependency)
  ├── game/loop.ts           ← fixed-timestep scheduler
  ├── game/input.ts          ← keydown listener, word buffer
  └── game/state.ts          ← game state machine (coordinates everything)
        ├── entities/player.ts
        ├── game/wave.ts
        │     └── entities/enemies/
        │           acutus.ts  solidus.ts  perfectus.ts  nexus.ts
        │           (all extend entities/enemy.ts)
        ├── spells/system.ts
        │     ├── spells/definitions.ts   ← SpellDefinition[] data (4 spells)
        │     ├── spells/unlocks.ts       ← kill-milestone unlock tracker
        │     ├── entities/enemy.ts       ← read positions, apply freeze/shorten
        │     ├── entities/player.ts      ← apply shield (blocksNextHit)
        │     ├── renderer/vfx.ts         ← trigger visual effects
        │     └── renderer/sfx.ts         ← trigger sounds
        └── entities/enemies/wordAssignment.ts  ← English word pool, per-spawn assignment
```

**Key rule:** `renderer/*` never imports from `game/*` or `entities/*`.
Game state is passed into renderer functions as plain data — the renderer
reads but never owns game state.

---

## Data Flow: One Input → Kill or Spell

```
[keyboard keydown event]
        │
        ▼
game/input.ts
  wordBuffer.push(char)   OR   wordBuffer.pop() (backspace)
        │
        ▼  on every character typed — check both registries
        │
   ┌────┴──────────────────────────────────┐
   │  1. enemy word match?                  │
   │     wordAssignment.findMatch(buffer)   │
   └────┬──────────────────────────────────┘
        │ YES                           NO
        ▼                               │
  triggerEnemyKill(enemy)                     │
    ├── entities/enemy.ts: markForDeath()     │  ← dim label; enemy keeps moving
    ├── entities/projectile.ts: spawn(        │
    │     origin: player.position,            │
    │     target: enemy,                      │
    │     size: lerp(0.08, 0.40,              │
    │       (wordLength-3)/9)                 │
    │   )                                     │
    ├── renderer/vfx.ts: preImpactGlow()      │  ← ambient point light at target
    └── renderer/sfx.ts: playLaunch()         │
  input.ts: clearBuffer()                     │
  [projectile travels; on impact:]
    ├── entities/enemy.ts: die()              ← shatter geometry
    ├── renderer/vfx.ts: deathBurst(          ← particle count = 50 + wordLength * 20
    │     count: 50 + wordLength * 20)
    ├── renderer/sfx.ts: playImpact()
    ├── renderer/hud.ts: showScoreDelta()     ← "+10" float-up at impact point
    ├── spells/unlocks.ts: onKill()           ← check milestone, fire unlock if reached
    └── scoring: addPoints()                  │
                                        ▼
                           ┌────────────────────────┐
                           │  2. spell word match?   │
                           │  (unlocked spells only) │
                           │  system.ts: tryMatch()  │
                           └────────────┬───────────┘
                                        │ YES                NO
                                        ▼                    ▼
                              SpellDefinition found    wordBuffer stays,
                                        │               no-op (or fizzle if
                                        ▼               buffer is dead-end)
                              applySpellEffect(def, targets)
                                ├── entities/enemy.ts: applyFreeze() / shortenWord()
                                ├── entities/player.ts: applyShield()   ← sets blocksNextHit flag
                                ├── renderer/vfx.ts: spawnEffect(def.vfxKey, position)
                                └── renderer/sfx.ts: playSound(def.sfxKey)

                              system.ts: startCooldown(def.word, def.cooldownMs)
                              // ARMA exception: cooldown NOT started here — deferred to
                              // shield expiry in tickActiveEffects()
                              input.ts: clearBuffer()
                              renderer/hud.ts: flashSpellSlot(def.word)

Dead-end detection (either branch):
  if buffer.length > maxWordLength AND no prefix match in either registry → clearBuffer
```

---

## Data Flow: One Game Loop Frame

```
requestAnimationFrame(timestamp)
        │
        ▼
game/loop.ts
  rawDt = timestamp - lastTimestamp
  dt = min(rawDt, 100)              ← clamp: prevents spiral of death on tab resume
  accumulator += dt

  ┌─────────────────────────────────────────────────────┐
  │  while accumulator >= FIXED_STEP (16.67ms):          │
  │    game/state.ts.update(FIXED_STEP)                 │
  │      ├── entities/enemy.ts: move() for each enemy   │
  │      │     seek toward player + separation steering  │
  │      │     (move() is a no-op while stunTimer > 0)  │
  │      ├── entities/enemy.ts: tickProximityDamage()   │
  │      │     if dist(player,enemy) <= threatRadius:    │
  │      │       damageWarningTimer -= dt                │
  │      │       if expired → return DamageEvent, reset  │
  │      │       else flash enemy red (warning)          │
  │      │     [state.ts receives DamageEvent and checks │
  │      │      ARMA shield: if active → nullify damage, │
  │      │      push/stun in radius, startCooldown;      │
  │      │      else → player.applyDamage()]             │
  │      ├── spells/system.ts: tickCooldowns(dt)         │
  │      ├── spells/system.ts: tickActiveEffects(dt)     │
  │      │     GELU slow/ramp-back expiry                │
  │      │     ARMA shield expiry (hit absorbed OR 15s) │
  │      │       → on expiry: startCooldown('ARMA')     │
  │      │     BREVE word-shorten expiry                 │
  │      ├── entities/projectile.ts: move() for each    │
  │      │     travel toward target; onImpact() if close │
  │      ├── wave.ts: checkWaveComplete()                │
  │      └── state.ts: checkDeath()                      │
  │    accumulator -= FIXED_STEP                         │
  └─────────────────────────────────────────────────────┘

  alpha = accumulator / FIXED_STEP  ← interpolation factor [0,1]

  renderer/context.ts.render(alpha)
    ├── interpolate entity positions (prevPos + alpha * (currPos - prevPos))
    └── EffectComposer.render()
          ├── RenderPass        ← scene geometry
          ├── UnrealBloomPass   ← bloom on bright emissive objects (Phase 3+)
          └── OutputPass        ← gamma correction, output to canvas

  renderer/hud.ts.sync(gameState)
    ├── update #hud-word text (typed buffer)
    ├── update #hud-health width + color
    ├── update #hud-wave text
    ├── update each spell slot: lock state / cooldown overlay / unlock glow (CSS animation)
    └── sync enemy word billboards (HTML elements tracked to 3D positions via projectToScreen)
```

---

## Game State Machine

```
                     ┌─────────────┐
           ┌────────►│    TITLE     │◄──────────────────┐
           │         └──────┬───────┘                   │
           │                │ Enter / click              │
           │                ▼                            │
           │         ┌─────────────┐   all enemies dead  │
           │    ┌────│   PLAYING   │────────────────────►│
           │    │    └──────┬───────┘                    │
           │    │           │ health = 0           ┌──────┴──────┐
           │    │           ▼                      │ WAVE_CLEAR  │
           │    │    ┌─────────────┐               │  (1.5s)     │
           │    │    │    DYING    │               └──────┬───────┘
           │    │    │  (2s drain) │                      │ spawn next wave
           │    │    └──────┬───────┘                     ▼
           │    │           │                      back to PLAYING
           │    │           ▼
           │    │    ┌─────────────┐
           │    │    │    DEAD     │
           │    │    │ (show UI)   │
           │    │    └──────┬───────┘
           │    │           │ Enter / click
           │    │           ▼
           │    │    cleanupScene()   ← dispose all Three.js objects
           │    │    resetGameData()  ← zero score, health, wave counter
           └────┘    spawnWave(1)
                     transition → PLAYING
```

**Transitions are the only place objects are created or destroyed.**

---

## Render Pipeline (Phase 1 → Phase 3 progression)

```
Phase 1 (foundation):
  scene → WebGLRenderer → canvas

Phase 1 (actual — with EffectComposer stub):
  scene → RenderPass → OutputPass → canvas
  (UnrealBloomPass not yet added, but composer is in place)

Phase 3 (full):
  scene
    ↓
  RenderPass           ← renders geometry to internal buffer
    ↓
  UnrealBloomPass      ← bright pixels bleed into neighbors
    strength:  0.3 (base) → 1.2 (peak intensity)
    radius:    0.5
    threshold: 0.8 (only emissive objects bloom)
    ↓
  OutputPass           ← sRGB color correction, output to canvas
    ↓
  canvas (WebGL context)
```

**Bloom activation:** `UnrealBloomPass.strength` is set each frame by the
intensity system (0 in Phase 1/2, linearly increasing in Phase 3).

---

## Three.js Object Ownership

```
scene (owned by renderer/context.ts)
  ├── groundPlane      ← large 300-unit plane, fills screen to horizon (created once)
  ├── arenaGroup       ← hex floor + boundary walls (created once, never destroyed)
  ├── playerModel      ← loaded GLTF mage (SkinnedMesh + Skeleton, AnimationMixer)
  ├── enemyModels[]    ← cloned GLTF wraiths per spawn (SkeletonUtils.clone)
  ├── projectilePool[] ← pre-allocated (10 slots), show/hide on acquire/release
  │                      size set on acquire from wordLength; ember trail via particle system
  ├── particleSystem   ← ring buffer, Float32Array, single Points mesh
  └── lights[]
        ├── ambientLight    ← always on, very dim
        ├── directionalLight ← scene key light (above, slight angle)
        └── spellLights[]   ← pooled PointLights, acquired on spell cast

HUD (owned by renderer/hud.ts — pure DOM, no Three.js)
  ├── #hud-word        ← typed word display
  ├── #hud-spellbook   ← spell slots
  ├── #hud-health      ← health bar
  └── #hud-wave        ← wave counter
```

---

## Phase 3: Post-Processing Specification

### Three.js Imports Required

```typescript
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js'
import { RenderPass }     from 'three/examples/jsm/postprocessing/RenderPass.js'
import { UnrealBloomPass} from 'three/examples/jsm/postprocessing/UnrealBloomPass.js'
import { OutputPass }     from 'three/examples/jsm/postprocessing/OutputPass.js'
```

### UnrealBloomPass Parameters

| Parameter   | Value      | Notes |
|-------------|------------|-------|
| `resolution`| `new Vector2(window.innerWidth * 0.5, window.innerHeight * 0.5)` | Half-res: 4x bandwidth savings |
| `strength`  | `0.0–1.2`  | Driven by intensity system each frame |
| `radius`    | `0.5`      | How far bloom bleeds |
| `threshold` | `0.85`     | Only pixels brighter than this bloom |

**Emissive objects bloom; diffuse objects don't.** Set spell effect meshes
to `material.emissive` (not just `material.color`) so they exceed the threshold.
Environment (floor, walls) stays at emissive 0 — never blooms.

### Vignette + Color Grade (ShaderPass)

Simple custom GLSL, not a Three.js built-in:

```glsl
// fragment shader (vignette.frag.glsl)
uniform sampler2D tDiffuse;
uniform float vignetteStrength; // 0.3 base, 0.6 on player hit
varying vec2 vUv;

void main() {
  vec4 color = texture2D(tDiffuse, vUv);
  vec2 uv = vUv - 0.5;
  float vignette = 1.0 - dot(uv, uv) * vignetteStrength * 2.0;
  gl_FragColor = vec4(color.rgb * vignette, color.a);
}
```

Added after `UnrealBloomPass`, before `OutputPass`.

---

## Phase 3: Particle System Specification

### Ring Buffer Layout

Pre-allocated `Float32Array` of 50,000 particles. Each particle is 9 floats:

```
[x, y, z, vx, vy, vz, life, maxLife, size]
  0  1  2   3   4   5    6       7      8
```

`life` counts down from `maxLife` to 0. Dead particle: `life <= 0`.
Write pointer wraps around — oldest particles are overwritten first.

### Per-Spell Particle Parameters

| Spell  | Count | Lifetime | Speed | Size (start→end) | Spread | Color |
|--------|-------|----------|-------|------------------|--------|-------|
| FULMEN | 500   | 400ms    | 8 u/s | 0.02→0.00 | 15° arc along each lightning chain | Triforce gold `#F0C040` |
| GELU   | 300   | 600ms    | 3 u/s | 0.03→0.03 | 360° radial from player | Ice blue `#7DD4F0` |
| ARMA   | 150   | 1000ms   | 1 u/s | 0.04→0.00 | Hemisphere above player, drift up; burst on shield shatter | Hylian parchment `#E8D9B8` |
| BREVE  | 200   | 300ms    | 4 u/s | 0.02→0.00 | Left-to-right sweep across arena | Sheikah blue `#00D4FF` |
| Kill projectile trail | 8/frame | 200ms | 1 u/s | 0.02→0.00 | Behind projectile, slight spread | Triforce gold `#F0C040` |
| Kill projectile impact | 50 + wordLen*20 | 1000ms | 4 u/s | 0.05→0.00 | 360° burst from impact | Gold → Sheikah orange |
| Enemy death (marked) | 300 | 1000ms | 4 u/s | 0.05→0.00 | 360° burst from death point | Enemy tier color |
| Player hit  | 100 | 300ms  | 3 u/s | 0.03→0.00 | 360° from player | Calamity red `#FF3A00` |

**Size interpolation:** `currentSize = startSize + (endSize - startSize) * (1 - life/maxLife)`
**Opacity interpolation:** `opacity = pow(life / maxLife, 0.5)` (fast initial opacity, slow fade)

---

## Phase 3: Camera Shake Specification

Shake is applied as a position offset on the camera — never as rotation (rotation
shake causes motion sickness).

```typescript
// camera position each frame:
camera.position.x = baseCamX + shakeX
camera.position.y = baseCamY + shakeY  // Y is up in Three.js; use X/Z for top-down

// shake value computed as:
shakeX = amplitude * (Math.random() * 2 - 1) * decayFactor
decayFactor = Math.max(0, 1 - elapsed / duration)
```

| Event | Amplitude | Duration | Notes |
|-------|-----------|----------|-------|
| Kill projectile impact | `0.03 + wordLen * 0.006` units | 150ms | Scales with word length (3→0.048, 12→0.102) |
| FULMEN (chain lightning AoE) | 0.15 units | 400ms | Multiple simultaneous kills |
| ARMA (contact trigger) | 0.06 units | 200ms | On contact: damage nullified + push/stun burst |
| Player hit | 0.08 units | 250ms | |
| Enemy death (Nexus boss Phase 2) | 0.25 units | 600ms | Amplified vs. normal death — boss moment |
| Nexus Phase 1→2 transition | 0.15 units | 400ms | Color shift + minion spawn punctuation |
| Combo ×3+ | 0.10 units | 300ms | Reward shake |

If `prefers-reduced-motion` is set, amplitude = 0 for all shake events.

---

## Wave Difficulty Formula (Phase 2)

```typescript
// Wave N: how many enemies spawn?
function enemyCount(wave: number): number {
  return Math.floor(8.5 + wave * 1.5)
  // Wave 1: 10  Wave 2: 11  Wave 5: 16  Wave 10: 23
}

// Wave N: enemy type distribution
function spawnDistribution(wave: number): Record<EnemyType, number> {
  if (wave <= 2) return { acutus: 1.0, solidus: 0,   perfectus: 0,   nexus: 0    }
  if (wave <= 4) return { acutus: 0.7, solidus: 0.3,  perfectus: 0,   nexus: 0    }
  if (wave <= 7) return { acutus: 0.4, solidus: 0.4,  perfectus: 0.2, nexus: 0    }
  return              { acutus: 0.2, solidus: 0.3,  perfectus: 0.4, nexus: 0.1  }
}

// Wave N: enemy movement speed multiplier (replaces attackTimerScale)
// Proximity pressure increases as enemies close distance faster.
function speedScale(wave: number): number {
  return Math.min(2.0, 1.0 + wave * 0.05)
  // Wave 1: 1.05  Wave 5: 1.25  Wave 10: 1.5  Wave 20: 2.0 (cap)
}
// Applied to all enemies at spawn time: enemy.speed *= speedScale(wave)
```

---

## Scoring Formula (Phase 2)

```typescript
const TIER_POINTS: Record<EnemyType, number> = {
  acutus:    10,
  solidus:   20,
  perfectus: 30,
  nexus:    100,
}

// Combo: kills within 1s of each other build the multiplier
// Resets on player taking damage
let comboMultiplier = 1.0
let comboTimer = 0  // ms since last kill

function onEnemyKilled(type: EnemyType, dt: number): number {
  comboTimer += dt  // reset in update() if comboTimer > 1000
  comboMultiplier = Math.min(5.0, comboMultiplier + 0.5)
  return Math.floor(TIER_POINTS[type] * comboMultiplier)
}

function onPlayerHit(): void {
  comboMultiplier = 1.0  // losing combo on hit is the punishment
  comboTimer = 0
}
```

---

## Model Loading & Animation Pipeline

### Asset Generation (build-time)

Blender Python scripts generate rigged character models exported as `.glb`:

```
scripts/blender/
  common.py              ← shared: material creation, bone helpers, export
  generate_mage.py       ← mage model + armature + idle/cast/death actions
  generate_enemies.py    ← 4 wraith types + armatures + idle/move/death actions

scripts/generate-models.sh   ← runs Blender in background mode
  → outputs to public/models/*.glb (mage.glb, acutus.glb, solidus.glb, perfectus.glb, nexus.glb)
```

### Runtime Loading (`src/loader/`)

```
[page load]
    │
    ▼
loadingScreen.ts: show loading overlay (dark bg + progress bar)
    │
    ▼
modelLoader.ts: loadAllModels(onProgress)
  ├── THREE.LoadingManager for aggregate progress
  ├── GLTFLoader loads each .glb file
  └── Returns Record<string, LoadedModel>
       LoadedModel = { scene: THREE.Group, animations: THREE.AnimationClip[] }
    │
    ▼
loadingScreen.fadeOut()
    │
    ▼
[game init with loaded models]
  ├── createPlayer(scene, models['mage'])
  └── initEnemyFactory(models)  ← stashes models for per-spawn cloning
```

Each enemy spawn clones the loaded model via `SkeletonUtils.clone()` —
shares GPU geometry/material buffers but gets its own skeleton + mixer.

### Animation Controller (`src/animation/animationController.ts`)

Wraps `THREE.AnimationMixer` with a state machine:

```
AnimController {
  mixer: THREE.AnimationMixer
  actions: Record<AnimState, THREE.AnimationAction>
  currentState: AnimState   // 'idle' | 'walk' | 'cast' | 'death'
}

createAnimController(model, clips) → AnimController
transitionTo(controller, state, fadeDuration) → void
  ├── current action.fadeOut(fadeDuration)
  ├── next action.reset().fadeIn(fadeDuration).play()
  └── 'cast'/'death': LoopOnce + clampWhenFinished
tickAnimController(controller, dtSec) → void
  └── mixer.update(dtSec)
```

Integration points:
- `tickPlayer()` calls `tickAnimController()` instead of manual sin-bob
- `triggerCastAnim()` calls `transitionTo('cast', 0.08)`
- `enemy.move()` calls `tickAnimController()`, transitions idle↔move
- `enemy.tickDeathAnim()` calls `transitionTo('death', 0)` on first tick

---

## Key Invariants (never violate these)

1. **Renderer never owns game state.** Pass data in; never let renderer modules
   import from `game/` or `entities/`.

2. **State transitions own object lifecycle.** All Three.js objects created and
   disposed only in `game/state.ts` state transition handlers.

3. **No magic numbers in game logic.** Everything in `constants/game.ts` —
   wave params, health values, cooldowns, arena size.

4. **Effects are data, not functions.** `SpellEffect` is a discriminated union of
   plain objects. `applySpellEffect()` in `spells/system.ts` is the single place
   that interprets them.

5. **Enemy word registry is the kill authority.** Only `wordAssignment.ts` knows
   which enemy holds which word. `input.ts` queries it; it never owns the mapping.

6. **Spell words and enemy words must never share prefixes.** Enforced by startup
   constraint check in `wordAssignment.ts` — throws if violated.

5. **dt is always clamped.** Before it touches any accumulator or timer.
