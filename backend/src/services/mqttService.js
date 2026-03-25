/**
 * Servicio MQTT para recibir datos de sensores físicos.
 * 
 * Tópico esperado: parking/sensor/{sensorId}
 * Payload esperado: { "status": 0 } o { "status": 1 }
 * 
 * Para probar localmente puedes usar Mosquitto:
 *   mosquitto_pub -t "parking/sensor/SENSOR_A01" -m '{"status":1}'
 */

const { processSensorUpdate } = require('./sensorService');

let mqttClient = null;

function initMQTT(io, prisma) {
  const mqtt = require('mqtt');
  const brokerUrl = process.env.MQTT_BROKER_URL;
  const topicPrefix = process.env.MQTT_TOPIC_PREFIX || 'parking/sensor';

  const options = {};
  if (process.env.MQTT_USERNAME) options.username = process.env.MQTT_USERNAME;
  if (process.env.MQTT_PASSWORD) options.password = process.env.MQTT_PASSWORD;

  console.log(`[MQTT] Conectando a ${brokerUrl}...`);
  mqttClient = mqtt.connect(brokerUrl, options);

  mqttClient.on('connect', () => {
    console.log(`[MQTT] ✅ Conectado al broker: ${brokerUrl}`);
    mqttClient.subscribe(`${topicPrefix}/+`, (err) => {
      if (err) {
        console.error('[MQTT] Error al suscribirse:', err);
      } else {
        console.log(`[MQTT] Suscrito al tópico: ${topicPrefix}/+`);
      }
    });
  });

  mqttClient.on('message', async (topic, payload) => {
    try {
      const sensorId = topic.split('/').pop();
      const data = JSON.parse(payload.toString());

      console.log(`[MQTT] Mensaje recibido - Sensor: ${sensorId}, Status: ${data.status}`);

      await processSensorUpdate({
        sensorId,
        status: Number(data.status),
        userId: data.userId || null,
        io,
        prisma,
      });
    } catch (error) {
      console.error('[MQTT] Error procesando mensaje:', error.message);
    }
  });

  mqttClient.on('error', (error) => {
    console.error('[MQTT] Error de conexión:', error.message);
  });

  mqttClient.on('disconnect', () => {
    console.log('[MQTT] Desconectado del broker');
  });

  return mqttClient;
}

function getMQTTClient() {
  return mqttClient;
}

module.exports = { initMQTT, getMQTTClient };
