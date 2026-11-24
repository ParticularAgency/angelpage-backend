# Angelpage Backend

Express + MongoDB API for the Angelpage charity marketplace.

## Stack

- Node.js ≥18 · Express · Mongoose
- JWT auth · Stripe · ShipStation · SendGrid · Cloudinary
- Optional: Redis/BullMQ, Gemini AI, Meta/TikTok, Shopify/Woo sync

## Setup

```bash
cp .env.example .env
# Set MONGO_URI (not MONGODB_URI), JWT_SECRET, Stripe, SendGrid, …
npm install
npm run dev
```

Health: `GET /api/health`

## Money policy

- Platform fee ~10% · Charity share ~90% (see `src/constants/platformPolicy.js`)
- Escrow hold: **14 days** then auto-release (or admin / dispute path)

## Security notes

- Public `POST /api/auth/register` accepts **USER** and **CHARITY** only
- Admin accounts: Team panel (`POST /api/admin/team`) or secure seed
- Never store card PAN/CVV — Stripe Elements / PaymentIntents only
- Stripe webhooks: `POST /api/webhooks/stripe` (raw body + signature)
- Shopify webhooks: `POST /api/webhooks/shopify` (HMAC via `SHOPIFY_WEBHOOK_SECRET`)
- eBay webhooks: require `EBAY_WEBHOOK_VERIFICATION_TOKEN` or requests are rejected

## Docs

- [PARTNER_BULK_API.md](./PARTNER_BULK_API.md) — bulk product create
- [OPS_RUNBOOK.md](./OPS_RUNBOOK.md) — day-2 operations
- [REQUIREMENTS_MATRIX.md](./REQUIREMENTS_MATRIX.md) — product checklist
