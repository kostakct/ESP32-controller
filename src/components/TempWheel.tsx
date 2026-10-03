import { useState, useRef, useEffect } from 'react';
import { ArrowLeft } from 'lucide-react';

const ROW_HEIGHT = 28;

interface WheelColumnProps {
  value: number;
  min: number;
  max: number;
  step?: number;
  format?: (val: number) => string;
  onChange: (val: number) => void;
  label: string;
  width?: number;
  activeHighlight?: boolean;
}

function WheelColumn({
  value,
  min,
  max,
  format = (v) => String(v),
  onChange,
  label,
  width = 54,
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
                ? `text-[20px] font-black ${active || activeHighlight ? 'text-sky-600' : 'text-slate-900'} scale-110`
                : 'text-[14px] font-medium text-slate-300 hover:text-slate-500'
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

export function TempWheelPicker({
  value,
  min = 5,
  max = 45,
  focusedPart = 'tenth',
  onFocusPart,
  onChange,
}: {
  value: number;
  min?: number;
  max?: number;
  focusedPart?: 'whole' | 'tenth';
  onFocusPart?: (p: 'whole' | 'tenth') => void;
  onChange: (v: number) => void;
}) {
  const rounded = Math.round(value * 10) / 10;
  const whole = Math.floor(rounded);
  const tenth = Math.round((rounded - whole) * 10);

  const handleWholeChange = (newWhole: number) => {
    const newVal = Math.round((newWhole + tenth / 10) * 10) / 10;
    onChange(newVal);
  };

  const handleTenthChange = (newTenth: number) => {
    const newVal = Math.round((whole + newTenth / 10) * 10) / 10;
    onChange(newVal);
  };

  return (
    <div className="flex items-center justify-center gap-2 bg-slate-50 border border-slate-200 rounded-2xl p-3 shadow-inner">
      {/* Celé stupně */}
      <div
        className={`flex flex-col items-center p-1.5 rounded-xl cursor-pointer transition-all ${
          focusedPart === 'whole'
            ? 'ring-2 ring-sky-500/80 bg-white shadow-xs'
            : 'hover:bg-slate-100'
        }`}
        onClick={() => onFocusPart?.('whole')}
      >
        <span className="text-[10px] font-extrabold uppercase text-slate-500 tracking-wider">
          Stupně (°C)
        </span>
        <WheelColumn
          value={Math.min(max, Math.max(min, whole))}
          min={min}
          max={max}
          onChange={handleWholeChange}
          label="Celé stupně"
          width={64}
          activeHighlight={focusedPart === 'whole'}
        />
      </div>

      <div className="pt-4 text-[22px] font-black text-slate-400 select-none">,</div>

      {/* Desetiny */}
      <div
        className={`flex flex-col items-center p-1.5 rounded-xl cursor-pointer transition-all ${
          focusedPart === 'tenth'
            ? 'ring-2 ring-sky-500/80 bg-white shadow-xs'
            : 'hover:bg-slate-100'
        }`}
        onClick={() => onFocusPart?.('tenth')}
      >
        <span className="text-[10px] font-extrabold uppercase text-slate-500 tracking-wider">
          Desetiny
        </span>
        <WheelColumn
          value={Math.min(9, Math.max(0, tenth))}
          min={0}
          max={9}
          onChange={handleTenthChange}
          label="Desetiny stupně"
          width={48}
          activeHighlight={focusedPart === 'tenth'}
        />
      </div>

      <div className="pt-4 pl-1 text-[17px] font-bold text-slate-500 select-none">°C</div>
    </div>
  );
}

/** Tlačítko / pole s teplotou: klepnutím otevře rotační válec, druhým klepnutím potvrdí */
export function TempField({
  value,
  onChange,
  disabled,
  min = 5,
  max = 45,
  className,
  label = 'Nastavení teploty',
}: {
  value: number;
  onChange: (temp: number) => void;
  disabled?: boolean;
  min?: number;
  max?: number;
  className?: string;
  label?: string;
}) {
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState(value);
  const [focusedPart, setFocusedPart] = useState<'whole' | 'tenth'>('tenth');

  useEffect(() => {
    if (open) {
      setDraft(value);
    }
  }, [open, value]);

  const displayFormatted = (Math.round(value * 10) / 10).toFixed(1).replace('.', ',');
  const draftFormatted = (Math.round(draft * 10) / 10).toFixed(1).replace('.', ',');

  const stepVal = (delta: number) => {
    const updated = Math.round((draft + delta) * 10) / 10;
    setDraft(Math.min(max, Math.max(min, updated)));
  };

  return (
    <>
      <button
        type="button"
        disabled={disabled}
        onClick={(e) => {
          e.stopPropagation();
          if (disabled) return;
          setOpen(true);
        }}
        title={disabled ? 'Hodnota je uzamčena' : 'Klepněte pro rotaci teploty prstem'}
        className={`inline-flex items-center gap-1 font-mono font-black transition-all ${
          disabled
            ? 'opacity-60 cursor-not-allowed text-slate-500'
            : 'cursor-pointer hover:text-sky-600 active:scale-95'
        } ${className ?? 'text-[15px] text-sky-800 underline decoration-dotted decoration-sky-400 underline-offset-2'}`}
      >
        <span>{displayFormatted}</span>
        <span className="text-[12px] font-bold text-slate-400">°C</span>
      </button>

      {open && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150"
          onClick={() => setOpen(false)}
        >
          <div
            className="w-full max-w-[340px] rounded-3xl bg-white p-5 shadow-2xl border border-slate-200 space-y-4 animate-in zoom-in-95 duration-150"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Horní záhlaví: vpravo nastavovaná teplota s hezky zapsaným °C za číslicí */}
            <div className="flex items-center justify-between gap-2">
              <div className="min-w-0">
                <h3 className="text-[15px] font-black text-slate-900 truncate">{label}</h3>
                <span className="text-[11px] font-bold text-slate-400 block">
                  Klepněte na Stupně či Desetiny a rotujte
                </span>
              </div>
              <div className="shrink-0 flex items-baseline gap-1 bg-sky-50 px-3 py-1.5 rounded-2xl border border-sky-200 shadow-2xs">
                <span className="text-[21px] font-mono font-black text-sky-800 tracking-tight leading-none">
                  {draftFormatted}
                </span>
                <span className="text-[13px] font-black text-sky-600 leading-none">°C</span>
              </div>
            </div>

            {/* Rotační válec s volbou aktivního sloupce */}
            <TempWheelPicker
              value={draft}
              min={min}
              max={max}
              focusedPart={focusedPart}
              onFocusPart={setFocusedPart}
              onChange={setDraft}
            />

            {/* Krokovací tlačítka pro celé stupně i desetiny */}
            <div className="space-y-1.5">
              <div className="text-[11px] font-extrabold uppercase text-slate-400 tracking-wider text-center">
                Rychlé krokování ({focusedPart === 'whole' ? 'Aktivní stupně' : 'Aktivní desetiny'})
              </div>
              <div className="grid grid-cols-4 gap-1.5">
                <button
                  type="button"
                  onClick={() => stepVal(-1)}
                  className={`py-2 px-1 rounded-xl text-[12px] font-bold transition-all flex items-center justify-center ${
                    focusedPart === 'whole'
                      ? 'bg-sky-100 text-sky-800 border border-sky-300 font-extrabold shadow-2xs'
                      : 'bg-slate-100 text-slate-700 hover:bg-slate-200 active:bg-slate-300'
                  }`}
                  title="Odečíst 1 °C"
                >
                  -1 °C
                </button>
                <button
                  type="button"
                  onClick={() => stepVal(-0.1)}
                  className={`py-2 px-1 rounded-xl text-[12px] font-bold transition-all flex items-center justify-center ${
                    focusedPart === 'tenth'
                      ? 'bg-sky-100 text-sky-800 border border-sky-300 font-extrabold shadow-2xs'
                      : 'bg-slate-100 text-slate-700 hover:bg-slate-200 active:bg-slate-300'
                  }`}
                  title="Odečíst 0,1 °C"
                >
                  -0,1 °C
                </button>
                <button
                  type="button"
                  onClick={() => stepVal(0.1)}
                  className={`py-2 px-1 rounded-xl text-[12px] font-bold transition-all flex items-center justify-center ${
                    focusedPart === 'tenth'
                      ? 'bg-sky-100 text-sky-800 border border-sky-300 font-extrabold shadow-2xs'
                      : 'bg-slate-100 text-slate-700 hover:bg-slate-200 active:bg-slate-300'
                  }`}
                  title="Přičíst 0,1 °C"
                >
                  +0,1 °C
                </button>
                <button
                  type="button"
                  onClick={() => stepVal(1)}
                  className={`py-2 px-1 rounded-xl text-[12px] font-bold transition-all flex items-center justify-center ${
                    focusedPart === 'whole'
                      ? 'bg-sky-100 text-sky-800 border border-sky-300 font-extrabold shadow-2xs'
                      : 'bg-slate-100 text-slate-700 hover:bg-slate-200 active:bg-slate-300'
                  }`}
                  title="Přičíst 1 °C"
                >
                  +1 °C
                </button>
              </div>
            </div>

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
                <span className="font-mono">({draftFormatted} °C)</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
