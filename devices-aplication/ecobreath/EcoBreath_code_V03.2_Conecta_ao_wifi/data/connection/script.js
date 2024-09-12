document.addEventListener("DOMContentLoaded", () => {
    populateWifiList();
});

function fetchNetworks() {
    let xhr = new XMLHttpRequest();
    xhr.open('GET', '/networks', false); // `false` makes the request synchronous
    xhr.send();

    if (xhr.status === 200) {
        const response = JSON.parse(xhr.responseText);
        return response.networks; // Return the `networks` array
    } else {
        alert('Erro ao buscar redes Wi-Fi.');
        console.error('Erro ao buscar redes Wi-Fi:', xhr.status, xhr.statusText);
        return [];
    }
}

function populateWifiList() {
    const networks = fetchNetworks(); // Get the list of networks synchronously
    const wifiList = document.getElementById("wifiList");

    wifiList.innerHTML = ''; // Clear the list before populating

    networks.forEach(network => {
        const li = document.createElement("li");

        const text = document.createElement("span");
        text.textContent = network.ssid; // Display the SSID
        li.appendChild(text);

        li.addEventListener("click", () => {
            document.getElementById("ssid").value = network.ssid; // Set SSID in the modal
            document.getElementById("wifiModal").style.display = "flex";
        });

        wifiList.appendChild(li);
    });
}

document.getElementById("closeModal").onclick = function () {
    document.getElementById("wifiModal").style.display = "none";
};

window.onclick = function (event) {
    if (event.target === document.getElementById("wifiModal")) {
        document.getElementById("wifiModal").style.display = "none";
    }
};

document.getElementById("togglePassword").onclick = function () {
    const passwordInput = document.getElementById("password");
    if (passwordInput.type === "password") {
        passwordInput.type = "text";
        this.textContent = "Esconder";
    } else {
        passwordInput.type = "password";
        this.textContent = "Exibir";
    }
};

async function submitForm() {
    const ssid = encodeURIComponent(document.getElementById("ssid").value);
    const password = encodeURIComponent(document.getElementById("password").value);

    try {
        const response = await fetch(`/save?ssid=${ssid}&password=${password}`, {
            method: 'POST'
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
