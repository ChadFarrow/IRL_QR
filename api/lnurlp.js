import 'websocket-polyfill';
import { createHash } from 'crypto';
import { NWCClient } from '@getalby/sdk/nwc';

const metadata = JSON.stringify([['text/plain', 'SXWORLDWIDE Lightning Payment']]);

export default async function handler(req, res) {
    res.setHeader('Access-Control-Allow-Origin', '*');

    if (req.method !== 'GET') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    const { amount, comment } = req.query;

    // If no amount, return LNURL-pay metadata (step 1)
    if (!amount) {
        const host = req.headers.host;
        const protocol = req.headers['x-forwarded-proto'] || 'http';
        return res.status(200).json({
            callback: `${protocol}://${host}/api/lnurlp`,
            minSendable: 1838000,     // ~$1.25 at $68k BTC
            maxSendable: 1838000,     // fixed amount for testing
            metadata,
            tag: 'payRequest',
            commentAllowed: 255,
        });
    }

    // Amount provided — generate invoice via NWC (step 2)
    const nwcUrl = process.env.ALBYHUB_NWC_URL;
    if (!nwcUrl) {
        return res.status(500).json({ error: 'Missing NWC_URL' });
    }

    const msats = parseInt(amount, 10);
    if (isNaN(msats) || msats < 1000) {
        return res.status(400).json({ error: 'Invalid amount' });
    }

    const descriptionHash = createHash('sha256').update(metadata).digest('hex');

    let client;
    try {
        client = new NWCClient({ nostrWalletConnectUrl: nwcUrl });
        const invoiceParams = {
            amount: msats,
            description_hash: descriptionHash,
        };
        if (comment) {
            invoiceParams.metadata = { comment: comment.slice(0, 255) };
        }
        const invoice = await client.makeInvoice(invoiceParams);

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
