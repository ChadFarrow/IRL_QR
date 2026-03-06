import 'websocket-polyfill';
import { NWCClient } from '@getalby/sdk/nwc';

export default async function handler(req, res) {
    if (req.method !== 'GET') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    const { amount } = req.query;

    // If no amount, return LNURL-pay metadata (step 1)
    if (!amount) {
        const host = req.headers.host;
        const protocol = req.headers['x-forwarded-proto'] || 'http';
        return res.status(200).json({
            callback: `${protocol}://${host}/api/lnurlp`,
            minSendable: 1000,        // 1 sat in msats
            maxSendable: 10000000000,  // 10M sats in msats
            metadata: JSON.stringify([['text/plain', 'SXWORLDWIDE Lightning Payment']]),
            tag: 'payRequest',
        });
    }

    // Amount provided — generate invoice via NWC (step 2)
    const nwcUrl = process.env.NWC_URL;
    if (!nwcUrl) {
        return res.status(500).json({ error: 'Missing NWC_URL' });
    }

    const msats = parseInt(amount, 10);
    if (isNaN(msats) || msats < 1000) {
        return res.status(400).json({ error: 'Invalid amount' });
    }

    let client;
    try {
        client = new NWCClient({ nostrWalletConnectUrl: nwcUrl });
        const invoice = await client.makeInvoice({
            amount: msats, // msats
            description: 'SXWORLDWIDE Lightning Payment',
        });

        return res.status(200).json({
            pr: invoice.invoice,
            routes: [],
        });
    } catch (error) {
        console.error('NWC make_invoice error:', error.message);
        return res.status(502).json({ error: error.message });
    } finally {
        if (client) client.close();
    }
}
