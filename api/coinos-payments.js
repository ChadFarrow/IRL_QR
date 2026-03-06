let authToken = null;

async function getToken() {
    if (authToken) return authToken;

    const res = await fetch('https://coinos.io/api/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            username: process.env.COINOS_USERNAME,
            password: process.env.COINOS_PASSWORD,
        }),
    });

    if (!res.ok) throw new Error('Coinos login failed');
    const data = await res.json();
    authToken = data.token;
    return authToken;
}

export default async function handler(req, res) {
    res.setHeader('Access-Control-Allow-Origin', '*');

    if (req.method !== 'GET') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    if (!process.env.COINOS_USERNAME || !process.env.COINOS_PASSWORD) {
        return res.status(500).json({ error: 'Missing Coinos credentials' });
    }

    try {
        const token = await getToken();
        const response = await fetch('https://coinos.io/api/payments?limit=20', {
            headers: { Authorization: `Bearer ${token}` },
        });

        if (response.status === 401) {
            authToken = null;
            const newToken = await getToken();
            const retry = await fetch('https://coinos.io/api/payments?limit=20', {
                headers: { Authorization: `Bearer ${newToken}` },
            });
            const data = await retry.json();
            return res.status(200).json({ payments: formatPayments(data) });
        }

        const data = await response.json();
        return res.status(200).json({ payments: formatPayments(data) });
    } catch (error) {
        console.error('Coinos payments error:', error.message);
        return res.status(502).json({ error: error.message });
    }
}

function formatPayments(data) {
    const list = Array.isArray(data) ? data : data.payments || [];
    return list
        .filter(p => p.amount > 0)
        .map(p => ({
            id: p.id,
            amount: Math.abs(p.amount),
            memo: p.memo || '',
            created: p.created,
        }));
}
