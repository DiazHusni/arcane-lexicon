# Arcane Lexicon — Project Design

> **Working title.** The name is TBD.
>
> A 3D browser typing game. You are a mage. Enemies have words — type them to kill.
> Unlock spells that bend the rules. Language is the weapon.

---

## Vision

A dark fantasy spell-combat game that runs entirely in the browser — no install,
no account, just a URL. Every enemy has a word assigned to it. Type that word and the enemy dies.
Unlock spells — ancient Latin words with powerful effects — that let you bend the rules
when enemy words pile up faster than you can handle. Every spell has a distinct visual
and audio signature. The experience should make both developers ("this runs in a browser?")
and non-technical friends ("this is beautiful") say "whoa."

The 10x north star: a story-driven campaign where the act of typing is the
storytelling mechanic — you speak the world into being.

---

## Core Fantasy

> "You are a mage. Your voice is your weapon. Speak their true name and they fall."

Not a typing tutor with a skin on it. Enemies have words — type them to kill. But
you also know spells: ancient Latin words that warp the battlefield. The tension is
in deciding when to break off killing to cast. Timing, resource management, and
quick fingers all matter.

**Language split (intentional lore):** Enemies carry English words — they operate on
a crude, common level. Your spells are Latin — true words of arcane power. The asymmetry
is the fantasy. When you cast FULMEN, you're invoking something the enemies can't name.

---

## Mechanics

### Typing Input
- Player types freely at all times — no locked input cursor, no autocorrect
- As the player types, the current word is displayed in a HUD element
- **Primary action:** when the typed word matches an enemy's assigned word, a kill projectile launches toward that enemy
- **Spell action:** when the typed word matches an unlocked spell word, the spell activates
- Both actions share the same input buffer — the player decides in real-time what to type
- Backspace cancels the current word
- Wrong words do nothing (slight visual flash feedback — "fizzle")

**The core tension:** do you finish typing the enemy word in front of you, or interrupt
and type a spell word to bend the rules? The interruption IS the cost.

### Kill Projectile

When a word match fires, an amber fireball launches from the player toward the matched enemy.

**Marked-for-death state (instant, on word completion):**
- Enemy continues moving toward the player — still a threat until the projectile lands
- Enemy's word billboard fades to 20% opacity and pulses slowly
- Subtle amber point light appears at the enemy's position (pre-impact glow)

**Projectile properties:**
- Travel speed: 12 units/s — fast, always visible, never frustrating
- Size scales linearly with word length:
  ```
  size = lerp(0.08, 0.40, (wordLength - 3) / 9)
  // 3 letters  → 0.08  (small dart)
  // 6 letters  → 0.185 (medium fireball)
  // 9 letters  → 0.29  (large fireball)
  // 12 letters → 0.40  (massive fireball)
  ```
- Color: amber core (`#F59E0B`) → orange outer glow (`#EA580C`), emissive material (blooms)
- Ember particle trail: 8 particles/frame, 200ms lifetime, amber → transparent
- Tracks to the enemy's current position (enemy keeps moving until impact)

**Impact (projectile reaches enemy):**
- Enemy geometry shatters outward (faces fly apart), then particle burst
- Particle count scales with projectile size: `50 + wordLength * 20` particles
- Brief point light flash at impact point (0.15s, bright amber)
- Camera shake: `0.03 + wordLength * 0.006` units, 150ms — long-word kills feel heavier
- Score delta text fades up from the impact point (`+10`, `+20`, etc.) in gold

**Design rationale:** The fireball size is the word's difficulty made visible. Typing OBLITERATE
launches something the player is proud of. Typing STAB is a quick dart. The variation keeps
every kill visually distinct and rewards the player for choosing harder targets.

### Auto-Focus System

Focus is automatic — no mode words, no keystrokes spent on UI management.

- **Buffer non-empty:** whichever enemy word(s) share a prefix with the current buffer get
  highlighted (brightest = closest among matches). As the player types, the focus updates
  character-by-character toward the intended target.
- **Buffer empty:** default highlight = nearest enemy (closest to player).

**Visual indicator:** The focused enemy's word floats above it in full-brightness text
(`#C8B89C`, 100% opacity). All other enemy words render at 40% opacity.

**Design rationale:** The word the player is typing *is* their focus declaration. Removing
explicit mode-switching means every keystroke is either a kill or a spell — never UI
management. The prefix-match highlight gives the same spatial targeting benefit as manual
modes, for free.

### Spellbook
Spells are unlockable active abilities. They do NOT kill enemies directly — they modify
the battlefield and the enemy words themselves. Each spell:
- **Word** — a Latin word the player types to activate it (e.g. `FULMEN`, `GELU`)
- **Effect** — modifies enemies, words, or the player's state
- **Cooldown** — how long before it can be cast again
- **Unlock condition** — kill milestone required to unlock
- **Visual signature** — unique particle/light effect

Spells do not replace the primary kill action (typing enemy words) — they augment it.

**TypeScript interfaces** (lives in `src/types/spell.ts`):

```typescript
type SpellTarget = 'nearest' | 'all' | 'player' | 'none'

interface SpellDefinition {
  word: string              // Latin word the player types
  cooldownMs: number        // milliseconds before re-cast
  target: SpellTarget       // who the effect applies to
  effect: SpellEffect       // what happens (see below)
  vfxKey: string            // key into VFX registry
  sfxKey: string            // key into SFX registry
  unlockAtKills: number     // 0 = available from start
}

// Enemy word assignment — separate from SpellDefinition
interface EnemyWordAssignment {
  word: string              // English word the player types to kill this enemy
  tierId: EnemyType         // which tier assigned this word (affects word length)
}

type SpellEffect =
  | { type: 'aoe_clear';   radius: number }
  | { type: 'freeze';      durationMs: number }
  | { type: 'shorten';     letters: number; durationMs: number }
  | { type: 'shield';      blocksNextHit: true; expiryMs: number }
```

Effects are data, not functions — keeps the spell system serializable and
testable. The game loop interprets effect types in a single `applySpellEffect()`
function (explicit over clever).

### Spells (Phase 2)

Spell words are Latin — real words, short, typable under pressure. Spells unlock
progressively as the player accumulates kills. All 4 spells modify the field or
enemy words — none kill enemies directly.

| Word      | Latin meaning | Effect                                                        | Cooldown      | Unlock   | Letters |
|-----------|---------------|---------------------------------------------------------------|---------------|----------|---------|
| `FULMEN`  | thunderbolt   | Lightning arc — kills the 3 nearest enemies                   | 15s           | Start    | 6       |
| `GELU`    | frost/cold    | Slow all enemies to 40% speed for 7s (2s ramp-back); words ice over | 12s    | 5 kills  | 4       |
| `ARMA`    | armor/shield  | Dome blocks next contact damage; on trigger, pushes + stuns all enemies within 6u for 2s (nearest fly furthest) | 25s after shield expiry | 15 kills | 4 |
| `BREVE`   | brief/short   | Shorten all enemy words by 3 letters for 5s                   | 18s           | 25 kills | 5       |

**Spell taxonomy:**
- FULMEN + GELU = offensive/control (eliminate threats, buy time)
- ARMA + BREVE = defensive/adaptive (survive contact, reduce typing burden)

**ARMA cooldown rule:** the 25s cooldown does NOT start when ARMA is cast. It starts when
the shield expires — either by absorbing a hit (contact trigger), or by the 3s passive expiry.
While the dome is active, the cooldown timer is frozen. This encourages proactive casting: using
ARMA early doesn't penalize you by burning the cooldown before the shield is used.

**ARMA contact trigger:** when an enemy touches the player while the dome is active —
(1) contact damage is nullified, (2) all enemies within 6u are pushed radially outward
(force scales with proximity: nearest enemy flies furthest, max 8u — min 3.2u at edge),
(3) all pushed enemies are stunned for 2s (movement frozen), (4) dome is consumed.

**Spell design notes:**
- `FULMEN` and `GELU` are the "obvious" spells — familiar power fantasies, available early
- `GELU` slows, not freezes — tension remains (enemies still approach), but typed at the right moment it buys significant time. Visual ramp-back in the last 2s telegraphs expiry.
- `BREVE` modifies *what you type*, not the world — the most Arcane Lexicon-specific spell
- `ARMA` is the defensive anchor — cast it before you need it. When triggered it creates a physics moment: enemies visibly fly outward from the player.

**Unlock announcement:** brief centered overlay ("BREVE UNLOCKED — shorten their words")
in the spell's primary color, fades in 0.3s / out 0.5s. Spellbook slot gains a glow burst.

**Typability check:** shortest = `GELU`/`ARMA` (4 letters), longest = `FULMEN`/`BREVE` (5–6).
Average 4.75 letters. A player typing 60 WPM enters `FULMEN` in ~0.3s.

**Enemy words (separate system):** Enemies carry English words, not Latin. Word length
is set by enemy tier. See Enemy Types below.

### Enemies

**Enemy taxonomy** — Latin names, platonic solid progression. Shape = tier. Bigger and rounder = more dangerous.

| Name | Shape | Health | Speed | Threat radius | Latin meaning |
|------|-------|--------|-------|--------------|---------------|
| **Acutus** | Tetrahedron (4 faces) | Low | Fast | 0.8u | "sharp one" |
| **Solidus** | Cube (6 faces) | Medium | Medium | 0.95u | "solid one" |
| **Perfectus** | Octahedron (8 faces) | High | Slow | 1.1u | "perfect one" |
| **Nexus** | Dodecahedron (12 faces) | Very high | Very slow | 1.5u | "the connected" — boss tier, two-phase fight |

All enemies:
- Flat shading, no textures
- Slow rotation while alive (each enemy rotates on its own axis)
- Rendered in Sheikah blue at low game intensity, warming toward Sheikah orange at high intensity
- Death: geometry shatters outward (explode into faces), then particle burst
- **Assigned word:** each enemy spawns with an English word displayed above it
  - Word floats above the enemy geometry, always faces the camera (billboard)
  - Full opacity on the focused enemy; 40% opacity on all others
  - Word length is determined by enemy tier (see table below)
  - When GELU is active: word text renders with ice-blue tint and reduced opacity
  - When BREVE is active: word shows only its remaining (shortened) letters

**Enemy word pools (English, curated by tier):**

| Tier | Word length | Thematic tone | Example words |
|------|-------------|---------------|---------------|
| Acutus | 3–4 letters | Sharp, violent, fast | STAB, FANG, CLAW, GASH, BOLT, RAGE |
| Solidus | 5–6 letters | Solid, weighty, direct | CRUSH, SMASH, STOMP, STRIKE, HEAVY |
| Perfectus | 6–8 letters | Ancient, imposing | ANCIENT, WARDEN, CRUSHER, ENDLESS |
| Nexus (boss) | Phase 1: 8–10 letters / Phase 2: 6–8 letters | Apocalyptic, cosmic | SOVEREIGN → DESTROYER, OBLITERATE → WARDEN |

**Nexus two-phase fight:**
1. Nexus spawns with its Phase 1 word (8–10 letters). Type it → Nexus does NOT die.
2. **Phase transition:** color shifts dark blue → crimson; 1s invincibility window;
   2 Acutus minions spawn; Nexus gets a shorter Phase 2 word.
3. Player decides: kill minions first or push through to Phase 2 word.
4. Type Phase 2 word → Nexus dies with an amplified death burst + full camera shake.

**Word pair rule:** Phase 2 word is always shorter than Phase 1. Phase 1 = hardest typing;
Phase 2 (with minions) = harder context but easier word. Difficulty shifts from typing load
to situational chaos. Phase 1→2 pairs are pre-set (not randomized).

### Combat Flow
1. Wave of enemies spawns — each carries an assigned English word floating above it
2. Player watches enemies approach and attack timers tick
3. Player types enemy words to kill them; may interrupt to cast a spell word
4. Wave ends when all enemies are dead
5. Brief pause, next wave
6. Player dies when health reaches 0

---

## Visual Direction

**Theme:** Breath of the Wild — ancient Hyrulean magic meets Sheikah technology.
Think: deep night sky + Sheikah cyan runes + geometric stone-and-moss arena +
golden Triforce spell fire and ice-blue frost that glow against the dark wilderness.

**3D Style:** Low-poly geometric enemies — platonic solid progression (triangle →
tetrahedron → cube → octahedron). Each tier is visually distinct by shape AND
size: weak enemies are small and sharp; strong enemies are larger and rounder.
Enemies render as solid geometry with flat shading (no texture maps) — Dieter
Rams simplicity: shape does the work.

Arena: flat hexagonal floor plane with beveled edges, surrounded by a large 300-unit
ground plane that fills the screen to the horizon. Background and fog use a dark field
green (`#3D7028`) so the world feels like an open Hyrule meadow. The arena floor is
lush grass (`#5A9B3A`); the outer field is a slightly darker shade (`#4A8530`).
Atmospheric depth = Three.js `FogExp2` at density 0.02 using the outer field color —
enemies at the screen edge fade into the distant field.

Spell effects are the visual stars — enemies and environment should be
relatively restrained so spells POP.

**Camera:** Third-person top-down (isometric feel). Player in center.
Enemies approach from all directions. Camera can shake on big spells.

**Color journey (as the game escalates):**
- Early waves: Sheikah blue glyphs + sparse cyan particles — calm and ancient
- Mid game: Triforce gold spell fire, Zora ice-blue frost — warm vs. cold contrast
- Late waves / full combat: full spectrum, Calamity orange-red surge, screen effects, bloom

---

## Audio Direction

- Ambient: low, ominous hum. Dark dungeon atmosphere.
- Each spell has a distinct audio signature:
  - FULMEN: sharp crack + chain electricity buzz
  - GELU: high crystal ping + reverb tail
  - ARMA: resonant bell strike on cast; sharp glass-shatter on shield break
  - BREVE: rapid staccato clip (letters being cut)
- Enemy death sounds (pitch varies by tier — Acutus = high, Nexus = low)
- Attack warning sound (enemy about to strike)
- Web Audio API — procedural or sampled, TBD

---

## Technology

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Rendering | Three.js | Production-grade 3D in browser. Handles WebGL complexity. Faster to reach "whoa" than raw WebGL. |
| Language | TypeScript | Type safety for complex game state |
| Bundler | Vite | Instant hot reload, zero-config |
| Testing | Vitest | Unit tests for game logic |
| Hosting | GitHub Pages / Netlify | Static deploy, shareable URL |
| Audio | Web Audio API | Procedural sounds, no file loading |

> **Alternative considered:** Raw WebGL 2.0 (deeper learning, more control).
> Rejected for v1 because Three.js lets us reach playable/beautiful faster.
> Raw WebGL is a possible later exploration once the game design is locked.

---

## Constraints

- Runs in browser, no install
- Loads in under 3 seconds on a typical connection
- 60fps on a mid-range laptop
- Single shareable URL
- No server required (pure client-side)
- No user accounts for v1

---

## Open Questions

1. **Game name** — working title is "Arcane Lexicon." Better options?
2. **Spell discovery** — in v1, the player sees their spellbook. In later versions, spells could be hidden/discovered.
3. **3D character models** — procedural geometry only, or low-poly model assets?
4. **Music** — procedural synth layers (Web Audio) or curated loops?
5. **Progression** — is there a meta-progression between runs (roguelite unlock), or is each run self-contained?
6. ~~**Story language**~~ — **Resolved:** Language split. Spell words are Latin (FULMEN, GELU, ARMA, BREVE). Enemy assigned words are English (STAB, CRUSH, WARDEN, SOVEREIGN). Mage speaks a deeper language than the enemies do.

---

## Screen Layouts

### Title Screen
```
┌────────────────────────────────────────────────┐
│                                                │
│                                                │
│       A R C A N E   L E X I C O N            │  ← [1] PRIMARY: title
│                                                │
│             [ press enter to begin ]          │  ← [2] SECONDARY: CTA (gentle pulse)
│                                                │
│   type enemy words to kill  ·  latin spells bend the rules   │  ← [3] TERTIARY: controls hint (40% opacity)
│                                                │
│                                                │
│    (particle field drifts in background)      │
└────────────────────────────────────────────────┘
```
- Title uses wide letter-spacing (≈0.3em) — spaced letters feel arcane, not generic
- CTA pulses at ~1Hz to suggest life without demanding attention
- Clicking anywhere OR pressing Enter/Space starts the game (creates AudioContext)
- Particle field is the game engine already running at very low intensity — warmup + preview

### Gameplay Screen
```
┌────────────────────────────────────────────────┐
│ Wave 3          ████████░░░  3/4               │  ← [3] TERTIARY: wave + health (top, 50% opacity)
│                                                │
│                                                │
│          ◆            ◆                       │  ← enemies approach (geometric shapes)
│                                                │
│               ●                               │  ← player (center-ish)
│                                                │
│        ◆                    ◆                 │
│                                                │
│              C R U S H _                      │  ← [1] PRIMARY: typed word (bottom center)
│     FULMEN    GELU    ARMA    ····            │  ← [2] SECONDARY: spellbook bar (locked slots = ····)
└────────────────────────────────────────────────┘
```
- Typed word is the primary HUD element — it's what changes most and needs eyes
- Spellbook bar shows spell names + cooldown state (see HUD Specification below)
- Health and wave counter are tertiary — important but not changing every second

### Between-Wave Overlay (brief, 1.5s)
```
┌────────────────────────────────────────────────┐
│                                                │
│                [game visible behind]           │
│                                                │
│                 W A V E   4                   │  ← [1] Centered, fades in/out
│                                                │
└────────────────────────────────────────────────┘
```

### Death Screen (overlaid on collapsing world)
```
┌────────────────────────────────────────────────┐
│                                                │
│          [world drains to wireframe]           │
│                                                │
│           Wave 5  ·  Score 2,847              │  ← [2] SECONDARY: performance stats
│                                                │
│           [ press enter to restart ]          │  ← [1] PRIMARY: restart CTA
│                                                │
└────────────────────────────────────────────────┘
```
- No "GAME OVER" text — the visual collapse IS the game over animation
- Death state persists for 2s before the CTA fades in (no accidental restart)

### Pause Screen (tab hidden)
```
┌────────────────────────────────────────────────┐
│                                                │
│             [freeze frame behind]             │
│                                                │
│                   Paused                      │  ← minimal, center, low contrast
│                                                │
└────────────────────────────────────────────────┘
```

---

## Color Palette

The color journey follows combat intensity. At low intensity the world is serene and ancient; as the player builds power it blazes with Sheikah energy and Calamity fire.

| Role | Hex | Usage |
|------|-----|-------|
| **Background** | `#3D7028` | Canvas background, dark Hyrule field horizon |
| **Arena surface** | `#5A9B3A` | Floor plane — lush Hyrule Field grass |
| **Sheikah blue** | `#00D4FF` | Enemy outlines at low intensity, BREVE spell, player staff orb, health bar |
| **Ice blue** | `#7DD4F0` | GELU spell effects — Zora/Vah Medoh ice |
| **Sheikah orange** | `#FF8C20` | Mid-intensity glow, projectile outer glow — Sheikah slate activation |
| **Triforce gold** | `#F0C040` | FULMEN lightning, score text, projectile core — high-intensity accents |
| **Calamity** | `#FF3A00` | Late-intensity bursts, health-low warning — Calamity Ganon malice |
| **Crimson** | `#C01800` | Nexus Phase 2 color, enemy attack flash — deep danger |
| **Hylian parchment** | `#E8D9B8` | ARMA shield, near-peak effects — aged stone and wood |
| **Peak white** | `#FFFFFF` | Bloom core at maximum intensity |
| **HUD text** | `#1A2C0E` | Typed word, spellbook labels — dark Hylian ink, readable on field green |
| **HUD dim** | `#2A4818` | Inactive spells, wave counter, secondary info — muted dark forest |
| **Health full** | `#00D4FF` | Health bar fill — Sheikah blue (alive and powered) |
| **Health low** | `#FF3A00` | Health bar below 25% — Calamity orange-red (danger) |

**Contrast principle:** Spell effects are vivid (cyan, gold, orange) and bloom against the field green. HUD uses dark Hylian ink against the mid-tone field background. Environment is natural and open (Hyrule meadow, field grass).

**Implementation:** Colors live as TypeScript constants in `src/constants/colors.ts`.
Three.js materials reference these constants — no magic hex strings in component code.
CSS HUD colors use CSS custom properties on `:root` (`--color-hud-text`, etc.).

---

## Source Directory Structure

```
src/
  main.ts                    Entry point — init Three.js, game loop, input
  game/
    loop.ts                  Fixed-timestep game loop
    state.ts                 Game state machine (title/playing/dead/win)
    input.ts                 Keyboard capture, word buffer, spell matching
    wave.ts                  Wave spawning, difficulty scaling
  entities/
    player.ts                Player entity (position, health, mesh)
    enemy.ts                 Enemy base class (seek + separate movement)
    enemies/
      acutus.ts              Tetrahedron — fast, low health, 3–4 letter words
      solidus.ts             Cube — balanced, 5–6 letter words
      perfectus.ts           Octahedron — slow, high health, 6–8 letter words
      nexus.ts               Dodecahedron — boss, 8–12 letter words
      wordAssignment.ts      English word pool + per-spawn word assignment
    projectile.ts            Kill projectile entity (word-match fireball, size = f(wordLength))
  spells/
    definitions.ts           SpellDefinition[] — the spellbook
    system.ts                applySpellEffect(), cooldown tracking, ARMA deferred cooldown
    unlocks.ts               Kill-milestone unlock tracker
  renderer/
    context.ts               Three.js scene, camera, EffectComposer setup
    hud.ts                   HTML HUD element management (typed word, health, etc.)
    vfx.ts                   VFX registry — particle emitters, point lights
    sfx.ts                   Web Audio API, sound effects
  constants/
    colors.ts                Color palette constants (hex values)
    spells.ts                Spell timing constants (cooldowns, damage values)
    game.ts                  Game constants (health, wave params, arena size)
  types/
    spell.ts                 SpellDefinition, SpellEffect, SpellTarget types
    enemy.ts                 Enemy, EnemyState types
    game.ts                  GameState, GamePhase types
index.html                   Single HTML — canvas + HUD DOM + font import
```

---

## Typography

**Font:** JetBrains Mono (Google Fonts, free). Monospace matches the "typing = action" mechanic — every glyph occupies the same space, making typed words feel mechanical and precise.

| Element | Size | Weight | Letter-spacing | Opacity |
|---------|------|--------|----------------|---------|
| Game title (title screen) | 2rem | 800 | 0.3em | 100% |
| Typed word (HUD) | 1.5rem | 700 | 0.15em | 100% |
| Spellbook labels | 0.65rem | 400 | 0.1em | 60% |
| Wave announcement | 1.8rem | 700 | 0.25em | 100% |
| Health / wave counter | 0.7rem | 400 | 0.05em | 50% |
| Controls hint | 0.65rem | 300 | 0.05em | 40% |
| Score / death screen | 0.85rem | 400 | 0.05em | 70% |

**Fallback:** `'Courier New', monospace` — will look slightly worse but not broken.

---

## Spell Visual Identity

Each spell must be visually distinct at a glance. The visual signature IS the spell's feedback.

| Spell | Color | Shape | Motion | Sound signature |
|-------|-------|-------|--------|-----------------|
| `FULMEN` | Triforce gold `#F0C040` + white flash | Arc chains from player → 3 nearest enemies | Near-instant outward chains | Sharp crack + chain buzz |
| `GELU` | Ice blue `#7DD4F0` + frost-white | Expanding ring from player; enemy words frost over | Radially outward 0.5s; words + enemy geometry get ice-blue tint, fades with speed during 2s ramp-back | High crystal ping, reverb tail |
| `ARMA` | Hylian parchment `#E8D9B8` + Sheikah edge | Hemisphere dome over player; shatters on hit absorbed or 15s expiry | Rises 0.3s, holds until consumed | Bell strike (resonant) |
| `BREVE` | Sheikah blue `#00D4FF` flash | Letters strip off right side of each enemy word | Near-instant, left-to-right sweep across HUD words | Rapid staccato clip |

| Kill projectile | Triforce gold `#F0C040` → Sheikah orange `#FF8C20` | Sphere (size scales with word length) | Straight line to enemy at 12 u/s; ember trail | Low whoosh → impact crack |

**Dynamic lighting rule:** Every spell cast and every kill projectile launch creates a brief (0.5–1s) point light in the effect's primary color. Dark + point lights = spectacle.

---

## HUD Specification

### Enemy Word Display (floating above each enemy, in 3D space)
- Each enemy renders its assigned word as a billboard HTML element tracked to the enemy's 3D position
- Focused enemy: `#C8C4BC`, 100% opacity, 0.85rem, letter-spacing 0.1em
- Non-focused enemies: `#C8C4BC`, 40% opacity, 0.7rem
- When GELU active: word shifts to `#2DD4BF` tint, slight blur (CSS filter)
- When BREVE active: only the remaining (non-stripped) letters show; stripped letters render as `·` at 20% opacity
- When enemy dies mid-word: word explodes outward with the geometry (matched particle burst)

### Typed Word Display (bottom center)
- Position: horizontally centered, 80px from bottom edge
- Style: large monospaced text with wide letter-spacing (0.15em), blinking underline-cursor
- Thin decorative line below the word with subtle arcane glyph marks at each end
  (CSS `::before`/`::after` with unicode runes or SVG, 20% opacity)
- NOT a `<input>` element — the game captures raw `keydown` events
- Clears instantly on enemy kill, spell cast, OR on backspace to empty
- On fizzle (wrong word): brief red flash (`#EF4444`) on the word text, then clears in 0.15s
- **Prefix highlight:** as the player types, matching prefix letters on the focused enemy's
  word render in the spell's primary color (green → indicates progress toward that kill)

### Spellbook Bar (bottom, full width)
- 4 spell slots evenly distributed across bottom edge
- Each slot shows: spell word + cooldown indicator + lock state
- **Locked:** slot renders as `· · · ·` placeholder, 20% opacity (player doesn't see the word yet)
- **Unlocked, ready:** `#C8C4BC` text, 60% opacity
- **On cooldown:** `#5A5660` text, 30% opacity, with clock-wipe overlay
- **Newly unlocked:** brief glow burst in the spell's primary color + 0.3s entrance animation
- **Recently cast:** brief highlight flash in the spell's primary color

### Health Bar (top right)
- Thin horizontal bar (4px height, 120px wide)
- Fill color transitions from teal (#2DD4BF) → hot pink (#EC4899) as health falls
- At <25%: bar pulses at ~1Hz (breathing warning)
- No number — it's a felt quantity, not a calculated one

### Wave Counter (top left)
- "Wave 3" — minimal, `#5A5660`, 50% opacity
- Updates when wave transitions

---

## Interaction States

| State | What player sees | Duration / trigger |
|-------|-----------------|-------------------|
| Cold load | Black → title screen fades in | 0.8s fade |
| Title idle | Particles drift, title pulses gently | Until click/Enter |
| Game start | Wave 1 spawns, enemies appear | On player input |
| Combat active | Normal gameplay | Until wave ends or player dies |
| Word match (kill trigger) | Mage lunges toward target, staff orb brightens; projectile launches from staff tip; matched enemy marked for death | 0.32s cast anim |
| Projectile in flight | Amber fireball tracks toward moving enemy; ember trail | ~0.15–0.4s travel |
| Projectile impact | Enemy shatters + particle burst (scaled to word length); score delta | 0.5s death anim |
| Spell cast (success) | Mage rotates toward nearest enemy and lunges; spell VFX + point light + spellbook slot flash | 0.32s cast anim + VFX 0.5–2s |
| Spell unlocked | Centered overlay with spell name + description; slot glows | 0.8s overlay |
| Auto-focus shift | As player types, prefix-matched enemy word shifts to full opacity; others dim | Per keystroke |
| Fizzle (wrong word) | Red flash on typed word, word clears | 0.15s flash |
| Fizzle (on cooldown) | Same red flash as wrong word — same feedback, simpler logic | 0.15s flash |
| Spell on cooldown | Spellbook slot dimmed with clock-wipe overlay | Ongoing during cooldown |
| ARMA active | Dome rises over player; next contact damage blocked; on trigger, dome shatters + nearby enemies pushed + stunned 2s | Until shield consumed or 15s |
| GELU active | All enemy words get ice-blue tint; enemies slowed to 40% speed, ramping back to full over last 2s | Until ramp-back complete (7s) |
| BREVE active | Enemy words show stripped letters as `·` placeholders | Until expiry (5s) |
| Enemy proximity warning | Enemy flashes red when player enters threat radius (0.3s before contact damage) | 0.3s flash |
| Player hit | Vignette flash (red, 0.2s), health bar updates | 0.2s |
| Wave clear | "Wave N+1" overlay fades in/out | 1.5s |
| Player death | Visual drain to wireframe over 2s, then death UI | 2s + UI fade |
| Restart | Instant reset — title screen or wave 1 | On Enter/click |
| Tab hidden | Freeze frame + "Paused" centered text | Until tab returns |
| WebGL unsupported | Styled fallback on black: instructions to use Chrome/Firefox | Persistent |

---

## Emotional Arc

### The Hook: First Kill
The first kill projectile is the "inciting incident" — the moment the player understands what this game is.

- Player completes the first enemy word → a fireball launches from their position
- First projectile: boosted size (1.5x normal), brighter amber glow
- Impact: louder crack, 40% bigger particle burst, brief screen flash
- This teaches: "my typing launches something real" and "the word's length is the spell's power"

### The Second Hook: First Spell Unlock
The first spell unlock (FULMEN at 5 kills) is the moment the player discovers there's a layer beneath typing.

- Unlock overlay fades in mid-combat — player has to choose: keep killing or try the new word
- First FULMEN cast: boosted visual (extra chain width, brighter lightning) to reward the experiment

### Tension Escalation
- Enemies attack faster in later waves → typing pressure increases
- Multiple enemies with long words approaching → player must decide: type enemy words, or cast BREVE?
- Wave 5+: intentional "oh shit" moment — more enemies than the player has dealt with before

### Mastery Moment
The moment a player successfully interrupts killing to cast a spell, then cleanly resumes killing — this is the peak behavioral experience.

**Multi-kill cascade:** When 2+ enemies die within 1 second of each other:
- Particle bursts from each death point are amplified (2x particle count)
- A connecting arc of gold particles briefly links the kill points
- Screen flash is slightly brighter
- Score multiplier text appears: "×2 COMBO" or "×3 COMBO" in gold, fades in 1s
- This rewards the player for tactical decisions, not just fast typing

---

## Accessibility

**Color blindness:** The cold (blue) → warm (amber/gold) color journey is luminance-based, not hue-based. Distinguishable for protanopia and deuteranopia.

**Motion sensitivity:** Camera shake is cosmetic and can be removed. Add a `reducedMotion` config flag for Phase 3. If `prefers-reduced-motion` is set, disable shake and screen warp.

**Keyboard:** This is a keyboard game — inherently keyboard-first. No pointer-only interactions.

**Canvas ARIA:** `aria-label="Arcane Lexicon — a 3D typing spell game"` on the canvas element.

**HiDPI:** Render at `window.devicePixelRatio`, cap at 2x to avoid GPU overload on high-DPI displays.

**Minimum viewport:** 1024px wide. Below 800px: display a styled message on black background ("Please open this on a desktop — Arcane Lexicon requires a keyboard."). No responsive HUD needed above 1024px; HUD uses fixed px values designed for that width.

---

## What This Is NOT (Scope Guard)

- Not a typing tutor or educational app
- Not just a ZType reskin — enemy words are the baseline, spells bending the rules is what makes it different
- Not a multiplayer game (v1)
- Not a mobile game
- Not a roguelite (v1 — possible later)
