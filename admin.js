const DEFAULTS = {
    brandingTitle: 'SX-WORLDWIDE',
    pageTitle: 'SXWW - Lightning Payment',
    scanHintText: 'Scan to pay with CashApp or any Lightning wallet',
    invoiceAmountUsd: 1.25,
    accentColor: '#f7931a',
    gradientStart: '#5c1a1a',
    gradientMid: '#3a0e0e',
    gradientEnd: '#220808',
    backgroundColor: '#110404',
    backgroundImage: '/background.png',
    confettiColors: '#f7931a,#ffd700,#ff6600,#ffffff,#ff4500',
    qrCodes: [],
    nwcUrl: '',
};

// Brand detection from URL hostnames
const BRAND_MAP = {
    'paypal.com': { label: 'PayPal', logo: 'https://www.paypalobjects.com/webstatic/icon/pp258.png' },
    'paypal.me': { label: 'PayPal', logo: 'https://www.paypalobjects.com/webstatic/icon/pp258.png' },
    'cash.app': { label: 'Cash App', logo: 'https://cash.app/icon-196.png' },
    'venmo.com': { label: 'Venmo', logo: 'https://images.ctfassets.net/gkyt4bl1j2fs/cfvn1GJyFaIw2FwAm5TJO/210be3e6c82eb7cfeebb2a0c577cb26a/venmo-touch-icon.png' },
    'strike.me': { label: 'Strike', logo: '/strike-logo.svg' },
    'getalby.com': { label: 'Alby', logo: '/alby-logo.png' },
    'fountain.fm': { label: 'Fountain', logo: '/fountain-logo.png' },
    'zelle.com': { label: 'Zelle' },
    'ko-fi.com': { label: 'Ko-fi' },
    'buymeacoffee.com': { label: 'Buy Me a Coffee' },
    'gofundme.com': { label: 'GoFundMe' },
    'patreon.com': { label: 'Patreon' },
    'givebutter.com': { label: 'Givebutter' },
    'donorbox.org': { label: 'Donorbox' },
    'square.link': { label: 'Square' },
    'stripe.com': { label: 'Stripe' },
    'checkout.stripe.com': { label: 'Stripe' },
    'donate.stripe.com': { label: 'Stripe' },
};

// Normalize shorthand payment addresses to full URLs
// e.g. "chadf@strike.me" -> "https://strike.me/chadf"
function normalizePaymentValue(value) {
    const trimmed = value.trim();
    // Match user@domain patterns (e.g. chadf@strike.me)
    const emailMatch = trimmed.match(/^([^@\s]+)@([^@\s]+\.[^@\s]+)$/);
    if (emailMatch) {
        const [, user, domain] = emailMatch;
        if (BRAND_MAP[domain]) {
            return `https://${domain}/${user}`;
        }
    }
    return trimmed;
}

function detectBrandFromUrl(url) {
    try {
        const hostname = new URL(url).hostname.replace(/^www\./, '');
        // Check exact match first, then parent domain
        if (BRAND_MAP[hostname]) return BRAND_MAP[hostname];
        const parts = hostname.split('.');
        if (parts.length > 2) {
            const parent = parts.slice(-2).join('.');
            if (BRAND_MAP[parent]) return BRAND_MAP[parent];
        }
        return null;
    } catch {
        return null;
    }
}

function getLogoUrl(url) {
    try {
        const hostname = new URL(url).hostname.replace(/^www\./, '');
        // Check BRAND_MAP for a known logo first
        const brand = BRAND_MAP[hostname];
        if (brand && brand.logo) return brand.logo;
        const parts = hostname.split('.');
        if (parts.length > 2) {
            const parent = parts.slice(-2).join('.');
            if (BRAND_MAP[parent] && BRAND_MAP[parent].logo) return BRAND_MAP[parent].logo;
        }
        // Fallback to Google's favicon service
        return `https://www.google.com/s2/favicons?domain=${hostname}&sz=128`;
    } catch {
        return '';
    }
}

let authToken = '';
let qrCodes = [];

// --- Login ---
document.getElementById('login-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const pw = document.getElementById('password-input').value;
    const errorEl = document.getElementById('login-error');
    errorEl.textContent = '';

    try {
        const res = await fetch('/api/settings', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${pw}`,
            },
            body: JSON.stringify({}),
        });

        if (res.status === 401) {
            errorEl.textContent = 'Incorrect password.';
            return;
        }

        if (!res.ok) {
            const data = await res.json().catch(() => ({}));
            errorEl.textContent = data.error || 'Login failed.';
            return;
        }

        authToken = pw;
        document.getElementById('login-screen').style.display = 'none';
        document.getElementById('settings-panel').style.display = 'block';
        loadSettings();
    } catch (err) {
        errorEl.textContent = 'Connection error. Try again.';
    }
});

// --- Logout ---
document.getElementById('logout-btn').addEventListener('click', () => {
    authToken = '';
    document.getElementById('settings-panel').style.display = 'none';
    document.getElementById('login-screen').style.display = 'block';
    document.getElementById('password-input').value = '';
});

// --- Load settings ---
async function loadSettings() {
    try {
        const res = await fetch('/api/settings', {
            headers: { 'Authorization': `Bearer ${authToken}` },
        });
        const settings = await res.json();
        qrCodes = settings.qrCodes || [];
        populateForm(settings);
        renderQRCodesList();
        updatePreview(settings);
    } catch (err) {
        showStatus('Failed to load settings.', 'error');
    }
}

function populateForm(settings) {
    const form = document.getElementById('settings-form');
    for (const [key, value] of Object.entries(settings)) {
        if (key === 'qrCodes') continue; // handled separately
        const input = form.elements[key];
        if (input) {
            input.value = value;
        }
        const textInput = form.elements[key + 'Text'];
        if (textInput) {
            textInput.value = value;
        }
    }
}

function getFormData() {
    const form = document.getElementById('settings-form');
    const data = {};
    const simpleKeys = Object.keys(DEFAULTS).filter(k => k !== 'qrCodes');
    for (const key of simpleKeys) {
        const input = form.elements[key];
        if (input) {
            if (key === 'invoiceAmountUsd') {
                data[key] = parseFloat(input.value) || DEFAULTS[key];
            } else {
                data[key] = input.value;
            }
        }
    }
    // Strip internal tracking flags from QR codes before saving
    data.qrCodes = qrCodes.map(({ _autoLabel, _autoLogo, ...rest }) => rest);
    return data;
}

// --- QR Codes Management ---
function renderQRCodesList() {
    const listEl = document.getElementById('qr-codes-list');
    listEl.innerHTML = '';

    qrCodes.forEach((qr, index) => {
        const item = document.createElement('div');
        item.className = 'qr-code-item';
        item.innerHTML = `
            <div class="qr-item-header">
                <span class="qr-item-number">QR Code ${index + 1}</span>
                <button type="button" class="btn-remove" data-index="${index}">Remove</button>
            </div>
            <label>
                Type
                <select data-field="type" data-index="${index}">
                    <option value="lightning" ${qr.type === 'lightning' ? 'selected' : ''}>Lightning (auto-generates invoice)</option>
                    <option value="static" ${qr.type === 'static' ? 'selected' : ''}>Static (fixed URL/address)</option>
                </select>
            </label>
            <label class="value-label" ${qr.type === 'lightning' ? 'style="display:none"' : ''}>
                Value (URL or address)
                <input type="text" data-field="value" data-index="${index}" value="${escapeAttr(qr.value || '')}" placeholder="e.g. https://cash.app/$tag">
                <span class="auto-detect-msg" id="detect-msg-${index}"></span>
            </label>
            <label>
                Label
                <input type="text" data-field="label" data-index="${index}" value="${escapeAttr(qr.label || '')}" placeholder="Auto-detected from URL, or type manually">
            </label>
            <label>
                Logo URL (optional, shown in QR center)
                <input type="text" data-field="logo" data-index="${index}" value="${escapeAttr(qr.logo || '')}" placeholder="Auto-detected from URL">
            </label>
            <label>
                Hint text (optional)
                <input type="text" data-field="hint" data-index="${index}" value="${escapeAttr(qr.hint || '')}" placeholder="e.g. Scan with CashApp">
            </label>
        `;
        listEl.appendChild(item);
    });

    // Bind events
    listEl.querySelectorAll('.btn-remove').forEach(btn => {
        btn.addEventListener('click', () => {
            const idx = parseInt(btn.dataset.index);
            qrCodes.splice(idx, 1);
            renderQRCodesList();
        });
    });

    listEl.querySelectorAll('input, select').forEach(input => {
        input.addEventListener('input', () => {
            const idx = parseInt(input.dataset.index);
            const field = input.dataset.field;
            qrCodes[idx][field] = input.value;

            // Toggle value field visibility based on type
            if (field === 'type') {
                const item = input.closest('.qr-code-item');
                const valueLabel = item.querySelector('.value-label');
                valueLabel.style.display = input.value === 'lightning' ? 'none' : '';
                // Auto-set label/logo for lightning type
                if (input.value === 'lightning' && !qrCodes[idx].label) {
                    qrCodes[idx].label = 'Lightning';
                    const labelInput = item.querySelector('[data-field="label"]');
                    if (labelInput) labelInput.value = 'Lightning';
                }
            }

            // Auto-detect brand when URL is pasted/typed
            if (field === 'value') {
                const normalized = normalizePaymentValue(input.value);
                if (normalized !== input.value) {
                    input.value = normalized;
                    qrCodes[idx].value = normalized;
                }
                const brand = detectBrandFromUrl(normalized);
                const detectMsg = document.getElementById(`detect-msg-${idx}`);
                const item = input.closest('.qr-code-item');
                const labelInput = item.querySelector('[data-field="label"]');
                const logoInput = item.querySelector('[data-field="logo"]');

                if (brand) {
                    // Auto-fill label if empty or was previously auto-set
                    if (!qrCodes[idx].label || qrCodes[idx]._autoLabel) {
                        qrCodes[idx].label = brand.label;
                        qrCodes[idx]._autoLabel = true;
                        if (labelInput) labelInput.value = brand.label;
                    }
                    // Auto-fill logo
                    const logoUrl = getLogoUrl(normalized);
                    if (!qrCodes[idx].logo || qrCodes[idx]._autoLogo) {
                        qrCodes[idx].logo = logoUrl;
                        qrCodes[idx]._autoLogo = true;
                        if (logoInput) logoInput.value = logoUrl;
                    }
                    if (detectMsg) {
                        detectMsg.textContent = `Detected: ${brand.label}`;
                        detectMsg.style.color = '#4caf50';
                    }
                } else {
                    // Try to get logo from any valid URL
                    const logoUrl = getLogoUrl(input.value);
                    if (logoUrl && (!qrCodes[idx].logo || qrCodes[idx]._autoLogo)) {
                        qrCodes[idx].logo = logoUrl;
                        qrCodes[idx]._autoLogo = true;
                        if (logoInput) logoInput.value = logoUrl;
                    }
                    if (detectMsg) detectMsg.textContent = '';
                }
            }

            // Clear auto flags when user manually edits label/logo
            if (field === 'label') qrCodes[idx]._autoLabel = false;
            if (field === 'logo') qrCodes[idx]._autoLogo = false;
        });
    });
}

document.getElementById('add-qr-btn').addEventListener('click', () => {
    qrCodes.push({ label: '', type: 'static', value: '', hint: '' });
    renderQRCodesList();
});

function escapeAttr(str) {
    return str.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

// --- Color picker sync ---
const colorFields = ['accentColor', 'gradientStart', 'gradientMid', 'gradientEnd', 'backgroundColor'];
const form = document.getElementById('settings-form');

colorFields.forEach(field => {
    const picker = form.elements[field];
    const text = form.elements[field + 'Text'];
    if (picker && text) {
        picker.addEventListener('input', () => {
            text.value = picker.value;
            updatePreview(getFormData());
        });
        text.addEventListener('input', () => {
            if (/^#[0-9a-fA-F]{6}$/.test(text.value)) {
                picker.value = text.value;
            }
            updatePreview(getFormData());
        });
    }
});

form.addEventListener('input', () => {
    updatePreview(getFormData());
});

function updatePreview(settings) {
    const bg = document.getElementById('preview-bg');
    const title = document.getElementById('preview-title');
    const accent = document.getElementById('preview-accent');

    if (settings.backgroundImage) {
        bg.style.background = `url(${settings.backgroundImage}) center/cover no-repeat`;
        bg.style.backgroundColor = settings.backgroundColor || '#110404';
    } else {
        bg.style.background = `radial-gradient(ellipse at center, ${settings.gradientStart} 0%, ${settings.gradientMid} 35%, ${settings.gradientEnd} 65%, ${settings.backgroundColor} 100%)`;
        bg.style.backgroundColor = settings.backgroundColor || '#110404';
    }

    title.textContent = settings.brandingTitle || 'SX-WORLDWIDE';
    accent.style.color = settings.accentColor || '#f7931a';
}

// --- Save ---
document.getElementById('settings-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const saveBtn = document.getElementById('save-btn');
    saveBtn.disabled = true;
    saveBtn.textContent = 'Saving...';

    try {
        const data = getFormData();
        const res = await fetch('/api/settings', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${authToken}`,
            },
            body: JSON.stringify(data),
        });

        if (!res.ok) {
            const err = await res.json().catch(() => ({}));
            showStatus(err.error || 'Save failed.', 'error');
            return;
        }

        const saved = await res.json();
        qrCodes = saved.qrCodes || [];
        populateForm(saved);
        renderQRCodesList();
        updatePreview(saved);
        showStatus('Settings saved! Changes are live.', 'success');
    } catch (err) {
        showStatus('Connection error. Try again.', 'error');
    } finally {
        saveBtn.disabled = false;
        saveBtn.textContent = 'Save Settings';
    }
});

// --- Reset ---
document.getElementById('reset-btn').addEventListener('click', async () => {
    if (!confirm('Reset all settings to defaults?')) return;

    const saveBtn = document.getElementById('save-btn');
    saveBtn.disabled = true;

    try {
        const res = await fetch('/api/settings', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${authToken}`,
            },
            body: JSON.stringify(DEFAULTS),
        });

        if (!res.ok) {
            showStatus('Reset failed.', 'error');
            return;
        }

        const saved = await res.json();
        qrCodes = saved.qrCodes || [];
        populateForm(saved);
        renderQRCodesList();
        updatePreview(saved);
        showStatus('Settings reset to defaults.', 'success');
    } catch (err) {
        showStatus('Connection error.', 'error');
    } finally {
        saveBtn.disabled = false;
    }
});

function showStatus(msg, type) {
    const el = document.getElementById('status-msg');
    el.textContent = msg;
    el.className = 'status-msg ' + type;
    setTimeout(() => { el.textContent = ''; el.className = 'status-msg'; }, 4000);
}
