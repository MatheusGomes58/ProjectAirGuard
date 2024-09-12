#include <WiFi.h>
#include <WebServer.h>
#include <DNSServer.h>
#include <SPIFFS.h>
#include <vector>
#include <TFT_eSPI.h> // Biblioteca para o display GC9A01
#include <DHT.h>      // Biblioteca para o sensor DHT

// Configuração do display
TFT_eSPI tft = TFT_eSPI(); // Cria um objeto para o display

// Configuração do DHT11
#define DHTPIN 22         // Pino de dados do DHT11 (GPIO 22)
#define DHTTYPE DHT11     // Tipo do sensor DHT (DHT11)
DHT dht(DHTPIN, DHTTYPE); // Cria um objeto DHT

const char *ssid_ap = "ESP-AP";
const char *password_ap = "12345678";

WebServer server(80); // Servidor Web
DNSServer dnsServer;  // Servidor DNS

// Variável global para armazenar as redes Wi-Fi escaneadas
String scannedNetworks;
String sensorData; // Variável global para armazenar dados do sensor

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

        // Redirecionar para a página de conexão bem-sucedida
        server.onNotFound([]()
                          { handleFileRequest("/connected"); });
    }
    else if (WiFi.status() != WL_CONNECTED && attempts == maxAttempts)
    {
        Serial.println("\nFalha ao conectar.");

        // Recriar a rede local e reiniciar o servidor web
        WiFi.softAP(ssid_ap, password_ap);
        dnsServer.start(53, "*", WiFi.softAPIP());

        // Exibir página de falha de conexão
        server.onNotFound([]()
                          { handleFileRequest("/connection"); }); // Página de erro de conexão
    }
}

// Função para retornar as redes Wi-Fi disponíveis
void handleNetworks()
{
    server.send(200, "application/json", scannedNetworks);
}

// Função para enviar dados do sensor
void handleSensorData()
{
    server.send(200, "application/json", sensorData);
}

// Função para ler e exibir dados do sensor DHT11
void readSensorData()
{
    float humidity = dht.readHumidity();
    float temperature = dht.readTemperature();

    if (isnan(humidity) || isnan(temperature))
    {
        Serial.println("Falha ao ler do sensor DHT!");
        return;
    }

    // Atualiza os dados do sensor para o endpoint
    sensorData = "{\"temperature\":" + String(temperature) + ",\"humidity\":" + String(humidity) + "}";

    // Exibe no display
    tft.fillScreen(TFT_BLACK);
    tft.setCursor(30, 100);
    tft.println("Temp: " + String(temperature) + " C");
    tft.setCursor(30, 140);
    tft.println("Hum: " + String(humidity) + " %");

    // Exibe no monitor serial
    Serial.print("Temperatura: ");
    Serial.print(temperature);
    Serial.println(" C");

    Serial.print("Umidade: ");
    Serial.print(humidity);
    Serial.println(" %");
}

void setup()
{
    Serial.begin(115200);

    // Inicializar o display
    tft.init();
    tft.setRotation(4);
    tft.fillScreen(TFT_BLACK);
    tft.setTextColor(TFT_WHITE, TFT_BLACK);
    tft.setTextSize(2);
    tft.setCursor(30, 120);
    tft.println("Iniciando...");
    delay(2000);

    // Iniciar o sistema de arquivos SPIFFS
    if (!SPIFFS.begin(true))
    {
        Serial.println("Erro ao montar o sistema de arquivos SPIFFS.");
        return;
    }

    // Escanear e armazenar as redes Wi-Fi disponíveis
    scanAndStoreNetworks();

    // Inicializar o DHT11
    dht.begin();

    // Configurar o ESP32 para funcionar como Access Point
    WiFi.softAP(ssid_ap, password_ap);

    // Configurar o servidor DNS para redirecionar todas as solicitações para o IP do ESP32
    dnsServer.start(53, "*", WiFi.softAPIP());

    // Configurar o servidor web
    server.on("/save", HTTP_POST, handleSave);
    server.on("/networks", HTTP_GET, handleNetworks);
    server.on("/sensors", HTTP_GET, handleSensorData); // Endpoint para dados do sensor
    server.begin();

    Serial.println("Servidor iniciado");
    Serial.print("Acesse o IP: ");
    Serial.println(WiFi.softAPIP());
}

void loop()
{
    dnsServer.processNextRequest();
    server.handleClient();
    readSensorData(); // Atualiza os dados do sensor no loop
    scanAndStoreNetworks();
    delay(5000); // Atualização a cada 5 segundos
}
