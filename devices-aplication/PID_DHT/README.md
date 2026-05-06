# EcoBreath Shield — Raspberry Pi Pico 2W

Controlador climático com PID, interface web embarcada e configuração dinâmica via dashboard.

## Visão Geral

Sistema embarcado que lê temperatura e umidade (DHT22) e controla dois relés via PID ou modo manual. Toda a configuração é feita pelo navegador — basta conectar no WiFi do Pico e acessar o dashboard.

**Funcionalidades:**
- Leitura de temperatura e umidade (DHT22)
- Controle PID com duty-cycle temporal para relés digitais (ON/OFF)
- Modo manual (liga/desliga direto) — **padrão ao ligar**
- Mapeamento configurável: cada relé pode ser controlado por temperatura ou umidade
- Ação configurável: liga quando valor está acima ou abaixo do setpoint
- Período de atuação configurável (fixo ou automático)
- Indicador de qualidade do ar tipo velocímetro (gauge 0–100%)
- Gráfico em tempo real suavizado (temperatura, umidade, setpoints)
- Log de atuação do PID
- Conexão WiFi com reconexão automática
- DNS captivo (portal automático ao conectar no AP)
- Persistência de todas as configurações em arquivos JSON
- **Build automático do dashboard** no boot

## Hardware

| Componente | Pino | Função |
|---|---|---|
| DHT22 | GP16 | Sensor de temperatura e umidade |
| Relé 1 | GP14 | Atuador 1 (configurável) |
| Relé 2 | GP15 | Atuador 2 (configurável) |

**Lógica dos relés:** por padrão, ativo em nível BAIXO (módulos com optoacoplador). Altere `RELAY_ACTIVE_HIGH` em `lib/config.py` se necessário.

## Estrutura do Projeto

```
PID_DHT/
├── main.py              # Ponto de entrada (chama build automaticamente)
├── build.py             # Gera index.html bundled a partir de web/
├── index.html           # Dashboard (bundled — gerado pelo build)
├── lib/                 # Módulos Python (MicroPython)
│   ├── __init__.py
│   ├── config.py        # Configurações de hardware e defaults
│   ├── pid_controller.py# Controlador PID genérico
│   ├── relay_manager.py # Gerenciador de relés com duty-cycle
│   ├── shared_state.py  # Estado compartilhado + persistência
│   ├── web_server.py    # Servidor HTTP (API + dashboard)
│   └── wifi_manager.py  # WiFi AP/STA + DNS captivo
├── web/                 # Fonte do frontend
│   ├── index.html       # HTML
│   ├── style.css        # CSS
│   └── app.js           # JavaScript
└── config/              # Criada automaticamente em runtime
    ├── setpoints.json   # Temperatura, umidade, modo
    ├── relays.json      # Nomes dos relés
    ├── control.json     # Mapeamento sensor→relé, período
    └── wifi.json        # Credenciais WiFi salvas
```

## Instalação

### 1. Firmware

Instale o MicroPython no Pico 2W:
- Baixe em: https://micropython.org/download/RPI_PICO2_W/
- Segure BOOTSEL, conecte o USB, copie o `.uf2`

### 2. Copiar arquivos para o Pico

Copie para a raiz do filesystem do Pico (via Thonny, mpremote, ou rshell):

```
main.py
build.py
index.html
lib/          (pasta inteira)
web/          (pasta inteira — opcional, só se quiser editar e rebuildar no Pico)
```

Se não quiser que o Pico rebuilde (deploy mínimo), basta copiar apenas `main.py`, `build.py`, `index.html` e `lib/`. O build é pulado silenciosamente se a pasta `web/` não existir.

## Fluxo de Desenvolvimento

1. Edite os arquivos em `web/` (`index.html`, `style.css`, `app.js`)
2. Duas opções:
   - **Build local (recomendado para testar no browser):**
     ```bash
     python3 build.py
     ```
     Gera o `index.html` bundled. Copie pro Pico.
   - **Build no Pico:** Copie a pasta `web/` pro Pico, reseta, e o `main.py` chama `build.build()` automaticamente. Se `web/` for mais novo que `index.html`, rebuilda.

3. O `build.py` é compatível com Python 3 (no PC) e MicroPython (no Pico).

## Uso

### Primeiro boot

1. O Pico cria a rede WiFi **PICO-CLIMATE** (aberta, sem senha)
2. Conecte pelo celular/PC
3. O portal captivo abre automaticamente, ou acesse `http://192.168.4.1`

### Dashboard — Aba Controle

- **Qualidade do Ar**: gauge tipo velocímetro (0–100%) com agulha, baseado em temperatura (20–25°C ideal) e umidade (40–60% ideal)
- **Sensor**: leituras atuais de temperatura e umidade
- **Relés**: status ON/OFF de cada relé
- **Setpoints & Modo** (colapsável):
  - **PID Auto**: define setpoints e o sistema controla automaticamente
  - **Manual**: liga/desliga os relés diretamente (padrão no boot)
- **Gráfico** (colapsável): histórico suavizado de temperatura, umidade e setpoints
- **Log** (colapsável): últimas 50 atuações do PID

### Dashboard — Aba WiFi

- Escanear redes disponíveis
- Conectar a uma rede WiFi (o AP desliga e o acesso passa a ser pelo IP da rede)
- Desconectar (reativa o AP)
- Se a conexão WiFi cair, o AP religa automaticamente

### Dashboard — Aba Config

- **Nomes dos Relés**: defina nomes descritivos (ex: "Ar Condicionado", "Motor Janela")
- **Mapeamento Sensor → Relé**:
  - Qual sensor controla cada relé (Temperatura ou Umidade)
  - Ação: liga quando valor está **acima** do SP (resfriar/desumidificar) ou **abaixo** (aquecer/umidificar)
- **Período de atuação**: tempo do ciclo de duty em segundos. `0` = automático (ajusta entre 5s e 30s baseado na taxa de variação)

## API HTTP

| Método | Endpoint | Descrição |
|---|---|---|
| GET | `/data` | Dados completos (sensor, relés, modo, config) |
| POST | `/setpoints` | Define setpoints e/ou modo |
| POST | `/manual` | Controle manual dos relés |
| GET | `/wifi/scan` | Escanear redes WiFi |
| POST | `/wifi/connect` | Conectar a uma rede |
| POST | `/wifi/disconnect` | Desconectar WiFi |
| POST | `/relays` | Definir nomes dos relés |
| POST | `/control` | Configurar mapeamento e período |
| GET | `/history` | Histórico para gráfico |
| GET | `/log` | Buffer de log |

### Exemplos

```bash
# Definir setpoints
curl -X POST http://192.168.4.1/setpoints \
  -H "Content-Type: application/json" \
  -d '{"temp_sp": 24.0, "hum_sp": 55, "mode": "pid"}'

# Configurar relé 1 para umidade (liga abaixo do SP)
curl -X POST http://192.168.4.1/control \
  -H "Content-Type: application/json" \
  -d '{"r1_sensor":"hum","r1_action":"below","r2_sensor":"temp","r2_action":"above","period":0}'

# Renomear relés
curl -X POST http://192.168.4.1/relays \
  -H "Content-Type: application/json" \
  -d '{"relay1":"Umidificador","relay2":"Ventilador"}'
```

## Configuração (lib/config.py)

| Parâmetro | Default | Descrição |
|---|---|---|
| `PIN_DHT22` | 16 | Pino do sensor DHT22 |
| `PIN_RELAY_FAN` | 14 | Pino do relé 1 |
| `PIN_RELAY_HUMID` | 15 | Pino do relé 2 |
| `RELAY_ACTIVE_HIGH` | False | Lógica do relé (False = ativo LOW) |
| `AP_SSID` | "PICO-CLIMATE" | Nome da rede WiFi do AP |
| `DEFAULT_TEMP_SETPOINT` | 25.0 | Setpoint inicial de temperatura |
| `DEFAULT_HUM_SETPOINT` | 60.0 | Setpoint inicial de umidade |
| `DEFAULT_CONTROL_MODE` | "manual" | Modo padrão no boot |
| `PID_TEMP_KP/KI/KD` | 0.6/0.05/0.1 | Ganhos PID do relé 1 |
| `PID_HUM_KP/KI/KD` | 0.5/0.04/0.08 | Ganhos PID do relé 2 |
| `CONTROL_PERIOD_S` | 10 | Período padrão do duty-cycle (seg) |
| `SENSOR_READ_MS` | 2000 | Intervalo de leitura do sensor (ms) |

## Como funciona o PID com relés digitais

Os relés são ON/OFF, não analógicos. O PID gera um valor de 0.0 a 1.0 (duty) que é convertido em **PWM temporal**:

- `duty = 0.0` → relé desligado o período inteiro
- `duty = 0.5` → relé ligado 50% do período (ex: 5s de 10s)
- `duty = 1.0` → relé ligado o período inteiro

O período é configurável (fixo ou automático). No modo automático, o sistema aumenta o período quando a variação é lenta (menos chaveamento) e diminui quando é rápida (reação mais rápida).

## Licença

Projeto acadêmico — uso livre.
