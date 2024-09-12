var oldPage;
showPage("sensors");

document.addEventListener("DOMContentLoaded", async () => {
    await populateWifiList();
    await populateDataSensors();
    
    // Adiciona eventos de clique para as opções do menu
    document.querySelectorAll('.nav-link').forEach(link => {
        link.addEventListener('click', function () {
            const page = this.getAttribute('data-page');
            showPage(page);
        });
    });

    // Atualiza a lista de redes cada 5 segundos
    setInterval(async () => {
        await populateWifiList();
        await populateDataSensors();
    }, 5000);
});

async function fetchNetworks() {
    try {
        const response = await fetch('/networks');
        /*const response = [
            { "ssid": "Rede Wi-Fi 1" },
            { "SSID": "Rede Wi-Fi 2" },
            { "ssid": "Rede Wi-Fi 3", "connected": true },
            { "SSID": "Rede Wi-Fi 4" }
        ]*/

        if (!response.ok) {
            throw new Error('Erro ao buscar redes Wi-Fi');
        }
        return response;
    } catch (error) {
        console.error('Erro:', error);
        return [];
    }
}

async function fetchSensors() {
    try {
        const response = await fetch('/sensors');

        if (!response.ok) {
            throw new Error('Erro ao buscar dados dos sensores');
        }
        return response;
    } catch (error) {
        console.error('Erro:', error);
        return [];
    }
}

async function populateDataSensors() {
    const sensors = await fetchSensors();
    const humidityValue = document.getElementById("humidityValue");
    const temperatureValue = document.getElementById("temperatureValue");

    humidityValue.innerHTML = ''; 
    temperatureValue.innerHTML = '';

    humidityValue.innerHTML = (sensors.humidity? sensors.humidity : '0')  + '%';
    temperatureValue.innerHTML = (sensors.temperature? sensors.temperature : '0') + '°C';
}


async function populateWifiList() {
    const networks = await fetchNetworks(); // Agora é um array
    const wifiList = document.getElementById("wifiList");

    wifiList.innerHTML = ''; // Limpa a lista antes de preencher

    networks.forEach(network => {
        const li = document.createElement("li");

        const text = document.createElement("span");
        text.textContent = network.ssid || network.SSID; // Adaptação para o formato de resposta
        li.appendChild(text);

        if (network.connected) {
            const conectado = document.createElement("span");
            conectado.textContent = "conectado"
            li.classList.add("wifi-list-active");
            li.appendChild(conectado);
        }

        if (!network.connected) {
            li.addEventListener("click", () => {
                document.getElementById("ssid").value = network.ssid || network.SSID; // Adaptação para o formato de resposta
                document.getElementById("wifiModal").style.display = "flex";
            });
        }
        wifiList.appendChild(li);
    });
}

document.getElementById("closeModal").onclick = function () {
    document.getElementById("wifiModal").style.display = "none";
}

window.onclick = function (event) {
    if (event.target == document.getElementById("wifiModal")) {
        document.getElementById("wifiModal").style.display = "none";
    }
}

document.getElementById("togglePassword").onclick = function () {
    const passwordInput = document.getElementById("password");
    if (passwordInput.type === "password") {
        passwordInput.type = "text";
        this.textContent = "Esconder";
    } else {
        passwordInput.type = "password";
        this.textContent = "Exibir";
    }
}

async function submitForm() {
    const ssid = document.getElementById("ssid").value;
    const password = document.getElementById("password").value;

    try {
        const response = await fetch('/save', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ ssid: ssid, password: password }),
        });

        if (!response.ok) {
            throw new Error('Erro ao conectar');
        }

        alert("Conectando à rede Wi-Fi: " + ssid);
        document.getElementById("wifiModal").style.display = "none"; // Fechar o modal após submissão
    } catch (error) {
        console.error('Erro:', error);
        alert('Ocorreu um erro ao conectar à rede Wi-Fi.');
    }

    return false; // Previne o envio real do formulário
}

function showPage(page) {
    const pages = document.querySelectorAll('.page');
    pages.forEach(p => p.style.display = 'none'); // Oculta todas as páginas

    const newPageElement = document.getElementById(`${page}Page`);
    if (newPageElement) {
        newPageElement.style.display = 'block'; // Exibe a página selecionada
    }

    const newMenuElement = document.getElementById(`${page}Menu`);
    if (newMenuElement) {
        newMenuElement.classList.add('menuActive'); // Adiciona classe 'active' para o menu selecionado
    }

    if (oldPage != page) {
        const oldMenuElement = document.getElementById(`${oldPage}Menu`);
        if (oldMenuElement) {
            oldMenuElement.classList.remove('menuActive'); // Remove a classe 'active' do menu anterior
        }
    }

    oldPage = page;
}
