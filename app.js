const LIGHTNING_ADDRESS = 'ChadF@coinos.io';
const FEED_POLL_INTERVAL = 10000;

const qrcodeEl = document.getElementById('qrcode');
const paymentFeedEl = document.getElementById('boost-feed');

// Static LNURL-pay QR code — scanner's wallet handles amount selection
function generateStaticQR() {
    new QRCode(qrcodeEl, {
        text: `lightning:${LIGHTNING_ADDRESS}`,
        width: 500,
        height: 500,
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
