#include <DHT.h>
#include <Wire.h>
#include <ScioSense_ENS160.h>

#define DHTPIN 4          // GPIO4 - pino ao qual o DHT11 está conectado
#define DHTTYPE DHT11     // Defina o tipo do sensor DHT
#define MICS5524_PIN A0   // Pino analógico ao qual o MICS5524 está conectado

DHT dht(DHTPIN, DHTTYPE); // Inicialize o objeto DHT
ScioSense_ENS160 ens160;  // Crie um objeto para o sensor ENS160

/***************************************************************************************/

void setup() {
  Serial.begin(115200);   // Inicie a comunicação serial
  dht.begin();            // Inicie o sensor DHT
  
  // Inicie o sensor ENS160
  if (!ens160.begin()) {
    Serial.println("Falha ao inicializar o ENS160!");
    while (1);
  }
}

void loop() {
  delay(2000);

  /***************************************************************************************/
  // DHT11

  // Leitura de umidade e temperatura do DHT11
  float humidity = dht.readHumidity();
  float temperature = dht.readTemperature();

  // Verifique se houve falha na leitura do DHT11
  if (isnan(humidity) || isnan(temperature)) {
    Serial.println("Falha ao ler do sensor DHT!");
    return;
  }

  /***************************************************************************************/
  // ENS160

  // Solicita a leitura dos dados do ENS160
  ens160.measure();

  /***************************************************************************************/
  // MICS5524

  // Leitura do valor analógico do MICS5524
  int mics5524Value = analogRead(MICS5524_PIN);
  
  // Convertendo o valor analógico para uma tensão (em mV ou V)
  float voltage = mics5524Value * (5.0 / 1023.0);  // 5.0V é a tensão de referência do ADC
  
  /***************************************************************************************/
  // SERIAL PRINT

  // Exibe os dados do DHT11
  Serial.print("Umidade: ");
  Serial.print(humidity);
  Serial.print("%\t");

  Serial.print("Temperatura: ");
  Serial.print(temperature);
  Serial.println(" °C");

  // Exibe os dados do ENS160
  Serial.print("Qualidade do Ar (AQI): ");
  Serial.println(ens160.getAQI());

  Serial.print("eCO2: ");
  Serial.println(ens160.geteCO2());

  Serial.print("TVOC: ");
  Serial.println(ens160.getTVOC());

  // Exibe o valor do MICS5524
  Serial.print("MICS5524 (CO/Gás): ");
  Serial.print(mics5524Value);
  Serial.print(" (Valor Analógico), ");
  Serial.print(voltage);
  Serial.println(" V (Tensão)");

  Serial.println();
}
