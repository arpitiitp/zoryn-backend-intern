# Finance Data Processing Backend

Hi there! This is my submission for the Finance Dashboard backend. I've designed this API to go beyond basic boilerplate CRUD operations by heavily focusing on structural architecture, built-in audit trails, and concrete safety verifications.

Here's a breakdown of how the system is put together and why I evaluated the engineering decisions I did.

## Why This Specific Tech Stack? 

When building backend assignments, it's very tempting to over-engineer using PostgreSQL, Redis, or heavy Docker containers. However, I deliberately chose standard **SQLite**. My primary goal was to make this codebase as completely frictionless as possible for you to evaluate. With SQLite, you don't need to configure a local database server, mess with ports, or debug connection strings. You just run the code, and the internal `.sqlite` file autonomously builds itself. 

It handles relational foreign keys perfectly for our needs, and I've stuck with raw Node.js/Express to keep complexity overhead at zero.


## Internal Architecture

Rather than dumping query strings directly inside the Express routes, this entire codebase rigidly enforces a layered **Controller-Service-Repository** architecture. 

- **Routes:** Their only job is mapping HTTP paths and attaching middleware guards.
- **Controllers:** They extract incoming data from the request, pass it down, and format the output.
- **Services:** This is where the core business logic, asynchronous logging, and deeper verifications happen.
- **Repositories:** The absolute only place where raw SQLite queries and database mutations are executed.


## Safety Checks & Formatting standardization

I wanted the backend to behave like a resilient production environment.

- **Global Response Formatter:** Every single API response intercepts through a central middleware guaranteeing the exact same shape: `{ success, message, data, meta }`. You'll never get a rogue array from one endpoint and an object from another.
- **Defensive Security:** I injected `helmet` to mask common Express HTTP headers and `express-rate-limit` to throttle continuous spam attacks. Passwords use `bcryptjs` with standard salt rounds.
- **Strict Environment Variables:** All secrets and initial administrator credentials are systematically kept out of the code. If `.env` is missing critical values upon boot, the server and seeder scripts intentionally crash with a `Fatal Error` rather than silently failing or falling back to insecure defaults.
- **Automated Audit Logs:** When any Admin updates or deletes a financial record, an asynchronous Audit Log is fired in the background. It stores exactly *who* performed the action and serializes the exact JSON payload difference to protect accountability.
- **Soft Deletions:** Deleting a record doesn't actually `DROP` the row; it safely flags a `deletedAt` metadata timestamp, protecting critical finance data from accidental permanent loss.


## Core API Endpoints Overview

Here is the breakdown of the exact routes exposed by the system:

###  Authentication & Users
- `POST /api/auth/login` - Verifies your credentials and issues a signed, time-limited JWT Token.
- `GET /api/users` - (Admins Only) Fetches the protected array of active platform users.
- `PUT /api/users/:id/status` - (Admins Only) Toggles whether an employee account is currently active or disabled.

###  Financial Records
*Note: Based on whether your decoded token says you are a Viewer, Analyst, or Admin, the route middleware will dynamically block unauthorized attempts to modify records.*
- `GET /api/records` - Retrieves financial records. Returns metadata for the frontend (`total`, `page`, `totalPages`) and supports dynamic queries (`?type=INCOME&category=Freelancing`).
- `GET /api/records/:id` - Fetches the details of a single record.
- `POST /api/records` - Validates the payload schemas via `Joi` specifically, and inserts a new financial event into the repository.
- `PUT /api/records/:id` - Updates an existing record (safely spinning off an Audit Log event behind the scenes).
- `DELETE /api/records/:id` - Soft-deletes the target record by updating its visibility flag.
- `GET /api/records/:id/audit-logs` - Pulls the raw historical paper trail to see who mutated this specific row and when.

###  Dashboard Analytics
Instead of extracting 10,000 records from the database and looping an array natively in JavaScript to add up totals (which quickly destroys server memory), I leveraged raw SQLite mathematical queries to compute aggregations (`SUM()`, `GROUP BY`) natively at the disk level.
- `GET /api/dashboard/summary` - Calculates the holistic `totalIncome`, `totalExpenses`, `netBalance`, and orders totals dynamically by category.
- `GET /api/dashboard/trends` - Assesses cashflow trends grouped purely by the monthly timestamp sequence.

---

##  Getting Started (How to Run Locally)

Since this project strictly utilizes SQLite, there is no bulky Docker or PostgreSQL setup required. Testing this assignment locally on your machine will only take about 60 seconds!

**1. Clone the repository and enter the backend directory**
Start by cloning the code from GitHub to your local machine:
```bash
git clone https://github.com/arpitiitp/zoryn-backend-intern.git
cd zoryn-backend-intern/backend
npm install
```

**2. Setup your Environment Variables**
All sensitive data and logic paths are strictly managed via configurations instead of hardcoded strings. I've provided an example environment config to get you started smoothly.
Copy the example file to correctly establish your live `.env`:
```bash
# On Linux/Mac:
cp .env.example .env

# On Windows (PowerShell):
Copy-Item .env.example .env
```
*(Optionally, you can open the newly generated `.env` file to customize the `ADMIN_EMAIL` or `ADMIN_PASSWORD`, but the defaults will work just fine for testing).*

**3. Initializing the Database & Seeding**
Next, we need to artificially inject the database tables and spawn the master administrator account. Run these two commands sequentially:
```bash
node src/db/init.js
node src/db/seed.js
```
*(The seeder script safely extracts your credentials right out of the `.env` file to generate the main operator. For systemic security, open/generic user registration endpoints do not actually exist in this architecture!)*

**4. Start the Application**
Once the database is primed and packages are attached, boot the live server:
```bash
npm start
```
You should see a console confirmation stating the server is successfully listening.

---

##  Testing the API interactively (No Postman Required!)

Instead of forcing you to attach bulky Postman collections, **I've natively integrated an interactive Swagger UI directly into the application.** This provides an excellent GUI portal to effortlessly verify every endpoint.

Here is the easiest way to click through the backend features:

1. With the server running, open your standard web browser and visit: **[http://localhost:3000/api-docs](http://localhost:3000/api-docs)** 
   *(This launches the Swagger GUI control center)*
   
2. Scroll to the **Authentication Section** and click on the green `POST /api/auth/login` tab.

3. Click the **"Try it out"** button on the right side, and edit the request payload to match the credentials stored in your `.env`:
   ```json
   {
     "email": "admin@zorvyn.local",
     "password": "admin123"
   }
   ```
   
4. Hit **Execute**! Look closely at the resulting JSON Response box below it—highlight and copy the long string text found completely inside the `"token"` variable.

5. Finally, scroll back up to the very top of the page and click the green **`Authorize`** padlock button. Paste your token straight into the `BearerAuth` box and click **Authorize**.

 **You are now digitally authenticated as an Admin.** You can now freely interact with any endpoint on the system (like creating Records natively or fetching high-speed SQLite Dashboard summaries) by simply clicking their respective **"Try it out"** testing buttons!


----- Designed and Developed By Arpit Singh -------