const INVOICE_REFRESH_INTERVAL = 10 * 60 * 1000; // 10 minutes

// Defaults (overridden by /api/settings)
let siteSettings = {
    invoiceAmountUsd: 1.25,
    brandingTitle: 'SX-WORLDWIDE',
    pageTitle: 'SXWW - Lightning Payment',
    scanHintText: 'Scan to pay with CashApp or any Lightning wallet',
    accentColor: '#f7931a',
    gradientStart: '#5c1a1a',
    gradientMid: '#3a0e0e',
    gradientEnd: '#220808',
    backgroundColor: '#110404',
    backgroundImage: 'https://raw.githubusercontent.com/ChadFarrow/IRL_QR/refs/heads/main/curtains1.png',
    confettiColors: '#f7931a,#ffd700,#ff6600,#ffffff,#ff4500',
    qrCodes: [],
};

const qrGridEl = document.getElementById('qr-grid');

function applySettings(settings) {
    siteSettings = { ...siteSettings, ...settings };
    const root = document.documentElement;

    // Text
    document.title = siteSettings.pageTitle;
    const titleEl = document.querySelector('.header-title');
    if (titleEl) titleEl.textContent = siteSettings.brandingTitle;

    // CSS custom properties
    root.style.setProperty('--accent-color', siteSettings.accentColor);
    root.style.setProperty('--gradient-start', siteSettings.gradientStart);
    root.style.setProperty('--gradient-mid', siteSettings.gradientMid);
    root.style.setProperty('--gradient-end', siteSettings.gradientEnd);
    root.style.setProperty('--bg-color', siteSettings.backgroundColor);

    // Background image override
    const bgEl = document.querySelector('.background');
    if (bgEl) {
        if (siteSettings.backgroundImage) {
            bgEl.style.background = `url(${siteSettings.backgroundImage}) center/cover no-repeat`;
            bgEl.style.backgroundColor = siteSettings.backgroundColor;
        } else {
            bgEl.style.background = '';
            bgEl.style.backgroundColor = '';
        }
    }
}

async function loadSiteSettings() {
    try {
        const res = await fetch('/api/settings');
        if (res.ok) {
            const settings = await res.json();
            applySettings(settings);
        }
    } catch (e) {
        // Use defaults silently
    }
}

// BTC price cache (updated during invoice generation)
let cachedBtcPrice = null;

function getQrSize() {
    const count = siteSettings.qrCodes.length;
    if (window.innerWidth <= 700) return 220;
    if (count <= 2) return 400;
    if (count <= 4) return 320;
    return 260;
}

function drawLogoOnQR(qrEl, logoUrl, qrSize) {
    if (!logoUrl) return;

    // Use an overlaid <img> element instead of drawing on canvas
    // This avoids CORS issues with external logo sources
    const wrapper = document.createElement('div');
    wrapper.className = 'qr-logo-wrapper';

    // Move canvas into wrapper
    const canvas = qrEl.querySelector('canvas');
    if (!canvas) return;
    wrapper.appendChild(canvas);

    const img = document.createElement('img');
    img.className = 'qr-logo';
    img.src = logoUrl;
    img.alt = '';
    img.onerror = () => img.remove(); // Hide if logo fails to load
    wrapper.appendChild(img);

    qrEl.appendChild(wrapper);
}

async function generateLightningQR(cardEl, logoUrl) {
    const qrEl = cardEl.querySelector('.qr-code');
    const infoEl = cardEl.querySelector('.qr-info');
    qrEl.innerHTML = '<div style="color: rgba(255,255,255,0.6); padding: 40px;">Generating invoice...</div>';
    infoEl.textContent = '';

    try {
        // Fetch BTC price if not cached
        if (!cachedBtcPrice) {
            const priceRes = await fetch('https://api.coingecko.com/api/v3/simple/price?ids=bitcoin&vs_currencies=usd');
            if (!priceRes.ok) throw new Error('Failed to fetch BTC price');
            const priceData = await priceRes.json();
            cachedBtcPrice = priceData.bitcoin.usd;
        }

        const amountUsd = siteSettings.invoiceAmountUsd;
        const btcAmount = amountUsd / cachedBtcPrice;
        const sats = Math.round(btcAmount * 1e8);
        const msats = sats * 1000;

        const invoiceRes = await fetch(`/api/lnurlp?amount=${msats}`);
        if (!invoiceRes.ok) {
            const err = await invoiceRes.json().catch(() => ({}));
            throw new Error(err.error || 'Failed to generate invoice');
        }
        const invoiceData = await invoiceRes.json();
        const bolt11 = invoiceData.pr;
        if (!bolt11) throw new Error('No invoice returned');

        qrEl.innerHTML = '';
        const qrSize = getQrSize();
        new QRCode(qrEl, {
            text: bolt11.toUpperCase(),
            width: qrSize,
            height: qrSize,
            colorDark: '#000000',
            colorLight: '#ffffff',
            correctLevel: logoUrl ? QRCode.CorrectLevel.H : QRCode.CorrectLevel.L,
        });

        drawLogoOnQR(qrEl, logoUrl, qrSize);
        infoEl.textContent = `$${amountUsd.toFixed(2)} (~${sats.toLocaleString()} sats)`;
    } catch (error) {
        console.error('Invoice generation failed:', error);
        qrEl.innerHTML = `<div style="color: #ff6b6b; padding: 40px;">Failed to generate invoice: ${error.message}</div>`;
    }
}

function generateStaticQR(cardEl, value, logoUrl) {
    const qrEl = cardEl.querySelector('.qr-code');
    qrEl.innerHTML = '';
    const qrSize = getQrSize();
    new QRCode(qrEl, {
        text: value,
        width: qrSize,
        height: qrSize,
        colorDark: '#000000',
        colorLight: '#ffffff',
        correctLevel: logoUrl ? QRCode.CorrectLevel.H : QRCode.CorrectLevel.L,
    });

    drawLogoOnQR(qrEl, logoUrl, qrSize);
}

function renderQRCards() {
    const codes = siteSettings.qrCodes;
    qrGridEl.innerHTML = '';

    if (codes.length === 0) {
        qrGridEl.innerHTML = '<div class="qr-empty">No payment QR codes configured. Add them in the admin panel.</div>';
        return;
    }

    codes.forEach((qr, index) => {
        const card = document.createElement('div');
        card.className = 'qr-card';
        card.dataset.index = index;
        card.innerHTML = `
            <h2 class="qr-label">${escapeHtml(qr.label)}</h2>
            <div class="qr-code" id="qr-code-${index}"></div>
            <div class="qr-info" id="qr-info-${index}"></div>
            ${qr.hint ? `<div class="qr-hint">${escapeHtml(qr.hint)}</div>` : ''}
        `;
        qrGridEl.appendChild(card);

        if (qr.type === 'lightning') {
            generateLightningQR(card, qr.logo);
        } else {
            generateStaticQR(card, qr.value, qr.logo);
        }
    });
}

function refreshLightningInvoices() {
    const cards = qrGridEl.querySelectorAll('.qr-card');
    const codes = siteSettings.qrCodes;
    cards.forEach((card, index) => {
        if (codes[index] && codes[index].type === 'lightning') {
            cachedBtcPrice = null; // refresh price
            generateLightningQR(card, codes[index].logo);
        }
    });
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// Init — load settings first, then render QR codes
loadSiteSettings().then(() => {
    renderQRCards();
    setInterval(refreshLightningInvoices, INVOICE_REFRESH_INTERVAL);
});
