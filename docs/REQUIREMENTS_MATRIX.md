# Angelpage Requirements Matrix (audit snapshot)

Last updated: implementation pass covering priority backlog items.

## Legend
- **DONE** — implemented and verified in code
- **PARTIAL** — works but needs ops/config, QA, or legal sign-off
- **PENDING** — not yet implemented

---

## Login, sign-up & account (#2–10)

| # | Requirement | Status | Notes |
|---|-------------|--------|-------|
| 2 | Login / sign-up / account access | DONE | USER + CHARITY + ADMIN |
| 3 | Buyer login | DONE | |
| 3 | Charity login | DONE | Fixed post-login redirect; clearer error copy |
| 4 | Password recovery | PARTIAL | Flow + CAPTCHA; needs `SENDGRID_FROM=noreply@angelpage.co.uk` verified |
| 5 | Account verification / CAPTCHA | PARTIAL | Cloudflare Turnstile when `TURNSTILE_SECRET_KEY` / site key set |
| 6 | Charity number on signup | DONE | |
| 7 | Quick email signup | DONE | Auto-login after register |
| 8 | Email confirmation on signup | PARTIAL | SendGrid domain verification required |
| 9 | See password | DONE | |
| 10 | Email newsletter | PARTIAL | Footer subscribe; SendGrid domain |

## Search & navigation (#11–17)

| # | Status |
|---|--------|
| 11–17 | DONE |

## Payment (#18–20)

| # | Status | Notes |
|---|--------|-------|
| 19–20 | DONE | Stripe PaymentIntents; profile payments are billing metadata only (no PAN/CVV) |

## Account & dashboard (#21–26)

| # | Requirement | Status | Notes |
|---|-------------|--------|-------|
| 22 | View payment methods | DONE | |
| 23 | User analytics | PARTIAL | Design QA with Wilson |
| 24 | Payment methods CRUD | DONE | |
| 25 | Data visualisation | PARTIAL | Sales now filter Paid orders only; chart uses API `salesChange` |
| 26 | Seller notifications | PARTIAL | Sold, shipped, delivered, payment failed, messages wired |

## Sell (#27–43)

| # | Status | Notes |
|---|--------|-------|
| 28–38, 42–43 | DONE | |
| 33 | PARTIAL | Charity on approve; seller sold via notifications |
| 39–41 | TBC | ShipStation integrated; buyer prefs limited by design |

## Buy (#44–58)

| # | Status | Notes |
|---|--------|-------|
| 45–51, 53–55, 58 | DONE | |
| 48–49 | DONE | Stock cap + mini-cart |
| 52 | PARTIAL | Contact de-emphasized |
| 56 | PARTIAL | Email + notification; SendGrid domain |
| 57 | PENDING | Returns / T&Cs — see OPS_RUNBOOK interim process; awaiting legal (#57) |

## Customer service (#59–62)

| # | Status | Notes |
|---|--------|-------|
| 60 | TBC | Messaging + NEW_MESSAGE notification wired |
| 61–62 | DONE | |

## Admin (#63–70)

| # | Status | Notes |
|---|--------|-------|
| 64 | DONE | |
| 65–69 | PARTIAL | Sessions analytics date bug fixed; sales = Paid only |
| 70 | DONE | Failed payments table on Analytics tab |

---

## Ops checklist (not code)

1. SendGrid: verify `angelpage.co.uk`, set `SENDGRID_FROM=noreply@angelpage.co.uk`
2. Set `FRONTEND_BASE_URL=https://staging.angelpage.co.uk` (or production)
3. OAuth: `GOOGLE_*`, `FACEBOOK_*` in frontend `.env` (+ NextAuth callback URLs)
4. Social auto-post: `META_PAGE_ACCESS_TOKEN`, `META_PAGE_ID`, optional `META_INSTAGRAM_ACCOUNT_ID`, `TIKTOK_ACCESS_TOKEN`
5. hCaptcha: `HCAPTCHA_SECRET` (backend) + `NEXT_PUBLIC_HCAPTCHA_SITE_KEY` (frontend)
6. Returns policy copy after legal sign-off
