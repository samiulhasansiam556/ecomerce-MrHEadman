# 00 — HANDOFF GUIDE (READ THIS FIRST)

**Project:** Premium Clothing Store (extensible to other product types, e.g. electronics)
**Spec version:** 1.0 · **Date:** 2026-11-07 · **Status:** Frozen for Release 1 (changes go to the Change Log at the bottom)

## 0. How any model or agent must use this spec

1. Read the files in order: `00` → `01` → `02` → `03` → `04` → `05` → `06`.
2. This spec is the **single source of truth**. If code, chat history, or memory disagrees with it, the spec wins.
3. **Never invent business rules.** If something is not specified, stop and flag it as `OPEN QUESTION:` in your reply, do not guess silently.
4. Every requirement has an ID (e.g. `FR-ORD-012`). Reference IDs in commits, PRs, and tests.
5. Enum values, status names, and collection names are defined **once** (section 6 here and file 04). Reuse them exactly.
6. When you change behavior, update the relevant spec file and add a line to the Change Log (section 11).
7. Work in small vertical slices following the build order in section 9.

| File | Content |
|---|---|
| 00_HANDOFF_GUIDE.md | Scope, stack, decisions, glossary, conventions, enums, build order |
| 01_FUNCTIONAL_REQUIREMENTS.md | Feature catalog and functional requirements by module |
| 02_NON_FUNCTIONAL_REQUIREMENTS.md | Performance, security, reliability, accessibility, operations |
| 03_USE_CASES.md | Use case diagrams (Mermaid) and use case descriptions |
| 04_DATABASE_MODEL.md | MongoDB collections, fields, indexes, relations (ER diagram) |
| 05_API_SPEC.md | REST endpoints, auth, request/response contracts, error codes |
| 06_BUSINESS_RULES_AND_STATE_MACHINES.md | State machines, algorithms, calculations, scheduled jobs |

## 1. Product summary

A mobile-friendly single-store e-commerce site. Visitors browse publicly; customers sign up, keep a cart, place orders, and submit **manual mobile-wallet payment claims** (bKash, Rocket, Nagad). Admins manage everything from a dashboard: categories, product types, attributes, options, size charts, brands, products, variants, stock, payment review, orders, returns, reports, settings.

**Key design goal:** the catalog is **data-driven**. Admins define categories, Product Types (form templates), attributes, option sets, and size charts in the dashboard. No code change is needed to add a new kind of product (e.g. electronics).

**Critical rule:** a submitted transaction ID is a **payment claim, not verified payment**. Payment status and order status are separate fields. Revenue counts only after admin confirms payment.

## 2. Release 1 scope

**In scope:** public storefront, auth, customer dashboard, cart, checkout, manual payment claim and review, order lifecycle, cancellations, return/exchange requests, full admin catalog builder (categories, product types, attributes, option sets, size charts, brands, collections), variant-level inventory with reservation, homepage manager, reports, settings, audit log, email notifications, admin notifications.

**Out of scope (Release 1):** coupons/gift cards, wishlist, reviews/ratings, guest checkout, SMS/WhatsApp notifications, automated refunds, courier API integration, multiple admin roles (staff permissions), multi-currency, multi-language UI, marketplace/multi-vendor, native mobile apps, backorders, bulk CSV import/export, anonymous server-side carts.

## 3. Technology stack (fixed)

| Layer | Choice |
|---|---|
| Frontend | Next.js (App Router) + TypeScript, Tailwind CSS; SSR/ISR for public pages |
| Backend | Node.js + Express + TypeScript, REST JSON API under `/api/v1` |
| Database | MongoDB Atlas (replica set, transactions required) |
| ODM / validation | Mongoose + Zod (request validation shared with frontend types) |
| Images | Cloudinary (signed direct uploads; store `publicId` + secure URL) |
| Email | Nodemailer with environment-configured SMTP |
| Scheduler | `node-cron` inside the API process (single instance lock via DB lease) or a separate worker process |
| Repo layout (recommended) | Monorepo: `apps/web`, `apps/api`, `packages/shared` (Zod schemas, enums, types) |

## 4. Technical decisions (TD)

| ID | Decision |
|---|---|
| TD-01 | **Money** is stored as **integer poisha** (1 BDT = 100). API returns integers in poisha plus a formatted string only on display fields. Never use floats for money. |
| TD-02 | **Dates** stored as UTC `Date`. Store timezone is `Asia/Dhaka` (UTC+6); used for report boundaries and display. API returns ISO-8601 UTC strings. |
| TD-03 | **Auth:** short-lived access JWT (15 min) + rotating refresh token (7 days), both in `httpOnly`, `Secure`, `SameSite=Lax` cookies. Refresh tokens are stored hashed in DB. CSRF: double-submit token in header `X-CSRF-Token` for all state-changing requests. |
| TD-04 | **Passwords:** argon2id (or bcrypt cost ≥ 12 if argon2 unavailable). |
| TD-05 | **IDs:** MongoDB `ObjectId` internally. Public URLs use `slug` (products, categories, brands, collections) and `orderNumber` (orders). |
| TD-06 | **Order number:** `ORD-` + zero-padded sequence (e.g. `ORD-000123`) from the `counters` collection. |
| TD-07 | **Stock** lives on `variants.stock = { onHand, reserved }`; available = onHand − reserved. Updates use atomic conditional operations inside transactions. |
| TD-08 | **Idempotency:** `POST /orders` requires an `Idempotency-Key` header; duplicates return the original order. |
| TD-09 | **Soft delete:** catalog entities and users are archived/deactivated, never hard-deleted once referenced. |
| TD-10 | **Anonymous cart** lives in browser `localStorage` only; merged on login via `POST /cart/merge`. Server carts exist only for logged-in users. |
| TD-11 | **Email verification** is not implemented in Release 1. Field `emailVerifiedAt` is reserved (nullable). |
| TD-12 | **Search:** MongoDB `$text` index on a denormalized `searchText` field of products. Atlas Search/typo tolerance is a later upgrade. |
| TD-13 | **Collections** are manually curated lists in Release 1 (rule-based collections later). |

## 5. Business decisions (BD) — FROZEN

| ID | Decision |
|---|---|
| BD-01 | Region/currency: Bangladesh only, BDT only. |
| BD-02 | **Order becomes `confirmed` only after payment is confirmed by an admin.** |
| BD-03 | **Stock reservation** happens at order placement. Reservation hold = **24 hours** (setting `reservationHoldHours`). Hold is suspended while a claim is `under_review`. If a claim is rejected, the 24-hour window restarts. If no claim is submitted in time, the order is auto-cancelled and stock released. |
| BD-04 | A rejected claim can be **resubmitted up to 3 times** (setting `maxClaimResubmissions`). After that the order is auto-cancelled. |
| BD-05 | Delivery fee by **delivery zone** (admin-defined; default zones: Inside Dhaka, Outside Dhaka) with optional free-delivery threshold per zone. |
| BD-06 | **Cancellation:** customer may cancel while order status is `pending` or `confirmed`. Admin may cancel while `pending`, `confirmed`, or `processing`. After `shipped`, use return flow. |
| BD-07 | **Return/exchange window: 7 days after delivery** (`returnWindowDays`). Item must be unused with tags. Customer pays return shipping unless the item was wrong or defective (admin decides, recorded in the request). |
| BD-08 | **Refunds are manual:** admin sends money outside the system and records it (amount, method, reference). |
| BD-09 | Notifications: **email only**. |
| BD-10 | One role for staff: `admin`. Public signup always creates `customer`. |
| BD-11 | **No guest checkout.** Login required to place an order. |
| BD-12 | Max quantity per cart line: 10 (setting `maxQtyPerLine`). |
| BD-13 | Payment wallets: bKash, Rocket, Nagad (admin-configurable accounts/instructions, active flag per method). Never collect PINs/OTPs/passwords. No screenshot uploads in Release 1. |
| BD-14 | Kids is one parent category containing Boys and Girls; other categories nest inside those. Category depth max = 3 levels. |
| BD-15 | Occasions (Eid, Puja, Winter Sale) are **Collections**, not categories. |

## 6. Enums (single source of truth)

```ts
Role                = 'customer' | 'admin'
UserStatus          = 'active' | 'disabled'
PublishStatus       = 'draft' | 'published' | 'archived'          // products
ActiveStatus        = 'active' | 'hidden' | 'archived'            // categories, brands, collections, product types, attributes, option sets, size charts
OrderStatus         = 'pending' | 'confirmed' | 'processing' | 'shipped' | 'delivered' | 'cancelled'
PaymentStatus       = 'not_submitted' | 'under_review' | 'confirmed' | 'rejected' | 'refund_due' | 'refunded'
ClaimStatus         = 'under_review' | 'confirmed' | 'rejected'
WalletMethod        = 'bkash' | 'rocket' | 'nagad'
ReservationStatus   = 'active' | 'on_hold_review' | 'consumed' | 'released'
CancelReason        = 'customer_request' | 'admin_cancel' | 'payment_timeout' | 'claims_exhausted' | 'out_of_stock' | 'other'
ReturnType          = 'return' | 'exchange'
ReturnStatus        = 'requested' | 'info_requested' | 'approved' | 'rejected' | 'received' | 'completed' | 'cancelled'
StockMovementType   = 'reserve' | 'release' | 'sale' | 'cancel_restock' | 'return_restock' | 'adjustment' | 'initial'
AttributeInputType  = 'text' | 'number' | 'select' | 'multiselect' | 'color' | 'boolean'
OptionSetType       = 'text' | 'color'
Visibility          = 'customer' | 'internal'                     // order notes/events
EmailStatus         = 'queued' | 'sent' | 'failed'
AdminNotifType      = 'new_order' | 'payment_review' | 'low_stock' | 'return_request'
Audience            = 'men' | 'women' | 'kids' | 'general'        // optional tag on categories (display only)
```

## 7. Glossary

| Term | Meaning |
|---|---|
| Category | Admin-managed tree node (max depth 3). Products attach to a **leaf** category. |
| Product Type | Template defining which attributes and variant options a product has, and whether a size chart applies. |
| Attribute | Descriptive field (Fabric, Fit, Battery). May be a storefront filter. |
| Option Set | Set of choices that create variants (Size, Color, Storage, Age). |
| Variant | A sellable combination (e.g. Black + L) with its own SKU, price, and stock. Every product has ≥ 1 variant. |
| Size Chart | Admin-defined table with custom columns/rows, attached to a category or product. |
| Collection | Cross-cutting curated product list (Eid, Winter Sale). |
| Brand | Optional product brand with page and filter. |
| Claim (payment claim) | Customer-submitted payment details awaiting admin verification. |
| Reservation | Stock held for an unpaid order. |
| onHand / reserved / available | Physical stock / held for unpaid orders / onHand − reserved. |
| Snapshot | Copy of product/address data stored in the order so later edits never change history. |

## 8. Conventions

- **API:** base `/api/v1`; JSON; envelope `{ success, data, meta? }` or `{ success:false, error:{code,message,details?}, requestId }` (see file 05).
- **Naming:** DB collections `camelCase` plural; fields `camelCase`; enums `snake_case` strings; slugs lowercase ASCII with hyphens.
- **Validation:** every request body/query validated with Zod; unknown fields rejected on writes.
- **Authorization:** server-side on every route (`requireAuth`, `requireRole('admin')`, ownership checks). Frontend hiding is not security.
- **Audit:** every sensitive admin write creates an `adminAuditEvents` record (see file 04).
- **Phone format (BD):** normalize to `01XXXXXXXXX` (regex `^01[3-9]\d{8}$`); accept `+880` and `880` prefixes on input.
- **Pagination:** `page` (default 1), `limit` (default 20, max 100); response `meta: { page, limit, total, totalPages }`.
- **Errors:** stable machine-readable `error.code` (list in file 05); human message safe to display.
- **Tests required for:** auth, authorization, stock concurrency, payment flow, order transitions, expiry job, price/total calculation, report calculations.

## 9. Build order (phases)

| Phase | Deliverable | Exit condition |
|---|---|---|
| 1 | Monorepo, env validation, Mongo connection, logging, error handling, health checks, CI | App boots; `/health` OK |
| 2 | Auth, users, roles, addresses, password reset, rate limits, audit infra, email infra | Customer vs admin access verified by tests |
| 3 | Catalog builder: categories, attributes, option sets, product types, size charts, brands, collections (admin) | Admin can model apparel + saree + a sample electronics type |
| 4 | Products, variants, media (Cloudinary), inventory, stock movements | Product created, previewed, published; stock adjusted with history |
| 5 | Public storefront: home, category, filters, search, product page, size chart popup, mega-menu | SEO pages render; filters generated from attributes |
| 6 | Cart, checkout quote, order placement with reservation, concurrency tests | Last-unit race test passes |
| 7 | Payment claims, admin review, order lifecycle, cancellations, expiry job, emails | Full purchase flow accepted |
| 8 | Returns/exchanges, refunds recording, admin notifications | Return flow accepted |
| 9 | Reports, homepage manager, settings, audit log views | Report totals reconcile |
| 10 | Hardening: accessibility, performance, security review, backups, runbook, launch checklist | Acceptance tests pass |

## 10. Assumptions made while writing this spec (confirm if wrong)

- A-01: Release 1 collections are manual only; `type: 'rule'` is reserved for later.
- A-02: "Resubmit up to 3 times" means 1 initial claim + 3 resubmissions (4 total claims max).
- A-03: Email verification is not built; reset/order emails go to the registered email.
- A-04: Payment-amount mismatch between claim and order total is allowed only when admin enters a note (see file 06).
- A-05: Exchange is limited to a different variant of the **same product**.
- A-06: Default low-stock threshold = 5 (setting `lowStockThreshold`).

## 11. Change Log

| Date | Version | Change |
|---|---|---|
| 2026-11-07 | 1.0 | Initial full specification created from Blueprint v1.0 and owner feature decisions. |
