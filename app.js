const FEED_POLL_INTERVAL = 10000;

const qrcodeEl = document.getElementById('qrcode');
const paymentFeedEl = document.getElementById('boost-feed');

let currentWallet = 'albyhub';

// Bech32 encoding for LNURL (needed for CashApp and universal wallet compatibility)
const BECH32_CHARSET = 'qpzry9x8gf2tvdw0s3jn54khce6mua7l';

function bech32HrpExpand(hrp) {
    const ret = [];
    for (let i = 0; i < hrp.length; i++) ret.push(hrp.charCodeAt(i) >> 5);
    ret.push(0);
    for (let i = 0; i < hrp.length; i++) ret.push(hrp.charCodeAt(i) & 31);
    return ret;
}

function bech32Polymod(values) {
    const GEN = [0x3b6a57b2, 0x26508e6d, 0x1ea119fa, 0x3d4233dd, 0x2a1462b3];
    let chk = 1;
    for (let i = 0; i < values.length; i++) {
        const b = chk >> 25;
        chk = ((chk & 0x1ffffff) << 5) ^ values[i];
        for (let j = 0; j < 5; j++) {
            if ((b >> j) & 1) chk ^= GEN[j];
        }
    }
    return chk;
}

function bech32CreateChecksum(hrp, data) {
    const values = bech32HrpExpand(hrp).concat(data).concat([0, 0, 0, 0, 0, 0]);
    const polymod = bech32Polymod(values) ^ 1;
    const ret = [];
    for (let i = 0; i < 6; i++) ret.push((polymod >> (5 * (5 - i))) & 31);
    return ret;
}

function convertBits(data, fromBits, toBits, pad) {
    let acc = 0, bits = 0;
    const ret = [];
    const maxv = (1 << toBits) - 1;
    for (let i = 0; i < data.length; i++) {
        acc = (acc << fromBits) | data[i];
        bits += fromBits;
        while (bits >= toBits) {
            bits -= toBits;
            ret.push((acc >> bits) & maxv);
        }
    }
    if (pad && bits > 0) ret.push((acc << (toBits - bits)) & maxv);
    return ret;
}

function bech32Encode(hrp, data) {
    const combined = data.concat(bech32CreateChecksum(hrp, data));
    let ret = hrp + '1';
    for (let i = 0; i < combined.length; i++) ret += BECH32_CHARSET[combined[i]];
    return ret;
}

function encodeLnurl(url) {
    const encoder = new TextEncoder();
    const bytes = Array.from(encoder.encode(url));
    const data = convertBits(bytes, 8, 5, true);
    return bech32Encode('lnurl', data).toUpperCase();
}

function getLightningAddress() {
    if (currentWallet === 'coinos') return 'ChadF@coinos.io';
    return `sxworldwide@${window.location.hostname}`;
}

function getLnurlPayUrl() {
    if (currentWallet === 'coinos') return 'https://coinos.io/.well-known/lnurlp/ChadF';
    return `https://${window.location.hostname}/.well-known/lnurlp/sxworldwide`;
}

function generateStaticQR() {
    qrcodeEl.innerHTML = '';
    const lightningAddress = getLightningAddress();
    const lnurl = encodeLnurl(getLnurlPayUrl());
    new QRCode(qrcodeEl, {
        text: `lightning:${lnurl}`,
        width: 500,
        height: 500,
        colorDark: '#000000',
        colorLight: '#ffffff',
        correctLevel: QRCode.CorrectLevel.L
    });
    document.getElementById('lightning-address').textContent = lightningAddress;
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

function launchConfetti() {
    const colors = ['#f7931a', '#ffd700', '#ff6600', '#ffffff', '#ff4500'];
    for (let i = 0; i < 200; i++) {
        const el = document.createElement('div');
        el.style.cssText = `
            position:fixed;top:-10px;left:${Math.random()*100}vw;
            width:${8+Math.random()*10}px;height:${8+Math.random()*10}px;
            background:${colors[Math.floor(Math.random()*colors.length)]};
            border-radius:${Math.random()>0.5?'50%':'0'};
            pointer-events:none;z-index:9999;
            animation:confetti-fall ${1.5+Math.random()*2}s ease-in forwards;
            animation-delay:${Math.random()*0.5}s;opacity:0;
        `;
        document.body.appendChild(el);
        el.addEventListener('animationend', () => el.remove());
    }
}

let lastPaymentId = null;

function renderPaymentFeed(payments) {
    if (!payments || payments.length === 0) {
        paymentFeedEl.innerHTML = '<div class="feed-empty">No payments yet</div>';
        return;
    }

    paymentFeedEl.innerHTML = payments.map(payment => {
        return `
        <div class="boost-item">
            <div class="boost-header">
                ${payment.sender ? `<span class="boost-sender">${escapeHtml(payment.sender)}</span>` : ''}
                <span class="boost-amount">${formatSats(payment.amount)}</span>
            </div>
            ${payment.comment ? `<div class="boost-message">${escapeHtml(payment.comment)}</div>` : ''}
            ${payment.memo && !payment.comment ? `<div class="boost-message">${escapeHtml(payment.memo)}</div>` : ''}
            ${payment.created ? `<div class="boost-time">${timeAgo(payment.created)}</div>` : ''}
        </div>
    `;
    }).join('');
}

async function loadPaymentFeed() {
    try {
        const endpoint = currentWallet === 'coinos' ? '/api/coinos-payments' : '/api/payments';
        const response = await fetch(endpoint);
        if (!response.ok) {
            const err = await response.json().catch(() => ({ error: response.statusText }));
            const msg = err.error || JSON.stringify(err);
            console.error('Payment API error:', response.status, msg);
            paymentFeedEl.innerHTML = `<div class="feed-empty">Unable to load payments: ${escapeHtml(msg)}</div>`;
            return;
        }
        const data = await response.json();
        const payments = data.payments || data;
        if (payments && payments.length > 0) {
            const newestId = payments[0].id || payments[0].created;
            if (lastPaymentId !== null && newestId !== lastPaymentId) {
                launchConfetti();
            }
            lastPaymentId = newestId;
        }
        renderPaymentFeed(payments);
    } catch (error) {
        console.error('Failed to load payment feed:', error);
        paymentFeedEl.innerHTML = `<div class="feed-empty">Unable to load payments</div>`;
    }
}

// Toggle buttons
document.querySelectorAll('.toggle-btn').forEach(btn => {
    btn.addEventListener('click', () => {
        document.querySelectorAll('.toggle-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        currentWallet = btn.dataset.wallet;
        generateStaticQR();
        loadPaymentFeed();
    });
});

// Init
generateStaticQR();
loadPaymentFeed();
setInterval(loadPaymentFeed, FEED_POLL_INTERVAL);
