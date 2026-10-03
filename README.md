# ACME Salary Management

Web app for ACME's HR manager to **manage salary data for 10,000 employees across
10 countries** and **answer "how do we pay people?"**, replacing a set of spreadsheets.

- **Insights**: headcount, payroll, median and spread, grouped by country, department,
  level or role, with filters. Everything is normalized to USD at fixed rates.
- **Employees**: search, filter and sort 10k people, with each person's current salary in local currency and in USD.
- **Salary history**: raises are appended, never overwritten. Future-dated raises are supported,
  and each employee page shows **how their pay compares with peers** (same role, level and country).

| Doc | What's in it |
|---|---|
| [docs/Requirement.md](docs/Requirement.md) | One-page requirements: goal, scope, what's left out and why |
| [docs/Architecture.md](docs/Architecture.md) | Design, data model, API, trade-offs, security, performance, testing |
| [docs/AiPrompts.md](docs/AiPrompts.md) | How AI was used: prompts, guardrails, what was corrected and how it was caught |
| [docs/Deployment.md](docs/Deployment.md) | Vercel (web) + Render (API) + Neon (Postgres), step by step |

## Tech stack
**API:** Node 22 · Express 5 · TypeScript · Prisma 6 · PostgreSQL 16 · zod
**Web:** Next.js 16 · React 19 · shadcn/ui · Tailwind 4 · TanStack Query · Recharts
**Tests:** Vitest · Supertest (94 tests: domain unit, API integration on real Postgres, web unit) · GitHub Actions CI

## Run it locally

Prerequisites: Node 22+, Docker.

```bash
npm install
npm run db:up                         # Postgres 16 on localhost:5440 (+ a separate test DB)

cp apps/api/.env.example apps/api/.env
# Fill in ADMIN_PASSWORD_HASH and JWT_SECRET (commands are in the file):
npm run hash-password -w apps/api -- "choose-a-password"

npm run db:migrate                    # create tables
npm run db:seed                       # 10,000 employees + ~56k salary records (~10s, deterministic)

npm run dev:api                       # http://localhost:4000
npm run dev:web                       # http://localhost:3000, sign in with ADMIN_EMAIL + your password
```

## Quality checks
```bash
npm test             # API unit + integration (needs `npm run db:up`) and web unit tests
npm run typecheck    # API (including tests) and web
npm run lint
```

## Project structure
```
apps/api/
  prisma/              schema + migrations (incl. hand-written CHECK constraints)
  src/domain/          pure business logic: money, dates, salary rules, reference data
  src/modules/         auth · employees · salaries · insights · meta  (routes → service)
  src/seed/            deterministic 10k generator (unit tested) + bulk loader
apps/web/
  src/app/             routes: /login, / (insights), /employees, /employees/[id]
  src/components/      feature components (insights/, employees/) + shadcn ui/
  src/proxy.ts         redirects signed-out users to /login
docs/                  requirements, architecture, AI usage log
```

## Key decisions (details in [Architecture.md](docs/Architecture.md))
- **Salaries are append-only history** in local currency. "Current salary" is derived,
  so history is never lost and scheduled raises work.
- **Fixed exchange-rate table**, so reports are reproducible and tests deterministic.
- **Analytics run in SQL** (`percentile_cont`). Every page is under 100 ms on the 10k dataset.
- **Next.js proxies `/api`** so the browser stays on one origin and an `httpOnly SameSite=Lax`
  session cookie works across separately hosted web and API.
- **Deliberately out of scope:** payroll/tax, CSV import, pay-equity analytics, multi-user roles.
  Reasons are in [Requirement.md](docs/Requirement.md).

## Known limitations / next steps
- Single HR account: no user management, roles, MFA or audit trail of who changed what.
- Peer comparison includes the employee themself in the peer group.
- Search uses `ILIKE` (~80 ms at 10k). A `pg_trgm` index is the next step if data grows.
- Exchange rates are maintained manually in the `exchange_rates` table.
