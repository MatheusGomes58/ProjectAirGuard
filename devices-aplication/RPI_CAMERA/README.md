# EcoBreath Shield — Raspberry Pi Camera Server

Servidor de câmera para Raspberry Pi 3/4/5 com streaming via WebSocket e publicação de frames via MQTT.

## Funcionalidades

- **WebSocket**: streaming de vídeo MJPEG em tempo real (para frontend web)
- **MQTT**: publica frames periódicos (base64) e status do dispositivo
- Configurável (resolução, FPS, qualidade JPEG, intervalo MQTT)

## Requisitos

- Raspberry Pi 3/4/5 com câmera (CSI ou USB)
- Python 3.9+
- Broker MQTT (Mosquitto recomendado)

## Instalação

### 1. Instalar dependências do sistema

```bash
sudo apt update
sudo apt install -y python3-pip python3-picamera2 mosquitto mosquitto-clients
```

### 2. Instalar dependências Python

```bash
cd devices-aplication/RPI_CAMERA
pip3 install -r requirements.txt
```

### 3. Configurar Mosquitto (broker MQTT)

O Mosquitto já vem configurado para rodar localmente. Para permitir conexões externas:

```bash
sudo nano /etc/mosquitto/conf.d/external.conf
```

Adicione:
```
listener 1883
allow_anonymous true
```

Reinicie:
```bash
sudo systemctl restart mosquitto
```

## Uso

```bash
python3 main.py
```

Saída:
```
  EcoBreath Shield — Camera Server
  WebSocket + MQTT

  WebSocket: ws://0.0.0.0:8765
  MQTT Broker: localhost:1883
  MQTT Topic (image): ecobreath/camera/image
  MQTT Topic (status): ecobreath/camera/status
```

## Configuração (config.py)

| Parâmetro | Default | Descrição |
|---|---|---|
| `MQTT_BROKER` | localhost | Endereço do broker MQTT |
| `MQTT_PORT` | 1883 | Porta do broker |
| `MQTT_TOPIC_IMAGE` | ecobreath/camera/image | Tópico para frames |
| `MQTT_TOPIC_STATUS` | ecobreath/camera/status | Tópico para status |
| `WS_HOST` | 0.0.0.0 | Host do WebSocket |
| `WS_PORT` | 8765 | Porta do WebSocket |
| `CAMERA_WIDTH` | 640 | Largura da imagem |
| `CAMERA_HEIGHT` | 480 | Altura da imagem |
| `CAMERA_FPS` | 15 | Frames por segundo |
| `JPEG_QUALITY` | 60 | Qualidade JPEG (1-100) |
| `MQTT_PUBLISH_INTERVAL` | 5 | Intervalo de publicação MQTT (seg) |

## Consumir o WebSocket (frontend)

```javascript
const ws = new WebSocket('ws://RASPBERRY_IP:8765');

ws.onmessage = (event) => {
  if (typeof event.data === 'string') {
    // Mensagem JSON (info)
    const info = JSON.parse(event.data);
    console.log('Camera info:', info);
  } else {
    // Frame JPEG (binary)
    const blob = new Blob([event.data], { type: 'image/jpeg' });
    const url = URL.createObjectURL(blob);
    document.getElementById('camera').src = url;
  }
};
```

## Consumir via MQTT

```bash
# Status
mosquitto_sub -h RASPBERRY_IP -t "ecobreath/camera/status"

# Frames (base64 JSON)
mosquitto_sub -h RASPBERRY_IP -t "ecobreath/camera/image"
```

## Rodar como serviço (systemd)

```bash
sudo nano /etc/systemd/system/ecobreath-camera.service
```

```ini
[Unit]
Description=EcoBreath Camera Server
After=network.target mosquitto.service

[Service]
Type=simple
User=pi
WorkingDirectory=/home/pi/devices-aplication/RPI_CAMERA
ExecStart=/usr/bin/python3 main.py
Restart=always
RestartSec=5

[Install]
WantedBy=multi-user.target
```

```bash
sudo systemctl enable ecobreath-camera
sudo systemctl start ecobreath-camera
```
