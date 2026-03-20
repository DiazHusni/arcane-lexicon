# Claude Instructions — Arcane Lexicon

## Documentation-first workflow

When any game feature, mechanic, or balance value is added or changed, always
follow this order:

1. **Update docs first** — Edit the relevant sections in `PHASES.md`, `DESIGN.md`,
   and/or `ARCHITECTURE.md` to reflect the intended change before touching any code.
2. **Then implement** — Apply the change in the source code.
3. **Then test** — Run `npm test` and confirm all tests pass before committing.
4. **Then push** — Commit and push all changes (docs + code) once tests are green.

Documentation files and what they own:
- `PHASES.md` — deliverable checklists, per-system descriptions, balance values
- `DESIGN.md` — spell table, enemy table, visual/audio signatures, UX flow table
- `ARCHITECTURE.md` — data flow diagrams, per-spell particle params, camera shake table

If a change only affects a single doc, update that one. If it touches multiple
(e.g. a spell rework touches the spell table in DESIGN.md and the deliverable in
PHASES.md), update all affected files before writing any code.
