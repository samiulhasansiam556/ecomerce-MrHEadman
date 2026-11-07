# 02 — NON-FUNCTIONAL REQUIREMENTS

Targets marked **(proposed)** must be confirmed by the owner before launch; implement to them meanwhile.

## 1. Performance (NFR-PERF)

| ID | Requirement |
|---|---|
| NFR-PERF-001 | Public pages: Largest Contentful Paint ≤ 2.5 s and CLS ≤ 0.1 on a mid-range mobile device over 4G (proposed). |
| NFR-PERF-002 | Public catalog API (list/detail/search) p95 ≤ 300 ms at 50 concurrent users, excluding cold start (proposed). |
| NFR-PERF-003 | Checkout/place-order API p95 ≤ 800 ms. |
| NFR-PERF-004 | All list endpoints are paginated (max 100). No unbounded queries. Reports must use date-bounded aggregations with indexes. |
| NFR-PERF-005 | Images served through Cloudinary with automatic format/quality and responsive sizes; product grid uses thumbnails (≤ 400 px wide), lazy loading below the fold. |
| NFR-PERF-006 | Next.js uses SSR/ISR for category, product, brand, collection and home pages with revalidation on admin changes (on-demand revalidation hook) or ≤ 60 s. |
| NFR-PERF-007 | Every query used by a list/filter/search endpoint has a supporting index (see file 04). Slow query logging at > 200 ms. |

## 2. Scalability (NFR-SCAL)

| ID | Requirement |
|---|---|
| NFR-SCAL-001 | API is stateless (no in-memory session state) so it can run as multiple instances. |
| NFR-SCAL-002 | Scheduled jobs use a DB lease/lock so only one instance runs a job at a time. |
| NFR-SCAL-003 | Design supports ≥ 10,000 products, ≥ 100,000 variants, ≥ 100,000 orders without schema change (indexes, pagination, denormalized listing fields). |
| NFR-SCAL-004 | Catalog is model-agnostic: adding a new Product Type (e.g. electronics) requires no code change and no migration. |

## 3. Availability and reliability (NFR-REL)

| ID | Requirement |
|---|---|
| NFR-REL-001 | Target availability 99.5% monthly (proposed). |
| NFR-REL-002 | Order placement, claim confirmation, cancellation, expiry release and return restock are atomic (MongoDB transactions). Partial failures roll back. |
| NFR-REL-003 | Retries must not create duplicate orders or claims (idempotency key for orders; unique active `(method, transactionId)` index for claims). |
| NFR-REL-004 | Email or Cloudinary outages must not fail order placement; email is queued with retries. |
| NFR-REL-005 | Graceful shutdown: finish in-flight requests, stop jobs cleanly. |
| NFR-REL-006 | Stock invariants always hold: `onHand ≥ 0`, `reserved ≥ 0`, `reserved ≤ onHand` for every variant. A nightly integrity job verifies and alerts on violations. |

## 4. Security (NFR-SEC)

| ID | Requirement |
|---|---|
| NFR-SEC-001 | HTTPS everywhere in deployed environments; HSTS enabled. |
| NFR-SEC-002 | Passwords hashed with argon2id (bcrypt cost ≥ 12 fallback). Never logged or emailed. |
| NFR-SEC-003 | Auth per TD-03: httpOnly Secure SameSite=Lax cookies, short access token, rotating refresh token stored hashed, CSRF double-submit header on state-changing requests. |
| NFR-SEC-004 | Server-side authorization on every route; ownership checks for customer resources (orders, addresses, claims, returns); admin routes require role `admin`. |
| NFR-SEC-005 | Input validation with Zod on every endpoint; reject unknown fields; sanitize against NoSQL operator injection (`$`/`.` keys). Output encoding for rich text (product description sanitized HTML allow-list or Markdown). |
| NFR-SEC-006 | Rate limits (per IP and per account where applicable, proposed): login 5 per 15 min per IP+email; signup 10 per hour per IP; forgot-password 3 per hour per email and 10 per hour per IP; payment claim submit 10 per hour per user; admin login 5 per 15 min; general API 300 per 5 min per IP. Responses use `429 RATE_LIMITED` with `Retry-After`. |
| NFR-SEC-007 | Security headers via Helmet; strict CORS allow-list (storefront origin only); `X-Powered-By` disabled. |
| NFR-SEC-008 | Uploads: server-signed Cloudinary uploads with preset restricting type/size; server validates returned `publicId` belongs to the expected folder; never accept arbitrary image URLs. |
| NFR-SEC-009 | Secrets only in environment/secret manager; validated at boot (fail fast); never in repo or frontend bundle. Least-privilege DB user. |
| NFR-SEC-010 | Logs and errors never contain passwords, tokens, full phone numbers, full addresses, or transaction IDs (mask: keep last 3 chars). |
| NFR-SEC-011 | Password-reset tokens: 32+ random bytes, SHA-256 hashed at rest, 60-min expiry, single use. |
| NFR-SEC-012 | Dependency scanning in CI (`npm audit` or equivalent); lockfile committed; no packages published < 14 days ago for production upgrades where avoidable. |
| NFR-SEC-013 | Admin-sensitive actions audited (FR-SYS-004). Admin accounts are created only by bootstrap script. |
| NFR-SEC-014 | Brute-force/abuse monitoring: alert on repeated failed logins, repeated rejected claims by one user, repeated identical transaction IDs. |

## 5. Privacy and data retention (NFR-PRIV) — proposed

| ID | Requirement |
|---|---|
| NFR-PRIV-001 | Collect only necessary personal data: name, email, phone, addresses, order data. |
| NFR-PRIV-002 | Orders keep an address snapshot; deleting a saved address never alters orders. |
| NFR-PRIV-003 | Retention: reset tokens deleted 7 days after expiry; refresh tokens deleted at expiry + 7 days; email logs 90 days; admin audit events 2 years; orders/claims 7 years (accounting). |
| NFR-PRIV-004 | Customer account deletion request is handled manually in Release 1 by disabling the account and anonymizing personal fields while retaining order/accounting records. |
| NFR-PRIV-005 | Privacy policy page is published before launch. |

## 6. Accessibility and UX (NFR-A11Y / NFR-UX)

| ID | Requirement |
|---|---|
| NFR-A11Y-001 | Meet WCAG 2.1 AA for all customer journeys and the admin dashboard where practical. |
| NFR-A11Y-002 | Full keyboard operability, visible focus, labels on all inputs, accessible error messages (`aria-describedby`, `role="alert"`). |
| NFR-A11Y-003 | Status is never conveyed by color alone (text/icon labels for stock, order and payment status). |
| NFR-A11Y-004 | Meaningful alt text for product images (`alt` field, fallback to product name). |
| NFR-A11Y-005 | Color contrast ≥ 4.5:1 for text. |
| NFR-UX-001 | "Premium" feel: consistent design system, fast transitions, skeleton loaders, empty states, clear error states, confirmation dialogs for destructive admin actions. |
| NFR-UX-002 | Mobile-first: primary journeys usable at 360 px width without horizontal scrolling. |
| NFR-UX-003 | Admin dashboard is responsive and optimized for desktop/tablet; core actions (payment review, order status) usable on mobile. |
| NFR-UX-004 | Unsaved-changes guard on admin forms; optimistic UI only where safe (never for stock/payments). |
| NFR-UX-005 | UI text is externalized in a message file to allow a future Bangla/English toggle (no second language in Release 1). Bangla text input and display must work everywhere (UTF-8, Bangla fonts, e.g. Noto Sans Bengali). |

## 7. Compatibility (NFR-COMP)

| ID | Requirement |
|---|---|
| NFR-COMP-001 | Latest two versions of Chrome, Edge, Firefox, Safari (iOS 15+ / macOS) and Samsung Internet; Android Chrome. |
| NFR-COMP-002 | Works without JavaScript for core public content (SSR HTML) — catalog pages are crawlable. |

## 8. Observability and operations (NFR-OPS)

| ID | Requirement |
|---|---|
| NFR-OPS-001 | Structured JSON logs with `requestId`, user id (if any), route, status, duration. Request id returned in `X-Request-Id` and error bodies. |
| NFR-OPS-002 | Error tracking (e.g. Sentry) for API and frontend, with PII scrubbing. |
| NFR-OPS-003 | Alerts: API 5xx rate, job failures, email failure rate, DB connectivity, stock-invariant violations, expiring TLS cert, disk/backup failures. |
| NFR-OPS-004 | Health endpoints: `GET /health` (liveness), `GET /health/ready` (DB check). |
| NFR-OPS-005 | Environments: development, staging, production with separate credentials, databases, Cloudinary folders/presets and email transports. No real customer data in dev/staging. |
| NFR-OPS-006 | CI pipeline: lint, type-check, unit + integration tests, build; CD with staging smoke tests and manual production approval. Rollback procedure documented and rehearsed. |
| NFR-OPS-007 | Database indexes created by migration scripts at deploy (not auto-index in production). |
| NFR-OPS-008 | Backups: MongoDB Atlas continuous backup with point-in-time recovery; **RPO ≤ 24 h, RTO ≤ 4 h** (proposed); restore drill before launch and quarterly after. |
| NFR-OPS-009 | Runbook covers: restore, rollback, rotating secrets, disabling a user, stuck reservations, email failures, manual stock correction. |
| NFR-OPS-010 | Configuration changes (settings) take effect without redeploy. |

## 9. Maintainability and quality (NFR-MNT / NFR-QA)

| ID | Requirement |
|---|---|
| NFR-MNT-001 | TypeScript strict mode in all packages; shared Zod schemas/enums in `packages/shared`. |
| NFR-MNT-002 | Layered API structure: routes → controllers → services → repositories/models; business rules only in services. |
| NFR-MNT-003 | OpenAPI document generated or hand-maintained to match file 05; breaking changes require version bump. |
| NFR-MNT-004 | Consistent error codes and response envelope (file 05). |
| NFR-MNT-005 | ESLint + Prettier enforced; conventional commits; each PR references requirement IDs. |
| NFR-QA-001 | Test coverage: unit tests for pricing, state machines, size chart resolution, report math; integration tests for every API module against an in-memory/containerized Mongo replica set. |
| NFR-QA-002 | **Concurrency test:** N parallel orders for the last unit → exactly one succeeds. |
| NFR-QA-003 | **Job tests:** expiry job releases stock exactly once; running it twice is harmless. |
| NFR-QA-004 | E2E (Playwright): browse → add to cart → login → checkout → claim → admin confirm → ship → deliver; plus cancel and return paths. |
| NFR-QA-005 | Authorization tests: customer cannot call any `/admin` route; customer A cannot read customer B’s orders. |
| NFR-QA-006 | Accessibility checks (axe) in CI on key pages. |
| NFR-QA-007 | Seed script creates demo data (apparel, saree, a sample electronics type) for staging only. |

## 10. Acceptance (summary of release gate)

Release 1 is accepted when: all `M` functional requirements pass; NFR-QA tests pass; NFR-SEC-001..014 verified; backup restore drill and rollback rehearsal done; launch checklist complete; owner has confirmed all "(proposed)" targets.
