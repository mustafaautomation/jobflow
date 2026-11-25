# Rescued from Cursor

Source: None https://cursor.com/agents/bc-1d5fad3a-e2b3-5d02-b004-1310c889d00b
Scope: Last Agent Turn
Captured: 2026-11-25T11:22:37.934Z
Files written: 75

Not in this copy: files Cursor's template created and the agent never changed (e.g. tsconfig, shadcn ui components, lockfiles, public assets) when scope is 'Last Agent Turn'; binaries.


## Repairs (25 Nov 2026, Claude Code)

- `next.config.ts` and `src/components/ui/sonner.tsx` were cut off mid-file; restored full text from the all-commits Cursor export.
- Removed `src/app/(ops)/notifications/page.tsx`: the agent replaced it with `src/app/notifications/page.tsx` (shared by every role) but the deletion was not in the capture, and both together break `next build` ("two parallel pages resolve to the same path").
- Recreated template files: `tsconfig.json` (`@/*` -> `./src/*`), `eslint.config.mjs` (next core-web-vitals + typescript), `components.json` (shadcn `base-nova`, Base UI).
- Regenerated shadcn/ui components with `npx shadcn@4.23.0 add button input label select tabs textarea tooltip` (they import `cn` from the `cn` package, like the agent's own components; no `lib/utils.ts` is needed).
- Regenerated `package-lock.json` with `npm install`.
- Regenerated README screenshots (`docs/screenshots/*.png`) from the running app with `SCREENSHOTS=1 npx playwright test`.

Verified locally: `npm run typecheck` OK, `npm run lint` 0 errors (3 unused-var warnings), `npm run build` OK, `npx playwright test` 3 passed.
