# KOMPLEXNÍ HARDWAROVÁ ANALÝZA A DIMENZOVÁNÍ: ESP32 vs ESP32-S3

Tento dokument poskytuje přesnou inženýrskou analýzu proveditelnosti, nároků na paměť (Flash, RAM), IO kapacitu a stabilitu pro plánované rozšíření řídicí jednotky:
- **Až 12x OUT** (výstupy pro relé)
- **3x samostatné OneWire vstupy** (nezávislé sběrnice pro DS18B20)
- **2x DHT senzory** (DHT11/DHT22 pro teplotu a vlhkost)
- **4x IN vstupy** (např. digitální PIR pohybová čidla, optočleny)
- **Komunikační stack:** MQTT + HTTP REST / WebSockets + WebServer (bez Bluetooth)
- **OTA aktualizace:** Vždy 2 identické aplikační oddíly (OTA_0 a OTA_1) zabírající ~50 % Flash
- **Porovnávané varianty:** 
  1. ESP32 DevKit 4MB Flash (30-pin / 38-pin) – Bez displeje
  2. ESP32 DevKit 4MB Flash (30-pin / 38-pin) – Se 4" SPI IPS + dotykem
  3. ESP32-S3 16MB Flash + PSRAM – Bez displeje
  4. ESP32-S3 16MB Flash + PSRAM – Se 4" SPI/RGB IPS + dotykem

---

## 1. PŘEHLEDOVÁ SROVNÁVACÍ MATICE VARIANT

| Parametr / Varianta | 1. ESP32 4MB (Bez LCD) | 2. ESP32 4MB (+ 4" IPS Dotyk) | 3. ESP32-S3 16MB (Bez LCD) | 4. ESP32-S3 16MB (+ 4" IPS Dotyk) |
| :--- | :--- | :--- | :--- | :--- |
| **Proveditelnost periferií** | **ANO** (na hranici pinů) | **NELZE PŘÍMO** (nutný expandér) | **VYNIKAJÍCÍ** | **VYNIKAJÍCÍ** |
| **Celkem potřebných IO** | 21 GPIO | 30 až 32 GPIO | 21 GPIO | 30 až 32 GPIO |
| **Dostupné volné GPIO** | ~22–24 GPIO | ~22–24 GPIO (nedostatek!) | ~36–38 GPIO | ~36–38 GPIO (dostatek) |
| **Nutnost I2C expandéru** | Ne (nebo doporučeno) | **ANO (nutný MCP23017)** | **NE** (přímé připojení) | **NE** (přímé připojení) |
| **Oddíl OTA (1 slot)** | 1.3 MB až 1.8 MB | 1.3 MB (kriticky těsné!) | **5.0 MB až 6.0 MB** | **5.0 MB až 6.0 MB** |
| **LittleFS úložiště** | 256 kB až 512 kB | 256 kB | **3.0 MB až 5.0 MB** | **3.0 MB až 5.0 MB** |
| **Rezerva pro HTML/SPA** | Dostatečná pro Gzip | Těsná | Obrovská (i pro uncompressed) | Obrovská |
| **Interní RAM (Heap)** | ~300 kB volných | ~120–180 kB volných | ~380 kB volných | ~380 kB volných |
| **Externí PSRAM** | **ŽÁDNÁ** | **ŽÁDNÁ** (deficit pro LCD) | **8 MB Octal PSRAM** | **8 MB Octal PSRAM** |
| **Plynulost 4" LCD (LVGL)**| N/A | Trhané (15–20 FPS, 1/10 buf) | N/A | **Dokonalá (45–60 FPS, Double Buf)** |
| **Doporučení pro projekt** | **Vhodné pro základ** | **NEDOPORUČUJE SE** | **VELMI VHODNÉ** | **DOPORUČENÁ VLAJKOVÁ LOĎ** |

---

## 2. DETAILNÍ ROZBOR PINŮ A KAPACITA GPIO (IO BUDGET)

### Požadované periferie:
1. **12x OUT (Relé):** 12 výstupních pinů.
2. **3x OneWire (DS18B20):** 3 obousměrné piny (s externím 4.7kΩ pull-upem na 3.3V).
3. **2x DHT (DHT22/11):** 2 obousměrné piny (časově kritický 1-wire protokol).
4. **4x IN (PIR senzory):** 4 vstupní piny.
5. **Displej 4" SPI + Dotyk (volitelně):** 
   - SPI Display (ST7796 / ILI9488): SCK, MOSI, CS, DC, RESET, Podsvícení (BL) = **6 pinů**
   - I2C Dotyk (GT911 / FT6336): SDA, SCL, INT, RST = **3 až 4 piny**
   - *Celkem pro displej a dotyk:* **9 až 10 pinů**

---

### A) ESP32 Classic (DevKit 30-pin a 38-pin, 4MB Flash)

#### Omezení čipu ESP32 WROOM:
- **GPIO 6 až 11:** Interně propojeny s integrovanou SPI Flash pamětí – **NIKDY NESMÍ BÝT POUŽITY!**
- **GPIO 34, 35, 36 (VP), 39 (VN):** Jsou **POUZE VSTUPNÍ** (nemají interní pull-up ani pull-down a nelze na nich generovat výstup).
  - *Výhoda:* Jsou ideální pro 4x PIR senzory!
- **Strapping piny (GPIO 0, 2, 12, 15):** Určují bootovací režim čipu při náběhu napájení. Pokud na ně připojíte cívku relé nebo optočlen bez správné úrovně, čip nenabootuje nebo relé při startu na 100 ms zběsile zacvakají (Boot Glitch).
- **UART piny (GPIO 1 - TX, GPIO 3 - RX):** Nezbytné pro nahrávání firmware a ladicí výpisy na sériové lince.

#### Bilance pro ESP32 DevKit:
- **4x PIR:** Obsadí přesně 4 vstupní piny (GPIO 34, 35, 36, 39).
- **Zbývá volných výstupních/obousměrných GPIO:** cca 16 až 18 pinů (GPIO 4, 5, 13, 14, 16, 17, 18, 19, 21, 22, 23, 25, 26, 27, 32, 33).
- **Požadavek bez displeje:** 12 OUT + 3 OneWire + 2 DHT = **17 pinů**.
  - *Závěr bez displeje:* Na 38-pinové verzi ESP32 to **těsně vyjde (100% využití pinů)**, ale nezbývá ani jediný pin navíc pro stavovou LED, I2C nebo další senzor. Na 30-pinové verzi chybí 1–2 piny.
- **Požadavek se 4" SPI IPS a dotykem:** 17 pinů + 10 pinů displej = **27 pinů**.
  - *Závěr s displejem:* **Fyzicky NEMOŽNÉ bez externího čipu!** Na ESP32 Classic 4MB byste museli pro 12 relé použít 16-bitový I2C expandér **MCP23017** (který zabere pouze 2 piny: SDA a SCL).

---

### B) ESP32-S3 (16MB Flash, WROOM-1 / WROOM-2)

#### Výhody čipu ESP32-S3:
- ESP32-S3 disponuje až **45 fyzickými GPIO piny**.
- Nativní USB OTG (GPIO 19 a 20) přímo na čipu – hardwarový USB-JTAG port znamená, že standardní UART piny nejsou blokovány.
- GPIO jsou plně mapovatelné skrze interní GPIO Matrix bez omezení funkce.
- I při použití rychlé 8-bitové Octal PSRAM/Flash (která zabírá GPIO 33 až 37) zůstává na modulu k dispozici **36 až 38 plnohodnotných uživatelských GPIO pinů**.

#### Bilance pro ESP32-S3:
- **12x OUT + 3x OneWire + 2x DHT + 4x IN:** 21 pinů.
- **4" SPI IPS + I2C Kapacitní dotyk:** 9–10 pinů.
- **Celková spotřeba:** 30–31 pinů.
- **Zůstává volných:** **6 až 8 rezervních GPIO pinů** (např. pro I2C sběrnici, bzučák, stavové RGB NeoPixel LED WS2812B, hardwarový nouzový STOP spínač atd.).
- *Závěr:* **Všechny periferie i displej fungují NATIVNĚ na přímo vyvedených pinech bez nutnosti přídavných obvodů.**

---

## 3. VELIKOST FLASH PAMĚTI, PARTITION SCHEME A OTA

U obou platforem je podmínkou podpora **OTA (Over-The-Air)** – bezdrátová aktualizace firmware přes Wi-Fi. OTA vyžaduje vytvoření dvou zrcadlových aplikačních oddílů:
- `ota_0` (běžící firmware)
- `ota_1` (prostor pro nahrání nového firmware)
- `otadata` (příznaky bootloaderu, který oddíl je aktivní)
- `nvs` (Non-Volatile Storage pro konfiguraci a kalibraci)
- `littlefs` (souborový systém pro webové soubory HTML/JS/CSS a ikony)

---

### A) ESP32 – 4MB Flash Partition Scheme

Při 4MB Flash je rozdělení paměti kompromisem:

```text
+-------------------------------------------------------------+
| 4 MB Celková Flash (4 194 304 B)                            |
+-----------+-----------+---------------+---------------+-----+
| NVS (16k) | OTA (8k)  | app0 / ota_0  | app1 / ota_1  | FS  |
|           |           |   (1.75 MB)   |   (1.75 MB)   |448k |
+-----------+-----------+---------------+---------------+-----+
```

#### Odhad velikosti binárního kódu firmware:
1. **Základní varianta bez displeje (Headless):**
   - FreeRTOS + Wi-Fi Stack + LwIP TCP/IP: ~420 kB
   - ESPAsyncWebServer + AsyncTCP + WebSocket: ~260 kB
   - MQTT Klient + TLS/SSL šifrování (mbedTLS): ~280 kB
   - ArduinoJson + OneWire + DallasTemperature + DHT: ~90 kB
   - Aplikační logika relé, časovače, NVS ukládání: ~70 kB
   - **Celková velikost binárky firmware (.bin):** **cca 1 120 kB (1.12 MB)**
   - *Využití oddílu ota_0 (1.75 MB):* **64 % (vyhovuje)**.

2. **Varianta se 4" IPS displejem (s knihovnou LVGL):**
   - Přidání grafického enginu LVGL v8/v9: +350 až 550 kB
   - Rastrové fonty (Montserrat 12, 14, 18, 24): +120 kB
   - Ovladače displeje a dotyku (LovyanGFX / TFT_eSPI): +100 kB
   - Grafické obrazovky, widgety spínačů: +150 kB
   - **Celková velikost binárky firmware (.bin):** **cca 1 840 kB (1.84 MB)**
   - *Problém:* **Firmware PŘESAHUJE kapacitu 1.75 MB oddílu!**
   - *Důsledek:* Na 4MB Flash se sestavení s LVGL displejem a plnohodnotným WebServerem s TLS **nevejde do bezpečného 2-slotového OTA**. Musela by se radikálně zmenšit LittleFS na <100 kB nebo vypnout SSL/TLS pro MQTT a osekat grafiku.

---

### B) ESP32-S3 – 16MB Flash Partition Scheme

Při 16MB Flash odpadají veškeré paměťové limity:

```text
+-------------------------------------------------------------------------+
| 16 MB Celková Flash (16 777 216 B)                                      |
+-----------+-----------+--------------------+--------------------+-------+
| NVS (64k) | OTA (16k) |    app0 / ota_0    |    app1 / ota_1    |  FS   |
|           |           |      (5.5 MB)      |      (5.5 MB)      | (4 MB)|
+-----------+-----------+--------------------+--------------------+-------+
```

#### Výhody 16MB rozvržení pro ESP32-S3:
- **Velikost OTA oddílu 5.5 MB:** Bez problémů pojme i obrovský firmware s plnou grafickou knihovnou LVGL, všemi fonty, šifrovaným MQTT (TLS), asynchronním webserverem a ladicími symboly. Využití oddílu je pouze **cca 35 %**, zbývá obrovská rezerva pro další rozvoj.
- **LittleFS o velikosti 4.0 až 5.0 MB:** Umožňuje nahrát nejen minifikovanou webovou aplikaci, ale kompletní dokumentaci, offline grafiku, logy historie přepínání i záložní firmware.

---

## 4. OČEKÁVANÁ VELIKOST HTML APLIKACE A WEBOVÉHO ROZHRANÍ

Při provozu webové aplikace přímo z ESP32 (LittleFS WebServer) závisí rychlost a paměťová náročnost na způsobu servírování:

### Velikost moderní webové SPA aplikace (jakou máme vytvořenu):
- **Zdrojový kód před kompilací (React / TypeScript / Tailwind):** desítky megabajtů v `node_modules`.
- **Výsledný produkční build (`npm run build` do složky `dist/`):**
  - `index.html`: **~1.2 kB**
  - `index.css` (vyčištěný Tailwind bez nepoužitých tříd): **~18 kB**
  - `index.js` (kompletní aplikační logika, SVG ikony, modaly): **~170 kB**
- **Automatická komprese (Gzip / Brotli):**
  - Moderní webový prohlížeč (Chrome, Safari na mobilu) automaticky posílá hlavičku `Accept-Encoding: gzip`.
  - ESP32 umí servírovat předem zkomprimované soubory `index.html.gz`, `index.js.gz`, `index.css.gz` s HTTP hlavičkou `Content-Encoding: gzip`.
  - **Celková velikost zkomprimovaného balíčku pro LittleFS:** **pouze 50 až 65 kB!**

### Srovnání vlivu na paměť:
- **Na 4MB Flash (LittleFS 448 kB):** 60 kB balíček zabere pouze **13 %** oddílu LittleFS. Aplikace se načte z ESP32 do telefonu v lokální síti za **méně než 150 ms**.
- **Na 16MB Flash (LittleFS 4 000 kB):** 60 kB balíček zabere pouhých **1.5 %** diskového prostoru.

---

## 5. ROZBOR RAM PAMĚTI, PSRAM A NÁROKŮ 4" IPS DISPLEJE

Zde leží **nejzásadnější rozdíl** mezi běžným ESP32 a ESP32-S3.

### Rozlišení a barevná hloubka 4" IPS displeje:
- Standardní 4" SPI IPS panely (čipy ST7796S nebo ILI9488) mají rozlišení **480 × 320 pixelů**.
- Při barevné hloubce 16-bit (RGB565 – 2 bajty na pixel):
  - **1 kompletní snímek obrazovky (Full Framebuffer):**
    $$480 \times 320 \times 2\text{ B} = 307\ 200\text{ B} = \mathbf{300\text{ kB RAM}}$$
  - **Double buffering pro zamezení trhání obrazu (Tearing-free):**
    $$2 \times 300\text{ kB} = \mathbf{600\text{ kB RAM}}$$

---

### A) ESP32 Classic 4MB (BEZ PSRAM)
- Čip má celkem 520 kB SRAM, z čehož po startu Wi-Fi a FreeRTOS zbývá pro uživatele přibližně **280 až 310 kB volného Heap**.
- **Důsledek:** Celý jeden framebuffer (300 kB) se do volné RAM **VŮBEC NEVEJDE**.
- **Jak se to musí řešit (nouzový režim LVGL):**
  - LVGL musí pracovat s malým dílčím bufferem, např. 1/10 výšky obrazovky ($480 \times 32 \times 2 = 30\text{ kB}$).
  - Grafika se překresluje v deseti pruzích za sebou.
  - *Výsledek:* Při posouvání obrazovky (scroll v menu) nebo animaci tlačítek dochází k viditelnému blikání, horizontálnímu trhání obrazu a snímková frekvence klesá na **12–18 FPS**. Navíc zátěž SPI sběrnice brzdí asynchronní webserver.

---

### B) ESP32-S3 16MB (S 8MB OCTAL PSRAM)
- Čip disponuje 512 kB interní rychlé SRAM **+ 8 192 kB (8 MB) externí vysokorychlostní Octal PSRAM**.
- **Důsledek:**
  - Oba framebuffery ($2 \times 300\text{ kB} = 600\text{ kB}$) se bez zaváhání alokují do PSRAM.
  - Využívá se **hardware DMA (Direct Memory Access)** – přenos obrazových dat do displeje probíhá na pozadí po sběrnici bez zaměstnávání procesoru.
  - *Výsledek:* Rozhraní běží naprosto plynule na **45 až 60 FPS**, animace přepínačů jsou hladké jako na smartphonu a interní SRAM procesoru zůstává 100% volná pro Wi-Fi, MQTT a WebServer.

---

## 6. VÝKONOVÉ NÁROKY NA CPU A MULTITASKING

ESP32 i ESP32-S3 jsou **dvoujádrové procesory (Dual-Core Xtensa LX6 / LX7)** taktované na **240 MHz**.

Doporučené rozdělení úloh mezi jádra ve FreeRTOS:

```text
       CORE 0 (Síť a Komunikace)                 CORE 1 (Periferie a UI)
+------------------------------------+    +------------------------------------+
| • Wi-Fi Stack & TCP/IP             |    | • 12x Spínání relé + Delay logika  |
| • Asynchronní HTTP WebServer       |    | • 3x Nezávislé čtení OneWire (DS)  |
| • WebSocket engine                 |    | • 2x DHT22 čtení s mikrosek. čas.  |
| • MQTT Klient (PubSub / Async)     |    | • 4x PIR hardwarové přerušení      |
| • OTA dekomprese firmware          |    | • LVGL grafický engine (4" LCD)    |
+------------------------------------+    +------------------------------------+
```

- Díky dvěma jádrům **nikdy nedojde k ovlivnění reakční doby spínačů**. I kdyby se na webové rozhraní připojilo 5 uživatelů naráz a stahovalo HTML soubory, relé na stisknutí tlačítka nebo signál z PIR zareaguje okamžitě během **< 1 ms**.

---

## 7. KRITICKÉ HARDWAROVÉ ZÁSADY PŘI NÁVRHU SCHÉMATU

1. **Ovládání 12 relé (Boot Glitch ochrana):**
   - Cívky relé musí být spínány přes tranzistory (MOSFET nebo bipolární) nebo optočleny.
   - Doporučuje se logika **Active-LOW** nebo použití pull-down/pull-up rezistorů 10kΩ na řídicích pinech, aby relé nesepnula během resetu procesoru.
2. **OneWire sběrnice (3x nezávislé linky):**
   - Každá ze 3 sběrnic DS18B20 musí mít svůj vlastní pull-up rezistor **4.7 kΩ** připojený na větev **+3.3V** (nikoliv 5V!).
   - Rozdělení do 3 samostatných GPIO je špičkové řešení: porucha nebo zkrat na jednom čidle v kotelně neshodí zbývající dvě čidla v jiných místnostech.
3. **PIR vstupy:**
   - Většina PIR modulů (HC-SR501) je napájena 5V, ale jejich výstupní datový pin dává 3.3V logiku, což je pro ESP32 bezpečné. U modulů s 5V výstupem je nutný odporový dělič napětí.
4. **Napájení sestavy:**
   - 12 sepnutých cívek standardních relé (5V) odebírá cca $12 \times 70\text{ mA} = \mathbf{840\text{ mA}}$.
   - ESP32-S3 při Wi-Fi TX špičkách odebírá až **350 mA**.
   - 4" IPS displej s plným podsvícením odebírá cca **120 mA**.
   - **Minimální doporučený napájecí zdroj:** **5V / 2.5A až 3.0A DC** s kvalitními filtračními elektrolyty (1000 µF na 5V větvi a 470 µF + 100 nF na 3.3V větvi ESP32).

---

## 8. FINÁLNÍ DOPORUČENÍ A VERDIKT

1. **Varianta 2 (ESP32 Classic 4MB + 4" IPS displej) se NEDOPORUČUJE:**
   - Chybí fyzické piny pro 12 relé + senzory + displej (musel by se doplnit I2C expandér MCP23017).
   - Chybí PSRAM – displej bude mít trhané vykreslování a nedostatek paměti pro LVGL.
   - Firmware s plným webserverem a grafickým rozhraním se nevejde do 4MB OTA zrcadlových oddílů.

2. **Pro variantu BEZ displeje (Headless):**
   - **ESP32 Classic 4MB DevKit (38-pin):** Lze použít, ale piny budou využity na 100 % kapacity bez rezervy.
   - **ESP32-S3 16MB:** Ideální řešení s bohatou rezervou paměti i pinů.

3. **Pro variantu SE 4" IPS DOTYKOVÝM DISPLEJEM:**
   - **Jednoznačný vítěz: ESP32-S3 16MB Flash + 8MB PSRAM.**
   - Poskytuje dostatek nativních pinů pro všech 21 senzorových a reléových signálů i 10 pinů displeje.
   - 8 MB PSRAM garantuje bleskové a naprosto plynulé vykreslování 480x320 displeje s dvojitým bufferem.
   - 16 MB Flash umožňuje bezpečné dálkové OTA aktualizace a obrovský prostor pro webové soubory i budoucí rozšiřování.
