const COINOS_API = 'https://coinos.io';

let cachedToken = null;
let tokenExpiry = 0;

async function getToken() {
    if (cachedToken && Date.now() < tokenExpiry) return cachedToken;

    const username = process.env.COINOS_USERNAME;
    const password = process.env.COINOS_PASSWORD;
    if (!username || !password) throw new Error('COINOS_USERNAME and COINOS_PASSWORD not configured');

    const response = await fetch(`${COINOS_API}/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
    });

    if (!response.ok) throw new Error('Coinos login failed');

    const data = await response.json();
    cachedToken = data.token;
    // Cache for 4 days (token lasts ~5 days)
    tokenExpiry = Date.now() + 4 * 24 * 60 * 60 * 1000;
    return cachedToken;
}

export default async function handler(req, res) {
    if (req.method !== 'GET') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    try {
        const token = await getToken();

        const response = await fetch(`${COINOS_API}/payments`, {
            headers: {
                Authorization: `Bearer ${token}`,
            },
        });

        if (!response.ok) {
            // Token may have expired, clear cache and retry once
            cachedToken = null;
            tokenExpiry = 0;
            const retryToken = await getToken();
            const retry = await fetch(`${COINOS_API}/payments`, {
                headers: { Authorization: `Bearer ${retryToken}` },
            });
            if (!retry.ok) return res.status(502).json({ error: 'Failed to fetch payments from Coinos' });
            const data = await retry.json();
            return res.status(200).json(data);
        }

        const data = await response.json();
        return res.status(200).json(data);
    } catch (error) {
        console.error('Coinos payments error:', error.message);
        return res.status(502).json({ error: 'Failed to reach Coinos API' });
    }
}
