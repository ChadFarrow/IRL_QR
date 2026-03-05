const BOOSTBOX_URL = 'https://tardbox.com';

export default async function handler(req, res) {
    const apiKey = process.env.BOOSTBOX_API_KEY;
    if (!apiKey) {
        return res.status(500).json({ error: 'BOOSTBOX_API_KEY not configured' });
    }

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
