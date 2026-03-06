import 'websocket-polyfill';
import { NWCClient } from '@getalby/sdk/nwc';

export default async function handler(req, res) {
    if (req.method !== 'GET') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    const nwcUrl = process.env.NWC_URL;
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
                amount: Math.round(t.amount / 1000), // msats -> sats
                memo: t.description || '',
                created: t.settled_at ? t.settled_at * 1000 : t.created_at * 1000,
            }));

        return res.status(200).json({ payments });
    } catch (error) {
        console.error('NWC payments error:', error.message);
        return res.status(502).json({ error: error.message });
    } finally {
        if (client) client.close();
    }
}
