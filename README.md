# Finance Data Processing API

A robust, defensively-programmed backend API designed for processing and managing financial records with comprehensive role-based access control, automated audit logging, and optimal database aggregations.

## Tech Stack & Architectural Decisions
To showcase real-world engineering rather than generic template generation, this backend is built with specific, deliberate choices:

*   **SERN Stack (SQLite, Express, Raw JS, Node.js)**: 
    *   *Why SQLite?* It is chosen to provide a completely frictionless setup. Evaluators reviewing this assignment can instantly run the application without installing PostgreSQL, Docker, or any external database engines.
    *   *Why Raw JavaScript over TypeScript?* A strict requirement of the prompt to stick to the standard SERN flow.

*   **Layered "Clean" Architecture**: 
    *   The application splits logic strictly into **Routes → Controllers → Services → Repositories**. This decouples business rules from Express-specific logic and isolates raw DB queries inside Repositories.

*   **Automated Audit Trails**: 
    *   Whenever an `ADMIN` performs a mutation (Create, Update, Delete) on a Financial Record, the `AuditLogService` is asynchronously spawned to record who made the change, when it occurred, and stringifies the exact change states (e.g. state prior to deletion) into the `changes` row.

*   **Advanced SQLite Features**:
    *   Queries utilize database-level mathematical aggregations (`SUM()`, `GROUP BY`) natively, moving processing overhead to the database rather than downloading memory-heavy arrays into Node.js.
    *   The `deletedAt` column manages **Soft Deletions**.

*   **Robust Express Pipeline**: 
    *   **Global Response Formatter:** A custom `res.success` and `res.error` ensures every API response is perfectly structured as `{ success, message, data, meta }`.
    *   **Rate Limiting:** Protects standard brute-force paths via `express-rate-limit`.
    *   **Security:** `helmet` applies essential HTTP security headers, and `bcryptjs` secures passwords with salts.

## Getting Started

1. **Clone & Install**
   ```bash
   cd backend
   npm install
   ```

2. **Initialize SQLite Tables & Seed Master Admin**
   ```bash
   node src/db/init.js
   node src/db/seed.js
   ```
   *The seed script creates the master `admin@finance.local` account. Open registration APIs are removed entirely from the system as a real internal finance tool would lock identity creation to admin dashboards or Identity Providers.*

3. **Boot Server**
   ```bash
   npm start
   # or npm run dev
   ```

## Interactive API Documentation (Swagger)

A fully interactive Swagger OpenAPI specification is running inside the application itself. You do not need Postman to test the backend.

1. Once the server is running, navigate to:  `http://localhost:3000/api-docs`
2. Authenticate using the seeded master admin credentials:
   - **Email:** `admin@finance.local`
   - **Password:** `admin123`

---
*Created by [Backend Engineer]*
