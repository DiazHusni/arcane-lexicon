# Development Phases

Each phase has a clear goal, a set of deliverables, and a definition of done.
Phases build on each other — Phase N assumes Phase N-1 is complete and stable.

---

## Phase 1 — 3D Engine Foundation

**Goal:** A working 3D scene in the browser. Nothing is "fun" yet, but the
technical foundation is solid, tested, and deployable.

**What you're building:**

- Git repo initialization (`git init`, `.gitignore` for `node_modules/dist/`)
- Project scaffold (Vite + TypeScript)
- WebGL 3D scene via Three.js with EffectComposer pipeline from day 1
  (no post-processing effects active in Phase 1, but pipeline is in place so
  Phase 3 adds bloom/vignette without touching the render core)
- A simple arena: floor plane + boundary walls
- Camera positioned above the arena (top-down / isometric)
- A player entity (placeholder geometry) in the center
- Keyboard input system — accepts only A-Z and BACKSPACE, rejects all other
  keys (unicode, numbers, symbols, emoji) silently. Use `event.key.match(/^[A-Z]$/i)`.
  Buffer matches against both enemy word registry and spell registry simultaneously.
- HUD: HTML/CSS elements absolutely positioned over the WebGL canvas
  - `<canvas>` fills viewport for 3D scene
  - HUD divs (`#hud-word`, `#hud-spellbook`, `#hud-health`, `#hud-wave`) sit on top
  - CSS transitions handle cooldown wipes, fizzle flash, health color shift
  - This keeps game logic and UI rendering completely decoupled
- Game loop: fixed timestep (60Hz logic) + variable render (rAF interpolation)
  - Logic updates run at fixed 16.67ms steps regardless of frame rate
  - Render interpolates between steps for smooth visuals at any fps
  - Cooldown timers, enemy movement, projectiles: all driven by fixed step
  - **dt must be clamped to 100ms max** — prevents "spiral of death" when tab
    is re-focused after being hidden (dt would otherwise be seconds)
- Static deploy to GitHub Pages or Netlify (CI/CD or manual)

**Deliverables:**

- [x] `index.html` loads the game with no errors
- [x] 3D arena visible from above with a player marker
- [x] Type on keyboard → current word appears in HUD
- [x] Backspace clears the current word
- [x] 60fps on a mid-range laptop
- [x] Deployed to a public URL
- [x] Unit tests passing (`vitest run`) with 80%+ coverage of:
  - `game/input.ts` — word buffer: append char, backspace, clear on match, non-alpha ignored — 15 tests, 100% coverage
  - `game/loop.ts` — fixed timestep accuracy — 11 tests, 100% coverage
  - All tests green before marking Phase 1 done — 26/26 ✓

**Done when:**
You can open the URL, see a 3D scene, type characters, and watch them appear
in the HUD. Nothing "happens" yet — but the engine works.

---

## Phase 2 — Enemy Words, Spell System & Combat

**Goal:** A playable combat loop. Type the enemy's word to kill it. Unlock spells
that bend the rules. Enemies fight back. You can win and lose.

**What you're building:**

- **Enemy word assignment system** (`entities/enemies/wordAssignment.ts`)
  - English word pool partitioned by enemy tier (see DESIGN.md → Enemy Types)
  - Each spawned enemy draws a word from its tier pool; words are unique per wave
  - Startup constraint check: no enemy word may be a prefix of a spell word and vice versa
  - Word displayed as a billboard HTML element tracked to each enemy's 3D position
- **Input dual-match** (`game/input.ts` update)
  - Buffer checks enemy word registry first, then spell registry on every keystroke
  - Enemy word match → mark enemy for death, spawn kill projectile, clearBuffer
  - Spell word match (if unlocked) → `triggerSpellCast(spell)`, clearBuffer
  - Dead-end detection: if buffer length > max enemy word length and no prefix match, clearBuffer
- **Kill projectile system** (`entities/projectile.ts`)
  - Spawns on enemy word match; travels at 12 u/s toward the marked enemy
  - Size = `lerp(0.08, 0.40, (wordLength - 3) / 9)` — longer words = bigger fireball
  - Marked enemy: continues moving toward player, word billboard dims to 20% opacity
  - On impact: enemy dies, particle burst (count scales with word length), score delta floats up
  - Pre-allocated pool (10 slots) — never dynamically allocated mid-game
- **Spell system** (word → effect mapping, cooldowns, unlock progression)
  - 4 spells: FULMEN, GELU, ARMA, BREVE (see DESIGN.md → Spells)
  - Kill-milestone unlock tracker (`spells/unlocks.ts`) — fires unlock announcement overlay
  - Spells modify the battlefield or enemy words — none kill directly
  - ARMA: cooldown (14s) starts on shield expiry (contact trigger OR 15s passive expiry),
    NOT on cast — implement via `tickActiveEffects()` calling `startCooldown()` on expiry.
    On contact trigger: nullify damage + push all enemies within 2.5u (force ∝ proximity) + stun 2s.
  - GELU: slows enemies to 40% speed for 5s, then linearly ramps back to full speed over 2s (7s total).
    Use `speedMultiplier` field on enemy entity; `move()` applies multiplier to velocity.
- **Auto-focus system** (replaces PROX/PERI targeting modes — no `spells/targeting.ts`)
  - No mode-switching words; every keystroke is a kill or a spell
  - As the player types, highlight the enemy word sharing the longest prefix with the buffer
  - Buffer empty → default highlight = nearest enemy
- **Enemy entities:** spawn, drift toward player, deal contact damage when they reach the player, die when word is typed
  - Movement = seek (toward player) + separation (away from nearby enemies)
  - `move()` is a no-op while `stunTimer > 0` (stunned by ARMA)
  - Separation radius = 1.5x enemy collision radius to prevent stacking
  - Simple weighted sum: velocity = seekWeight _ seekDir + separationWeight _ separDir
  - No pathfinding needed (arena is open, no obstacles)
  - Contact damage: if `distance(player, enemy) <= threatRadius` → 0.3s red warning flash → damage tick (0.5s per-enemy invincibility window prevents spam)
- **Player health system**
- **Win/lose conditions:** all enemies dead = wave clear; health = 0 = death
- **Game state machine:** title → playing → dead/win → (restart) → playing
  - Restart MUST call a full scene cleanup: remove all enemy meshes, word billboard
    elements, particle emitters, and audio nodes before re-initializing
  - Never reset by reassigning variables — always traverse and dispose Three.js
    objects explicitly (mesh.geometry.dispose(), material.dispose(), scene.remove())
  - State transitions are the only place game object lifecycle is managed
- Minimal spell effects (color flash, basic particles on cast)
- Basic sound effects (spell fire, enemy death, player hit)
- Wave system: enemies spawn in numbered waves, difficulty increases
  - Enemy count: `Math.floor(8.5 + wave * 1.5)` (Wave 1: 10, Wave 5: 16, Wave 10: 23)
  - Type distribution: see ARCHITECTURE.md → Wave Difficulty Formula
  - Enemy speed scales per wave: `min(2.0, 1.0 + wave * 0.05)` — 5% faster each wave, capped at 2x (replaces removed attackTimerScale; proximity pressure = difficulty)
  - Word length ceiling increases with wave: Wave 1 Acutus = 3 letters; Wave 8+ = 4 letters
- Scoring system
  - Per kill: `tierPoints * comboMultiplier` (Acutus=10, Solidus=20, Perfectus=30, Nexus=100 per phase — Phase 1 kill + Phase 2 kill = 200 total)
  - Combo: kills within 1s add +0.5x multiplier (max 5x), resets on player hit
  - Score displayed on death screen

**Deliverables:**

- [x] Each enemy spawns with an English word displayed above it
- [x] Type an enemy's exact word → amber fireball launches toward that enemy
- [x] Enemy is marked for death on word completion: keeps moving, word dims to 20% opacity
- [x] Projectile impacts enemy → geometry shatters, particle burst, score delta floats up
- [x] Projectile size visibly larger for longer words (3-letter dart vs 12-letter fireball)
- [x] FULMEN available from start — casting it kills the 3 nearest enemies with lightning
- [x] GELU unlocks at 5 kills — slows enemies to 40% speed for 5s, ramps back over 2s; words get ice-blue tint that fades with speed
- [x] ARMA unlocks at 15 kills — dome blocks next contact damage; on trigger, pushes + stuns nearby enemies (2.5u radius, 2s stun); cooldown 14s starts on shield expiry
- [x] BREVE unlocks at 25 kills — shortens all enemy words by 3 letters for 5s
- [x] Auto-focus highlights the enemy word matching the current typed prefix (nearest if empty) — logic implemented; visual intentionally removed (all words uniform per design change)
- [x] Nexus two-phase fight: type Phase 1 word → transform + 2 Acutus spawn → type Phase 2 word → death
- [x] Startup constraint check verifies no spell/enemy word prefix collision
- [x] Enemy enters threat radius → red warning flash (0.3s) → contact damage → health shown in HUD
- [x] Enemy self-destructs after dealing contact damage (no kill credit, no score)
- [x] Player death → "game over" screen with score
- [x] Wave complete → next wave spawns with more/harder enemies
- [x] At least 2 enemy types with different stats and word lengths
- [x] Unit tests passing with 80%+ coverage of:
  - `game/input.ts` — dual match: enemy word kill, spell cast, dead-end clear; auto-focus prefix logic
  - `spells/system.ts` — all 4 spell effects, ARMA deferred cooldown, shield expiry
  - `spells/unlocks.ts` — kill milestone tracking, unlock events
  - `entities/enemies/wordAssignment.ts` — word pool, per-tier assignment, collision check
  - `entities/enemy.ts` — movement, proximity damage (damageWarningTimer, damageCooldown), stun (stunTimer), speed multiplier (GELU), death
  - `game/state.ts` — all state transitions including restart cleanup
  - `game/wave.ts` — spawn counts, difficulty scaling

- **Debug mode** (`main.ts`)
  - Activated by pressing `Shift+Enter` on the title screen instead of `Enter`/`Space`
  - All 4 spells start unlocked regardless of kill count
  - No other changes to game rules (enemies still spawn, damage still applies)

**Done when:**
You can play a full session: kill enemies by typing their words, unlock spells mid-run,
use spells tactically, die, see your score, restart. It's rough, but it's a game.

---

## Phase 3 — Visual Spectacle

**Goal:** Make it beautiful. This is the phase where a friend sees it and says
"this runs in a browser?" Transform the functional-but-rough combat loop into
something visually striking.

**What you're building:**

- **Arena floor redesign** — replace placeholder square grid with the final art:
  - Hexagonal floor plane with beveled edges (`CylinderGeometry`, 6 sides, bevel via `EdgesGeometry` accent lines)
  - Floor material: `#0E0E28` (see DESIGN.md color table), emissive 0 (never blooms)
  - Remove grid overlay; replace with subtle hex-cell pattern or bare flat surface
  - Boundary walls remain; adjust to match new floor shape
- **Player mesh redesign** — replace placeholder purple sphere with final art:
  - Arcane sigil / rune ring: a flat torus or ring geometry (`TorusGeometry`) that rotates slowly
  - Color: soft white `#E8E4D8`, emissive so it glows faintly and blooms
  - Small ambient glow effect (dim PointLight at player position, always on, intensity 0.3)
- **Enemy material + intensity-driven color system:**
  - Enemies use `MeshLambertMaterial` with emissive tint; not just diffuse color
  - At low game intensity (waves 1–3): cold blue `#4A6FA5` base color
  - At high intensity (waves 7+): material warms linearly toward amber `#F59E0B`
  - Intensity = `Math.min(1, (wave - 1) / 6)` — drives both enemy color and bloom strength
- Particle system — ring buffer, 50K pre-allocated particles, zero runtime alloc
  - Per-spell parameters: see ARCHITECTURE.md → Particle System Specification
- Per-spell 3D visual effects — each spell looks and feels distinct
  - Set spell meshes to `material.emissive` (not just `color`) so they bloom
- Enemy death animations — geometry shatters into faces, then particle burst
- Environmental atmosphere:
  - `FogExp2` — density 0.02, field green fog fades distant enemies into the horizon
  - Ambient particle field (50 slow-drifting dim particles, always present)
- Dynamic lighting — pooled `PointLight` objects (6 in pool), acquired on spell cast
  - Each light color matches spell primary color (see DESIGN.md spell table)
  - Intensity fades over 0.5–1s, then released back to pool
- Post-processing (Three.js EffectComposer — pipeline already in place from Phase 1):
  - `UnrealBloomPass`: half-res buffer, strength 0.3–1.2, radius 0.5, threshold 0.85
  - `ShaderPass` (vignette): strength 0.3 base, 0.6 on player hit, 1s fade back
  - `OutputPass`: sRGB correction
  - Full spec: ARCHITECTURE.md → Post-Processing Specification
- Camera shake — position offset only (no rotation), per-event amplitudes:
  - FULMEN: 0.15 units / 400ms | ARMA shield shatter: 0.06 / 200ms | Player hit: 0.08 / 250ms | Nexus Phase 2 death: 0.25 / 600ms
  - Full spec: ARCHITECTURE.md → Camera Shake Specification
  - Disabled if `prefers-reduced-motion` is set
- Audio layers: ambient dungeon hum + per-spell sounds (see DESIGN.md audio table)
  - Web Audio API oscillator layers — no audio file loading
- HUD polish: all elements styled per DESIGN.md typography + color tables

**Deliverables:**

- [x] Arena floor is a hexagonal plane with beveled edges — grid overlay gone
- [x] Player is a glowing rune ring, not a sphere
- [x] Enemy color warms from cold blue (early waves) to amber (late waves) as intensity rises
- [x] Each of the 6 spells has a distinct particle + light effect (FULMEN, GELU, ARMA, BREVE + kill projectile trail + enemy death burst)
- [x] Enemies have a "dying" animation (expand + spin over 400ms before hiding)
- [x] Scene has atmospheric depth (FogExp2, player ambient glow, hex floor accent edges)
- [x] Spell casts create brief dynamic point lights (6-slot pool, color-matched per spell)
- [x] Screen shakes on large hits/explosions (position-offset only, prefers-reduced-motion aware)
- [x] Bloom post-processing active on bright elements (UnrealBloomPass, strength driven by wave intensity 0.3→1.2)
- [x] Ambient music that builds with wave intensity (Web Audio API: ambient hum + per-spell procedural sounds)
- [x] All HUD elements styled to match the dark fantasy theme (CSS custom props, glow shadows, arcane accent marks)
- [ ] Cold load to first visual: < 3 seconds

**Done when:**
You record a 10-second GIF of combat and someone says "whoa" without knowing
anything about how it was built.

---

## Phase 4 — Content & Depth

**Goal:** Expand from "impressive demo" to "full game." More spells, more enemy
variety, multiple arenas, and enough content that a session feels substantial.

**What you're building:**

- Full spellbook: 12+ spells with distinct mechanics
- Advanced spells with more complex effects (AoE, DoT, multi-hit, terrain)
- 4+ enemy types with different behaviors (charger, ranged attacker, splitter,
  shielder)
- TODO: varied on-contact self-destruct effects per enemy type (e.g. explosion AoE,
  slow burst, push wave) — each type has a distinct consequence when it reaches the player
- 3+ distinct arenas with different layouts and atmosphere
- Spell cooldown UI (visual indicator per spell)
- Combo system: casting certain sequences grants a bonus
- Score system with multipliers
- Local persistence (high score, unlocked spells)
  - All localStorage reads/writes wrapped in try/catch
  - Graceful fallback in private browsing mode (no persistence, no crash)
  - `src/persistence.ts` — thin wrapper with `save(key, value)` / `load(key)` API
- Spell unlock persistence — spells unlocked this run are remembered; spellbook bar
  shows locked slots as `····` until the kill milestone is reached
- Optional: expand word pools per tier with more thematically resonant words

**Deliverables:**

- [ ] 12 spells, each with distinct effect and visual
- [ ] 4 enemy types with meaningfully different behavior
- [ ] 3 arena environments
- [ ] Spell cooldown visualized per spell in HUD
- [ ] High score saved to localStorage
- [ ] A 5-minute session has visible variety — no two waves feel identical

**Done when:**
A 20-minute session remains interesting. Content doesn't run out before
engagement does.

---

## Phase 5 — Story Campaign

**Goal:** Wrap the combat in a narrative that gives it meaning. This is the
10x version: a story where typing IS the storytelling. The player speaks the
world into being.

**What you're building:**

- Chapter structure: 3-5 chapters, each with unique setting + story beat
- Intro sequence: narrator sets the world, introduces the player's role
- Between-chapter screens: brief lore text, story progression
- Dialogue system: NPC text boxes (minimal, text-only)
- Boss encounters: each chapter ends with a boss fight — unique mechanics,
  multiple health phases, special attack patterns
- Lore-coherent naming: spells and enemies named within an invented or
  historical language system (Latin, invented phonetics, etc.)
- Ending screen: story conclusion + credits
- Optional: unlockable lore fragments (found in enemy drops or arenas)

**Deliverables:**

- [ ] Chapter 1 fully playable start-to-finish with intro + boss
- [ ] At least 3 chapters total
- [ ] Boss fight with 2+ phases and unique attack patterns
- [ ] Story text for all chapter transitions
- [ ] Credits screen
- [ ] All spells/enemies have lore-consistent names and descriptions
- [ ] A first-time player understands who they are and what they're doing
      within the first 60 seconds

**Done when:**
Someone can sit down with no context, play start to finish, and feel like they
experienced a complete story — not just a tech demo with a wrapper.

---

## Phase Overview Table

| Phase | Name                  | Playable? | Shareable? | Est. Files |
| ----- | --------------------- | --------- | ---------- | ---------- |
| 1     | 3D Engine Foundation  | No        | No         | ~10        |
| 2     | Spell System & Combat | Yes       | Barely     | ~20        |
| 3     | Visual Spectacle      | Yes       | Yes        | ~30        |
| 4     | Content & Depth       | Yes       | Yes        | ~40        |
| 5     | Story Campaign        | Yes       | Yes        | ~55        |

---

## Performance Architecture

### Object Pooling (Phase 2 onwards)

Three.js mesh objects must be pooled rather than created/destroyed per enemy or spell.

```
EnemyPool:                    ProjectilePool:
  pre-allocate N meshes         pre-allocate M meshes
  acquire() → hidden → set      acquire() → reposition → show
  release() → hide, return      release() → hide, return

N = max possible enemies in any wave (e.g. 20)
M = max simultaneous projectiles (e.g. 10)
```

Never call `geometry.dispose()` / `material.dispose()` per frame — only at game shutdown.

### Particle Ring Buffer (Phase 3)

Particle system uses a pre-allocated Float32Array ring buffer (50K particles max).
Dead particles are overwritten, not garbage-collected. Zero runtime allocation.

### Bloom at Half Resolution (Phase 3)

Post-processing bloom renders to a half-resolution render target (4x bandwidth savings).
Visually identical at any reasonable bloom radius.

### Web Audio Scheduling (Phase 3)

Kill sounds scheduled at `audioCtx.currentTime + 0.01` to avoid latency artifacts.
Never call `AudioBufferSourceNode.start()` with no argument on low-latency systems.

---

## Cross-Phase Principles

- **Never break Phase N when working on Phase N+1.** Each phase is a stable
  checkpoint. Work on a branch, merge when done.
- **Spell balance before spectacle.** If combat isn't fun in Phase 2, visual
  polish in Phase 3 won't fix it.
- **The word list is design.** Every spell word choice is a creative decision —
  short words are easier to type fast; longer words feel more powerful; real
  words carry connotation. Choose deliberately.
- **Mobile is out of scope.** Keyboard required. Optimize for desktop browsers.
- **Performance gate:** Before moving to the next phase, verify 60fps in current
  phase with all features active.
