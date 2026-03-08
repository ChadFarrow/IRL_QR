import { put, list } from '@vercel/blob';

const BLOB_PATH = 'settings.json';

const DEFAULTS = {
    brandingTitle: 'SX-WORLDWIDE',
    pageTitle: 'SXWW - Lightning Payment',
    scanHintText: 'Scan to pay with CashApp or any Lightning wallet',
    invoiceAmountUsd: 1.25,
    accentColor: '#f7931a',
    gradientStart: '#5c1a1a',
    gradientMid: '#3a0e0e',
    gradientEnd: '#220808',
    backgroundColor: '#110404',
    backgroundImage: '',
    confettiColors: '#f7931a,#ffd700,#ff6600,#ffffff,#ff4500',
    feedTitle: 'Recent Payments',
};

async function readSettings() {
    const { blobs } = await list({ prefix: BLOB_PATH });
    if (blobs.length === 0) return {};
    const res = await fetch(blobs[0].url);
    return res.json();
}

export default async function handler(req, res) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    if (req.method === 'GET') {
        try {
            const stored = await readSettings();
            return res.status(200).json({ ...DEFAULTS, ...stored });
        } catch (error) {
            console.error('Failed to read settings:', error.message);
            return res.status(200).json(DEFAULTS);
        }
    }

    if (req.method === 'POST') {
        const password = process.env.ADMIN_PASSWORD;
        if (!password) {
            return res.status(500).json({ error: 'ADMIN_PASSWORD not configured' });
        }

        const auth = req.headers.authorization;
        if (!auth || auth !== `Bearer ${password}`) {
            return res.status(401).json({ error: 'Unauthorized' });
        }

        try {
            const updates = req.body;
            if (!updates || typeof updates !== 'object') {
                return res.status(400).json({ error: 'Invalid request body' });
            }

            // Only allow known keys
            const cleaned = {};
            for (const key of Object.keys(DEFAULTS)) {
                if (key in updates) {
                    cleaned[key] = updates[key];
                }
            }

            const current = await readSettings();
            const merged = { ...current, ...cleaned };
            await put(BLOB_PATH, JSON.stringify(merged), {
                access: 'public',
                addRandomSuffix: false,
            });

            return res.status(200).json({ ...DEFAULTS, ...merged });
        } catch (error) {
            console.error('Failed to save settings:', error.message);
            return res.status(500).json({ error: 'Failed to save settings' });
        }
    }

    return res.status(405).json({ error: 'Method not allowed' });
}
