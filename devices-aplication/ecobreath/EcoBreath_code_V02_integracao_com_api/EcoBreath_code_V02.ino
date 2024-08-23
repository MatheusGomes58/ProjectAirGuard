#include <WiFi.h>
#include <HTTPClient.h>

//versão mais atual (220824)- funcionando a API e Wifi - V03 implementará somente rede local

// Configurações do Wi-Fi
const char* ssid = "Eventos";
const char* password = "eventos@2024";

// Configuração do botão
const int buttonPin = 0;  // Pin do botão (GPIO0)

// Configurações da requisição HTTP
const char* serverName = "http://10.20.208.177:4000/logs/";  // URL do endpoint

void setup() {
  // Inicializa a comunicação serial
  Serial.begin(115200);
  
  // Configura o pino do botão
  pinMode(buttonPin, INPUT_PULLUP);
  
  // Conecta ao Wi-Fi
  WiFi.begin(ssid, password);
  Serial.print("Conectando-se ao Wi-Fi");
  
  while (WiFi.status() != WL_CONNECTED) {
    delay(1000);
    Serial.print(".");
  }

  Serial.println("\nConectado ao Wi-Fi!");
  Serial.print("Endereço IP: ");
  Serial.println(WiFi.localIP());
}

void loop() {
  // Verifica se o botão foi pressionado
  if (digitalRead(buttonPin) == LOW) {
    delay(50);  // Debounce

    if (digitalRead(buttonPin) == LOW) {  // Confirma a leitura após o debounce
      Serial.println("Botão pressionado, realizando requisição HTTP...");
      fazerRequisicao();
      
      // Aguarda até que o botão seja solto
      while (digitalRead(buttonPin) == LOW) {
        delay(10);
      }
    }
  }
}

void fazerRequisicao() {
  // Verifica se estamos conectados ao Wi-Fi
  if (WiFi.status() == WL_CONNECTED) {
    HTTPClient http;

    // Inicia a requisição HTTP
    http.begin(serverName);

    // Define o tipo de conteúdo da requisição
    http.addHeader("Content-Type", "application/json");

    // Corpo da requisição JSON
    String jsonBody = "{\"action\":\"PushButton\", \"details\":\"on\"}";

    // Realiza a requisição POST
    int httpResponseCode = http.POST(jsonBody);

    // Verifica o código de resposta HTTP
    if (httpResponseCode > 0) {
      // Se a resposta for positiva, imprime o payload
      String response = http.getString();
      Serial.println("Resposta do servidor:");
      Serial.println(response);
    } else {
      Serial.print("Erro na requisição: ");
      Serial.println(httpResponseCode);
    }

    // Finaliza a conexão
    http.end();
  } else {
    Serial.println("Não conectado ao Wi-Fi");
  }
}
