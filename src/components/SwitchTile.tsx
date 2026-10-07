import type React from 'react';
import { useState, useRef, useEffect, useCallback } from 'react';
import {
  ArrowDown,
  ArrowUp,
  Ban,
  Bell,
  CheckCircle2,
  Clock,
  Hand,
  LoaderCircle,
  Lock,
  Power,
  Thermometer,
  WifiOff,
} from 'lucide-react';
import type { NotifyMode, OutCommand, OutConfig, OutRuntime, TileSize } from '../types';

export function isHoldRequired(config: OutConfig, runtime: OutRuntime): boolean {
  if (config.mode === 'classic') {
    return config.lock;
  }
  return runtime.delay.running || config.lock;
}

export function evaluateInteraction(
  config: OutConfig,
  runtime: OutRuntime,
  canOperate: boolean,
  type: 'tap' | 'hold',
): { command?: OutCommand; notice?: string } {
  if (runtime.link === 'loading') {
    return { notice: 'Načítám stav zařízení…' };
  }
  if (runtime.link === 'offline') {
    return { notice: 'Zařízení je offline – ovládání je blokováno.' };
  }
  if (!canOperate) {
    return { notice: 'Tento prvek smíte jen sledovat, ovládat ho nemůžete.' };
  }
  if (runtime.pending) {
    return { notice: 'Čekám na potvrzení ze zařízení…' };
  }
  if (runtime.blocked) {
    return { notice: 'Výstup je blokován jiným prvkem.' };
  }

  if (config.mode === 'classic') {
    if (config.lock) {
      return type === 'hold'
        ? { command: 'toggle' }
        : { notice: 'Zámek je aktivní – přepněte podržením na 1 s.' };
    }
    return { command: 'toggle' };
  }

  // Delay mode
  if (runtime.delay.running) {
    if (type === 'hold') {
      return { command: 'delay_cancel' };
    }
    if (runtime.delay.count < config.delay.max) {
      return { command: 'delay_extend' };
    }
    return { notice: `Dosažen limit MAX (${config.delay.max}). Další klepnutí se ignorují.` };
  }

  // Delay idle
  if (config.lock) {
    return type === 'hold'
      ? { command: 'delay_start' }
      : { notice: 'Zámek je aktivní – spusťte podržením na 1 s.' };
  }
  return { command: 'delay_start' };
}

export function getRemainingSeconds(runtime: OutRuntime, now: number): number {
  if (!runtime.delay.running || runtime.link !== 'online') {
    return runtime.delay.remainingSec;
  }
  return Math.max(0, runtime.delay.remainingSec - (now - runtime.receivedAt) / 1000);
}

export function formatHms(seconds: number): string {
  const total = Math.max(0, Math.floor(seconds));
  const p = (n: number) => String(n).padStart(2, '0');
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  return `${p(h)}:${p(m)}:${p(s)}`;
}

const MOVE_THRESHOLD_PX = 10;

export function useHoldTrigger({
  holdEnabled,
  holdMs = 1000,
  onTap,
  onHold,
}: {
  holdEnabled: boolean;
  holdMs?: number;
  onTap: () => void;
  onHold: () => void;
}) {
  const [pressing, setPressing] = useState(false);
  const callbacksRef = useRef({ onTap, onHold, holdEnabled });
  callbacksRef.current = { onTap, onHold, holdEnabled };

  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const isDownRef = useRef(false);
  const firedHoldRef = useRef(false);
  const startPosRef = useRef({ x: 0, y: 0 });

  const clearTimer = () => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  };

  const cancel = useCallback(() => {
    clearTimer();
    isDownRef.current = false;
    firedHoldRef.current = false;
    setPressing(false);
  }, []);

  useEffect(() => cancel, [cancel]);

  return {
    pressing,
    handlers: {
      onPointerDown: (e: React.PointerEvent) => {
        if (e.pointerType === 'mouse' && e.button !== 0) return;
        if (isDownRef.current) return;
        isDownRef.current = true;
        firedHoldRef.current = false;
        startPosRef.current = { x: e.clientX, y: e.clientY };

        try {
          (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
        } catch {}

        if (callbacksRef.current.holdEnabled) {
          setPressing(true);
          timerRef.current = setTimeout(() => {
            timerRef.current = null;
            firedHoldRef.current = true;
            setPressing(false);
            if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
              navigator.vibrate?.(30);
            }
            callbacksRef.current.onHold();
          }, holdMs);
        }
      },
      onPointerMove: (e: React.PointerEvent) => {
        if (!isDownRef.current || firedHoldRef.current) return;
        const dx = e.clientX - startPosRef.current.x;
        const dy = e.clientY - startPosRef.current.y;
        if (Math.hypot(dx, dy) > MOVE_THRESHOLD_PX) {
          cancel();
        }
      },
      onPointerUp: () => {
        if (!isDownRef.current) return;
        const hadFired = firedHoldRef.current;
        cancel();
        if (!hadFired) {
          callbacksRef.current.onTap();
        }
      },
      onPointerCancel: () => cancel(),
      onKeyDown: (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          if (!e.repeat) callbacksRef.current.onTap();
        }
      },
      onContextMenu: (e: React.MouseEvent) => e.preventDefault(),
    },
  };
}

function useTicker(active: boolean, intervalMs = 250) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (!active) return;
    setNow(Date.now());
    const id = setInterval(() => setNow(Date.now()), intervalMs);
    return () => clearInterval(id);
  }, [active, intervalMs]);
  return now;
}

function DelayIcon({ filled, className }: { filled?: boolean; className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill={filled ? 'currentColor' : 'none'}
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <circle cx="12" cy="13" r="8" />
      <path d="M12 9v4l2 2" stroke={filled ? '#ffffff' : 'currentColor'} />
      <path d="M5 3L2 6" />
      <path d="M22 6l-3-3" />
    </svg>
  );
}

const TILE_HEIGHT = 100;
const TILE_MIDDLE_Y = 28;

interface SwitchKnobProps {
  seat: 'flow' | 'right' | 'center';
  checked: boolean;
  link: 'online' | 'offline' | 'loading';
  pending: boolean;
  pressing: boolean;
  scheduled: boolean;
  dimmed: boolean;
  label: string;
  glyph: 'ban' | null;
  handlers: React.HTMLAttributes<HTMLDivElement>;
}

function SwitchKnob({
  seat,
  checked,
  link,
  pending,
  pressing,
  scheduled,
  dimmed,
  label,
  glyph,
  handlers,
}: SwitchKnobProps) {
  const trackClass =
    link === 'offline'
      ? 'bg-slate-200 border-[1.5px] border-dashed border-red-500'
      : link === 'loading'
      ? 'bg-slate-200 border-[1.5px] border-slate-300 animate-pulse'
      : checked
      ? 'bg-[#0099ff] border-[1.5px] border-[#0099ff] shadow-[0_1px_5px_rgba(0,153,255,0.4)]'
      : 'bg-slate-200 border-[1.5px] border-slate-500';

  const thumbClass =
    link === 'offline'
      ? 'bg-white animate-offline-pulse border-[1.5px] border-slate-400'
      : link === 'loading'
      ? 'bg-white border-[1.5px] border-slate-300'
      : checked
      ? 'bg-white border-[1.5px] border-transparent'
      : 'bg-white border-[1.5px] border-slate-500';

  const iconColor =
    link === 'offline'
      ? 'text-red-600'
      : link === 'loading'
      ? 'text-slate-400'
      : checked
      ? 'text-[#0099ff]'
      : 'text-slate-600';

  const iconStyle = {
    width: 'calc(var(--sw) * 0.27)',
    height: 'calc(var(--sw) * 0.27)',
  };

  const IconComp = scheduled ? Clock : Power;

  const stylePos: React.CSSProperties =
    seat === 'flow'
      ? {
          position: 'relative',
          width: 'var(--sw)',
          height: 'calc(var(--sw) * 0.53)',
        }
      : {
          position: 'absolute',
          width: 'var(--sw)',
          height: 'calc(var(--sw) * 0.53)',
          top: `calc(${TILE_MIDDLE_Y}px - var(--sw) * 0.265)`,
          ...(seat === 'right' ? { right: 10 } : { left: 'calc(50% - var(--sw) / 2)' }),
        };

  return (
    <div className={dimmed ? 'opacity-60' : ''} style={stylePos}>
      <div
        className={`absolute inset-0 rounded-full flex items-center box-border shadow-inner transition-colors duration-200 ${trackClass}`}
      >
        {pressing && (
          <span className="absolute inset-0 rounded-full overflow-hidden pointer-events-none">
            <span className="block h-full w-full origin-left bg-rose-500/40 animate-hold-fill" />
          </span>
        )}
        <div
          className={`rounded-full flex items-center justify-center shadow-md transition-transform duration-200 ease-out box-border ${thumbClass}`}
          style={{
            width: 'calc(var(--sw) * 0.53 - 3px)',
            height: 'calc(var(--sw) * 0.53 - 3px)',
            transform: checked ? 'translateX(calc(var(--sw) * 0.47))' : 'translateX(0)',
          }}
        >
          {pending ? (
            <LoaderCircle className={`animate-spin ${iconColor}`} style={iconStyle} strokeWidth={2.6} />
          ) : glyph === 'ban' ? (
            <Ban className={`shrink-0 transition-colors ${iconColor}`} style={iconStyle} strokeWidth={2.6} />
          ) : (
            <IconComp className={`shrink-0 transition-colors ${iconColor}`} style={iconStyle} strokeWidth={2.6} />
          )}
        </div>
      </div>
      <div
        role="switch"
        aria-checked={checked}
        aria-label={label}
        aria-disabled={dimmed}
        tabIndex={0}
        {...handlers}
        className="absolute -inset-2 z-20 cursor-pointer touch-manipulation select-none outline-none [-webkit-touch-callout:none] focus-visible:ring-2 focus-visible:ring-sky-500 rounded-xl"
      />
    </div>
  );
}

const BADGE_CLASS = 'inline-flex items-center justify-center rounded-md border shrink-0';
const BADGE_SIZE = 'w-[26px] h-[24px]';

function NotifyBadge({ mode }: { mode: NotifyMode }) {
  if (mode === 'none') return null;
  const label = {
    any: 'Notifikace při každé změně',
    on_only: 'Notifikace jen při ZAP',
    off_only: 'Notifikace jen při VYP',
  }[mode];

  return (
    <span title={label} aria-label={label} className={`${BADGE_CLASS} ${BADGE_SIZE} gap-px bg-amber-50 border-amber-200`}>
      <Bell className="w-[15px] h-[15px] text-amber-600 fill-amber-500/20" />
      {mode === 'on_only' && <ArrowUp className="w-[9px] h-[9px] text-amber-700" strokeWidth={3.5} />}
      {mode === 'off_only' && <ArrowDown className="w-[9px] h-[9px] text-amber-700" strokeWidth={3.5} />}
    </span>
  );
}

function ScheduleNextInfo({
  rt,
  compact,
  thermo,
}: {
  rt: OutRuntime;
  compact?: boolean;
  thermo?: boolean;
}) {
  const isOnline = rt.link === 'online';
  const isStateOn = rt.state === 'on';

  if (!rt.schedule) {
    if (thermo) {
      return (
        <div className="flex items-center justify-center w-7 h-7" title="Termostat bez časového plánu">
          <Thermometer className={`w-[22px] h-[22px] ${isOnline ? 'text-[#0099ff]' : 'text-slate-400'}`} strokeWidth={1.8} />
        </div>
      );
    }
    return (
      <div className="flex items-center justify-center w-7 h-7" title="Bez časového plánu (ruční ovládání)">
        <Hand
          className={`w-[24px] h-[24px] ${isStateOn && isOnline ? 'text-[#0099ff]' : 'text-slate-400'}`}
          fill={isStateOn && isOnline ? 'rgba(0,153,255,0.22)' : 'none'}
          strokeWidth={isStateOn && isOnline ? 2 : 1.8}
        />
      </div>
    );
  }

  const color = isOnline ? 'text-[#0099ff]' : 'text-slate-500';

  if (thermo) {
    const hasRange = rt.schedule.nextTempLow !== undefined && rt.schedule.nextTempHigh !== undefined;
    const rangeText = hasRange ? `${rt.schedule.nextTempLow}–${rt.schedule.nextTempHigh}°C` : '';
    const rangeFont =
      rangeText.length > 11 ? (compact ? 'text-[12px]' : 'text-[13px]') : compact ? 'text-[15px]' : 'text-[16px]';

    return (
      <div className="flex flex-col items-end justify-center text-right w-full">
        {rt.manualOverride && (
          <span title="Ruční zásah do časového plánu" className="flex items-center justify-center mb-px self-end">
            <Hand className={`${compact ? 'w-[14px] h-[14px]' : 'w-[16px] h-[16px]'} text-[#ea580c]`} strokeWidth={2.4} />
          </span>
        )}
        <span className={`${compact ? 'text-[15px]' : 'text-[16px]'} font-black leading-none tracking-tight whitespace-nowrap ${color}`}>
          {rt.schedule.nextTime}
        </span>
        {hasRange && (
          <span className={`${rangeFont} font-black leading-none tracking-tight mt-0.5 whitespace-nowrap ${color}`}>
            {rangeText}
          </span>
        )}
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center text-center">
      {rt.manualOverride && (
        <span title="Ruční zásah do časového plánu" className="flex items-center justify-center mb-px">
          <Hand className={`${compact ? 'w-[14px] h-[14px]' : 'w-[16px] h-[16px]'} text-[#ea580c]`} strokeWidth={2.4} />
        </span>
      )}
      <span className={`${compact ? 'text-[15px]' : 'text-[16px]'} font-black leading-none tracking-tight ${color}`}>
        {rt.schedule.nextTime}
      </span>
      <span className={`text-[11px] font-black tracking-wider mt-0.5 leading-none ${color}`}>
        {rt.schedule.nextAction === 'on' ? 'ZAP' : 'VYP'}
      </span>
    </div>
  );
}

const SWITCH_WIDTH_MAP: Record<TileSize, string> = {
  '1/1': 'clamp(62px, 20cqw, 78px)',
  '1/2': 'clamp(54px, 32cqw, 64px)',
  '1/4': 'clamp(50px, 74cqw, 68px)',
};

interface SwitchTileProps {
  config: OutConfig;
  runtime: OutRuntime;
  size?: TileSize;
  notify?: NotifyMode;
  canOperate?: boolean;
  onCommand: (cmd: OutCommand, cfg: OutConfig) => void;
  onNotice?: (msg: string) => void;
}

export function SwitchTile({
  config,
  runtime,
  size = '1/1',
  notify = 'none',
  canOperate = true,
  onCommand,
  onNotice,
}: SwitchTileProps) {
  const isStateOn = runtime.state === 'on';
  const isDelay = config.mode === 'delay';
  const isThermo = config.mode === 'thermostat';
  const isDelayRunning = isDelay && runtime.delay.running;
  const isOnline = runtime.link === 'online';

  const now = useTicker(isDelayRunning && isOnline);
  const remainingSec = getRemainingSeconds(runtime, now);
  const progressPercent =
    isDelayRunning && isOnline && runtime.delay.totalSec > 0
      ? Math.max(0, Math.min(100, (remainingSec / runtime.delay.totalSec) * 100))
      : 0;

  const trigger = (type: 'tap' | 'hold') => {
    const outcome = evaluateInteraction(config, runtime, canOperate, type);
    if (outcome.notice) onNotice?.(outcome.notice);
    if (outcome.command) onCommand(outcome.command, config);
  };

  const { pressing, handlers } = useHoldTrigger({
    holdEnabled: isHoldRequired(config, runtime) && isOnline && canOperate,
    onTap: () => trigger('tap'),
    onHold: () => trigger('hold'),
  });

  const isDimmed = !canOperate || runtime.blocked;
  const switchLabel = `${config.name}: ${isStateOn ? 'zapnuto' : 'vypnuto'}`;
  const delayTimeText = formatHms(isDelayRunning ? remainingSec : config.delay.seconds);

  const containerBg =
    runtime.link === 'offline'
      ? 'bg-red-100 border-red-500 shadow-[0_0_12px_rgba(239,68,68,0.25)]'
      : runtime.link === 'loading'
      ? 'bg-slate-100 border-slate-300'
      : isStateOn
      ? 'bg-[#d0e6fb] border-[#0099ff] shadow-[0_0_10px_rgba(0,153,255,0.2),0_1px_4px_rgba(0,153,255,0.1)]'
      : 'bg-[#dfe7f2] border-sky-200 shadow-sm';

  const glyph = size === '1/4' && runtime.blocked ? 'ban' : null;

  const renderKnob = (seat: 'flow' | 'right' | 'center') => (
    <SwitchKnob
      seat={seat}
      checked={isStateOn}
      link={runtime.link}
      pending={runtime.pending}
      pressing={pressing}
      scheduled={runtime.schedule !== null}
      dimmed={isDimmed}
      label={switchLabel}
      glyph={glyph}
      handlers={handlers}
    />
  );

  const lockBadge = config.lock && (
    <span title="Zámek: změna podržením 1 s" className={`${BADGE_CLASS} ${BADGE_SIZE} bg-rose-50 border-rose-200`}>
      <Lock className="w-[15px] h-[15px] text-rose-600" />
    </span>
  );

  const blockedBadge = runtime.blocked && (
    <span title="Blokováno jiným prvkem" className={`${BADGE_CLASS} ${BADGE_SIZE} bg-orange-50 border-orange-200`}>
      <Ban className="w-[15px] h-[15px] text-orange-600" />
    </span>
  );

  const offlineBadge = runtime.link === 'offline' && (
    <span title="Zařízení je offline" className={`${BADGE_CLASS} ${BADGE_SIZE} bg-red-50 border-red-300`}>
      <WifiOff className="w-[15px] h-[15px] text-red-600" />
    </span>
  );

  const delayBadge = (fontSize: string, opts: { count?: boolean; icon?: boolean; tight?: boolean }) =>
    isDelay && (
      <span
        title={
          isDelayRunning
            ? `Běžící DELAY, uplatněno opakování: ${runtime.delay.count} (max ${config.delay.max})`
            : 'Nastavený DELAY'
        }
        className={`inline-flex items-center h-[24px] rounded-md border font-bold tracking-tight ${
          opts.tight ? 'gap-0.5 px-1' : 'gap-1 px-1.5'
        } ${fontSize} ${
          isDelayRunning
            ? 'border-sky-300 bg-sky-100 text-sky-800'
            : 'border-sky-200 bg-sky-50 text-sky-600'
        }`}
      >
        {opts.icon && (
          <DelayIcon
            filled={isDelayRunning}
            className={`w-[15px] h-[15px] shrink-0 ${isDelayRunning ? 'text-sky-600' : 'text-sky-500'}`}
          />
        )}
        <span className="font-mono leading-none">{delayTimeText}</span>
        {isDelayRunning && opts.count && (
          <span className="text-[11px] font-extrabold bg-sky-200 text-sky-800 px-1.5 rounded leading-none py-0.5">
            {runtime.delay.count}
          </span>
        )}
      </span>
    );

  const nameClass = 'font-bold text-slate-900 tracking-tight leading-tight';

  // 1/1 layout
  const layout11 = (
    <>
      <div
        className="flex flex-col justify-between h-full min-w-0"
        style={{ paddingRight: isThermo ? 'calc(var(--sw) + 96px)' : 'calc(var(--sw) + 60px)' }}
      >
        <div className="flex items-center gap-1 h-[24px]">
          <NotifyBadge mode={notify} />
          {lockBadge}
          {blockedBadge}
          {offlineBadge}
          {delayBadge('text-[13px]', { count: true, icon: true, tight: false })}
        </div>

        {isThermo && (
          <div
            className="flex items-center gap-1.5 h-[26px]"
            title="Termostat: automatický režim podle plánu, nebo ruční ovládání"
          >
            <button
              type="button"
              onClick={() =>
                canOperate &&
                isOnline &&
                onCommand(runtime.thermostat?.auto ? 'thermostat_manual' : 'thermostat_auto', config)
              }
              className={`inline-flex items-center justify-center h-[22px] px-2 rounded-full text-[10px] font-extrabold tracking-wide ${
                runtime.thermostat?.auto ? 'bg-[#0099ff] text-white' : 'bg-slate-300 text-slate-700'
              }`}
            >
              {runtime.thermostat?.auto ? 'AUTO' : 'MAN'}
            </button>
            <span className="inline-flex items-center gap-1 text-[18px] font-bold text-slate-900 tracking-tight">
              <Thermometer className="w-[18px] h-[18px] text-slate-500 shrink-0" strokeWidth={2} />
              {runtime.thermostat ? `${runtime.thermostat.currentTemp.toFixed(1)}°C` : '—'}
            </span>
          </div>
        )}

        <span title={config.name} className={`${nameClass} text-[18px] line-clamp-2`}>
          {config.name}
        </span>
      </div>

      <div
        className="absolute flex items-center justify-end"
        style={{
          right: 'calc(10px + var(--sw) + 8px)',
          top: 0,
          bottom: 0,
          width: isThermo ? 84 : 44,
        }}
      >
        <ScheduleNextInfo rt={runtime} thermo={isThermo && (runtime.thermostat?.auto ?? true)} />
      </div>

      <div
        className="absolute flex flex-col items-center justify-center gap-1.5"
        style={{ right: 10, top: 0, bottom: 0, width: 'var(--sw)' }}
      >
        {renderKnob('flow')}
        {isDelay && (
          <span className="inline-flex px-2 py-0.5 rounded-full border border-sky-300 bg-sky-50 text-[11px] font-bold text-sky-700 uppercase tracking-wider leading-none">
            max {config.delay.max}
          </span>
        )}
      </div>
    </>
  );

  // 1/2 layout
  const layout12 = (
    <>
      <div className="flex flex-col justify-between h-full min-w-0" style={{ paddingRight: 'calc(var(--sw) + 8px)' }}>
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-1 h-[24px]">
            {lockBadge}
            {blockedBadge}
            {offlineBadge}
            {isDelayRunning && (
              <span
                title={`Uplatněno opakování: ${runtime.delay.count} (max ${config.delay.max})`}
                className={`${BADGE_CLASS} ${BADGE_SIZE} border-sky-300 bg-sky-100 text-sky-800 text-[13px] font-black leading-none`}
              >
                {runtime.delay.count}
              </span>
            )}
          </div>
          {isDelay && <div className="flex">{delayBadge('text-[13px]', { count: false, icon: false, tight: false })}</div>}
        </div>
        <span title={config.name} className={`${nameClass} text-[15px] ${isDelay ? 'truncate' : 'line-clamp-2'}`}>
          {config.name}
        </span>
      </div>
      <div
        className="absolute flex items-center justify-center"
        style={{
          right: 10,
          width: 'var(--sw)',
          top: `calc(${TILE_MIDDLE_Y}px + var(--sw) * 0.265 + 3px)`,
          bottom: 8,
        }}
      >
        <ScheduleNextInfo rt={runtime} compact />
      </div>
      {renderKnob('right')}
    </>
  );

  // 1/4 layout
  const delayColor14 = isOnline ? 'text-sky-800' : 'text-slate-500';
  const layout14 = (
    <>
      <div className="flex flex-col justify-end h-full min-w-0">
        <span
          title={config.name}
          className={`${nameClass} block text-center text-[12px] leading-[1] line-clamp-2 px-0.5`}
          style={{ transform: 'translateY(5px)' }}
        >
          {config.name}
        </span>
      </div>
      {renderKnob('center')}
      {(isDelay || config.lock) && (
        <div
          className="absolute left-0 right-0 flex items-center justify-center gap-1 pointer-events-none"
          style={{ top: `calc(${TILE_MIDDLE_Y}px + var(--sw) * 0.265 + 2px)`, height: 13 }}
        >
          {isDelayRunning ? (
            <span className={`font-mono font-bold tracking-tight text-[13px] leading-none ${delayColor14}`}>
              {delayTimeText}
            </span>
          ) : (
            <>
              {config.lock && (
                <Lock className="w-[11px] h-[11px] text-rose-600" strokeWidth={2.4} aria-label="Zámek: podržte 1 s" />
              )}
              {isDelay && <DelayIcon className="w-[12px] h-[12px] text-sky-600" />}
            </>
          )}
        </div>
      )}
    </>
  );

  if (isThermo && size !== '1/1') {
    return (
      <div
        className="w-full flex items-center justify-center rounded-xl border-[1.5px] border-dashed border-amber-400 bg-amber-50 text-center px-2"
        style={{ height: TILE_HEIGHT }}
      >
        <span className="text-[11px] font-semibold text-amber-700 leading-tight">
          Termostat vyžaduje velikost 1/1 — přepni prvek na plný banner.
        </span>
      </div>
    );
  }

  return (
    <div className="w-full [container-type:inline-size]" style={{ height: TILE_HEIGHT }}>
      <div
        className={`relative h-full w-full box-border overflow-hidden rounded-xl border-[1.5px] select-none transition-colors duration-200 py-2 ${
          size === '1/4' ? 'px-1.5' : 'px-2.5'
        } ${containerBg}`}
        style={{
          '--sw': SWITCH_WIDTH_MAP[size],
        } as React.CSSProperties}
      >
        {isDelayRunning && isOnline && (
          <div className="absolute top-0 left-0 w-full h-[4px]">
            <div
              className="h-full bg-[#0099ff] shadow-[0_0_6px_rgba(0,153,255,0.8)] transition-[width] duration-200 ease-linear"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        )}
        {size === '1/1' ? layout11 : size === '1/2' ? layout12 : layout14}
      </div>
    </div>
  );
}
