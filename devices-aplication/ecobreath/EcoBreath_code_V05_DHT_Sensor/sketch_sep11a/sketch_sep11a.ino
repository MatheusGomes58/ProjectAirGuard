/*
somente aplicação do Display e DHT11
11;09;2024
*/

#include <TFT_eSPI.h>   // Biblioteca para o display GC9A01
#include <DHT.h>        // Biblioteca para o sensor DHT

// Configuração do display
TFT_eSPI tft = TFT_eSPI();  // Cria um objeto para o display

// Configuração do DHT11
#define DHTPIN 22       // Pino de dados do DHT11 (GPIO 22)
#define DHTTYPE DHT11   // Tipo do sensor DHT (DHT11)

// Cria um objeto DHT
DHT dht(DHTPIN, DHTTYPE);

void setup() {
  // Iniciar a comunicação serial
  Serial.begin(115200);

  // Inicializar o display
  tft.init();
  
  // Definir a rotação do display (90 graus)
  tft.setRotation(4);  // Rotaciona o display 90 graus

  // Limpar a tela com preto
  tft.fillScreen(TFT_BLACK);

  // Exibir a tela de inicialização
  tft.setTextColor(TFT_WHITE, TFT_BLACK);  // Cor do texto: branco, fundo preto
  tft.setTextSize(2);  // Tamanho do texto

  // Centralizar a mensagem "Iniciando..."
  tft.setCursor(30, 120);  // Ajuste o cursor para centralizar o texto
  tft.println("Iniciando...");
  delay(2000);
  
  //zoas
  tft.fillScreen(TFT_BLACK);
  tft.setCursor(30, 120);  // Ajuste o cursor para centralizar o texto
  tft.println("Se leu, mamou!");
  delay(2000);

  // Exibir no monitor serial
  Serial.println("Sistema iniciando...");

   // Inicializar o DHT11
  dht.begin();

  // Limpar a tela após a inicialização
  tft.fillScreen(TFT_BLACK);
}

void loop() {
  // Ler a umidade e a temperatura do sensor DHT11
  float humidity = dht.readHumidity();    // Umidade
  float temperature = dht.readTemperature();  // Temperatura em Celsius

  // Verificar se houve erro de leitura
  if (isnan(humidity) || isnan(temperature)) {
    Serial.println("Falha ao ler do sensor DHT!");
    return;
  }

  // Limpar a tela antes de desenhar os novos valores
  //tft.fillScreen(TFT_BLACK);

  // Exibir temperatura e umidade no display
  tft.setCursor(30, 100);  // Posição do texto
  tft.println("Temp: " + String(temperature) + " C");  // Exibe a temperatura

  tft.setCursor(30, 140);  // Posição do texto
  tft.println("Hum: " + String(humidity) + " %");  // Exibe a umidade

  // Exibir no monitor serial (opcional)
  Serial.print("Temperatura: ");
  Serial.print(temperature);
  Serial.println(" C");

  Serial.print("Umidade: ");
  Serial.print(humidity);
  Serial.println(" %");

  // Esperar antes da próxima leitura
  delay(500);
}
