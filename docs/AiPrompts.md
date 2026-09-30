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
| Build | Pair programmer: suggest code step by step | **Type every line myself**, read and understand it, adapt it |
| Quality | Reviewer: review diffs, suggest test cases | Decide what to fix, run tests |

### Guardrails I set
1. **No big-bang generation.** I asked for step-by-step guidance and typed the
   code myself so I understand and can defend every line.
2. **Decisions stay with me.** The AI proposes options and I choose. Every
   scope decision is recorded with reasoning in `REQUIREMENTS.md`.
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
data model directly (see `ARCHITECTURE.md`).

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

**Output:** Drafts of `REQUIREMENTS.md`, `ARCHITECTURE.md` (Mermaid diagrams,
ER model, API table) and this log.

**My review:** Read each draft against the brief to confirm the scope matched
what I'd decided, then committed docs as the first commits.

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

| # | AI suggested | I did instead | Reason |
|---|---|---|---|
| 1 | | | |

## 4. Where AI helped most / least
*(Fill in at the end of the project.)*
- **Most:** 
- **Least / needed most correction:** 

## 5. Takeaways
*(Fill in at the end: what I'd do differently in how I use AI next time.)*
