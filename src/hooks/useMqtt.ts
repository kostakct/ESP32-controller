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
  // Fronta neodeslaných zpráv při odpojení/uspání aplikace
  const pendingQueueRef = useRef<Array<{ topic: string; message: string; qos: 0 | 1 | 2 }>>([]);

  // Funkce pro bezpečné odeslání do MQTT s frontou pro případ offline
  const safePublish = (topic: string, message: string, qos: 0 | 1 | 2 = 1) => {
    if (mqttClientRef.current && mqttClientRef.current.connected) {
      mqttClientRef.current.publish(topic, message, { qos }, (err) => {
        if (err) {
          console.warn('[MQTT] Chyba při odeslání zprávy, ukládám do fronty:', err);
          pendingQueueRef.current.push({ topic, message, qos });
        }
      });
    } else {
      console.log('[MQTT] Klient offline, konfigurace/příkaz uložen do čekací fronty');
      pendingQueueRef.current.push({ topic, message, qos });
    }
  };

  useEffect(() => {
    const client = mqtt.connect(MQTT_BROKER, {
      username: MQTT_USER,
      password: MQTT_PASS,
      clientId: `web-client-${Math.random().toString(16).substring(2, 8)}`,
      reconnectPeriod: 2500, // Zrychlený pokus o reconnect při návratu z pozadí
      connectTimeout: 30000,
      keepalive: 30, // 30s keepalive pro mobilní prohlížeče
      clean: true,
      protocolVersion: 4,
    });

    client.on('connect', () => {
      setIsConnected(true);
      console.log('[MQTT] Připojeno k brokeru');
      client.subscribe(TOPIC_TELEMETRY, { qos: 1 }, () => {
        // 1. Po navázání spojení ihned odešleme veškeré čekající zprávy/konfigurace z fronty
        while (pendingQueueRef.current.length > 0) {
          const item = pendingQueueRef.current.shift();
          if (item) {
            console.log('[MQTT] Odesílám čekající zprávu z fronty:', item.message);
            client.publish(item.topic, item.message, { qos: item.qos });
          }
        }

        // 2. Po navázání spojení ihned vyžádáme skutečný aktuální stav relé a senzorů z ESP32
        client.publish(TOPIC_CMD, JSON.stringify({
          target_id: "esp_01_kotelna",
          event: "get_status"
        }), { qos: 1 });
      });
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

    // Detekce probuzení telefonu / přepnutí záložky z pozadí zpět do popředí
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        console.log('[MQTT] Aplikace probuzena z pozadí telefonu, kontroluji MQTT spojení...');
        if (!client.connected) {
          try {
            client.reconnect();
          } catch (e) {
            console.warn('[MQTT] Reconnect trigger error', e);
          }
        } else {
          // Pokud je spojení aktivní, odešleme čekající konfigurace a vyžádáme stav
          while (pendingQueueRef.current.length > 0) {
            const item = pendingQueueRef.current.shift();
            if (item) {
              client.publish(item.topic, item.message, { qos: item.qos });
            }
          }
          client.publish(TOPIC_CMD, JSON.stringify({
            target_id: "esp_01_kotelna",
            event: "get_status"
          }), { qos: 1 });
        }
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('focus', handleVisibilityChange);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('focus', handleVisibilityChange);
      try {
        client.end(true);
      } catch {
        // Safe cleanup
      }
    };
  }, []);

  const sendRelayCommand = (index: number, state: boolean, durationSec?: number) => {
    const payload: any = {
      target_id: "esp_01_kotelna",
      event: "set_relay",
      rele_index: index,
      state: state ? 1 : 0
    };
    if (durationSec !== undefined && durationSec > 0) {
      payload.duration = durationSec;
    }
    safePublish(TOPIC_CMD, JSON.stringify(payload), 1);
  };

  const sendRelayConfig = (index: number, isDelay: boolean, delaySec: number, guardMin: number, powerOn: string) => {
    const payload = {
      target_id: "esp_01_kotelna",
      event: "config_relay",
      rele_index: index,
      is_delay: isDelay,
      delay_sec: delaySec,
      max_guard_min: guardMin,
      power_on: powerOn
    };
    safePublish(TOPIC_CMD, JSON.stringify(payload), 1);
  };

  const requestStatus = () => {
    const payload = {
      target_id: "esp_01_kotelna",
      event: "get_status"
    };
    safePublish(TOPIC_CMD, JSON.stringify(payload), 1);
  };

  return { isConnected, telemetry, sendRelayCommand, sendRelayConfig, requestStatus };
}
