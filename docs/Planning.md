# Planning & Delivery Notes

How the work was planned, the order it was built in, what changed along the way,
and where each requirement of the brief is met.

## 1. Approach

**Time box:** 2–3 days. **Principle:** thin vertical slices, each one working and
tested before the next starts, one commit per slice.

| Phase | Output | Exit criteria |
|---|---|---|
| 0. Understand | Requirements analysis, clarifying questions, scope decisions | Scope agreed; exclusions written down with reasons |
| 1. Document | [Requirement.md](Requirement.md), [Architecture.md](Architecture.md) | Committed **before any code** (brief requirement) |
| 2. Foundation | Monorepo, Postgres in Docker, Express scaffold | `/health` responds; first test passes |
| 3. Data | Prisma schema + migrations, domain logic, 10k seed | Constraints verified in `psql`; domain unit tests pass; seed is deterministic |
| 4. API | Employees → salary history → insights → auth | Integration tests on a real DB; endpoints timed on 10k rows |
| 5. UI | Login + shell → insights → directory → detail | Verified in a real browser with screenshots, not just compiled |
| 6. Ship | CI, docs, deploy (Vercel + Render + Neon) | Green CI; live URL smoke-tested |

### Risks identified up front
| Risk | Mitigation (as delivered) |
|---|---|
| Adding salaries in different currencies | One tested conversion path to USD with a fixed rate table; currency FK guarantees every salary converts |
| 10k rows overwhelming the UI | Server-side pagination and SQL aggregation from the first endpoint |
| Flaky tests from random seed data | Small hand-built fixtures in tests; separate `_test` database |
| Deployment surprises late | Production-mode start tested locally before deploy; deploy config in the repo |
| Scope creep | Every feature checked against Requirement.md; exclusions documented |

## 2. Build order and why

1. **Docs first.** The brief asks for requirements before building, and writing the data model down early exposed the two core decisions (multi-currency and salary history).
2. **Schema, then domain logic.** The riskiest correctness questions (money rounding, "current salary", timezones) are pure functions, so they were nailed down with fast unit tests before any HTTP code existed.
3. **Seed before API.** Realistic 10k data existed from day one, so every endpoint was timed against real volume, not 5 test rows.
4. **API before UI.** The UI was built against a finished, tested contract.
5. **Insights before directory in the UI.** Answering "how do we pay people?" is the product's reason to exist, so it got built and reviewed first.

## 3. What changed from the plan

| Planned | Delivered | Why |
|---|---|---|
| `/insights/by-country`, `/by-department`, `/by-role` | One `/insights/breakdown?groupBy=` + filters | HR's questions are combinations ("median by level for Engineering in India"); one whitelisted query answers them all and is tested once |
| Browser calls the API directly with CORS | Next.js proxies `/api/*` | Web and API on different hosts would need cross-site cookies, which browsers increasingly block |
| Hosting on Cloudflare (considered) | Vercel + Render + Neon | Cloudflare has no managed Postgres (D1 is SQLite: no `percentile_cont`, no decimals), and the Workers free CPU limit (10 ms) is below a bcrypt login (~200 ms). Not worth a redesign this close to delivery |
| Peer comparison: not planned | Added on the employee page | Answers the question HR asks before approving a raise; reused the summary endpoint, no new backend code |
| Job title filter (in Requirement.md) | Initially missed in the UI, added after a requirements audit | The API supported it; the audit caught the UI gap |

## 4. Requirements traceability

### From the brief
| Brief requirement | Where it's met |
|---|---|
| One-page requirements doc before building | [Requirement.md](Requirement.md), first commit `a8f2cbe` |
| Backend in role's language + relational DB | Node/Express/TypeScript + PostgreSQL (`apps/api`) |
| UI in React/Next.js + component library | Next.js 16 + shadcn/ui (`apps/web`) |
| Seed script with 10,000 employees | `apps/api/src/seed`, deterministic, ~10 s |
| Fully functional deployed software | https://salary-management-indol.vercel.app, [Deployment.md](Deployment.md) |
| Video demo | Recorded separately |
| Meaningful, fast, deterministic unit tests | 94 tests: domain unit, API integration on real Postgres, web unit; CI on every push |
| Incremental commits | One commit per slice, see `git log` |
| Artifacts: requirements, planning, diagrams, AI prompts, trade-offs, performance | Requirement.md · this file · Architecture.md (diagrams, trade-offs, performance) · [AiPrompts.md](AiPrompts.md) |

### From Requirement.md (our own scope)
| In-scope item | Delivered |
|---|---|
| Single HR login | ✅ bcrypt + httpOnly JWT cookie, rate-limited |
| Directory: search, filter (country, department, job title, status), sort, pagination | ✅ (plus level filter; state kept in the URL) |
| Create / view / edit / deactivate | ✅ (plus reactivate) |
| Append-only salary history in local currency | ✅ (plus scheduled future raises) |
| Insights: headcount & payroll by country/department; min/median/avg/max by title & level; P25–P75 | ✅ one group-by explorer + KPI tiles + full table |
| Deterministic 10k seed | ✅ |
| < 300 ms at 10k | ✅ 15–95 ms measured |
| Deployed and publicly accessible | ✅ |
