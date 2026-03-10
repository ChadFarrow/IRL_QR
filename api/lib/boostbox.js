export const BOOSTBOX_URL = 'https://tardbox.com';

export function getBoostBoxApiKey(res) {
    const apiKey = process.env.BOOSTBOX_API_KEY;
    if (!apiKey) {
        res.status(500).json({ error: 'BOOSTBOX_API_KEY not configured' });
        return null;
    }
    return apiKey;
}
