# EcoBreath API — Micro-frontend

Interface REST via Firebase Realtime Database para comunicação com o dispositivo EcoBreath Shield.

## Rotas

| Rota | Descrição |
|------|-----------|
| `/` | Interface Swagger-like (status + endpoints + tester) |
| `/api/device?...` | Endpoint público (retorna JSON puro, sem HTML) |

## Endpoints (via URL params)

### Leitura
```
/api/device?get=sensor          → dados do sensor
/api/device?get=config          → configuração completa
```

### Escrita (sensor — usado pelo Pico)
```
/api/device?temperature=25.3&humidity=58.7&relay1=true&relay2=false
```

### Configuração
```
/api/device?mode=auto                                    → muda modo
/api/device?action=set_relay&relay=1&state=true          → liga/desliga relé
/api/device?action=add_setpoint&name=X&sensor=temp&value=28
/api/device?action=remove_setpoint&id=spXXX
/api/device?action=add_action&name=X&relay=1&setpoint_id=spX&condition=above&period=10
/api/device?action=remove_action&id=aXXX
/api/device?action=set_relay_name&relay=1&name=Ventilador
```

## Desenvolvimento

```bash
cd api-aplication
npm install
npm run dev
```

Acessa `http://localhost:3001`

## Deploy

Pode ser hospedado no Firebase Hosting como segundo site:
```bash
firebase hosting:channel:deploy api --project projectairguard
```

## Estrutura Firebase Realtime Database

```
devices/
  pico-001/
    sensor/
      temperature: 25.3
      humidity: 58.7
      relay1: true
      relay2: false
      last_seen: "2026-05-07T..."
    config/
      mode: "auto"
      manual: { "1": false, "2": false }
      relay_names: { "1": "Ventilador", "2": "Umidificador" }
      setpoints: [{ id, name, sensor, value }, ...]
      actions: [{ id, name, relay, setpoint_id, condition, period }, ...]
```
