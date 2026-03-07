# SXWORLDWIDE Lightning Payment

A web app that generates Bitcoin Lightning payment QR codes with support for AlbyHub and Coinos wallets. Includes a step-by-step CashApp payment guide and a printable pamphlet.

## Live Pages

- [Payment Page](https://so-big-lightning-payment.vercel.app/)
- [CashApp Guide](https://so-big-lightning-payment.vercel.app/guide.html)
- [Printable Pamphlet (PDF)](https://so-big-lightning-payment.vercel.app/pamphlet.html)

## How It Works

1. The payment page displays a Lightning QR code that any Lightning wallet can scan
2. Users can pay with CashApp by following the step-by-step guide
3. CashApp converts your cash balance to Bitcoin Lightning automatically
4. Recent payments appear in a live feed with confetti on new payments

## Wallets

- **AlbyHub** — Connected via NWC. LNURL-pay endpoint at `/.well-known/lnurlp/`
- **Coinos** — Connected via NWC. Uses `ChadF@coinos.io` Lightning address

## Development

```bash
vercel dev
```

## Environment Variables

- `ALBYHUB_NWC_URL` — NWC connection string for AlbyHub wallet
- `NWC_URL` — NWC connection string for Coinos wallet
- `BOOSTBOX_API_KEY` — BoostBox API key (optional)
