# 05 — API SPECIFICATION

Base URL: `/api/v1` · JSON only · UTF-8 · Money in **poisha integers** · Dates ISO-8601 UTC.

## 1. Conventions

### 1.1 Auth levels
| Tag | Meaning |
|---|---|
| `public` | No auth |
| `auth` | Logged-in user (customer or admin); ownership checked for resources |
| `admin` | Role `admin` required |

Auth by cookies (TD-03). State-changing requests (`POST/PUT/PATCH/DELETE`) must send `X-CSRF-Token` (value from `GET /auth/csrf`), except `login`, `signup`, `forgot-password`, `reset-password` which are protected by rate limits and origin checks.

### 1.2 Envelopes
Success:
```json
{ "success": true, "data": { }, "meta": { "page": 1, "limit": 20, "total": 134, "totalPages": 7 } }
```
Error:
```json
{ "success": false, "error": { "code": "INSUFFICIENT_STOCK", "message": "Some items are no longer available.", "details": [ { "variantId": "…", "available": 0 } ] }, "requestId": "req_…" }
```

### 1.3 Headers
`X-Request-Id` (response) · `Idempotency-Key` (required on `POST /orders`) · `X-CSRF-Token` · `Retry-After` on 429.

### 1.4 Common query params (lists)
`page`, `limit`, `sort` (e.g. `-createdAt`), `q` (search text), plus resource-specific filters.

### 1.5 HTTP status usage
200 OK · 201 Created · 204 No Content · 400 validation · 401 unauthenticated · 403 forbidden · 404 not found · 409 conflict/state · 422 business rule · 429 rate limit · 500 server error.

## 2. Error codes (stable)

| Code | HTTP | Meaning |
|---|---|---|
| VALIDATION_ERROR | 400 | Zod validation failed; `details` = field errors |
| UNAUTHENTICATED | 401 | Missing/invalid/expired session |
| FORBIDDEN | 403 | Role or ownership check failed |
| NOT_FOUND | 404 | Resource not found |
| RATE_LIMITED | 429 | Too many requests |
| EMAIL_ALREADY_REGISTERED | 409 | Signup duplicate |
| INVALID_CREDENTIALS | 401 | Login failed (generic) |
| ACCOUNT_DISABLED | 403 | User disabled |
| INVALID_RESET_TOKEN | 400 | Reset token invalid/expired/used |
| CSRF_INVALID | 403 | Missing/invalid CSRF token |
| ENTITY_IN_USE | 409 | Cannot delete used entity; archive instead |
| SLUG_TAKEN | 409 | Slug not unique |
| KEY_TAKEN | 409 | Attribute/option/type key not unique |
| CATEGORY_DEPTH_EXCEEDED | 422 | Depth > 3 |
| CATEGORY_HAS_PRODUCTS | 422 | Cannot add child to category with products |
| CATEGORY_HAS_CHILDREN | 422 | Cannot assign product to non-leaf |
| SKU_ALREADY_EXISTS | 409 | Duplicate SKU |
| PUBLISH_CHECKLIST_FAILED | 422 | `details` lists failed checks |
| INVALID_UPLOAD | 400 | Wrong type/size/folder |
| STOCK_BELOW_RESERVED | 422 | Adjustment would make onHand < reserved |
| VARIANT_UNAVAILABLE | 409 | Variant inactive/unpublished |
| INSUFFICIENT_STOCK | 409 | Not enough available; `details` per line |
| QTY_LIMIT_EXCEEDED | 422 | > `maxQtyPerLine` |
| NO_DELIVERY_ZONE | 422 | No zone for address |
| POLICY_NOT_ACCEPTED | 422 | Policies not accepted |
| ORDER_NOT_PAYABLE | 409 | Order cancelled/expired/not pending |
| CLAIM_LIMIT_REACHED | 409 | Resubmission limit reached |
| DUPLICATE_TRANSACTION_ID | 409 | Active claim exists with same method+txn |
| CLAIM_ALREADY_DECIDED | 409 | Claim not under_review |
| AMOUNT_MISMATCH | 422 | Received ≠ order total and no note |
| INVALID_TRANSITION | 409 | State machine violation |
| RETURN_WINDOW_EXPIRED | 422 | Past `returnWindowDays` |
| RETURN_QTY_EXCEEDED | 422 | More than eligible quantity |
| REFUND_EXCEEDS_COLLECTED | 422 | Refund > collected |
| IDEMPOTENCY_KEY_REQUIRED | 400 | Missing header |
| INTERNAL_ERROR | 500 | Unexpected |

## 3. Auth and account

| Method | Path | Auth | Body / Query | Response data |
|---|---|---|---|---|
| GET | /auth/csrf | public | — | `{ csrfToken }` |
| POST | /auth/signup | public | `{ name, email, phone, password }` | `{ user }` + sets cookies |
| POST | /auth/login | public | `{ email, password }` | `{ user }` + sets cookies |
| POST | /auth/logout | auth | — | 204 |
| POST | /auth/refresh | public (refresh cookie) | — | `{ user }` + rotates cookies |
| POST | /auth/forgot-password | public | `{ email }` | `{ message }` (always neutral 200) |
| POST | /auth/reset-password | public | `{ token, newPassword }` | `{ message }` |
| POST | /auth/change-password | auth | `{ currentPassword, newPassword }` | 204 |
| GET | /me | auth | — | `{ user }` |
| PATCH | /me | auth | `{ name?, phone?, profileImage?: { publicId } }` | `{ user }` |
| GET | /me/addresses | auth | — | `Address[]` |
| POST | /me/addresses | auth | `{ label, recipientName, phone, division, district, area, addressLine, postalCode?, isDefault? }` | `Address` (201) |
| PATCH | /me/addresses/:id | auth (own) | partial address | `Address` |
| DELETE | /me/addresses/:id | auth (own) | — | 204 |
| POST | /me/addresses/:id/default | auth (own) | — | `Address` |
| POST | /media/sign-upload | auth | `{ purpose: 'avatar' }` | Cloudinary `{ timestamp, signature, apiKey, cloudName, folder, uploadPreset }` |

`User` object: `{ id, name, email, phone, role, profileImage?, createdAt }`.

## 4. Public catalog and storefront

| Method | Path | Auth | Notes |
|---|---|---|---|
| GET | /storefront/home | public | Active homepage sections with resolved products/categories |
| GET | /storefront/settings | public | Store info, delivery zones (name, fee, threshold, days), active payment method labels, policy page slugs |
| GET | /catalog/categories/tree | public | Active category tree (id, name, slug, image, children[]) for mega-menu |
| GET | /catalog/categories/:slug | public | Category details, breadcrumb, banner. Old slug → 301 payload `{ redirectTo }` |
| GET | /catalog/products | public | List/search/filter (see below) |
| GET | /catalog/filters | public | Query `category`/`q`/`brand`/`collection`: returns available filters with counts |
| GET | /catalog/products/:slug | public | Product detail (see below) |
| GET | /catalog/search/suggest | public | `q` (≥ 2 chars) → top 5 products + categories |
| GET | /catalog/brands | public | Active brands |
| GET | /catalog/brands/:slug | public | Brand detail |
| GET | /catalog/collections/:slug | public | Active collection detail |
| GET | /pages/:slug | public | Published static page |
| GET | /payment-methods | public | Active methods: `[ { method, label } ]` (account numbers only revealed in order response) |

### 4.1 GET /catalog/products — query
`category` (slug; includes descendants) · `brand` (slug, repeatable) · `collection` (slug) · `q` · `minPrice`, `maxPrice` (poisha) · `inStock=true` · `featured=true` · `onSale=true` · `attr.<key>=<value>` (repeatable) · `opt.<optionKey>=<value>` (repeatable, e.g. `opt.size=L&opt.color=Black`) · `sort` = `newest|price_asc|price_desc|popular|name` · `page`, `limit`.

Item: `{ id, name, slug, brand?: {name,slug}, mainImage, secondImage?, minPrice, maxPrice, compareAtPrice?, onSale, inStock, optionSummary?: { color: ['Black','White'] } }`.

### 4.2 GET /catalog/filters — response
```json
{ "price": { "min": 49900, "max": 450000 },
  "brands": [ { "slug": "aarong", "name": "Aarong", "count": 12 } ],
  "attributes": [ { "key": "fabric", "label": "Fabric", "inputType": "select", "values": [ { "value": "silk", "label": "Silk", "count": 8 } ] } ],
  "options": [ { "key": "size", "label": "Size", "values": [ { "value": "M", "label": "M", "count": 20 } ] }, { "key": "color", "type": "color", "values": [ { "value": "Black", "colorHex": "#000", "count": 9 } ] } ],
  "availability": { "inStock": 31 } }
```

### 4.3 GET /catalog/products/:slug — response
```json
{ "id": "…", "name": "…", "slug": "…", "description": "…", "brand": { }, "category": { "id": "", "name": "", "breadcrumb": [ ] },
  "attributes": [ { "key": "fabric", "label": "Fabric", "value": "Silk", "unit": null } ],
  "images": [ { "url": "", "alt": "", "isMain": true, "optionValue": { "optionKey": "color", "value": "Black" } } ],
  "options": [ { "key": "size", "label": "Size", "type": "text", "values": [ { "value": "M", "label": "M" } ] } ],
  "variants": [ { "id": "", "sku": "", "optionValues": [ { "optionKey": "size", "value": "M" } ], "price": 120000, "salePrice": null, "effectivePrice": 120000, "available": 8, "inStock": true, "image": null } ],
  "sizeChart": { "name": "", "unit": "inch", "columns": [ { "key": "chest", "label": "Chest" } ], "rows": [ { "size": "M", "values": { "chest": 40 } } ] } ,
  "collections": [ ], "seo": { } }
```
`available` is capped at `maxQtyPerLine` for display (e.g. never reveals more than 10) — raw counts are not exposed. `sizeChart` is `null` when none resolves or the type disables charts. Draft/archived → 404. Admin preview uses `GET /admin/products/:id/preview`.

## 5. Cart (customer)

| Method | Path | Auth | Body | Notes |
|---|---|---|---|---|
| GET | /cart | auth | — | Lines with live price, availability, warnings, subtotal |
| POST | /cart/items | auth | `{ variantId, quantity }` | Adds or increases; validates variant active/published; caps by `maxQtyPerLine` |
| PATCH | /cart/items/:variantId | auth | `{ quantity }` | Set quantity (0 removes) |
| DELETE | /cart/items/:variantId | auth | — | Remove |
| DELETE | /cart | auth | — | Clear |
| POST | /cart/merge | auth | `{ items: [ { variantId, quantity } ] }` | Merge anonymous cart; returns `{ cart, adjustments: [ { variantId, reason, applied } ] }` |

Cart line response: `{ variantId, productId, name, slug, sku, optionValues, image, quantity, unitPrice, lineTotal, available, warnings: ['price_changed'|'low_stock'|'unavailable'] }`.

## 6. Checkout and orders (customer)

| Method | Path | Auth | Body | Notes |
|---|---|---|---|---|
| POST | /checkout/quote | auth | `{ addressId }` | Re-prices cart; `{ items, subtotal, discountTotal, deliveryFee, grandTotal, zone, issues: [] }` |
| POST | /orders | auth | headers `Idempotency-Key`; body below | Places order (201); idempotent |
| GET | /orders | auth | `page, limit, status?` | Own orders |
| GET | /orders/:orderNumber | auth (own) | — | Detail + customer-visible timeline |
| POST | /orders/:orderNumber/cancel | auth (own) | `{ reason: string }` | Allowed in `pending`,`confirmed` |
| POST | /orders/:orderNumber/payment-claims | auth (own) | `{ method, transactionId, senderPhone, amount }` | Creates claim (201) |
| GET | /orders/:orderNumber/payment-claims | auth (own) | — | Claim history with statuses/rejection reasons |

**POST /orders body:**
```json
{ "addressId": "…", "contact": { "name": "…", "phone": "01XXXXXXXXX" }, "customerNote": "…", "paymentMethod": "bkash", "acceptPolicies": true }
```
Items come from the server cart (client does not send items or prices).
**Response (201):**
```json
{ "order": { "orderNumber": "ORD-000123", "status": "pending", "paymentStatus": "not_submitted", "items": [ ], "totals": { }, "placedAt": "…" },
  "payment": { "method": "bkash", "accountNumber": "01XXXXXXXXX", "accountType": "personal", "instructions": "…", "amountDue": 245000, "payBefore": "2026-11-08T10:00:00Z" } }
```
**Errors:** `INSUFFICIENT_STOCK`, `VARIANT_UNAVAILABLE`, `QTY_LIMIT_EXCEEDED`, `NO_DELIVERY_ZONE`, `POLICY_NOT_ACCEPTED`, `IDEMPOTENCY_KEY_REQUIRED`.

**POST payment-claims body:** `{ "method": "bkash", "transactionId": "9XK2L7AB", "senderPhone": "01XXXXXXXXX", "amount": 245000 }`
**Errors:** `ORDER_NOT_PAYABLE`, `CLAIM_LIMIT_REACHED`, `DUPLICATE_TRANSACTION_ID`, `VALIDATION_ERROR`.

### 6.1 Returns (customer)
| Method | Path | Auth | Body |
|---|---|---|---|
| POST | /orders/:orderNumber/return-requests | auth (own) | `{ type: 'return'|'exchange', items: [ { variantId, quantity, reason, exchangeVariantId? } ], reasonNote? }` |
| GET | /return-requests | auth | own list |
| GET | /return-requests/:returnNumber | auth (own) | detail + messages |
| POST | /return-requests/:returnNumber/messages | auth (own) | `{ text }` (answer info request) |
| POST | /return-requests/:returnNumber/cancel | auth (own) | only while `requested`/`info_requested` |

## 7. Admin API (all `admin` auth; prefix `/admin`)

### 7.1 Generic CRUD pattern (catalog builder resources)
Resources: `categories`, `attributes`, `option-sets`, `product-types`, `size-charts`, `brands`, `collections`, `delivery-zones`, `pages`, `homepage/sections`.

| Method | Path | Notes |
|---|---|---|
| GET | /admin/{resource} | List; `q`, `status`, pagination |
| POST | /admin/{resource} | Create (201) |
| GET | /admin/{resource}/:id | Detail (+ `usage: { productCount }` where relevant) |
| PATCH | /admin/{resource}/:id | Partial update |
| POST | /admin/{resource}/:id/archive | Status → `archived` (or `hidden` via body `{ status }`) |
| POST | /admin/{resource}/:id/restore | Status → `active` |
| DELETE | /admin/{resource}/:id | Only if unused (`ENTITY_IN_USE` otherwise) |

Additional endpoints:
| Method | Path | Body / Notes |
|---|---|---|
| GET | /admin/categories/tree | Full tree incl. hidden/archived, inherited type/chart markers |
| POST | /admin/categories/:id/move | `{ parentId: string|null, order: number }` — validates depth/leaf rules, updates `path`, `level`, descendants |
| PUT | /admin/categories/reorder | `{ parentId: string|null, orderedIds: string[] }` |
| PUT | /admin/collections/:id/products | `{ productIds: string[] }` ordered list |
| PUT | /admin/homepage/sections/reorder | `{ orderedIds: string[] }` |
| POST | /admin/option-sets/:id/values | `{ value, label, colorHex? }` add value |
| PATCH | /admin/option-sets/:id/values/:value | `{ label?, colorHex?, hidden?, order? }` |

**Body shapes**
- Category: `{ name, slug?, parentId?, image?, banner?, description?, seo?, productTypeId?, sizeChartId?, audience?, status? }`
- Attribute: `{ name, key, inputType, options?, unit?, isFilterable, status? }`
- Option set: `{ name, key, type, values: [ { value, label, colorHex? } ] }`
- Product type: `{ name, key, attributes: [ { attributeId, required } ], optionSetIds: [ { optionSetId } ], sizeChartEnabled }`
- Size chart: `{ name, unit, columns: [ { key, label } ], rows: [ { size, values: { [columnKey]: string|number } } ] }`
- Brand: `{ name, slug?, logo?, description? }`
- Collection: `{ name, slug?, banner?, description?, startsAt?, endsAt?, status? }`
- Delivery zone: `{ name, districts: string[], fee, freeDeliveryThreshold?, estimatedDaysMin?, estimatedDaysMax?, isDefault? }`

### 7.2 Media
| Method | Path | Body | Notes |
|---|---|---|---|
| POST | /admin/media/sign-upload | `{ purpose: 'product'|'category'|'brand'|'banner'|'logo' }` | Returns signed params restricted by preset (type/size) and folder |
| POST | /admin/media/verify | `{ publicId }` | Server confirms asset exists in expected folder; returns canonical `{ publicId, url, width, height }` |

### 7.3 Products and variants
| Method | Path | Body / Notes |
|---|---|---|
| GET | /admin/products | `q` (name/SKU), `status`, `categoryId`, `brandId`, `lowStock=true`, pagination |
| POST | /admin/products | Create draft product + variants (body below) |
| GET | /admin/products/:id | Full detail incl. variants and stock |
| PATCH | /admin/products/:id | Partial update of product fields (not variants) |
| PUT | /admin/products/:id/variants | Bulk upsert variants (replace set semantics; see below) |
| PATCH | /admin/variants/:id | Update one variant (price, threshold, barcode, active, image) — not stock |
| POST | /admin/products/:id/variants/generate | `{ options: [ { optionKey, values: string[] } ] }` → preview combinations with suggested SKUs (no persistence) |
| POST | /admin/products/:id/publish | Runs publish checklist; `PUBLISH_CHECKLIST_FAILED` with `details` |
| POST | /admin/products/:id/unpublish | Back to `draft` |
| POST | /admin/products/:id/archive | |
| POST | /admin/products/:id/restore | → `draft` |
| DELETE | /admin/products/:id | Only unreferenced drafts |
| GET | /admin/products/:id/preview | Same shape as public detail, works for drafts |
| POST | /admin/products/bulk | `{ ids: string[], action: 'set_status'|'set_category'|'set_brand'|'adjust_price'|'add_collection'|'remove_collection', params: {…} }` |

**POST /admin/products body (abridged):**
```json
{ "name": "Silk Panjabi", "slug": "silk-panjabi", "productCode": "PJ01", "categoryId": "…", "brandId": "…",
  "description": "…", "attributeValues": [ { "key": "fabric", "value": "silk" } ],
  "images": [ { "publicId": "…", "alt": "…", "isMain": true, "order": 0, "optionValue": { "optionKey": "color", "value": "Black" } } ],
  "regularPrice": 250000, "salePrice": 220000, "saleStartsAt": null, "saleEndsAt": null,
  "collectionIds": [ ], "tags": [ ], "sizeChartId": null, "isFeatured": false,
  "optionKeys": [ "size", "color" ],
  "variants": [ { "sku": "PJ01-BLK-M", "optionValues": [ { "optionKey": "size", "value": "M" }, { "optionKey": "color", "value": "Black" } ], "price": null, "salePrice": null, "initialStock": 8, "lowStockThreshold": null, "isActive": true } ] }
```
`initialStock` creates `stockMovements(type:'initial')`. Stock is changed only via inventory endpoints afterwards.

**PUT /admin/products/:id/variants:** body `{ variants: [ { id?, sku, optionValues, price?, salePrice?, barcode?, lowStockThreshold?, isActive, image? } ] }`. Existing variants omitted from the list that have orders/stock history are deactivated (never deleted).

### 7.4 Inventory
| Method | Path | Body / Query |
|---|---|---|
| GET | /admin/inventory | `q`, `filter=low|out|all`, `categoryId`, `brandId`, pagination → rows with `onHand, reserved, available, threshold` |
| POST | /admin/inventory/adjust | `{ variantId, mode: 'delta'|'set', value: number, reason: 'new_stock'|'count_mismatch'|'damaged_lost'|'return_restock'|'other', note? }` |
| POST | /admin/inventory/bulk-adjust | `{ adjustments: [ { variantId, mode, value } ], reason, note? }` (atomic) |
| GET | /admin/inventory/movements | `variantId`, `type`, `from`, `to`, pagination |
| GET | /admin/inventory/low-stock | Variants with `available ≤ threshold` |

### 7.5 Orders and payments
| Method | Path | Body / Notes |
|---|---|---|
| GET | /admin/orders | `q` (order number/name/phone/email), `status`, `paymentStatus`, `from`, `to`, `zoneId`, pagination |
| GET | /admin/orders/:orderNumber | Full: snapshots, claims, events (incl. internal), customer |
| POST | /admin/orders/:orderNumber/status | `{ to: 'processing'|'shipped'|'delivered', note?, courier?, trackingRef? }` (`confirmed` is set only by payment confirmation) |
| POST | /admin/orders/:orderNumber/cancel | `{ reason: CancelReason, note }` (note mandatory) |
| POST | /admin/orders/:orderNumber/notes | `{ text, visibility: 'internal'|'customer' }` |
| POST | /admin/orders/:orderNumber/refund | `{ amount, method, reference?, note? }` (requires `paymentStatus = refund_due`) |
| GET | /admin/payment-claims | `status` (default `under_review`), `method`, `q` (order number/txn ID/phone), `from`, `to`, pagination (oldest first for queue) |
| GET | /admin/payment-claims/:id | Claim + order summary + history of claims for the order |
| POST | /admin/payment-claims/:id/confirm | `{ receivedAmount: number, note? }` — note required if `receivedAmount ≠ grandTotal` |
| POST | /admin/payment-claims/:id/reject | `{ reason: string }` |

### 7.6 Returns
| Method | Path | Body |
|---|---|---|
| GET | /admin/return-requests | `status`, `q`, pagination |
| GET | /admin/return-requests/:returnNumber | detail |
| POST | /admin/return-requests/:returnNumber/decision | `{ action: 'approve'|'reject'|'request_info', note?, shippingResponsibility? }` |
| POST | /admin/return-requests/:returnNumber/receive | `{ note? }` |
| POST | /admin/return-requests/:returnNumber/inspect | `{ items: [ { variantId, result: 'accepted'|'rejected', restock: boolean, note? } ] }` |
| POST | /admin/return-requests/:returnNumber/resolve | `{ type: 'refund'|'exchange'|'none', refundAmount?, exchangeTrackingRef?, note? }` → `completed` |
| POST | /admin/return-requests/:returnNumber/messages | `{ text }` |

### 7.7 Customers, reports, settings, logs, notifications
| Method | Path | Notes |
|---|---|---|
| GET | /admin/dashboard/summary | Today/7d/30d counts, pending reviews, to-process, low-stock count, recent orders |
| GET | /admin/customers | `q`, `status`, pagination |
| GET | /admin/customers/:id | Profile + order summary |
| POST | /admin/customers/:id/status | `{ status: 'active'|'disabled', reason? }` (disable revokes sessions) |
| GET | /admin/reports/sales-summary | `from`, `to`, `compare=previous` |
| GET | /admin/reports/orders-by-status | `from`, `to` |
| GET | /admin/reports/top-products | `from`, `to`, `by=units|sales`, `limit` |
| GET | /admin/reports/best-month | `year` |
| GET | /admin/reports/stock-alerts | — |
| GET | /admin/settings | |
| PUT | /admin/settings | Replace editable settings (validated) |
| GET | /admin/audit-events | `actorId`, `action`, `targetType`, `from`, `to`, pagination |
| GET | /admin/notifications | `unread=true`, pagination |
| POST | /admin/notifications/:id/read | |
| POST | /admin/notifications/read-all | |
| GET | /admin/email-logs | `status`, `type`, pagination |
| POST | /admin/email-logs/:id/retry | |

**GET /admin/reports/sales-summary — response:**
```json
{ "range": { "from": "2026-10-01", "to": "2026-10-31", "timezone": "Asia/Dhaka" },
  "current": { "ordersPlaced": 120, "ordersCancelled": 9, "confirmedProductSales": 18450000, "collectedPayment": 19200000, "deliveryFees": 750000, "refundsRecorded": 250000, "discounts": 0, "netProductSales": 18200000 },
  "previous": { },
  "change": { "confirmedProductSales": { "absolute": 1200000, "percent": 6.96 } } }
```
`percent` is `null` when the previous value is 0.

## 8. System endpoints
| Method | Path | Auth | Notes |
|---|---|---|---|
| GET | /health | public | Liveness `{ status: 'ok' }` |
| GET | /health/ready | public | Readiness (DB ping) |
| GET | /sitemap-data | public | Slugs and lastmod for sitemap generation (frontend builds XML) |

## 9. Authorization matrix (summary)

| Area | Visitor | Customer | Admin |
|---|---|---|---|
| Public catalog, storefront, pages | ✔ | ✔ | ✔ |
| Signup/login/reset | ✔ | — | — |
| Profile, addresses | ✘ | own | own |
| Cart, checkout, orders, claims, returns | ✘ | own | ✘ (uses admin endpoints) |
| `/admin/*` | ✘ | ✘ | ✔ |

## 10. Idempotency and concurrency notes
- `POST /orders`: unique `(userId, idempotencyKey)`; replay returns the same 201 body with header `Idempotent-Replay: true`.
- `POST .../confirm|reject`: guarded by condition `status = 'under_review'`; loser gets `CLAIM_ALREADY_DECIDED`.
- Inventory adjust: conditional update with `onHand ≥ reserved` after change.
- All multi-document changes use MongoDB transactions with retry on `TransientTransactionError` (max 3).
