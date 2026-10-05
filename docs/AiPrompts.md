# AI-Assisted Engineering Log

How AI was used to build this project: the operating model, the prompts, how
output was verified, and every case where AI output was corrected.

| | |
|---|---|
| **Tool** | Claude Code (Claude Opus) in VS Code: agentic, with terminal, file and browser access |
| **Scope of use** | Requirements analysis, design, implementation, testing, end-to-end verification, deployment setup |
| **Human ownership** | All scope and architecture decisions; review of every commit; production credentials |
| **Outcome** | One commit per slice (see `git log`) · 94 automated tests · green CI · deployed · **8 AI-output defects caught and fixed before release** (§5) |

---

## 1. Operating model

AI was used as a **role-scoped collaborator**, never as "build me an app". Each
phase had an explicit role, a bounded task and a definition of done.

| Phase | AI role | Engineer (me) |
|---|---|---|
| Discovery | Business analyst | Answer questions, make every scope call |
| Design | Architect | Challenge trade-offs, approve or redirect |
| Foundation | Pair programmer (guided) | **Typed the code myself** from step-by-step guidance |
| Build | Implementer, in small verified slices | Reviewed each slice and commit; owned decisions |
| Quality | Tester and reviewer | Decided what to fix and what to accept |
| Release | DevOps assistant | Created accounts; handled all secrets myself |

The commit history reflects this split: early scaffold commits were hand-typed;
later feature commits were AI-implemented and human-reviewed.

## 2. Guardrails (the working agreement)

1. **Docs before code.** Requirements and architecture committed before any implementation.
2. **Small slices.** One feature per commit, so each change is reviewable on its own.
3. **Definition of done for every slice**, enforced before each commit:
   - unit and integration tests pass · typecheck passes (tests included) · lint is clean
   - exercised for real: against the 10k dataset for API work, in a real browser for UI work
4. **Verify, don't trust.** Version-sensitive claims (Next.js 16, TypeScript 7, Prisma 6)
   were checked against the installed packages' own docs, not model memory.
5. **Decisions stay human.** The AI proposes options with trade-offs; I choose; the
   reasoning is recorded in [Requirement.md](Requirement.md) and [Architecture.md](Architecture.md).
6. **Data and secret hygiene.** Only the brief and synthetic data were shared.
   Credentials were generated and entered by me; the AI read env files with values
   masked and never printed a connection string or password.

## 3. Prompt design

Every working prompt followed the same structure:

```
ROLE         who the model should act as
CONTEXT      what exists already, constraints of the environment
TASK         one bounded objective
CONSTRAINTS  what not to do, conventions to follow
DONE WHEN    observable acceptance criteria
```

The prompts below are written in that structure and capture the instructions that
drove each phase. **My original messages are reproduced verbatim in
[Appendix A](#appendix-a-original-messages-verbatim)**; they were brief and informal,
with the role, constraints and acceptance criteria established in the
surrounding conversation.

### P1: Discovery (requirements analysis)
```
ROLE         Senior business analyst.
CONTEXT      Take-home brief: salary management for an HR manager, 10,000 employees,
             multiple countries, currently managed in Excel.
TASK         Analyse the brief. Separate explicit requirements from implied ones,
             identify risks, and list the decisions that must be made before building.
CONSTRAINTS  Analysis only: do not start the project or write code.
DONE WHEN    Requirements are traced to the brief, implied requirements are justified,
             and open questions are ready for me to answer.
```
**Result:** surfaced the two decisions that shaped the whole design:
*multi-country ⇒ currency normalization* and *salary changes ⇒ append-only history*.
Also: analytics is a first-class feature, not an add-on to CRUD.

### P2: Scope and architecture
```
ROLE         Software architect.
CONTEXT      My answers: Node + Next.js, PostgreSQL, 2–3 days, single-user login,
             no CSV import; pay-equity analytics deferred on your recommendation.
TASK         Propose stack, data model, API surface and a delivery plan.
CONSTRAINTS  Optimize for correctness and reviewability over feature count.
DONE WHEN    A one-page requirements doc (including exclusions and reasons) and an
             architecture doc with diagrams are ready to commit before any code.
```
**My decisions:** see the table in §4, Session 2.

### P3: Guided foundation
```
ROLE         Pair programmer.
TASK         Guide me step by step through the monorepo, Docker Postgres and Express
             scaffold, giving code I will type and run myself.
CONSTRAINTS  One step at a time; check my environment before assuming anything.
DONE WHEN    Each step runs on my machine and is committed separately.
```

### P4: Implementation in verified slices
```
ROLE         Implementer; I review.
CONTEXT      Agreed architecture; scaffold in place.
TASK         Build schema → domain logic → 10k seed → employees API → salary history
             → insights → auth → UI, one slice at a time.
CONSTRAINTS  Money in Decimal, never float. Analytics in SQL. No user input in SQL.
             Integration tests on a separate *_test database. Follow existing code style.
DONE WHEN    Per slice: tests + typecheck + lint pass, behaviour exercised on the 10k
             dataset (API) or in a real browser (UI), committed with a descriptive message.
```

### P5: Requirements audit
```
ROLE         QA lead.
TASK         Audit the delivered code against the brief and Requirement.md.
DONE WHEN    Every requirement maps to where it is met; gaps are fixed or explicitly deferred.
```
**Result:** found the job title filter missing from the UI (§5, #8); fixed and verified.

### P6: Release
```
ROLE         DevOps assistant.
TASK         Prepare deployment for Vercel (web), Render (API) and Neon (Postgres).
CONSTRAINTS  I create the accounts and handle every secret; never print credentials.
DONE WHEN    Config lives in the repo, production mode is tested locally first,
             and the live URL passes a smoke test.
```

---

## 4. Session log

### Session 1: Discovery
Explicit requirements (R1–R12) traced to the brief; implied requirements
(currency normalization, salary history, server-side pagination, analytics as
core); risks (SQLite on ephemeral hosting, non-deterministic tests); six
clarifying questions.

### Session 2: Decisions
| Question | Decision | Rationale |
|---|---|---|
| Stack | Node (Express) + Next.js | Matches the role applied for |
| Database | **PostgreSQL** over SQLite | Persists on free hosting; built-in `percentile_cont` for medians |
| Timeline | 2–3 days | Real constraint; scope kept tight |
| CSV import | **Excluded** | Needs validation and error-reporting UX to be safe; a weak import does harm |
| Pay-equity analytics | **Excluded** (AI recommendation, reasoning checked) | A raw gap without controlling for role, level and tenure misleads; needs legal review |
| Auth | Single-user login | One persona in the brief |
| Backend shape | Separate Express API (AI proposal, accepted) | Independently testable; matches "backend & UI" |

When my stack answer contained a typo ("node nads next"), the AI stated its
interpretation and asked for confirmation instead of assuming.

### Session 3: Documentation
Requirements and architecture drafted, reviewed against the brief, and committed as the first commits.

### Session 4: Foundation (hand-typed, AI-checked)
- The AI inspected the machine first (`node -v`, `docker -v`, `psql --version`) and avoided the local Postgres port.
- When I reported a step done, the AI **verified instead of trusting**: it ran the tests and found a
  `"workspace"` vs `"workspaces"` typo, a script-name typo, an uncommitted design doc,
  and missing files. Each fix went into its own commit.

### Session 5: Backend (AI-implemented, human-reviewed)
Verification went beyond "tests pass":
- inspected the generated migration and indexes in `psql`; proved the `CHECK` constraint rejects bad data
- sanity-checked seed realism with SQL (median pay by country)
- insights tests assert **hand-computed percentiles** (P25 of 30k…160k = 85k), so the SQL math itself is tested
- timed every endpoint on 10k employees (15–95 ms)
- proved integration tests never touch dev data, and added a guard that refuses to reset any DB not named `*_test`

### Session 6: Frontend (verified in a real browser)
- Next.js 16 shipped a notice that its APIs changed; the bundled docs were read before writing code.
- A scripted headless-browser journey (login → search → create → raise → duplicate email)
  with screenshots caught **two UX issues and one production bug** (§5).
- Chart colours were validated for contrast and colour-vision safety, not chosen by eye.

### Session 7: Audit and release
Requirements audit (P5), planning doc, deployment config, local production-mode test,
then live deployment with a smoke test. Secrets were entered by me only.

---

## 5. Defects in AI output: caught and corrected

| # | AI's first version | Corrected to | How it was caught |
|---|---|---|---|
| 1 | Docker DB on port 5433 | 5440 | `docker compose up` failed: another project's container held 5433. The AI had checked installed tools, not running containers. |
| 2 | `moduleResolution: "Node"` | `NodeNext` | `tsc` failed: TypeScript 7 removed the option. Model knowledge lagged the installed version. |
| 3 | Three per-dimension insights endpoints | One `breakdown?groupBy=` endpoint | Design review: HR's questions are combinations of dimensions. |
| 4 | Node's default 5 s keep-alive | 65 s | Browser E2E showed an intermittent 500; logs showed `ECONNRESET` on a reused proxy socket. Reproduced with idle gaps, fixed, re-verified. |
| 5 | INR as ₹2,400,000 | ₹24,00,000 (lakh grouping) | A unit test showed the code contradicted its own comment. |
| 6 | "Group by" dropdown labelled just "Country" | "Group by: Country" | Screenshot review: read as a duplicate filter. |
| 7 | Median chart in payroll order | Sorted by median | Screenshot review: unsorted bars are hard to compare. |
| 8 | Job title filter missing from the UI | Added to directory and insights | Requirements audit against Requirement.md (P5). |

**Investigated and confirmed correct (no change):**
- An unfamiliar dependency `cn` added by shadcn: verified on npm as published by shadcn (`shadcn-ui/cn`) before trusting it.
- An employee at exactly **0.0%** vs the peer median looked like a self-comparison bug;
  SQL showed they ranked 27th of 53, i.e. the median. Kept, and labelled "including this employee".

---

## 6. Assessment of AI use

**Highest leverage**
- *Discovery:* turning a short brief into implied requirements and decisions (currency, history) early, when they were cheap to act on.
- *Verification at scale:* hand-computed test oracles, timing on 10k rows, and scripted browser journeys found defects that unit tests alone would have missed (#4).

**Needed the most oversight**
- *Environment and version specifics:* ports, TypeScript 7, Next.js 16 APIs (#1, #2). Anything version-dependent was checked against the installed packages.
- *UX judgment:* layouts that compiled correctly but read poorly were only caught by looking at screenshots (#6, #7).

**What I'd keep doing**
- Give the AI a role, one bounded task and an explicit definition of done.
- Make it verify (run, measure, screenshot) rather than assert.
- Keep decisions, secrets and final review with the engineer.

---

## Appendix A: Original messages (verbatim)

Unedited, typos included, for transparency. Each maps to a structured prompt in §3.

| Maps to | Message |
|---|---|
| P1 | "act as a bussiness analyst read properly the plan requirement everything but dont start project" |
| P2 | "1.node nads next 2.postgres 3.2-3 days 4.leave it out 5.as u suggest 6.simple single login user" |
| P3 | "yes start just guide step by step give code also i will see and code manually" |
| P4 | "u can do this" · "you write the code leveter i will review the code" |
| P5 | "check the code is anything pending requirement after that change the aiprompt.md to a proffesional enginer prompt so interviewer will impress while seeing" |
| P6 | "vercel neon render good i think" |
| Docs | "can improve the prompt.md file interview should be impress" |
