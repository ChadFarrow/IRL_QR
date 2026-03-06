const COINOS_API = 'https://coinos.io';

let cachedToken = null;
let tokenExpiry = 0;

async function getToken() {
    if (cachedToken && Date.now() < tokenExpiry) return cachedToken;

    const username = process.env.COINOS_USERNAME;
    const password = process.env.COINOS_PASSWORD;
    if (!username || !password) throw new Error('Missing env vars: COINOS_USERNAME and COINOS_PASSWORD must be set');

    const response = await fetch(`${COINOS_API}/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
    });

    if (!response.ok) {
        const body = await response.text();
        throw new Error(`Coinos login failed (${response.status}): ${body}`);
    }

    const data = await response.json();
    cachedToken = data.token;
    // Cache for 4 days (token lasts ~5 days)
    tokenExpiry = Date.now() + 4 * 24 * 60 * 60 * 1000;
    return cachedToken;
}

async function fetchPayments(token) {
    const url = `${COINOS_API}/payments?limit=50&received=true`;
    const response = await fetch(url, {
        headers: { Authorization: `Bearer ${token}` },
    });
    if (!response.ok) {
        const body = await response.text();
        throw new Error(`Coinos payments API (${response.status}): ${body}`);
    }
    return response.json();
}

export default async function handler(req, res) {
    if (req.method !== 'GET') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    try {
        let token = await getToken();
        try {
            const data = await fetchPayments(token);
            return res.status(200).json(data);
        } catch (firstErr) {
            // Token may have expired, clear cache and retry once
            console.error('First attempt failed, retrying with fresh token:', firstErr.message);
            cachedToken = null;
            tokenExpiry = 0;
            token = await getToken();
            const data = await fetchPayments(token);
            return res.status(200).json(data);
        }
    } catch (error) {
        console.error('Coinos payments error:', error.message);
        return res.status(502).json({ error: error.message });
    }
}
