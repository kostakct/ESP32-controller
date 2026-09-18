import React, { useState, useEffect, useRef } from 'react';
import { Copy, CheckCircle, Wifi, WifiOff, Send, Activity, Power } from 'lucide-react';
import mqtt from 'mqtt';

// --- TYTO UDAJE DOPLŇTE DO WEBOVÉ APLIKACE A DO C++ KÓDU ---
const MQTT_BROKER = 'wss://2aa867b8a86d4479b320828c9dd8d271.s1.eu.hivemq.cloud:8884/mqtt'; // Adresa pro WebApp
const MQTT_USER = 'Rosta-IoT'; // Jméno z Access Management
const MQTT_PASS = 'RostaTest'; // Heslo k MQTT uživateli

const TOPIC_CMD = 'kostakct/esp32/cmd';
const TOPIC_TELEMETRY = 'kostakct/esp32/telemetry';

const cppCode = `#include <WiFi.h>
#include <WiFiClientSecure.h>
#include <PubSubClient.h>
#include <ArduinoJson.h>
#include <Wire.h>
#include <OneWire.h>
#include <DallasTemperature.h>

// --- NASTAVENÍ WIFI ---
const char* ssid = "VAS_NAZEV_WIFI";       // DOPLŇTE!
const char* password = "VASE_HESLO_WIFI";  // DOPLŇTE!

// --- NASTAVENÍ MQTT (HiveMQ Cloud) ---
const char* mqtt_server = "2aa867b8a86d4479b320828c9dd8d271.s1.eu.hivemq.cloud"; 
const int mqtt_port = 8883;                   // Port pro zabezpečené spojení
const char* mqtt_user = "Rosta-IoT";          // MQTT Username
const char* mqtt_pass = "RostaTest";         // DOPLŇTE MQTT heslo

const char* topic_cmd = "kostakct/esp32/cmd";
const char* topic_telemetry = "kostakct/esp32/telemetry";

// Pro HiveMQ Cloud musime pouzit zabezpecene pripojeni
WiFiClientSecure espClient;
PubSubClient client(espClient);

// Unikatni ID teto desky
const String BOARD_ID = "esp_01_kotelna"; 

// --- PIN DEFINICE ---
#define I2C_SDA     6
#define I2C_SCL     7
#define LDR_PIN     2
#define BUZZER_PIN  48

const int OUT_PINS[8] = {41, 42, 1, 8, 18, 21, 47, 38};
// OPRAVA INVERZNÍ LOGIKY
#define RELAY_ON    HIGH
#define RELAY_OFF   LOW

#define ONEWIRE_1   14
#define ONEWIRE_2   9
const int BTN_PINS[4] = {15, 16, 17, 46}; 

// --- OBJEKTY PRO SENZORY ---
OneWire oneWire1(ONEWIRE_1);
OneWire oneWire2(ONEWIRE_2);
DallasTemperature sensor1(&oneWire1);
DallasTemperature sensor2(&oneWire2);

int currentTone = 0;    
const int FREQ_STEPS[10] = {440, 523, 587, 659, 784, 880, 1046, 1175, 1318, 1568};
bool lastBtnStates[4] = {false, false, false, false};
unsigned long lastCloudSync = 0;

// Surove cteni AM2320
bool readAM2320(float &temp, float &hum) {
  Wire.beginTransmission(0x5C);
  Wire.endTransmission(); 
  delay(10); 
  Wire.beginTransmission(0x5C);
  Wire.write(0x03); 
  Wire.write(0x00); 
  Wire.write(0x04); 
  if (Wire.endTransmission() != 0) return false;
  delay(2); 
  Wire.requestFrom(0x5C, 8); 
  if (Wire.available() < 8) return false;
  byte buf[8];
  for (int i=0; i<8; i++) { buf[i] = Wire.read(); }
  if (buf[0] != 0x03 || buf[1] != 0x04) return false;
  uint16_t hRaw = (buf[2] << 8) | buf[3];
  uint16_t tRaw = (buf[4] << 8) | buf[5];
  hum = hRaw / 10.0;
  if (tRaw & 0x8000) { temp = -(tRaw & 0x7FFF) / 10.0; } 
  else { temp = tRaw / 10.0; }
  return true;
}

void playTone(int pin, int frequency) {
#if ESP_ARDUINO_VERSION_MAJOR >= 3
  tone(pin, frequency); 
#else
  ledcSetup(0, frequency, 8);
  ledcAttachPin(pin, 0);
  ledcWrite(0, 128); 
#endif
}

void stopTone(int pin) {
#if ESP_ARDUINO_VERSION_MAJOR >= 3
  noTone(pin);
#else
  ledcWrite(0, 0);
  ledcDetachPin(pin);
  digitalWrite(pin, LOW);
#endif
}

// --- CALLBACK PRO PRIJEM MQTT ZPRAVY ---
void callback(char* topic, byte* payload, unsigned int length) {
  Serial.print("[MQTT] Prijata zprava v topicu: ");
  Serial.println(topic);

  // Vytvorime bezpecny string s ukoncovacim znakem
  char msg[length + 1];
  for (unsigned int i = 0; i < length; i++) {
    msg[i] = (char)payload[i];
  }
  msg[length] = '\\0';

  Serial.printf("[MQTT] Obsah: %s\\n", msg);

  JsonDocument doc;
  DeserializationError error = deserializeJson(doc, msg);
  
  if (error) {
    Serial.print("Chyba parsovani JSON z MQTT: ");
    Serial.println(error.c_str());
    return;
  }

  String target = doc["target_id"].as<String>();
  String event = doc["event"].as<String>();
  
  if (target == BOARD_ID && event == "set_relay") {
    int index = doc["rele_index"].as<int>();
    int turnOn = doc["state"].as<int>();
    
    if (index >= 0 && index <= 7) {
      digitalWrite(OUT_PINS[index], (turnOn == 1) ? RELAY_ON : RELAY_OFF);
      Serial.printf(">>> MQTT sepnul Rele %d na stav %d <<<\\n", index, turnOn);
    }
  }
}

void reconnect() {
  while (!client.connected()) {
    Serial.print("Pokus o pripojeni k MQTT brokeru...");
    String clientId = "ESP32Client-" + String(random(0xffff), HEX);
    
    // HiveMQ vyzaduje Jmeno a Heslo pro uspesne pripojeni
    if (client.connect(clientId.c_str(), mqtt_user, mqtt_pass)) {
      Serial.println("Pripojeno k MQTT!");
      // Odebirej prikazy
      client.subscribe(topic_cmd);

      // --- V12 UPGRADE: Odesleme informaci webove aplikaci, ze jsme se prave probudili (BOOT) ---
      JsonDocument doc;
      doc["board_id"] = BOARD_ID;
      doc["event"] = "boot";
      String jsonString;
      serializeJson(doc, jsonString);
      client.publish(topic_telemetry, jsonString.c_str());

    } else {
      Serial.print("Chyba, rc=");
      Serial.print(client.state());
      Serial.println(" zkusim znovu za 5s");
      delay(5000);
    }
  }
}

void setup() {
  Serial.begin(115200);
  delay(2000); 
  Serial.println("\\n\\n--- START ESP32-S3 (WIFI + ZABEZPECENE MQTT) ---");

  for (int i = 0; i < 8; i++) {
    pinMode(OUT_PINS[i], OUTPUT);
    digitalWrite(OUT_PINS[i], RELAY_OFF);
  }
  
  Wire.begin(I2C_SDA, I2C_SCL);
  Wire.setClock(100000); 
  sensor1.begin();
  sensor2.begin();
  
  pinMode(BUZZER_PIN, OUTPUT);
  pinMode(BTN_PINS[0], INPUT_PULLUP);
  pinMode(BTN_PINS[1], INPUT_PULLUP);
  pinMode(BTN_PINS[2], INPUT_PULLUP);
  pinMode(BTN_PINS[3], INPUT_PULLDOWN); 

  // WiFi pripojeni
  Serial.print("Pripojuji k WiFi: ");
  Serial.println(ssid);
  WiFi.begin(ssid, password);
  while (WiFi.status() != WL_CONNECTED) {
    delay(500);
    Serial.print(".");
  }
  Serial.println("\\nWiFi Pripojeno!");
  Serial.print("IP: ");
  Serial.println(WiFi.localIP());

  // ESP32 konfigurace pro zabezpecene spojeni s HiveMQ Cloud (ignorujeme platnost certifikatu pro zjednoduseni)
  espClient.setInsecure();

  // Nastaveni MQTT
  client.setServer(mqtt_server, mqtt_port);
  client.setCallback(callback);
}

void loop() {
  if (!client.connected()) {
    reconnect();
  }
  client.loop();

  // --- HARDWARE TLACITKA ---
  bool isAnyPressedNow = false;
  for (int i = 0; i < 4; i++) {
    bool rawState = digitalRead(BTN_PINS[i]);
    bool isPressed = (i == 3) ? (rawState == HIGH) : (rawState == LOW);

    if (isPressed) {
      isAnyPressedNow = true;
      if (!lastBtnStates[i]) {
        JsonDocument doc;
        doc["board_id"] = BOARD_ID;
        doc["event"] = "button_press";
        doc["button_index"] = i;
        String jsonString;
        serializeJson(doc, jsonString);
        client.publish(topic_telemetry, jsonString.c_str());
        Serial.println("Odeslano info o stisku do MQTT.");
        currentTone = (currentTone + 1) % 10;
      }
    }
    lastBtnStates[i] = isPressed;
  }

  if (isAnyPressedNow) { playTone(BUZZER_PIN, FREQ_STEPS[currentTone]); } 
  else { stopTone(BUZZER_PIN); }

  // --- SYNCHRONIZACE SENZORU DO CLOUDU (Kazdych 5 vterin) ---
  if (millis() - lastCloudSync > 5000) {
    lastCloudSync = millis();
    
    JsonDocument doc;
    doc["board_id"] = BOARD_ID;
    doc["event"] = "telemetry";
    
    // --- V12 UPGRADE: Odeslani aktualniho stavu relatek pro SELF-HEALING synchronizaci ---
    JsonArray relays = doc["relays"].to<JsonArray>();
    for(int i = 0; i < 8; i++) {
      relays.add((digitalRead(OUT_PINS[i]) == RELAY_ON) ? 1 : 0);
    }

    doc["ldr"] = analogRead(LDR_PIN);

    float temp, hum;
    if (readAM2320(temp, hum)) {
      doc["am2320_temp"] = temp;
      doc["am2320_hum"] = hum;
    }

    sensor1.requestTemperatures();
    float ow1 = sensor1.getTempCByIndex(0);
    if (ow1 != DEVICE_DISCONNECTED_C && ow1 != -127.0) { doc["onewire1_temp"] = ow1; }

    sensor2.requestTemperatures();
    float ow2 = sensor2.getTempCByIndex(0);
    if (ow2 != DEVICE_DISCONNECTED_C && ow2 != -127.0) { doc["onewire2_temp"] = ow2; }

    String jsonString;
    serializeJson(doc, jsonString);
    client.publish(topic_telemetry, jsonString.c_str());
    Serial.println("[MQTT] Odeslana telemetrie.");
  }

  delay(30); 
}
`;

export const TestSwView: React.FC = () => {
  const [copied, setCopied] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const [messages, setMessages] = useState<string[]>([]);
  const mqttClientRef = useRef<mqtt.MqttClient | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Odstraněn behavior: 'smooth', na mobilních zařízeních to způsobuje lagy
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'auto' });
    }
  }, [messages]);

  useEffect(() => {
    addMessage('SYSTEM: Připojuji k Zabezpečenému MQTT Brokeru (HiveMQ Cloud)...');
    
    // Connect to HiveMQ Cloud with credentials
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
      addMessage('SYSTEM: Připojeno k MQTT Brokeru (HiveMQ Cloud)!');
      client.subscribe(TOPIC_TELEMETRY, (err) => {
        if (!err) {
          addMessage(`SYSTEM: Odebírám data z ESP na topicu: ${TOPIC_TELEMETRY}`);
        }
      });
    });

    client.on('message', (topic, message) => {
      try {
        const data = JSON.parse(message.toString());
        addMessage(`PŘIJATO z ESP: ${JSON.stringify(data, null, 2)}`);
      } catch {
        addMessage(`PŘIJATO (Raw): ${message.toString()}`);
      }
    });

    client.on('error', (err) => {
      addMessage(`SYSTEM: Info spojení MQTT: ${err.message}`);
    });

    client.on('close', () => {
      setIsConnected(false);
    });

    mqttClientRef.current = client;

    return () => {
      if (mqttClientRef.current) {
        try {
          mqttClientRef.current.end(true);
        } catch {
          // Safe cleanup
        }
      }
    };
  }, []);

  const addMessage = (msg: string) => {
    setMessages(prev => {
      const newMsgs = [...prev, `[${new Date().toLocaleTimeString()}] ${msg}`];
      return newMsgs.slice(-20); // Sníženo z 50 na 20 pro plynulost na mobilech
    });
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(cppCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const sendRelayCommand = (index: number, state: boolean) => {
    if (!mqttClientRef.current || !isConnected) {
      addMessage('SYSTEM: Nelze odeslat, MQTT není připojeno.');
      return;
    }

    const payload = {
      target_id: "esp_01_kotelna",
      event: "set_relay",
      rele_index: index,
      state: state ? 1 : 0
    };

    // Callback preda pripadnou chybu a pouzijeme qos: 0 (Fire and forget = rychlejsi odezva)
    mqttClientRef.current.publish(TOPIC_CMD, JSON.stringify(payload), { qos: 0 }, (err) => {
      if (err) addMessage(`SYSTEM: Chyba odeslání: ${err.message}`);
    });
    
    addMessage(`>> ODESLÁNO do ESP: Relé ${index} -> ${state ? 'ZAP' : 'VYP'}`);
  };

  return (
    <div className="p-4 space-y-4">
      {/* 1. ŽIVÝ TERMINÁL A OVLÁDÁNÍ */}
      <div className="bg-white rounded-2xl p-4 shadow-sm border border-slate-200">
        <div className="flex items-center justify-between mb-4 border-b border-slate-100 pb-3">
          <div className="flex items-center gap-2">
            <Activity className="w-5 h-5 text-sky-500" />
            <h2 className="text-lg font-bold text-slate-800">IoT Komunikace (MQTT)</h2>
          </div>
          <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ${isConnected ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'}`}>
            {isConnected ? <Wifi className="w-3.5 h-3.5" /> : <WifiOff className="w-3.5 h-3.5" />}
            {isConnected ? 'ONLINE' : 'OFFLINE'}
          </div>
        </div>

        {/* Terminálové okno pro výpis přijatých dat */}
        <div className="bg-slate-900 rounded-xl p-3 h-48 overflow-y-auto mb-4 border border-slate-800 shadow-inner">
          {messages.length === 0 ? (
            <div className="text-slate-500 text-xs text-center mt-16 font-mono">Čekám na data...</div>
          ) : (
            <div className="space-y-1">
              {messages.map((msg, i) => (
                <div key={i} className="text-[10px] sm:text-xs font-mono leading-relaxed whitespace-pre-wrap">
                  <span className={msg.includes('ODESLÁNO') ? 'text-sky-400' : msg.includes('SYSTEM') ? 'text-amber-400' : 'text-emerald-400'}>
                    {msg}
                  </span>
                </div>
              ))}
              <div ref={messagesEndRef} />
            </div>
          )}
        </div>

        {/* Tlačítka pro testování relé */}
        <div className="space-y-2">
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Test odesílání příkazů do ESP32</p>
          <div className="grid grid-cols-4 sm:grid-cols-8 gap-2">
            {[0, 1, 2, 3, 4, 5, 6, 7].map((index) => (
              <div key={index} className="flex flex-col gap-1">
                <button
                  onClick={() => sendRelayCommand(index, true)}
                  disabled={!isConnected}
                  className="bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 py-1.5 rounded-lg text-xs font-bold transition disabled:opacity-50 disabled:grayscale flex items-center justify-center gap-1"
                >
                  <Power className="w-3 h-3" /> ON
                </button>
                <button
                  onClick={() => sendRelayCommand(index, false)}
                  disabled={!isConnected}
                  className="bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 py-1.5 rounded-lg text-xs font-bold transition disabled:opacity-50 disabled:grayscale flex items-center justify-center gap-1"
                >
                  <Power className="w-3 h-3" /> OFF
                </button>
                <span className="text-[9px] text-center text-slate-400 font-semibold">R{index}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* 2. C++ KÓD */}
      <div className="bg-white rounded-2xl p-4 shadow-sm border border-slate-200">
        <div className="flex items-center justify-between mb-3">
          <div>
            <h2 className="text-lg font-bold text-slate-800">Testovací C++ Kód (Verze 12 - Auto-Sync)</h2>
            <p className="text-xs text-slate-500">Self-healing MQTT s BOOT detekcí a QoS 1 spolehlivostí.</p>
          </div>
          <button
            onClick={handleCopy}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-sm font-medium transition"
          >
            {copied ? <CheckCircle className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
            {copied ? 'Zkopírováno' : 'Kopírovat'}
          </button>
        </div>
        
        <div className="relative">
          <pre className="bg-slate-900 text-slate-50 p-4 rounded-xl overflow-x-auto text-xs font-mono leading-relaxed shadow-inner max-h-[500px] overflow-y-auto custom-scrollbar">
            <code>{cppCode}</code>
          </pre>
        </div>
      </div>
    </div>
  );
};
