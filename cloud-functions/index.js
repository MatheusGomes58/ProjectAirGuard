const functions = require("firebase-functions");
const admin = require("firebase-admin");

admin.initializeApp();
const db = admin.firestore();

/**
 * POST /sensorData
 * 
 * Recebe dados do sensor DHT22 do Pico e salva no Firestore.
 * 
 * Body esperado:
 * {
 *   "device_id": "pico-001",       // identificador do dispositivo
 *   "temperature": 25.3,           // °C
 *   "humidity": 58.7,              // %
 *   "relay1": true,                // estado do relé 1 (opcional)
 *   "relay2": false                // estado do relé 2 (opcional)
 * }
 * 
 * Salva em:
 *   Firestore: devices/{device_id}/readings/{auto-id}
 *   Firestore: devices/{device_id}/latest (documento único com último dado)
 */
exports.sensorData = functions.https.onRequest(async (req, res) => {
  // CORS
  res.set("Access-Control-Allow-Origin", "*");
  res.set("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.set("Access-Control-Allow-Headers", "Content-Type, Authorization");

  if (req.method === "OPTIONS") {
    return res.status(204).send("");
  }

  if (req.method !== "POST") {
    return res.status(405).json({ error: "Metodo nao permitido. Use POST." });
  }

  try {
    const { device_id, temperature, humidity, relay1, relay2 } = req.body;

    // Validação
    if (!device_id) {
      return res.status(400).json({ error: "device_id obrigatorio" });
    }
    if (temperature === undefined || humidity === undefined) {
      return res.status(400).json({ error: "temperature e humidity obrigatorios" });
    }

    const timestamp = admin.firestore.FieldValue.serverTimestamp();
    const now = new Date();

    const reading = {
      temperature: Number(temperature),
      humidity: Number(humidity),
      relay1: relay1 || false,
      relay2: relay2 || false,
      timestamp: timestamp,
      created_at: now.toISOString(),
    };

    // Salva na subcoleção de leituras
    const deviceRef = db.collection("devices").doc(device_id);
    await deviceRef.collection("readings").add(reading);

    // Atualiza o documento "latest" com o último dado
    await deviceRef.set({
      ...reading,
      timestamp: timestamp,
      last_seen: now.toISOString(),
    }, { merge: true });

    return res.status(200).json({
      status: "ok",
      message: "Dados salvos",
      device_id: device_id,
      temperature: reading.temperature,
      humidity: reading.humidity,
    });

  } catch (error) {
    console.error("Erro ao salvar dados:", error);
    return res.status(500).json({ error: "Erro interno", detail: error.message });
  }
});

/**
 * GET /deviceData?device_id=pico-001&limit=50
 * 
 * Retorna as últimas leituras de um dispositivo.
 */
exports.deviceData = functions.https.onRequest(async (req, res) => {
  res.set("Access-Control-Allow-Origin", "*");
  res.set("Access-Control-Allow-Methods", "GET, OPTIONS");
  res.set("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") {
    return res.status(204).send("");
  }

  if (req.method !== "GET") {
    return res.status(405).json({ error: "Use GET" });
  }

  try {
    const device_id = req.query.device_id;
    const limit = parseInt(req.query.limit) || 50;

    if (!device_id) {
      return res.status(400).json({ error: "device_id obrigatorio" });
    }

    const snapshot = await db
      .collection("devices")
      .doc(device_id)
      .collection("readings")
      .orderBy("timestamp", "desc")
      .limit(limit)
      .get();

    const readings = [];
    snapshot.forEach((doc) => {
      const data = doc.data();
      readings.push({
        id: doc.id,
        temperature: data.temperature,
        humidity: data.humidity,
        relay1: data.relay1,
        relay2: data.relay2,
        created_at: data.created_at,
      });
    });

    // Pega o último dado
    const latestDoc = await db.collection("devices").doc(device_id).get();
    const latest = latestDoc.exists ? latestDoc.data() : null;

    return res.status(200).json({
      device_id: device_id,
      latest: latest ? {
        temperature: latest.temperature,
        humidity: latest.humidity,
        relay1: latest.relay1,
        relay2: latest.relay2,
        last_seen: latest.last_seen,
      } : null,
      readings: readings,
      count: readings.length,
    });

  } catch (error) {
    console.error("Erro:", error);
    return res.status(500).json({ error: "Erro interno", detail: error.message });
  }
});
