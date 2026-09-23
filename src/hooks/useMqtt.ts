import { useEffect, useRef, useState } from 'react';
import mqtt from 'mqtt';

const MQTT_BROKER = 'wss://2aa867b8a86d4479b320828c9dd8d271.s1.eu.hivemq.cloud:8884/mqtt';
const MQTT_USER = 'Rosta-IoT';
const MQTT_PASS = 'RostaTest';
const TOPIC_CMD = 'kostakct/esp32/cmd';
const TOPIC_TELEMETRY = 'kostakct/esp32/telemetry';

// Surová podoba časovače tak, jak ho posílá a ukládá ESP32 (NVS slot, ne UI id).
export interface EspSchedule {
  slot: number;
  relay_index: number; // 0-7
  hour: number;
  minute: number;
  action: 'ON' | 'OFF';
  repeat_type: 'ONCE' | 'DAILY' | 'WEEKDAYS' | 'WEEKENDS' | 'CUSTOM';
  days_mask: number; // bit0=Ne ... bit6=So, jen pro CUSTOM
  enabled: boolean;
}

export function useMqtt() {
  const [isConnected, setIsConnected] = useState(false);
  const [telemetry, setTelemetry] = useState<any>(null);
  // Autoritativní seznam časovačů, jak je má aktuálně uložené ESP32 v NVS.
  const [schedules, setSchedules] = useState<EspSchedule[]>([]);
  // Pokud ESP32 na uložení/smazání časovače vůbec nezareaguje (typicky proto,
  // že běží starší firmware bez podpory "save_schedule"/"get_schedules"),
  // appka to po pár vteřinách nahlásí místo tichého selhání.
  const [scheduleCommandError, setScheduleCommandError] = useState<string | null>(null);
  const scheduleAckTimeoutRef = useRef<number | null>(null);
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

        // 3. A rovnou i aktuální seznam časovačů uložených v ESP32 (NVS je zdroj pravdy)
        client.publish(TOPIC_CMD, JSON.stringify({
          target_id: "esp_01_kotelna",
          event: "get_schedules"
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
          if (data.event === 'schedules_response' && Array.isArray(data.schedules)) {
            // Samostatný kanál stavu - ESP32 je jediný zdroj pravdy pro časovače.
            setSchedules(data.schedules);
            setScheduleCommandError(null);
            if (scheduleAckTimeoutRef.current !== null) {
              window.clearTimeout(scheduleAckTimeoutRef.current);
              scheduleAckTimeoutRef.current = null;
            }
          } else {
            setTelemetry(data);
          }
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

  const requestSchedules = () => {
    safePublish(TOPIC_CMD, JSON.stringify({
      target_id: "esp_01_kotelna",
      event: "get_schedules"
    }), 1);
  };

  // slot: undefined/-1 = nová položka (ESP sám přidělí první volný slot a pošle
  // zpět aktualizovaný seznam), jinak přepíše existující slot.
  const sendSaveSchedule = (schedule: Omit<EspSchedule, 'slot'> & { slot?: number }) => {
    const payload = {
      target_id: "esp_01_kotelna",
      event: "save_schedule",
      slot: schedule.slot ?? -1,
      relay_index: schedule.relay_index,
      hour: schedule.hour,
      minute: schedule.minute,
      action: schedule.action,
      repeat_type: schedule.repeat_type,
      days_mask: schedule.days_mask,
      enabled: schedule.enabled,
    };
    safePublish(TOPIC_CMD, JSON.stringify(payload), 1);
    armScheduleAckWatchdog();
  };

  const sendDeleteSchedule = (slot: number) => {
    safePublish(TOPIC_CMD, JSON.stringify({
      target_id: "esp_01_kotelna",
      event: "delete_schedule",
      slot,
    }), 1);
    armScheduleAckWatchdog();
  };

  function armScheduleAckWatchdog() {
    setScheduleCommandError(null);
    if (scheduleAckTimeoutRef.current !== null) {
      window.clearTimeout(scheduleAckTimeoutRef.current);
    }
    scheduleAckTimeoutRef.current = window.setTimeout(() => {
      setScheduleCommandError(
        'ESP32 nepotvrdilo uložení časovače do 4 vteřin. Nejpravděpodobnější příčina: ' +
        'na desce ještě neběží firmware v14 s podporou časovačů (save_schedule/get_schedules) ' +
        '- zkontroluj, že máš nahranou aktuální verzi .ino, a zkus to znovu.'
      );
    }, 4000);
  }

  return {
    isConnected,
    telemetry,
    schedules,
    scheduleCommandError,
    sendRelayCommand,
    sendRelayConfig,
    requestStatus,
    requestSchedules,
    sendSaveSchedule,
    sendDeleteSchedule,
  };
}
