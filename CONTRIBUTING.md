## Contributing – TPS RAW V1

**Default branch:** `main`

## Rules
- `en.default.json` is the **only** source of truth for copy keys.
- Never remove keys from other locales manually; use the scripts to keep parity.
- Keep locales syntactically valid JSON (the repo uses JS for tolerant parsing, but commits must be strict JSON).

## Workflow
1. Create a feature branch: `git checkout -b feat/<topic>`
2. Update `locales/en.default.json` only.
3. Run:
   - `npm run i18n:fix-selfrefs` (optional)
   - `npm run i18n:fill`
   - `npm run i18n:empty`
   - `npm run i18n:stats`
4. Commit and push your changes.
5. Open a PR to `main`.
