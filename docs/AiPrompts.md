# AI Usage Log

> How I used AI on this project: what I asked, what I accepted, what I
> changed, and how I verified it.

## 1. My approach

**Tool:** Claude Code (Claude Opus), used inside VS Code.

I gave the AI a specific **role** in each phase instead of asking it to
"build the app":

| Phase | AI role | My role |
|---|---|---|
| Requirements | Business analyst: find explicit and implied requirements, risks and open questions | Answer the questions, make the scope calls |
| Design | Architect: propose stack, data model, API | Challenge trade-offs, approve or change |
| Build (early steps) | Pair programmer: give code step by step | Type the code myself, read and understand it |
| Build (later steps) | Implementer: write code, run it, commit in small steps | Review every diff and commit; own the decisions |
| Quality | Tester/reviewer: tests, end-to-end checks, screenshots | Decide what to fix |

### Guardrails I set
1. **No big-bang generation.** Work went step by step with one commit per
   feature slice, so every change is small enough to review. I typed the early
   steps myself; for later steps the AI wrote the code and I reviewed the
   commits. The commit history shows which is which.
2. **Decisions stay with me.** The AI proposes options and I choose. Every
   scope decision is recorded with reasoning in `Requirement.md`.
3. **Verify, don't trust.** AI output is checked by running it, writing tests,
   and reading official docs (Prisma, Next.js, Postgres).
4. **No real or sensitive data.** Only the assessment brief and synthetic seed
   data were shared with the AI. No secrets or `.env` values.
5. **Docs before code.** Requirements and architecture were committed before
   any implementation, as the brief asks.

---

## 2. Session log

### Session 1: Requirements analysis
**Goal:** Understand the brief deeply before writing anything.

**Prompt (verbatim):**
> "act as a business analyst read properly the plan requirement everything
> but dont start project"

**Why I framed it this way:** I wanted analysis, not code. Assigning a BA role
and forbidding implementation stopped the AI from jumping ahead.

**What the AI produced:**
- Explicit requirements (R1–R12) traced to sections of the brief
- Implied requirements, the most valuable part:
  - *Multi-country ⇒ multi-currency.* Summing INR and USD is meaningless,
    so the dashboard needs normalization to a reporting currency.
  - *"Answer questions about how the org pays people" ⇒ analytics is a
    first-class feature,* not an add-on to CRUD.
  - *10k rows ⇒ server-side pagination and DB-level aggregation.*
  - *Salary changes ⇒ history,* not overwrites.
- Risks (e.g. SQLite on ephemeral hosting, non-deterministic tests)
- Six clarifying questions for me

**What I took from it:** The currency and salary-history insights shaped the
data model directly (see `Architecture.md`).

---

### Session 2: Scope and stack decisions
**Goal:** Answer the AI's clarifying questions and lock the scope.

**My answers and reasoning:**

| Question | My decision | Why |
|---|---|---|
| Stack | Node (Express) + Next.js | Matches the role I applied for |
| Database | **PostgreSQL** over SQLite | SQLite files don't persist on most free hosting; Postgres also has `percentile_cont` built in for medians |
| Timeline | 2–3 days | Real constraint, so scope had to be tight |
| Excel/CSV import | **Excluded** | Tempting, but a good import needs validation and error-reporting UX; a weak one would hurt more than help |
| Pay-equity analytics | **Excluded** (accepted AI's recommendation after checking its reasoning) | A raw gender gap without controlling for role, level and tenure is misleading, and it needs legal/privacy review |
| Auth | Simple single-user login | One persona in the brief; full user management is out of scope |

**Verification moment:** My stack answer had a typo ("node nads next"). The AI
stated its interpretation (Node + Next.js) and asked me to confirm instead
of silently assuming. I confirmed before moving on.

**AI suggestion I accepted after review:** A separate Express backend instead
of Next.js API routes. Trade-off: two deployables, but clearer separation
and independent testability, and it matches the brief's "backend & UI" wording.

---

### Session 3: Documentation
**Prompt:** "yes start just guide step by step give code also i will see and
code manually"

**Output:** Drafts of `Requirement.md`, `Architecture.md` (Mermaid diagrams,
ER model, API table) and this log.

**My review:** Read each draft against the brief to confirm the scope matched
what I'd decided, then committed docs as the first commits.

**Prompt:** "can improve the prompt.md file interview should be impress"
**Output:** This log's structure (roles, guardrails, verbatim prompts, an
overrides table). The AI told me to keep the overrides table *real* rather
than invent entries, and to keep prompts verbatim, typos included.

---

### Session 4: Scaffold (I typed it, AI checked my work)
**Goal:** Monorepo, local Postgres, Express scaffold.

**What happened:**
- Before giving setup steps, the AI checked my machine (`node -v`, `docker -v`,
  `psql --version`), found a local Postgres 17 on 5432, and mapped the Docker DB
  to 5433.
- `docker compose up` then failed: 5433 was **also** taken, by a container
  from another project. Found it with `docker ps` + `Get-NetTCPConnection`
  and moved to 5440.
- When I said Step 4 was done, the AI checked instead of trusting me. It ran
  the tests, found `"workspace"` instead of `"workspaces"`, a `db-down` script
  typo, an uncommitted `Architecture.md`, and that Step 4 files didn't exist
  yet. Each fix went into its own small commit.

---

### Session 5: Backend build (AI implements, I review)
**Prompts (verbatim):** "u can do this" · "you write the code leveter i will review the code"

**Order:** schema → domain logic + unit tests → deterministic seed → employees
API → salary history → insights → auth. One commit per step, and each step
was only committed after tests, typecheck and a real run against the 10k data.

**How it was verified (not just "tests pass"):**
- Ran the generated SQL migration and inspected tables and indexes in `psql`.
- Checked that the `CHECK` constraint really rejects a negative rate.
- Sanity-checked the seed data with SQL (median pay by country looks realistic).
- Insights tests assert **hand-computed percentiles**
  (e.g. P25 of 30k, 80k, 100k, 120k, 140k, 160k = 85k).
- Timed every endpoint on 10k employees (all under 100 ms).
- Confirmed integration tests never touch the dev DB (row count unchanged)
  and added a guard that refuses to reset any database not named `*_test`.

---

### Session 6: Frontend (AI implements, verifies in a real browser)
**What happened:**
- Next.js 16 shipped an `AGENTS.md` warning that APIs changed (Middleware is
  now `proxy.ts`). The AI read the bundled Next.js docs before writing code
  instead of relying on older knowledge.
- Ran a headless-browser end-to-end flow (login → search → create employee →
  record raise → duplicate email) and took screenshots, which caught
  **two UX problems** and **one real backend bug** (see table below).

---

<!-- Copy this template for every new session -->
### Session N: <title>
**Goal:**
**Prompt (verbatim):**
**AI output (summary):**
**Accepted / changed / rejected, and why:**
**How I verified:** (test written, ran it, checked docs, EXPLAIN ANALYZE, …)

---

## 3. Where I overrode or corrected the AI
> Kept honest and updated as I build. This is where my own judgment shows.

| # | First version | Corrected to | How it was caught |
|---|---|---|---|
| 1 | Docker DB on port 5433 | Port 5440 | `docker compose up` failed; another project's container held 5433. The AI had checked installed tools but not running containers. |
| 2 | `moduleResolution: "Node"` in tsconfig | `NodeNext` | npm installed TypeScript 7, which removed the old option. Caught by running `tsc`. |
| 3 | Planned `/insights/by-country`, `/by-department`, `/by-role` | One `/insights/breakdown?groupBy=` with filters | HR's real questions are combinations; one whitelisted, tested query covers all of them. |
| 4 | Node's default 5s keep-alive on the API | 65s keep-alive | End-to-end browser run showed an intermittent 500; Next's log showed `ECONNRESET` on a reused socket. Reproduced with idle gaps, fixed, and re-verified. |
| 5 | INR shown as ₹2,400,000 | ₹24,00,000 (lakh grouping) | A unit test exposed that the code didn't match its own comment. Indian HR reads salaries in lakhs. |
| 6 | Dashboard "Group by" dropdown showed just "Country" | "Group by: Country", no "All" option | Seen in the screenshot: it looked like a duplicate of the Country filter. |
| 7 | Median chart in payroll order | Sorted by median (levels stay L1→L6) | Seen in the screenshot: an unsorted bar chart is hard to read. |

**Checked and found correct (not changed):**
- shadcn added an unfamiliar dependency `cn`. Verified on npm that it's
  published by shadcn from `shadcn-ui/cn` before trusting it.
- A new employee showed exactly **0.0%** vs the peer median. That looked like a
  bug (comparing someone to themself), but SQL showed they ranked exactly
  27th of 53, i.e. the median. Kept, and labelled "including this employee".

## 4. Where AI helped most / least
*(Fill in at the end of the project.)*
- **Most:** 
- **Least / needed most correction:** 

## 5. Takeaways
*(Fill in at the end: what I'd do differently in how I use AI next time.)*
