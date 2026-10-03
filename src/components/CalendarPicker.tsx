import { useState, useMemo } from 'react';
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon, Check, Trash2, X } from 'lucide-react';

const MONTH_NAMES_CS = [
  'Leden',
  'Únor',
  'Březen',
  'Duben',
  'Květen',
  'Červen',
  'Červenec',
  'Srpen',
  'Září',
  'Říjen',
  'Listopad',
  'Prosinec',
];

const WEEKDAY_NAMES_CS = ['Po', 'Út', 'St', 'Čt', 'Pá', 'So', 'Ne'];

function pad2(n: number): string {
  return String(n).padStart(2, '0');
}

function formatDateStr(year: number, month: number, day: number): string {
  return `${year}-${pad2(month + 1)}-${pad2(day)}`;
}

function getDaysBetween(startStr: string, endStr: string): string[] {
  const result: string[] = [];
  const start = new Date(startStr);
  const end = new Date(endStr);
  if (isNaN(start.getTime()) || isNaN(end.getTime())) return result;

  const [from, to] = start <= end ? [start, end] : [end, start];
  const curr = new Date(from);

  while (curr <= to) {
    const y = curr.getFullYear();
    const m = curr.getMonth();
    const d = curr.getDate();
    result.push(formatDateStr(y, m, d));
    curr.setDate(curr.getDate() + 1);
  }
  return result;
}

export function CalendarPickerModal({
  selectedDays,
  onChange,
  onClose,
}: {
  selectedDays: string[];
  onChange: (days: string[]) => void;
  onClose: () => void;
}) {
  const today = new Date();
  const todayStr = formatDateStr(today.getFullYear(), today.getMonth(), today.getDate());

  const [viewDate, setViewDate] = useState(() => {
    if (selectedDays.length > 0) {
      const first = new Date(selectedDays[0]);
      if (!isNaN(first.getTime())) return new Date(first.getFullYear(), first.getMonth(), 1);
    }
    return new Date(today.getFullYear(), today.getMonth(), 1);
  });

  const [selectMode, setSelectMode] = useState<'single_multi' | 'range'>('single_multi');
  const [rangeStart, setRangeStart] = useState<string | null>(null);
  const [rangeEnd, setRangeEnd] = useState<string | null>(null);

  // Local draft of selected days
  const [draftDays, setDraftDays] = useState<string[]>([...selectedDays]);

  const year = viewDate.getFullYear();
  const month = viewDate.getMonth();

  const prevMonth = () => setViewDate(new Date(year, month - 1, 1));
  const nextMonth = () => setViewDate(new Date(year, month + 1, 1));
  const jumpToday = () => setViewDate(new Date(today.getFullYear(), today.getMonth(), 1));

  // Calendar grid calculation
  const calendarCells = useMemo(() => {
    const firstDayIndex = new Date(year, month, 1).getDay(); // 0 is Sunday
    // Convert to Monday = 0, ..., Sunday = 6
    const startOffset = (firstDayIndex + 6) % 7;
    const daysInMonth = new Date(year, month + 1, 0).getDate();

    const cells: { dateStr: string; dayNum: number; isCurrentMonth: boolean }[] = [];

    // Previous month padding
    const prevMonthDays = new Date(year, month, 0).getDate();
    for (let i = startOffset - 1; i >= 0; i--) {
      const d = prevMonthDays - i;
      const prevM = month === 0 ? 11 : month - 1;
      const prevY = month === 0 ? year - 1 : year;
      cells.push({
        dateStr: formatDateStr(prevY, prevM, d),
        dayNum: d,
        isCurrentMonth: false,
      });
    }

    // Current month days
    for (let d = 1; d <= daysInMonth; d++) {
      cells.push({
        dateStr: formatDateStr(year, month, d),
        dayNum: d,
        isCurrentMonth: true,
      });
    }

    // Trailing padding to fill complete rows of 7
    const remaining = (7 - (cells.length % 7)) % 7;
    for (let d = 1; d <= remaining; d++) {
      const nextM = month === 11 ? 0 : month + 1;
      const nextY = month === 11 ? year + 1 : year;
      cells.push({
        dateStr: formatDateStr(nextY, nextM, d),
        dayNum: d,
        isCurrentMonth: false,
      });
    }

    return cells;
  }, [year, month]);

  const handleDayClick = (dateStr: string) => {
    if (selectMode === 'single_multi') {
      // Toggle single day
      setDraftDays((prev) =>
        prev.includes(dateStr) ? prev.filter((d) => d !== dateStr) : [...prev, dateStr].sort()
      );
    } else {
      // Range mode
      if (!rangeStart || (rangeStart && rangeEnd)) {
        // First click sets range start
        setRangeStart(dateStr);
        setRangeEnd(null);
      } else {
        // Second click completes range
        const [start, end] = dateStr < rangeStart ? [dateStr, rangeStart] : [rangeStart, dateStr];
        setRangeStart(start);
        setRangeEnd(end);
        const inBetween = getDaysBetween(start, end);
        // Merge with draftDays without duplicates
        setDraftDays((prev) => Array.from(new Set([...prev, ...inBetween])).sort());
      }
    }
  };

  const handleClear = () => {
    setDraftDays([]);
    setRangeStart(null);
    setRangeEnd(null);
  };

  const handleSave = () => {
    onChange(draftDays);
    onClose();
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-3 animate-in fade-in duration-150"
      onClick={onClose}
    >
      <div
        className="w-full max-w-[370px] rounded-3xl bg-white p-4 shadow-2xl border border-slate-200 space-y-3.5 animate-in zoom-in-95 duration-150 select-none max-h-[92vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Horní záhlaví */}
        <div className="flex items-center justify-between pb-1 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-purple-100 text-purple-700">
              <CalendarIcon className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-[15px] font-black text-slate-900 leading-tight">Kalendář výluk</h3>
              <span className="text-[11px] font-semibold text-slate-500">
                {draftDays.length === 0
                  ? 'Zatím nevybrán žádný den'
                  : `Vybráno: ${draftDays.length} ${
                      draftDays.length === 1 ? 'den' : draftDays.length < 5 ? 'dny' : 'dní'
                    }`}
              </span>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Přepínač způsobu výběru: Jednotlivé dny vs Období */}
        <div className="grid grid-cols-2 gap-1 p-1 rounded-xl bg-slate-100 border border-slate-200">
          <button
            type="button"
            onClick={() => {
              setSelectMode('single_multi');
              setRangeStart(null);
              setRangeEnd(null);
            }}
            className={`py-1.5 px-2 rounded-lg text-[12px] font-bold transition-all ${
              selectMode === 'single_multi'
                ? 'bg-white text-purple-900 shadow-2xs border border-slate-200/80 font-black'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Jednotlivé dny
          </button>
          <button
            type="button"
            onClick={() => {
              setSelectMode('range');
              setRangeStart(null);
              setRangeEnd(null);
            }}
            className={`py-1.5 px-2 rounded-lg text-[12px] font-bold transition-all ${
              selectMode === 'range'
                ? 'bg-white text-purple-900 shadow-2xs border border-slate-200/80 font-black'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Období (od – do)
          </button>
        </div>

        {/* Nápověda pro režim období */}
        {selectMode === 'range' && (
          <div className="p-2 rounded-xl bg-purple-50 border border-purple-200 text-purple-900 text-[11px] font-medium leading-snug">
            {!rangeStart ? (
              <span>Klepněte na <strong>počáteční den</strong> období výluky.</span>
            ) : !rangeEnd ? (
              <span>
                Začátek: <strong>{rangeStart}</strong>. Nyní klepněte na <strong>konečný den</strong>.
              </span>
            ) : (
              <span>
                Rozsah: <strong>{rangeStart}</strong> až <strong>{rangeEnd}</strong> přidán do výběru.
              </span>
            )}
          </div>
        )}

        {/* Navigace měsíce */}
        <div className="flex items-center justify-between px-1">
          <div className="flex items-center gap-1.5">
            <span className="text-[14px] font-black text-slate-800">
              {MONTH_NAMES_CS[month]} {year}
            </span>
            <button
              type="button"
              onClick={jumpToday}
              className="text-[10.5px] font-extrabold px-2 py-0.5 rounded-md bg-slate-100 text-slate-600 hover:bg-slate-200 active:bg-slate-300"
            >
              Dnes
            </button>
          </div>
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={prevMonth}
              className="p-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 active:bg-slate-100 text-slate-600"
              title="Předchozí měsíc"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={nextMonth}
              className="p-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 active:bg-slate-100 text-slate-600"
              title="Další měsíc"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Dny v týdnu */}
        <div className="grid grid-cols-7 gap-1 text-center">
          {WEEKDAY_NAMES_CS.map((w, idx) => (
            <span
              key={w}
              className={`text-[10.5px] font-extrabold ${idx >= 5 ? 'text-rose-500' : 'text-slate-400'}`}
            >
              {w}
            </span>
          ))}
        </div>

        {/* Kalendářní mřížka dnů */}
        <div className="grid grid-cols-7 gap-1">
          {calendarCells.map((cell) => {
            const isSelected = draftDays.includes(cell.dateStr);
            const isToday = cell.dateStr === todayStr;
            const isRangeAnchor = cell.dateStr === rangeStart || cell.dateStr === rangeEnd;

            return (
              <button
                key={cell.dateStr}
                type="button"
                onClick={() => handleDayClick(cell.dateStr)}
                className={`h-9 rounded-xl text-[12.5px] font-bold transition-all flex flex-col items-center justify-center relative ${
                  isSelected
                    ? 'bg-purple-600 text-white font-black shadow-xs scale-102 ring-1 ring-purple-400'
                    : isRangeAnchor
                    ? 'bg-purple-200 text-purple-900 font-black ring-2 ring-purple-500'
                    : cell.isCurrentMonth
                    ? 'bg-slate-50 hover:bg-slate-100 text-slate-800'
                    : 'bg-transparent text-slate-300 hover:text-slate-500'
                }`}
              >
                <span>{cell.dayNum}</span>
                {isToday && !isSelected && (
                  <span className="w-1 h-1 rounded-full bg-sky-500 absolute bottom-1" />
                )}
              </button>
            );
          })}
        </div>

        {/* Seznam vybraných dnů (srolovatelný štítkový pruh) */}
        {draftDays.length > 0 && (
          <div className="max-h-20 overflow-y-auto space-y-1 p-2 rounded-xl bg-slate-50 border border-slate-200/80">
            <div className="flex flex-wrap gap-1">
              {draftDays.map((d) => (
                <span
                  key={d}
                  className="inline-flex items-center gap-1 text-[11px] font-bold bg-purple-100 text-purple-800 px-2 py-0.5 rounded-full shadow-2xs"
                >
                  <span>{d}</span>
                  <button
                    type="button"
                    onClick={() => setDraftDays((prev) => prev.filter((x) => x !== d))}
                    className="text-purple-400 hover:text-purple-700 font-black ml-0.5"
                  >
                    ×
                  </button>
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Spodní akce */}
        <div className="flex items-center gap-2 pt-1 border-t border-slate-100">
          <button
            type="button"
            onClick={handleClear}
            disabled={draftDays.length === 0}
            className="py-2.5 px-3 rounded-xl border border-slate-200 text-slate-600 hover:text-rose-600 hover:border-rose-300 text-[12px] font-bold disabled:opacity-40 disabled:pointer-events-none flex items-center gap-1 shrink-0"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>Vymazat</span>
          </button>
          <button
            type="button"
            onClick={handleSave}
            className="flex-1 py-2.5 px-3 rounded-xl bg-purple-600 hover:bg-purple-500 active:bg-purple-700 text-white text-[13px] font-black shadow-xs transition-transform active:scale-[0.98] flex items-center justify-center gap-1.5"
          >
            <Check className="w-4 h-4" />
            <span>Uložit ({draftDays.length})</span>
          </button>
        </div>
      </div>
    </div>
  );
}
