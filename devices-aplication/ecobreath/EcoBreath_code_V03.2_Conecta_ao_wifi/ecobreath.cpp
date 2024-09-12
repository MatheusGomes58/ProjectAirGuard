#include <WiFi.h>
#include <WebServer.h>
#include <DNSServer.h>
#include <SPIFFS.h> // Biblioteca SPIFFS
#include <vector>

const char *ssid_ap = "ESP-AP";
const char *password_ap = "12345678";

WebServer server(80); // Servidor Web
DNSServer dnsServer;  // Servidor DNS

// Variável global para armazenar as redes Wi-Fi escaneadas
String scannedNetworks;
void scanAndStoreNetworks()
{
    WiFi.mode(WIFI_STA); // Configura o modo Wi-Fi como estação
    WiFi.disconnect();   // Garante que não há conexões ativas
    delay(100);          // Aguarda para estabilizar o modo estação

    int n = WiFi.scanNetworks();
    scannedNetworks = "{\"networks\":[";

    // Vetor para armazenar SSIDs únicos
    std::vector<String> uniqueSSIDs;

    if (n > 0)
    {
        for (int i = 0; i < n; ++i)
        {
            String ssid = WiFi.SSID(i);

            // Verifica se o SSID já está no vetor de SSIDs únicos
            if (std::find(uniqueSSIDs.begin(), uniqueSSIDs.end(), ssid) == uniqueSSIDs.end())
            {
                uniqueSSIDs.push_back(ssid); // Adiciona SSID ao vetor de únicos

                // Adiciona o SSID e o RSSI ao JSON
                scannedNetworks += "{";
                scannedNetworks += "\"ssid\":\"" + ssid + "\",";
                scannedNetworks += "\"rssi\":" + String(WiFi.RSSI(i));
                scannedNetworks += "}";

                // Adiciona uma vírgula se houver mais redes a serem adicionadas
                if (i < n - 1)
                {
                    scannedNetworks += ",";
                }
            }
        }
    }

    // Remove a vírgula extra no final, se presente
    if (scannedNetworks.endsWith(","))
    {
        scannedNetworks = scannedNetworks.substring(0, scannedNetworks.length() - 1);
    }

    scannedNetworks += "]}";
}

// Função para servir arquivos
void handleFileRequest(String pathFormat)
{
    String path = server.uri();

    if (path == "/")
    {
        path = pathFormat + "/front.html"; // Se o caminho for a raiz, servir front.html
    }
    else
    {
        path = pathFormat + path;
    }

    String contentType;
    if (path.endsWith(".htm") || path.endsWith(".html"))
    {
        contentType = "text/html";
    }
    else if (path.endsWith(".css"))
    {
        contentType = "text/css";
    }
    else if (path.endsWith(".js"))
    {
        contentType = "application/javascript";
    }
    else if (path.endsWith(".png"))
    {
        contentType = "image/png";
    }
    else if (path.endsWith(".jpg"))
    {
        contentType = "image/jpeg";
    }
    else if (path.endsWith(".gif"))
    {
        contentType = "image/gif";
    }
    else if (path.endsWith(".ico"))
    {
        contentType = "image/x-icon";
    }
    else
    {
        contentType = "text/plain";
    }

    if (!SPIFFS.exists(path))
    {
        server.send(404, "text/plain", "Arquivo não encontrado.");
        return;
    }

    File file = SPIFFS.open(path, "r");
    server.streamFile(file, contentType);
    file.close();
}

// Função para salvar e conectar ao Wi-Fi
// Função para salvar e conectar ao Wi-Fi
void handleSave()
{
    String ssid = server.arg("ssid");
    Serial.println("SSID: ");
    Serial.println(ssid);
    String password = server.arg("password");
    Serial.println("Senha: ");
    Serial.println(password);

    Serial.print("Tentando conectar à rede Wi-Fi: ");
    Serial.println(ssid);

    WiFi.begin(ssid.c_str(), password.c_str());

    // Tentativa de conexão
    int attempts = 0;
    const int maxAttempts = 20;

    while (WiFi.status() != WL_CONNECTED && attempts < maxAttempts)
    {
        delay(500);
        Serial.print(".");

        // Exibe o status da conexão a cada tentativa
        wl_status_t wifi_status = WiFi.status();
        Serial.print(" Status: ");
        Serial.println(wifi_status);

        attempts++;
    }

    // Verifica se a conexão foi bem-sucedida
    if (WiFi.status() == WL_CONNECTED)
    {
        Serial.println("\nConectado com sucesso!");
        Serial.print("Endereço IP obtido: ");
        Serial.println(WiFi.localIP());

        // Exibe mensagem de conexão bem-sucedida
        Serial.println("Conexão à internet estabelecida com sucesso!");

        // Servir a página de conexão bem-sucedida
        // handleFileRequest("/connected");
        server.onNotFound([]()
                          { handleFileRequest("/connected"); });
    }
    else
    {
        Serial.println("\nFalha ao conectar.");

        // Recriar a rede local e reiniciar o servidor web
        WiFi.softAP(ssid_ap, password_ap);
        dnsServer.start(53, "*", WiFi.softAPIP());

        // Servir a página de configuração novamente
        // handleFileRequest("/connection");
        server.onNotFound([]()
                          { handleFileRequest("/connection"); });
    }
}

// Função para retornar as redes Wi-Fi disponíveis
void handleNetworks()
{
    server.send(200, "application/json", scannedNetworks);
}

void setup()
{
    Serial.begin(115200);

    // Iniciar o sistema de arquivos SPIFFS
    if (!SPIFFS.begin(true))
    {
        Serial.println("Erro ao montar o sistema de arquivos SPIFFS.");
        return;
    }

    // Escanear e armazenar as redes Wi-Fi disponíveis
    scanAndStoreNetworks();

    // Configurar o ESP32 para funcionar como Access Point
    WiFi.softAP(ssid_ap, password_ap);

    // Configurar o servidor DNS para redirecionar todas as solicitações para o IP do ESP32
    dnsServer.start(53, "*", WiFi.softAPIP());

    // Configurar o servidor web
    server.onNotFound([]()
                      { handleFileRequest("/connection"); });
    server.on("/save", HTTP_POST, handleSave);
    server.on("/networks", HTTP_GET, handleNetworks);
    server.begin();

    Serial.println("Servidor iniciado");
    Serial.print("Acesse o IP: ");
    Serial.println(WiFi.softAPIP());

    // Esperar algum tempo para garantir que o sistema esteja pronto
    delay(2000);
}

void loop()
{
    dnsServer.processNextRequest();
    server.handleClient();
}

como resolver o problema que mesmo quando da erro de conexão ele esta redirecionando para \connected