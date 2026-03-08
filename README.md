# SX-WORLDWIDE Lightning Payment

A web app that generates Bitcoin Lightning bolt11 invoice QR codes for CashApp and Lightning wallet payments. Includes an admin panel for site customization and a step-by-step CashApp payment guide.

## Live Pages

- [Payment Page](https://irl-qr-psi.vercel.app/)
- [CashApp Guide](https://irl-qr-psi.vercel.app/guide.html)
- [Admin Panel](https://irl-qr-psi.vercel.app/admin.html)

## How It Works

1. The payment page generates a bolt11 invoice QR code using live BTC pricing
2. Users can pay with CashApp (USD balance) or any Lightning wallet
3. Invoice auto-regenerates after payment or every 10 minutes
4. Recent payments appear in a live feed with confetti on new payments

## Development

```bash
vercel dev
```

## Environment Variables

- `NWC_URL` — NWC connection string for wallet (invoices + payment history)
- `BLOB_READ_WRITE_TOKEN` — Vercel Blob storage token (for admin settings)
- `ADMIN_PASSWORD` — Password for admin panel
- `BOOSTBOX_API_KEY` — BoostBox API key (optional)
