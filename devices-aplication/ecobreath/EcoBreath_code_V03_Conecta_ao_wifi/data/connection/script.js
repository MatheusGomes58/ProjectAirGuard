document.addEventListener("DOMContentLoaded", async () => {
    await populateWifiList();
});

async function fetchNetworks() {
    try {
        const response = await fetch('/networks');
        /*const response = [
            { "ssid": "Rede Wi-Fi 1" },
            { "SSID": "Rede Wi-Fi 2" },
            { "ssid": "Rede Wi-Fi 3" },
            { "SSID": "Rede Wi-Fi 4" }
        ]*/
        
        if (!response.ok) {
            throw new Error('Erro ao buscar redes Wi-Fi');
        }
        return response;
    } catch (error) {
        console.error('Erro:', error);
        alert('Ocorreu um erro ao buscar redes Wi-Fi.');
        return [];
    }
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

        li.addEventListener("click", () => {
            document.getElementById("ssid").value = network.ssid || network.SSID; // Adaptação para o formato de resposta
            document.getElementById("wifiModal").style.display = "flex";
        });

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
