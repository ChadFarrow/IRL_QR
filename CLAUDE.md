# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

A web app that generates Bitcoin Lightning payment QR codes using AlbyHub (via NWC). Generates bolt11 invoices server-side for CashApp compatibility (CashApp requires bolt11, not LNURL). Includes an admin panel for site customization and a step-by-step CashApp payment guide. Deployed on Vercel at https://irl-qr-psi.vercel.app/.

## Development

Frontend is vanilla HTML/CSS/JS. Backend uses Vercel serverless functions (Node.js) with `@getalby/sdk` for NWC. To develop locally:

```bash
vercel dev
```

## Architecture

**Three pages:**

- `index.html` + `style.css` + `app.js` — Main payment page with QR code, payment feed, grand total, and confetti on new payments
- `guide.html` + `guide.css` + `guide.js` — 7-step CashApp payment tutorial with screenshot carousel
- `admin.html` + `admin.css` + `admin.js` — Admin panel for site settings (password-protected)

**Payment flow (`app.js`):**
1. Loads site settings from `/api/settings`
2. Fetches live BTC/USD price from CoinGecko API
3. Converts configured USD amount to millisatoshis
4. Calls `/api/lnurlp?amount={msats}` to generate a bolt11 invoice via NWC
5. Displays the bolt11 invoice in the QR code (uppercased for smaller QR)
6. Invoice auto-regenerates every 10 minutes (expiry) and immediately after a payment is detected (so the next person gets a fresh invoice)
7. Payment feed polls `/api/payments` every 10 seconds, shows sats + USD equivalent and full timestamps
8. Confetti animation triggers when a new payment is detected
9. Grand total of all visible payments shown above the QR box

**API endpoints:**
- `api/lnurlp.js` — LNURL-pay endpoint for AlbyHub. Returns payRequest metadata (step 1) or generates invoice via NWC with `description_hash` (step 2). Uses `NWC_URL`.
- `api/payments.js` — Lists incoming payments from AlbyHub via NWC. Returns amount, fees, memo, sender, comment, timestamp, payment_hash. Uses `NWC_URL`.
- `api/settings.js` — GET/POST site settings stored in Vercel Blob. POST requires `Authorization: Bearer {ADMIN_PASSWORD}`. Uses `BLOB_READ_WRITE_TOKEN`.
- `api/boost.js` / `api/boosts.js` — BoostBox integration (uses `BOOSTBOX_API_KEY`).

**Admin panel (`admin.html`):** Password-protected settings page. Configurable: branding title, page title, scan hint text, feed title, invoice amount (USD), accent color, confetti colors, background gradient colors, and background image URL. Settings stored in Vercel Blob storage. Includes live preview of color changes.

**Routing (`vercel.json`):**
- `/.well-known/lnurlp/:username` rewrites to `/api/lnurlp`

**Guide carousel (`guide.js`):** Step-based navigation with dot indicators, Previous/Next buttons, and arrow key support. Mobile layout switches from side-by-side (text + image) to stacked column.

## Key External Dependencies

- **@getalby/sdk** — NWC client for AlbyHub wallet communication
- **@vercel/blob** — Persistent settings storage
- **websocket-polyfill** — Required for NWC in Node.js serverless environment
- **qrcodejs** — QR rendering (CDN: `cdnjs.cloudflare.com`)

## Environment Variables (Vercel)

- `NWC_URL` — NWC connection string for AlbyHub wallet (invoices + payment history)
- `BLOB_READ_WRITE_TOKEN` — Vercel Blob storage token (required for admin settings)
- `ADMIN_PASSWORD` — Password for admin panel authentication
- `BOOSTBOX_API_KEY` — BoostBox API key (optional)

## Deployment Notes

- **Preview deployments** have Vercel Deployment Protection enabled by default, which returns 401 to Lightning wallets. Either disable it or test on production.
- LNURL-pay spec requires `Access-Control-Allow-Origin: *` on all API responses and `description_hash` (SHA256 of metadata) in invoices.
- CashApp requires a **$1 minimum** for Lightning payments. Invoice amount should be >= $1.00.
- After adding/changing environment variables, a redeployment is required (`vercel --prod`).

## Mobile Considerations

The guide page uses `100dvh` (dynamic viewport height) and has extensive mobile-specific CSS in `guide.css` (overflow, touch targets, image visibility). Test mobile layout carefully when modifying the guide page.

## CSS Architecture

`style.css` uses CSS custom properties (`:root` vars) for theming: `--accent-color`, `--gradient-start`, `--gradient-mid`, `--gradient-end`, `--bg-color`. These are dynamically updated by `app.js` when settings are loaded from the API.
