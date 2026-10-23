# EcoBreath Merged — Protótipo Unificado

Combina o **hardware do CODE_PROJECT** (display GC9A01, dual-core, bateria, botão) com a **lógica do PID_DHT** (controle PID, setpoints dinâmicos, ações, cloud sync, dashboard web completo).

## Arquitetura

```
Core 0 (display_core.py):
  - Display GC9A01 240x240 (SPI)
  - Leitura DHT22
  - Leitura bateria (ADC)
  - Navegação por botão (4 telas)

Core 1 (main.py → uasyncio):
  - WiFi AP + STA
  - DNS Captivo
  - Web Server (dashboard completo)
  - Controle PID (auto/manual)
  - Relay Manager (2 digitais + 1 PWM + RPM)
  - Cloud Sync (Firebase Realtime DB)
```

## Telas do Display

1. **Sensores** — Temperatura e Umidade em tempo real
2. **Relés** — Estado dos 3 relés + modo (Auto/Manual) + RPM
3. **WiFi** — Status da conexão, SSID, IP
4. **Bateria** — Voltagem e percentual

## Como usar

1. Copie todos os arquivos para o Pico 2W via Thonny
2. Estrutura no dispositivo:
   ```
   /main.py
   /config.py
   /gc9a01.py
   /display_core.py
   /build.py
   /lib/__init__.py
   /lib/shared_state.py
   /lib/pid_controller.py
   /lib/relay_manager.py
   /lib/wifi_manager.py
   /lib/web_server.py
   /lib/cloud_sync.py
   /web/index.html
   /web/style.css
   /web/app.js
   ```
3. Na primeira execução, `build.py` gera `index.html` inline
4. Conecte ao AP "EcoBreath-AP" e acesse http://192.168.4.1

## Pinout

| Função | GPIO |
|--------|------|
| Display SCK | 18 |
| Display MOSI | 19 |
| Display CS | 17 |
| Display DC | 20 |
| Display RST | 21 |
| DHT22 | 16 |
| Relé 1 | 14 |
| Relé 2 | 15 |
| PWM Fan | 12 |
| Tach RPM | 13 |
| Botão HOME | 22 |
| Bateria ADC | 26 |
