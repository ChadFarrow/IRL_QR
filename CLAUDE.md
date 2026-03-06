# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

A web app that generates Bitcoin Lightning payment QR codes with support for two wallets: AlbyHub (via NWC) and Coinos (via NWC). Includes a wallet toggle for testing and a step-by-step CashApp payment guide. Deployed on Vercel at https://so-big-lightning-payment.vercel.app/.

## Development

Frontend is vanilla HTML/CSS/JS. Backend uses Vercel serverless functions (Node.js) with `@getalby/sdk` for NWC. To develop locally:

```bash
vercel dev
```

## Architecture

**Two pages:**

- `index.html` + `style.css` + `app.js` — Main payment page with QR code, wallet toggle, payment feed, and confetti on new payments
- `guide.html` + `guide.css` + `guide.js` — 7-step CashApp payment tutorial with screenshot carousel

**Payment flow (`app.js`):**
1. UI toggle switches between AlbyHub and Coinos wallets
2. **AlbyHub**: QR encodes `lightning:sxworldwide@{domain}`, wallet resolves via `/.well-known/lnurlp/` rewrite → `/api/lnurlp` (LNURL-pay endpoint that generates invoices via NWC)
3. **Coinos**: QR encodes `lightning:ChadF@coinos.io` (Coinos handles LNURL-pay natively)
4. Payment feed polls `/api/payments` (AlbyHub) or `/api/coinos-payments` (Coinos) based on toggle
5. Confetti animation triggers when a new payment is detected

**API endpoints:**
- `api/lnurlp.js` — LNURL-pay endpoint for AlbyHub. Returns payRequest metadata (step 1) or generates invoice via NWC with `description_hash` (step 2). Uses `ALBYHUB_NWC_URL`.
- `api/payments.js` — Lists incoming payments from AlbyHub via NWC. Uses `ALBYHUB_NWC_URL`.
- `api/coinos-payments.js` — Lists incoming payments from Coinos via NWC. Uses `NWC_URL`.
- `api/boost.js` / `api/boosts.js` — BoostBox integration (uses `BOOSTBOX_API_KEY`).

**Routing (`vercel.json`):**
- `/.well-known/lnurlp/:username` rewrites to `/api/lnurlp`

**Guide carousel (`guide.js`):** Step-based navigation with dot indicators, Previous/Next buttons, and arrow key support. Mobile layout switches from side-by-side (text + image) to stacked column.

## Key External Dependencies

- **@getalby/sdk** — NWC client for AlbyHub and Coinos wallet communication
- **websocket-polyfill** — Required for NWC in Node.js serverless environment
- **qrcodejs** — QR rendering (CDN: `cdnjs.cloudflare.com`)

## Environment Variables (Vercel)

- `ALBYHUB_NWC_URL` — NWC connection string for AlbyHub wallet (invoices + payment history)
- `NWC_URL` — NWC connection string for Coinos wallet (payment history)
- `BOOSTBOX_API_KEY` — BoostBox API key (optional)

## Deployment Notes

- **Preview deployments** have Vercel Deployment Protection enabled by default, which returns 401 to Lightning wallets. Either disable it or test on production.
- LNURL-pay spec requires `Access-Control-Allow-Origin: *` on all API responses and `description_hash` (SHA256 of metadata) in invoices.

## Mobile Considerations

The guide page uses `100dvh` (dynamic viewport height) and has extensive mobile-specific CSS in `guide.css` (overflow, touch targets, image visibility). Test mobile layout carefully when modifying the guide page.
