const functions = require("firebase-functions");
const admin = require("firebase-admin");

admin.initializeApp();
const db = admin.firestore();

/**
 * POST /sensorData
 * 
 * Recebe dados do sensor DHT22 do Pico e salva no Firestore.
 * Retorna comandos pendentes para o dispositivo executar.
 * 
 * Body esperado:
 * {
 *   "device_id": "pico-001",
 *   "temperature": 25.3,
 *   "humidity": 58.7,
 *   "relay1": true,
 *   "relay2": false
 * }
 * 
 * Resposta inclui comandos pendentes (se houver):
 * {
 *   "status": "ok",
 *   "commands": [{"type": "set_mode", "value": "auto"}, ...]
 * }
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

    // Busca comandos pendentes
    const cmdSnapshot = await deviceRef.collection("commands")
      .where("executed", "==", false)
      .orderBy("created_at", "asc")
      .limit(10)
      .get();

    const commands = [];
    const batch = db.batch();
    cmdSnapshot.forEach((doc) => {
      commands.push(doc.data());
      // Marca como executado
      batch.update(doc.ref, { executed: true, executed_at: now.toISOString() });
    });
    if (commands.length > 0) {
      await batch.commit();
    }

    return res.status(200).json({
      status: "ok",
      device_id: device_id,
      temperature: reading.temperature,
      humidity: reading.humidity,
      commands: commands,
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


/**
 * POST /sendCommand
 * 
 * Envia um comando para o dispositivo (será executado no próximo sync).
 * 
 * Body:
 * {
 *   "device_id": "pico-001",
 *   "type": "set_mode",        // tipo do comando
 *   "value": "auto"            // valor (pode ser string, number, object)
 * }
 * 
 * Tipos de comando suportados:
 *   - set_mode: "auto" | "manual"
 *   - set_relay: {relay: 1, state: true}
 *   - add_setpoint: {name, sensor, value}
 *   - remove_setpoint: {id}
 *   - update_setpoint: {id, value}
 *   - add_action: {name, relay, setpoint_id, condition, period}
 *   - remove_action: {id}
 *   - set_relay_name: {relay, name}
 */
exports.sendCommand = functions.https.onRequest(async (req, res) => {
  res.set("Access-Control-Allow-Origin", "*");
  res.set("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.set("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") {
    return res.status(204).send("");
  }

  if (req.method !== "POST") {
    return res.status(405).json({ error: "Use POST" });
  }

  try {
    const { device_id, type, value } = req.body;

    if (!device_id || !type) {
      return res.status(400).json({ error: "device_id e type obrigatorios" });
    }

    const now = new Date();
    const command = {
      type: type,
      value: value || null,
      executed: false,
      created_at: now.toISOString(),
    };

    await db.collection("devices").doc(device_id)
      .collection("commands").add(command);

    return res.status(200).json({ status: "ok", command: command });

  } catch (error) {
    console.error("Erro:", error);
    return res.status(500).json({ error: "Erro interno", detail: error.message });
  }
});
