const FEED_POLL_INTERVAL = 10000;
const INVOICE_REFRESH_INTERVAL = 10 * 60 * 1000; // 10 minutes
const INVOICE_AMOUNT_USD = 1.25;

const qrcodeEl = document.getElementById('qrcode');
const paymentFeedEl = document.getElementById('boost-feed');
const invoiceInfoEl = document.getElementById('invoice-info');

let currentWallet = 'albyhub';

async function generateInvoiceQR() {
    qrcodeEl.innerHTML = '<div style="color: rgba(255,255,255,0.6); padding: 40px;">Generating invoice...</div>';
    invoiceInfoEl.textContent = '';
    try {
        // 1. Fetch current BTC price
        const priceRes = await fetch('https://api.coingecko.com/api/v3/simple/price?ids=bitcoin&vs_currencies=usd');
        if (!priceRes.ok) throw new Error('Failed to fetch BTC price');
        const priceData = await priceRes.json();
        const btcPrice = priceData.bitcoin.usd;

        // 2. Convert USD to millisatoshis
        const btcAmount = INVOICE_AMOUNT_USD / btcPrice;
        const sats = Math.round(btcAmount * 1e8);
        const msats = sats * 1000;

        // 3. Call LNURL-pay callback with amount to get bolt11 invoice
        const invoiceRes = await fetch(`/api/lnurlp?amount=${msats}`);
        if (!invoiceRes.ok) {
            const err = await invoiceRes.json().catch(() => ({}));
            throw new Error(err.error || 'Failed to generate invoice');
        }
        const invoiceData = await invoiceRes.json();
        const bolt11 = invoiceData.pr;

        if (!bolt11) throw new Error('No invoice returned');

        // 4. Display bolt11 invoice in QR code
        qrcodeEl.innerHTML = '';
        const qrSize = window.innerWidth <= 700 ? 260 : 500;
        new QRCode(qrcodeEl, {
            text: bolt11.toUpperCase(),
            width: qrSize,
            height: qrSize,
            colorDark: '#000000',
            colorLight: '#ffffff',
            correctLevel: QRCode.CorrectLevel.L
        });

        // 5. Show amount info
        invoiceInfoEl.textContent = `$${INVOICE_AMOUNT_USD.toFixed(2)} (~${sats.toLocaleString()} sats)`;

    } catch (error) {
        console.error('Invoice generation failed:', error);
        qrcodeEl.innerHTML = `<div style="color: #ff6b6b; padding: 40px;">Failed to generate invoice: ${error.message}</div>`;
    }
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
        const endpoint = '/api/payments';
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
                generateInvoiceQR(); // fresh invoice for the next person
            }
            lastPaymentId = newestId;
        }
        renderPaymentFeed(payments);
    } catch (error) {
        console.error('Failed to load payment feed:', error);
        paymentFeedEl.innerHTML = `<div class="feed-empty">Unable to load payments</div>`;
    }
}

// Init
generateInvoiceQR();
setInterval(generateInvoiceQR, INVOICE_REFRESH_INTERVAL);
loadPaymentFeed();
setInterval(loadPaymentFeed, FEED_POLL_INTERVAL);
