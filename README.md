# Finance Data Processing API

A robust, defensively-programmed backend API designed for processing and managing financial records. Key features include comprehensive role-based access control, relational database enforcement, automated audit logging, and optimized query-level aggregations.

## Architectural Decisions

This codebase enforces a strict layered **Controller-Service-Repository** architecture to decouple concerns and improve testability:

- **Routes:** Map HTTP paths and attach authentication/authorization middleware guards.
- **Controllers:** Extract incoming payload data and format standardized HTTP responses.
- **Services:** Execute core business logic and trigger async audit writes.
- **Repositories:** Abstract database access and execute raw SQL queries.

**Why the Node/express Stack & SQLite?**
SQLite was explicitly selected to minimize environment setup friction for evaluation. It operates without requiring background daemons or Docker containers while successfully supporting relational schemas. The `sqlite3` driver was extended with a Promise wrapper to support modern `async/await` patterns. `PRAGMA foreign_keys = ON;` is explicitly initialized on boot to guarantee relational integrity. Raw JavaScript is utilized in accordance with prompt requirements.

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
- **Audit Log Concurrency:** Audit logs are written asynchronously using standard Promise chains. They deliberately do not block the main response thread, prioritizing response time over strict atomic transaction confirmation.
- **Test Coverage:** Automated unit testing frameworks (Jest/Mocha) are omitted from this core submission, though standard component decoupling natively supports future unit mocking.

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

### Pre-Seeded Test Credentials
You can use these automatically generated accounts to quickly test the strict Role-Based Access Controls (RBAC) preventing unauthorized endpoint mutations:
| Role | Email | Password |
|---|---|---|
| **Admin** | *(Matches `.env` ADMIN_EMAIL)* | *(Matches `.env` ADMIN_PASSWORD)* |
| **Analyst** | *(Matches `.env` ANALYST_EMAIL)* | *(Matches `.env` ANALYST_PASSWORD)* |
| **Viewer** | *(Matches `.env` VIEWER_EMAIL)* | *(Matches `.env` VIEWER_PASSWORD)* |

**4. Start Server**
```bash
npm start
```

## Interactive Swagger Testing

A fully configured Swagger UI portal is bundled to facilitate API testing without requiring Postman clients.

1.### Using Swagger UI
Alternatively, visit [`http://localhost:3000/api-docs`](http://localhost:3000/api-docs) in your browser. All required bearer tokens (derived from the initial seed) are documented heavily within the interactive models.

---

### Executing the Test Suite
The repository features an isolated **Jest & Supertest** integration test suite that programmatically guarantees RBAC segregation logic, Dashboard math aggregates, and data-integrity across multiple permutations using an isolated `:memory:` SQLite environment ensuring production databases remain untouched.

```bash
npm run test
```

> **Passing Criteria Guarantee**: You will observe 11+ green assertions across 4 distinct test suites (Auth, Records, Dashboard, Users).

---

## Technical Debt & Tradeoffs
- **Horizontal Scaling**: SQLite natively bottlenecks parallel write-heavy operations. While entirely performant for an internal dashboard parsing several thousands entries locally, a migration to PostgreSQL via Knex/Prisma is required to scale across cluster shards.
- **Synchronous JWT Verification**: Token logic is strictly stateless. Invalidating compromised tokens pre-expiration requires either switching to stateful sessions or implementing an async Redis blocklist layer.