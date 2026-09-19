import React, { useRef } from 'react';
import { Timer, Bell, RotateCw, Hand, WifiOff } from 'lucide-react';
import { SwitchItem, ScheduleItem } from '../types';
import { formatCountdown, formatDuration, getNextScheduleEvent } from '../utils/formatters';

// Symmetrically and optically centered Power SVG icon
const CenteredPowerIcon: React.FC<{ className?: string }> = ({ className = 'w-4 h-4' }) => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2.5"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
  >
    {/* Stem perfectly centered from top to middle */}
    <path d="M12 2.5v9" />
    {/* Symmetrical circular arc */}
    <path d="M18.36 6.64a9 9 0 1 1-12.72 0" />
  </svg>
);

interface SwitchCardProps {
  item: SwitchItem;
  schedules: ScheduleItem[];
  isOffline?: boolean;
  onToggle: (id: string) => void;
  onLongPressReset?: (id: string) => void;
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
  const isDelayActive = item.delayConfig.enabled;
  const isRunning = !isOffline && item.isDelayRunning && item.isOn;
  const isAlertActive = isOffline && (item.offlineAlertEnabled ?? true);

  // 2s hold timer ref for long-press reset without visual text clutter
  const holdTimerRef = useRef<NodeJS.Timeout | null>(null);
  const didLongPressRef = useRef<boolean>(false);

  // Calculate progress percentage for countdown top line
  const progressPercent = isRunning && item.totalDelaySeconds > 0
    ? Math.max(0, Math.min(100, (item.remainingSeconds / item.totalDelaySeconds) * 100))
    : 0;

  // Format channel name with index in parenthesis e.g. "Zásuvka sklep (1)"
  const displayName = item.name.includes(`(${item.channelIndex})`)
    ? item.name
    : `${item.name} (${item.channelIndex})`;

  // Handle pointer down for 2s long press reset (pure graphical transition)
  const handlePointerDown = () => {
    didLongPressRef.current = false;

    holdTimerRef.current = setTimeout(() => {
      didLongPressRef.current = true;

      // Trigger strict reset to default state (OFF)
      if (onLongPressReset) {
        onLongPressReset(item.id);
      }

      // Haptic vibration feedback on mobile if supported
      if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
        try {
          navigator.vibrate([100, 50, 100]);
        } catch {
          // ignore
        }
      }
    }, 1500); // 1.5s stisk pro ukončení delay akce a návrat do OFF
  };

  const clearHoldTimer = () => {
    if (holdTimerRef.current) {
      clearTimeout(holdTimerRef.current);
      holdTimerRef.current = null;
    }
  };

  const handlePointerUp = () => {
    clearHoldTimer();
  };

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (didLongPressRef.current) {
      didLongPressRef.current = false;
      return;
    }
    onToggle(item.id);
  };

  const hasTopBadges = item.notificationMode !== 'OFF' || isDelayActive || isOffline;

  return (
    <div
      id={`switch-card-${item.id}`}
      className={`relative overflow-hidden rounded-2xl border transition-all duration-200 shadow-xs ${
        isOffline
          ? isAlertActive
            ? 'border-red-500 ring-2 ring-red-500/30 bg-rose-50/40 shadow-sm'
            : 'border-slate-300 bg-slate-50/60 opacity-85'
          : item.isOn
          ? 'bg-white border-sky-400 ring-2 ring-sky-400/20 shadow-sm'
          : 'bg-white border-slate-200/90 hover:border-slate-300'
      }`}
    >
      {/* Active countdown top progress line */}
      {isRunning && (
        <div className="absolute top-0 left-0 right-0 h-1 bg-slate-100 overflow-hidden">
          <div
            className="h-full bg-sky-500 transition-all duration-200 ease-linear"
            style={{ width: `${progressPercent}%` }}
          />
        </div>
      )}

      <div className="px-3.5 py-3 sm:px-4 sm:py-3.5 flex items-center justify-between gap-3">
        {/* Left column: Badges, Name (Channel), and Status / Countdown */}
        <div className="flex-1 min-w-0">
          {/* Top row: Notification badge and Delay badge */}
          {hasTopBadges && (
            <div className="flex items-center gap-1.5 mb-1 flex-wrap">
              {/* Notification badge: Only shown if not OFF */}
              {item.notificationMode !== 'OFF' && (
                <span
                  className="inline-flex items-center gap-1 text-[11px] font-medium text-amber-800 bg-amber-50/70 border border-amber-200/90 px-2 py-0.5 rounded-md"
                  title={`Notifikace: ${
                    item.notificationMode === 'ALL'
                      ? 'Všechny stavy (ON i OFF)'
                      : item.notificationMode === 'ONLY_ON'
                      ? 'Jen zapnutí (ON)'
                      : 'Jen vypnutí (OFF)'
                  }`}
                >
                  <Bell className="w-3 h-3 text-amber-500 flex-shrink-0" />
                  <span>
                    Notif: {item.notificationMode === 'ALL' ? 'Vše' : item.notificationMode === 'ONLY_ON' ? 'ON' : 'OFF'}
                  </span>
                </span>
              )}

              {/* Delay badge: Timer icon and duration */}
              {isDelayActive && (
                <span
                  className={`inline-flex items-center gap-1 text-[11px] font-medium px-2 py-0.5 rounded-md border ${
                    isRunning
                      ? 'bg-sky-50 text-sky-800 border-sky-300 font-bold animate-pulse'
                      : 'bg-sky-50/60 text-sky-700 border-sky-200'
                  }`}
                  title={`Zpožděné vypnutí nastaveno na ${formatDuration(item.delayConfig.durationSeconds)}`}
                >
                  <Timer className="w-3 h-3 text-sky-600 flex-shrink-0" />
                  <span>Delay: {formatDuration(item.delayConfig.durationSeconds)}</span>
                </span>
              )}

              {/* Offline indicator badge if disconnected */}
              {isOffline && (
                <span
                  className={`inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-md border ${
                    isAlertActive
                      ? 'bg-red-100/80 text-red-700 border-red-300'
                      : 'bg-slate-200 text-slate-600 border-slate-300'
                  }`}
                  title="Zařízení nemá spojení se sítí nebo MQTT"
                >
                  <WifiOff className="w-3 h-3 text-red-600 flex-shrink-0" />
                  <span>BEZ SPOJENÍ (OFFLINE)</span>
                </span>
              )}
            </div>
          )}

          {/* Switch Name with Channel Index in Parenthesis */}
          <button
            onClick={() => onOpenItemSettings(item.id)}
            className="text-left font-bold text-slate-900 hover:text-sky-600 transition text-base sm:text-lg truncate block w-full py-0.5 group"
            title="Klikněte pro nastavení spínače"
          >
            <span className="group-hover:underline underline-offset-2">
              {displayName}
            </span>
          </button>

          {/* Status line: "Zbývá: mm:ss [4x]" or simple ON/OFF or OFFLINE */}
          <div className="mt-1 flex items-center gap-2 text-xs sm:text-sm">
            {isOffline ? (
              <div className="flex items-center gap-1.5 text-xs">
                <span className="w-2 h-2 rounded-full bg-red-500 animate-ping flex-shrink-0" />
                <span className="font-semibold text-red-600">
                  Vypnuto (Bez odezvy)
                </span>
                <span className="text-[10px] text-slate-500 bg-red-50 px-1.5 py-0.5 rounded border border-red-200">
                  Odešle se po spojení
                </span>
              </div>
            ) : isRunning ? (
              <div className="flex items-center gap-1.5 text-slate-800 font-semibold">
                <span className="w-2.5 h-2.5 rounded-full bg-sky-400 flex-shrink-0 animate-pulse" />
                <span className="text-slate-700 text-xs sm:text-sm">Zbývá:</span>
                <span className="font-mono text-sm sm:text-base font-bold text-slate-900">
                  {formatCountdown(item.remainingSeconds)}
                </span>
                
                {/* Multiplier badge */}
                <span className="bg-sky-500 text-white text-[11px] font-extrabold px-1.5 py-0.5 rounded-md shadow-xs flex items-center gap-0.5 ml-1">
                  <RotateCw className="w-2.5 h-2.5" />
                  {item.currentRepeats}x
                </span>
              </div>
            ) : (
              <div className="flex items-center gap-1.5 text-xs">
                <span
                  className={`w-2 h-2 rounded-full ${
                    item.isOn ? 'bg-sky-500 animate-pulse' : 'bg-slate-300'
                  }`}
                />
                <span className={`font-medium ${item.isOn ? 'text-sky-600 font-semibold' : 'text-slate-400'}`}>
                  {item.isOn ? 'Zapnuto (ON)' : 'Vypnuto'}
                </span>
                {!item.delayConfig.enabled && (item.maxRuntimeGuardMinutes || 0) > 0 && (
                  <span
                    className="ml-1 text-[10px] font-semibold text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200"
                    title={`Bezpečnostní ochrana vypnutí: max ${item.maxRuntimeGuardMinutes} min`}
                  >
                    Guard {item.maxRuntimeGuardMinutes}m
                  </span>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Right column: Info & eWeLink Slider Toggle Switch */}
        <div className="flex items-start gap-3 flex-shrink-0 mt-0.5">
          {/* Schedule Info / Manual Hand Icon */}
          {!isRunning && !isOffline && (
            <div className="flex flex-col items-center gap-1.5 text-sky-600 font-bold mr-1">
              {(() => {
                const nextEvent = getNextScheduleEvent(item.id, schedules);
                if (nextEvent) {
                  return (
                    <>
                      <div className="h-9 sm:h-10 flex flex-col justify-center items-center leading-tight">
                        <span className="text-base sm:text-lg leading-none mb-[2px]">{nextEvent.time}</span>
                        <span className="text-[11px] sm:text-xs leading-none">{nextEvent.action === 'ON' ? 'ZAP' : 'VYP'}</span>
                      </div>
                      {nextEvent.dayOffset > 0 && (
                        <span className="text-[10px] text-sky-600 font-medium px-2 py-0.5 bg-sky-50 border border-sky-200 rounded-full whitespace-nowrap leading-none shadow-sm">
                          {nextEvent.dayName}
                        </span>
                      )}
                    </>
                  );
                } else if (item.isOn && !isDelayActive) {
                  // Switch is ON, no delay running, no schedule next -> manual toggle
                  return (
                    <div className="h-9 sm:h-10 flex items-center justify-center">
                      <Hand className="w-6 h-6 text-sky-500 animate-pulse" />
                    </div>
                  );
                }
                return null;
              })()}
            </div>
          )}

          <div className="flex flex-col items-center gap-1.5">
            <button
              id={`btn-toggle-switch-${item.id}`}
              onClick={handleClick}
              onPointerDown={handlePointerDown}
              onPointerUp={handlePointerUp}
              onPointerLeave={clearHoldTimer}
              onPointerCancel={clearHoldTimer}
              aria-label={`Přepnout ${item.name}`}
              className={`relative inline-flex h-9 w-16 sm:h-10 sm:w-18 items-center px-1 rounded-full transition-colors duration-200 focus:outline-none select-none touch-manipulation active:scale-95 ${
                isOffline
                  ? 'bg-slate-300 border-2 border-dashed border-red-400'
                  : item.isOn
                  ? 'bg-sky-500 shadow-md shadow-sky-500/25 ring-1 ring-sky-400'
                  : 'bg-slate-300 shadow-inner border border-slate-300'
              }`}
            >
              {/* Sliding circular thumb with optically centered Power Icon */}
              <span
                className={`w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-white shadow-md transition-transform duration-200 ease-out flex items-center justify-center shrink-0 ${
                  !isOffline && item.isOn
                    ? 'translate-x-7 sm:translate-x-8 text-sky-600'
                    : 'translate-x-0 text-slate-400'
                }`}
              >
                <CenteredPowerIcon className={`w-3.5 h-3.5 sm:w-4 sm:h-4 stroke-[2.5] block shrink-0 ${isOffline ? 'text-red-500' : ''}`} />
              </span>
            </button>

            {/* Under-the-button display: Rotation button, accepted max repeats */}
            {isRunning ? (
              <button
                onClick={handleClick}
                className="text-[11px] text-sky-700 bg-sky-50 hover:bg-sky-100 border border-sky-300 px-2 py-0.5 rounded-full font-bold transition flex items-center gap-1 active:scale-95 shadow-sm leading-none"
                title={`Klikněte pro prodloužení (rotuje 1x až ${item.delayConfig.maxRepeats}x)`}
              >
                <RotateCw className="w-2.5 h-2.5 text-sky-600" />
                <span>Rotovat ({item.currentRepeats}/{item.delayConfig.maxRepeats}x)</span>
              </button>
            ) : isDelayActive ? (
              <span className="text-[10px] text-slate-500 font-medium px-2 py-0.5 bg-slate-50 border border-slate-200 rounded-full leading-none shadow-sm">
                Max {item.delayConfig.maxRepeats}x
              </span>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
};
