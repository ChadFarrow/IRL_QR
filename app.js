const LIGHTNING_ADDRESS = 'sobig@fountain.fm';
const USD_AMOUNT = 1.25;

const statusEl = document.getElementById('status');
const qrcodeEl = document.getElementById('qrcode');
const refreshBtn = document.getElementById('refresh');

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

// Generate invoice on page load
generateInvoice();
