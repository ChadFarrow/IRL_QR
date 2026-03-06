import 'websocket-polyfill';
import { NWCClient } from '@getalby/sdk/nwc';

function parseMemo(description) {
    if (!description) return '';
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
    res.setHeader('Access-Control-Allow-Origin', '*');

    if (req.method !== 'GET') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    const nwcUrl = process.env.NWC_URL;
    if (!nwcUrl) {
        return res.status(500).json({ error: 'Missing env var: NWC_URL' });
    }

    let client;
    try {
        client = new NWCClient({ nostrWalletConnectUrl: nwcUrl });
        const { transactions } = await client.listTransactions({
            type: 'incoming',
            limit: 20,
        });

        const payments = transactions
            .filter(t => t.state === 'settled')
            .map(t => ({
                amount: Math.round(t.amount / 1000),
                memo: parseMemo(t.description),
                created: t.settled_at ? t.settled_at * 1000 : t.created_at * 1000,
            }));

        return res.status(200).json({ payments });
    } catch (error) {
        console.error('Coinos NWC payments error:', error.message);
        return res.status(502).json({ error: error.message });
    } finally {
        if (client) client.close();
    }
}
