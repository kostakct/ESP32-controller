import { useState, useRef, useEffect } from 'react';
import { ArrowLeft } from 'lucide-react';

const ROW_HEIGHT = 28;

const pad2 = (n: number) => String(n).padStart(2, '0');

export function secToHm(sec: number): string {
  const h = Math.floor(sec / 3600);
  const m = Math.round((sec % 3600) / 60);
  return `${pad2(h)}:${pad2(m)}`;
}

export function secToHms(sec: number): string {
  const floorSec = Math.floor(sec);
  const hasHalf = Math.round((sec % 1) * 10) === 5;
  const h = Math.floor(floorSec / 3600);
  const m = Math.floor((floorSec % 3600) / 60);
  const s = floorSec % 60;
  return `${pad2(h)}:${pad2(m)}:${pad2(s)}${hasHalf ? ',5' : ',0'} s`;
}

interface WheelColumnProps {
  value: number;
  min?: number;
  max: number;
  onChange: (val: number) => void;
  label: string;
  width?: number;
  format?: (v: number) => string;
  activeHighlight?: boolean;
}

function WheelColumn({
  value,
  min = 0,
  max,
  onChange,
  label,
  width = 46,
  format = (v) => pad2(v),
  activeHighlight = false,
}: WheelColumnProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const isScrollingRef = useRef(false);
  const [active, setActive] = useState(false);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  const count = max - min + 1;
  const currentIndex = Math.max(0, Math.min(count - 1, value - min));

  useEffect(() => {
    if (containerRef.current && !isScrollingRef.current) {
      containerRef.current.scrollTop = currentIndex * ROW_HEIGHT;
    }
  }, [currentIndex]);

  const handleScroll = () => {
    isScrollingRef.current = true;
    setActive(true);
    if (timerRef.current) clearTimeout(timerRef.current);

    timerRef.current = setTimeout(() => {
      isScrollingRef.current = false;
      if (!containerRef.current) return;
      const targetIndex = Math.max(0, Math.min(count - 1, Math.round(containerRef.current.scrollTop / ROW_HEIGHT)));
      containerRef.current.scrollTo({ top: targetIndex * ROW_HEIGHT, behavior: 'smooth' });
      const targetVal = min + targetIndex;
      if (targetVal !== value) onChange(targetVal);
      setActive(false);
    }, 120);
  };

  return (
    <div
      ref={containerRef}
      onScroll={handleScroll}
      className={`relative overflow-y-scroll snap-y snap-mandatory no-scrollbar touch-pan-y rounded-xl transition-colors ${
        activeHighlight ? 'bg-sky-100/50' : ''
      }`}
      style={{
        height: ROW_HEIGHT * 3,
        width,
        scrollSnapType: 'y mandatory',
      }}
      aria-label={label}
      role="spinbutton"
      aria-valuenow={value}
      aria-valuemax={max}
      aria-valuemin={min}
    >
      <div style={{ height: ROW_HEIGHT }} />
      {Array.from({ length: count }, (_, i) => {
        const val = min + i;
        const isSelected = val === value;
        return (
          <div
            key={val}
            className={`flex items-center justify-center snap-center font-mono select-none transition-all cursor-pointer ${
              isSelected
                ? `text-[19px] font-black ${active || activeHighlight ? 'text-sky-600' : 'text-slate-900'} scale-110`
                : 'text-[13px] font-medium text-slate-300 hover:text-slate-500'
            }`}
            style={{ height: ROW_HEIGHT, scrollSnapAlign: 'center' }}
            onClick={() => {
              if (containerRef.current) {
                containerRef.current.scrollTo({ top: i * ROW_HEIGHT, behavior: 'smooth' });
                onChange(val);
              }
            }}
          >
            {format(val)}
          </div>
        );
      })}
      <div style={{ height: ROW_HEIGHT }} />
    </div>
  );
}

function Colon() {
  return <span className="text-[17px] font-black text-slate-400 select-none pb-1">:</span>;
}

function Comma() {
  return <span className="text-[18px] font-black text-slate-400 select-none pb-1">,</span>;
}

/** Rotační válec pro hodiny a minuty (režim klasického spínání) */
export function TimeWheelPickerHM({
  seconds,
  maxHours = 23,
  focusedPart,
  onFocusPart,
  onChange,
}: {
  seconds: number;
  maxHours?: number;
  focusedPart?: 'h' | 'm';
  onFocusPart?: (p: 'h' | 'm') => void;
  onChange: (s: number) => void;
}) {
  const h = Math.min(maxHours, Math.floor(seconds / 3600));
  const m = Math.round((seconds % 3600) / 60);

  return (
    <div className="flex items-center justify-center gap-2 bg-slate-50 border border-slate-200 rounded-2xl p-3 shadow-inner">
      <div
        className={`flex flex-col items-center p-1.5 rounded-xl cursor-pointer transition-all ${
          focusedPart === 'h' ? 'ring-2 ring-sky-500/80 bg-white shadow-xs' : 'hover:bg-slate-100'
        }`}
        onClick={() => onFocusPart?.('h')}
      >
        <span className="text-[10px] font-extrabold uppercase text-slate-500 tracking-wider">Hod</span>
        <WheelColumn
          value={h}
          max={maxHours}
          onChange={(val) => onChange(val * 3600 + m * 60)}
          label="hodiny"
          width={56}
          activeHighlight={focusedPart === 'h'}
        />
      </div>

      <Colon />

      <div
        className={`flex flex-col items-center p-1.5 rounded-xl cursor-pointer transition-all ${
          focusedPart === 'm' ? 'ring-2 ring-sky-500/80 bg-white shadow-xs' : 'hover:bg-slate-100'
        }`}
        onClick={() => onFocusPart?.('m')}
      >
        <span className="text-[10px] font-extrabold uppercase text-slate-500 tracking-wider">Min</span>
        <WheelColumn
          value={m}
          max={59}
          onChange={(val) => onChange(h * 3600 + val * 60)}
          label="minuty"
          width={56}
          activeHighlight={focusedPart === 'm'}
        />
      </div>
    </div>
  );
}

/** Rotační válec pro Delay: Hodiny, Minuty, Sekundy a PŮLSEKUNDY (přímo otočný válec 0 / 5) */
export function TimeWheelPickerHMS({
  seconds,
  focusedPart,
  onFocusPart,
  onChange,
}: {
  seconds: number;
  focusedPart?: 'h' | 'm' | 's' | 'half';
  onFocusPart?: (p: 'h' | 'm' | 's' | 'half') => void;
  onChange: (s: number) => void;
}) {
  const floorSec = Math.floor(seconds);
  const halfStep = Math.round((seconds % 1) * 10) === 5 ? 1 : 0; // 0 = ,0s, 1 = ,5s
  const h = Math.floor(floorSec / 3600);
  const m = Math.floor((floorSec % 3600) / 60);
  const s = floorSec % 60;

  const update = (newH: number, newM: number, newS: number, newHalf: number) => {
    const total = newH * 3600 + newM * 60 + newS + (newHalf === 1 ? 0.5 : 0);
    onChange(total);
  };

  return (
    <div className="flex items-center justify-center gap-1.5 bg-slate-50 border border-slate-200 rounded-2xl p-2.5 shadow-inner">
      {/* Hodiny */}
      <div
        className={`flex flex-col items-center p-1 rounded-xl cursor-pointer transition-all ${
          focusedPart === 'h' ? 'ring-2 ring-sky-500/80 bg-white shadow-xs' : 'hover:bg-slate-100'
        }`}
        onClick={() => onFocusPart?.('h')}
      >
        <span className="text-[9px] font-extrabold uppercase text-slate-500 tracking-wider">Hod</span>
        <WheelColumn
          value={h}
          max={24}
          onChange={(val) => update(val, m, s, halfStep)}
          label="hodiny"
          width={42}
          activeHighlight={focusedPart === 'h'}
        />
      </div>

      <Colon />

      {/* Minuty */}
      <div
        className={`flex flex-col items-center p-1 rounded-xl cursor-pointer transition-all ${
          focusedPart === 'm' ? 'ring-2 ring-sky-500/80 bg-white shadow-xs' : 'hover:bg-slate-100'
        }`}
        onClick={() => onFocusPart?.('m')}
      >
        <span className="text-[9px] font-extrabold uppercase text-slate-500 tracking-wider">Min</span>
        <WheelColumn
          value={m}
          max={59}
          onChange={(val) => update(h, val, s, halfStep)}
          label="minuty"
          width={42}
          activeHighlight={focusedPart === 'm'}
        />
      </div>

      <Colon />

      {/* Vteřiny */}
      <div
        className={`flex flex-col items-center p-1 rounded-xl cursor-pointer transition-all ${
          focusedPart === 's' ? 'ring-2 ring-sky-500/80 bg-white shadow-xs' : 'hover:bg-slate-100'
        }`}
        onClick={() => onFocusPart?.('s')}
      >
        <span className="text-[9px] font-extrabold uppercase text-slate-500 tracking-wider">Sek</span>
        <WheelColumn
          value={s}
          max={59}
          onChange={(val) => update(h, m, val, halfStep)}
          label="sekundy"
          width={42}
          activeHighlight={focusedPart === 's'}
        />
      </div>

      <Comma />

      {/* Půlvteřiny – otočný válec 0 / 5 */}
      <div
        className={`flex flex-col items-center p-1 rounded-xl cursor-pointer transition-all ${
          focusedPart === 'half' ? 'ring-2 ring-sky-500/80 bg-white shadow-xs' : 'hover:bg-slate-100'
        }`}
        onClick={() => onFocusPart?.('half')}
      >
        <span className="text-[9px] font-extrabold uppercase text-slate-500 tracking-wider">Půlky</span>
        <WheelColumn
          value={halfStep}
          max={1}
          format={(v) => (v === 1 ? '5' : '0')}
          onChange={(val) => update(h, m, s, val)}
          label="půlvteřiny"
          width={36}
          activeHighlight={focusedPart === 'half'}
        />
      </div>
    </div>
  );
}

/** Tlačítko / pole s časem: klepnutím otevře rotační válec, druhým klepnutím potvrdí */
export function TimeField({
  seconds,
  mode = 'hm',
  maxHours = 23,
  onChange,
  className,
  disabled,
  label,
}: {
  seconds: number;
  mode?: 'hm' | 'hms';
  maxHours?: number;
  onChange: (s: number) => void;
  className?: string;
  disabled?: boolean;
  label?: string;
}) {
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState(seconds);
  const [focusedPart, setFocusedPart] = useState<'h' | 'm' | 's' | 'half'>('m');

  const formatted = mode === 'hms' ? secToHms(seconds) : secToHm(seconds);
  const draftFormatted = mode === 'hms' ? secToHms(draft) : secToHm(draft);

  const dialogTitle = label ?? (mode === 'hms' ? 'Nastavení Delay časovače' : 'Nastavení času');

  const stepTime = (deltaSec: number) => {
    const updated = Math.max(0.5, Math.round((draft + deltaSec) * 2) / 2);
    setDraft(updated);
  };

  return (
    <>
      <button
        type="button"
        disabled={disabled}
        onClick={(e) => {
          e.stopPropagation();
          if (disabled) return;
          setDraft(seconds);
          setOpen(true);
        }}
        title={disabled ? 'Hodnota je uzamčena' : 'Klepněte pro rotaci času prstem'}
        className={
          className ??
          (disabled
            ? 'font-mono text-[14px] font-bold text-slate-700 cursor-default opacity-60'
            : 'underline decoration-dotted decoration-slate-300 underline-offset-2 font-mono text-[14px] font-bold text-slate-800 hover:text-sky-600 transition-colors')
        }
      >
        {formatted}
      </button>

      {open && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150"
          onClick={() => setOpen(false)}
        >
          <div
            className="w-full max-w-[360px] rounded-3xl bg-white p-5 shadow-2xl border border-slate-200 space-y-4 animate-in zoom-in-95 duration-150"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Záhlaví s náhledem hodnoty vpravo */}
            <div className="flex items-center justify-between gap-2">
              <div className="min-w-0">
                <h3 className="text-[15px] font-black text-slate-900 truncate">{dialogTitle}</h3>
                <span className="text-[11px] font-bold text-slate-400 block">
                  {mode === 'hms'
                    ? 'Rotujte hodiny, minuty, vteřiny a půlvteřiny'
                    : 'Rotujte hodiny a minuty nahoru a dolů'}
                </span>
              </div>
              <div className="shrink-0 flex items-baseline gap-1 bg-sky-50 px-3 py-1.5 rounded-2xl border border-sky-200 shadow-2xs">
                <span className="text-[19px] font-mono font-black text-sky-800 tracking-tight leading-none">
                  {draftFormatted}
                </span>
              </div>
            </div>

            {/* Rotační válec */}
            {mode === 'hms' ? (
              <TimeWheelPickerHMS
                seconds={draft}
                focusedPart={focusedPart}
                onFocusPart={setFocusedPart}
                onChange={setDraft}
              />
            ) : (
              <TimeWheelPickerHM
                seconds={draft}
                maxHours={maxHours}
                focusedPart={focusedPart === 'h' ? 'h' : 'm'}
                onFocusPart={(p) => setFocusedPart(p)}
                onChange={setDraft}
              />
            )}

            {/* Rychlá krokovací tlačítka */}
            {mode === 'hms' ? (
              <div className="space-y-1">
                <div className="text-[10px] font-extrabold uppercase text-slate-400 tracking-wider text-center">
                  Rychlé nastavení Delay (krok po 0,5 s)
                </div>
                <div className="grid grid-cols-6 gap-1">
                  <button
                    type="button"
                    onClick={() => stepTime(-60)}
                    className="py-1.5 rounded-lg text-[11px] font-bold bg-slate-100 hover:bg-slate-200 active:bg-slate-300 text-slate-700"
                  >
                    -1m
                  </button>
                  <button
                    type="button"
                    onClick={() => stepTime(-1)}
                    className="py-1.5 rounded-lg text-[11px] font-bold bg-slate-100 hover:bg-slate-200 active:bg-slate-300 text-slate-700"
                  >
                    -1s
                  </button>
                  <button
                    type="button"
                    onClick={() => stepTime(-0.5)}
                    className="py-1.5 rounded-lg text-[11px] font-black bg-sky-100 text-sky-800 border border-sky-300 shadow-2xs"
                  >
                    -0,5s
                  </button>
                  <button
                    type="button"
                    onClick={() => stepTime(0.5)}
                    className="py-1.5 rounded-lg text-[11px] font-black bg-sky-100 text-sky-800 border border-sky-300 shadow-2xs"
                  >
                    +0,5s
                  </button>
                  <button
                    type="button"
                    onClick={() => stepTime(1)}
                    className="py-1.5 rounded-lg text-[11px] font-bold bg-slate-100 hover:bg-slate-200 active:bg-slate-300 text-slate-700"
                  >
                    +1s
                  </button>
                  <button
                    type="button"
                    onClick={() => stepTime(60)}
                    className="py-1.5 rounded-lg text-[11px] font-bold bg-slate-100 hover:bg-slate-200 active:bg-slate-300 text-slate-700"
                  >
                    +1m
                  </button>
                </div>
              </div>
            ) : (
              <div className="space-y-1">
                <div className="text-[10px] font-extrabold uppercase text-slate-400 tracking-wider text-center">
                  Rychlý posun
                </div>
                <div className="grid grid-cols-4 gap-1.5">
                  <button
                    type="button"
                    onClick={() => stepTime(-3600)}
                    className="py-2 rounded-xl text-[12px] font-bold bg-slate-100 hover:bg-slate-200 active:bg-slate-300 text-slate-700"
                  >
                    -1 h
                  </button>
                  <button
                    type="button"
                    onClick={() => stepTime(-600)}
                    className="py-2 rounded-xl text-[12px] font-bold bg-slate-100 hover:bg-slate-200 active:bg-slate-300 text-slate-700"
                  >
                    -10 min
                  </button>
                  <button
                    type="button"
                    onClick={() => stepTime(600)}
                    className="py-2 rounded-xl text-[12px] font-bold bg-slate-100 hover:bg-slate-200 active:bg-slate-300 text-slate-700"
                  >
                    +10 min
                  </button>
                  <button
                    type="button"
                    onClick={() => stepTime(3600)}
                    className="py-2 rounded-xl text-[12px] font-bold bg-slate-100 hover:bg-slate-200 active:bg-slate-300 text-slate-700"
                  >
                    +1 h
                  </button>
                </div>
              </div>
            )}

            {/* Akční lišta: malé tlačítko Zpět + banner Potvrdit */}
            <div className="flex items-center gap-2 pt-1">
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="py-3 px-3.5 rounded-2xl border border-slate-200 bg-slate-100 hover:bg-slate-200 active:bg-slate-300 text-slate-700 font-bold text-[13px] transition-colors flex items-center justify-center gap-1.5 shrink-0 cursor-pointer"
                title="Vrátit se zpět bez uložení změn"
              >
                <ArrowLeft className="w-4 h-4 text-slate-500" />
                <span>Zpět</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  onChange(draft);
                  setOpen(false);
                }}
                className="flex-1 py-3 rounded-2xl bg-sky-600 hover:bg-sky-500 active:bg-sky-700 text-white font-extrabold text-[14px] shadow-sm transition-transform active:scale-[0.98] flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <span>Potvrdit</span>
                <span className="font-mono">({draftFormatted})</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
