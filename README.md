# EdVyro Full Stack Development — Task 04: Secure Application Integration

A full-stack, secure, production-grade Responsive Internship Board integrating a modern React 19 frontend with a hardened Node.js, Express, and SQLite REST API.

---

## Architecture Overview

```
├── data/
│   └── edvyro.db               # SQLite database file (auto-initialized & seeded)
├── src/
│   ├── server/
│   │   ├── app.ts              # Express app with Helmet, CORS, body limits & rate limiting
│   │   └── db.ts               # SQLite client, schemas & parameterized SQL queries
│   ├── types/
│   │   └── index.ts            # TypeScript interfaces for Internships & Applications
│   ├── App.tsx                 # Responsive Internship Board & Application Form UI
│   ├── main.tsx                # React root entry point
│   └── index.css               # Tailwind CSS v4 styling
├── tests/
│   └── integration.test.ts     # Automated integration & security test suite
├── server.ts                   # Full-stack production server entry point
├── vite.config.ts              # Vite configuration with embedded Express API plugin
├── SECURITY_CHECKLIST.md       # Comprehensive security documentation & verification
└── TEST_REPORT.md              # Automated test execution results
```

---

## Key Features & Implementations

### 1. Frontend & API Integration
* **Real Backend API**: Fetches internship records dynamically from `GET /api/internships` using native `fetch()` without mock data replacement.
* **Complete UI State Machine**:
  * **Loading State**: Responsive animated skeleton cards and indicators.
  * **Success State**: Modern grid of verified internship cards with company logos, stipend badges, deadline trackers, and detail view.
  * **Empty State**: Friendly filter reset view when no openings match search criteria.
  * **Error State**: Informative error banner with an interactive **"Retry Loading"** button.
* **Search & Filters**: Instant keyword search, category filter (Software Engineering, Product Design, Data Science, DevOps, Cybersecurity, Marketing), and work mode (Remote, Hybrid, On-site).

### 2. Application Form & Dual Validation
* **Apply for Internship**: Modal form capturing full name, email address, and application statement.
* **In-Flight Request Protection**: Disables the submit button, displays an active spinner, and prevents double-clicking while an HTTP request is in flight.
* **Dual-Tier Validation**:
  * **Browser Validation**: Real-time feedback checking field presence, email regex format, and message length constraints.
  * **Server-Side Validation**: Express independently re-validates all incoming payloads before database persistence (400 Bad Request on invalid data).
* **Duplicate Submission Prevention**: Rejects duplicate applications for the same internship by the same email (409 Conflict).
* **SQLite Persistence**: Stores valid submissions in the `applications` table and reflects them in the "My Applications" drawer.

### 3. Security Hardening
* **Helmet Security Headers**: Enforces `X-Content-Type-Options: nosniff`, `Strict-Transport-Security`, `X-Frame-Options: SAMEORIGIN`, `X-Download-Options: noopen`, and removes fingerprinting headers.
* **Rate Limiting**: Uses `express-rate-limit` with 150 requests/15m on general routes and strict 15 submissions/15m on `POST /api/applications`.
* **Parameterized SQL Queries**: All SQLite interactions use parameterized arguments (`args: [ ... ]`), eliminating SQL injection vulnerabilities.
* **Strict Payload Size Limits**: `express.json({ limit: '10kb' })` prevents memory exhaustion and large payload DoS attacks.
* **Restrictive CORS**: Restricts origins and allowed HTTP methods.
* **Zero Secret Exposure**: Safe configuration without hardcoded credentials.

---

## API Endpoints Reference

| Method | Endpoint | Description | Rate Limit |
|---|---|---|---|
| `GET` | `/api/health` | Verifies server and SQLite database connection | 150 / 15 min |
| `GET` | `/api/internships` | Returns list of internships (supports `query`, `category`, `type`) | 150 / 15 min |
| `GET` | `/api/internships/:id` | Returns single internship details | 150 / 15 min |
| `POST` | `/api/applications` | Validates, prevents duplicates, saves application | 15 / 15 min |
| `GET` | `/api/applications` | Returns submitted applications (supports `email` filter) | 150 / 15 min |

---

## Environment Variables

Copy `.env.example` to `.env` if custom configuration is desired:

```bash
# Optional: Allowed CORS origins separated by commas
ALLOWED_ORIGINS="http://localhost:3000,http://127.0.0.1:3000"

# Optional: Server port (defaults to 3000)
PORT=3000
```

---

## Local Setup & Execution Instructions

### Prerequisites
* Node.js (v18+ recommended) or Bun
* npm or bun package manager

### 1. Install Dependencies
```bash
npm install
```

### 2. Start the Development Server
Runs Vite with integrated Express API middleware on port 3000:
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) in your browser.

### 3. Run the Automated Test Suite
Executes all 13 end-to-end integration and security tests:
```bash
npm test
```

### 4. Build and Run Full-Stack Production Server
```bash
npm run build
npm start
```

---

## Deliverables Summary

* `TEST_REPORT.md`: Comprehensive report documenting the 13 automated test passes.
* `SECURITY_CHECKLIST.md`: Detailed audit covering input validation, rate limiting, secure headers, SQL injection protection, CORS, and secret management.
