const FEED_POLL_INTERVAL = 10000;

const qrcodeEl = document.getElementById('qrcode');
const paymentFeedEl = document.getElementById('boost-feed');

let currentWallet = 'albyhub';

function getLightningAddress() {
    if (currentWallet === 'coinos') return 'ChadF@coinos.io';
    return `sxworldwide@${window.location.hostname}`;
}

function generateStaticQR() {
    qrcodeEl.innerHTML = '';
    const lightningAddress = getLightningAddress();
    new QRCode(qrcodeEl, {
        text: `lightning:${lightningAddress}`,
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
