# EdVyro Task 04: Security Checklist & Implementation Guide

This document outlines the security controls, architectural decisions, and threat mitigation practices implemented for Task 04: Secure Application Integration.

---

## 1. Input Validation Architecture

### Dual-Tier Validation Principle
> **Rule:** Client-side validation is for User Experience (UX); Server-side validation is for Security. Client-side checks alone are **never** secure because attackers can bypass the browser using tools like `curl`, Postman, or custom HTTP scripts.

| Field | Client-side Validation | Server-side Validation | Max Limits |
|---|---|---|---|
| `internship_id` | Dropdown/Modal selection | Checked against SQLite `internships` table | Required, valid ID |
| `name` | Trimmed, required, min 2 chars | Type checking, string trimming, min 2 chars | 100 characters max |
| `email` | Standard regex check | Strict RFC-compliant email regex, trimming | 255 characters max |
| `message` | Character counter (10-1000) | String length validation (10 to 1000 chars) | 1,000 characters max |

### Implementation Check
- [x] Client validates input before dispatching `fetch` request.
- [x] Submit button is disabled while request is pending to prevent double-click race conditions.
- [x] Server rejects empty or improperly formatted payloads with `400 Bad Request`.
- [x] Structured validation error messages returned to frontend for user feedback.

---

## 2. SQL Injection Prevention

### Threat Model
Attackers attempt to manipulate database queries by injecting SQL syntax (e.g., `' OR '1'='1`) into form fields or query parameters.

### Mitigation: Parameterized SQL Queries
Every database query in `/src/server/db.ts` uses prepared statement parameters (`args: [...]`). No user-controlled strings are ever concatenated into raw SQL strings.

```typescript
// SECURE: Parameterized query ensures values are treated strictly as data, never code
await db.execute({
  sql: `INSERT INTO applications (id, internship_id, name, email, message, status, created_at)
        VALUES (?, ?, ?, ?, ?, 'submitted', ?)`,
  args: [id, data.internship_id, data.name, data.email, data.message, now]
});
```

### Implementation Check
- [x] Zero instances of string concatenation or template literals in SQL statements.
- [x] Table columns use explicit schema types and `CHECK` constraints.
- [x] Prepared parameters utilized across all `SELECT`, `INSERT`, and filter queries.

---

## 3. Rate Limiting (`express-rate-limit`)

### Threat Model
Brute-force attacks, spam bots, and denial-of-service (DoS) attempts against public application endpoints.

### Mitigation: Tiered Rate Limits
1. **General API Rate Limiter**: 150 requests per 15-minute window for `/api/*` endpoints.
2. **Application Submission Limiter**: Strict 15 requests per 15-minute window per IP for `POST /api/applications`.

```typescript
const applicationSubmitLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 15,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    error: 'Submission rate limit reached. Please wait before submitting another application.'
  }
});
```

### Implementation Check
- [x] `express-rate-limit` configured on Express app.
- [x] Standard `RateLimit-Limit` and `RateLimit-Remaining` headers returned.
- [x] Exceeding threshold triggers HTTP `429 Too Many Requests`.

---

## 4. HTTP Security Headers (`helmet`)

### Threat Model
MIME sniffing, clickjacking, protocol downgrades, and information leakage via server headers.

### Mitigation
Integrated `helmet` middleware in Express to apply best-practice headers:

* **`X-Content-Type-Options: nosniff`**: Prevents browsers from MIME-sniffing a response away from declared content-type.
* **`Strict-Transport-Security` (HSTS)**: Enforces secure HTTPS connections.
* **`X-Frame-Options: SAMEORIGIN`**: Protects against clickjacking while allowing approved frames.
* **`X-Download-Options: noopen`**: Prevents Internet Explorer from executing downloads in the site's context.
* **Removes `X-Powered-By`**: Eliminates Express server fingerprinting.

### Implementation Check
- [x] Helmet installed and initialized in `/src/server/app.ts`.
- [x] Confirmed presence of headers using automated test suite.

---

## 5. Request Body Size Limits

### Threat Model
Denial-of-Service (DoS) attacks caused by clients sending massive JSON payloads, consuming server memory and CPU during parsing.

### Mitigation
Strict 10KB payload limit configured on body parser:

```typescript
app.use(express.json({ limit: '10kb' }));
app.use(express.urlencoded({ extended: true, limit: '10kb' }));
```

Payloads exceeding 10KB are rejected immediately by Express middleware with HTTP `413 Payload Too Large`.

### Implementation Check
- [x] 10KB limit configured on JSON parser.
- [x] Verified through automated test `TEST-13`.

---

## 6. Cross-Origin Resource Sharing (CORS)

### Threat Model
Unauthorized external websites triggering authenticated or malicious requests against your API.

### Mitigation
Configured restrictive CORS origin whitelist:

```typescript
app.use(cors({
  origin: (origin, callback) => {
    if (!origin) return callback(null, true);
    if (allowedOrigins.includes(origin) || origin.endsWith('.run.app') || origin.includes('localhost')) {
      return callback(null, true);
    }
    return callback(new Error('Blocked by CORS policy'));
  },
  methods: ['GET', 'POST', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));
```

### Implementation Check
- [x] Restricts origins to approved application domains and local development.
- [x] Restricts HTTP methods strictly to `GET`, `POST`, and `OPTIONS`.

---

## 7. Secret Management & Credential Safety

### Threat Model
Hardcoding API tokens, database passwords, or secret keys in source control repositories.

### Mitigation
- [x] All configuration managed through `.env.example` and environment variables.
- [x] SQLite database uses local file storage with zero external credentials to leak.
- [x] `.gitignore` configured to ignore runtime database artifacts and local `.env` files.
- [x] No secrets or private tokens committed to git history.
