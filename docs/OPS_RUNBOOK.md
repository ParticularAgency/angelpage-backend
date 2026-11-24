# Angelpage Ops Runbook

Day-2 operations for staging / production.

## Bootstrap Super Admin

Public admin registration is disabled. Options:

1. **Team panel** — existing Super Admin creates OPS / CONTENT / FINANCE via `/admin` → Team
2. **One-time seed** — insert an Admin document with hashed password and `role: "ADMIN"` using a secure offline script (do not expose via HTTP)

## Escrow & disputes

| Step | Who | Where |
|------|-----|--------|
| Funds held after paid order | System | Order `escrowStatus: HELD` |
| Auto-release after 14 days | Worker | `escrowAutoRelease.service` |
| Manual release | OPS / Super | `/admin` → Operations → Escrow |
| Buyer dispute | Buyer | Order dispute API / account UI |
| Resolve dispute | OPS / Super | Operations → Disputes |

Ensure SendGrid is configured so release / dispute emails deliver.

## Charity Shopify / Woo sync

1. Charity account → Integration: store URL + API credentials
2. Test connection, then Sync
3. Products import as draft / pending review
4. Production checklist: `INTEGRATION_ENCRYPTION_KEY`, rate limits, webhook HMAC (`SHOPIFY_WEBHOOK_SECRET`)

Until HMAC is configured, Shopify inbound webhooks return `503`/`401`.

## Returns / refunds (policy gap)

Legal returns & T&Cs (#57) are still pending product/legal sign-off.

Interim ops:

1. Prefer Stripe dashboard refunds for card payments
2. Mark order disputed / cancelled in admin Operations
3. Do not release escrow until refund decision is recorded
4. Publish buyer-facing returns policy before full launch

## Webhooks checklist

| Endpoint | Secret env | Status |
|----------|------------|--------|
| `/api/webhooks/stripe` | `STRIPE_WEBHOOK_SECRET` | Verified |
| `/api/webhooks/shopify` | `SHOPIFY_WEBHOOK_SECRET` | HMAC required |
| `/api/webhooks/ebay` | `EBAY_WEBHOOK_VERIFICATION_TOKEN` | Token required |

## Affiliate / social workers

- Redis (`REDIS_URL`) required for BullMQ scheduled posts & affiliate sync
- Meta / TikTok tokens on backend; sellers opt in per listing
- eBay affiliate import remains partial — treat as growth beta

## PCI cleanup

If legacy documents still contain `accountNumber` / `cvvNumber` / `expiryDate`, run a one-time Mongo `$unset` across User, Charity, Admin, Order collections and rotate any secrets that may have been logged.
