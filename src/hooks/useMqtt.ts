import { useEffect, useRef, useState } from 'react';
import mqtt from 'mqtt';

const MQTT_BROKER = 'wss://2aa867b8a86d4479b320828c9dd8d271.s1.eu.hivemq.cloud:8884/mqtt';
const MQTT_USER = 'Rosta-IoT';
const MQTT_PASS = 'RostaTest';
const TOPIC_CMD = 'kostakct/esp32/cmd';
const TOPIC_TELEMETRY = 'kostakct/esp32/telemetry';

export function useMqtt() {
  const [isConnected, setIsConnected] = useState(false);
  const [telemetry, setTelemetry] = useState<any>(null);
  const mqttClientRef = useRef<mqtt.MqttClient | null>(null);

  useEffect(() => {
    const client = mqtt.connect(MQTT_BROKER, {
      username: MQTT_USER,
      password: MQTT_PASS,
      clientId: `web-client-${Math.random().toString(16).substring(2, 8)}`,
      reconnectPeriod: 4000,
      connectTimeout: 45000,
      keepalive: 60,
      clean: true,
      protocolVersion: 4,
    });

    client.on('connect', () => {
      setIsConnected(true);
      client.subscribe(TOPIC_TELEMETRY, { qos: 1 });
    });

    client.on('reconnect', () => {
      setIsConnected(false);
    });

    client.on('offline', () => {
      setIsConnected(false);
    });

    client.on('message', (topic, message) => {
      try {
        const data = JSON.parse(message.toString());
        if (topic === TOPIC_TELEMETRY) {
          setTelemetry(data);
        }
      } catch (err) {
        console.warn('Failed to parse MQTT message payload', err);
      }
    });

    client.on('close', () => setIsConnected(false));
    client.on('error', (err) => {
      console.warn('[MQTT] Connection notice:', err.message || err);
      setIsConnected(false);
    });

    mqttClientRef.current = client;

    return () => {
      try {
        client.end(true);
      } catch {
        // Safe cleanup
      }
    };
  }, []);

  const sendRelayCommand = (index: number, state: boolean) => {
    if (!mqttClientRef.current || !isConnected) return;
    const payload = {
      target_id: "esp_01_kotelna",
      event: "set_relay",
      rele_index: index,
      state: state ? 1 : 0
    };
    // Změna na QoS 1 pro garantované doručení
    mqttClientRef.current.publish(TOPIC_CMD, JSON.stringify(payload), { qos: 1 });
  };

  return { isConnected, telemetry, sendRelayCommand };
}
