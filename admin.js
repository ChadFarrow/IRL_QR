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
    backgroundImage: '',
    confettiColors: '#f7931a,#ffd700,#ff6600,#ffffff,#ff4500',
    feedTitle: 'Recent Payments',
    nwcUrl: '',
};

let authToken = '';

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
            body: JSON.stringify({}), // empty update just to verify password
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
        populateForm(settings);
        updatePreview(settings);
    } catch (err) {
        showStatus('Failed to load settings.', 'error');
    }
}

function populateForm(settings) {
    const form = document.getElementById('settings-form');
    for (const [key, value] of Object.entries(settings)) {
        const input = form.elements[key];
        if (input) {
            input.value = value;
        }
        // Sync color picker ↔ text for color fields
        const textInput = form.elements[key + 'Text'];
        if (textInput) {
            textInput.value = value;
        }
    }
}

function getFormData() {
    const form = document.getElementById('settings-form');
    const data = {};
    for (const key of Object.keys(DEFAULTS)) {
        const input = form.elements[key];
        if (input) {
            if (key === 'invoiceAmountUsd') {
                data[key] = parseFloat(input.value) || DEFAULTS[key];
            } else {
                data[key] = input.value;
            }
        }
    }
    return data;
}

// --- Color picker ↔ text sync ---
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

// Live preview on any input change
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
        populateForm(saved);
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
        populateForm(saved);
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
