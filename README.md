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

| Word | Unlocks at | Effect |
|------|-----------|--------|
| FULMEN | start | Chain lightning clears nearby enemies |
| GELU | 5 kills | Slows all enemies to 40% speed for 5s |
| ARMA | 15 kills | Dome absorbs next contact hit; pushes & stuns on trigger |
| BREVE | 25 kills | Shortens all enemy words by 3 letters for 5s |

---

## Tech Stack

- **Three.js** — 3D scene, WebGL renderer, EffectComposer post-processing pipeline
- **Vite + TypeScript** — fast dev server, strict types, tree-shaken production build
- **Vitest** — unit tests with coverage enforcement

---

## Development Progress

### ✅ Phase 1 — 3D Engine Foundation
The technical skeleton. Nothing is "fun" yet, but the foundation is solid and tested.

- [x] Git repo, `.gitignore`, Vite + TypeScript scaffold
- [x] Three.js scene with **EffectComposer pipeline** from day 1 (RenderPass + OutputPass; bloom stub ready for Phase 3)
- [x] Arena: 32×32 floor plane + 4 boundary walls + grid overlay
- [x] Perspective camera — top-down isometric angle above arena
- [x] Player placeholder (purple sphere) at arena centre
- [x] Keyboard input — A–Z and Backspace only; all other keys silently ignored
- [x] HUD overlay — `#hud-word`, `#hud-spellbook`, `#hud-health`, `#hud-wave` over canvas
- [x] Fixed-timestep game loop — 60Hz logic, variable render, dt clamped to 100ms
- [x] 26 unit tests passing — 100% coverage on `game/input.ts` and `game/loop.ts`
- [ ] 60fps verified on mid-range hardware
- [ ] Deployed to public URL

### Phase 2 — Enemy Words, Spell System & Combat
Enemy word assignment, kill projectiles, all 4 spells, health/damage, wave system, win/lose states.

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
  constants/game.ts        # All magic numbers in one place
  types/index.ts           # Shared TypeScript types
  renderer/
    context.ts             # Three.js scene, camera, EffectComposer
    hud.ts                 # DOM HUD sync (no Three.js dependency)
  game/
    input.ts               # Pure functional word buffer
    loop.ts                # Pure fixed-timestep tick function
    state.ts               # Game state machine
  entities/
    player.ts              # Player mesh
```

**Key invariant:** `renderer/*` never imports from `game/*` or `entities/*`. Game state is passed in as plain data.

---

## Local Development

```bash
npm install
npm run dev       # dev server at localhost:5173
npm test          # run unit tests
npm run build     # production build → dist/
```

---

## Design Docs

- [DESIGN.md](DESIGN.md) — vision, mechanics, enemy types, spell details, audio
- [ARCHITECTURE.md](ARCHITECTURE.md) — module graph, data flow, render pipeline spec
- [PHASES.md](PHASES.md) — phased delivery plan with per-phase deliverables
