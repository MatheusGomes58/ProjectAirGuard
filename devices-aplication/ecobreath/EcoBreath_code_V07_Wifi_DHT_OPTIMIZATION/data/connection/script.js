document.addEventListener("DOMContentLoaded", () => {
    // Apply theme from localStorage if available
    const currentTheme = localStorage.getItem('theme') || 'light';
    document.documentElement.setAttribute('data-theme', currentTheme);

    populateWifiList();

    // Event Listeners
    document.getElementById("closeModal").onclick = closeModal;
    document.getElementById("togglePassword").onclick = togglePasswordVisibility;
    document.getElementById("loginForm").onsubmit = submitForm;

    window.onclick = (event) => {
        const modal = document.getElementById("wifiModal");
        if (event.target === modal) closeModal();
    };
});

async function fetchNetworks() {
    try {
        const response = await fetch('/networks');
        if (!response.ok) throw new Error('Falha ao buscar redes');
        const data = await response.json();
        return data.networks || [];
    } catch (error) {
        console.error('Erro ao buscar redes Wi-Fi:', error);
        return [];
    }
}

async function populateWifiList() {
    const wifiList = document.getElementById("wifiList");
    wifiList.innerHTML = '<li style="justify-content: center; opacity: 0.6;">Buscando redes...</li>';

    const networks = await fetchNetworks();
    wifiList.innerHTML = '';

    if (networks.length === 0) {
        wifiList.innerHTML = '<li style="justify-content: center; opacity: 0.6;">Nenhuma rede encontrada</li>';
        return;
    }

    networks.forEach(network => {
        const li = document.createElement("li");
        li.innerHTML = `
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" style="width:20px; color:var(--accent);"><path d="M5 12.55a11 11 0 0 1 14.08 0"/></svg>
            <span>${network.ssid}</span>
        `;

        li.addEventListener("click", () => {
            document.getElementById("ssid").value = network.ssid;
            document.getElementById("wifiModal").style.display = "flex";
            document.getElementById("password").focus();
        });

        wifiList.appendChild(li);
    });
}

function closeModal() {
    document.getElementById("wifiModal").style.display = "none";
    document.getElementById("password").value = ""; // Clear password for security
}

function togglePasswordVisibility() {
    const passwordInput = document.getElementById("password");
    if (passwordInput.type === "password") {
        passwordInput.type = "text";
        this.textContent = "Esconder";
    } else {
        passwordInput.type = "password";
        this.textContent = "Exibir";
    }
}

async function submitForm(e) {
    if (e) e.preventDefault();

    const ssid = document.getElementById("ssid").value;
    const password = document.getElementById("password").value;
    const btn = document.querySelector('button[type="submit"]');

    btn.disabled = true;
    btn.textContent = "Enviando...";

    try {
        const url = `/save?ssid=${encodeURIComponent(ssid)}&password=${encodeURIComponent(password)}`;
        const response = await fetch(url, { method: 'POST' });

        if (!response.ok) throw new Error('Erro ao conectar');

        alert(`Configuração salva! O dispositivo tentará conectar à rede: ${ssid}`);
        closeModal();
    } catch (error) {
        console.error('Erro:', error);
        alert('Ocorreu um erro ao enviar as configurações.');
    } finally {
        btn.disabled = false;
        btn.textContent = "Conectar Agora";
    }

    return false;
}
