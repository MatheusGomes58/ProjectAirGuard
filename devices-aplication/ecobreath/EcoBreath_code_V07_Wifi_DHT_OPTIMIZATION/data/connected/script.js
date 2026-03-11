// --- State Management ---
let currentLang = localStorage.getItem('lang') || 'pt-BR';
let currentTheme = localStorage.getItem('theme') || 'light';

const translations = {
    "pt-BR": {
        "nav_sensors": "DADOS",
        "nav_wifi": "REDE",
        "nav_settings": "AJUSTES",
        "title_sensors": "Dashboard",
        "title_wifi": "Conexão Redes",
        "title_settings": "Ajustes",
        "label_humidity": "UMIDADE",
        "label_temp": "TEMPERATURA",
        "text_settings_info": "Personalize as configurações do seu AirGuard.",
        "modal_title": "Conectar Wi-Fi",
        "label_ssid": "SSID",
        "label_password": "Senha",
        "btn_show": "Ver",
        "btn_hide": "Ocultar",
        "btn_connect": "Conectar",
        "status_connected": "CONECTADO",
        "alert_connected": "Conectando ao Wi-Fi...",
        "alert_error": "Erro ao tentar conectar."
    },
    "en": {
        "nav_sensors": "DATA",
        "nav_wifi": "NETWORK",
        "nav_settings": "SETTINGS",
        "title_sensors": "Dashboard",
        "title_wifi": "Wi-Fi Networks",
        "title_settings": "Settings",
        "label_humidity": "HUMIDITY",
        "label_temp": "TEMPERATURE",
        "text_settings_info": "Customize your AirGuard settings.",
        "modal_title": "Connect Wi-Fi",
        "label_ssid": "SSID",
        "label_password": "Password",
        "btn_show": "Show",
        "btn_hide": "Hide",
        "btn_connect": "Connect",
        "status_connected": "CONNECTED",
        "alert_connected": "Connecting to Wi-Fi...",
        "alert_error": "Connection error."
    },
    "es": {
        "nav_sensors": "DATOS",
        "nav_wifi": "RED",
        "nav_settings": "AJUSTES",
        "title_sensors": "Panel",
        "title_wifi": "Redes Wi-Fi",
        "title_settings": "Ajustes",
        "label_humidity": "HUMEDAD",
        "label_temp": "TEMPERATURA",
        "text_settings_info": "Personaliza tus ajustes de AirGuard.",
        "modal_title": "Conectar Wi-Fi",
        "label_ssid": "SSID",
        "label_password": "Clave",
        "btn_show": "Ver",
        "btn_hide": "Ocultar",
        "btn_connect": "Conectar",
        "status_connected": "CONECTADO",
        "alert_connected": "Conectando a Wi-Fi...",
        "alert_error": "Error al conectar."
    }
};

function applyLanguage() {
    document.querySelectorAll('[data-i18n]').forEach(el => {
        const key = el.getAttribute('data-i18n');
        if (translations[currentLang][key]) {
            el.textContent = translations[currentLang][key];
        }
    });
}

function cycleLanguage() {
    const langs = Object.keys(translations);
    let idx = langs.indexOf(currentLang);
    currentLang = langs[(idx + 1) % langs.length];
    localStorage.setItem('lang', currentLang);
    applyLanguage();
}

function applyTheme() {
    document.documentElement.setAttribute('data-theme', currentTheme);
    const sunIcon = document.getElementById('sunIcon');
    const moonIcon = document.getElementById('moonIcon');
    if (sunIcon) sunIcon.style.display = currentTheme === 'light' ? 'block' : 'none';
    if (moonIcon) moonIcon.style.display = currentTheme === 'dark' ? 'block' : 'none';
}

function toggleTheme() {
    currentTheme = currentTheme === 'light' ? 'dark' : 'light';
    localStorage.setItem('theme', currentTheme);
    applyTheme();
}

function showPage(pageId) {
    document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
    document.querySelectorAll('.NavItem').forEach(n => n.classList.remove('active'));

    const page = document.getElementById(pageId + 'Page');
    const nav = document.querySelector(`[data-page="${pageId}"]`);
    if (page) page.classList.add('active');
    if (nav) nav.classList.add('active');
}

function togglePasswordVisibility() {
    const pwd = document.getElementById('password');
    const btn = document.getElementById('togglePassword');
    if (pwd && btn) {
        if (pwd.type === 'password') {
            pwd.type = 'text';
            // Simple eye icon change or text change can go here if needed
        } else {
            pwd.type = 'password';
        }
    }
}

function openWifiModal(ssid) {
    const ssidInput = document.getElementById('ssid');
    const modal = document.getElementById('wifiModal');
    if (ssidInput) ssidInput.value = ssid;
    if (modal) modal.style.display = 'flex';
}

function closeModal() {
    const modal = document.getElementById('wifiModal');
    if (modal) modal.style.display = 'none';
}

async function refreshData() {
    try {
        const response = await fetch('/sensors');
        if (!response.ok) throw new Error();
        const data = await response.json();
        const hum = document.getElementById('humidityValue');
        const temp = document.getElementById('temperatureValue');
        if (hum) hum.textContent = (data.humidity || '--') + '%';
        if (temp) temp.textContent = (data.temperature || '--') + '°C';
    } catch (e) {
        console.error("Fetch error");
    }
}

async function populateWifiList() {
    const list = document.getElementById('wifiList');
    if (!list) return;
    try {
        const response = await fetch('/networks');
        const networks = await response.json();
        list.innerHTML = '';
        networks.forEach(net => {
            const div = document.createElement('div');
            div.className = 'WifiItem';
            div.innerHTML = `
                <div style="display:flex; align-items:center; gap:12px;">
                    <svg viewbox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width:20px; color:var(--accent);"><path d="M5 12.55a11 11 0 0 1 14.08 0"/></svg>
                    <span style="font-weight:700;">${net.ssid}</span>
                </div>
                ${net.connected ? `<span style="color:var(--accent); font-size:0.7rem; font-weight:800;">${translations[currentLang].status_connected}</span>` : ''}
            `;
            div.onclick = () => openWifiModal(net.ssid);
            list.appendChild(div);
        });
    } catch (e) {
        list.innerHTML = '<p>Error loading networks</p>';
    }
}

document.addEventListener('DOMContentLoaded', () => {
    applyLanguage();
    applyTheme();

    const langBtn = document.getElementById('langToggle');
    const themeBtn = document.getElementById('themeToggle');
    if (langBtn) langBtn.onclick = cycleLanguage;
    if (themeBtn) themeBtn.onclick = toggleTheme;

    document.querySelectorAll('.NavItem').forEach(btn => {
        btn.onclick = (e) => {
            e.preventDefault();
            showPage(btn.getAttribute('data-page'));
        };
    });

    const togglePwdBtn = document.getElementById('togglePassword');
    if (togglePwdBtn) togglePwdBtn.onclick = togglePasswordVisibility;

    window.onclick = (e) => {
        const modal = document.getElementById('wifiModal');
        if (e.target === modal) closeModal();
    };

    const wifiForm = document.getElementById('wifiForm');
    if (wifiForm) {
        wifiForm.onsubmit = async (e) => {
            e.preventDefault();
            const ssid = document.getElementById('ssid').value;
            const password = document.getElementById('password').value;

            try {
                const res = await fetch('/connect', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ ssid, password })
                });
                alert(translations[currentLang].alert_connected);
                closeModal();
            } catch (e) {
                alert(translations[currentLang].alert_error);
            }
        };
    }

    setInterval(refreshData, 3000);
    populateWifiList();
});
