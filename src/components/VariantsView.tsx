import React, { useState } from 'react';
import {
  Download,
  Layers,
  Cpu,
  HardDrive,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  FileText,
  Copy,
  Check,
  ExternalLink,
  ShieldAlert,
  Gauge,
  Monitor,
} from 'lucide-react';

const cppCode = `// 1. DISPLEJ A DOTYK (Rezervováno pro budoucí osazení)
// Zcela bezpečné piny, žádná kolize.
#define DISP_MOSI   11
#define DISP_MISO   13
#define DISP_SCLK   12
#define DISP_CS     10
#define DISP_DC     9
#define DISP_RST    4
#define DISP_LED    5
// Společná I2C sběrnice pro Dotyk displeje i senzory (AM2320, BME280 atd.)
#define I2C_SDA     6    
#define I2C_SCL     7    
#define TOUCH_INT   -1 
#define TOUCH_RST   -1 

// 2. ANALOGOVÉ MĚŘENÍ A AUDIO
#define LDR_PIN     2    // ADC1_CH1 pro fotorezistor
#define BUZZER_PIN  48   // PWM výstup pro bzučák/piezo

// 3. VÝSTUPY (8x LED simulace, později Relé)
#define OUT_1       41
#define OUT_2       42
#define OUT_3       1
#define OUT_4       8
#define OUT_5       18
#define OUT_6       21
#define OUT_7       47
#define OUT_8       38

// 4. ONEWIRE A I2C SENZORY 
#define ONEWIRE_1   39
#define ONEWIRE_2   40
// AM2320 využívá sdílenou I2C sběrnici na pinech 6 (SDA) a 7 (SCL).
// Pin 14 je nyní volný pro další použití (např. další vstup/výstup).
#define FREE_PIN    14   

// 5. DIGITÁLNÍ VSTUPY (4x Tlačítka / PIR)
// Pozor na INPUT_4 na pinu 46 (Strapping pin)!
#define INPUT_1     15
#define INPUT_2     16
#define INPUT_3     17
#define INPUT_4     46   // STRAPPING PIN: Při bootu MUSÍ být LOW (0V).`;

export const VariantsView: React.FC = () => {
  const [selectedVariant, setSelectedVariant] = useState<number>(3); // Default to ESP32-S3 + LCD (flagship)
  const [viewMode, setViewMode] = useState<'variants' | 'pinout'>('pinout');
  const [copied, setCopied] = useState(false);

  const handleDownload = (filename: string) => {
    const link = document.createElement('a');
    link.href = `/${filename}`;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const variants = [
    {
      id: 0,
      name: 'ESP32 DevKit 4MB',
      badge: 'Základní (Headless)',
      color: 'blue',
      lcd: false,
      flash: '4 MB Flash',
      ram: '520 kB SRAM (žádná PSRAM)',
      ioTotal: '22–24 volných GPIO',
      ioUsed: '21 GPIO (12 OUT, 3 1-Wire, 2 DHT, 4 PIR)',
      ioStatus: 'Těsně vyjde (100% využití pinů, 0 rezerva)',
      otaSize: '1.75 MB na OTA slot',
      fwSize: '~1.12 MB (64% zaplnění)',
      littlefs: '448 kB (Gzip SPA 55 kB = 12%)',
      lcdPerf: 'Není osazen (pouze Web & MQTT)',
      feasibility: 'PROVEDITELNÉ',
      feasibilityType: 'ok',
      notes:
        'Vhodné pro instalaci do rozvaděče bez fyzického displeje. 12 relé, 3 OneWire a 2 DHT obsadí prakticky všechny výstupní piny ESP32. 4x PIR využijí vstupní piny 34, 35, 36, 39.',
    },
    {
      id: 1,
      name: 'ESP32 DevKit 4MB + 4" LCD',
      badge: 'Nedoporučeno',
      color: 'amber',
      lcd: true,
      flash: '4 MB Flash',
      ram: '520 kB SRAM (Chybí PSRAM!)',
      ioTotal: '22–24 GPIO na modulu',
      ioUsed: '31 GPIO potřeba (chybí ~7–9 pinů)',
      ioStatus: 'NEDOSTATEK PINŮ (nutný I2C expandér)',
      otaSize: '1.30 MB až 1.75 MB',
      fwSize: '~1.84 MB (PŘETEČE standardní OTA slot)',
      littlefs: '128–256 kB (kriticky málo)',
      lcdPerf: 'Trhané (12–18 FPS, malý 1/10 buffer, blikání)',
      feasibility: 'NEDOPORUČUJE SE',
      feasibilityType: 'warning',
      notes:
        'Pro 12 relé byste museli použít I2C expandér (např. MCP23017). Chybějící PSRAM způsobí trhání 480x320 displeje. Firmware s LVGL + WebServerem se nevejde do 2-slotového OTA.',
    },
    {
      id: 2,
      name: 'ESP32-S3 16MB',
      badge: 'Robustní Headless',
      color: 'indigo',
      lcd: false,
      flash: '16 MB Flash',
      ram: '512 kB SRAM + 8 MB PSRAM',
      ioTotal: '36–38 volných GPIO',
      ioUsed: '21 GPIO (12 OUT, 3 1-Wire, 2 DHT, 4 PIR)',
      ioStatus: 'Bohatá rezerva (15+ volných GPIO)',
      otaSize: '5.5 MB na OTA slot',
      fwSize: '~1.15 MB (21% zaplnění)',
      littlefs: '4.5 MB (obrovský prostor pro Web & logy)',
      lcdPerf: 'Není osazen (pouze Web & MQTT)',
      feasibility: 'VYNIKAJÍCÍ',
      feasibilityType: 'success',
      notes:
        'Špičková varianta pro rozvaděč. Obrovská rezerva paměti pro budoucí funkce, bleskový běh WebServeru a MQTT bez omezení.',
    },
    {
      id: 3,
      name: 'ESP32-S3 16MB + 4" IPS Dotyk',
      badge: 'Doporučená Vlajková Loď',
      color: 'emerald',
      lcd: true,
      flash: '16 MB Flash',
      ram: '512 kB SRAM + 8 MB Octal PSRAM',
      ioTotal: '36–38 volných GPIO',
      ioUsed: '30–31 GPIO (Vše NATIVNĚ bez expandéru)',
      ioStatus: 'Plně vyhovuje (+ 6 volných pinů rezerva)',
      otaSize: '5.5 MB na OTA slot',
      fwSize: '~1.95 MB (35% zaplnění, obrovská rezerva)',
      littlefs: '4.0 MB (Gzip SPA 55 kB = 1.4%)',
      lcdPerf: 'Dokonalá plynulost (50–60 FPS, DMA Double Buffer)',
      feasibility: 'DOPORUČENÁ VOLBA',
      feasibilityType: 'success',
      notes:
        'Všechny periferie (12 relé, 3 OneWire, 2 DHT, 4 PIR i 4" IPS s dotykem) běží přímo z pinů ESP32-S3. 8MB PSRAM zaručuje smartphone-like plynulost animací LVGL.',
    },
  ];

  const current = variants[selectedVariant];

  return (
    <div className="p-3.5 sm:p-4 space-y-4 text-xs sm:text-sm">
      {/* Top Header Card with Download Trigger */}
      <div className="bg-gradient-to-r from-slate-900 via-sky-950 to-slate-900 text-white rounded-2xl p-4 sm:p-5 border border-sky-800/40 shadow-xl">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-xl bg-sky-500/20 text-sky-400 border border-sky-400/30 flex items-center justify-center shrink-0 mt-0.5">
              <Layers className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-bold text-sky-400 tracking-wider uppercase">
                  Hardware Rozbor • ESP32 vs S3
                </span>
                <span className="bg-emerald-500/20 text-emerald-300 text-[10px] px-1.5 py-0.5 rounded border border-emerald-500/30">
                  VARIANTS.md
                </span>
              </div>
              <h2 className="text-base sm:text-lg font-bold text-white mt-0.5">
                Analýza variant: 12x OUT, 3x OneWire, 2x DHT, 4x PIR, 4" IPS
              </h2>
              <p className="text-xs text-slate-300 mt-1 max-w-2xl leading-relaxed">
                Porovnání pinové kapacity, rozdělení Flash paměti pro 2-slotové OTA, velikosti HTML
                aplikace v LittleFS a nároků na RAM pro grafiku.
              </p>
            </div>
          </div>

          {/* Tab Toggles & Actions */}
          <div className="flex items-center gap-2 pt-2 sm:pt-0 shrink-0">
            <div className="flex items-center bg-slate-800/80 p-1 rounded-xl border border-slate-700/50 shrink-0 mr-1">
              <button
                onClick={() => setViewMode('variants')}
                className={`px-3 py-1.5 rounded-lg text-[11px] font-bold transition ${
                  viewMode === 'variants'
                    ? 'bg-sky-500 text-slate-900 shadow-sm'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                Analýza
              </button>
              <button
                onClick={() => setViewMode('pinout')}
                className={`px-3 py-1.5 rounded-lg text-[11px] font-bold transition flex items-center gap-1 ${
                  viewMode === 'pinout'
                    ? 'bg-emerald-500 text-slate-900 shadow-sm'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <Cpu className="w-3.5 h-3.5" />
                Pinout S3
              </button>
            </div>
            {viewMode === 'variants' && (
              <button
                onClick={() => handleDownload('VARIANTS.md')}
                className="flex items-center gap-1.5 bg-white/10 hover:bg-white/20 active:scale-95 text-white font-bold px-3 py-2 rounded-xl text-xs transition cursor-pointer border border-white/10"
                title="Stáhnout VARIANTS.md"
              >
                <Download className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>
      </div>

      {viewMode === 'variants' && (
        <>
          {/* Variant Selector Tabs */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        {variants.map((v) => (
          <button
            key={v.id}
            id={`btn-select-variant-${v.id}`}
            onClick={() => setSelectedVariant(v.id)}
            className={`p-2.5 sm:p-3 rounded-xl border text-left transition relative flex flex-col justify-between ${
              selectedVariant === v.id
                ? 'bg-white border-sky-500 shadow-md ring-2 ring-sky-500/20'
                : 'bg-white/70 hover:bg-white border-slate-200 text-slate-700'
            }`}
          >
            <div>
              <div className="flex items-center justify-between gap-1 mb-1">
                <span
                  className={`text-[9px] font-bold px-1.5 py-0.5 rounded uppercase tracking-wider ${
                    v.feasibilityType === 'success'
                      ? 'bg-emerald-100 text-emerald-800'
                      : v.feasibilityType === 'ok'
                      ? 'bg-blue-100 text-blue-800'
                      : 'bg-amber-100 text-amber-800'
                  }`}
                >
                  {v.badge}
                </span>
                {v.lcd ? (
                  <Monitor className="w-3.5 h-3.5 text-sky-600 shrink-0" title="Se 4&quot; IPS" />
                ) : (
                  <Cpu className="w-3.5 h-3.5 text-slate-400 shrink-0" title="Bez displeje" />
                )}
              </div>
              <h3 className="font-bold text-xs sm:text-sm text-slate-900 leading-tight">
                {v.name}
              </h3>
            </div>
            <div className="mt-2 text-[10px] text-slate-500 flex items-center gap-1 font-medium">
              <span>{v.flash}</span> • <span>{v.lcd ? 'Se 4" IPS' : 'Bez LCD'}</span>
            </div>
          </button>
        ))}
      </div>

      {/* Selected Variant Detail Card */}
      <div className="bg-white rounded-2xl p-4 sm:p-5 border border-slate-200 shadow-xs space-y-4">
        {/* Title Bar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-slate-100 gap-2">
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-base font-bold text-slate-900">{current.name}</h3>
              <span
                className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                  current.feasibilityType === 'success'
                    ? 'bg-emerald-100 text-emerald-800'
                    : current.feasibilityType === 'ok'
                    ? 'bg-blue-100 text-blue-800'
                    : 'bg-amber-100 text-amber-800'
                }`}
              >
                {current.feasibility}
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">{current.notes}</p>
          </div>

          <div className="shrink-0 text-right">
            <span className="text-[11px] text-slate-400 block font-medium">Architektura</span>
            <span className="text-xs font-bold text-slate-800">
              Dual-Core 240 MHz • OTA 2x Slot
            </span>
          </div>
        </div>

        {/* 4 Key Metrics Bento Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {/* 1) IO & Piny */}
          <div className="bg-slate-50 rounded-xl p-3 border border-slate-200/80">
            <div className="flex items-center justify-between text-xs text-slate-500 mb-1">
              <span className="font-semibold text-slate-700">Kapacita GPIO pinů</span>
              <Cpu className="w-3.5 h-3.5 text-slate-400" />
            </div>
            <div className="text-sm font-bold text-slate-900 mt-1">{current.ioStatus}</div>
            <div className="text-[11px] text-slate-500 mt-1">
              Potřeba: <strong>{current.ioUsed}</strong>
            </div>
            <div className="text-[11px] text-slate-500">Dostupno: {current.ioTotal}</div>
          </div>

          {/* 2) Flash & OTA */}
          <div className="bg-slate-50 rounded-xl p-3 border border-slate-200/80">
            <div className="flex items-center justify-between text-xs text-slate-500 mb-1">
              <span className="font-semibold text-slate-700">Flash & OTA Slot</span>
              <HardDrive className="w-3.5 h-3.5 text-slate-400" />
            </div>
            <div className="text-sm font-bold text-slate-900 mt-1">{current.otaSize}</div>
            <div className="text-[11px] text-slate-500 mt-1">
              Odhad firmware: <strong>{current.fwSize}</strong>
            </div>
            <div className="text-[11px] text-slate-500">LittleFS: {current.littlefs}</div>
          </div>

          {/* 3) RAM & PSRAM */}
          <div className="bg-slate-50 rounded-xl p-3 border border-slate-200/80">
            <div className="flex items-center justify-between text-xs text-slate-500 mb-1">
              <span className="font-semibold text-slate-700">RAM & PSRAM</span>
              <Gauge className="w-3.5 h-3.5 text-slate-400" />
            </div>
            <div className="text-sm font-bold text-slate-900 mt-1">{current.ram}</div>
            <div className="text-[11px] text-slate-500 mt-1">
              SRAM Heap pro Wi-Fi: <strong>~300–380 kB</strong>
            </div>
            <div className="text-[11px] text-slate-500">
              DMA přenos: {current.lcd ? 'Vyžadován' : 'Není nutný'}
            </div>
          </div>

          {/* 4) Displej 4" IPS */}
          <div className="bg-slate-50 rounded-xl p-3 border border-slate-200/80">
            <div className="flex items-center justify-between text-xs text-slate-500 mb-1">
              <span className="font-semibold text-slate-700">Displej & Plynulost</span>
              <Monitor className="w-3.5 h-3.5 text-slate-400" />
            </div>
            <div className="text-sm font-bold text-slate-900 mt-1">{current.lcdPerf}</div>
            <div className="text-[11px] text-slate-500 mt-1">
              Rozlišení: {current.lcd ? '480 × 320 px (16-bit RGB)' : 'Bez displeje'}
            </div>
            <div className="text-[11px] text-slate-500">
              Buffer: {current.lcd ? (selectedVariant === 3 ? '600 kB Double Buf v PSRAM' : '30 kB v SRAM') : 'N/A'}
            </div>
          </div>
        </div>

        {/* Pinout Assignment Table for Target Peripherals */}
        <div className="border border-slate-200 rounded-xl overflow-hidden mt-3">
          <div className="bg-slate-100/90 px-3.5 py-2 border-b border-slate-200 flex items-center justify-between">
            <span className="text-xs font-bold text-slate-800">
              Přiřazení pinů pro požadovaných 21–31 periferií
            </span>
            <span className="text-[10px] text-slate-500 font-medium">
              12x OUT + 3x OneWire + 2x DHT + 4x PIR {current.lcd ? '+ 4" IPS' : ''}
            </span>
          </div>

          <div className="divide-y divide-slate-100 text-xs">
            <div className="p-2.5 flex items-start justify-between gap-3 bg-white">
              <div>
                <span className="font-bold text-slate-800">12x OUT (Výstupy pro relé)</span>
                <p className="text-[11px] text-slate-500">
                  {selectedVariant === 1
                    ? 'Na ESP32 DevKit 4MB s displejem nelze připojit napřímo. Nutný I2C expandér MCP23017!'
                    : selectedVariant === 0
                    ? 'Obsadí 12 GPIO výstupních pinů (např. GPIO 4, 13, 14, 16, 17, 18, 19, 21, 22, 23, 25, 26).'
                    : 'Na ESP32-S3 se připojí napřímo na 12 vyhrazených GPIO pinů s hardwarovou ochranou Active-LOW.'}
                </p>
              </div>
              <span className="font-mono text-[11px] font-bold px-2 py-0.5 rounded bg-slate-100 text-slate-700 shrink-0">
                12 pinů
              </span>
            </div>

            <div className="p-2.5 flex items-start justify-between gap-3 bg-white">
              <div>
                <span className="font-bold text-slate-800">3x Nezávislé OneWire sběrnice (DS18B20)</span>
                <p className="text-[11px] text-slate-500">
                  Každé čidlo má svůj vlastní pin a externí pull-up rezistor 4.7 kΩ na +3.3V. Porucha
                  jednoho neohrozí ostatní dvě.
                </p>
              </div>
              <span className="font-mono text-[11px] font-bold px-2 py-0.5 rounded bg-emerald-50 text-emerald-700 shrink-0">
                3 piny
              </span>
            </div>

            <div className="p-2.5 flex items-start justify-between gap-3 bg-white">
              <div>
                <span className="font-bold text-slate-800">2x DHT čidla (DHT11 / DHT22)</span>
                <p className="text-[11px] text-slate-500">
                  Mikrosekundové časování pro čtení teploty a relativní vlhkosti vzduchu.
                </p>
              </div>
              <span className="font-mono text-[11px] font-bold px-2 py-0.5 rounded bg-blue-50 text-blue-700 shrink-0">
                2 piny
              </span>
            </div>

            <div className="p-2.5 flex items-start justify-between gap-3 bg-white">
              <div>
                <span className="font-bold text-slate-800">4x IN (PIR senzory pohybu)</span>
                <p className="text-[11px] text-slate-500">
                  Na ESP32 využívají vstupní piny 34, 35, 36, 39 (VP, VN). Na ESP32-S3 libovolné 4 GPIO
                  s přerušením.
                </p>
              </div>
              <span className="font-mono text-[11px] font-bold px-2 py-0.5 rounded bg-amber-50 text-amber-700 shrink-0">
                4 piny
              </span>
            </div>

            {current.lcd && (
              <div className="p-2.5 flex items-start justify-between gap-3 bg-sky-50/50">
                <div>
                  <span className="font-bold text-sky-900">4" SPI IPS Displej (ST7796) + I2C Dotyk (GT911)</span>
                  <p className="text-[11px] text-sky-700">
                    SPI: SCK, MOSI, CS, DC, RST, BL (6 pinů) • I2C Dotyk: SDA, SCL, INT, RST (3–4 piny).
                  </p>
                </div>
                <span className="font-mono text-[11px] font-bold px-2 py-0.5 rounded bg-sky-100 text-sky-800 shrink-0">
                  9–10 pinů
                </span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* HTML / SPA Web App Footprint Card */}
      <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-xs">
        <div className="flex items-center gap-2 mb-2">
          <FileText className="w-4 h-4 text-sky-600" />
          <h3 className="text-sm font-bold text-slate-900">
            Velikost HTML a webové aplikace pro LittleFS
          </h3>
        </div>
        <p className="text-xs text-slate-600 leading-relaxed mb-3">
          Pokud se webová aplikace nahrává přímo do Flash paměti ESP32 (LittleFS) a servíruje přes
          integrovaný asynchronní webserver bez nutnosti externího hostingu:
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
          <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
            <span className="text-[10px] text-slate-400 font-bold block uppercase">
              Produkční Build (Nekomprimovaný)
            </span>
            <span className="text-base font-bold text-slate-800 mt-0.5 block">~190 kB</span>
            <span className="text-[11px] text-slate-500">HTML (1.2k) + CSS (18k) + JS (170k)</span>
          </div>

          <div className="p-3 bg-emerald-50 rounded-xl border border-emerald-200">
            <span className="text-[10px] text-emerald-600 font-bold block uppercase">
              Se zapnutou Gzip kompresí
            </span>
            <span className="text-base font-bold text-emerald-700 mt-0.5 block">~50 až 65 kB</span>
            <span className="text-[11px] text-emerald-600">Servírováno s Content-Encoding: gzip</span>
          </div>

          <div className="p-3 bg-sky-50 rounded-xl border border-sky-200">
            <span className="text-[10px] text-sky-600 font-bold block uppercase">
              Rychlost načtení v LAN
            </span>
            <span className="text-base font-bold text-sky-700 mt-0.5 block">&lt; 150 ms</span>
            <span className="text-[11px] text-sky-600">Okamžité zobrazení na mobilu i PC</span>
          </div>
        </div>
      </div>

      {/* Summary Matrix Table */}
      <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-xs overflow-x-auto">
        <h3 className="text-sm font-bold text-slate-900 mb-3">
          Souhrnná inženýrská matice pro plánování
        </h3>
        <table className="w-full text-left text-xs border-collapse">
          <thead>
            <tr className="border-b border-slate-200 text-slate-400 text-[10px] uppercase">
              <th className="pb-2 font-semibold">Varianta</th>
              <th className="pb-2 font-semibold">12x OUT + Senzory</th>
              <th className="pb-2 font-semibold">4" IPS Dotyk</th>
              <th className="pb-2 font-semibold">OTA Oddíly</th>
              <th className="pb-2 font-semibold">Doporučení</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 text-slate-700">
            <tr>
              <td className="py-2.5 font-bold text-slate-900">1. ESP32 4MB (Bez LCD)</td>
              <td className="py-2.5 text-blue-600">Ano (100% pinů)</td>
              <td className="py-2.5 text-slate-400">Neosazen</td>
              <td className="py-2.5">2x 1.75 MB (64% využito)</td>
              <td className="py-2.5 text-emerald-600 font-bold">Vhodné pro rozvaděč</td>
            </tr>
            <tr>
              <td className="py-2.5 font-bold text-slate-900">2. ESP32 4MB (+ 4" LCD)</td>
              <td className="py-2.5 text-amber-600">Jen s MCP23017</td>
              <td className="py-2.5 text-red-600">Trhané (bez PSRAM)</td>
              <td className="py-2.5 text-red-600 font-bold">PŘETEČE (&gt;1.8 MB)</td>
              <td className="py-2.5 text-red-600 font-bold">Nedoporučuje se</td>
            </tr>
            <tr>
              <td className="py-2.5 font-bold text-slate-900">3. ESP32-S3 16MB (Bez LCD)</td>
              <td className="py-2.5 text-emerald-600">Nativně + 15 pinů rezerva</td>
              <td className="py-2.5 text-slate-400">Neosazen</td>
              <td className="py-2.5">2x 5.5 MB (21% využito)</td>
              <td className="py-2.5 text-emerald-600 font-bold">Výborné</td>
            </tr>
            <tr>
              <td className="py-2.5 font-bold text-slate-900">4. ESP32-S3 16MB (+ 4" LCD)</td>
              <td className="py-2.5 text-emerald-600">Nativně + 6 pinů rezerva</td>
              <td className="py-2.5 text-emerald-600 font-bold">60 FPS (8MB PSRAM)</td>
              <td className="py-2.5">2x 5.5 MB (35% využito)</td>
              <td className="py-2.5 text-emerald-700 font-extrabold bg-emerald-50 px-2 py-1 rounded inline-block">
                Vlajková loď (Vítěz)
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* Bottom Download Banner */}
      {viewMode === 'variants' && (
        <div className="p-4 bg-slate-900 text-white rounded-2xl flex flex-col sm:flex-row items-center justify-between gap-3 shadow-lg">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-white/10 flex items-center justify-center text-sky-400 shrink-0">
              <FileText className="w-4 h-4" />
            </div>
            <div className="text-xs">
              <span className="font-bold text-white block">
                Kompletní text zprávy je uložen v projektu jako VARIANTS.md
              </span>
              <span className="text-slate-400">
                Lze jej stáhnout přímo do počítače nebo otevřít v záložce Code.
              </span>
            </div>
          </div>

          <button
            onClick={() => handleDownload('VARIANTS.md')}
            className="flex items-center gap-1.5 bg-sky-500 hover:bg-sky-400 active:scale-95 text-slate-950 font-bold px-4 py-2 rounded-xl text-xs transition cursor-pointer shrink-0"
          >
            <Download className="w-4 h-4" />
            <span>Stáhnout VARIANTS.md</span>
          </button>
        </div>
      )}
        </>
      )}

      {/* --- PINOUT VIEW --- */}
      {viewMode === 'pinout' && (
        <div className="space-y-4">
          <div className="bg-white rounded-2xl p-4 sm:p-5 border border-slate-200 shadow-xs">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                  <Cpu className="w-5 h-5 text-emerald-600" />
                  Detailní rozvržení pinů (Pinout) pro ESP32-S3
                </h3>
                <p className="text-xs text-slate-500 mt-1 max-w-xl leading-relaxed">
                  100% připraveno pro testování s LED, nezávislými OneWire senzory a budoucí přidání 4" IPS SPI displeje a relé.
                  Vyhýbá se USB a UART pinům pro zcela bezpečné ladění.
                </p>
              </div>
              <button
                onClick={() => handleDownload('PINOUT_ESP32_S3.md')}
                className="flex items-center gap-1.5 bg-emerald-500 hover:bg-emerald-400 active:scale-95 text-white font-bold px-3 py-2 rounded-xl text-xs shadow-lg shadow-emerald-500/25 transition cursor-pointer shrink-0"
              >
                <Download className="w-4 h-4" />
                <span className="hidden sm:inline">Stáhnout PINOUT</span>
              </button>
            </div>

            {/* Code Block */}
            <div className="relative group rounded-xl overflow-hidden bg-slate-950 border border-slate-800 shadow-inner">
              <div className="flex items-center justify-between px-4 py-2.5 bg-slate-900 border-b border-slate-800">
                <span className="text-[10px] font-mono text-slate-400 uppercase tracking-wider">
                  pins.h (C++)
                </span>
                <button
                  onClick={() => handleCopy(cppCode)}
                  className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-slate-300 transition text-[10px] font-bold active:scale-95"
                >
                  {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                  <span>{copied ? 'Zkopírováno' : 'Kopírovat kód'}</span>
                </button>
              </div>
              <div className="p-4 overflow-x-auto">
                <pre className="text-[11px] sm:text-xs text-sky-300 font-mono leading-relaxed">
                  {cppCode}
                </pre>
              </div>
            </div>
            
            {/* Warning Notes */}
            <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="p-3 bg-emerald-50 rounded-xl border border-emerald-200 text-xs">
                <div className="flex items-center gap-1.5 font-bold text-emerald-800 mb-1">
                  <ShieldAlert className="w-4 h-4" /> 100% Bezpečné startování
                </div>
                <p className="text-emerald-700/90 leading-relaxed">
                  Žádný z použitých pinů (0, 3, 45, 46) není strapping. Modul můžete resetovat nebo zapínat kdykoliv bez ohledu na to, zda držíte tlačítko nebo v jakém stavu je PIR.
                </p>
              </div>
              <div className="p-3 bg-sky-50 rounded-xl border border-sky-200 text-xs">
                <div className="flex items-center gap-1.5 font-bold text-sky-800 mb-1">
                  <CheckCircle2 className="w-4 h-4" /> Volné USB, UART i RGB
                </div>
                <p className="text-sky-700/90 leading-relaxed">
                  Piny 19, 20 (USB) a 43, 44 (UART) byly úmyslně vynechány. Volný zůstal i pin 48 (na desce často slouží pro stavovou RGB diodu). Ladění z PC je zcela bez rizika.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
