import React, { useState } from 'react';
import {
  Cpu,
  Radio,
  Thermometer,
  Eye,
  Activity,
  Server,
  Wifi,
  Terminal,
  Copy,
  Check,
  Zap,
} from 'lucide-react';
import { ESP32DeviceStatus, SwitchItem } from '../types';

interface HardwareInfoViewProps {
  deviceStatus: ESP32DeviceStatus;
  switches: SwitchItem[];
  mode?: 'all' | 'esp32' | 'mqtt';
}

export const HardwareInfoView: React.FC<HardwareInfoViewProps> = ({
  deviceStatus,
  switches,
  mode = 'all',
}) => {
  const [copiedTopic, setCopiedTopic] = useState<string | null>(null);

  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedTopic(id);
    setTimeout(() => setCopiedTopic(null), 2000);
  };

  const showEsp32 = mode === 'all' || mode === 'esp32';
  const showMqtt = mode === 'all' || mode === 'mqtt';

  const sampleMqttJson = JSON.stringify(
    {
      device: 'ESP32-S3_HomeSwitch',
      ip: deviceStatus.ip,
      rssi: deviceStatus.wifiRssi,
      uptime_s: deviceStatus.uptimeSeconds,
      relays: switches.slice(0, 4).map((s) => ({
        id: s.id,
        ch: s.channelIndex,
        name: s.name,
        state: s.isOn ? 'ON' : 'OFF',
        delay_rem: s.isDelayRunning ? Math.round(s.remainingSeconds * 10) / 10 : 0,
        repeats: s.currentRepeats,
      })),
      sensors: {
        temp1_c: deviceStatus.oneWireTemp1,
        temp2_c: deviceStatus.oneWireTemp2,
        in1: deviceStatus.input1Active,
        in2: deviceStatus.input2Active,
        in3: deviceStatus.input3Active,
        in4: deviceStatus.input4Active,
      },
    },
    null,
    2
  );

  return (
    <div className="p-4 space-y-4 text-xs sm:text-sm">
      {/* ESP32 HARDWARE SECTION */}
      {showEsp32 && (
        <>
          {/* Overview Card */}
          <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-xs">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-sky-600 to-blue-500 text-white flex items-center justify-center shadow-md shadow-sky-500/20">
                <Cpu className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-base font-bold text-slate-800">
                  ESP32-S3 Hardware Architektura
                </h2>
                <p className="text-xs text-slate-500">
                  Dálkové ovládání bez centrálního serveru přes Wi-Fi a MQTT
                </p>
              </div>
            </div>

            {/* Live HW specs grid */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mt-4">
              <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-200/80">
                <span className="text-[10px] text-slate-400 font-medium block">Výstupy (Relé)</span>
                <span className="text-sm font-bold text-slate-800">8x OUT (4 aktivní)</span>
              </div>
              <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-200/80">
                <span className="text-[10px] text-slate-400 font-medium block">OneWire Teploměry</span>
                <span className="text-sm font-bold text-emerald-600">2x DS18B20</span>
              </div>
              <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-200/80">
                <span className="text-[10px] text-slate-400 font-medium block">Digitální vstupy</span>
                <span className="text-sm font-bold text-amber-600">4x Tlačítka / PIR</span>
              </div>
              <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-200/80">
                <span className="text-[10px] text-slate-400 font-medium block">Lokální IP / Wi-Fi</span>
                <span className="text-sm font-bold text-sky-600">{deviceStatus.ip}</span>
              </div>
            </div>
          </div>

          {/* Live Sensors readout (OneWire, AM2320, LDR, Inputs) */}
          <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-xs space-y-3">
            <h3 className="font-bold text-slate-800 text-xs sm:text-sm flex items-center gap-1.5">
              <Activity className="w-4 h-4 text-sky-600" />
              <span>Senzorické vstupy (Živá data přes MQTT)</span>
            </h3>

            <div className="grid grid-cols-2 gap-3">
              {/* Temperature 1 (OneWire) */}
              <div className="bg-sky-50/50 border border-sky-200/70 p-3 rounded-xl flex items-center gap-3">
                <Thermometer className="w-6 h-6 text-sky-600 flex-shrink-0" />
                <div>
                  <span className="text-[10px] font-semibold text-slate-500 block">
                    OneWire T1 (Trubka 1)
                  </span>
                  <span className="text-lg font-bold font-mono text-sky-800">
                    {deviceStatus.oneWireTemp1?.toFixed(1) ?? '--.-'} °C
                  </span>
                </div>
              </div>

              {/* Temperature 2 (OneWire) */}
              <div className="bg-sky-50/50 border border-sky-200/70 p-3 rounded-xl flex items-center gap-3">
                <Thermometer className="w-6 h-6 text-sky-600 flex-shrink-0" />
                <div>
                  <span className="text-[10px] font-semibold text-slate-500 block">
                    OneWire T2 (Trubka 2)
                  </span>
                  <span className="text-lg font-bold font-mono text-sky-800">
                    {deviceStatus.oneWireTemp2?.toFixed(1) ?? '--.-'} °C
                  </span>
                </div>
              </div>
              
              {/* AM2320 Temp & Hum (I2C) */}
              <div className="bg-emerald-50/50 border border-emerald-200/70 p-3 rounded-xl flex items-center gap-3 col-span-2 sm:col-span-1">
                <div className="flex-shrink-0 flex items-center justify-center w-8 h-8 rounded-full bg-emerald-100 text-emerald-600">
                  <Thermometer className="w-4 h-4" />
                </div>
                <div className="flex-1 flex justify-between">
                  <div>
                    <span className="text-[10px] font-semibold text-emerald-600/80 block uppercase tracking-wider">Vzduch (AM2320)</span>
                    <span className="text-base font-bold font-mono text-emerald-800">
                      {deviceStatus.am2320Temp?.toFixed(1) ?? '--.-'} °C
                    </span>
                  </div>
                  <div className="text-right">
                    <span className="text-[10px] font-semibold text-emerald-600/80 block uppercase tracking-wider">Vlhkost</span>
                    <span className="text-base font-bold font-mono text-emerald-800">
                      {deviceStatus.am2320Hum?.toFixed(1) ?? '--.-'} %
                    </span>
                  </div>
                </div>
              </div>

              {/* LDR (Light) */}
              <div className="bg-amber-50/50 border border-amber-200/70 p-3 rounded-xl flex items-center gap-3 col-span-2 sm:col-span-1">
                <div className="flex-shrink-0 flex items-center justify-center w-8 h-8 rounded-full bg-amber-100 text-amber-600">
                  <Zap className="w-4 h-4" />
                </div>
                <div>
                  <span className="text-[10px] font-semibold text-amber-600/80 block uppercase tracking-wider">Osvětlení (LDR)</span>
                  <span className="text-base font-bold font-mono text-amber-800">
                    {deviceStatus.ldr ?? '---'} <span className="text-[10px]">RAW</span>
                  </span>
                </div>
              </div>

              {/* Inputs (Buttons) */}
              {[1, 2, 3, 4].map((inNum) => {
                const isActive = deviceStatus[`input${inNum}Active` as keyof ESP32DeviceStatus];
                return (
                  <div key={inNum} className="bg-slate-50 border border-slate-200 p-3 rounded-xl flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Eye className="w-5 h-5 text-slate-500" />
                      <div>
                        <span className="text-[10px] font-semibold text-slate-500 block">Vstup {inNum} (PIR/BTN)</span>
                        <span className="text-xs font-bold text-slate-700">IN {inNum}</span>
                      </div>
                    </div>
                    <span
                      className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                        isActive
                          ? 'bg-amber-100 text-amber-700 border border-amber-300 animate-pulse'
                          : 'bg-slate-200 text-slate-600'
                      }`}
                    >
                      {isActive ? 'AKTIVNÍ' : 'Klid'}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        </>
      )}

      {/* MQTT & SERVERLESS COMM SECTION */}
      {showMqtt && (
        <>
          {/* How to run on Phone without a server */}
          <div className="bg-sky-900 text-white rounded-2xl p-4 shadow-md space-y-2.5">
            <div className="flex items-center gap-2 text-sky-200 font-semibold text-xs uppercase tracking-wider">
              <Radio className="w-4 h-4 text-sky-300" />
              <span>Jak vyřešit dálkové ovládání z Androidu bez serveru?</span>
            </div>
            <p className="text-xs text-sky-100/90 leading-relaxed">
              Uživatel se ptal: <em>„Lze použít optimalizovanou stránku HTML nebo podobné řešení?“</em>
            </p>
            <div className="space-y-2 text-xs text-sky-200/95">
              <div className="p-2.5 rounded-xl bg-white/10 border border-white/15">
                <strong className="text-white block mb-0.5">Možnost A: ESP32 jako WebServer (LittleFS)</strong>
                Tuto optimalizovanou HTML stránku (Vite build) stačí nahrát přímo do paměti Flash ESP32-S3 (LittleFS / SPIFFS). V telefonu stačí v Chromu otevřít IP adresu ESP32 (např. <code className="bg-black/30 px-1 py-0.5 rounded text-sky-100">http://192.168.1.145</code>) a kliknout na <strong>„Přidat na plochu“</strong>. Bude se chovat přesně jako aplikace eWeLink bez nutnosti cloudu!
              </div>

              <div className="p-2.5 rounded-xl bg-white/10 border border-white/15">
                <strong className="text-white block mb-0.5">Možnost B: MQTT přes WebSockets (WSS/WS)</strong>
                V domácí síti může na routeru nebo Raspberry Pi běžet broker Mosquitto s povoleným WebSocket portem (standardně 9001). Webová stránka v telefonu komunikuje obousměrně a bleskově přímo s ESP32.
              </div>
            </div>
          </div>

          {/* MQTT Topics Reference */}
          <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-xs space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Terminal className="w-4 h-4 text-slate-700" />
                <h3 className="font-bold text-slate-800 text-xs sm:text-sm">
                  Doporučená struktura MQTT topiců pro firmware
                </h3>
              </div>
            </div>

            <div className="space-y-2 text-xs font-mono">
              <div className="p-2 bg-slate-50 rounded-lg border border-slate-200 flex items-center justify-between">
                <div>
                  <span className="text-slate-400 block text-[10px] font-sans">Ovládání relé (Command):</span>
                  <span className="text-sky-700 font-bold">cmnd/esp32s3/relay_1</span>
                  <span className="text-slate-500 font-sans ml-2 text-[11px]">(Payload: ON / OFF / TOGGLE)</span>
                </div>
                <button
                  onClick={() => handleCopy('cmnd/esp32s3/relay_1', 'top1')}
                  className="p-1 text-slate-400 hover:text-slate-700"
                >
                  {copiedTopic === 'top1' ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                </button>
              </div>

              <div className="p-2 bg-slate-50 rounded-lg border border-slate-200 flex items-center justify-between">
                <div>
                  <span className="text-slate-400 block text-[10px] font-sans">Zpětná vazba stavu (Status):</span>
                  <span className="text-emerald-700 font-bold">stat/esp32s3/relay_1</span>
                  <span className="text-slate-500 font-sans ml-2 text-[11px]">(Payload: ON / OFF / DELAY_RUNNING)</span>
                </div>
                <button
                  onClick={() => handleCopy('stat/esp32s3/relay_1', 'top2')}
                  className="p-1 text-slate-400 hover:text-slate-700"
                >
                  {copiedTopic === 'top2' ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                </button>
              </div>

              <div className="p-2 bg-slate-50 rounded-lg border border-slate-200 flex items-center justify-between">
                <div>
                  <span className="text-slate-400 block text-[10px] font-sans">Telemetrie senzorů (Telemetry):</span>
                  <span className="text-amber-700 font-bold">tele/esp32s3/state</span>
                  <span className="text-slate-500 font-sans ml-2 text-[11px]">(JSON s OneWire a PIR daty)</span>
                </div>
                <button
                  onClick={() => handleCopy('tele/esp32s3/state', 'top3')}
                  className="p-1 text-slate-400 hover:text-slate-700"
                >
                  {copiedTopic === 'top3' ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                </button>
              </div>
            </div>

            {/* Sample Payload */}
            <div>
              <span className="block text-[11px] font-semibold text-slate-600 mb-1">
                Ukázka stavového JSON paketu z ESP32:
              </span>
              <pre className="p-2.5 bg-slate-900 text-emerald-400 rounded-xl text-[11px] font-mono overflow-x-auto max-h-48 leading-tight">
                {sampleMqttJson}
              </pre>
            </div>
          </div>
        </>
      )}
    </div>
  );
};
