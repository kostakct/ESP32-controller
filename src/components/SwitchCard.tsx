import React, { useState, useRef } from 'react';
import {
  Power,
  Clock,
  RotateCcw,
  SlidersHorizontal,
  Calendar,
  Layers,
  ShieldAlert,
  WifiOff,
} from 'lucide-react';
import { SwitchItem, ScheduleItem } from '../types';

interface SwitchCardProps {
  item: SwitchItem;
  schedules: ScheduleItem[];
  isOffline?: boolean;
  onToggle: (id: string) => void;
  onLongPressReset: (id: string) => void;
  onOpenItemSettings: (id: string) => void;
}

export const SwitchCard: React.FC<SwitchCardProps> = ({
  item,
  schedules,
  isOffline = false,
  onToggle,
  onLongPressReset,
  onOpenItemSettings,
}) => {
  const [longPressProgress, setLongPressProgress] = useState<number>(0);
  const pressTimerRef = useRef<number | null>(null);
  const progressIntervalRef = useRef<number | null>(null);
  const isLongPressTriggeredRef = useRef<boolean>(false);

  const switchSchedules = schedules.filter((s) => s.switchId === item.id && s.enabled);

  const formatSeconds = (totalSec: number) => {
    const m = Math.floor(totalSec / 60);
    const s = Math.floor(totalSec % 60);
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const startPress = () => {
    if (isOffline) return;
    isLongPressTriggeredRef.current = false;
    setLongPressProgress(0);

    const startTime = Date.now();
    const duration = 1500; // 1.5 sekundy pro storno delay

    progressIntervalRef.current = window.setInterval(() => {
      const elapsed = Date.now() - startTime;
      const progress = Math.min(100, (elapsed / duration) * 100);
      setLongPressProgress(progress);
    }, 30);

    pressTimerRef.current = window.setTimeout(() => {
      isLongPressTriggeredRef.current = true;
      clearInterval(progressIntervalRef.current!);
      setLongPressProgress(100);

      if (navigator.vibrate) {
        navigator.vibrate([40, 60, 100]);
      }
      onLongPressReset(item.id);

      setTimeout(() => {
        setLongPressProgress(0);
      }, 400);
    }, duration);
  };

  const cancelPress = (e?: React.SyntheticEvent) => {
    if (pressTimerRef.current) {
      clearTimeout(pressTimerRef.current);
      pressTimerRef.current = null;
    }
    if (progressIntervalRef.current) {
      clearInterval(progressIntervalRef.current);
      progressIntervalRef.current = null;
    }

    if (!isLongPressTriggeredRef.current && longPressProgress > 0) {
      if (!isOffline) {
        onToggle(item.id);
      }
    }

    setLongPressProgress(0);
    isLongPressTriggeredRef.current = false;
  };

  const percentProgress =
    item.totalDelaySeconds > 0 && item.remainingSeconds > 0
      ? Math.max(0, Math.min(100, (item.remainingSeconds / item.totalDelaySeconds) * 100))
      : 0;

  const showOfflineAlert = isOffline && (item.offlineAlertEnabled ?? true);

  return (
    <div
      id={`switch-card-${item.id}`}
      className={`rounded-2xl border transition-all duration-200 relative overflow-hidden shadow-xs ${
        showOfflineAlert
          ? 'bg-rose-50/40 border-red-500 ring-2 ring-red-500/20 shadow-red-100'
          : item.isOn
          ? 'bg-white border-sky-400 shadow-sky-100/50'
          : 'bg-white/95 border-slate-200 hover:border-slate-300'
      }`}
    >
      {/* Horní linka odpočtu Delay (aktivní běh) */}
      {item.isDelayRunning && !isOffline && (
        <div className="absolute top-0 left-0 right-0 h-1 bg-slate-100 z-10">
          <div
            className="h-full bg-linear-to-r from-sky-500 to-blue-600 transition-all duration-1000 ease-linear"
            style={{ width: `${percentProgress}%` }}
          />
        </div>
      )}

      {/* Horní linka upozornění při offline stavu */}
      {showOfflineAlert && (
        <div className="absolute top-0 left-0 right-0 h-1 bg-red-500 z-10 animate-pulse" />
      )}

      <div className="p-3.5 flex items-center justify-between gap-3">
        {/* Levá část: Popis, kanál, parametry */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 flex-wrap">
            <span
              className={`px-1.5 py-0.5 rounded text-[10px] font-bold tracking-wider uppercase ${
                showOfflineAlert
                  ? 'bg-red-100 text-red-700 border border-red-300'
                  : item.isOn
                  ? 'bg-sky-100 text-sky-700'
                  : 'bg-slate-100 text-slate-600'
              }`}
            >
              CH {item.channelIndex}
            </span>

            {/* Offline Badge */}
            {isOffline && (
              <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[9px] font-bold bg-red-100 text-red-600 border border-red-200">
                <WifiOff className="w-2.5 h-2.5 text-red-500" />
                <span>OFFLINE</span>
              </span>
            )}

            {/* Badge delay aktivního kroku */}
            {item.delayConfig.enabled && (
              <span className="px-1.5 py-0.5 rounded text-[10px] font-medium bg-blue-50 text-blue-700 border border-blue-200/60 flex items-center gap-0.5">
                <Clock className="w-3 h-3 text-blue-500" />
                <span>{formatSeconds(item.delayConfig.durationSeconds)}</span>
              </span>
            )}

            {/* Badge časové ochrany vypnutí */}
            {(item.maxRuntimeGuardMinutes || 0) > 0 && (
              <span
                className="px-1.5 py-0.5 rounded text-[10px] font-medium bg-amber-50 text-amber-700 border border-amber-200/60 flex items-center gap-0.5"
                title={`Ochrana chodu: max ${item.maxRuntimeGuardMinutes} min`}
              >
                <ShieldAlert className="w-3 h-3 text-amber-500" />
                <span>max {item.maxRuntimeGuardMinutes}m</span>
              </span>
            )}

            {/* Badge naplánovaných úloh */}
            {switchSchedules.length > 0 && (
              <span
                className="px-1.5 py-0.5 rounded text-[10px] font-medium bg-purple-50 text-purple-700 border border-purple-200/60 flex items-center gap-0.5"
                title={`${switchSchedules.length} aktivní plán`}
              >
                <Calendar className="w-3 h-3 text-purple-500" />
                <span>{switchSchedules.length}</span>
              </span>
            )}
          </div>

          {/* Název relé */}
          <h4
            onClick={() => onOpenItemSettings(item.id)}
            className="text-sm sm:text-base font-bold text-slate-800 truncate mt-1 cursor-pointer hover:text-sky-600 transition"
            title="Klikněte pro nastavení spínače"
          >
            {item.name}
          </h4>

          {/* Stavový text / Odpočet času */}
          <div className="mt-1 flex items-center gap-2 text-xs">
            {isOffline ? (
              <span className="font-semibold text-red-600 flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-red-500" />
                Bez odezvy (Odpojeno)
              </span>
            ) : item.isDelayRunning ? (
              <div className="flex items-center gap-1.5 text-sky-700 font-semibold">
                <span className="w-2 h-2 rounded-full bg-sky-500 animate-ping" />
                <span className="font-mono text-sm font-bold text-sky-800">
                  {formatSeconds(item.remainingSeconds)}
                </span>
                {item.currentRepeats > 1 && (
                  <span className="inline-flex items-center gap-0.5 px-1.5 py-0.2 rounded bg-sky-100 text-sky-800 text-[10px] font-bold">
                    <Layers className="w-2.5 h-2.5" />
                    <span>{item.currentRepeats}×</span>
                  </span>
                )}
                <span className="text-[10px] text-slate-400 font-normal ml-0.5 hidden xs:inline">
                  (1.5s = STOP)
                </span>
              </div>
            ) : (
              <span
                className={`font-semibold flex items-center gap-1.5 ${
                  item.isOn ? 'text-sky-600' : 'text-slate-400'
                }`}
              >
                <span
                  className={`w-2 h-2 rounded-full ${
                    item.isOn ? 'bg-sky-500' : 'bg-slate-300'
                  }`}
                />
                {item.isOn ? 'Sepnuto (Trvale)' : 'Vypnuto (Klid)'}
              </span>
            )}
          </div>
        </div>

        {/* Pravá část: Nastavení a Hlavní přepínač */}
        <div className="flex items-center gap-2">
          {/* Tlačítko nastavení relé */}
          <button
            onClick={() => onOpenItemSettings(item.id)}
            className="p-2 rounded-xl text-slate-400 hover:text-sky-600 hover:bg-slate-100 transition active:scale-95"
            title="Nastavení tohoto spínače"
          >
            <SlidersHorizontal className="w-4 h-4" />
          </button>

          {/* Hlavní akční Power Button s podporou dlouhého stisku */}
          <div className="relative select-none touch-none">
            {/* SVG Kruhový indikátor postupu při držení 1.5s */}
            {longPressProgress > 0 && !isOffline && (
              <svg className="absolute -inset-1 w-[56px] h-[56px] -rotate-90 pointer-events-none z-20">
                <circle
                  cx="28"
                  cy="28"
                  r="23"
                  className="stroke-slate-200"
                  strokeWidth="3"
                  fill="transparent"
                />
                <circle
                  cx="28"
                  cy="28"
                  r="23"
                  className="stroke-rose-500 transition-all duration-75 ease-linear"
                  strokeWidth="3"
                  strokeDasharray={144.5}
                  strokeDashoffset={144.5 - (144.5 * longPressProgress) / 100}
                  strokeLinecap="round"
                  fill="transparent"
                />
              </svg>
            )}

            <button
              id={`switch-btn-${item.id}`}
              onMouseDown={startPress}
              onMouseUp={cancelPress}
              onMouseLeave={cancelPress}
              onTouchStart={startPress}
              onTouchEnd={cancelPress}
              onTouchCancel={cancelPress}
              disabled={isOffline}
              className={`w-12 h-12 rounded-2xl flex items-center justify-center transition-all duration-200 shadow-md active:scale-90 relative z-10 ${
                isOffline
                  ? 'bg-slate-200 text-slate-400 cursor-not-allowed border border-slate-300 opacity-60'
                  : item.isOn
                  ? 'bg-linear-to-tr from-sky-500 to-blue-600 text-white shadow-sky-500/30'
                  : 'bg-slate-100 text-slate-400 hover:text-slate-600 hover:bg-slate-200/80 border border-slate-200/80'
              }`}
              title={
                isOffline
                  ? 'Zařízení je offline'
                  : item.isDelayRunning
                  ? 'Klikněte pro prodloužení kroku, podržte 1.5s pro vypnutí'
                  : 'Klikněte pro sepnutí'
              }
            >
              {longPressProgress > 25 && !isOffline ? (
                <RotateCcw className="w-5 h-5 text-rose-500 animate-spin" />
              ) : isOffline ? (
                <WifiOff className="w-5 h-5" />
              ) : (
                <Power className={`w-5 h-5 ${item.isOn ? 'stroke-[2.5]' : 'stroke-[2]'}`} />
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
