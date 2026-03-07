import 'websocket-polyfill';
import { NWCClient } from '@getalby/sdk/nwc';

function parseMemo(description) {
    if (!description) return '';
    // NWC descriptions can be JSON metadata like:
    // [["text/plain","Paying chadf@coinos.io"],["text/identifier","chadf@coinos.io"]]
    try {
        const parsed = JSON.parse(description);
        if (Array.isArray(parsed)) {
            const textEntry = parsed.find(e => Array.isArray(e) && e[0] === 'text/plain');
            if (textEntry) return textEntry[1] || '';
        }
    } catch {
        // Not JSON, use as-is
    }
    return description;
}

export default async function handler(req, res) {
    if (req.method !== 'GET') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    const nwcUrl = process.env.ALBYHUB_NWC_URL;
    if (!nwcUrl) {
        return res.status(500).json({ error: 'Missing env var: NWC_URL must be set' });
    }

    let client;
    try {
        client = new NWCClient({ nostrWalletConnectUrl: nwcUrl });
        const { transactions } = await client.listTransactions({
            type: 'incoming',
            limit: 20,
        });

        // Convert NWC transactions to the format app.js expects
        const payments = transactions
            .filter(t => t.state === 'settled')
            .map(t => ({
                id: t.payment_hash || '',
                amount: Math.round(t.amount / 1000), // msats -> sats
                fees: t.fees_paid ? Math.round(t.fees_paid / 1000) : 0,
                memo: parseMemo(t.description),
                sender: t.metadata?.payer_data?.name || '',
                comment: t.metadata?.comment || '',
                created: t.settled_at ? t.settled_at * 1000 : t.created_at * 1000,
                preimage: t.preimage || '',
                payment_hash: t.payment_hash || '',
            }));

        return res.status(200).json({ payments });
    } catch (error) {
        console.error('NWC payments error:', error.message);
        return res.status(502).json({ error: error.message });
    } finally {
        if (client) client.close();
    }
}
