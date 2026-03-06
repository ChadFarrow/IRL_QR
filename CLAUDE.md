# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

A static web app that generates Bitcoin Lightning payment QR codes for `ChadF@coinos.io`. Includes a step-by-step CashApp payment guide. Deployed on Vercel at https://so-big-lightning-payment.vercel.app/.

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

**Payment flow (`app.js`):**
1. Generates a static LNURL-pay QR code for `ChadF@coinos.io` (scanner's wallet handles amount)
2. Renders the QR code using `qrcodejs` (loaded from CDN)
3. Polls `/api/payments` for recent incoming payments from Coinos API

**Guide carousel (`guide.js`):** Step-based navigation with dot indicators, Previous/Next buttons, and arrow key support. Mobile layout switches from side-by-side (text + image) to stacked column.

## Key External Dependencies

- **Coinos API** — Payment history and Lightning Address (`coinos.io`)
- **qrcodejs** — QR rendering (CDN: `cdnjs.cloudflare.com`)

## Environment Variables (Vercel)

- `COINOS_USERNAME` — Coinos account username for API auth
- `COINOS_PASSWORD` — Coinos account password for API auth

## Mobile Considerations

Recent commits have focused on mobile layout fixes. The guide page uses `100dvh` (dynamic viewport height) and has extensive mobile-specific CSS in `guide.css` (overflow, touch targets, image visibility). Test mobile layout carefully when modifying the guide page.
