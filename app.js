const LIGHTNING_ADDRESS = 'chadf@fountain.fm';
const FEED_POLL_INTERVAL = 30000;

const qrcodeEl = document.getElementById('qrcode');
const boostFeedEl = document.getElementById('boost-feed');

// Static LNURL-pay QR code — scanner's wallet handles amount selection
function generateStaticQR() {
    new QRCode(qrcodeEl, {
        text: `lightning:${LIGHTNING_ADDRESS}`,
        width: 280,
        height: 280,
        colorDark: '#000000',
        colorLight: '#ffffff',
        correctLevel: QRCode.CorrectLevel.L
    });
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

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
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

// Init
generateStaticQR();
loadBoostFeed();
setInterval(loadBoostFeed, FEED_POLL_INTERVAL);
