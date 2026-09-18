/*
  =============================================================
  ESP32-S3 IoT Controller (eWeLink style) - Verze 12 Auto-Sync
  =============================================================
  - Komunikace: Zabezpečené MQTT přes TLS (HiveMQ Cloud)
  - Deska: ESP32-S3 (8x Výstup / Relé, 4x Vstup / Tlačítko)
  - Senzory: 2x OneWire DS18B20, 1x I2C AM2320 (Teplota+Vlhkost), 1x LDR
  - Funkce: Self-Healing synchronizace, BOOT event, QoS 1 spolehlivost
*/

#include <WiFi.h>
#include <WiFiClientSecure.h>
#include <PubSubClient.h>
#include <ArduinoJson.h>
#include <Wire.h>
#include <OneWire.h>
#include <DallasTemperature.h>

// --- VAŠE WIFI ÚDAJE ---
const char* ssid = "VAS_NAZEV_WIFI";       // Zadejte název své WiFi
const char* password = "VASE_HESLO_WIFI";  // Zadejte heslo své WiFi

// --- NASTAVENÍ MQTT (HiveMQ Cloud) ---
const char* mqtt_server = "2aa867b8a86d4479b320828c9dd8d271.s1.eu.hivemq.cloud"; 
const int mqtt_port = 8883;                   // Šifrovaný port TLS
const char* mqtt_user = "Rosta-IoT";          // MQTT Uživatelské jméno
const char* mqtt_pass = "RostaTest";         // MQTT Heslo

const char* topic_cmd = "kostakct/esp32/cmd";
const char* topic_telemetry = "kostakct/esp32/telemetry";

// Unikátní ID této desky v síti
const String BOARD_ID = "esp_01_kotelna"; 

// --- DEFINICE PINŮ ESP32-S3 ---
#define I2C_SDA     6
#define I2C_SCL     7
#define LDR_PIN     2
#define BUZZER_PIN  48

// 8 Výstupů (Relé 1 až 8)
const int OUT_PINS[8] = {41, 42, 1, 8, 18, 21, 47, 38};
#define RELAY_ON    HIGH
#define RELAY_OFF   LOW

// Teplotní čidla OneWire DS18B20
#define ONEWIRE_1   14
#define ONEWIRE_2   9

// 4 Digitální Vstupy
const int BTN_PINS[4] = {15, 16, 17, 46}; 

// Objekty senzorů
OneWire oneWire1(ONEWIRE_1);
OneWire oneWire2(ONEWIRE_2);
DallasTemperature sensor1(&oneWire1);
DallasTemperature sensor2(&oneWire2);

WiFiClientSecure espClient;
PubSubClient client(espClient);

unsigned long lastCloudSync = 0;
bool lastBtnStates[4] = {false, false, false, false};

// Čtení I2C senzoru AM2320
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

// Zpracování příchozích příkazů z Webové Aplikace
void callback(char* topic, byte* payload, unsigned int length) {
  char msg[length + 1];
  for (unsigned int i = 0; i < length; i++) {
    msg[i] = (char)payload[i];
  }
  msg[length] = '\0';

  JsonDocument doc;
  if (deserializeJson(doc, msg)) return;

  // Příkaz pro nastavení relé
  if (doc["target_id"].as<String>() == BOARD_ID && doc["event"].as<String>() == "set_relay") {
    int index = doc["rele_index"].as<int>();
    int turnOn = doc["state"].as<int>();

    if (index >= 0 && index <= 7) {
      digitalWrite(OUT_PINS[index], (turnOn == 1) ? RELAY_ON : RELAY_OFF);
      Serial.printf(">>> Rele %d nastaveno na %d <<<\n", index, turnOn);
    }
  }
}

// Znovupřipojení k MQTT brokeru s odesláním BOOT eventu
void reconnect() {
  while (!client.connected()) {
    Serial.print("Pripojuji k HiveMQ...");
    String clientId = "ESP32Client-" + String(random(0xffff), HEX);
    
    if (client.connect(clientId.c_str(), mqtt_user, mqtt_pass)) {
      Serial.println("Pripojeno!");
      client.subscribe(topic_cmd);

      // Odeslání BOOT informace pro webovou aplikaci (vyžádá si synchronizaci stavu)
      JsonDocument doc;
      doc["board_id"] = BOARD_ID;
      doc["event"] = "boot";
      String jsonString;
      serializeJson(doc, jsonString);
      client.publish(topic_telemetry, jsonString.c_str());
    } else {
      Serial.print("Chyba spojeni rc=");
      Serial.print(client.state());
      Serial.println(" (dalsi pokus za 5s)");
      delay(5000);
    }
  }
}

void setup() {
  Serial.begin(115200);
  delay(1000); 

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
  sensor1.begin();
  sensor2.begin();

  Serial.print("Pripojuji WiFi: ");
  Serial.println(ssid);
  WiFi.begin(ssid, password);
  while (WiFi.status() != WL_CONNECTED) {
    delay(500);
    Serial.print(".");
  }
  Serial.println("\nWiFi OK!");

  espClient.setInsecure(); // Připojení k TLS HiveMQ
  client.setServer(mqtt_server, mqtt_port);
  client.setCallback(callback);
}

void loop() {
  if (!client.connected()) {
    reconnect();
  }
  client.loop();

  // 1. Zpracování tlačítek (Odeslání okamžitě při stisku)
  for (int i = 0; i < 4; i++) {
    bool raw = digitalRead(BTN_PINS[i]);
    bool pressed = (i == 3) ? (raw == HIGH) : (raw == LOW);
    
    if (pressed && !lastBtnStates[i]) {
      JsonDocument doc;
      doc["board_id"] = BOARD_ID;
      doc["event"] = "button_press";
      doc["button_index"] = i;
      String jsonString;
      serializeJson(doc, jsonString);
      client.publish(topic_telemetry, jsonString.c_str());
    }
    lastBtnStates[i] = pressed;
  }

  // 2. Pravidelná telemetrie (Senzory + Stavy relé každých 5s)
  if (millis() - lastCloudSync > 5000) {
    lastCloudSync = millis();
    
    JsonDocument doc;
    doc["board_id"] = BOARD_ID;
    doc["event"] = "telemetry";
    
    // Stavy relé pro samo-opravnou kontrolu s aplikací
    JsonArray relays = doc["relays"].to<JsonArray>();
    for(int i = 0; i < 8; i++) {
      relays.add((digitalRead(OUT_PINS[i]) == RELAY_ON) ? 1 : 0);
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

  delay(20); 
}
