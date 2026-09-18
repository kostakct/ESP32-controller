import React, { useState } from 'react';
import { X, Copy, Check, FileCode, Cpu, ShieldCheck } from 'lucide-react';

interface EspCodeModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const EspCodeModal: React.FC<EspCodeModalProps> = ({ isOpen, onClose }) => {
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  const cppCode = `/*
  =============================================================
  ESP32-S3 IoT Controller (eWeLink style) - Verze 12 Auto-Sync
  =============================================================
  Uloženo také v repozitáři v souboru: firmware/ESP32_Controller_V12.ino
*/

#include <WiFi.h>
#include <WiFiClientSecure.h>
#include <PubSubClient.h>
#include <ArduinoJson.h>
#include <Wire.h>
#include <OneWire.h>
#include <DallasTemperature.h>

const char* ssid = "VAS_NAZEV_WIFI";       // Doplňte název své WiFi
const char* password = "VASE_HESLO_WIFI";  // Doplňte heslo své WiFi

const char* mqtt_server = "2aa867b8a86d4479b320828c9dd8d271.s1.eu.hivemq.cloud"; 
const int mqtt_port = 8883;                   
const char* mqtt_user = "Rosta-IoT";          
const char* mqtt_pass = "RostaTest";         

const char* topic_cmd = "kostakct/esp32/cmd";
const char* topic_telemetry = "kostakct/esp32/telemetry";
const String BOARD_ID = "esp_01_kotelna"; 

#define I2C_SDA     6
#define I2C_SCL     7
#define LDR_PIN     2
#define BUZZER_PIN  48
const int OUT_PINS[8] = {41, 42, 1, 8, 18, 21, 47, 38};
#define RELAY_ON    HIGH
#define RELAY_OFF   LOW
#define ONEWIRE_1   14
#define ONEWIRE_2   9
const int BTN_PINS[4] = {15, 16, 17, 46}; 

OneWire oneWire1(ONEWIRE_1);
OneWire oneWire2(ONEWIRE_2);
DallasTemperature sensor1(&oneWire1);
DallasTemperature sensor2(&oneWire2);

WiFiClientSecure espClient;
PubSubClient client(espClient);

unsigned long lastCloudSync = 0;
bool lastBtnStates[4] = {false, false, false, false};

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
  hum = ((buf[2] << 8) | buf[3]) / 10.0;
  uint16_t tRaw = (buf[4] << 8) | buf[5];
  temp = (tRaw & 0x8000) ? -(tRaw & 0x7FFF) / 10.0 : tRaw / 10.0;
  return true;
}

void callback(char* topic, byte* payload, unsigned int length) {
  char msg[length + 1];
  for (unsigned int i = 0; i < length; i++) { msg[i] = (char)payload[i]; }
  msg[length] = '\\0';

  JsonDocument doc;
  if (deserializeJson(doc, msg)) return;

  if (doc["target_id"].as<String>() == BOARD_ID && doc["event"].as<String>() == "set_relay") {
    int index = doc["rele_index"].as<int>();
    int turnOn = doc["state"].as<int>();
    if (index >= 0 && index <= 7) {
      digitalWrite(OUT_PINS[index], (turnOn == 1) ? RELAY_ON : RELAY_OFF);
      Serial.printf(">>> Rele %d nastaveno na %d <<<\\n", index, turnOn);
    }
  }
}

void reconnect() {
  while (!client.connected()) {
    String clientId = "ESP32Client-" + String(random(0xffff), HEX);
    if (client.connect(clientId.c_str(), mqtt_user, mqtt_pass)) {
      client.subscribe(topic_cmd);

      // Odeslání BOOT informace pro webovou aplikaci (vyžádá si synchronizaci)
      JsonDocument doc;
      doc["board_id"] = BOARD_ID;
      doc["event"] = "boot";
      String jsonString; serializeJson(doc, jsonString);
      client.publish(topic_telemetry, jsonString.c_str());
    } else {
      delay(5000);
    }
  }
}

void setup() {
  Serial.begin(115200);
  for (int i = 0; i < 8; i++) {
    pinMode(OUT_PINS[i], OUTPUT);
    digitalWrite(OUT_PINS[i], RELAY_OFF);
  }
  pinMode(BUZZER_PIN, OUTPUT);
  pinMode(BTN_PINS[0], INPUT_PULLUP);
  pinMode(BTN_PINS[1], INPUT_PULLUP);
  pinMode(BTN_PINS[2], INPUT_PULLUP);
  pinMode(BTN_PINS[3], INPUT_PULLDOWN); 

  Wire.begin(I2C_SDA, I2C_SCL);
  sensor1.begin(); sensor2.begin();

  WiFi.begin(ssid, password);
  while (WiFi.status() != WL_CONNECTED) delay(500);

  espClient.setInsecure();
  client.setServer(mqtt_server, mqtt_port);
  client.setCallback(callback);
}

void loop() {
  if (!client.connected()) reconnect();
  client.loop();

  // Tlačítka
  for (int i = 0; i < 4; i++) {
    bool raw = digitalRead(BTN_PINS[i]);
    bool pressed = (i == 3) ? (raw == HIGH) : (raw == LOW);
    if (pressed && !lastBtnStates[i]) {
      JsonDocument doc;
      doc["board_id"] = BOARD_ID;
      doc["event"] = "button_press";
      doc["button_index"] = i;
      String jsonString; serializeJson(doc, jsonString);
      client.publish(topic_telemetry, jsonString.c_str());
    }
    lastBtnStates[i] = pressed;
  }

  // Telemetrie (5s)
  if (millis() - lastCloudSync > 5000) {
    lastCloudSync = millis();
    JsonDocument doc;
    doc["board_id"] = BOARD_ID;
    doc["event"] = "telemetry";
    
    JsonArray relays = doc["relays"].to<JsonArray>();
    for(int i = 0; i < 8; i++) {
      relays.add((digitalRead(OUT_PINS[i]) == RELAY_ON) ? 1 : 0);
    }

    doc["ldr"] = analogRead(LDR_PIN);
    float t, h; if (readAM2320(t, h)) { doc["am2320_temp"] = t; doc["am2320_hum"] = h; }
    sensor1.requestTemperatures();
    float ow1 = sensor1.getTempCByIndex(0);
    if (ow1 != -127.0 && ow1 != 85.0) doc["onewire1_temp"] = ow1;
    sensor2.requestTemperatures();
    float ow2 = sensor2.getTempCByIndex(0);
    if (ow2 != -127.0 && ow2 != 85.0) doc["onewire2_temp"] = ow2;

    String jsonString; serializeJson(doc, jsonString);
    client.publish(topic_telemetry, jsonString.c_str());
  }

  delay(20); 
}`;

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(cppCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {
      // Fallback
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-slate-950/80 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-4xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden text-slate-100">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-slate-800 bg-slate-900/90">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-sky-500/20 text-sky-400 flex items-center justify-center border border-sky-500/30">
              <FileCode className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-slate-100 text-sm sm:text-base">TEST SW ESP32 (.ino firmware)</h3>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-sky-500/20 text-sky-300 border border-sky-400/30">
                  Verze 12 Auto-Sync
                </span>
              </div>
              <p className="text-xs text-slate-400">Zdrojový kód pro Arduino IDE / ESP32-S3 desku</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleCopy}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition shadow-xs ${
                copied
                  ? 'bg-emerald-600 text-white'
                  : 'bg-sky-600 hover:bg-sky-500 text-white active:scale-95'
              }`}
            >
              {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
              <span>{copied ? 'Zkopírováno!' : 'Kopírovat kód'}</span>
            </button>

            <button
              onClick={onClose}
              className="w-8 h-8 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 flex items-center justify-center transition"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Info banner */}
        <div className="bg-slate-800/60 px-5 py-2.5 border-b border-slate-800 flex items-center justify-between text-xs text-slate-300 flex-wrap gap-2">
          <div className="flex items-center gap-4">
            <span className="flex items-center gap-1 text-slate-400">
              <Cpu className="w-4 h-4 text-sky-400" /> ESP32-S3 (8x Relé, 4x Vstup)
            </span>
            <span className="flex items-center gap-1 text-slate-400">
              <ShieldCheck className="w-4 h-4 text-emerald-400" /> TLS HiveMQ Cloud
            </span>
          </div>
          <span className="text-[11px] text-slate-400">
            Soubor v repozitáři: <code className="text-sky-300 bg-slate-800 px-1.5 py-0.5 rounded">firmware/ESP32_Controller_V12.ino</code>
          </span>
        </div>

        {/* Code Content */}
        <div className="flex-1 min-h-0 overflow-auto p-4 bg-slate-950 font-mono text-xs text-slate-300 selection:bg-sky-700 selection:text-white leading-relaxed">
          <pre>{cppCode}</pre>
        </div>

        {/* Footer */}
        <div className="px-5 py-2.5 border-t border-slate-800 bg-slate-900/90 flex items-center justify-between text-xs text-slate-400">
          <span>Nezapomeňte v kódu před nahráním zadat vaše jméno a heslo WiFi.</span>
          <button
            onClick={onClose}
            className="px-4 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 transition"
          >
            Zavřít
          </button>
        </div>
      </div>
    </div>
  );
};
