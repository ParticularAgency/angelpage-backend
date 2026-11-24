# Angelpage Partner Bulk Listing API

REST endpoint for partners, charities, and integrations to create multiple product listings in one request.

> Status: **production-ready for authenticated sellers**. Prefer this over one-off scrapes when charities have inventory feeds. See also charity Integration sync (Shopify/Woo) under `/api/charity/integration/*`.

## Endpoint

```
POST /api/products/bulk
Authorization: Bearer <access_token>
Content-Type: application/json
```

**Roles:** `USER`, `CHARITY` (seller accounts with valid JWT)

## Request body

```json
{
  "status": "PENDING_REVIEW",
  "products": [
    {
      "name": "Vintage wool coat",
      "price": 45.00,
      "category": "Clothing",
      "subcategory": "Coats & jackets",
      "condition": "Good",
      "brand": "Burberry",
      "quantity": 1,
      "charity": "<charityObjectId>",
      "charityProfit": 40.50,
      "additionalInfo": "Size M, minor wear on cuffs"
    }
  ]
}
```

### Fields per product

| Field | Required | Notes |
|-------|----------|-------|
| `name` | Yes | Listing title |
| `price` | Yes | GBP, minimum £1 |
| `category` | Yes | Must match Angelpage category set |
| `charity` | Yes for USER | Charity ObjectId receiving 90% |
| `subcategory` | No | |
| `condition` | No | |
| `brand` | No | |
| `quantity` | No | Default 1 |
| `charityProfit` | No | Auto-calculated as 90% of price if omitted |
| `additionalInfo` | No | Description |

### Bulk options

| Field | Default | Notes |
|-------|---------|-------|
| `status` | `PENDING_REVIEW` | Use `DRAFT` to save without review queue. `LIVE` is mapped to `PENDING_REVIEW`. |

**Limit:** 50 products per request.

## Response

```json
{
  "message": "Bulk upload completed",
  "created": [{ "_id": "...", "name": "...", "status": "PENDING_REVIEW" }],
  "failed": [{ "index": 2, "error": "name, price, and category are required" }]
}
```

## CSV / Excel (sellers)

Sellers can bulk list via the web UI at `/product/bulk-list` (CSV or Excel). The file is parsed client-side and sent to the same `POST /products/bulk` endpoint.

## Images

Bulk JSON creates listings **without images**. Add images later via:

- `PUT /api/products/:productId` (single listing edit), or
- `POST /api/products/create` with `multipart/form-data` for one product with images.

Future: presigned URL batch image upload for partners.

## Webhooks (planned)

| Event | Use case |
|-------|----------|
| `product.approved` | Partner notified when listing goes live |
| `order.paid` | Inventory sync (eBay/Shopify) |

## Charity shop imports (future)

- eBay curated feed: `GET /api/products/ebay-affiliate/feed` (admin)
- Supabase charity product sync: internal `fetchCharityProducts` service

## Example (curl)

```bash
curl -X POST "$API_URL/products/bulk" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "products": [
      {
        "name": "Test item",
        "price": 10,
        "category": "Other",
        "charity": "CHARITY_ID_HERE"
      }
    ]
  }'
```

## Errors

| Code | Meaning |
|------|---------|
| 400 | Invalid body, missing fields, or >50 products |
| 401 | Missing or expired token |
| 403 | Wrong role or not allowed |
