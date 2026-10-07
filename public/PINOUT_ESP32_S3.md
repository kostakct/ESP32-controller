# DETAILNÍ ROZVRŽENÍ PINŮ (PINOUT) PRO ESP32-S3 16MB/8MB PSRAM (MAXIMALIZOVANÁ VERZE)

Tento pinout představuje optimální kompromis. Využili jsme veškerou kapacitu čipu a zařadili **fotorezistor (LDR)** i **audio (bzučák)**, při zachování plného 4" IPS dotykového displeje, 8 relé, 4 vstupů a senzorů teplot.

Abychom to prostorově dokázali (čip má omezený počet analogových pinů), přistoupili jsme ke **kontrolovanému využití jednoho strapping pinu (GPIO 46)** pro jeden ze vstupů, u kterého lze garantovat, že nebude během bootování držen ve špatném stavu.

---

## C++ KÓD PRO ZKOPÍROVÁNÍ (Makro definice)

```cpp
// =========================================================
// 1. DISPLEJ A DOTYK (Rezervováno pro budoucí osazení)
// =========================================================
// Zcela bezpečné piny, žádná kolize.
#define DISP_MOSI   11
#define DISP_MISO   13
#define DISP_SCLK   12
#define DISP_CS     10
#define DISP_DC     9
#define DISP_RST    4
#define DISP_LED    5
#define TOUCH_SDA   6
#define TOUCH_SCL   7
#define TOUCH_INT   -1 
#define TOUCH_RST   -1 

// =========================================================
// 2. ANALOGOVÉ MĚŘENÍ A AUDIO
// =========================================================
// ADC na ESP32-S3 je pouze na pinech 1-10! 
#define LDR_PIN     2    // ADC1_CH1 pro fotorezistor (střed děliče napětí)
#define BUZZER_PIN  48   // PWM výstup pro bzučák/piezo (bezpečný pin, někdy sdílí RGB LED na desce)

// =========================================================
// 3. VÝSTUPY (8x LED simulace, později Relé)
// =========================================================
// Přeskupeno z ADC pinů na volné bezpečné piny.
#define OUT_1       41
#define OUT_2       42
#define OUT_3       1
#define OUT_4       8
#define OUT_5       18
#define OUT_6       21
#define OUT_7       47
#define OUT_8       38

// =========================================================
// 4. ONEWIRE A DHT SENZORY 
// =========================================================
#define ONEWIRE_1   39
#define ONEWIRE_2   40
#define DHT_1       14

// =========================================================
// 5. DIGITÁLNÍ VSTUPY (Nyní 4x Tlačítka, později PIR)
// =========================================================
// Pozor na INPUT_4 na pinu 46 (Strapping pin)!
#define INPUT_1     15
#define INPUT_2     16
#define INPUT_3     17
#define INPUT_4     46   // STRAPPING PIN: Při bootu MUSÍ být LOW (0V).
```

---

## DŮLEŽITÉ POKYNY K HARDWARE (Strapping a ADC)

### Měření osvětlení (Fotorezistor na pinu 2)
Na rozdíl od starého ESP32 funguje ADC na ESP32-S3 lépe, ale je vázané **pouze na piny 1 až 10**. Pin 2 (ADC1_CH1) je čistý a ideální.
* **Zapojení děliče:** Fotorezistor (LDR) připojte mezi +3.3V a Pin 2. Od pinu 2 dejte pevný rezistor (např. 10 kΩ) na GND. Čím více světla, tím vyšší napětí půjde do ADC převodníku.

### Kontrolované využití Strapping Pinu 46 (INPUT_4)
Pin 46 na ESP32-S3 slouží při startu (bootu) k nastavení režimu ladění (JTAG/ROM). **Při zapínání modulu na něm musí být zaručena logická nula (LOW / 0V), případně může zůstat plovoucí (má interní slabý pull-down rezistor).** Pokud by tam bylo při startu natvrdo +3.3V (HIGH), modul nenastartuje správně a nevypíše nic na sériovou linku.

**Jak to správně zapojit:**
1. **Pokud to bude PIR senzor:** Standardní PIR senzory (HC-SR501 nebo AM312) dávají na výstupu v klidovém stavu (když nedetekují pohyb) **0V**. To je pro pin 46 naprosto **ideální a 100% bezpečné**. Během bootu senzor hned po přivedení napětí pohyb nehlásí, výstup je LOW, ESP32-S3 bez problému nabootuje.
2. **Pokud to bude tlačítko:** Zapojte ho **Active-HIGH**. Tedy pin 46 připojte přes 10 kΩ "Pull-Down" rezistor k zemi (GND). Tlačítko připojte mezi pin 46 a +3.3V. Dokud tlačítko nestisknete, je na pinu 46 přes odpor GND (LOW), což je pro start modulu správně. *Poznámka: Nesmíte pak tlačítko držet v momentě, kdy připojujete modul do USB (do napájení).* Tím se vyhnete klasickému `INPUT_PULLUP` zapojení proti zemi, které by u strapping pinu 46 vadilo.
