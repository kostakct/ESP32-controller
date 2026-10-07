# ARCHITECTURE.md — Stav projektu a pokyny pro pokračování (nové vlákno)

**Poslední aktualizace:** 5. 10. 2026
**Účel souboru:** Kompletní kontext pro AI agenta (Claude), který v novém konverzačním vlákně přebírá práci na tomto projektu. Přečti si celý tento soubor, než uděláš jakoukoliv změnu — zachytává nejen cílový stav, ale i historii rozhodnutí a už vyřešených chyb, ať se k nim znovu nevracíš.

---

## 1. Co je tohle za projekt (1 odstavec)

Vlastní IoT ekosystém typu eWeLink pro domácí/rodinné použití. Pilotní HW: 1× ESP32-S3 (8× relé výstup, 4× digitální vstup, 2× OneWire teploměr, 1× AM2320 teplota/vlhkost, LDR). Appka je PWA (React + Vite + TypeScript), komunikace přes MQTT (HiveMQ Cloud). Zadavatel **neprogramuje** — veškerý kód dodává a testuje AI agent, zadavatel fyzicky testuje na HW a dává zpětnou vazbu. Pracuje se v Cursoru, kód se posílá přes GitHub, appka se nasazuje na GitHub Pages.

---

## 2. DŮLEŽITÉ: realita repozitářů se liší od původního plánu

Původně plánované monorepo `IoT-ecosystem` (se složkami `app/`, `firmware/`, `backend/`, `docs/`) **bylo na začátku založeno**, ale appka se v praxi vyvinula a nasazuje z **samostatného repozitáře**:

- **Živý PWA repozitář a nasazení appky:** `kostakct/ESP32-controller` → `https://kostakct.github.io/ESP32-controller/` (GitHub Pages, build přes GitHub Action, Vite + React).
- **Stav repozitáře `IoT-ecosystem`:** založen dříve, obsahoval pilotní firmware a tuto dokumentaci — **není potvrzeno, zda ho zadavatel dál aktivně udržuje** souběžně s `ESP32-controller`, nebo zda se `ESP32-controller` stal fakticky jediným pracovním repozitářem.
- **Firmware (`.ino`/`.cpp`):** zadavatel ho nahrává do ESP32 přes Cursor (dříve zvažováno PlatformIO i Arduino IDE jako "nahrávač" — potvrzeno použití PlatformIO v Cursoru). **Není jisté, zda je aktuální firmware v14 uložený i v nějakém Git repozitáři**, nebo jestli existuje jen lokálně na zadavatelově PC.

**První úkol nového vlákna: ověř si od zadavatele aktuální stav obou repozitářů**, než budeš předpokládat strukturu souborů.

---

## 3. Architektura (beze změny od původního návrhu, funkčně ověřeno)

```
TELEMETRIE (zařízení -> appka):
ESP32 --MQTT publish--> HiveMQ Cloud --MQTT subscribe (WSS, prohlížeč)--> PWA

PŘÍKAZY (appka -> zařízení):
PWA --MQTT publish (WSS)--> HiveMQ Cloud --MQTT subscribe--> ESP32
```

**POZOR:** Tohle je stále **dočasná/testovací architektura** z rychlého sanity testu (appka mluví na MQTT přímo z prohlížeče, přihlašovací údaje k HiveMQ jsou čitelné ve zdrojovém kódu appky). **Cílová architektura (Supabase mezi appkou a MQTT) nebyla nikdy implementována** — viz kapitola 8.

MQTT broker: HiveMQ Cloud, cluster `2aa867b8a86d4479b320828c9dd8d271.s1.eu.hivemq.cloud`, topicy `kostakct/esp32/cmd` a `kostakct/esp32/telemetry`, `BOARD_ID`/`target_id` = `esp_01_kotelna`.

**BEZPEČNOSTNÍ TODO, stále nevyřešeno:** MQTT heslo (`Rosta-IoT` / `RostaTest`) bylo opakovaně doporučeno rotovat (bylo čitelné v souborech sdílených v konverzaci). **Není potvrzeno, že k rotaci došlo.** Zkontroluj a připomeň, pokud ne.

---

## 4. Kompletní mapa souborů appky (aktuální stav)

```
(kořen repozitáře kostakct/ESP32-controller)
├── index.html
├── vite.config.ts            -- base: './' (nutné pro GitHub Pages podcestu)
├── package.json              -- obsahuje @types/react, @types/react-dom (doplněno, chybělo)
├── public/
│   ├── manifest.json         -- scope/start_url/icons jako relativní "./" (PWA instalace OPRAVENA a funguje)
│   ├── sw.js
│   ├── icon-192.png, icon-512.png
├── src/
│   ├── main.tsx
│   ├── App.tsx                -- hlavní komponenta, veškerá orchestrace
│   ├── types.ts                -- KOMPLETNÍ datový model (viz kap. 5)
│   ├── index.css
│   ├── hooks/
│   │   └── useMqtt.ts          -- MQTT klient (mqtt.js, WSS), diagnostika připojení
│   ├── data/
│   │   └── initialData.ts      -- počáteční/výchozí data (8 relé, atd.)
│   ├── utils/
│   │   ├── formatters.ts
│   │   └── inUtils.ts          -- logika blokací IN prvků (isInputBlocked)
│   ├── adapters/
│   │   ├── outConfigAdapter.ts -- překlad SwitchItem (drát) <-> OutConfig (bohaté UI)
│   │   └── inConfigAdapter.ts  -- obdoba pro IN prvky (zatím čistě lokální, firmware nic nepřijímá)
│   └── components/
│       ├── Header.tsx, BottomNav.tsx, NotificationToast.tsx, EspCodeModal.tsx,
│       │   MobileTestModal.tsx, HoldRepeatButton.tsx, TestSwView.tsx          -- beze změny od začátku
│       ├── SwitchCard.tsx       -- PŮVODNÍ (jednoduchá) dlaždice relé, pořád používaná v hlavní obrazovce "Spínače"
│       ├── SwitchTile.tsx       -- NOVÁ bohatá dlaždice (Vrstva 1 pro OUT) - zatím NENÍ zapojená místo SwitchCard v hlavní obrazovce!
│       ├── SettingsModal.tsx    -- Vrstva 2 pro OUT (rychlé nastavení všech 8 relé) + tlačítko "Otevřít pokročilé nastavení" -> ConfigCard
│       ├── ConfigCard.tsx       -- Vrstva 3 pro OUT (kompletní: classic/delay/thermostat/ext_switch, safety, schedule, quickLock, interlocks, role)
│       ├── InConfigCard.tsx     -- Vrstva 3 pro IN (typ, debounce, dlouhý stisk, výluky, quickLock, touchLock, role)
│       ├── InTile.tsx           -- Vrstva 1 pro IN (NOVĚ navržená mnou, nahradila inline řádky v HardwareInfoView)
│       ├── HardwareInfoView.tsx -- karta "ESP32": senzory + IN dlaždice (InTile) + tlačítko nastavení -> InConfigCard
│       ├── ScheduleView.tsx, ScheduleModal.tsx -- PŮVODNÍ "Časovače" záložka - bodové časovače, REÁLNĚ synchronizované s ESP32 (funguje)
│       ├── TimeWheel.tsx, TempWheel.tsx, CalendarPicker.tsx -- sdílené UI prvky (rotační výběr času/teploty, kalendář výluk)
│       ├── fixtures.ts          -- katalog prvků (živý, plněný z App.tsx), výchozí hodnoty (access/prefs/extSwitch)
│       └── VariantsView.tsx     -- nepoužívaný pozůstatek z AI Studio scaffoldu (opraven jen kvůli typekontrole, jinak irelevantní)
```

---

## 5. Datový model (`types.ts`) — dva paralelní systémy, které NEJSOU sjednocené

Tohle je nejdůležitější věc k pochopení, než uděláš další změnu:

### 5a. "Drátový" formát (co opravdu chodí přes MQTT do ESP32)
`SwitchItem`, `ScheduleItem` (bodový časovač: čas + akce ON/OFF + opakování), `ESP32DeviceStatus`. Používá je `useMqtt.ts`, `App.tsx` (hlavní stav), `ScheduleView`/`ScheduleModal` (záložka "Časovače"). **Tohle funguje end-to-end, reálně otestováno zadavatelem.**

### 5b. Bohatý UI model ("Vrstva 3", z návrhu zadavatele)
`OutConfig`/`OutRuntime` (pro relé) a `InConfig`/`InRuntime` (pro vstupy). Obsahuje mnohem víc: režimy classic/delay/thermostat/ext_switch, `ScheduleInterval[]` (intervalový plán "od-do", JINÝ koncept než bodový `ScheduleItem`), `InterlockRule[]`, `QuickLock`, role (`Role`, `RoleAccess`, `RolePrefs`).

**Konflikt, který čeká na vyřešení:** `ConfigCard`/`InConfigCard` mají svou vlastní záložku "Plán" se `ScheduleInterval[]` (interval od-do) — ta se ale **nikam neukládá na ESP32**, jen do localStorage. Skutečné, firmwarem podporované časovače pořád žijí jen ve staré záložce "Časovače" (`ScheduleItem`/`EspSchedule`, bodový formát). Appka tedy momentálně **má dvě vizuálně odlišná místa pro plánování**, z nichž jen jedno je reálné. Je potřeba buď (a) sjednotit je převodníkem interval→2 body (promyšleno, ale neimplementováno — viz komentář v `outConfigAdapter.ts`), nebo (b) vědomě rozhodnout, že "Plán" v `ConfigCard` je budoucí/Supabase-only funkce a UI to má jasně říkat.

**Konvence dne v týdnu se liší mezi systémy:**
- `WeekdayIndex` (bohatý model): `0 = Po ... 6 = Ne`
- `ScheduleItem`/firmware NVS plánovač: `0 = Ne ... 6 = So` (odpovídá `tm_wday` v C)

Kdokoliv bude psát převodník mezi nimi, musí tenhle posun o 1 ošetřit (`(x + 1) % 7` jedním směrem, `(x + 6) % 7` druhým).

---

## 6. Co je SKUTEČNĚ propojené s firmwarem vs. co je jen v appce

| Oblast | Stav | Poznámka |
|---|---|---|
| Zapnutí/vypnutí relé (ON/OFF) | Reálné | `SwitchCard` + `sendRelayCommand` |
| Delay/Inching (zpoždění, max opakování) | Reálné | NVS na ESP32, autonomní i bez appky |
| Bezpečné vypnutí (safety/guard) | Reálné | `maxRuntimeGuardMinutes` |
| Výchozí stav po startu (power-on) | Reálné | OFF/ON/KEEP_LAST |
| Bodové časovače (záložka "Časovače") | Reálné | NTP + NVS, funguje i s appkou zavřenou (potvrzeno testem) |
| Živý stav 4 digitálních vstupů | Reálné | Přidáno ve Fázi 3 (`in_active` v telemetrii) |
| Konfigurace zpětně z ESP32 do appky | Reálné | `cfg_delay_en/sec/guard/power_on` v telemetrii — appka už NEPŘEPISUJE NVS po bootu svou starou kopií |
| Termostat (`OutConfig.mode='thermostat'`) | Jen UI | Firmware neumí, appka ukládá lokálně |
| Ext. spínač (`mode='ext_switch'`) | Jen UI | Firmware neumí propojit IN->OUT logiku |
| Interval plán v ConfigCard (`ScheduleInterval[]`) | Jen UI | Viz kap. 5b |
| QuickLock (OUT i IN) | Jen UI | `isInputBlocked()` u IN jen zobrazuje odznak, nic reálně neblokuje |
| Interlocks (vzájemné blokace) | Jen UI | Žádná vyhodnocovací logika nikde neběží |
| Role/access/prefsByRole | Jen UI (fixní `editingRole='admin'`) | Patří do Supabase (RLS), ne do appky samotné |
| IN konfigurace (debounce, dlouhý stisk, kontakt typ...) | Jen UI | Firmware má tyhle hodnoty pevně zadrátované |
| Virtuální stisk IN (`InCommand`) | Neimplementováno | Ani UI tlačítko, ani firmware příjem |

---

## 7. Firmware v14 — stav a historie oprav

Soubor: `ESP32_Controller_V14.ino` (PlatformIO/Arduino, naposledy dodaný v konverzaci). Klíčové vlastnosti:
- WiFi + MQTT (TLS `setInsecure()` — vědomě nedořešeno, viz kap. 9)
- NVS perzistence konfigurace relé i časovačů
- NTP (`configTzTime`, časové pásmo Praha s DST) + autonomní plánovač běžící nezávisle na appce
- `client.setBufferSize(2048)` — kritická oprava, původní výchozích 256 B u PubSubClient nestačilo na rozšířenou telemetrii a `publish()` tiše selhával
- Telemetrie obsahuje: stavy relé, odpočty, konfiguraci (cfg_*), senzory, a nově `in_active[4]` (živý stav vstupů)
- LWT (`online`/`offline`) na statusovém topicu

**Historie vyřešených chyb (nedělej je znovu):**
1. Appka po `boot` eventu přepisovala NVS konfiguraci ESP32 svou starou kopií → opraveno, appka nyní čte `cfg_*` a NIKDY nepřepisuje config po bootu.
2. Časovače běžely jen v prohlížeči (`setInterval` + localStorage) → přestaly fungovat při zavření appky → přepsáno na autonomní NTP plánovač přímo na ESP32.
3. `manifest.json` měl absolutní cesty (`/ESP32-controller/`) → PWA se nedala nainstalovat na jiné podcestě → opraveno na relativní `./`.
4. Soubory byly nahrané do kořene repozitáře místo `src/`/`public/` → Vite je nepoužil při buildu → opraveno přesunem do správné struktury (viz kap. 4).
5. `client.publish()` tiše selhával kvůli přetečení 256B bufferu PubSubClient při rozšířené telemetrii → `setBufferSize(2048)`.
6. V projektu chyběly `@types/react`/`@types/react-dom` úplně → TypeScript doteď nekontroloval typy React komponent vůbec → doplněno.

---

## 8. Supabase — STAV NEZNÁMÝ, toto je priorita č. 1 pro nové vlákno

Supabase integrace nebyla nikdy implementována, přestože je to architektonicky klíčový krok (kap. 3 — appka teď mluví na MQTT přímo, s heslem v kódu). V konverzaci byl zadavatel dotázán na stav jeho Supabase projektu (založen? má tabulky? neví kde hledat?), ale odpověď nebyla zaznamenána/jasně potvrzena před tím, než práce odbočila k integraci `ConfigCard`/`InConfigCard`.

**První krok nového vlákna ohledně Supabase:** znovu se zeptat na aktuální stav Supabase projektu, pak postupovat podle Fáze 1 plánu (tabulky `devices`/`components`/`component_state`, Edge Functions pro telemetrii a příkazy přes krátké MQTT spojení — koncept byl navržen dříve v konverzaci, ale nikdy implementován).

---

## 9. Prioritizovaný seznam otevřené práce

1. Zjistit stav Supabase (dotaz na zadavatele) — blokuje celou "cílovou" architekturu.
2. Ladění appky — funkční a grafické (explicitní požadavek zadavatele): projít `SwitchCard` vs. nezapojený `SwitchTile` (rozhodnout, jestli hlavní obrazovka přejde na bohatší dlaždici), sjednotit vizuální styl mezi starými a novými komponentami, otestovat všechny nové karty (`ConfigCard` s ext_switch, `InConfigCard`, `InTile`) naživo na telefonu.
3. Vrstva 2 pro IN prvky (`InSettingsModal`, analogie `SettingsModal`) — navrženo, ale ještě nezapočato (byl to další plánovaný krok, "bod 4b").
4. AI/AO karty — zadavatel výslovně požádal o vlastní návrh, zatím vůbec nezapočato.
5. Sjednotit dva plánovací systémy (kap. 5b) nebo jasně UI oddělit, co je reálné a co ne.
6. Rotovat MQTT heslo (bezpečnost, opakovaně odloženo).
7. TLS `setInsecure()` ve firmwaru — bezpečnostní dluh z úplného začátku projektu, nikdy neřešeno.
8. Teprve po výše uvedeném: termostat, ext_switch, interlocks, quickLock, role — reálná firmware/Supabase implementace.

---

## 10. Pracovní konvence (jak spolu reálně pracujeme)

- AI (já) generuje kompletní soubory ke stažení (ne útržky/diffy) s jasným popisem kam patří.
- Zadavatel soubory ručně nahrazuje v Cursoru, dělá `git add/commit/push`.
- GitHub Action automaticky buildí a nasazuje na GitHub Pages (`kostakct.github.io/ESP32-controller`).
- Firmware nahrává zadavatel sám přes USB (vyžaduje fyzický přístup k desce, nejde automatizovat).
- Práce se vědomě fázuje (zadavatel to explicitně vyžaduje kvůli kontextovým limitům) — každá fáze: implementace → `tsc --noEmit` + `vite build` ověření → dodání souborů → stručný popis, co je další krok → počkat na pokyn k pokračování.
- Appka se testuje primárně na reálném telefonu (Xiaomi 13 Pro, Chrome/Brave) proti reálnému ESP32, ne v simulaci.

---

## 11. Pro nové vlákno: jak začít

1. Přečti celý tento soubor.
2. Zeptej se zadavatele: (a) stav Supabase projektu, (b) jestli `IoT-ecosystem` monorepo ještě žije vedle `ESP32-controller`, (c) jestli už rotoval MQTT heslo, (d) kterým bodem z kap. 9 chce pokračovat.
3. Než cokoliv měníš v appce, požádej o aktuální export/zip repozitáře `kostakct/ESP32-controller` (nespoléhej na paměť z minulého vlákna — soubory se mohly mezitím ručně upravit).
4. Pokračuj po malých, ověřitelných krocích (`tsc --noEmit`, `vite build` po každé změně) — tahle metoda se v projektu osvědčila a odhalila víc chyb, než kdyby se postupovalo narychlo.
