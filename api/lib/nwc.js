import { list } from '@vercel/blob';

export async function getNwcUrl() {
    let nwcUrl = process.env.NWC_URL;
    try {
        const { blobs } = await list({ prefix: 'settings.json' });
        if (blobs.length > 0) {
            const settingsRes = await fetch(blobs[0].url);
            const settings = await settingsRes.json();
            if (settings.nwcUrl) nwcUrl = settings.nwcUrl;
        }
    } catch (e) { /* fall back to env var */ }
    return nwcUrl;
}
