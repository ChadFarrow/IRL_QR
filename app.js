const FEED_POLL_INTERVAL = 10000;

const qrcodeEl = document.getElementById('qrcode');
const paymentFeedEl = document.getElementById('boost-feed');

// Bech32 LNURL encoding
function bech32Encode(url) {
    const CHARSET = 'qpzry9x8gf2tvdw0s3jn54khce6mua7l';
    function polymod(values) {
        const GEN = [0x3b6a57b2, 0x26508e6d, 0x1ea119fa, 0x3d4233dd, 0x2a1462b3];
        let chk = 1;
        for (const v of values) {
            const b = chk >> 25;
            chk = ((chk & 0x1ffffff) << 5) ^ v;
            for (let i = 0; i < 5; i++) if ((b >> i) & 1) chk ^= GEN[i];
        }
        return chk;
    }
    function hrpExpand(hrp) {
        const ret = [];
        for (let i = 0; i < hrp.length; i++) ret.push(hrp.charCodeAt(i) >> 5);
        ret.push(0);
        for (let i = 0; i < hrp.length; i++) ret.push(hrp.charCodeAt(i) & 31);
        return ret;
    }
    function createChecksum(hrp, data) {
        const values = hrpExpand(hrp).concat(data).concat([0, 0, 0, 0, 0, 0]);
        const mod = polymod(values) ^ 1;
        const ret = [];
        for (let i = 0; i < 6; i++) ret.push((mod >> (5 * (5 - i))) & 31);
        return ret;
    }
    // Convert 8-bit bytes to 5-bit words
    const bytes = new TextEncoder().encode(url);
    const words = [];
    let acc = 0, bits = 0;
    for (const b of bytes) {
        acc = (acc << 8) | b;
        bits += 8;
        while (bits >= 5) {
            bits -= 5;
            words.push((acc >> bits) & 31);
        }
    }
    if (bits > 0) words.push((acc << (5 - bits)) & 31);

    const checksum = createChecksum('lnurl', words);
    let result = 'lnurl1';
    for (const w of words.concat(checksum)) result += CHARSET[w];
    return result.toUpperCase();
}

// LNURL-pay QR pointing to our API which generates invoices via NWC
function generateStaticQR() {
    const lnurlPayUrl = `${window.location.origin}/api/lnurlp`;
    const lnurl = bech32Encode(lnurlPayUrl);
    new QRCode(qrcodeEl, {
        text: lnurl,
        width: 700,
        height: 700,
        colorDark: '#000000',
        colorLight: '#ffffff',
        correctLevel: QRCode.CorrectLevel.L
    });
}

// Payment feed
function formatSats(sats) {
    return Math.abs(sats).toLocaleString() + ' sats';
}

function timeAgo(timestamp) {
    const seconds = Math.floor((Date.now() - new Date(timestamp).getTime()) / 1000);
    if (seconds < 60) return 'just now';
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return minutes + 'm ago';
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return hours + 'h ago';
    const days = Math.floor(hours / 24);
    return days + 'd ago';
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

function renderPaymentFeed(payments) {
    if (!payments || payments.length === 0) {
        paymentFeedEl.innerHTML = '<div class="feed-empty">No payments yet</div>';
        return;
    }

    paymentFeedEl.innerHTML = payments.map(payment => {
        return `
        <div class="boost-item">
            <div class="boost-header">
                <span class="boost-amount">${formatSats(payment.amount)}</span>
            </div>
            ${payment.memo ? `<div class="boost-message">${escapeHtml(payment.memo)}</div>` : ''}
            ${payment.created ? `<div class="boost-time">${timeAgo(payment.created)}</div>` : ''}
        </div>
    `;
    }).join('');
}

async function loadPaymentFeed() {
    try {
        const response = await fetch('/api/payments');
        if (!response.ok) {
            const err = await response.json().catch(() => ({ error: response.statusText }));
            const msg = err.error || JSON.stringify(err);
            console.error('Payment API error:', response.status, msg);
            paymentFeedEl.innerHTML = `<div class="feed-empty">Unable to load payments: ${escapeHtml(msg)}</div>`;
            return;
        }
        const data = await response.json();
        renderPaymentFeed(data.payments || data);
    } catch (error) {
        console.error('Failed to load payment feed:', error);
        paymentFeedEl.innerHTML = `<div class="feed-empty">Unable to load payments</div>`;
    }
}

// Init
generateStaticQR();
loadPaymentFeed();
setInterval(loadPaymentFeed, FEED_POLL_INTERVAL);
