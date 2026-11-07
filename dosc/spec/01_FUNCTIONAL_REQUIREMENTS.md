# 01 — FUNCTIONAL REQUIREMENTS

Priority: **M** = must (Release 1), **S** = should (Release 1 if time allows). All items below are Release 1 unless marked `LATER`.
Feature IDs (V/C/A/S) map to the owner-approved feature catalog in section 1.

## 1. Feature catalog (frozen)

**Visitor:** V1 home · V2 category browse/sort/filter/pagination · V3 search · V4 product detail · V5 anonymous cart · V6 policies/contact · V7 brand page & filter · V8 mega-menu · V9 auto filters · V10 size chart popup
**Customer:** C1 signup/login/logout · C2 forgot/reset password · C3 change password · C4 profile · C5 address book · C6 persistent cart · C7 checkout · C8 manual payment claim · C9 resubmit rejected claim · C10 order history/detail · C11 cancel order · C12 return/exchange request · C13 email notifications
**Admin:** A1 dashboard · A2 categories · A3 products · A4 variants · A5 inventory · A6 orders · A7 payment review · A8 returns · A9 customers · A10 reports · A11 settings · A12 audit log · A13 admin notifications · A14 product types · A15 attribute library · A16 option sets · A17 size charts · A18 brands · A19 collections · A20 homepage manager · A21 bulk edit
**System:** S1 server-side pricing · S2 stock reservation · S3 auto-release · S4 transition validation · S5 rate limiting · S6 email log/retry

## 2. Authentication and accounts (C1–C5)

| ID | Requirement | Pri |
|---|---|---|
| FR-AUTH-001 | Visitor can sign up with name, email, phone, password. Role is always `customer`; any `role` in the request is rejected. | M |
| FR-AUTH-002 | Email is unique (case-insensitive, stored lowercase). Phone must match BD format. | M |
| FR-AUTH-003 | Password policy: min 8 chars, at least one letter and one number; max 128. | M |
| FR-AUTH-004 | Login with email + password issues access and refresh cookies. Disabled users cannot log in. | M |
| FR-AUTH-005 | Logout revokes the current refresh token and clears cookies. | M |
| FR-AUTH-006 | Refresh endpoint rotates refresh token; reuse of an old token revokes the whole token family. | M |
| FR-AUTH-007 | Forgot password returns a neutral 200 regardless of whether the email exists. If it exists, create a random single-use token (stored hashed), valid 60 minutes, and email a reset link. | M |
| FR-AUTH-008 | Reset password validates token (exists, unexpired, unused), sets new password, marks token used, revokes all refresh tokens of the user. | M |
| FR-AUTH-009 | Change password requires current password; revokes other sessions. | M |
| FR-AUTH-010 | Customer can edit name, phone, profile image (Cloudinary). Cannot edit email, role, or status in Release 1. | M |
| FR-AUTH-011 | Address book: add, edit, delete, set default. Fields: label, recipient name, phone, division, district, area/upazila, address line, postal code (optional). Max 10 addresses per user. | M |
| FR-AUTH-012 | First admin is created only via a CLI bootstrap script using env credentials. No API creates admins in Release 1. | M |
| FR-AUTH-013 | Login, signup, reset endpoints are rate limited (see NFR-SEC-006). | M |
| FR-AUTH-014 | Admin and customer sessions are the same mechanism; role is checked server-side per route. | M |

## 3. Admin catalog builder (A2, A14–A19)

### 3.1 Categories (A2)
| ID | Requirement | Pri |
|---|---|---|
| FR-CAT-001 | Admin can create a category: name, slug (auto, editable), parent (optional), image, banner, SEO title/description, linked Product Type (optional), linked Size Chart (optional), audience tag (optional), status. | M |
| FR-CAT-002 | Max depth is 3 levels. Creating or moving a node that would exceed depth 3 is rejected (`CATEGORY_DEPTH_EXCEEDED`). | M |
| FR-CAT-003 | Admin can reorder siblings and move a node to another parent via drag-and-drop (API: move/reorder). Descendants’ paths update. | M |
| FR-CAT-004 | A category that has products cannot receive child categories; a category with children cannot receive products. Products attach to leaf categories only. | M |
| FR-CAT-005 | Statuses `active`, `hidden`, `archived`. Hidden/archived categories and their products do not appear in the storefront menu/listing. Archiving a category with active products requires choosing: block, or archive/move products (bulk). | M |
| FR-CAT-006 | Slug is unique across all categories. Slug change stores the old slug in `slugHistory`; storefront responds 301 for old slugs. | M |
| FR-CAT-007 | Category inherits Product Type and Size Chart from the nearest ancestor when its own is empty (see BR-CAT-01). | M |
| FR-CAT-008 | Storefront mega-menu is generated from active categories. | M |

### 3.2 Attribute library (A15)
| ID | Requirement | Pri |
|---|---|---|
| FR-ATTR-001 | Admin creates an attribute: name, key (unique, immutable after use), input type (`text`,`number`,`select`,`multiselect`,`color`,`boolean`), allowed options (for select/multiselect/color), unit (optional), `isFilterable`, status. | M |
| FR-ATTR-002 | Attributes in use cannot be deleted, only archived. Changing input type after use is blocked. Removing an option value that is in use is blocked. | M |
| FR-ATTR-003 | Filterable attributes automatically appear as filters on category/search pages. | M |

### 3.3 Option sets (A16)
| ID | Requirement | Pri |
|---|---|---|
| FR-OPT-001 | Admin creates an option set: name, key (e.g. `size`, `color`, `storage`, `age`), type (`text` or `color`), ordered values (value, label, colorHex for color type). | M |
| FR-OPT-002 | Values can be added/reordered/hidden at any time. Values used by variants cannot be deleted, only hidden (hidden values stay valid on existing variants). | M |
| FR-OPT-003 | The option set with key `size` is the one matched against Size Chart rows. | M |

### 3.4 Product Types (A14)
| ID | Requirement | Pri |
|---|---|---|
| FR-PT-001 | Admin creates a Product Type: name, key, ordered list of attributes (each marked required or optional), ordered list of variant option sets, flag `sizeChartEnabled`, status. | M |
| FR-PT-002 | A Product Type may have zero variant option sets (products then have one default variant). | M |
| FR-PT-003 | Editing a Product Type that is in use shows an impact count (products affected). Removing an attribute/option set from a type is blocked if any product uses it, unless admin chooses to hide it (then existing data stays, form hides it). | M |
| FR-PT-004 | The Add/Edit Product form is rendered dynamically from the Product Type (fields, validation, variant builder, size chart section). | M |
| FR-PT-005 | Seed Product Types at install: `apparel` (attrs: material, fit, care; options: size, color; size chart yes), `saree` (attrs: fabric, work type, length in hand, blouse piece; options: color; size chart no), `kids-apparel` (attrs: material, fit, care; options: age, color; size chart yes). | M |

### 3.5 Size charts (A17)
| ID | Requirement | Pri |
|---|---|---|
| FR-SC-001 | Admin creates a Size Chart: name, unit (inch/cm/none), **admin-defined columns** (key, label), **rows** (size label + values per column). | M |
| FR-SC-002 | Charts attach to a category (inherited by descendants) and optionally to a single product (override). Resolution order: product → category → nearest ancestor → none. | M |
| FR-SC-003 | If the Product Type has `sizeChartEnabled=false`, no chart is shown or required. | M |
| FR-SC-004 | When saving a product whose `size` option values are not found in the resolved chart rows, show a warning (non-blocking). | S |
| FR-SC-005 | Storefront shows a "Size Chart" button opening a popup table; the row of the selected size is highlighted; table scrolls horizontally on mobile. | M |

### 3.6 Brands (A18)
| ID | Requirement | Pri |
|---|---|---|
| FR-BR-001 | Admin manages brands: name, slug, logo, description, status. | M |
| FR-BR-002 | Product has optional brand. Storefront has brand pages `/brands/:slug` and a brand filter. | M |
| FR-BR-003 | Brands in use are archived, not deleted. | M |

### 3.7 Collections (A19)
| ID | Requirement | Pri |
|---|---|---|
| FR-COL-001 | Admin manages collections: name, slug, banner, description, optional start/end dates, status, manual ordered product list. | M |
| FR-COL-002 | A product may belong to many collections. Storefront shows collection pages `/collections/:slug` only while active and within dates. | M |

## 4. Products, variants, media (A3, A4, A21)

| ID | Requirement | Pri |
|---|---|---|
| FR-PRD-001 | Add Product flow: choose leaf category (loads Product Type form) → identity (name, slug, description, brand, collections) → attributes (from type) → images → pricing → variants → size chart (if applicable) → preview → save draft or publish. | M |
| FR-PRD-002 | Product fields: name, slug (unique), productCode (optional, used for SKU suggestions), description, category, brand, collections, attribute values, images (ordered, main image, alt text, optional color association), regular price, optional sale price with optional start/end dates, featured flag, tags, SEO fields, status (`draft`,`published`,`archived`). | M |
| FR-PRD-003 | Admin selects which option sets (from the type) apply and enters values (e.g. Size: S, M, L; Color: Black, White). System generates the combination table. Admin can remove unsold combinations and deactivate others. | M |
| FR-PRD-004 | Each variant has: unique SKU (uppercase), option values, optional barcode, optional price override and sale price override, initial stock, low-stock threshold override (optional), optional image, active flag. | M |
| FR-PRD-005 | Bulk-apply helpers in the variant table: set price, stock, threshold for all or selected rows. | M |
| FR-PRD-006 | Every product has ≥ 1 variant. A product with no option sets gets exactly one default variant with empty option values. | M |
| FR-PRD-007 | **Publish checklist (server-enforced):** category is an active leaf; ≥ 1 image; ≥ 1 active variant; required attributes filled; every active variant has an effective price > 0; sale price < regular price; SKUs unique. | M |
| FR-PRD-008 | Draft and archived products are never visible or purchasable on the storefront. Archiving does not affect existing orders. | M |
| FR-PRD-009 | Images are uploaded directly to Cloudinary using server-signed parameters. Allowed: JPEG/PNG/WebP, ≤ 5 MB, ≤ 4000 px longest side, max 10 images per product. Server stores `publicId`, `url`, `width`, `height`, `alt`, `order`. | M |
| FR-PRD-010 | Admin can preview the storefront page of a draft product (admin-only preview) and test each option selection (image/price/availability). | M |
| FR-PRD-011 | Product edits never alter historical order line snapshots. | M |
| FR-PRD-012 | Products referenced by orders cannot be hard-deleted; only archived. Unreferenced drafts may be hard-deleted. | M |
| FR-PRD-013 | Bulk edit (A21): select multiple products/variants to change status, category, brand, price (set / ±amount / ±%), stock (adjust with reason), and collections. All bulk changes are audited. | M |
| FR-PRD-014 | Product list in admin: search (name, SKU), filters (status, category, brand, low stock), sort, pagination. | M |
| FR-PRD-015 | Denormalized listing fields on product (`minPrice`, `maxPrice`, `inStock`, `searchText`) are recomputed on every variant/product change. | M |

## 5. Inventory (A5, S2, S3)

| ID | Requirement | Pri |
|---|---|---|
| FR-INV-001 | Stock is tracked per variant as `onHand` and `reserved`; `available = onHand − reserved`. Neither may go negative. | M |
| FR-INV-002 | Storefront shows availability from `available`. `available = 0` → option shown as unavailable and not purchasable. Product listing shows "in stock" if any active variant has `available > 0`. | M |
| FR-INV-003 | Admin Inventory page lists variants with SKU, product, options, onHand, reserved, available, threshold; search and filters (low, out, all). | M |
| FR-INV-004 | Admin can adjust `onHand` (delta or set absolute) with mandatory reason (`new_stock`,`count_mismatch`,`damaged_lost`,`return_restock`,`other`) and optional note. | M |
| FR-INV-005 | Every stock change creates an immutable `stockMovements` record (variant, type, delta, before, after, reason, order/return reference, actor, time). | M |
| FR-INV-006 | Low-stock = `available ≤ threshold` where threshold = variant override or global setting. Triggers dashboard list and one admin notification/email per crossing (not repeated until restocked above threshold). | M |
| FR-INV-007 | Order placement reserves stock atomically; two concurrent orders for the last unit cannot both succeed (see BR-STK-01). | M |
| FR-INV-008 | Expired/cancelled unpaid orders release reserved stock automatically (BR-JOB-01). | M |
| FR-INV-009 | Deactivating a variant or archiving a product blocks new purchases but keeps existing reservations and orders valid. | M |
| FR-INV-010 | Backorders are not supported. | M |

## 6. Storefront (V1–V10)

| ID | Requirement | Pri |
|---|---|---|
| FR-SF-001 | Home page is composed of admin-managed sections (hero banners, featured categories, product carousels: new arrivals / featured / sale / collection, promo banners). | M |
| FR-SF-002 | Category page: breadcrumb, banner, product grid, pagination, sorting (newest, price low→high, price high→low, popular, name), filters (price range, brand, availability, every filterable attribute, every option set used in that category such as size and color). Filters are generated from data, not hard-coded. | M |
| FR-SF-003 | Filter options show counts and hide empty values. Filter state is reflected in the URL query string. | M |
| FR-SF-004 | Search by name, description, brand, category, attribute text; with suggestions endpoint (top 5). | M |
| FR-SF-005 | Product card: main image (hover/second image optional), name, brand, price, sale price + badge when applicable, out-of-stock label. | M |
| FR-SF-006 | Product page: gallery, name, brand, price (updates on selection), description, attributes table, option selectors (**size as buttons**, color as swatches), availability per selection, size chart button (if resolved chart), delivery/return info, add to cart. | M |
| FR-SF-007 | Unavailable option values are visibly disabled (not color-only; use strike-through/label). A required option must be chosen before add to cart; no silent defaults. | M |
| FR-SF-008 | Selecting a color switches to images associated with that color when available. | M |
| FR-SF-009 | SEO: stable slug URLs, unique `<title>`/meta description, canonical URLs, sitemap.xml, robots.txt, JSON-LD `Product` schema, Open Graph tags. | M |
| FR-SF-010 | Brand pages and collection pages list their products with the same filters/sorting. | M |
| FR-SF-011 | Static pages managed by admin: delivery policy, return/exchange policy, privacy, terms, about, contact. | M |
| FR-SF-012 | Mega-menu from category tree with images optional; mobile uses slide-in drawer. | M |
| FR-SF-013 | Mobile-first responsive layout; no horizontal page scroll on any primary journey. | M |

## 7. Cart and checkout (V5, C6, C7, S1)

| ID | Requirement | Pri |
|---|---|---|
| FR-CART-001 | Cart line = variantId + quantity. Price is **always computed live**, never trusted from the client. | M |
| FR-CART-002 | Anonymous cart is kept in browser localStorage; on login it is merged into the server cart (sum quantities, cap at `maxQtyPerLine` and available stock; report adjustments). | M |
| FR-CART-003 | Cart view shows current price, availability warnings (price changed, low stock, unavailable), subtotal. | M |
| FR-CART-004 | Adding to cart does not reserve stock. | M |
| FR-CHK-001 | Checkout requires login. Steps: delivery info (address select/add, contact name/phone, note) → payment method → review totals → place order. | M |
| FR-CHK-002 | `POST /checkout/quote` recomputes totals server-side: line totals, subtotal, discount (0 in Release 1), delivery fee by zone, grand total; returns blocking issues per line. | M |
| FR-CHK-003 | Delivery zone is resolved from the address district; if no zone matches, the default zone applies; if no default exists, checkout is blocked (`NO_DELIVERY_ZONE`). | M |
| FR-CHK-004 | Customer must accept delivery and return policies (checkbox) before placing the order. | M |
| FR-CHK-005 | Placing an order is idempotent (`Idempotency-Key`). It reserves stock, creates the order with immutable snapshots, creates reservation, returns order number and wallet payment instructions. | M |
| FR-CHK-006 | Order placement fails atomically with a clear message if any line is unavailable. | M |
| FR-CHK-007 | After success, purchased lines are removed from the cart. | M |

## 8. Payment claims (C8, C9, A7)

| ID | Requirement | Pri |
|---|---|---|
| FR-PAY-001 | After placing an order, customer sees amount due, selected wallet’s account number and instructions, and a form: method, transaction ID, sender phone, amount sent. | M |
| FR-PAY-002 | Submitting a claim sets claim `under_review`, order `paymentStatus = under_review`, reservation `on_hold_review`. Order stays `pending`. Admin notification + email created. | M |
| FR-PAY-003 | Transaction ID normalized (trim, uppercase) and must be 6–30 alphanumeric chars. The same `(method, transactionId)` cannot be active (`under_review` or `confirmed`) on two claims. | M |
| FR-PAY-004 | Claim validations: order belongs to user, status `pending`, `paymentStatus ∈ {not_submitted, rejected}`, reservation not expired, resubmission limit not exceeded, method active. | M |
| FR-PAY-005 | Admin lists claims (filter by status/method/date, search by order number/txn ID/phone), opens a claim showing order total vs claimed amount, customer, history. | M |
| FR-PAY-006 | Admin **confirms** with received amount and optional note. If received amount ≠ order total, a note is mandatory (A-04). Confirmation moves order to `confirmed`, converts reservation to sale (`onHand` and `reserved` decrease), records `collectedAmount`, emails customer. | M |
| FR-PAY-007 | Admin **rejects** with mandatory reason. Customer is emailed, may resubmit until limit; reservation 24-hour window restarts. When limit is exhausted the order is auto-cancelled with reason `claims_exhausted`. | M |
| FR-PAY-008 | Claims and decisions are immutable history; resubmission creates a new claim with `attemptNo`. | M |
| FR-PAY-009 | Do not collect PIN, OTP, passwords, or screenshots. UI states this clearly. | M |

## 9. Orders (C10, C11, A6)

| ID | Requirement | Pri |
|---|---|---|
| FR-ORD-001 | Customer order list (paginated) and detail: items with option values, snapshot prices, address snapshot, totals, payment status, fulfillment status, timeline (customer-visible events), tracking info, support contact. | M |
| FR-ORD-002 | Customer can cancel while `pending` or `confirmed` (BD-06) with a reason. Effects defined in BR-ORD-03. | M |
| FR-ORD-003 | Admin order list: search (order number, customer name/phone/email), filters (status, payment status, date range, zone), sort, pagination. | M |
| FR-ORD-004 | Admin order detail: snapshots, claims, notes, full event history, customer info, actions. | M |
| FR-ORD-005 | Admin status updates follow the state machine (BR-ORD-01); invalid transitions return `INVALID_TRANSITION`. Each transition records actor, time, from, to, optional note. | M |
| FR-ORD-006 | `shipped` transition accepts optional courier name and tracking reference. `delivered` records `deliveredAt` (starts return window). | M |
| FR-ORD-007 | Admin can add internal notes (never visible to customer) and customer-visible notes (shown in timeline). | M |
| FR-ORD-008 | Admin can cancel orders in `pending`, `confirmed`, `processing` with mandatory reason. | M |
| FR-ORD-009 | If a paid order (`paymentStatus=confirmed`) is cancelled, `paymentStatus → refund_due`; admin later records a manual refund → `refunded` (BD-08). | M |
| FR-ORD-010 | Order snapshots (items, prices, names, options, image, address, contact) are immutable after creation. | M |

## 10. Returns and exchanges (C12, A8)

| ID | Requirement | Pri |
|---|---|---|
| FR-RET-001 | Customer can request return or exchange for items of a `delivered` order within `returnWindowDays` of `deliveredAt`. Request includes items, quantities, reason (select + text). Exchange requires a target variant of the same product. | M |
| FR-RET-002 | One open request per order item quantity; quantities cannot exceed delivered minus already requested. | M |
| FR-RET-003 | Admin can `approve`, `reject` (reason), or `request more info` (message). Customer sees status and messages. | M |
| FR-RET-004 | Admin records `received` when goods arrive, then an inspection result (accepted/rejected), note, and whether to restock per item. Stock is restored **only** on accepted + restock (`return_restock`). | M |
| FR-RET-005 | Resolution: refund (admin records amount; order `paymentStatus` → `refund_due`/`refunded`), exchange (exchange variant stock reserved on approval, consumed on dispatch), or none. | M |
| FR-RET-006 | Return request timeline is independent from the original order and payment timelines. | M |
| FR-RET-007 | Shipping responsibility (customer / store) is recorded per request by admin. | M |

## 11. Admin dashboard, customers, notifications (A1, A9, A12, A13)

| ID | Requirement | Pri |
|---|---|---|
| FR-ADM-001 | Dashboard overview: orders today, pending payment reviews, orders to process, low-stock count, revenue (confirmed) for today/7 days/30 days, recent orders. | M |
| FR-ADM-002 | Customers list/detail: search, order history, status; admin can disable/enable an account (disabled users cannot log in; sessions revoked). | M |
| FR-ADM-003 | Admin notifications: new order, payment awaiting review, low stock, new return request. In-app list with unread count and mark-read; email to configured admin addresses. | M |
| FR-ADM-004 | Admin activity log lists audit events with filter by actor, action, target type, date. Read-only. | M |
| FR-ADM-005 | Settings (A11): store name/logo/contact, timezone display, `lowStockThreshold`, `reservationHoldHours`, `maxClaimResubmissions`, `returnWindowDays`, `maxQtyPerLine`, delivery zones (name, districts, fee, free-delivery threshold, estimated days, default flag), wallet payment methods (account number, type, instructions, active), admin notification emails, static pages. | M |
| FR-ADM-006 | Homepage manager (A20): create/reorder/hide sections; banner management (image, link, dates). | M |

## 12. Reports (A10)

| ID | Requirement | Pri |
|---|---|---|
| FR-REP-001 | Date-range reports use store timezone `Asia/Dhaka`; range and timezone are shown on every report. | M |
| FR-REP-002 | Metrics: orders count by status (cancelled separate), confirmed product sales, collected payment, delivery fees, refunds recorded, discounts (0 in R1), top products (by units or by sales, switchable), best month of the selected year, period comparison (previous equal-length period, absolute and % change, zero-safe). Formulas in BR-REP-01. | M |
| FR-REP-003 | Stock alerts report: low and out-of-stock variants. | M |
| FR-REP-004 | Gross order value is never presented as cash received. | M |

## 13. Notifications and email (C13, S6)

| ID | Requirement | Pri |
|---|---|---|
| FR-EML-001 | Customer emails: password reset, order placed (with payment instructions), payment confirmed, payment rejected, order shipped, order delivered, order cancelled/expired, payment reminder (2 hours before expiry), return request updates. | M |
| FR-EML-002 | Emails never contain credentials or full sensitive data. | M |
| FR-EML-003 | Every email attempt is logged (`emailLogs`: type, recipient, status, attempts, error, related id). Failed sends retry with backoff up to 5 attempts; admin can view and manually retry. | M |
| FR-EML-004 | Email sending is asynchronous (queued) and must not block API responses or rollback orders. | M |

## 14. System behaviors (S1–S6)

| ID | Requirement | Pri |
|---|---|---|
| FR-SYS-001 | All prices, totals, fees, stock checks, and transitions are computed/validated server-side; client values are ignored. | M |
| FR-SYS-002 | Scheduled jobs: reservation expiry (every 5 min), payment-reminder (every 15 min), email retry (every 5 min), refresh-token/reset-token cleanup (daily). Jobs are idempotent and safe to run on multiple instances (DB lease). | M |
| FR-SYS-003 | Rate limiting on auth, claim submission, and admin login (NFR-SEC-006). | M |
| FR-SYS-004 | Every admin write that changes catalog, stock, settings, orders, payments, or users writes an `adminAuditEvents` record. | M |
| FR-SYS-005 | Health endpoints for liveness and readiness (DB reachable). | M |

## 15. Traceability matrix (feature → requirements)

| Feature | Requirements |
|---|---|
| V1, A20 | FR-SF-001, FR-ADM-006 |
| V2, V9 | FR-SF-002, FR-SF-003, FR-ATTR-003 |
| V3 | FR-SF-004 |
| V4, V10 | FR-SF-005..008, FR-SC-005 |
| V5, C6 | FR-CART-001..004 |
| V6 | FR-SF-011 |
| V7, A18 | FR-BR-001..003, FR-SF-010 |
| V8 | FR-CAT-008, FR-SF-012 |
| C1–C5 | FR-AUTH-001..014 |
| C7 | FR-CHK-001..007 |
| C8, C9, A7 | FR-PAY-001..009 |
| C10, C11, A6 | FR-ORD-001..010 |
| C12, A8 | FR-RET-001..007 |
| C13, S6 | FR-EML-001..004 |
| A1, A9, A12, A13, A11 | FR-ADM-001..006 |
| A2 | FR-CAT-001..008 |
| A3, A4, A21 | FR-PRD-001..015 |
| A5, S2, S3 | FR-INV-001..010 |
| A10 | FR-REP-001..004 |
| A14 | FR-PT-001..005 |
| A15 | FR-ATTR-001..003 |
| A16 | FR-OPT-001..003 |
| A17 | FR-SC-001..005 |
| A19 | FR-COL-001..002 |
| S1, S4, S5 | FR-SYS-001..004, FR-ORD-005 |
