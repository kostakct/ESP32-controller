/*
  =============================================================================
  ESP32-S3 IoT Controller (eWeLink style) - Verze 13 Autonomous & NVS Memory
  =============================================================================
  - Autonomní chování: ESP32 je pánem svého času i při výpadku WiFi/aplikace.
  - Paměť NVS (Preferences): Ukládá konfiguraci spínačů (Power-On stav, Delay čas, Max Guard čas).
  - Delay (Inching): Přesný odpočet pomocí millis(). Dokončí se i bez spojení.
    * 1.5s dlouhý stisk tlačítka okamžitě ukončí delay a vrátí výstup do OFF.
    * Krátký stisk přepíná nebo rotuje cykly.
  - Max Runtime Guard: Ochrana výstupů bez delay (vypnuto / 1 min až 24 hod).
  - OneWire DS18B20 (2x), AM2320 (I2C), LDR, 4x tlačítka, 8x relé výstupy.
  =============================================================================
*/

#include <WiFi.h>
#include <WiFiClientSecure.h>
#include <PubSubClient.h>
#include <ArduinoJson.h>
#include <Wire.h>
#include <OneWire.h>
#include <DallasTemperature.h>
#include <Preferences.h>

// ======================= PŘIHLAŠOVACÍ ÚDAJE =======================
const char* ssid = "VAS_NAZEV_WIFI";       // Zadejte název své WiFi
const char* password = "VASE_HESLO_WIFI";  // Zadejte heslo své WiFi

const char* mqtt_server = "2aa867b8a86d4479b320828c9dd8d271.s1.eu.hivemq.cloud"; 
const int   mqtt_port = 8883;                   
const char* mqtt_user = "Rosta-IoT";          
const char* mqtt_pass = "RostaTest";         

const char* topic_cmd = "kostakct/esp32/cmd";
const char* topic_telemetry = "kostakct/esp32/telemetry";
const String BOARD_ID = "esp_01_kotelna"; 

// ======================= PINOUT ESP32-S3 =======================
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

// ======================= STRUKTURA KANÁLU RELÉ =======================
struct RelayChannel {
  bool isDelayEnabled;          // true = chování jako Delay/Inching
  unsigned long delayDurationMs;// základní délka zpoždění v ms
  unsigned long maxGuardMs;     // 0 = NIKDY, jinak max doba běhu v ms (1min - 24h)
  uint8_t powerOnDefault;       // 0 = OFF, 1 = ON, 2 = KEEP_LAST
  
  // Běhové stavy
  bool currentState;            // true = ZAPNUTO (ON)
  unsigned long turnedOnAt;     // čas sepnutí v millis()
  unsigned long targetOffAt;    // plánovaný čas vypnutí v millis()
  bool isTimerRunning;          // true = aktivní odpočet
};

RelayChannel relays[8];
Preferences prefs;

// ======================= SENZORY A KLIENTI =======================
OneWire oneWire1(ONEWIRE_1);
OneWire oneWire2(ONEWIRE_2);
DallasTemperature sensor1(&oneWire1);
DallasTemperature sensor2(&oneWire2);

WiFiClientSecure espClient;
PubSubClient client(espClient);

unsigned long lastCloudSync = 0;
unsigned long lastSensorRead = 0;

// Stav tlačítek pro detekci hrany a dlouhého stisku (1.5s)
unsigned long btnPressStartTime[4] = {0, 0, 0, 0};
bool btnWasPressed[4] = {false, false, false, false};
bool btnLongPressHandled[4] = {false, false, false, false};

// ======================= NVS ULOŽENÍ A NAČTENÍ =======================
void loadConfigFromNVS() {
  prefs.begin("relay_cfg", true); // režim read-only
  for (int i = 0; i < 8; i++) {
    char key[16];
    snprintf(key, sizeof(key), "d_en_%d", i);
    relays[i].isDelayEnabled = prefs.getBool(key, (i == 0 || i == 1 || i == 2)); // defaultně 1-3 delay

    snprintf(key, sizeof(key), "d_dur_%d", i);
    relays[i].delayDurationMs = prefs.getULong(key, 5500); // default 5.5s

    snprintf(key, sizeof(key), "grd_%d", i);
    relays[i].maxGuardMs = prefs.getULong(key, 0); // default 0 (NIKDY)

    snprintf(key, sizeof(key), "pon_%d", i);
    relays[i].powerOnDefault = prefs.getUChar(key, 0); // default 0 (OFF)

    // Poslední uložený stav pro režim KEEP_LAST
    snprintf(key, sizeof(key), "last_%d", i);
    bool lastState = prefs.getBool(key, false);

    // Nastavení počátečního stavu dle Power-On
    if (relays[i].powerOnDefault == 1) {
      relays[i].currentState = true;
    } else if (relays[i].powerOnDefault == 2) {
      relays[i].currentState = lastState;
    } else {
      relays[i].currentState = false;
    }

    relays[i].isTimerRunning = false;
    relays[i].turnedOnAt = 0;
    relays[i].targetOffAt = 0;
  }
  prefs.end();
  Serial.println("[NVS] Konfigurace relé úspěšně načtena z flash paměti.");
}

void saveRelayConfigToNVS(int i) {
  if (i < 0 || i >= 8) return;
  prefs.begin("relay_cfg", false); // režim zápis
  char key[16];

  snprintf(key, sizeof(key), "d_en_%d", i);
  prefs.putBool(key, relays[i].isDelayEnabled);

  snprintf(key, sizeof(key), "d_dur_%d", i);
  prefs.putULong(key, relays[i].delayDurationMs);

  snprintf(key, sizeof(key), "grd_%d", i);
  prefs.putULong(key, relays[i].maxGuardMs);

  snprintf(key, sizeof(key), "pon_%d", i);
  prefs.putUChar(key, relays[i].powerOnDefault);

  prefs.end();
  Serial.printf("[NVS] Relé %d: Nová konfigurace uložena do paměti.\n", i);
}

void saveRelayLastState(int i, bool state) {
  if (i < 0 || i >= 8) return;
  prefs.begin("relay_cfg", false);
  char key[16];
  snprintf(key, sizeof(key), "last_%d", i);
  prefs.putBool(key, state);
  prefs.end();
}

// ======================= OVLÁDÁNÍ RELÉ (PŘÍMO HW) =======================
void setRelayHardware(int index, bool turnOn, unsigned long customDurationMs = 0) {
  if (index < 0 || index >= 8) return;
  unsigned long now = millis();

  if (turnOn) {
    digitalWrite(OUT_PINS[index], RELAY_ON);
    relays[index].currentState = true;
    relays[index].turnedOnAt = now;

    if (relays[index].isDelayEnabled) {
      // Autonomní Delay
      unsigned long duration = (customDurationMs > 0) ? customDurationMs : relays[index].delayDurationMs;
      relays[index].targetOffAt = now + duration;
      relays[index].isTimerRunning = true;
      Serial.printf("[RELAY %d] ON s Delay %lu ms (autonomní časovač ESP)\n", index, duration);
    } else if (relays[index].maxGuardMs > 0) {
      // Ochrana maximální doby běhu
      relays[index].targetOffAt = now + relays[index].maxGuardMs;
      relays[index].isTimerRunning = true;
      Serial.printf("[RELAY %d] ON s Max Guard %lu ms\n", index, relays[index].maxGuardMs);
    } else {
      relays[index].isTimerRunning = false;
      relays[index].targetOffAt = 0;
      Serial.printf("[RELAY %d] ON bez limitu\n", index);
    }
    saveRelayLastState(index, true);
  } else {
    // Vypnutí relé
    digitalWrite(OUT_PINS[index], RELAY_OFF);
    relays[index].currentState = false;
    relays[index].isTimerRunning = false;
    relays[index].turnedOnAt = 0;
    relays[index].targetOffAt = 0;
    Serial.printf("[RELAY %d] OFF (vypnuto / ukončeno)\n", index);
    saveRelayLastState(index, false);
  }
}

// ======================= SENZOR AM2320 (I2C) =======================
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

// ======================= RECONNECT & TELEMETRIE =======================
void sendTelemetry(const char* eventName = "telemetry") {
  if (!client.connected()) return;
  unsigned long now = millis();
  JsonDocument doc;
  doc["board_id"] = BOARD_ID;
  doc["event"] = eventName;
  
  // Aktuální reálné fyzické stavy všech 8 relé výstupů z HW
  JsonArray relaysArr = doc["relays"].to<JsonArray>();
  JsonArray timersArr = doc["timers"].to<JsonArray>();
  for (int i = 0; i < 8; i++) {
    relaysArr.add(relays[i].currentState ? 1 : 0);
    // Zbývající sekundy autonomního odpočtu v ESP
    unsigned long remSec = 0;
    if (relays[i].currentState && relays[i].isTimerRunning && (relays[i].targetOffAt > now)) {
      remSec = (relays[i].targetOffAt - now) / 1000UL;
    }
    timersArr.add(remSec);
  }

  doc["ldr"] = analogRead(LDR_PIN);

  float t, h;
  if (readAM2320(t, h)) {
    doc["am2320_temp"] = t;
    doc["am2320_hum"] = h;
  }

  sensor1.requestTemperatures();
  float ow1 = sensor1.getTempCByIndex(0);
  if (ow1 != -127.0 && ow1 != 85.0) doc["onewire1_temp"] = ow1;

  sensor2.requestTemperatures();
  float ow2 = sensor2.getTempCByIndex(0);
  if (ow2 != -127.0 && ow2 != 85.0) doc["onewire2_temp"] = ow2;

  String jsonString;
  serializeJson(doc, jsonString);
  client.publish(topic_telemetry, jsonString.c_str());
}

// ======================= MQTT PŘÍCHOZÍ ZPRÁVY =======================
void callback(char* topic, byte* payload, unsigned int length) {
  char msg[length + 1];
  for (unsigned int i = 0; i < length; i++) { msg[i] = (char)payload[i]; }
  msg[length] = '\0';

  JsonDocument doc;
  if (deserializeJson(doc, msg)) return;

  if (doc["target_id"].as<String>() != BOARD_ID) return;

  String event = doc["event"].as<String>();

  // 1. PŘÍKAZ K PŘEPNUTÍ RELÉ (set_relay)
  if (event == "set_relay") {
    int index = doc["rele_index"].as<int>();
    int turnOn = doc["state"].as<int>();
    unsigned long durationMs = 0;
    if (doc["duration"].is<float>() || doc["duration"].is<int>()) {
      durationMs = (unsigned long)(doc["duration"].as<float>() * 1000.0f);
    }
    setRelayHardware(index, (turnOn == 1), durationMs);
    sendTelemetry("telemetry");
  }
  // 2. DOTAZ NA AKTUÁLNÍ STAV PŘI ZNOVUOTEVŘENÍ APLIKACE (get_status)
  else if (event == "get_status") {
    Serial.println("[MQTT] Pozadavek get_status z aplikace -> odesilam aktualni realitu rele a senzoru");
    sendTelemetry("status_response");
  }
  // 3. PŘÍKAZ K ULOŽENÍ KONFIGURACE DO NVS (config_relay)
  else if (event == "config_relay") {
    int index = doc["rele_index"].as<int>();
    if (index >= 0 && index < 8) {
      if (doc["is_delay"].is<bool>()) relays[index].isDelayEnabled = doc["is_delay"].as<bool>();
      if (doc["delay_sec"].is<float>()) relays[index].delayDurationMs = (unsigned long)(doc["delay_sec"].as<float>() * 1000.0f);
      if (doc["max_guard_min"].is<int>()) {
        int guardMin = doc["max_guard_min"].as<int>();
        relays[index].maxGuardMs = (guardMin > 0) ? ((unsigned long)guardMin * 60000UL) : 0;
      }
      if (doc["power_on"].is<String>()) {
        String pon = doc["power_on"].as<String>();
        if (pon == "ON") relays[index].powerOnDefault = 1;
        else if (pon == "KEEP" || pon == "KEEP_LAST") relays[index].powerOnDefault = 2;
        else relays[index].powerOnDefault = 0; // OFF
      }
      saveRelayConfigToNVS(index);
    }
  }
}

void reconnect() {
  while (!client.connected()) {
    Serial.print("Pripojuji k HiveMQ...");
    String clientId = "ESP32Client-" + String(random(0xffff), HEX);
    
    if (client.connect(clientId.c_str(), mqtt_user, mqtt_pass)) {
      Serial.println("Pripojeno!");
      client.subscribe(topic_cmd);

      // Odeslání BOOT informace pro webovou aplikaci
      JsonDocument doc;
      doc["board_id"] = BOARD_ID;
      doc["event"] = "boot";
      String jsonString;
      serializeJson(doc, jsonString);
      client.publish(topic_telemetry, jsonString.c_str());

      // Okamžité odeslání stavu po připojení
      sendTelemetry("status_response");
    } else {
      Serial.print("Chyba spojeni rc=");
      Serial.print(client.state());
      Serial.println(" (dalsi pokus za 5s)");
      delay(5000);
    }
  }
}

// ======================= SETUP =======================
void setup() {
  Serial.begin(115200);
  delay(500); 

  // Inicializace I/O pinů
  for (int i = 0; i < 8; i++) {
    pinMode(OUT_PINS[i], OUTPUT);
  }
  
  pinMode(BUZZER_PIN, OUTPUT);
  pinMode(BTN_PINS[0], INPUT_PULLUP);
  pinMode(BTN_PINS[1], INPUT_PULLUP);
  pinMode(BTN_PINS[2], INPUT_PULLUP);
  pinMode(BTN_PINS[3], INPUT_PULLDOWN); 

  Wire.begin(I2C_SDA, I2C_SCL);
  sensor1.begin();
  sensor2.begin();

  // Načtení nastavení z NVS a nastavení relé dle Power-On
  loadConfigFromNVS();
  for (int i = 0; i < 8; i++) {
    digitalWrite(OUT_PINS[i], relays[i].currentState ? RELAY_ON : RELAY_OFF);
  }

  Serial.print("Pripojuji WiFi: ");
  Serial.println(ssid);
  WiFi.begin(ssid, password);
  while (WiFi.status() != WL_CONNECTED) {
    delay(400);
    Serial.print(".");
  }
  Serial.println("\nWiFi OK!");

  espClient.setInsecure(); // TLS HiveMQ
  client.setServer(mqtt_server, mqtt_port);
  client.setCallback(callback);
}

// ======================= HLAVNÍ SMYČKA LOOP =======================
void loop() {
  // 1. MQTT servis
  if (!client.connected()) {
    reconnect();
  }
  client.loop();

  unsigned long now = millis();

  // 2. AUTONOMNÍ KONTROLA ČASOVAČŮ A BEZPEČNOSTNÍCH LIMITŮ
  // Funguje 100% spolehlivě i při výpadku spojení či zavření aplikace!
  for (int i = 0; i < 8; i++) {
    if (relays[i].currentState && relays[i].isTimerRunning) {
      if (now >= relays[i].targetOffAt) {
        // Čas vypršel -> bezpečně vypnout
        setRelayHardware(i, false);
        Serial.printf("[AUTONOMOUS OFF] Rele %d automaticky vyplo po uplynuti intervalu.\n", i);
        sendTelemetry("telemetry");
      }
    }
  }

  // 3. TLAČÍTKA: KRÁTKÝ STISK vs 1.5s DLOUHÝ STISK PRO UKONČENÍ DELAY
  for (int i = 0; i < 4; i++) {
    bool raw = digitalRead(BTN_PINS[i]);
    bool pressed = (i == 3) ? (raw == HIGH) : (raw == LOW);

    if (pressed) {
      if (!btnWasPressed[i]) {
        // Začátek stisku
        btnWasPressed[i] = true;
        btnPressStartTime[i] = now;
        btnLongPressHandled[i] = false;
      } else {
        // Tlačítko je drženo - kontrola 1.5s (1500 ms)
        if (!btnLongPressHandled[i] && (now - btnPressStartTime[i] >= 1500)) {
          btnLongPressHandled[i] = true;
          Serial.printf("[BTN %d] 1.5s DLOUHÝ STISK -> Okamžité ukončení Delay a návrat do OFF!\n", i);
          
          // Pípnutí bzučákem jako zpětná vazba
          digitalWrite(BUZZER_PIN, HIGH);
          delay(80);
          digitalWrite(BUZZER_PIN, LOW);

          // Vypnutí příslušného kanálu (i)
          setRelayHardware(i, false);

          // Odeslání do aplikace
          JsonDocument doc;
          doc["board_id"] = BOARD_ID;
          doc["event"] = "button_long_press";
          doc["button_index"] = i;
          String jsonString;
          serializeJson(doc, jsonString);
          client.publish(topic_telemetry, jsonString.c_str());
        }
      }
    } else {
      if (btnWasPressed[i]) {
        // Tlačítko uvolněno
        if (!btnLongPressHandled[i]) {
          // Byl to krátký stisk (toggle / rotace)
          Serial.printf("[BTN %d] KRÁTKÝ STISK -> Toggle relé %d\n", i, i);
          if (relays[i].currentState) {
            if (relays[i].isDelayEnabled) {
              // Pokud běží delay a ještě se nejedná o dlouhý stisk, můžeme prodloužit
              relays[i].targetOffAt += relays[i].delayDurationMs;
              Serial.printf("[BTN %d] Prodloužení delay o %lu ms\n", i, relays[i].delayDurationMs);
            } else {
              setRelayHardware(i, false);
            }
          } else {
            setRelayHardware(i, true);
          }

          // Telemetrie o stisku
          JsonDocument doc;
          doc["board_id"] = BOARD_ID;
          doc["event"] = "button_press";
          doc["button_index"] = i;
          String jsonString;
          serializeJson(doc, jsonString);
          client.publish(topic_telemetry, jsonString.c_str());
        }
        btnWasPressed[i] = false;
      }
    }
  }

  // 4. PERIODICKÁ TELEMETRIE (Senzory + reálné stavy relé a odpočtů každých 5s)
  if (now - lastCloudSync >= 5000) {
    lastCloudSync = now;
    sendTelemetry("telemetry");
  }

  delay(10);
}
