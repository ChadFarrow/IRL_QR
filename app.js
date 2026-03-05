const LIGHTNING_ADDRESS = 'chadf@fountain.fm';
const USD_AMOUNT = 5.00;
const FEED_POLL_INTERVAL = 30000;

const statusEl = document.getElementById('status');
const qrcodeEl = document.getElementById('qrcode');
const refreshBtn = document.getElementById('refresh');
const boostFeedEl = document.getElementById('boost-feed');

async function getBtcPrice() {
    const response = await fetch('https://api.coingecko.com/api/v3/simple/price?ids=bitcoin&vs_currencies=usd');
    const data = await response.json();
    return data.bitcoin.usd;
}

async function getLnurlPayInfo(lightningAddress) {
    const [name, domain] = lightningAddress.split('@');
    const url = `https://${domain}/.well-known/lnurlp/${name}`;
    const response = await fetch(url);
    return response.json();
}

async function getInvoice(callback, amountMsats) {
    const url = `${callback}?amount=${amountMsats}`;
    const response = await fetch(url);
    return response.json();
}

function clearQR() {
    qrcodeEl.innerHTML = '';
}

function generateQR(invoice) {
    clearQR();
    new QRCode(qrcodeEl, {
        text: invoice.toUpperCase(),
        width: 280,
        height: 280,
        colorDark: '#000000',
        colorLight: '#ffffff',
        correctLevel: QRCode.CorrectLevel.L
    });
}

async function generateInvoice() {
    try {
        statusEl.textContent = 'Fetching BTC price...';
        statusEl.className = 'status';
        statusEl.style.display = 'block';
        clearQR();

        // Get current BTC price
        const btcPrice = await getBtcPrice();

        // Calculate sats (1 BTC = 100,000,000 sats)
        const btcAmount = USD_AMOUNT / btcPrice;
        const sats = Math.round(btcAmount * 100000000);
        const msats = sats * 1000;

        statusEl.textContent = 'Getting invoice...';

        // Get LNURL-pay info
        const lnurlInfo = await getLnurlPayInfo(LIGHTNING_ADDRESS);

        if (lnurlInfo.status === 'ERROR') {
            throw new Error(lnurlInfo.reason || 'Failed to get LNURL info');
        }

        // Check amount bounds
        if (msats < lnurlInfo.minSendable || msats > lnurlInfo.maxSendable) {
            throw new Error(`Amount out of range. Min: ${lnurlInfo.minSendable/1000} sats, Max: ${lnurlInfo.maxSendable/1000} sats`);
        }

        // Get invoice
        const invoiceData = await getInvoice(lnurlInfo.callback, msats);

        if (invoiceData.status === 'ERROR') {
            throw new Error(invoiceData.reason || 'Failed to get invoice');
        }

        // Generate QR code
        generateQR(invoiceData.pr);

        statusEl.style.display = 'none';

        // Store boost metadata via proxy
        storeBoostMetadata(msats, sats);

    } catch (error) {
        console.error('Error:', error);
        statusEl.textContent = error.message || 'Failed to generate invoice';
        statusEl.className = 'status error';
    }
}

refreshBtn.addEventListener('click', generateInvoice);

// Info modal
const infoBtn = document.getElementById('info-btn');
const modal = document.getElementById('info-modal');
const closeBtn = document.getElementById('close-modal');

infoBtn.addEventListener('click', () => modal.classList.add('active'));
closeBtn.addEventListener('click', () => modal.classList.remove('active'));
modal.addEventListener('click', (e) => {
    if (e.target === modal) modal.classList.remove('active');
});

// Boost metadata
async function storeBoostMetadata(msats, sats) {
    try {
        const metadata = {
            action: 'boost',
            value_msat: msats,
            value_msat_total: msats,
            app_name: 'So Big Lightning Payment',
            sender_name: 'IRL QR',
            recipient_name: 'chadf',
            recipient_address: LIGHTNING_ADDRESS,
            message: `$${USD_AMOUNT.toFixed(2)} Lightning payment via IRL QR`,
            timestamp: new Date().toISOString(),
        };
        await fetch('/api/boost', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(metadata),
        });
    } catch (error) {
        console.error('Failed to store boost metadata:', error);
    }
}

// Payment feed
function formatSats(msats) {
    const sats = Math.round(msats / 1000);
    return sats.toLocaleString() + ' sats';
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

function renderBoostFeed(boosts) {
    if (!boosts || boosts.length === 0) {
        boostFeedEl.innerHTML = '<div class="feed-empty">No payments yet</div>';
        return;
    }

    boostFeedEl.innerHTML = boosts.map(boost => `
        <div class="boost-item">
            <div class="boost-header">
                <span class="boost-sender">${escapeHtml(boost.sender_name || 'Anonymous')}</span>
                <span class="boost-amount">${formatSats(boost.value_msat || 0)}</span>
            </div>
            ${boost.message ? `<div class="boost-message">${escapeHtml(boost.message)}</div>` : ''}
            ${boost.timestamp ? `<div class="boost-time">${timeAgo(boost.timestamp)}</div>` : ''}
        </div>
    `).join('');
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

async function loadBoostFeed() {
    try {
        const response = await fetch('/api/boosts');
        if (!response.ok) return;
        const boosts = await response.json();
        renderBoostFeed(boosts);
    } catch (error) {
        console.error('Failed to load boost feed:', error);
    }
}

// Generate invoice on page load
generateInvoice();
loadBoostFeed();
setInterval(loadBoostFeed, FEED_POLL_INTERVAL);
