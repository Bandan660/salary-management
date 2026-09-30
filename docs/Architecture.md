# Architecture & Design Notes

## Overview

```mermaid
flowchart LR
  U[HR Manager<br/>Browser] --> W[Next.js Web App<br/>apps/web]
  W -->|REST / JSON<br/>httpOnly JWT cookie| A[Express API<br/>apps/api]
  A -->|Prisma + raw SQL| D[(PostgreSQL)]
```

**Monorepo** (npm workspaces):
```
apps/api   → Express + TypeScript + Prisma
apps/web   → Next.js (App Router) + shadcn/ui
docs/      → requirements, architecture, AI prompt log
```

## Why a separate backend (not Next.js API routes)?
Clear separation between domain/API and UI, independently testable, and matches
the brief's "backend & UI" framing. Cost: two deployables — acceptable.

## Data model

```mermaid
erDiagram
  Employee ||--o{ SalaryRecord : has
  ExchangeRate ||--o{ SalaryRecord : "converts (by currency)"
  Employee {
    uuid id PK
    string employeeCode UK
    string firstName
    string lastName
    string email UK
    string country "ISO-3166 alpha-2"
    string department
    string jobTitle
    string level "L1..L6"
    date hireDate
    enum status "ACTIVE | INACTIVE"
  }
  SalaryRecord {
    uuid id PK
    uuid employeeId FK
    decimal amount "12,2"
    string currency "ISO-4217"
    date effectiveDate
    string reason
  }
  ExchangeRate {
    string currency PK
    decimal rateToUsd "18,8"
    date asOf
  }
```

### Key decisions
| Decision | Reasoning |
|---|---|
| Salary as **append-only history** | HR must answer "when did X last get a raise?"; overwriting loses data. Current salary = latest record with `effectiveDate <= today`. |
| Store **local currency**, convert at query time | Source of truth stays as HR entered it; USD is a derived view. |
| **Fixed exchange-rate table** | Reproducible reports, deterministic tests. Rates can be updated as data, not code. |
| `Decimal` for money, never float | Avoids rounding errors in totals. |
| **Analytics in SQL** (`percentile_cont`, `GROUP BY`) | 10k rows aggregated in the DB in ms; never ship all rows to the browser. |
| Soft delete (`status = INACTIVE`) | Salary history is an audit trail; hard deletes lose it. |

### Indexes
- `Employee(country)`, `Employee(department)`, `Employee(jobTitle)`, `Employee(status)`
- `SalaryRecord(employeeId, effectiveDate DESC)` — fast "current salary" lookup

## API (v1)
| Method | Path | Purpose |
|---|---|---|
| POST | `/api/auth/login` · `/api/auth/logout` | Single-user session |
| GET | `/api/auth/me` | Session check |
| GET | `/api/employees?search=&country=&department=&page=&pageSize=&sort=` | Paginated directory |
| POST | `/api/employees` | Create (with initial salary) |
| GET / PATCH | `/api/employees/:id` | View / edit |
| POST | `/api/employees/:id/deactivate` | Soft delete |
| GET / POST | `/api/employees/:id/salaries` | History / add salary change |
| GET | `/api/insights/summary` | Headcount, total payroll (USD) |
| GET | `/api/insights/by-country` · `/by-department` | Breakdowns |
| GET | `/api/insights/by-role?jobTitle=&level=` | Min/median/avg/max, P25–P75 |
| GET | `/api/meta/filters` | Distinct countries/departments/titles for dropdowns |

## Auth
Single HR user. Credentials from env (`ADMIN_EMAIL`, `ADMIN_PASSWORD_HASH` — bcrypt).
JWT stored in an httpOnly, SameSite cookie. Documented production gap: no user
management, no MFA.

## Testing strategy
- **Unit (Vitest):** currency conversion, statistics helpers, input validation (zod schemas).
- **API (Supertest):** key endpoints against a test database with small hand-written fixtures.
- Seed data (10k) is for demo/perf only — never used in assertions.
