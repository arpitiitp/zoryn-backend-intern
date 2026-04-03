# Finance Data Processing API

A robust, defensively-programmed backend API designed for processing and managing financial records. Key features include comprehensive role-based access control, relational database enforcement, automated audit logging, and optimized query-level aggregations.

---

##  Test Credentials (Quick Reference)

> Start here. Use these to log in via `POST /api/auth/login` and paste the returned `token` into Swagger's **Authorize** lock.

| Role | Email | Password | Active | Permissions |
|---|---|---|---|---|
| `ADMIN` | `admin@zorvyn.local` | `admin123` | ✅ | Full access — CRUD records, manage users, view analytics |
| `ANALYST` | `analyst@zorvyn.local` | `analyst123` | ✅ | Read-only — view records & dashboard only |
| `VIEWER` | `viewer@zorvyn.local` | `viewer123` | ✅ | Read-only — view records & dashboard only |
| `VIEWER` | `inactive@zorvyn.local` | `inactive123` | ❌ | **Edge case** — login returns `403 Forbidden` |

---

## Architectural Decisions

This codebase enforces a strict layered **Controller-Service-Repository** architecture to decouple concerns and improve testability:

- **Routes:** Map HTTP paths and attach authentication/authorization middleware guards.
- **Controllers:** Extract incoming payload data and format standardized HTTP responses.
- **Services:** Execute core business logic and trigger async audit writes.
- **Repositories:** Abstract database access and execute raw SQL queries.

**Why the Node/express Stack & SQLite?**
SQLite was explicitly selected to minimize environment setup friction for evaluation. It operates without requiring background daemons or Docker containers while successfully supporting relational schemas. The `sqlite3` driver was extended with a Promise wrapper to support modern `async/await` patterns. `PRAGMA foreign_keys = ON;` is explicitly initialized on boot to guarantee relational integrity. Raw JavaScript is utilized in accordance with prompt requirements.

### Core Database Schemas

To visualize the underlying data structures mapped into SQLite during `.seed()` injections, please refer to the relational definitions below:

```sql
CREATE TABLE users (
    id TEXT PRIMARY KEY,
    email TEXT UNIQUE NOT NULL,
    passwordHash TEXT NOT NULL,
    role TEXT NOT NULL CHECK(role IN ('VIEWER', 'ANALYST', 'ADMIN')),
    isActive INTEGER DEFAULT 1,
    createdAt TEXT,
    updatedAt TEXT
);

CREATE TABLE financial_records (
    id TEXT PRIMARY KEY,
    amount REAL NOT NULL,
    type TEXT NOT NULL CHECK(type IN ('INCOME', 'EXPENSE')),
    category TEXT NOT NULL,
    date TEXT NOT NULL,
    notes TEXT,
    createdBy TEXT NOT NULL,
    createdAt TEXT,
    updatedAt TEXT,
    deletedAt TEXT,
    deletedBy TEXT,
    FOREIGN KEY (createdBy) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE audit_logs (
    id TEXT PRIMARY KEY,
    entityType TEXT NOT NULL,
    entityId TEXT NOT NULL,
    action TEXT NOT NULL CHECK(action IN ('CREATE', 'UPDATE', 'DELETE')),
    performedBy TEXT NOT NULL,
    timestamp TEXT NOT NULL,
    changes TEXT,
    FOREIGN KEY (performedBy) REFERENCES users(id) ON DELETE SET NULL
);
```

## Security & Validations

- **Authentication:** `bcryptjs` is utilized to hash passwords with `10 salt rounds`. Sessions are managed via stateless JWT tokens configured with a `24h` expiration. If a token is spoofed, expired, or missing, the middleware immediately rejects the request with a `401 Unauthorized`.
- **Request Validation:** Incoming payloads are strictly validated using `Joi` schemas. It enforces constraints such as validating proper ISO-8601 date formats, positive numerical values for amounts, and enum validation for roles (`ADMIN`, `ANALYST`, `VIEWER`).
- **Defensive HTTP Configuration:** `helmet` masks common Express HTTP headers (like `X-Powered-By`), and `express-rate-limit` throttles request floods.
- **Strict Environment Validations:** Server and seeder scripts actively validate the presence of required `.env` variables (such as `JWT_SECRET`). Missing variables intentionally throw a `Fatal Error` and crash the process, avoiding insecure fallbacks.
- **Automated Audit Logs:** Administrative mutations (Update, Delete) spawn an asynchronous operation to the `AuditLogService` capturing the `user.id`, timestamp, and a JSON differential of the changes made.
- **Soft Deletions:** DELETE operations flag a `deletedAt` metadata timestamp rather than dropping the row (`UPDATE ... SET deletedAt = NOW`). Subsequent repository queries default to `WHERE deletedAt IS NULL`.

## Assumptions & Tradeoffs

- **RBAC Limitations:** Only Admins can create, update, or delete users and financial records. Analysts and Viewers are strictly bound to read-only operations.
- **Closed Registration:** Open user registration is intentionally disabled. User management must be handled by existing Admins via the API. The initial Admin is generated via a direct CLI seed script.
- **Audit Log Concurrency:** Audit logs are written asynchronously using standard Promise chains. They deliberately do not block the main response thread, prioritizing response time over strict atomic transaction confirmation. Any failures encountered during the memory offload natively pipe to standard `console.error` reporting.

## Environment Variables

| Variable        | Description                        | Default              |
|-----------------|------------------------------------|----------------------|
| PORT            | Server execution port              | 3000                 |
| JWT_SECRET      | Secret key for signing tokens      | *(required)*         |
| ADMIN_EMAIL     | Seed admin email                   | admin@zorvyn.local   |
| ADMIN_PASSWORD  | Seed admin password                | *(required)*         |
| ANALYST_EMAIL   | Seed analyst test email            | analyst@zorvyn.local |
| ANALYST_PASSWORD| Seed analyst test password         | *(required)*         |
| VIEWER_EMAIL    | Seed viewer test email             | viewer@zorvyn.local  |
| VIEWER_PASSWORD | Seed viewer test password          | *(required)*         |
| DB_PATH         | Path to SQLite file                | ./src/db/finance.sqlite |

## API Endpoints Overview

###  Authentication & Users
- `POST /api/auth/login` - Validates credentials and returns JWT payload.
- `GET /api/users` - *(Admin Only)* Fetches users. Supports query filters: `?role=ANALYST&isActive=true`.
- `POST /api/users` - *(Admin Only)* Creates a new platform user.
- `PUT /api/users/:id` - *(Admin Only)* Edits the role of an existing user.
- `PATCH /api/users/:id/status` - *(Admin Only)* Toggles active/inactive boolean states.

###  Financial Records
- `GET /api/records` - Retrieves records with pagination (`page`, `limit`). Accepts query filters: `?type=INCOME`, `?category=Salary`, `?from=YYYY-MM-DD`, `?to=YYYY-MM-DD`.
- `GET /api/records/:id` - Fetches single record by UUID.
- `POST /api/records` - *(Admin Only)* Creates a financial record. 
- `PUT /api/records/:id` - *(Admin Only)* Updates a record and triggers audit logs.
- `DELETE /api/records/:id` - *(Admin Only)* Soft-deletes a record.
- `GET /api/records/:id/audit-logs` - Retrieves historical modification logs for the specific resource.

###  Dashboard Analytics
Queries leverage native SQLite mathematical aggregations (`SUM()`, `GROUP BY`) to offload memory overhead from the Node application.
- `GET /api/dashboard/summary` - Returns grouped aggregates: `totalIncome`, `totalExpenses`, and category breakdowns.
- `GET /api/dashboard/trends` - Assesses cashflow trends. Supports granularity via `?period=monthly` or `?period=weekly` using SQLite `strftime` functions.

## Standardized Responses

All outputs utilize a global response interceptor. 

**Successful Request (200 OK):**
```json
{
  "success": true,
  "message": "Records retrieved successfully",
  "data": [
      { "id": "uuid", "amount": 1000 }
  ],
  "meta": {
      "total": 1,
      "page": 1,
      "limit": 10,
      "totalPages": 1
  }
}
```

**Client Error (401 Unauthorized / Expired Token):**
```json
{
  "success": false,
  "message": "Access token is expired or invalid",
  "error": "Error specifics if in DEV mode"
}
```

---

## Getting Started

**1. Clone the repository**
```bash
git clone https://github.com/arpitiitp/zoryn-backend-intern.git
cd backend
npm install
```

**2. Setup Configuration**
Copy the template environment file:
```bash
cp .env.example .env
```

**3. Initialize Schema & Seed**
Run the table initialization and seeder scripts. The seeder safely injects your Admin credentials from `.env`, and automatically seeds test `ANALYST` and `VIEWER` profiles for easy evaluation.
```bash
node src/db/init.js
node src/db/seed.js
```

##  Pre-Seeded Test Data

After running `node src/db/seed.js`, the database is populated with **57 active financial records**, **2 soft-deleted records**, and **2 audit log entries** designed to exercise every major feature and edge case of the API.

> All dates below are **relative to the day you run the seed**. The table shows the approximate real date range assuming today is early April 2026.

### RBAC Credentials & Permission Matrix

> Full login credentials are at the **[top of this README](#-test-credentials-quick-reference)**. The matrix below shows exactly what each role can and cannot do.

#### RBAC Permission Matrix

| Action | ADMIN | ANALYST | VIEWER |
|---|---|---|---|
| Login | ✅ | ✅ | ✅ |
| View all records (`GET /api/records`) | ✅ | ✅ | ✅ |
| View single record (`GET /api/records/:id`) | ✅ | ✅ | ✅ |
| View audit logs (`GET /api/records/:id/audit-logs`) | ✅ | ✅ | ✅ |
| View dashboard (`GET /api/dashboard/*`) | ✅ | ✅ | ✅ |
| Create record (`POST /api/records`) | ✅ | ❌ 403 | ❌ 403 |
| Update record (`PUT /api/records/:id`) | ✅ | ❌ 403 | ❌ 403 |
| Delete record (`DELETE /api/records/:id`) | ✅ | ❌ 403 | ❌ 403 |
| List users (`GET /api/users`) | ✅ | ❌ 403 | ❌ 403 |
| Create user (`POST /api/users`) | ✅ | ❌ 403 | ❌ 403 |
| Update user role (`PUT /api/users/:id`) | ✅ | ❌ 403 | ❌ 403 |
| Toggle user status (`PATCH /api/users/:id/status`) | ✅ | ❌ 403 | ❌ 403 |

---

###  Financial Records — Date Spread (57 active)

Records are spread across **13+ months** to ensure all trend and filter queries return meaningful data.

| Approx. Date | # Records | Types Seeded | Categories Covered | Notes |
|---|---|---|---|---|
| ~Mar 2025 *(13 months ago)* | 2 | INCOME, EXPENSE | Salary, Rent | Boundary for monthly trends |
| ~Apr 2025 *(12 months ago)* | 4 | INCOME, EXPENSE | Salary, Freelance, Rent, Food | Start of full 12-month window |
| ~May 2025 *(11 months ago)* | 4 | INCOME, EXPENSE | Salary, Bonus, Utilities, Transport | — |
| ~Jun 2025 *(10 months ago)* | 4 | INCOME, EXPENSE | Salary, Investment, Rent, Healthcare | Large investment amount seeded |
| ~Aug 2025 *(8 months ago)* | 5 | INCOME, EXPENSE | Salary, Freelance, Rent, Entertainment, Education | — |
| ~Oct 2025 *(6 months ago)* | 4 | INCOME, EXPENSE | Salary, Investment, Rent, Food | Very large amount (500,000) seeded |
| ~Jan 2026 *(3 months ago)* | 5 | INCOME, EXPENSE | Salary, Freelance, Rent, Transport, Healthcare | — |
| ~Feb 2026 *(2 months ago)* | 7 | INCOME, EXPENSE | Salary, Freelance, Bonus, Rent, Utilities, Food, Entertainment | **7 records in one month** — tests aggregation |
| ~Mar 2026 *(last 30 days)* | 12 | INCOME, EXPENSE | All 9 categories | **>10 records** — forces pagination page 2 |
| ~Apr 1 *(3 days ago)* | 3 | INCOME, EXPENSE | Salary, Freelance, Rent | **Same-day records** — tests tie-breaking |
| ~Apr 2 *(yesterday)* | 2 | INCOME, EXPENSE | Freelance, Food | Most recent data |
| *Weekly spread (5 weeks)* | 5 | INCOME, EXPENSE | Other | Each in a different ISO week — tests `?period=weekly` |

---

###  Boundary & Edge Case Records

| Amount | Type | Category | Purpose |
|---|---|---|---|
| `0.01` | INCOME | Other | **Minimum valid amount** — Joi `positive()` boundary |
| `9,999,999` | INCOME | Investment | **Very large amount** — arithmetic overflow check |
| `9,999.99` | INCOME | Bonus | **Decimal precision** — floating point accuracy |
| `500,000` | INCOME | Investment | Large lump sum — affects dashboard totals noticeably |
| `null` notes | Various | Various | Multiple records without notes — optional field handling |

---

###  Soft-Deleted Records (2 — invisible to API)

These records exist in the DB with `deletedAt` already set. They **must NOT appear** in any of the following responses. Use them to verify that soft-delete filtering works:

| Check | Endpoint |
|---|---|
| Not in record list | `GET /api/records` |
| Not returned by ID | `GET /api/records/:id` |
| Not counted in totals | `GET /api/dashboard/summary` |
| Not in trends | `GET /api/dashboard/trends` |

---

###  Audit Logs (2 pre-seeded entries)

Two audit log entries are pre-seeded against the first financial record inserted. You can fetch them immediately without needing to perform a manual `PUT` or `DELETE` first:

```
GET /api/records/:id/audit-logs
```

The logs contain a `CREATE` entry and an `UPDATE` entry with a `changes` diff payload, simulating a real edit history.

---

###  Suggested Filter Test Queries

Use these queries in Swagger or Postman to validate filtering and pagination:

```
# Filter by type
GET /api/records?type=INCOME
GET /api/records?type=EXPENSE

# Filter by category
GET /api/records?category=Salary
GET /api/records?category=Investment

# Filter by date range (12-month window)
GET /api/records?from=2025-04-01&to=2026-04-01

# Filter by date range (last 30 days)
GET /api/records?from=2026-03-04&to=2026-04-03

# Combine filters
GET /api/records?type=INCOME&category=Freelance

# Pagination — page 2 (last 30 days has >10 records)
GET /api/records?page=2&limit=10

# Trends — monthly (covers 13 months of data)
GET /api/dashboard/trends?period=monthly

# Trends — weekly (covers 5 distinct ISO weeks)
GET /api/dashboard/trends?period=weekly
```

---

## Interactive Swagger Testing

A fully configured Swagger UI portal is bundled to facilitate API testing without requiring Postman clients. It natively supports JWT authorization.

1. Start the server (`npm start`)
2. Navigate to **[http://localhost:3000/api-docs](http://localhost:3000/api-docs)**
3. Execute `POST /api/auth/login` using the pre-seeded Admin or Viewer credentials outlined above.
4. Copy the returned `token` string.
5. Click the **Authorize** lock icon at the top of the Swagger page and paste your token. All subsequent requests will now route with verified JWT contexts.

---

## Testing Verification

I've included a comprehensive integration test suite utilizing **Jest** and **Supertest** to explicitly verify the core endpoints, JWT mappings, logic hierarchies, and role-based access limits.

```bash
# Execute the testing suite
npm run test
```

To prevent the actual development database from getting unexpectedly overwritten or corrupted during tests, the suite is strictly configured to spin up an isolated, in-memory SQLite database (`:memory:`) wiping cache on each tear-down.

Currently, there are **20 individual tests** verifying different permutations split across four core domains:
- **`auth.test.js`**: Validates the login mechanics, specifically ensuring bad JSON structures and invalid emails correctly fallback mapped errors without crashing the server.
- **`users.test.js`**: Asserts that only Admins can create or fetch users, and strictly verifies Viewers are bounced back with a `403 Forbidden`. Also traps duplicate email attempts.
- **`records.test.js`**: Confirms the overarching CRUD capabilities, and evaluates isolated `Joi` validation tests (such as throwing `400` whenever an invoice tries to push a negative `amount`).
- **`dashboard.test.js`**: Triggers deterministic testing blocks guaranteeing that SQLite's mathematical aggregations line up exactly with mocked numbers.

---

## Technical Debt & Tradeoffs
- **Horizontal Scaling**: SQLite natively bottlenecks parallel write-heavy operations. While entirely performant for an internal dashboard parsing several thousands entries locally, a migration to PostgreSQL via Knex/Prisma is required to scale across cluster shards.
- **Synchronous JWT Verification**: Token logic is strictly stateless. Invalidating compromised tokens pre-expiration requires either switching to stateful sessions or implementing an async Redis blocklist layer.
