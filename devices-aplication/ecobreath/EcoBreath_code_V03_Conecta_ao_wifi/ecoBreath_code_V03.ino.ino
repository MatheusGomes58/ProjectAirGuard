#include <WiFi.h>
#include <WebServer.h>
#include <DNSServer.h>
#include <SPIFFS.h>  // Biblioteca SPIFFS

const char* ssid_ap = "ESP-AP";
const char* password_ap = "12345678";

WebServer server(80);  // Servidor Web
DNSServer dnsServer;   // Servidor DNS

// Função para listar redes Wi-Fi disponíveis
String scanNetworks() {
  String networks = "[";

  int n = WiFi.scanNetworks();
  if (n == 0) {
    networks += "]}";
  } else {
    for (int i = 0; i < n; ++i) {
      networks += "{";
      networks += "\"ssid\":\"" + WiFi.SSID(i) + "\",";
      networks += "\"rssi\":" + String(WiFi.RSSI(i));
      networks += "}";
      if (i < n - 1) {
        networks += ",";
      }
    }
    networks += "]";
  }

  return networks;
}

// Função para servir arquivos
void handleFileRequest(String pathFormat = "/connection") {
  String path = server.uri();
  
  if (path == "/") {
    path = pathFormat + "/front.html";  // Se o caminho for a raiz, servir front.html
  }

  String contentType;
  if (path.endsWith(".htm") || path.endsWith(".html")) {
    contentType = "text/html";
  } else if (path.endsWith(".css")) {
    contentType = "text/css";
  } else if (path.endsWith(".js")) {
    contentType = "application/javascript";
  } else if (path.endsWith(".png")) {
    contentType = "image/png";
  } else if (path.endsWith(".jpg")) {
    contentType = "image/jpeg";
  } else if (path.endsWith(".gif")) {
    contentType = "image/gif";
  } else if (path.endsWith(".ico")) {
    contentType = "image/x-icon";
  } else {
    contentType = "text/plain";
  }

  if (!SPIFFS.exists(path)) {
    server.send(404, "text/plain", "Arquivo não encontrado.");
    return;
  }

  File file = SPIFFS.open(path, "r");
  server.streamFile(file, contentType);
  file.close();
}

// Função para salvar as credenciais de Wi-Fi e tentar se conectar
void handleSave() {
  String ssid = server.arg("ssid");
  String password = server.arg("password");

  Serial.print("Tentando conectar à rede Wi-Fi: ");
  Serial.println(ssid);

  WiFi.begin(ssid.c_str(), password.c_str());

  // Desligar o Access Point
  WiFi.softAPdisconnect(true);

  // Desativar o servidor DNS
  dnsServer.stop();

  // Tentativa de conexão
  int attempts = 0;
  const int maxAttempts = 20;

  while (WiFi.status() != WL_CONNECTED && attempts < maxAttempts) {
    delay(500);
    Serial.print(".");
    attempts++;
  }

  if (WiFi.status() == WL_CONNECTED) {
    Serial.println("\nConectado com sucesso!");
    Serial.print("Endereço IP obtido: ");
    Serial.println(WiFi.localIP());

    // Servir a página de conexão bem-sucedida
    handleFileRequest("/connected");

  } else {
    Serial.println("\nFalha ao conectar.");

    // Recriar a rede local e reiniciar o servidor web
    WiFi.softAP(ssid_ap, password_ap);
    dnsServer.start(53, "*", WiFi.softAPIP());

    // Servir a página de configuração novamente
    handleFileRequest("/connection");
  }
}

// Função para listar as redes Wi-Fi disponíveis
void handleNetworks() {
  String networks = scanNetworks();
  server.send(200, "application/json", networks);
}

void setup() {
  Serial.begin(115200);

  // Iniciar o sistema de arquivos SPIFFS
  if (!SPIFFS.begin(true)) {
    Serial.println("Erro ao montar o sistema de arquivos SPIFFS.");
    return;
  }

  // Configurar o ESP32 para funcionar como Access Point
  WiFi.softAP(ssid_ap, password_ap);

  // Configurar o servidor DNS para redirecionar todas as solicitações para o IP do ESP32
  dnsServer.start(53, "*", WiFi.softAPIP());

  // Configurar o servidor web
  server.onNotFound([]() { handleFileRequest(); });
  server.on("/save", HTTP_POST, handleSave);
  server.on("/networks", HTTP_GET, handleNetworks);
  server.begin();
  
  Serial.println("Servidor iniciado");
  Serial.print("Acesse o IP: ");
  Serial.println(WiFi.softAPIP());

  // Esperar algum tempo para garantir que o sistema esteja pronto
  delay(2000);
}

void loop() {
  dnsServer.processNextRequest();
  server.handleClient();
}
