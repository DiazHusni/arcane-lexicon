# Arcane Lexicon

> "You are a mage. Your voice is your weapon. Speak their true name and they fall."

A 3D dark-fantasy typing game that runs entirely in the browser — no install, no account, just a URL.

Enemies have words. Type them to kill. Unlock ancient Latin spells that bend the battlefield rules. The tension is in deciding when to break off a kill to cast.

---

## Gameplay

- **Kill:** type an enemy's assigned English word → an amber fireball launches toward it
- **Spell:** type an unlocked Latin spell word → a battlefield effect triggers
- **Backspace** cancels the current word; wrong words do nothing
- Both actions share the same input buffer — every keystroke is a decision

### Spells (unlock by kill count)

| Word | Unlocks at | Cooldown | Effect |
|------|-----------|----------|--------|
| FULMEN | start | 15s | Chain lightning kills the 3 nearest enemies |
| GELU | 5 kills | 12s | Slows all enemies to 40% speed for 7s (2s ramp-back) |
| ARMA | 15 kills | 25s | Dome absorbs next contact hit; on trigger pushes & stuns all enemies within 6u |
| BREVE | 25 kills | 18s | Shortens all enemy words by 3 letters for 5s |

> **Debug mode:** press `Shift+Enter` on the title screen to start with all spells unlocked.

---

## Tech Stack

- **Three.js** — 3D scene, WebGL renderer, EffectComposer post-processing pipeline
- **Vite + TypeScript** — fast dev server, strict types, tree-shaken production build
- **Vitest** — unit tests with coverage enforcement

---

## Development Progress

### ✅ Phase 1 — 3D Engine Foundation

- [x] Git repo, `.gitignore`, Vite + TypeScript scaffold
- [x] Three.js scene with EffectComposer pipeline (RenderPass + OutputPass; bloom stub ready for Phase 3)
- [x] Arena: 32×32 floor plane + 4 boundary walls + grid overlay
- [x] Perspective camera — top-down isometric angle above arena
- [x] Player placeholder (purple sphere) at arena centre
- [x] Keyboard input — A–Z and Backspace only; all other keys silently ignored
- [x] HUD overlay — `#hud-word`, `#hud-spellbook`, `#hud-health`, `#hud-wave` over canvas
- [x] Fixed-timestep game loop — 60Hz logic, variable render, dt clamped to 100ms
- [x] 26 unit tests passing — 100% coverage on `game/input.ts` and `game/loop.ts`
- [ ] Deployed to public URL

### ✅ Phase 2 — Enemy Words, Spell System & Combat

- [x] Each enemy spawns with an English word displayed above it
- [x] Type an enemy's exact word → amber fireball launches toward it (size scales with word length)
- [x] Projectile impacts → particle burst + floating score delta
- [x] 4 enemy types: Acutus, Solidus, Perfectus, Nexus (two-phase boss fight)
- [x] All 4 spells implemented with kill-milestone unlock progression
- [x] Enemy threat radius → red warning flash → contact damage → health HUD
- [x] Wave system — 10 enemies in wave 1, scaling by wave; inter-wave pause
- [x] Player death → game over screen with wave / score / kills
- [x] Restart with full scene cleanup
- [x] Startup prefix-collision check (no spell word can share a prefix with an enemy word)
- [x] Debug mode — `Shift+Enter` starts with all spells unlocked
- [x] 100 unit tests passing across 6 test files

### Phase 3 — Visual Spectacle
Particle system (50K pre-allocated), per-spell VFX, bloom post-processing, camera shake, Web Audio.

### Phase 4 — Content & Depth
12+ spells, 4+ enemy types, 3+ arenas, score persistence, combo system.

### Phase 5 — Story Campaign
Chapter structure, boss fights, narrative — the act of typing IS the storytelling.

---

## Project Structure

```
src/
  main.ts                  # Entry point — wires everything together
  style.css                # HUD layout, enemy labels, kill VFX animations
  constants/
    game.ts                # All balance numbers (cooldowns, damage, arena size)
    colors.ts              # CSS hex + Three.js hex color palette
  types/
    index.ts               # GameData, GamePhase
    enemy.ts               # EnemyType
    spell.ts               # SpellDefinition, SpellState
  renderer/
    context.ts             # Three.js scene, camera, EffectComposer, arena geometry
    hud.ts                 # DOM HUD sync — reads game state, writes DOM
    vfx.ts                 # Kill VFX — floating score delta + particle burst
  game/
    input.ts               # Pure functional word buffer + dual-match logic
    loop.ts                # Pure fixed-timestep tick function
    state.ts               # Game state machine + world update
    wave.ts                # Enemy spawn counts and type distribution per wave
  entities/
    player.ts              # Player mesh
    enemy.ts               # Enemy movement, proximity damage, stun, GELU/BREVE effects
    projectile.ts          # Pre-allocated projectile pool
    enemies/
      factory.ts           # Spawn / despawn enemies
      wordAssignment.ts    # Word pools, registry, prefix collision check
      acutus.ts            # Fast, short-word enemy
      solidus.ts           # Medium enemy
      perfectus.ts         # Tanky, long-word enemy
      nexus.ts             # Two-phase boss
  spells/
    definitions.ts         # Spell word, cooldown, effect, unlock threshold
    system.ts              # castSpell, tickCooldowns, ARMA/GELU/BREVE tick logic
    unlocks.ts             # Kill-milestone unlock tracker
```

**Key invariant:** `renderer/*` never imports from `game/*` or `entities/*`. Game state is passed in as plain data.

---

## Local Development

```bash
npm install
npm run dev       # dev server at localhost:5173
npm test          # run unit tests (100 tests, 6 files)
npm run build     # production build → dist/
```

---

## Design Docs

- [DESIGN.md](DESIGN.md) — vision, mechanics, enemy types, spell details, audio
- [ARCHITECTURE.md](ARCHITECTURE.md) — module graph, data flow, render pipeline spec
- [PHASES.md](PHASES.md) — phased delivery plan with per-phase deliverables
