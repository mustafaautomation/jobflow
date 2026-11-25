# Jobflow deploy notes

## Build

```bash
npm ci
npm run build
npm run start -- --port 43123
```

Dev server: `npm run dev` (port 43123).

Typecheck: `next typegen && tsc --noEmit` (`npm run typecheck`).

Lint: `npm run lint`.

Tests: `npm run test:e2e` (Playwright, zero secrets, production server on port 43123).

CI: `.github/workflows/ci.yml` on `ubuntu-latest`. Install browsers with `npx playwright install --with-deps chromium` (`@playwright/test` >= 1.65.1).

## Live URL

Target: https://jobflow.quvantic.com

Vercel project name: `jobflow`.

The app deploys with zero environment variables and stays in mock mode.

## Environment variables

All optional. See `.env.example`.

- `AUTH_SECRET` — sign mock session cookies before real tenant data
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` (or legacy `NEXT_PUBLIC_SUPABASE_ANON_KEY`)
- `SUPABASE_SECRET_KEY` (or legacy `SUPABASE_SERVICE_ROLE_KEY`) — server only
- `STRIPE_SECRET_KEY` — Stripe test secret
- `STRIPE_WEBHOOK_SECRET`
- `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`
- `STRIPE_PRICE_STARTER`
- `STRIPE_PRICE_PRO`
- `NEXT_PUBLIC_MAPTILER_KEY`
- `GROQ_API_KEY`
- `GROQ_MODEL`
- `GEMINI_API_KEY`
- `GEMINI_MODEL`
- `SEED_USER_PASSWORD` — only `npm run seed:supabase`
- `NEXT_PUBLIC_APP_URL`

Health: `GET /api/health`.

Schema: `supabase/migrations/20261125094610_jobflow_init.sql`.

## Test results

Playwright, 3 passed:

- customer request becomes a job, dispatcher assigns, technician completes, mock payment succeeds
- Summit Plumbing cannot see Cedar HVAC jobs
- public demo is read-only
