# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

A static web app that generates Bitcoin Lightning invoices for a fixed $5.00 USD payment to `chadf@fountain.fm`. Includes a step-by-step CashApp payment guide. Deployed on Vercel at https://so-big-lightning-payment.vercel.app/.

## Development

This is a vanilla HTML/CSS/JS project with no build step, no package manager, and no dependencies to install. To develop locally, serve the files with any static file server:

```bash
npx serve .
# or
python3 -m http.server
```

## Architecture

**Two pages:**

- `index.html` + `style.css` + `app.js` — Main payment page with QR code invoice generator
- `guide.html` + `guide.css` + `guide.js` — 7-step CashApp payment tutorial with screenshot carousel

**Invoice generation flow (`app.js`):**
1. Fetches BTC/USD price from CoinGecko API
2. Converts $5.00 USD to millisatoshis
3. Resolves LNURL-pay endpoint via `/.well-known/lnurlp/` (LNURL protocol)
4. Requests a Lightning invoice from the LNURL callback
5. Renders the invoice as a QR code using `qrcodejs` (loaded from CDN)

**Guide carousel (`guide.js`):** Step-based navigation with dot indicators, Previous/Next buttons, and arrow key support. Mobile layout switches from side-by-side (text + image) to stacked column.

## Key External Dependencies

- **CoinGecko API** — BTC price (`api.coingecko.com`)
- **Fountain.fm LNURL** — Invoice generation via `fountain.fm/.well-known/lnurlp/chadf`
- **qrcodejs** — QR rendering (CDN: `cdnjs.cloudflare.com`)

## Mobile Considerations

Recent commits have focused on mobile layout fixes. The guide page uses `100dvh` (dynamic viewport height) and has extensive mobile-specific CSS in `guide.css` (overflow, touch targets, image visibility). Test mobile layout carefully when modifying the guide page.
