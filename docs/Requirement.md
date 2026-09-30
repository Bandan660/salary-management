# ACME Salary Management — Requirements

## Goal
Replace ACME's Excel-based salary tracking with a web application that lets the
HR Manager manage salary data for ~10,000 employees across multiple countries,
and answer "how do we pay people?" questions in seconds instead of hours.

## Persona
**HR Manager** (single user). Comfortable with spreadsheets, not technical.
Needs to find employees quickly, keep salary data correct, and answer
leadership questions about pay.

## Key questions the HR Manager must be able to answer
- How many people do we employ, and what is our total payroll — by country and department?
- What is the min / median / average / max salary for a given job title and level?
- How wide is the pay spread within a role (25th–75th percentile)?
- What is this employee's current salary, and how has it changed over time?

## In scope
1. **Login** — single HR account.
2. **Employee directory** — search (name / employee code), filter (country,
   department, job title, status), sort, server-side pagination.
3. **Employee management** — create, view, edit, deactivate.
   Fields: employee code, name, email, country, department, job title, level,
   hire date, status.
4. **Salary records** — base salary stored in local currency with an effective
   date. Changes append a new record (never overwrite) → full salary history.
5. **Insights dashboard** — all figures normalized to USD via a fixed
   exchange-rate table:
   - headcount and total payroll, overall / by country / by department
   - min, median, average, max by job title and level
   - P25–P75 spread within a role
6. **Seed script** — 10,000 realistic employees, deterministic (fixed random seed).

## Deliberately out of scope (and why)
| Excluded | Reasoning |
|---|---|
| Payroll, tax, payslips | A separate, regulated product. This tool *manages and analyzes* salary data. |
| Pay-equity / gender-gap analytics | A naive gap is misleading unless controlled for role, level and tenure; also sensitive data needing legal/privacy review. First candidate for v2. |
| Excel / CSV import | Needs robust validation and error-reporting UX. Data is loaded via seed script for this version. |
| Multiple users, roles, approval workflows | Only one persona is defined. |
| Live exchange rates | Fixed rates keep reports reproducible and tests deterministic. |
| Bonuses, equity, benefits | Keeps the model focused on base salary; easy to extend later. |

## Non-functional requirements
- List and dashboard API responses < 300 ms at 10,000 employees.
- All pagination, filtering and aggregation happens in the database, not the browser.
- Core domain logic (currency conversion, statistics, validation) covered by fast, deterministic unit tests.
- Deployed and publicly accessible.

## Success criteria
The HR Manager can log in, find any employee in seconds, update a salary with
history preserved, and answer each "key question" above from the dashboard
without exporting to Excel.
