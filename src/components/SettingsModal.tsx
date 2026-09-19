import React, { useState } from 'react';
import {
  X,
  ArrowUp,
  ArrowDown,
  Eye,
  EyeOff,
  Timer,
  Bell,
  Zap,
  Check,
  ChevronDown,
  ChevronUp,
  Plus,
  Minus,
  RotateCcw,
  Sliders,
  Sparkles,
  Shield,
  ShieldAlert,
  WifiOff,
} from 'lucide-react';
import { SwitchItem, PowerOnState, NotificationMode } from '../types';
import { formatDuration } from '../utils/formatters';
import { HoldRepeatButton } from './HoldRepeatButton';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  switches: SwitchItem[];
  onUpdateSwitch: (updated: SwitchItem) => void;
  onMoveOrder: (id: string, direction: 'up' | 'down') => void;
  onRequestNotificationPermission: () => Promise<boolean>;
  notificationPermission: NotificationPermission | 'unsupported';
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
  const [expandedId, setExpandedId] = useState<string | null>(
    activeSwitchId || switches[0]?.id || null
  );

  // Update expandedId if activeSwitchId changes and auto-scroll to it
  React.useEffect(() => {
    if (activeSwitchId) {
      setExpandedId(activeSwitchId);
      // Malé zpoždění pro vykreslení DOM
      setTimeout(() => {
        const el = document.getElementById(`settings-item-${activeSwitchId}`);
        if (el) {
          el.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
      }, 100);
    }
  }, [activeSwitchId, isOpen]);

  if (!isOpen) return null;

  // Sort switches by order for display
  const sortedSwitches = [...switches].sort((a, b) => a.order - b.order);

  const setExactTime = (item: SwitchItem, totalSeconds: number) => {
    onUpdateSwitch({
      ...item,
      delayConfig: {
        ...item.delayConfig,
        durationSeconds: Math.max(0.5, Math.round(totalSeconds * 2) / 2),
      },
    });
  };

  const adjustMinutes = (item: SwitchItem, deltaMins: number) => {
    const currentSec = item.delayConfig.durationSeconds;
    const mins = Math.floor(currentSec / 60);
    const secs = currentSec % 60;
    const newMins = Math.max(0, mins + deltaMins);
    const total = Math.max(0.5, Math.min(3600, newMins * 60 + secs));
    setExactTime(item, total);
  };

  const adjustSeconds = (item: SwitchItem, deltaSecs: number) => {
    const currentSec = item.delayConfig.durationSeconds;
    const total = Math.max(0.5, Math.min(3600, Math.round((currentSec + deltaSecs) * 2) / 2));
    setExactTime(item, total);
  };

  const adjustGuardMinutes = (item: SwitchItem, deltaMins: number) => {
    const currentMins = item.maxRuntimeGuardMinutes || 60;
    const nextMins = Math.max(1, Math.min(1440, currentMins + deltaMins));
    onUpdateSwitch({
      ...item,
      maxRuntimeGuardMinutes: nextMins,
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-slate-900/60 backdrop-blur-xs p-0 sm:p-4 overflow-y-auto">
      <div
        className="w-full max-w-lg bg-white rounded-t-3xl sm:rounded-2xl shadow-2xl flex flex-col max-h-[92vh] sm:max-h-[85vh] overflow-hidden animate-in fade-in slide-in-from-bottom-6 duration-200"
        role="dialog"
        aria-modal="true"
      >
        {/* Modal Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-200 bg-slate-50/80 sticky top-0 z-10">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-sky-100 text-sky-700 flex items-center justify-center">
              <Sliders className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-800">Správa a nastavení spínačů</h2>
              <p className="text-xs text-slate-500">Konfigurace parametrů pro ESP32-S3 relé</p>
            </div>
          </div>
          <button
            id="btn-close-settings-modal"
            onClick={onClose}
            className="p-1.5 rounded-full hover:bg-slate-200 text-slate-500 hover:text-slate-800 transition"
            aria-label="Zavřít"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body - Scrollable */}
        <div className="p-4 sm:p-5 overflow-y-auto space-y-4 divide-y divide-slate-100 flex-1">
          {/* Notification permission banner if not granted */}
          {notificationPermission !== 'granted' && (
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 flex items-center justify-between text-xs text-amber-800">
              <div className="flex items-center gap-2">
                <Bell className="w-4 h-4 text-amber-600 flex-shrink-0" />
                <span>Povolte oznámení v prohlížeči pro příjem zpráv o změně stavu relé.</span>
              </div>
              <button
                id="btn-request-notification-perm"
                onClick={onRequestNotificationPermission}
                className="bg-amber-600 hover:bg-amber-700 text-white font-medium px-2.5 py-1 rounded-md text-[11px] whitespace-nowrap ml-2"
              >
                Povolit
              </button>
            </div>
          )}

          {/* List of switches with Bulk Visibility Controls Bar */}
          <div className="space-y-3 pt-1">
            {/* Quick Visibility Toolbar */}
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-2.5 flex items-center justify-between gap-2 flex-wrap">
              <div className="flex items-center gap-2">
                <Eye className="w-4 h-4 text-sky-600" />
                <span className="text-xs font-semibold text-slate-700">
                  Zobrazeno: <strong className="text-sky-700">{switches.filter(s => s.visible).length}</strong> z {switches.length} kanálů
                </span>
              </div>
              <div className="flex items-center gap-1.5">
                <button
                  id="btn-settings-show-all-channels"
                  type="button"
                  onClick={() => {
                    switches.forEach(s => {
                      if (!s.visible) onUpdateSwitch({ ...s, visible: true });
                    });
                  }}
                  className="px-2.5 py-1 text-[11px] font-semibold bg-sky-600 hover:bg-sky-700 text-white rounded-lg transition active:scale-95 shadow-xs"
                  title="Zobrazit všechny kanály na základní ploše"
                >
                  Zobrazit všech 8
                </button>
                <button
                  id="btn-settings-hide-all-channels"
                  type="button"
                  onClick={() => {
                    switches.forEach(s => {
                      if (s.visible) onUpdateSwitch({ ...s, visible: false });
                    });
                  }}
                  className="px-2.5 py-1 text-[11px] font-semibold bg-white hover:bg-slate-100 text-slate-600 border border-slate-300 rounded-lg transition active:scale-95"
                  title="Skrýt všechny kanály ze základní plochy"
                >
                  Skrýt vše
                </button>
              </div>
            </div>

            {sortedSwitches.map((item, index) => {
              const isExpanded = expandedId === item.id;
              const mins = Math.floor(item.delayConfig.durationSeconds / 60);
              const secs = item.delayConfig.durationSeconds % 60;

              return (
                <div
                  key={item.id}
                  id={`settings-item-${item.id}`}
                  className={`rounded-2xl border-2 transition-all duration-200 ${
                    isExpanded
                      ? 'border-sky-500 bg-sky-50/90 shadow-md ring-2 ring-sky-400/30'
                      : 'border-slate-200 bg-white hover:border-slate-300 shadow-xs'
                  }`}
                >
                  {/* Collapsible Switch Header Row */}
                  <div
                    className={`p-3.5 flex items-center justify-between gap-2 cursor-pointer select-none transition-colors ${
                      isExpanded ? 'bg-sky-100/50 rounded-t-2xl' : ''
                    }`}
                    onClick={() => setExpandedId(isExpanded ? null : item.id)}
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      {/* Channel badge */}
                      <span className={`text-[11px] font-bold px-2 py-0.5 rounded border flex-shrink-0 ${
                        isExpanded
                          ? 'bg-sky-600 text-white border-sky-600 shadow-xs'
                          : 'bg-slate-100 text-slate-700 border-slate-300'
                      }`}>
                        OUT {item.channelIndex}
                      </span>
                      <div className="truncate">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-semibold text-slate-800 truncate block">
                            {item.name}
                          </span>
                          {isExpanded && (
                            <span className="text-[10px] font-bold px-2 py-0.2 rounded-full bg-sky-600 text-white shadow-xs">
                              Aktivní
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-2 text-[11px] text-slate-500">
                          <span>Pořadí: #{item.order}</span>
                          <span>•</span>
                          <span className={item.visible ? 'text-emerald-600 font-medium' : 'text-slate-400'}>
                            {item.visible ? 'Viditelný' : 'Skrytý'}
                          </span>
                          {item.delayConfig.enabled && (
                            <>
                              <span>•</span>
                              <span className="text-sky-700 font-semibold">
                                Delay {formatDuration(item.delayConfig.durationSeconds)} ({item.delayConfig.maxRepeats}x)
                              </span>
                            </>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5 flex-shrink-0" onClick={(e) => e.stopPropagation()}>
                      {/* Reorder Up */}
                      <button
                        id={`btn-move-up-${item.id}`}
                        disabled={index === 0}
                        onClick={() => onMoveOrder(item.id, 'up')}
                        title="Posunout nahoru v pořadí"
                        className={`p-1.5 rounded hover:bg-slate-100 text-slate-600 transition ${
                          index === 0 ? 'opacity-30 cursor-not-allowed' : 'active:scale-95'
                        }`}
                      >
                        <ArrowUp className="w-4 h-4" />
                      </button>

                      {/* Reorder Down */}
                      <button
                        id={`btn-move-down-${item.id}`}
                        disabled={index === sortedSwitches.length - 1}
                        onClick={() => onMoveOrder(item.id, 'down')}
                        title="Posunout dolů v pořadí"
                        className={`p-1.5 rounded hover:bg-slate-100 text-slate-600 transition ${
                          index === sortedSwitches.length - 1
                            ? 'opacity-30 cursor-not-allowed'
                            : 'active:scale-95'
                        }`}
                      >
                        <ArrowDown className="w-4 h-4" />
                      </button>

                      {/* Visibility Quick Toggle */}
                      <button
                        id={`btn-toggle-vis-${item.id}`}
                        onClick={() => onUpdateSwitch({ ...item, visible: !item.visible })}
                        title={item.visible ? 'Skrýt z displeje' : 'Zobrazit na displeji'}
                        className={`p-1.5 rounded transition ${
                          item.visible
                            ? 'text-sky-600 hover:bg-sky-50'
                            : 'text-slate-400 hover:bg-slate-100'
                        }`}
                      >
                        {item.visible ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                      </button>

                      <div className="text-slate-400 pl-1">
                        {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                      </div>
                    </div>
                  </div>

                  {/* Expanded Settings Content */}
                  {isExpanded && (
                    <div className="px-4 pb-4 pt-3 border-t border-sky-200/80 space-y-4 text-xs bg-sky-50/90 rounded-b-2xl">
                      {/* 1) NÁZEV SPÍNAČE */}
                      <div>
                        <label className="block font-semibold text-slate-700 mb-1">
                          1) Název spínače
                        </label>
                        <input
                          id={`input-name-${item.id}`}
                          type="text"
                          value={item.name}
                          onChange={(e) => onUpdateSwitch({ ...item, name: e.target.value })}
                          placeholder="Např. Světlo obývák, Čerpadlo..."
                          className="w-full px-3 py-2 bg-white rounded-lg border border-slate-300 text-slate-800 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-transparent transition"
                        />
                      </div>

                      {/* 2) POŘADÍ ZOBRAZENÍ A VIDITELNOST */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div>
                          <label className="block font-semibold text-slate-700 mb-1">
                            2) Pořadí zobrazení
                          </label>
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-bold text-slate-800 bg-white border border-slate-200 px-3 py-1.5 rounded-lg">
                              Pozice: #{item.order}
                            </span>
                            <button
                              onClick={() => onMoveOrder(item.id, 'up')}
                              disabled={index === 0}
                              className="px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-slate-700 hover:bg-slate-100 disabled:opacity-40"
                            >
                              Nahoru
                            </button>
                            <button
                              onClick={() => onMoveOrder(item.id, 'down')}
                              disabled={index === sortedSwitches.length - 1}
                              className="px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-slate-700 hover:bg-slate-100 disabled:opacity-40"
                            >
                              Dolů
                            </button>
                          </div>
                        </div>

                        {/* 4) VIDITELNOST ČI SKRYTÍ */}
                        <div>
                          <label className="block font-semibold text-slate-700 mb-1">
                            4) Viditelnost na hlavní obrazovce
                          </label>
                          <button
                            id={`btn-vis-select-${item.id}`}
                            onClick={() => onUpdateSwitch({ ...item, visible: !item.visible })}
                            className={`w-full py-1.5 px-3 rounded-lg border font-medium flex items-center justify-center gap-2 transition ${
                              item.visible
                                ? 'bg-emerald-50 border-emerald-300 text-emerald-700'
                                : 'bg-slate-100 border-slate-300 text-slate-600'
                            }`}
                          >
                            {item.visible ? (
                              <>
                                <Eye className="w-3.5 h-3.5" />
                                <span>Zobrazeno na displeji</span>
                              </>
                            ) : (
                              <>
                                <EyeOff className="w-3.5 h-3.5" />
                                <span>Skryto (neaktivní na ploše)</span>
                              </>
                            )}
                          </button>
                        </div>
                      </div>

                      {/* 3) STAV PO ZAPNUTÍ ESP */}
                      <div>
                        <label className="block font-semibold text-slate-700 mb-1">
                          3) Stav po zapnutí / restartu ESP32
                        </label>
                        <div className="grid grid-cols-3 gap-2">
                          {(
                            [
                              { value: 'OFF', label: 'Vypnuto (OFF)' },
                              { value: 'ON', label: 'Zapnuto (ON)' },
                              { value: 'KEEP_LAST', label: 'Pamatovat stav' },
                            ] as { value: PowerOnState; label: string }[]
                          ).map((opt) => (
                            <button
                              key={opt.value}
                              id={`poweron-${item.id}-${opt.value}`}
                              onClick={() => onUpdateSwitch({ ...item, powerOnState: opt.value })}
                              className={`py-2 px-2 rounded-lg text-[11px] font-medium border text-center transition ${
                                item.powerOnState === opt.value
                                  ? 'bg-sky-600 text-white border-sky-600 shadow-xs'
                                  : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                              }`}
                            >
                              {opt.label}
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* 5) ZAPNUTÍ FUNKCE DELAY NEBO ČASOVÉ OCHRANY (MAX RUNTIME GUARD) */}
                      <div className="p-3 bg-white rounded-xl border border-sky-200/80 space-y-3">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <Timer className="w-4 h-4 text-sky-600" />
                            <div>
                              <span className="font-bold text-slate-800 block text-xs">
                                5) Funkce automatického Delay (Inching)
                              </span>
                              <span className="text-[10px] text-slate-500">
                                Automaticky vypne spínač po uplynutí doby
                              </span>
                            </div>
                          </div>
                          {/* Toggle switch */}
                          <button
                            id={`btn-delay-toggle-${item.id}`}
                            onClick={() =>
                              onUpdateSwitch({
                                ...item,
                                delayConfig: {
                                  ...item.delayConfig,
                                  enabled: !item.delayConfig.enabled,
                                },
                              })
                            }
                            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                              item.delayConfig.enabled ? 'bg-sky-600' : 'bg-slate-300'
                            }`}
                          >
                            <span
                              className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                                item.delayConfig.enabled ? 'translate-x-6' : 'translate-x-1'
                              }`}
                            />
                          </button>
                        </div>

                        {/* When delay is enabled: show mm:ss selector (0.5s step) and max repetitions */}
                        {item.delayConfig.enabled && (
                          <div className="space-y-3 pt-2 border-t border-slate-100 animate-in fade-in duration-150">
                            {/* Time Picker mm:ss with 0.5s increments - Left/Center/Right rapid hold buttons */}
                            <div>
                              <span className="text-slate-700 font-semibold text-xs block mb-2">
                                Nastavení délky zpoždění (držením tlačítek pro rychlý posun):
                              </span>

                              {/* Three-column layout: [Minuty + nad -] [Kompaktní displej MM:SS.s] [Sekundy + nad -] */}
                              <div className="bg-slate-50/90 p-2.5 sm:p-3 rounded-2xl border-2 border-slate-200">
                                <div className="flex items-center justify-center gap-2 sm:gap-3 max-w-sm mx-auto">
                                  {/* LEVÝ SLOUPEC: MINUTY (tlačítka nad sebou) */}
                                  <div className="flex flex-col items-center gap-1 flex-shrink-0">
                                    <span className="text-[10px] font-bold text-slate-600 uppercase tracking-wider">
                                      MIN
                                    </span>
                                    <div className="flex flex-col items-center gap-1">
                                      <HoldRepeatButton
                                        id={`btn-delay-min-plus-${item.id}`}
                                        onAction={() => adjustMinutes(item, +1)}
                                        className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-white hover:bg-slate-100 active:bg-slate-200 text-slate-800 border-2 border-slate-300 flex items-center justify-center font-bold text-sm shadow-xs"
                                        title="Zvýšit minutu (+1m, držením rychle)"
                                        ariaLabel="Zvýšit minuty"
                                      >
                                        <Plus className="w-4 h-4 text-slate-700 stroke-[2.5]" />
                                      </HoldRepeatButton>

                                      <HoldRepeatButton
                                        id={`btn-delay-min-minus-${item.id}`}
                                        onAction={() => adjustMinutes(item, -1)}
                                        className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-white hover:bg-slate-100 active:bg-slate-200 text-slate-800 border-2 border-slate-300 flex items-center justify-center font-bold text-sm shadow-xs"
                                        title="Snížit minutu (-1m, držením rychle)"
                                        ariaLabel="Snížit minuty"
                                      >
                                        <Minus className="w-4 h-4 text-slate-700 stroke-[2.5]" />
                                      </HoldRepeatButton>
                                    </div>
                                  </div>

                                  {/* STŘEDNÍ SLOUPEC: KOMPAKTNÍ DIGITÁLNÍ DISPLEJ MM:SS.s */}
                                  <div className="flex-1 max-w-[150px] flex flex-col items-center justify-center bg-white border-2 border-sky-400 rounded-xl py-2 px-2.5 shadow-xs">
                                    <span className="text-[9px] font-bold text-sky-700 uppercase tracking-wider text-center">
                                      Čas zpoždění
                                    </span>
                                    <div className="font-mono text-xl sm:text-2xl font-extrabold text-sky-950 tracking-tight flex items-baseline justify-center my-0.5">
                                      <span>{String(Math.floor(item.delayConfig.durationSeconds / 60)).padStart(2, '0')}</span>
                                      <span className="text-sky-500 mx-0.5 animate-pulse">:</span>
                                      <span>{(item.delayConfig.durationSeconds % 60).toFixed(1).padStart(4, '0')}</span>
                                    </div>
                                    <span className="text-[9px] text-slate-500 font-medium">
                                      držet pro zrychlení
                                    </span>
                                  </div>

                                  {/* PRAVÝ SLOUPEC: SEKUNDY po 0.5s (tlačítka nad sebou) */}
                                  <div className="flex flex-col items-center gap-1 flex-shrink-0">
                                    <span className="text-[10px] font-bold text-sky-700 uppercase tracking-wider">
                                      SEK
                                    </span>
                                    <div className="flex flex-col items-center gap-1">
                                      <HoldRepeatButton
                                        id={`btn-delay-sec-plus-${item.id}`}
                                        onAction={() => adjustSeconds(item, +0.5)}
                                        className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-sky-50 hover:bg-sky-100 active:bg-sky-200 text-sky-900 border-2 border-sky-300 flex items-center justify-center font-bold text-sm shadow-xs"
                                        title="Zvýšit o 0.5s (+0.5s, držením rychle)"
                                        ariaLabel="Zvýšit sekundy"
                                      >
                                        <Plus className="w-4 h-4 text-sky-700 stroke-[2.5]" />
                                      </HoldRepeatButton>

                                      <HoldRepeatButton
                                        id={`btn-delay-sec-minus-${item.id}`}
                                        onAction={() => adjustSeconds(item, -0.5)}
                                        className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-sky-50 hover:bg-sky-100 active:bg-sky-200 text-sky-900 border-2 border-sky-300 flex items-center justify-center font-bold text-sm shadow-xs"
                                        title="Snížit o 0.5s (-0.5s, držením rychle)"
                                        ariaLabel="Snížit sekundy"
                                      >
                                        <Minus className="w-4 h-4 text-sky-700 stroke-[2.5]" />
                                      </HoldRepeatButton>
                                    </div>
                                  </div>
                                </div>

                                {/* Quick presets */}
                                <div className="flex items-center justify-center gap-1.5 mt-2.5 pt-2 border-t border-slate-200 flex-wrap text-[11px]">
                                  <span className="text-slate-500 text-[10px] font-medium mr-0.5">Předvolba:</span>
                                  {[
                                    { label: '0.5s', val: 0.5 },
                                    { label: '2.0s', val: 2.0 },
                                    { label: '5.5s', val: 5.5 },
                                    { label: '15.0s', val: 15.0 },
                                    { label: '30.0s', val: 30.0 },
                                    { label: '1:00', val: 60.0 },
                                    { label: '5:00', val: 300.0 },
                                  ].map((p) => (
                                    <button
                                      key={p.label}
                                      onClick={() => setExactTime(item, p.val)}
                                      className={`px-2 py-0.5 rounded-lg border font-mono transition text-[11px] ${
                                        Math.abs(item.delayConfig.durationSeconds - p.val) < 0.1
                                          ? 'bg-sky-600 text-white border-sky-600 font-bold shadow-xs'
                                          : 'bg-white hover:bg-sky-50 text-slate-700 border-slate-300'
                                      }`}
                                    >
                                      {p.label}
                                    </button>
                                  ))}
                                </div>
                              </div>
                            </div>

                            {/* Max Repetitions (1x / 2x / 3x / 4x / 5x) */}
                            <div>
                              <div className="flex items-center justify-between mb-1.5">
                                <span className="text-slate-700 font-semibold text-[11px]">
                                  Max. povolené opakování / prodloužení:
                                </span>
                                <span className="font-bold text-sky-700 bg-sky-50 px-2 py-0.5 rounded text-xs">
                                  až {item.delayConfig.maxRepeats}x
                                </span>
                              </div>

                              <div className="grid grid-cols-5 gap-1.5">
                                {[1, 2, 3, 4, 5].map((rep) => (
                                  <button
                                    key={rep}
                                    id={`btn-maxrepeat-${item.id}-${rep}`}
                                    onClick={() =>
                                      onUpdateSwitch({
                                        ...item,
                                        delayConfig: {
                                          ...item.delayConfig,
                                          maxRepeats: rep,
                                        },
                                      })
                                    }
                                    className={`py-1.5 rounded-lg font-bold text-xs transition border text-center ${
                                      item.delayConfig.maxRepeats === rep
                                        ? 'bg-sky-600 text-white border-sky-600 shadow-xs'
                                        : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                                    }`}
                                  >
                                    {rep}x
                                  </button>
                                ))}
                              </div>

                              <p className="text-[10px] text-slate-500 mt-1.5 leading-relaxed bg-slate-50 p-2 rounded-lg border border-slate-200/60">
                                💡 <strong>Princip fungování:</strong> Při kliknutí v době běhu delay se
                                prodlužuje čas a rotuje počítadlo u spínače (1x → 2x ... až {item.delayConfig.maxRepeats}x). Po dosažení limitu rotuje zpět na 1x. Při návratu do výchozího stavu nebo při stisku 1.5s se počítadlo zresetuje.
                              </p>
                            </div>
                          </div>
                        )}
                      </div>

                      {/* ČASOVÁ OCHRANA PRO BĚŽNÝ VÝSTUP BEZ DELAY: NIKDY vs 1min až 24h */}
                      {!item.delayConfig.enabled && (
                        <div className="p-3 bg-white rounded-xl border border-slate-200 space-y-2.5">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <Shield className="w-4 h-4 text-emerald-600" />
                              <div>
                                <span className="font-bold text-slate-800 block text-xs">
                                  Bezpečnostní časová ochrana (Auto-Off Guard)
                                </span>
                                <span className="text-[10px] text-slate-500">
                                  Ochrana proti trvalému sepnutí při výpadku spojení
                                </span>
                              </div>
                            </div>

                            {/* Aktivace ochrany: Buď NIKDY nebo aktivní časovač */}
                            <button
                              id={`btn-guard-toggle-${item.id}`}
                              onClick={() => {
                                const isCurrentlyEnabled = (item.maxRuntimeGuardMinutes || 0) > 0;
                                onUpdateSwitch({
                                  ...item,
                                  maxRuntimeGuardMinutes: isCurrentlyEnabled ? 0 : 60, // výchozí 60 minut při zapnutí
                                });
                              }}
                              className={`px-2.5 py-1 rounded-lg text-xs font-bold border transition ${
                                (item.maxRuntimeGuardMinutes || 0) > 0
                                  ? 'bg-emerald-600 text-white border-emerald-600 shadow-xs'
                                  : 'bg-slate-100 text-slate-600 border-slate-300 hover:bg-slate-200'
                              }`}
                            >
                              {(item.maxRuntimeGuardMinutes || 0) > 0 ? 'AKTIVNÍ' : 'NIKDY (Bez limitu)'}
                            </button>
                          </div>

                          {/* Nastavovací pole se objeví JEN v případě když si uživatel zvolí aktivaci časové ochrany */}
                          {(item.maxRuntimeGuardMinutes || 0) > 0 && (
                            <div className="pt-2 border-t border-slate-100 space-y-2 animate-in fade-in duration-150">
                              <div className="flex items-center justify-between text-[11px] text-slate-600">
                                <span>Max. doba sepnutí (1 min až 24 hod):</span>
                                <span className="font-mono font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                                  {Math.floor((item.maxRuntimeGuardMinutes || 60) / 60)}h {(item.maxRuntimeGuardMinutes || 60) % 60}m ({item.maxRuntimeGuardMinutes || 60} min)
                                </span>
                              </div>

                              {/* Digitální časovač s tlačítky MIN a HODIN */}
                              <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-200 flex items-center justify-center gap-3">
                                {/* HODINY */}
                                <div className="flex flex-col items-center gap-1">
                                  <span className="text-[10px] font-bold text-slate-500 uppercase">HOD</span>
                                  <div className="flex gap-1">
                                    <HoldRepeatButton
                                      id={`btn-guard-hr-minus-${item.id}`}
                                      onAction={() => adjustGuardMinutes(item, -60)}
                                      className="w-8 h-8 rounded-lg bg-white border border-slate-300 flex items-center justify-center font-bold text-slate-700"
                                      title="Odebrat 1 hodinu"
                                    >
                                      <Minus className="w-3.5 h-3.5" />
                                    </HoldRepeatButton>
                                    <HoldRepeatButton
                                      id={`btn-guard-hr-plus-${item.id}`}
                                      onAction={() => adjustGuardMinutes(item, +60)}
                                      className="w-8 h-8 rounded-lg bg-white border border-slate-300 flex items-center justify-center font-bold text-slate-700"
                                      title="Přidat 1 hodinu"
                                    >
                                      <Plus className="w-3.5 h-3.5" />
                                    </HoldRepeatButton>
                                  </div>
                                </div>

                                {/* DISPLEJ */}
                                <div className="px-3 py-1.5 bg-white rounded-lg border-2 border-emerald-400 text-center shadow-xs">
                                  <div className="font-mono text-lg font-extrabold text-emerald-900">
                                    {String(Math.floor((item.maxRuntimeGuardMinutes || 60) / 60)).padStart(2, '0')}:
                                    {String((item.maxRuntimeGuardMinutes || 60) % 60).padStart(2, '0')}
                                  </div>
                                  <span className="text-[9px] text-slate-400">hh : mm</span>
                                </div>

                                {/* MINUTY */}
                                <div className="flex flex-col items-center gap-1">
                                  <span className="text-[10px] font-bold text-slate-500 uppercase">MIN</span>
                                  <div className="flex gap-1">
                                    <HoldRepeatButton
                                      id={`btn-guard-min-minus-${item.id}`}
                                      onAction={() => adjustGuardMinutes(item, -1)}
                                      className="w-8 h-8 rounded-lg bg-white border border-slate-300 flex items-center justify-center font-bold text-slate-700"
                                      title="Odebrat 1 minutu"
                                    >
                                      <Minus className="w-3.5 h-3.5" />
                                    </HoldRepeatButton>
                                    <HoldRepeatButton
                                      id={`btn-guard-min-plus-${item.id}`}
                                      onAction={() => adjustGuardMinutes(item, +1)}
                                      className="w-8 h-8 rounded-lg bg-white border border-slate-300 flex items-center justify-center font-bold text-slate-700"
                                      title="Přidat 1 minutu"
                                    >
                                      <Plus className="w-3.5 h-3.5" />
                                    </HoldRepeatButton>
                                  </div>
                                </div>
                              </div>

                              {/* Předvolby */}
                              <div className="flex items-center justify-center gap-1 flex-wrap pt-1">
                                {[
                                  { label: '15m', val: 15 },
                                  { label: '30m', val: 30 },
                                  { label: '1h', val: 60 },
                                  { label: '2h', val: 120 },
                                  { label: '4h', val: 240 },
                                  { label: '8h', val: 480 },
                                  { label: '24h', val: 1440 },
                                ].map((pr) => (
                                  <button
                                    key={pr.label}
                                    onClick={() => onUpdateSwitch({ ...item, maxRuntimeGuardMinutes: pr.val })}
                                    className={`px-2 py-0.5 rounded text-[10px] font-medium border ${
                                      item.maxRuntimeGuardMinutes === pr.val
                                        ? 'bg-emerald-600 text-white border-emerald-600 font-bold shadow-xs'
                                        : 'bg-white hover:bg-emerald-50 text-slate-700 border-slate-200'
                                    }`}
                                  >
                                    {pr.label}
                                  </button>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      )}

                      {/* 6) NOTIFIKACE NA MOBILU PŘI ZMĚNĚ STAVU */}
                      <div>
                        <div className="flex items-center gap-1.5 mb-1.5">
                          <Bell className="w-3.5 h-3.5 text-amber-500" />
                          <label className="font-semibold text-slate-700 text-xs">
                            6) Notifikace na mobilu při změně stavu
                          </label>
                        </div>

                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
                          {(
                            [
                              { mode: 'OFF', label: 'Vypnuto' },
                              { mode: 'ALL', label: 'Každá změna' },
                              { mode: 'ONLY_ON', label: 'Jen ON stav' },
                              { mode: 'ONLY_OFF', label: 'Jen OFF stav' },
                            ] as { mode: NotificationMode; label: string }[]
                          ).map((n) => (
                            <button
                              key={n.mode}
                              id={`notif-${item.id}-${n.mode}`}
                              onClick={() => onUpdateSwitch({ ...item, notificationMode: n.mode })}
                              className={`py-1.5 px-2 rounded-lg text-[11px] font-medium border text-center transition ${
                                item.notificationMode === n.mode
                                  ? 'bg-amber-500 text-white border-amber-500 shadow-xs'
                                  : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                              }`}
                            >
                              {n.label}
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* 7) NOTIFIKACE A INDIKACE PŘI VÝPADKU (OFFLINE) */}
                      <div>
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-1.5">
                            <WifiOff className="w-3.5 h-3.5 text-red-500" />
                            <label className="font-semibold text-slate-700 text-xs">
                              7) Indikace offline výpadku (červený obrys + podbarvení)
                            </label>
                          </div>
                          <button
                            id={`offline-alert-toggle-${item.id}`}
                            onClick={() =>
                              onUpdateSwitch({
                                ...item,
                                offlineAlertEnabled: !(item.offlineAlertEnabled ?? true),
                              })
                            }
                            className={`px-2.5 py-1 rounded-full text-[11px] font-bold transition flex items-center gap-1 ${
                              (item.offlineAlertEnabled ?? true)
                                ? 'bg-red-500 text-white shadow-xs'
                                : 'bg-slate-200 text-slate-600'
                            }`}
                          >
                            {(item.offlineAlertEnabled ?? true) ? 'AKTIVNÍ' : 'VYPNUTO'}
                          </button>
                        </div>
                        <p className="text-[11px] text-slate-500 mt-1">
                          Při výpadku sítě nebo neznámém stavu se spínač zobrazí jako vypnutý s červenou linkou obrysu a jemným podbarvením.
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Modal Footer */}
        <div className="px-5 py-3 border-t border-slate-200 bg-slate-50 flex items-center justify-between">
          <span className="text-xs text-slate-500">
            Změny se okamžitě ukládají do lokální paměti
          </span>
          <button
            onClick={onClose}
            className="bg-sky-600 hover:bg-sky-700 text-white text-xs font-semibold px-4 py-2 rounded-lg transition shadow-xs"
          >
            Hotovo
          </button>
        </div>
      </div>
    </div>
  );
};
