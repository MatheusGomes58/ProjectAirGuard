# EcoBreath Shield — Cloud Functions

API serverless no Firebase Cloud Functions para receber dados dos sensores do Pico e salvar no Firestore.

## Endpoints

### POST `/sensorData`

Recebe dados do sensor e salva no Firestore.

**Body:**
```json
{
  "device_id": "pico-001",
  "temperature": 25.3,
  "humidity": 58.7,
  "relay1": true,
  "relay2": false
}
```

**Resposta:**
```json
{
  "status": "ok",
  "message": "Dados salvos",
  "device_id": "pico-001",
  "temperature": 25.3,
  "humidity": 58.7
}
```

**Firestore:**
- `devices/{device_id}/readings/{auto-id}` — histórico de leituras
- `devices/{device_id}` — último dado (latest)

### GET `/deviceData?device_id=pico-001&limit=50`

Retorna as últimas leituras de um dispositivo.

## Deploy

```bash
cd cloud-functions
npm install
firebase login
firebase deploy --only functions
```

Após o deploy, a URL será algo como:
```
https://us-central1-projectairguard.cloudfunctions.net/sensorData
```

## Configurar no Pico

No dashboard do EcoBreath Shield, vá em Config (futuramente) ou via API:

```bash
curl -X POST http://192.168.4.1/cloud \
  -H "Content-Type: application/json" \
  -d '{
    "url": "https://us-central1-projectairguard.cloudfunctions.net/sensorData",
    "device_id": "pico-001",
    "interval": 30,
    "enabled": true
  }'
```

- `url`: URL da Cloud Function (obtida após deploy)
- `device_id`: identificador único do dispositivo
- `interval`: intervalo de envio em segundos (mínimo 10)
- `enabled`: true para ativar o sync

## Estrutura no Firestore

```
devices/
  pico-001/
    temperature: 25.3
    humidity: 58.7
    relay1: true
    relay2: false
    last_seen: "2026-05-06T..."
    readings/
      {auto-id}/
        temperature: 25.3
        humidity: 58.7
        relay1: true
        relay2: false
        created_at: "2026-05-06T..."
```
