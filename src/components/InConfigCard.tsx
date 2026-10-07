import React, { useState } from 'react';
import {
  Activity,
  AlertTriangle,
  ArrowDownAZ,
  ArrowUpDown,
  Ban,
  Bell,
  Calendar as CalendarIcon,
  Check,
  CheckCircle2,
  ChevronDown,
  Clock,
  Cpu,
  DoorClosed,
  Droplets,
  Fingerprint,
  HelpCircle,
  Layers,
  Lock,
  MousePointerClick,
  Plus,
  Power,
  RotateCcw,
  ShieldAlert,
  ShieldCheck,
  Sliders,
  Sparkles,
  Tag,
  ToggleLeft,
  Trash2,
  Zap,
} from 'lucide-react';
import type {
  InConfig,
  InContactType,
  InNotifyMode,
  InPullResistor,
  InRuntime,
  InScheduleInterval,
  InTouchLock,
  InType,
  QuickLock,
  Role,
  TileSize,
  WeekdayIndex,
} from '../types';
import { TimeField } from './TimeWheel';
import { CalendarPickerModal } from './CalendarPicker';
import { DayPicker } from './ConfigCard';
import {
  IN_QUICK_LOCK_ITEMS,
  hmToSec,
  isInputBlocked,
  secToHm,
} from '../utils/inUtils';

const ROOM_NAMES: Record<number, string> = {
  1: 'Místnost 1 (Bazén & Zahrada)',
  2: 'Místnost 2 (Chodba & Vchod)',
  3: 'Místnost 3 (Garáž & Dílna)',
};

const WEEKDAY_SHORT = ['Po', 'Út', 'St', 'Čt', 'Pá', 'So', 'Ne'];

/* Pomocný obal pro sekce */
interface SectionProps {
  title: string;
  icon: React.ReactNode;
  counter?: string | number;
  badge?: string;
  defaultOpen?: boolean;
  headerAction?: React.ReactNode;
  children: React.ReactNode;
}

function Section({
  title,
  icon,
  counter,
  badge,
  defaultOpen = false,
  headerAction,
  children,
}: SectionProps) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="rounded-xl border border-slate-300/80 bg-white shadow-sm overflow-hidden transition-all">
      <div className="w-full flex items-center justify-between gap-2 px-3 py-2.5 select-none hover:bg-slate-50/50 transition-colors">
        <div className="flex items-center gap-2 min-w-0 flex-1">
          <button
            type="button"
            onClick={() => setOpen(!open)}
            className="flex items-center gap-2 min-w-0 text-left cursor-pointer"
          >
            <span className="text-slate-600 shrink-0">{icon}</span>
            <span className="text-[13.5px] font-bold text-slate-900 truncate tracking-tight">
              {title}
            </span>
            {badge && (
              <span className="shrink-0 text-[10px] font-extrabold uppercase tracking-wider px-1.5 py-0.5 rounded-md bg-amber-100 text-amber-900 border border-amber-300">
                {badge}
              </span>
            )}
            {counter !== undefined && (
              <span className="shrink-0 text-[11px] font-black px-1.5 py-0.2 rounded-full bg-sky-100 text-sky-700">
                {counter}
              </span>
            )}
          </button>

          {open && headerAction && (
            <div className="shrink-0 ml-1" onClick={(e) => e.stopPropagation()}>
              {headerAction}
            </div>
          )}

          <div
            onClick={() => setOpen(!open)}
            className="flex-1 self-stretch cursor-pointer min-w-4"
          />
        </div>

        <button
          type="button"
          onClick={() => setOpen(!open)}
          className="p-1.5 text-slate-400 hover:text-sky-600 cursor-pointer rounded-md transition-colors shrink-0"
          title={open ? 'Sbalit sekci' : 'Rozbalit sekci'}
        >
          <ChevronDown
            className={`w-4 h-4 transition-transform duration-200 ${
              open ? 'rotate-180 text-sky-600' : ''
            }`}
          />
        </button>
      </div>
      {open && (
        <div className="px-3.5 pb-3.5 pt-1 border-t border-slate-100 divide-y divide-slate-100/90">
          {children}
        </div>
      )}
    </div>
  );
}

/* Řádek formuláře */
function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1 py-1.5">
      <div className="flex items-baseline justify-between gap-2">
        <label className="text-[12px] font-bold text-slate-700 tracking-tight">{label}</label>
      </div>
      {children}
      {hint && <p className="text-[10.5px] font-medium text-slate-500 leading-tight">{hint}</p>}
    </div>
  );
}

/* Segmentový přepínač */
function Seg<T extends string | number | boolean>({
  value,
  onChange,
  options,
  disabled = false,
}: {
  value: T;
  onChange: (v: T) => void;
  options: { v: T; label: React.ReactNode }[];
  disabled?: boolean;
}) {
  return (
    <div className="flex rounded-lg border border-slate-300/80 bg-slate-100/80 p-0.5 w-full">
      {options.map((opt) => {
        const active = opt.v === value;
        return (
          <button
            key={String(opt.v)}
            type="button"
            disabled={disabled}
            onClick={() => onChange(opt.v)}
            className={`flex-1 py-1.5 px-2 text-[12px] font-bold rounded-md transition-all truncate text-center cursor-pointer ${
              active
                ? 'bg-sky-600 text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900 disabled:opacity-50'
            }`}
          >
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}

/* ------------------ Řádek dílčího plánu výluky (InScheduleRow) ------------------ */
function InScheduleRow({
  row,
  index,
  frozen,
  onChange,
  onRemove,
}: {
  row: InScheduleInterval;
  index: number;
  frozen?: boolean;
  onChange: (r: InScheduleInterval) => void;
  onRemove: () => void;
}) {
  const [open, setOpen] = useState(false);

  return (
    <div
      className={`rounded-xl transition-all overflow-hidden ${
        open
          ? 'border border-sky-400 bg-sky-50/70 shadow-sm ring-1 ring-sky-300/60'
          : row.enabled
          ? 'border border-slate-300 bg-slate-50/90 hover:bg-slate-100/80 hover:border-slate-400 shadow-2xs'
          : 'border border-slate-200/80 bg-slate-100/50 opacity-60'
      }`}
    >
      {frozen && (
        <div className="px-2 pt-1 pb-1 text-[10px] font-bold text-amber-800 uppercase tracking-wide flex items-center gap-1.5 bg-amber-50/90 border-b border-amber-100">
          <Lock className="w-3 h-3 text-amber-600 shrink-0" />
          <span>Pouze pro čtení (aktivní rychlá blokace)</span>
        </div>
      )}

      {/* Záhlaví dílčí karty časovače */}
      <div
        className={`flex items-center gap-1.5 px-2 py-2 transition-colors ${
          open ? 'bg-sky-100/60 border-b border-sky-200/70' : row.enabled ? 'bg-slate-50/90' : 'bg-slate-100/50'
        }`}
      >
        <div
          role="button"
          tabIndex={0}
          onClick={() => setOpen((o) => !o)}
          className="flex-1 flex items-center justify-between gap-1.5 min-w-0 text-left cursor-pointer select-none"
        >
          <div className="flex flex-col min-w-0 flex-1 py-0.5">
            <div className="flex items-center gap-1.5 text-[13px] font-bold text-slate-800 flex-nowrap">
              {/* Číslo intervalu pro okamžité vizuální odlišení karet */}
              <span
                className={`shrink-0 w-5 h-5 rounded flex items-center justify-center text-[10.5px] font-black transition-colors ${
                  open
                    ? 'bg-sky-600 text-white shadow-2xs'
                    : row.enabled
                    ? 'bg-white text-slate-700 border border-slate-300 shadow-2xs'
                    : 'bg-slate-200 text-slate-400'
                }`}
              >
                {index + 1}
              </span>

              <TimeField
                mode="hm"
                disabled={frozen}
                seconds={hmToSec(row.from)}
                onChange={(s) => onChange({ ...row, from: secToHm(s) })}
              />
              <span className="text-slate-400 font-medium">–</span>
              <TimeField
                mode="hm"
                disabled={frozen}
                seconds={hmToSec(row.to)}
                onChange={(s) => onChange({ ...row, to: secToHm(s) })}
              />
              <span className="text-slate-300">·</span>
              <span
                className={`text-[10px] font-black px-1.5 py-0.5 rounded ${
                  row.action === 'allow'
                    ? 'bg-emerald-100 text-emerald-800 border border-emerald-300 shadow-2xs'
                    : 'bg-amber-100 text-amber-900 border border-amber-300 shadow-2xs'
                }`}
              >
                {row.action === 'allow' ? 'POVOLENO' : 'VÝLUKA'}
              </span>
            </div>

            {/* Dny v týdnu */}
            <div className="flex items-center gap-1 text-[10.5px] text-slate-500 font-semibold mt-1">
              <span>
                {row.days.length === 7
                  ? 'Celý týden'
                  : row.days.length === 5 && [0, 1, 2, 3, 4].every((d) => row.days.includes(d as WeekdayIndex))
                  ? 'Pracovní dny'
                  : row.days.length === 2 && [5, 6].every((d) => row.days.includes(d as WeekdayIndex))
                  ? 'Víkend'
                  : row.days.map((d) => WEEKDAY_SHORT[d]).join(', ')}
              </span>
            </div>
          </div>

          <ChevronDown
            className={`w-4 h-4 text-slate-400 shrink-0 transition-transform duration-200 mr-0.5 ${
              open ? 'rotate-180 text-sky-600' : ''
            }`}
          />
        </div>

        {/* Zapnutí/vypnutí intervalu */}
        <button
          type="button"
          disabled={frozen}
          title={frozen ? 'Plán je uzamčen' : row.enabled ? 'Deaktivovat interval' : 'Aktivovat interval'}
          onClick={(e) => {
            e.stopPropagation();
            if (frozen) return;
            onChange({ ...row, enabled: !row.enabled });
          }}
          className={`p-1 rounded-md shrink-0 transition-colors cursor-pointer ${
            frozen
              ? row.enabled
                ? 'text-emerald-500 bg-emerald-50/60 cursor-not-allowed'
                : 'text-slate-200 cursor-not-allowed'
              : row.enabled
              ? 'text-emerald-600 bg-white border border-emerald-200/80 shadow-2xs hover:bg-emerald-50'
              : 'text-slate-300 hover:text-slate-400 bg-white/60'
          }`}
        >
          <CheckCircle2 className="w-5 h-5" />
        </button>
      </div>

      {/* Otevřená karta detailu intervalu */}
      {open && (
        <div className="p-2 space-y-2 bg-sky-50/40">
          <div className="flex items-center justify-between gap-2 p-2 rounded-xl bg-white border border-sky-200 shadow-2xs">
            <div>
              <span className="text-[12px] font-bold text-slate-800 block">Režim intervalu</span>
              <span className="text-[10.5px] text-slate-500">Výluka = stisk tlačítka je v okně ignorován</span>
            </div>
            <div className="w-44 shrink-0">
              <Seg<'block' | 'allow'>
                value={row.action ?? 'block'}
                disabled={frozen}
                onChange={(v) => onChange({ ...row, action: v })}
                options={[
                  { v: 'block', label: 'VÝLUKA' },
                  { v: 'allow', label: 'POVOLENO' },
                ]}
              />
            </div>
          </div>

          {/* Dny v týdnu */}
          <div className="bg-white p-2 rounded-xl border border-slate-200 shadow-2xs space-y-1">
            <span className="text-[10.5px] font-black uppercase text-slate-500 tracking-wider block pl-0.5">
              Aktivní dny v týdnu
            </span>
            <DayPicker days={row.days} disabled={frozen} onChange={(days) => onChange({ ...row, days })} />
          </div>

          <div className="flex items-center justify-between pt-1">
            <button
              type="button"
              disabled={frozen}
              onClick={onRemove}
              className={`text-[12px] font-bold px-2.5 py-1.5 rounded-lg border flex items-center gap-1.5 transition-colors cursor-pointer ${
                frozen
                  ? 'text-slate-300 border-slate-200 cursor-not-allowed'
                  : 'text-rose-600 bg-white border-rose-200 hover:bg-rose-50 active:bg-rose-100 shadow-2xs'
              }`}
            >
              <Trash2 className="w-4 h-4" />
              <span>Smazat interval</span>
            </button>

            <button
              type="button"
              onClick={() => setOpen(false)}
              className="text-[12px] font-bold text-sky-800 bg-white border border-sky-300 hover:bg-sky-50 active:bg-sky-100 px-3.5 py-1.5 rounded-lg shadow-2xs transition-colors cursor-pointer"
            >
              Hotovo
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

/* ------------------ Seznam plánů (InScheduler) ------------------ */
function InScheduler({
  schedule,
  frozen,
  onChange,
}: {
  schedule: InScheduleInterval[];
  frozen?: boolean;
  onChange: (s: InScheduleInterval[]) => void;
}) {
  const addRow = () => {
    if (frozen) return;
    if (schedule.length >= 10) return;
    const newRow: InScheduleInterval = {
      id: `in_sch_${Date.now()}`,
      enabled: true,
      from: '22:00',
      to: '06:00',
      days: [0, 1, 2, 3, 4, 5, 6],
      action: 'block',
    };
    onChange([...schedule, newRow]);
  };

  return (
    <div className="py-1.5 space-y-2">
      {schedule.map((row, idx) => (
        <InScheduleRow
          key={row.id}
          row={row}
          index={idx}
          frozen={frozen}
          onChange={(updated) => onChange(schedule.map((r, i) => (i === idx ? updated : r)))}
          onRemove={() => onChange(schedule.filter((_, i) => i !== idx))}
        />
      ))}
      {schedule.length < 10 && !frozen && (
        <button
          type="button"
          onClick={addRow}
          className="w-full py-2.5 rounded-xl border-2 border-dashed border-sky-300 text-[13px] font-bold text-sky-700 bg-sky-50/50 hover:bg-sky-50 active:bg-sky-100 flex items-center justify-center gap-1.5 transition-colors shadow-2xs cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>Přidat interval výluky ({schedule.length}/10)</span>
        </button>
      )}
    </div>
  );
}

/* ------------------ Odznak aktivní rychlé blokace (InQuickLockBadge) ------------------ */
function InQuickLockBadge({ value, onOff }: { value: QuickLock; onOff: () => void }) {
  if (value === 'none') return null;
  const item = IN_QUICK_LOCK_ITEMS.find((i) => i.id === value);
  return (
    <div className="p-2.5 rounded-xl border border-orange-200 bg-amber-50 text-orange-950 flex items-center justify-between gap-2 shadow-xs">
      <div className="flex items-center gap-2 min-w-0">
        <Zap className="w-4 h-4 text-orange-600 shrink-0" />
        <div className="min-w-0">
          <span className="block text-[12px] font-bold text-orange-900 truncate">
            Aktivní blokace: {item?.title}
          </span>
          <span className="block text-[10.5px] text-orange-700 truncate">{item?.subtitle}</span>
        </div>
      </div>
      <button
        type="button"
        onClick={onOff}
        className="px-2.5 py-1 text-[11px] font-bold bg-white text-orange-800 rounded-lg border border-orange-300 hover:bg-orange-100 shrink-0 cursor-pointer"
      >
        Vypnout
      </button>
    </div>
  );
}

/* ------------------ Volba režimů blokace tlačítka (InQuickLockPicker) ------------------ */
function InQuickLockPicker({
  value,
  delaySec,
  days,
  onChange,
}: {
  value: QuickLock;
  delaySec: number;
  days: string[];
  onChange: (patch: {
    quickLock: QuickLock;
    quickLockDelaySec?: number;
    quickLockCalendarDays?: string[];
  }) => void;
}) {
  const [calendarOpen, setCalendarOpen] = useState(false);

  return (
    <div className="space-y-1.5 pt-1">
      {IN_QUICK_LOCK_ITEMS.map((item) => {
        const selected = item.id === value;
        return (
          <div
            key={item.id}
            className={`rounded-xl border transition-all overflow-hidden ${
              selected
                ? 'border-sky-400 bg-sky-50/80 shadow-xs ring-1 ring-sky-300/50'
                : 'border-slate-200/80 bg-white hover:bg-slate-50'
            }`}
          >
            <button
              type="button"
              onClick={() => onChange({ quickLock: item.id })}
              className="w-full p-2.5 text-left flex items-start gap-2.5 select-none cursor-pointer"
            >
              <span
                className={`w-4 h-4 mt-0.5 rounded-full border flex items-center justify-center shrink-0 ${
                  selected ? 'border-sky-600 bg-sky-600' : 'border-slate-300 bg-white'
                }`}
              >
                {selected && <span className="w-1.5 h-1.5 rounded-full bg-white" />}
              </span>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1.5">
                  <span
                    className={`text-[12.5px] font-bold ${
                      selected ? 'text-sky-950 font-black' : 'text-slate-800'
                    }`}
                  >
                    {item.title}
                  </span>
                </div>
                <span className="block text-[11px] text-slate-500 mt-0.5 leading-snug">
                  {item.subtitle}
                </span>
              </div>
            </button>

            {/* Nastavení pro delay */}
            {item.id === 'off_midnight_delay' && selected && (
              <div className="px-3 pb-3 pt-1 border-t border-sky-200/60 bg-white/70">
                <div className="flex items-center justify-between text-[12px] font-semibold text-slate-700">
                  <span>Doba trvání blokace (odpočet):</span>
                  <TimeField
                    mode="hms"
                    seconds={delaySec}
                    onChange={(s) =>
                      onChange({ quickLock: 'off_midnight_delay', quickLockDelaySec: s })
                    }
                    label="Délka blokace Delay"
                    className="underline decoration-dotted decoration-sky-600 underline-offset-2 font-mono font-black text-sky-800"
                  />
                </div>
              </div>
            )}

            {/* Nastavení pro vybrané dny kalendáře */}
            {item.id === 'off_calendar' && selected && (
              <div className="px-3 pb-3 pt-2 space-y-2 border-t border-sky-200/60 bg-white/70">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-[12px] font-bold text-slate-700">
                    Vybrané dny kalendáře výluk ({days.length}):
                  </span>
                  <button
                    type="button"
                    onClick={() => setCalendarOpen(true)}
                    className="px-2.5 py-1.5 rounded-lg bg-purple-600 hover:bg-purple-500 active:bg-purple-700 text-white text-[11.5px] font-black shadow-2xs flex items-center gap-1.5 transition-transform active:scale-95 cursor-pointer"
                  >
                    <CalendarIcon className="w-3.5 h-3.5" />
                    <span>Otevřít kalendář</span>
                  </button>
                </div>

                {days.length === 0 ? (
                  <div
                    onClick={() => setCalendarOpen(true)}
                    className="p-3 rounded-xl border border-dashed border-purple-300 bg-purple-50/60 text-[11.5px] text-purple-900 text-center font-medium cursor-pointer hover:bg-purple-50 active:bg-purple-100 transition-colors"
                  >
                    Klepněte pro otevření kalendáře a výběr <strong>jednotlivých dnů</strong> nebo <strong>celého období (od–do)</strong>.
                  </div>
                ) : (
                  <div className="flex flex-wrap gap-1.5 max-h-28 overflow-y-auto p-1 bg-white/80 rounded-xl border border-slate-200">
                    {days.map((d) => (
                      <span
                        key={d}
                        className="inline-flex items-center gap-1 text-[11px] font-bold bg-purple-100 text-purple-800 rounded-full px-2.5 py-0.5 shadow-2xs"
                      >
                        <CalendarIcon className="w-3 h-3 text-purple-600" />
                        {d}
                        <button
                          type="button"
                          onClick={() =>
                            onChange({
                              quickLock: 'off_calendar',
                              quickLockCalendarDays: days.filter((x) => x !== d),
                            })
                          }
                          className="text-purple-400 hover:text-purple-700 ml-0.5 font-bold cursor-pointer"
                        >
                          ×
                        </button>
                      </span>
                    ))}
                  </div>
                )}

                {calendarOpen && (
                  <CalendarPickerModal
                    selectedDays={days}
                    onChange={(newDays) =>
                      onChange({
                        quickLock: 'off_calendar',
                        quickLockCalendarDays: newDays,
                      })
                    }
                    onClose={() => setCalendarOpen(false)}
                  />
                )}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

export interface InConfigCardProps {
  config: InConfig;
  runtime: InRuntime;
  role: Role;
  onChange: (patch: Partial<InConfig>) => void;
  onRuntimeCommand?: (cmd: 'virtual_short_press' | 'virtual_long_press' | 'virtual_toggle') => void;
}

export function InConfigCard({
  config,
  runtime,
  role,
  onChange,
  onRuntimeCommand,
}: InConfigCardProps) {
  const isAdmin = role === 'admin';
  const isManager = role === 'manager';
  const roleName = role === 'admin' ? 'Admin' : role === 'manager' ? 'Manažer' : 'Klient';

  const [justSorted, setJustSorted] = useState(false);

  const sortSchedule = () => {
    const sorted = [...config.schedule].sort((a, b) => hmToSec(a.from) - hmToSec(b.from));
    onChange({ schedule: sorted });
    setJustSorted(true);
    setTimeout(() => setJustSorted(false), 2000);
  };

  const typeLabels: Record<InType, string> = {
    button: 'Tlačítko (Impuls)',
    switch: 'Přepínač (Stav)',
    door: 'Magnet (Dveře/Okno)',
    pir: 'Pohybové čidlo PIR',
    level: 'Hladinový plovák',
    generic: 'Obecný kontakt',
  };

  const isActive = runtime.state === 'active';
  const blockInfo = isInputBlocked(config);
  const isBlocked = blockInfo.blocked;

  return (
    <div className="w-full max-w-md mx-auto space-y-3 pb-8">
      {/* 1. Trvale fixovaný (sticky) panel nahoře */}
      <div className="sticky top-14 z-30 bg-white/95 backdrop-blur-md border border-slate-300/80 rounded-xl px-3.5 py-2.5 shadow-sm flex items-center justify-between gap-2">
        <div className="min-w-0">
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="text-[14.5px] font-black tracking-tight text-slate-900 truncate">
              {config.name || 'Vstup IN'}
            </span>
            <span className="text-[11px] font-bold text-slate-500">
              ({roleName})
            </span>
          </div>
          <div className="flex items-center gap-1.5 mt-0.5 text-[11px] text-slate-500 font-semibold">
            <span>GPIO {config.gpioPin}</span>
            <span>•</span>
            <span className="truncate">{typeLabels[config.type]}</span>
          </div>
        </div>

        {/* Zrcadlení stavu a indikace blokace */}
        <div className="shrink-0 flex items-center gap-2">
          {isBlocked && (
            <span
              title={blockInfo.reason}
              className="text-[10px] font-black px-1.5 py-0.5 rounded bg-amber-100 text-amber-900 border border-amber-300 flex items-center gap-1 animate-pulse"
            >
              <Lock className="w-3 h-3 text-amber-700" />
              <span>BLOKACE</span>
            </span>
          )}
          <div
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg border font-black text-[12px] tracking-wide transition-all shadow-2xs ${
              isActive
                ? 'bg-emerald-500 text-white border-emerald-600 animate-pulse'
                : 'bg-slate-100 text-slate-600 border-slate-300'
            }`}
          >
            <span
              className={`w-2 h-2 rounded-full ${
                isActive ? 'bg-white' : 'bg-slate-400'
              }`}
            />
            <span>{isActive ? 'SEPNUTO' : 'ROZEPNUTO'}</span>
          </div>
        </div>
      </div>

      {/* Rychlý testovací pruh pro ruční simulaci z telefonu přímo v kartě */}
      <div className="rounded-xl border border-sky-300 bg-sky-50/70 p-2.5 flex items-center justify-between gap-2 shadow-2xs">
        <div className="flex items-center gap-2 min-w-0">
          <Fingerprint className="w-4 h-4 text-sky-700 shrink-0" />
          <span className="text-[11.5px] font-bold text-sky-950 truncate">
            Virtuální sepnutí z telefonu:
          </span>
        </div>
        <div className="flex items-center gap-1.5 shrink-0">
          {config.type === 'button' ? (
            <>
              <button
                type="button"
                onClick={() => onRuntimeCommand?.('virtual_short_press')}
                className="px-2 py-1 bg-sky-600 hover:bg-sky-700 text-white text-[11px] font-extrabold rounded-md shadow-2xs transition-all active:scale-95 cursor-pointer"
              >
                Krátký klik
              </button>
              <button
                type="button"
                onClick={() => onRuntimeCommand?.('virtual_long_press')}
                className="px-2 py-1 bg-sky-100 hover:bg-sky-200 text-sky-900 border border-sky-300 text-[11px] font-extrabold rounded-md shadow-2xs transition-all active:scale-95 cursor-pointer"
              >
                Dlouhý stisk
              </button>
            </>
          ) : (
            <button
              type="button"
              onClick={() => onRuntimeCommand?.('virtual_toggle')}
              className="px-3 py-1 bg-sky-600 hover:bg-sky-700 text-white text-[11px] font-extrabold rounded-md shadow-2xs transition-all active:scale-95 cursor-pointer"
            >
              {isActive ? 'Rozepnout' : 'Sepnout'}
            </button>
          )}
        </div>
      </div>

      {/* 2. Karta: Zařízení a hardware ESP32 */}
      <Section
        title="Zařízení a hardware ESP32"
        icon={<Cpu className="w-4 h-4" />}
        defaultOpen
      >
        <div className="space-y-2 py-1">
          <Field label="Přiřazené zařízení (IoT modul)">
            <input
              type="text"
              disabled
              value={`${config.deviceName} (${config.deviceId})`}
              className="w-full border border-slate-300 rounded-lg px-3 py-1.5 text-[13px] font-semibold bg-slate-100 text-slate-700 cursor-not-allowed"
            />
          </Field>

          <div className="grid grid-cols-2 gap-2">
            <Field label="Vstupní svorka / GPIO pin" hint="Fyzický pin na desce ESP32">
              <select
                value={config.gpioPin}
                disabled={!isAdmin}
                onChange={(e) => onChange({ gpioPin: Number(e.target.value) })}
                className="w-full border border-slate-300 rounded-lg px-2.5 py-1.5 text-[13px] font-bold bg-white disabled:bg-slate-50"
              >
                {[4, 5, 12, 13, 14, 15, 16, 18, 19, 21, 22, 23, 25, 26, 27, 32, 33, 34, 35].map((pin) => (
                  <option key={pin} value={pin}>
                    GPIO {pin} {pin >= 34 ? '(Pouze vstup)' : ''}
                  </option>
                ))}
              </select>
            </Field>

            <Field label="Vnitřní rezistor ESP32" hint="Doporučeno Pull-Up k GND">
              <select
                value={config.pullResistor}
                disabled={!isAdmin}
                onChange={(e) => onChange({ pullResistor: e.target.value as InPullResistor })}
                className="w-full border border-slate-300 rounded-lg px-2.5 py-1.5 text-[13px] font-bold bg-white disabled:bg-slate-50"
              >
                <option value="pullup">Vnitřní Pull-Up (k GND)</option>
                <option value="pulldown">Vnitřní Pull-Down (k +3.3V)</option>
                <option value="none">Bez odporu (Externí)</option>
              </select>
            </Field>
          </div>
        </div>
      </Section>

      {/* 3. Karta: Název a umístění */}
      <Section
        title="Název a umístění"
        icon={<Tag className="w-4 h-4" />}
        defaultOpen
      >
        <div className="space-y-2 py-1">
          <Field label="Název vstupu" hint="Přejímá se do záhlaví a dlaždic na ploše">
            <input
              type="text"
              disabled={!isAdmin && !isManager}
              value={config.name}
              onChange={(e) => onChange({ name: e.target.value })}
              placeholder="Např. Tlačítko chodba, Kontakt vrata"
              className="w-full border border-slate-300 rounded-lg px-3 py-1.5 text-[13.5px] font-bold text-slate-900 bg-white disabled:bg-slate-50"
            />
          </Field>

          <Field label="Místnost (Přiřazení do prostoru)">
            <select
              value={config.room}
              disabled={!isAdmin && !isManager}
              onChange={(e) => onChange({ room: Number(e.target.value) })}
              className="w-full border border-slate-300 rounded-lg px-3 py-1.5 text-[13px] font-semibold bg-white disabled:bg-slate-50"
            >
              {Object.entries(ROOM_NAMES).map(([id, label]) => (
                <option key={id} value={id}>
                  {label}
                </option>
              ))}
            </select>
          </Field>

          <Field label="Typ připojeného prvku / senzoru">
            <Seg<InType>
              value={config.type}
              disabled={!isAdmin}
              onChange={(v) => onChange({ type: v })}
              options={[
                { v: 'button', label: 'Tlačítko' },
                { v: 'switch', label: 'Vypínač' },
                { v: 'door', label: 'Dveře/Okno' },
                { v: 'pir', label: 'PIR' },
                { v: 'level', label: 'Plovák' },
              ]}
            />
          </Field>
        </div>
      </Section>

      {/* 4. Karta: Elektrická logika a filtrace (Debounce) */}
      <Section
        title="Elektrická logika a filtrace"
        icon={<Sliders className="w-4 h-4" />}
        defaultOpen
      >
        <div className="space-y-2.5 py-1">
          <Field
            label="Typ kontaktu a polarita (Inverze logiky)"
            hint="NO: Sepnuto = Log 1 (kontakt spojen). NC: Sepnuto = Log 0 (rozpínací, bezpečnostní okruh)."
          >
            <Seg<InContactType>
              value={config.contactType}
              disabled={!isAdmin}
              onChange={(v) => onChange({ contactType: v })}
              options={[
                { v: 'no', label: 'Spínací (NO - Sepnuto = 1)' },
                { v: 'nc', label: 'Rozpínací (NC - Sepnuto = 0)' },
              ]}
            />
          </Field>

          <Field
            label="Hardwarový filtr zákmytů (Debounce)"
            hint="Eliminuje desítky falešných impulzů při mechanickém dosednutí kontaktů."
          >
            <Seg<number>
              value={config.debounceMs}
              disabled={!isAdmin}
              onChange={(v) => onChange({ debounceMs: v })}
              options={[
                { v: 10, label: '10 ms' },
                { v: 20, label: '20 ms' },
                { v: 30, label: '30 ms (doporučeno)' },
                { v: 50, label: '50 ms' },
                { v: 100, label: '100 ms' },
              ]}
            />
          </Field>

          {config.type === 'button' && (
            <Field
              label="Prahová doba pro detekci dlouhého stisku (Long Press)"
              hint="Doba nepřetržitého držení tlačítka pro aktivaci dlouhého stisku."
            >
              <Seg<number>
                value={config.longPressThresholdMs}
                disabled={!isAdmin}
                onChange={(v) => onChange({ longPressThresholdMs: v })}
                options={[
                  { v: 500, label: '500 ms' },
                  { v: 1000, label: '1 s' },
                  { v: 1500, label: '1.5 s' },
                  { v: 2000, label: '2 s' },
                ]}
              />
            </Field>
          )}
        </div>
      </Section>

      {/* 5. Karta: Osobní zobrazení na ploše */}
      <Section
        title="Osobní zobrazení na ploše"
        icon={<Sparkles className="w-4 h-4" />}
        defaultOpen
      >
        <div className="space-y-2 py-1">
          <Field label="Velikost dlaždice v rastru">
            <Seg<TileSize>
              value={config.prefsByRole[role]?.tileSize ?? '1/1'}
              onChange={(v) =>
                onChange({
                  prefsByRole: {
                    ...config.prefsByRole,
                    [role]: { ...config.prefsByRole[role], tileSize: v },
                  },
                })
              }
              options={[
                { v: '1/1', label: '1/1 (Plná)' },
                { v: '1/2', label: '1/2 (Pruh)' },
                { v: '1/4', label: '1/4 (Kostka)' },
              ]}
            />
          </Field>

          <div className="flex items-center justify-between py-1 border-t border-slate-100">
            <div>
              <span className="text-[12px] font-bold text-slate-700 block">Zobrazit v místnosti</span>
              <span className="text-[10.5px] text-slate-500">Zda má být dlaždice viditelná na přehledu místnosti</span>
            </div>
            <button
              type="button"
              onClick={() =>
                onChange({
                  prefsByRole: {
                    ...config.prefsByRole,
                    [role]: {
                      ...config.prefsByRole[role],
                      showInRoom: !config.prefsByRole[role]?.showInRoom,
                    },
                  },
                })
              }
              className={`px-3 py-1 text-[11px] font-extrabold rounded-md border transition-all cursor-pointer ${
                config.prefsByRole[role]?.showInRoom
                  ? 'bg-sky-600 text-white border-sky-600 shadow-2xs'
                  : 'bg-slate-100 text-slate-600 border-slate-300'
              }`}
            >
              {config.prefsByRole[role]?.showInRoom ? 'ZOBRAZIT' : 'SKRÝT'}
            </button>
          </div>
        </div>
      </Section>

      {/* 6. Časový plán: Časovače vyloučení tlačítka z činnosti */}
      <Section
        title="Časový plán (Časovače výluk)"
        icon={<CalendarIcon className="w-4 h-4" />}
        counter={config.schedule.filter((s) => s.enabled).length}
        badge={blockInfo.reason?.includes('Časový plán') ? 'VÝLUKA' : undefined}
        defaultOpen
        headerAction={
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              sortSchedule();
            }}
            title="Setřídit časové plány podle počátečního času (00:00 → 23:59)"
            className={`text-[11.5px] font-bold px-2.5 py-1 rounded-lg border flex items-center gap-1 transition-all select-none shadow-2xs cursor-pointer ${
              justSorted
                ? 'border-emerald-300 bg-emerald-50 text-emerald-800'
                : 'border-sky-300 bg-sky-50 text-sky-800 hover:bg-sky-100 active:bg-sky-200'
            }`}
          >
            {justSorted ? (
              <>
                <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                <span>Setřízeno!</span>
              </>
            ) : (
              <>
                <ArrowUpDown className="w-3.5 h-3.5 text-sky-600 shrink-0" />
                <span>Setřídit</span>
              </>
            )}
          </button>
        }
      >
        {/* Informační pruh, pokud je aktivní blokace z karty Blokace */}
        {config.quickLock !== 'none' && (
          <div className="mt-2 p-2.5 rounded-xl border border-amber-200 bg-amber-50 text-amber-900 flex items-center gap-2 shadow-xs">
            <Lock className="w-4 h-4 text-amber-700 shrink-0" />
            <span className="text-[12px] font-bold leading-tight">
              Časový plán je uzamčen (pouze pro čtení) – je aktivní režim blokace tlačítka ({IN_QUICK_LOCK_ITEMS.find((i) => i.id === config.quickLock)?.title}).
            </span>
          </div>
        )}

        {/* Přepínač interpretace časového plánu */}
        <div className="mt-2 p-2.5 rounded-xl border border-sky-200 bg-sky-50/70 text-sky-950 space-y-2 shadow-2xs">
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <div className="flex items-center gap-1.5 min-w-0">
              <Clock className="w-4 h-4 text-sky-700 shrink-0" />
              <span className="text-[12px] font-bold text-sky-950 truncate">
                Funkce časového plánu pro tlačítko:
              </span>
            </div>
            <div className="inline-flex rounded-lg border border-sky-200 bg-white p-0.5 shrink-0 shadow-2xs">
              <button
                type="button"
                onClick={() => onChange({ scheduleMode: 'exclusion' })}
                className={`px-2 py-0.5 text-[11px] font-bold rounded-md transition-all cursor-pointer ${
                  (config.scheduleMode ?? 'exclusion') === 'exclusion'
                    ? 'bg-sky-600 text-white shadow-2xs'
                    : 'text-sky-700 hover:bg-sky-50'
                }`}
              >
                Výluky (Vyloučení z činnosti)
              </button>
              <button
                type="button"
                onClick={() => onChange({ scheduleMode: 'window' })}
                className={`px-2 py-0.5 text-[11px] font-bold rounded-md transition-all cursor-pointer ${
                  config.scheduleMode === 'window'
                    ? 'bg-sky-600 text-white shadow-2xs'
                    : 'text-sky-700 hover:bg-sky-50'
                }`}
              >
                Aktivní časové okno
              </button>
            </div>
          </div>
          <div className="text-[11px] font-medium text-sky-800 leading-tight">
            {(config.scheduleMode ?? 'exclusion') === 'exclusion'
              ? 'Výluky tlačítka: V níže nastavených časových intervalech je tlačítko vyloučeno z činnosti (stisk nereaguje a nepředává se do systému). Mimo tyto intervaly tlačítko funguje standardně.'
              : 'Aktivní časové okno: Tlačítko smí ovládat výstup POUZE v nastavených časových intervalech níže. Mimo tyto intervaly je stisk tlačítka blokován.'}
          </div>
        </div>

        {/* Seznam intervalů výluk tlačítka */}
        <InScheduler
          schedule={config.schedule}
          frozen={config.quickLock !== 'none'}
          onChange={(s) => onChange({ schedule: s })}
        />
      </Section>

      {/* 7. Karta: Blokace tlačítka – kompletní obdoba karty z OUT */}
      <Section
        title="Blokace tlačítka"
        icon={<Zap className="w-4 h-4" />}
        badge={config.quickLock !== 'none' ? 'BLOKOVÁNO' : undefined}
        defaultOpen
      >
        <div className="space-y-2 py-1">
          <p className="text-[11px] text-slate-600 font-medium leading-relaxed">
            Kompletní režimy blokace pro okamžité dočasné nebo trvalé vyřazení tlačítka z činnosti (obdoba karty z OUT). Blokace je nadřazena časovému plánu a brání jak fyzickému sepnutí na ESP32, tak virtuálnímu ovládání z mobilu.
          </p>

          {/* Informační odznak aktivní blokace */}
          {config.quickLock !== 'none' && (
            <InQuickLockBadge
              value={config.quickLock}
              onOff={() => onChange({ quickLock: 'none' })}
            />
          )}

          {/* Kompletní nabídka všech 6 režimů blokace přesně jako u OUT */}
          <InQuickLockPicker
            value={config.quickLock}
            delaySec={config.quickLockDelaySec}
            days={config.quickLockCalendarDays}
            onChange={(p) => onChange(p)}
          />
        </div>
      </Section>

      {/* 8. Karta: Zámek ručního ovládání z mobilu (TouchLock) */}
      <Section
        title="Zámek ručního ovládání z mobilu"
        icon={<Lock className="w-4 h-4" />}
      >
        <div className="space-y-2 py-1">
          <Field
            label="Zabezpečení virtuálního stisku v aplikaci"
            hint="Chrání před nechtěným spuštěním akce při náhodném dotyku v kapse (např. vrata, brána)."
          >
            <Seg<InTouchLock>
              value={config.touchLock}
              disabled={!isAdmin && !isManager}
              onChange={(v) => onChange({ touchLock: v })}
              options={[
                { v: 'none', label: 'Bez zámku' },
                { v: 'confirm', label: 'Potvrzení' },
                { v: 'slide', label: 'Posuvník' },
                { v: 'readonly', label: 'Pouze číst' },
              ]}
            />
          </Field>
        </div>
      </Section>

      {/* 9. Karta: Hlídání zaseknutého vstupu (Stuck Input Watchdog) */}
      <Section
        title="Hlídání trvalého sepnutí (Zaseknutí)"
        icon={<ShieldAlert className="w-4 h-4" />}
      >
        <div className="space-y-2 py-1">
          <div className="flex items-center justify-between">
            <div>
              <span className="text-[12px] font-bold text-slate-700 block">Hlídání zaseknutí spínače</span>
              <span className="text-[10.5px] text-slate-500">
                Upozorní, pokud zůstane tlačítko či plovák sepnutý déle než povolený čas.
              </span>
            </div>
            <button
              type="button"
              disabled={!isAdmin}
              onClick={() =>
                onChange({
                  stuckAlarm: {
                    ...config.stuckAlarm,
                    enabled: !config.stuckAlarm.enabled,
                  },
                })
              }
              className={`px-3 py-1 text-[11px] font-extrabold rounded-md border transition-all cursor-pointer ${
                config.stuckAlarm.enabled
                  ? 'bg-sky-600 text-white border-sky-600 shadow-2xs'
                  : 'bg-slate-100 text-slate-600 border-slate-300'
              }`}
            >
              {config.stuckAlarm.enabled ? 'ZAPNUTO' : 'VYPNUTO'}
            </button>
          </div>

          {config.stuckAlarm.enabled && (
            <div className="flex items-center justify-between p-2 rounded-lg border border-sky-200 bg-sky-50/70">
              <span className="text-[11.5px] font-bold text-slate-700">Maximální doba sepnutí:</span>
              <TimeField
                mode="hms"
                seconds={config.stuckAlarm.maxSec}
                disabled={!isAdmin}
                onChange={(s) =>
                  onChange({
                    stuckAlarm: {
                      ...config.stuckAlarm,
                      maxSec: s,
                    },
                  })
                }
                className="underline decoration-dotted decoration-sky-500 underline-offset-2 font-mono text-[14.5px] font-black text-sky-800"
              />
            </div>
          )}
        </div>
      </Section>

      {/* 10. Karta: Notifikace */}
      <Section
        title="Push notifikace do mobilu"
        icon={<Bell className="w-4 h-4" />}
      >
        <div className="space-y-2 py-1">
          <Field label="Odesílat push notifikaci do mobilu">
            <Seg<InNotifyMode>
              value={config.notify}
              disabled={!isAdmin && !isManager}
              onChange={(v) => onChange({ notify: v })}
              options={[
                { v: 'none', label: 'Nikdy' },
                { v: 'on_active', label: 'Při sepnutí' },
                { v: 'on_inactive', label: 'Při rozepnutí' },
                { v: 'both', label: 'Při obou' },
                { v: 'stuck', label: 'Jen porucha' },
              ]}
            />
          </Field>
        </div>
      </Section>

      {/* 11. Karta: Oprávnění rolí */}
      <Section
        title="Oprávnění rolí (Viditelnost a ovládání)"
        icon={<ShieldCheck className="w-4 h-4" />}
      >
        <div className="space-y-2 py-1">
          <p className="text-[11px] text-slate-600 font-medium leading-relaxed">
            Určuje, kdo smí z mobilního telefonu provést virtuální stisk / sepnutí vstupu, a kdo má vstup pouze ke čtení.
          </p>

          <div className="divide-y divide-slate-100 rounded-lg border border-slate-200 overflow-hidden">
            {(['client', 'manager', 'admin'] as Role[]).map((r) => {
              const label = r === 'admin' ? 'Administrátor' : r === 'manager' ? 'Manažer' : 'Běžný Klient';
              const canOp = config.access[r]?.operate ?? true;
              return (
                <div key={r} className="p-2 flex items-center justify-between bg-white hover:bg-slate-50">
                  <span className="text-[12px] font-bold text-slate-800">{label}</span>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      disabled={!isAdmin || r === 'admin'}
                      onClick={() =>
                        onChange({
                          access: {
                            ...config.access,
                            [r]: { ...config.access[r], operate: !canOp },
                          },
                        })
                      }
                      className={`px-2.5 py-0.5 text-[10.5px] font-bold rounded border transition-all cursor-pointer ${
                        canOp
                          ? 'bg-emerald-50 text-emerald-800 border-emerald-300'
                          : 'bg-slate-100 text-slate-500 border-slate-300'
                      }`}
                    >
                      {canOp ? 'Může ovládat' : 'Jen sledovat'}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </Section>
    </div>
  );
}
