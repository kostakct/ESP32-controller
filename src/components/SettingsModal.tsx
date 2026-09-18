import React, { useState } from 'react';
import {
  X,
  Clock,
  RotateCcw,
  SlidersHorizontal,
  ChevronUp,
  ChevronDown,
  Eye,
  EyeOff,
  Bell,
  ShieldCheck,
  Zap,
  Info,
  Layers,
  ShieldAlert,
  WifiOff,
} from 'lucide-react';
import { SwitchItem, PowerOnState } from '../types';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  switches: SwitchItem[];
  onUpdateSwitch: (id: string, updates: Partial<SwitchItem>) => void;
  onMoveOrder: (id: string, direction: 'up' | 'down') => void;
  onRequestNotificationPermission: () => Promise<void>;
  notificationPermission: NotificationPermission;
  activeSwitchId?: string | null;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  onClose,
  switches,
  onUpdateSwitch,
  onMoveOrder,
  onRequestNotificationPermission,
  notificationPermission,
  activeSwitchId,
}) => {
  const [selectedId, setSelectedId] = useState<string>(() => {
    return activeSwitchId || (switches[0]?.id ?? '');
  });

  // Re-sync při otevření na konkrétní spínač
  React.useEffect(() => {
    if (activeSwitchId) {
      setSelectedId(activeSwitchId);
    } else if (!selectedId && switches.length > 0) {
      setSelectedId(switches[0].id);
    }
  }, [activeSwitchId, switches]);

  if (!isOpen) return null;

  const currentSwitch = switches.find((s) => s.id === selectedId) || switches[0];
  if (!currentSwitch) return null;

  const currentIndex = switches.findIndex((s) => s.id === currentSwitch.id);
  const isFirst = currentIndex === 0;
  const isLast = currentIndex === switches.length - 1;

  // Přepočet sekund na minuty a sekundy pro formulář
  const curDuration = currentSwitch.delayConfig.durationSeconds;
  const curMinutes = Math.floor(curDuration / 60);
  const curSeconds = curDuration % 60;

  const handleDurationChange = (newMin: number, newSec: number) => {
    const total = Math.max(1, newMin * 60 + newSec);
    onUpdateSwitch(currentSwitch.id, {
      delayConfig: {
        ...currentSwitch.delayConfig,
        durationSeconds: total,
      },
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-3 sm:p-4 overflow-y-auto">
      <div
        className="w-full max-w-lg bg-white rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh] animate-in fade-in zoom-in-95 duration-150"
        role="dialog"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-200 bg-slate-50/80">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-sky-600 text-white flex items-center justify-center shadow-xs">
              <SlidersHorizontal className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-bold text-slate-800 text-base">Nastavení parametrů</h3>
              <p className="text-xs text-slate-500">Konfigurace zpoždění, paměti a chování relé</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-full text-slate-400 hover:text-slate-700 hover:bg-slate-200 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Channels Selector Tabs */}
        <div className="flex border-b border-slate-200 bg-slate-100/60 p-1.5 gap-1.5 overflow-x-auto">
          {switches.map((s) => (
            <button
              key={s.id}
              onClick={() => setSelectedId(s.id)}
              className={`flex-1 min-w-[75px] py-2 px-2.5 rounded-xl text-xs font-semibold transition-all text-center flex flex-col items-center gap-0.5 ${
                s.id === currentSwitch.id
                  ? 'bg-white text-sky-700 shadow-xs border border-slate-200/80'
                  : 'text-slate-500 hover:text-slate-800 hover:bg-white/50'
              }`}
            >
              <span className="text-[10px] uppercase font-bold text-slate-400">CH {s.channelIndex}</span>
              <span className="truncate max-w-[85px]">{s.name}</span>
            </button>
          ))}
        </div>

        {/* Body Settings Form */}
        <div className="p-5 space-y-5 overflow-y-auto text-xs sm:text-sm">
          {/* Sekce 1: Název spínače */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-700 uppercase tracking-wide">
              1. Název relé v aplikaci
            </label>
            <input
              type="text"
              value={currentSwitch.name}
              onChange={(e) => onUpdateSwitch(currentSwitch.id, { name: e.target.value })}
              className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-slate-800 font-medium focus:ring-2 focus:ring-sky-500 focus:outline-hidden transition"
              placeholder="např. Čerpadlo TUV"
            />
          </div>

          {/* Sekce 2: Pořadí a viditelnost */}
          <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-200 flex items-center justify-between">
            <div>
              <span className="font-bold text-slate-800 block text-xs uppercase tracking-wide">
                2. Pořadí & Zobrazení
              </span>
              <span className="text-xs text-slate-500">Změna pozice nebo skrytí na ploše</span>
            </div>

            <div className="flex items-center gap-1.5">
              <button
                disabled={isFirst}
                onClick={() => onMoveOrder(currentSwitch.id, 'up')}
                className="p-2 rounded-xl bg-white border border-slate-300 hover:bg-slate-100 disabled:opacity-30 transition"
                title="Posunout nahoru"
              >
                <ChevronUp className="w-4 h-4 text-slate-600" />
              </button>
              <button
                disabled={isLast}
                onClick={() => onMoveOrder(currentSwitch.id, 'down')}
                className="p-2 rounded-xl bg-white border border-slate-300 hover:bg-slate-100 disabled:opacity-30 transition"
                title="Posunout dolů"
              >
                <ChevronDown className="w-4 h-4 text-slate-600" />
              </button>
              <button
                onClick={() => onUpdateSwitch(currentSwitch.id, { isVisible: !currentSwitch.isVisible })}
                className={`p-2 rounded-xl border transition ${
                  currentSwitch.isVisible
                    ? 'bg-sky-50 border-sky-300 text-sky-700'
                    : 'bg-slate-200 border-slate-300 text-slate-500'
                }`}
                title={currentSwitch.isVisible ? 'Relé je viditelné' : 'Relé je skryté'}
              >
                {currentSwitch.isVisible ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {/* Sekce 3: Stav po zapnutí napájení (Power-On State) */}
          <div className="space-y-2">
            <div className="flex items-center gap-1.5">
              <Zap className="w-4 h-4 text-amber-500" />
              <label className="text-xs font-bold text-slate-700 uppercase tracking-wide">
                3. Stav po výpadku proudu (Power-On State)
              </label>
            </div>
            <p className="text-xs text-slate-500">
              Co má ESP32 nastavit na tomto relé po obnovení napájení 230V:
            </p>

            <div className="grid grid-cols-3 gap-2 pt-1">
              {(['OFF', 'ON', 'RESTORE'] as PowerOnState[]).map((state) => (
                <button
                  key={state}
                  type="button"
                  onClick={() => onUpdateSwitch(currentSwitch.id, { powerOnState: state })}
                  className={`py-2 px-3 rounded-xl border text-xs font-bold transition text-center ${
                    currentSwitch.powerOnState === state
                      ? 'bg-sky-600 text-white border-sky-600 shadow-xs'
                      : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                  }`}
                >
                  {state === 'OFF' ? 'Vždy OFF' : state === 'ON' ? 'Vždy ON' : 'Pamatovat'}
                </button>
              ))}
            </div>
          </div>

          {/* Sekce 4: Časová ochrana maximálního běhu (Guard) */}
          <div className="bg-amber-50/70 border border-amber-200 p-4 rounded-2xl space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <ShieldAlert className="w-5 h-5 text-amber-600" />
                <div>
                  <h4 className="font-bold text-slate-800 text-xs sm:text-sm">
                    4. Ochrana maximálního času chodu
                  </h4>
                  <p className="text-[11px] text-slate-600">
                    Autonomní limit v ESP pro zamezení nekonečného sepnutí při havárii
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => {
                  const currentGuard = currentSwitch.maxRuntimeGuardMinutes || 0;
                  onUpdateSwitch(currentSwitch.id, {
                    maxRuntimeGuardMinutes: currentGuard > 0 ? 0 : 60,
                  });
                }}
                className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-hidden ${
                  (currentSwitch.maxRuntimeGuardMinutes || 0) > 0 ? 'bg-amber-600' : 'bg-slate-300'
                }`}
              >
                <span
                  className={`inline-block h-5 w-5 transform rounded-full bg-white shadow-md ring-0 transition duration-200 ease-in-out ${
                    (currentSwitch.maxRuntimeGuardMinutes || 0) > 0 ? 'translate-x-5' : 'translate-x-0'
                  }`}
                />
              </button>
            </div>

            {(currentSwitch.maxRuntimeGuardMinutes || 0) > 0 ? (
              <div className="pt-2 border-t border-amber-200/80 space-y-3">
                <div className="flex items-center justify-between text-xs font-semibold text-slate-700">
                  <span>Maximální povolený limit sepnutí:</span>
                  <span className="font-mono text-sm font-bold text-amber-800 bg-amber-100 px-2 py-0.5 rounded-lg border border-amber-300">
                    {Math.floor((currentSwitch.maxRuntimeGuardMinutes || 60) / 60)}h{' '}
                    {(currentSwitch.maxRuntimeGuardMinutes || 60) % 60}m (
                    {currentSwitch.maxRuntimeGuardMinutes} minut)
                  </span>
                </div>

                <div className="flex items-center gap-3">
                  <input
                    type="range"
                    min="1"
                    max="1440"
                    step="5"
                    value={currentSwitch.maxRuntimeGuardMinutes || 60}
                    onChange={(e) =>
                      onUpdateSwitch(currentSwitch.id, {
                        maxRuntimeGuardMinutes: parseInt(e.target.value, 10),
                      })
                    }
                    className="flex-1 accent-amber-600 cursor-pointer"
                  />
                  <input
                    type="number"
                    min="1"
                    max="1440"
                    value={currentSwitch.maxRuntimeGuardMinutes || 60}
                    onChange={(e) => {
                      const val = Math.max(1, Math.min(1440, parseInt(e.target.value || '1', 10)));
                      onUpdateSwitch(currentSwitch.id, { maxRuntimeGuardMinutes: val });
                    }}
                    className="w-20 px-2.5 py-1.5 bg-white border border-amber-300 rounded-xl text-center font-bold text-xs"
                  />
                </div>
              </div>
            ) : (
              <p className="text-[11px] text-slate-500 italic">
                Ochrana vypnuta: Relé smí běžet trvale bez časového omezení (režim NIKDY).
              </p>
            )}
          </div>

          {/* Sekce 5: Funkce Delay (Inching / prodlužované sepnutí) */}
          <div className="bg-sky-50/60 border border-sky-200 p-4 rounded-2xl space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Clock className="w-5 h-5 text-sky-600" />
                <div>
                  <h4 className="font-bold text-slate-800 text-xs sm:text-sm">
                    5. Funkce Delay (Inching časovač)
                  </h4>
                  <p className="text-[11px] text-slate-500">
                    Automatické vypnutí po uplynutí nastaveného intervalu
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() =>
                  onUpdateSwitch(currentSwitch.id, {
                    delayConfig: {
                      ...currentSwitch.delayConfig,
                      enabled: !currentSwitch.delayConfig.enabled,
                    },
                  })
                }
                className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-hidden ${
                  currentSwitch.delayConfig.enabled ? 'bg-sky-600' : 'bg-slate-300'
                }`}
              >
                <span
                  className={`inline-block h-5 w-5 transform rounded-full bg-white shadow-md ring-0 transition duration-200 ease-in-out ${
                    currentSwitch.delayConfig.enabled ? 'translate-x-5' : 'translate-x-0'
                  }`}
                />
              </button>
            </div>

            {currentSwitch.delayConfig.enabled && (
              <div className="pt-2 border-t border-sky-200/60 space-y-4">
                {/* Minuty a sekundy */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-[11px] font-bold text-slate-600 block mb-1">
                      Minuty (0 až 720 min)
                    </label>
                    <input
                      type="number"
                      min="0"
                      max="720"
                      value={curMinutes}
                      onChange={(e) =>
                        handleDurationChange(parseInt(e.target.value) || 0, curSeconds)
                      }
                      className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl font-mono font-bold text-slate-800 text-center"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] font-bold text-slate-600 block mb-1">
                      Sekundy (0 až 59 s)
                    </label>
                    <input
                      type="number"
                      min="0"
                      max="59"
                      value={curSeconds}
                      onChange={(e) =>
                        handleDurationChange(curMinutes, parseInt(e.target.value) || 0)
                      }
                      className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl font-mono font-bold text-slate-800 text-center"
                    />
                  </div>
                </div>

                {/* Maximální násobky (opakování) */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-[11px] font-bold text-slate-600">
                      Limit vícenásobného kliknutí (MAX opakování)
                    </label>
                    <span className="text-xs font-bold text-sky-700 font-mono">
                      {currentSwitch.delayConfig.maxRepeats === 0
                        ? 'Bez limitu (∞)'
                        : `${currentSwitch.delayConfig.maxRepeats}×`}
                    </span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="10"
                    value={currentSwitch.delayConfig.maxRepeats}
                    onChange={(e) =>
                      onUpdateSwitch(currentSwitch.id, {
                        delayConfig: {
                          ...currentSwitch.delayConfig,
                          maxRepeats: parseInt(e.target.value, 10),
                        },
                      })
                    }
                    className="w-full accent-sky-600 cursor-pointer"
                  />
                  <div className="flex justify-between text-[10px] text-slate-400 mt-0.5 font-mono">
                    <span>0 (Bez limitu)</span>
                    <span>5×</span>
                    <span>10×</span>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Sekce 6: Notifikace v prohlížeči */}
          <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-200 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Bell className="w-4 h-4 text-purple-600" />
              <div>
                <span className="font-bold text-slate-800 block text-xs uppercase tracking-wide">
                  6. Oznámení při dokončení
                </span>
                <span className="text-xs text-slate-500">
                  Stav oprávnění:{' '}
                  <strong className="text-slate-700">{notificationPermission}</strong>
                </span>
              </div>
            </div>

            {notificationPermission !== 'granted' ? (
              <button
                onClick={onRequestNotificationPermission}
                className="px-3 py-1.5 bg-purple-600 hover:bg-purple-700 text-white font-bold rounded-xl text-xs transition"
              >
                Povolit
              </button>
            ) : (
              <span className="text-xs font-bold text-emerald-600 flex items-center gap-1">
                <ShieldCheck className="w-4 h-4" /> Aktivní
              </span>
            )}
          </div>

          {/* Sekce 7: Notifikace offline stavu */}
          <div className="bg-rose-50/50 p-3.5 rounded-2xl border border-red-200 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <WifiOff className="w-4 h-4 text-red-600" />
              <div>
                <span className="font-bold text-slate-800 block text-xs uppercase tracking-wide">
                  7. Notifikace offline stavu
                </span>
                <span className="text-xs text-slate-500">
                  Červená linka obrysu a podbarvení při ztrátě spojení
                </span>
              </div>
            </div>

            <button
              type="button"
              onClick={() =>
                onUpdateSwitch(currentSwitch.id, {
                  offlineAlertEnabled: !(currentSwitch.offlineAlertEnabled ?? true),
                })
              }
              className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-hidden ${
                (currentSwitch.offlineAlertEnabled ?? true) ? 'bg-red-600' : 'bg-slate-300'
              }`}
            >
              <span
                className={`inline-block h-5 w-5 transform rounded-full bg-white shadow-md ring-0 transition duration-200 ease-in-out ${
                  (currentSwitch.offlineAlertEnabled ?? true) ? 'translate-x-5' : 'translate-x-0'
                }`}
              />
            </button>
          </div>
        </div>

        {/* Footer */}
        <div className="px-5 py-3 border-t border-slate-200 bg-slate-50 flex justify-end">
          <button
            onClick={onClose}
            className="px-5 py-2 bg-sky-600 hover:bg-sky-700 text-white text-xs font-bold rounded-xl transition shadow-xs active:scale-95"
          >
            Uložit a zavřít
          </button>
        </div>
      </div>
    </div>
  );
};
