import { BOOSTBOX_URL, getBoostBoxApiKey } from './lib/boostbox.js';

export default async function handler(req, res) {
    res.setHeader('Access-Control-Allow-Origin', '*');

    const apiKey = getBoostBoxApiKey(res);
    if (!apiKey) return;

    if (req.method === 'GET') {
        try {
            const response = await fetch(`${BOOSTBOX_URL}/boosts`, {
                headers: {
                    'X-Api-Key': apiKey,
                },
            });
            const data = await response.json();
            return res.status(response.status).json(data);
        } catch (error) {
            return res.status(502).json({ error: 'Failed to reach BoostBox' });
        }
    }

    return res.status(405).json({ error: 'Method not allowed' });
}
