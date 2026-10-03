import { useState } from 'react';
import type { ReactNode } from 'react';
import {
  CheckCircle2,
  ChevronDown,
  Plus,
  Trash2,
  Zap,
  Info,
  Calendar,
  Lock,
  Shield,
  Users,
  Link2,
  Sliders,
  Sparkles,
  Eye,
  EyeOff,
  ArrowUpDown,
  Check,
} from 'lucide-react';
import type {
  OutConfig,
  OutRuntime,
  Role,
  TileSize,
  NotifyMode,
  OutMode,
  ThermostatProgram,
  OnOff,
  ScheduleInterval,
  InterlockRule,
  QuickLock,
  WeekdayIndex,
} from '../types';
import { catalog } from './fixtures';
import { TimeField } from './TimeWheel';
import { TempField } from './TempWheel';
import { CalendarPickerModal } from './CalendarPicker';

const ROLE_LABEL: Record<Role, string> = {
  client: 'Klient',
  manager: 'Manažer',
  admin: 'Admin',
};

const DAY_SHORT = ['Po', 'Út', 'St', 'Čt', 'Pá', 'So', 'Ne'];
const WORKDAYS: WeekdayIndex[] = [0, 1, 2, 3, 4];
const WEEKEND: WeekdayIndex[] = [5, 6];
const ALL_DAYS: WeekdayIndex[] = [0, 1, 2, 3, 4, 5, 6];

function sameDays(a: WeekdayIndex[], b: WeekdayIndex[]): boolean {
  if (a.length !== b.length) return false;
  const sa = [...a].sort();
  const sb = [...b].sort();
  return sa.every((val, i) => val === sb[i]);
}

/** Individuální výběr dnů (zaklikávací tlačítka) + rychlé předvyplnění. */
export function DayPicker({
  days,
  onChange,
  disabled,
}: {
  days: WeekdayIndex[];
  onChange: (d: WeekdayIndex[]) => void;
  disabled?: boolean;
}) {
  const toggle = (d: WeekdayIndex) => {
    if (disabled) return;
    onChange(days.includes(d) ? days.filter((x) => x !== d) : [...days, d].sort());
  };

  const presetBtn = (label: string, set: WeekdayIndex[]) => {
    const isSelected = sameDays(days, set);
    return (
      <button
        type="button"
        disabled={disabled}
        onClick={() => onChange(set)}
        className={`w-1/3 min-w-0 flex-1 basis-0 py-1.5 px-1 rounded-lg text-[11px] font-bold border transition-colors whitespace-nowrap text-center truncate select-none ${
          disabled
            ? 'border-slate-200 bg-slate-50 text-slate-400 cursor-not-allowed'
            : isSelected
            ? 'border-sky-500 bg-sky-100/90 text-sky-800 shadow-2xs ring-1 ring-sky-400/30'
            : 'border-slate-200 bg-slate-50 text-slate-600 hover:bg-slate-100'
        }`}
      >
        {label}
      </button>
    );
  };

  return (
    <div className={`space-y-1.5 pt-1 ${disabled ? 'opacity-70' : ''}`}>
      <div className="flex gap-1.5 w-full">
        {presetBtn('Pracovní dny', WORKDAYS)}
        {presetBtn('Víkend', WEEKEND)}
        {presetBtn('Celý týden', ALL_DAYS)}
      </div>
      <div className="flex gap-1">
        {([0, 1, 2, 3, 4, 5, 6] as WeekdayIndex[]).map((d) => (
          <button
            key={d}
            type="button"
            disabled={disabled}
            onClick={() => toggle(d)}
            className={`flex-1 h-[34px] rounded-lg text-[12px] font-bold border transition-colors ${
              disabled
                ? days.includes(d)
                  ? 'bg-slate-400 border-slate-400 text-white cursor-not-allowed'
                  : 'border-slate-200 bg-slate-100 text-slate-400 cursor-not-allowed'
                : days.includes(d)
                ? 'bg-sky-600 border-sky-600 text-white shadow-xs'
                : 'border-slate-200 bg-white text-slate-600 active:bg-slate-100'
            }`}
          >
            {DAY_SHORT[d]}
          </button>
        ))}
      </div>
    </div>
  );
}

/** Segmentový přepínač optimalizovaný pro dotyk */
export function Seg<T extends string | number | boolean>({
  value,
  options,
  onChange,
  disabled,
}: {
  value: T;
  options: { v: T; label: string; icon?: ReactNode }[];
  onChange: (v: T) => void;
  disabled?: boolean;
}) {
  return (
    <div
      className={`inline-flex w-full rounded-lg border border-slate-300 p-0.5 bg-slate-100/90 ${
        disabled ? 'opacity-50 pointer-events-none' : ''
      }`}
    >
      {options.map((o) => {
        const isSelected = o.v === value;
        return (
          <button
            key={String(o.v)}
            type="button"
            disabled={disabled}
            onClick={() => onChange(o.v)}
            className={`flex-1 py-1 px-1.5 text-[12px] font-semibold rounded-md transition-all flex items-center justify-center gap-1 ${
              isSelected
                ? 'bg-white text-sky-700 shadow-xs font-bold border border-slate-200/80'
                : 'text-slate-600 hover:text-slate-900 active:bg-slate-200/50'
            }`}
          >
            {o.icon}
            <span className="truncate">{o.label}</span>
          </button>
        );
      })}
    </div>
  );
}

export function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: ReactNode;
}) {
  return (
    <div className="flex flex-col gap-1.5 py-2.5">
      <span className="text-[12.5px] font-bold text-slate-800">{label}</span>
      {children}
      {hint && <span className="text-[11px] text-slate-500 leading-snug">{hint}</span>}
    </div>
  );
}

export function Section({
  title,
  icon,
  badge,
  valueBadge,
  statusDot,
  defaultOpen = false,
  children,
  locked,
  counter,
  headerAction,
}: {
  title: string;
  icon?: ReactNode;
  badge?: string;
  valueBadge?: string;
  statusDot?: 'online' | 'offline' | 'loading';
  defaultOpen?: boolean;
  children: ReactNode;
  locked?: boolean;
  counter?: string | number;
  headerAction?: ReactNode;
}) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <div className="rounded-xl border border-slate-300/80 bg-white shadow-sm overflow-hidden transition-all">
      <div className="w-full flex items-center justify-between gap-2 px-3 py-2.5 select-none hover:bg-slate-50/50 transition-colors">
        <div className="flex items-center gap-2 min-w-0 flex-1">
          <button
            type="button"
            onClick={() => setOpen((o) => !o)}
            className="flex items-center gap-2 min-w-0 text-left cursor-pointer"
          >
            {statusDot && (
              <span
                className={`w-2.5 h-2.5 rounded-full shrink-0 ${
                  statusDot === 'online'
                    ? 'bg-emerald-500 shadow-[0_0_6px_rgba(16,185,129,0.7)]'
                    : statusDot === 'offline'
                    ? 'bg-rose-500 shadow-[0_0_6px_rgba(244,63,94,0.7)]'
                    : 'bg-amber-400 animate-pulse'
                }`}
                title={`Zařízení je ${statusDot === 'online' ? 'Online' : statusDot === 'offline' ? 'Offline' : 'Načítám'}`}
              />
            )}
            {icon && <span className="text-slate-500 shrink-0">{icon}</span>}
            <span className="text-[13.5px] font-bold text-slate-900 truncate">{title}</span>
            {badge && (
              <span className="shrink-0 text-[10px] font-extrabold uppercase tracking-wider px-1.5 py-0.5 rounded-md bg-amber-100 text-amber-900 border border-amber-300">
                {badge}
              </span>
            )}
            {valueBadge && (
              <span className="shrink-0 text-[11px] font-bold px-1.5 py-0.5 rounded-md bg-slate-100 text-slate-700 border border-slate-200">
                {valueBadge}
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

          {/* Klikací mezera pro pohodlné zavření/otevření roletky klepnutím na pruh */}
          <div
            onClick={() => setOpen((o) => !o)}
            className="flex-1 self-stretch cursor-pointer min-w-4"
          />
        </div>

        <button
          type="button"
          onClick={() => setOpen((o) => !o)}
          className="p-1.5 text-slate-400 hover:text-sky-600 cursor-pointer rounded-md transition-colors shrink-0"
          title={open ? 'Sbalit sekci' : 'Rozbalit sekci'}
          aria-label={open ? 'Sbalit sekci' : 'Rozbalit sekci'}
        >
          <ChevronDown
            className={`w-4 h-4 transition-transform duration-200 ${
              open ? 'rotate-180 text-sky-600' : ''
            }`}
          />
        </button>
      </div>
      {open && (
        <div
          className={`px-2.5 pb-3 pt-1 border-t border-slate-100 divide-y divide-slate-100/90 ${
            locked ? 'opacity-60 pointer-events-none' : ''
          }`}
        >
          {children}
        </div>
      )}
    </div>
  );
}

export function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between py-2 text-[13px]">
      <span className="text-slate-500">{label}</span>
      <span className="font-semibold text-slate-800 text-right">{value}</span>
    </div>
  );
}

/* ---------------- plánovač (max 10 řádků) ---------------- */

function hmToSec(hm: string): number {
  const [h, m] = hm.split(':').map(Number);
  return (h || 0) * 3600 + (m || 0) * 60;
}
function secToHm(sec: number): string {
  const h = Math.floor(sec / 3600);
  const m = Math.round((sec % 3600) / 60);
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

export function ScheduleRow({
  row,
  index,
  thermo,
  frozen,
  onChange,
  onRemove,
}: {
  row: ScheduleInterval;
  index: number;
  thermo: boolean;
  frozen?: boolean;
  onChange: (r: ScheduleInterval) => void;
  onRemove: () => void;
}) {
  const [open, setOpen] = useState(false);

  const highVal = row.tempHigh ?? 24.5;
  const highAct = row.tempHighAction ?? 'off';
  const lowVal = row.tempLow ?? 21.0;
  const lowAct = row.tempLowAction ?? 'on';

  const fmt = (v: number) => (Math.round(v * 10) / 10).toFixed(1).replace('.', ',');

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
          <span>Pouze pro čtení (plán uzamčen)</span>
        </div>
      )}

      {/* Záhlaví dílčí karty časovače */}
      <div
        className={`flex items-center gap-1.5 px-2 py-2 transition-colors ${
          open ? 'bg-sky-100/60 border-b border-sky-200/70' : row.enabled ? 'bg-slate-50/90' : 'bg-slate-100/50'
        }`}
      >
        {/* Klikací střed řádku (rozbalení / sbalení) */}
        <div
          role="button"
          tabIndex={0}
          onClick={() => setOpen((o) => !o)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              setOpen((o) => !o);
            }
          }}
          className="flex-1 flex items-center justify-between gap-1.5 min-w-0 text-left cursor-pointer select-none"
        >
          <div className="flex flex-col min-w-0 flex-1 py-0.5">
            {/* Řádek 1: Pořadové číslo plánu na úrovni před prvním časem + časy intervalu */}
            <div className="flex items-center gap-1.5 text-[13px] font-bold text-slate-800 flex-nowrap">
              {/* Číslo intervalu pro okamžité vizuální odlišení karet - na úrovni prvního času */}
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
              {!thermo && (
                <>
                  <span className="text-slate-300">·</span>
                  <span
                    className={`text-[10px] font-black px-1.5 py-0.5 rounded ${
                      row.action === 'on'
                        ? 'bg-sky-100 text-sky-800 border border-sky-300/80 shadow-2xs'
                        : 'bg-slate-200/80 text-slate-700 border border-slate-300/80'
                    }`}
                  >
                    {row.action === 'on' ? 'ZAP' : 'VYP'}
                  </span>
                </>
              )}
            </div>

            {/* Řádek 2 pro termostat (Auto Timer): uvolněný spodní řádek posunutý úplně doleva, s větším a lépe čitelným písmem */}
            {thermo && (
              <div className="flex items-center gap-1.5 text-slate-700 mt-1.5 whitespace-nowrap overflow-hidden">
                <span className="inline-flex items-center gap-1.5 bg-white border border-sky-200/90 px-2 py-0.5 rounded-md text-[11.5px] font-semibold shadow-2xs shrink-0">
                  <span className="font-black text-sky-700 text-[12px] leading-none">&gt;</span>
                  <span className="font-extrabold text-slate-900 font-mono tracking-tight leading-none">{fmt(highVal)}°C</span>
                  <span
                    className={`text-[9.5px] font-black px-1.5 py-0.5 rounded uppercase tracking-wide leading-none ${
                      highAct === 'on' ? 'bg-emerald-600 text-white' : 'bg-slate-200 text-slate-700'
                    }`}
                  >
                    {highAct === 'on' ? 'ZAP' : 'VYP'}
                  </span>
                </span>
                <span className="text-slate-300 font-bold text-[11px] shrink-0">·</span>
                <span className="inline-flex items-center gap-1.5 bg-white border border-sky-200/90 px-2 py-0.5 rounded-md text-[11.5px] font-semibold shadow-2xs shrink-0">
                  <span className="font-black text-sky-700 text-[12px] leading-none">&lt;</span>
                  <span className="font-extrabold text-slate-900 font-mono tracking-tight leading-none">{fmt(lowVal)}°C</span>
                  <span
                    className={`text-[9.5px] font-black px-1.5 py-0.5 rounded uppercase tracking-wide leading-none ${
                      lowAct === 'on' ? 'bg-emerald-600 text-white' : 'bg-slate-200 text-slate-700'
                    }`}
                  >
                    {lowAct === 'on' ? 'ZAP' : 'VYP'}
                  </span>
                </span>
              </div>
            )}
          </div>

          <ChevronDown
            className={`w-4 h-4 text-slate-400 shrink-0 transition-transform duration-200 mr-0.5 ${
              open ? 'rotate-180 text-sky-600' : ''
            }`}
          />
        </div>

        {/* Pravé tlačítko: Zapnutí/vypnutí intervalu */}
        <button
          type="button"
          disabled={frozen}
          title={frozen ? 'Plán je uzamčen' : row.enabled ? 'Deaktivovat interval' : 'Aktivovat interval'}
          onClick={(e) => {
            e.stopPropagation();
            if (frozen) return;
            onChange({ ...row, enabled: !row.enabled });
          }}
          className={`p-1 rounded-md shrink-0 transition-colors ${
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

      {/* Otevřená karta: zřetelné jemné pozadí, kde se pracuje, těsně přimknuté linky a maximální využití šířky */}
      {open && (
        <div className="p-2 space-y-2 bg-sky-50/40">
          {thermo ? (
            <div className="space-y-1.5 bg-white p-2 rounded-xl border border-sky-200 shadow-2xs">
              <span className="text-[10.5px] font-black uppercase text-slate-500 tracking-wider block pl-0.5">
                Teplotní podmínky regulace
              </span>

              {/* Podmínka 1: Teplota vyšší než (>) */}
              <div className="p-1.5 rounded-lg border border-sky-200/80 bg-sky-50/30 flex items-center justify-between gap-1.5">
                <div className="flex items-center gap-1.5 min-w-0 flex-1">
                  <span className="text-[12px] font-bold text-slate-700 whitespace-nowrap shrink-0">Teplota &gt;</span>
                  <div className="bg-white border border-slate-300 rounded-md px-1.5 py-0.5 shadow-2xs shrink-0">
                    <TempField
                      value={highVal}
                      disabled={frozen}
                      onChange={(v) => onChange({ ...row, tempHigh: v })}
                      label="Teplota vyšší než (>)"
                    />
                  </div>
                </div>
                <div className="w-24 shrink-0">
                  <Seg<OnOff>
                    value={highAct}
                    disabled={frozen}
                    onChange={(v) => onChange({ ...row, tempHighAction: v })}
                    options={[
                      { v: 'on', label: 'ZAP' },
                      { v: 'off', label: 'VYP' },
                    ]}
                  />
                </div>
              </div>

              {/* Podmínka 2: Teplota menší než (<) */}
              <div className="p-1.5 rounded-lg border border-sky-200/80 bg-sky-50/30 flex items-center justify-between gap-1.5">
                <div className="flex items-center gap-1.5 min-w-0 flex-1">
                  <span className="text-[12px] font-bold text-slate-700 whitespace-nowrap shrink-0">Teplota &lt;</span>
                  <div className="bg-white border border-slate-300 rounded-md px-1.5 py-0.5 shadow-2xs shrink-0">
                    <TempField
                      value={lowVal}
                      disabled={frozen}
                      onChange={(v) => onChange({ ...row, tempLow: v })}
                      label="Teplota menší než (<)"
                    />
                  </div>
                </div>
                <div className="w-24 shrink-0">
                  <Seg<OnOff>
                    value={lowAct}
                    disabled={frozen}
                    onChange={(v) => onChange({ ...row, tempLowAction: v })}
                    options={[
                      { v: 'on', label: 'ZAP' },
                      { v: 'off', label: 'VYP' },
                    ]}
                  />
                </div>
              </div>
            </div>
          ) : (
            <div className="flex items-center justify-between gap-2 p-2 rounded-xl bg-white border border-sky-200 shadow-2xs">
              <span className="text-[12px] font-bold text-slate-700">Požadovaný stav výstupu:</span>
              <div className="w-24 shrink-0">
                <Seg<OnOff>
                  value={row.action}
                  disabled={frozen}
                  onChange={(v) => onChange({ ...row, action: v })}
                  options={[
                    { v: 'on', label: 'ZAP' },
                    { v: 'off', label: 'VYP' },
                  ]}
                />
              </div>
            </div>
          )}

          {/* Dny v týdnu */}
          <div className="bg-white p-2 rounded-xl border border-slate-200 shadow-2xs space-y-1">
            <span className="text-[10.5px] font-black uppercase text-slate-500 tracking-wider block pl-0.5">
              Aktivní dny v týdnu
            </span>
            <DayPicker days={row.days} disabled={frozen} onChange={(days) => onChange({ ...row, days })} />
          </div>

          {/* Spodní akční lišta otevřené karty: Smazat a Zavřít */}
          <div className="flex items-center justify-between pt-1">
            <button
              type="button"
              disabled={frozen}
              onClick={onRemove}
              className={`text-[12px] font-bold px-2.5 py-1.5 rounded-lg border flex items-center gap-1.5 transition-colors ${
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
              className="text-[12px] font-bold text-sky-800 bg-white border border-sky-300 hover:bg-sky-50 active:bg-sky-100 px-3.5 py-1.5 rounded-lg shadow-2xs transition-colors"
            >
              Hotovo
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export function Scheduler({
  schedule,
  thermo,
  frozen,
  onChange,
}: {
  schedule: ScheduleInterval[];
  thermo: boolean;
  frozen?: boolean;
  onChange: (s: ScheduleInterval[]) => void;
}) {
  const addRow = () => {
    if (frozen) return;
    if (schedule.length >= 10) return;
    const newRow: ScheduleInterval = {
      id: `sch_${Date.now()}`,
      enabled: true,
      from: '08:00',
      to: '16:00',
      action: 'on',
      days: [0, 1, 2, 3, 4],
      tempHigh: thermo ? 24.5 : undefined,
      tempHighAction: thermo ? 'off' : undefined,
      tempLow: thermo ? 21.0 : undefined,
      tempLowAction: thermo ? 'on' : undefined,
    };
    onChange([...schedule, newRow]);
  };

  return (
    <div className="py-1.5 space-y-2">
      {schedule.map((row, idx) => (
        <ScheduleRow
          key={row.id}
          row={row}
          index={idx}
          thermo={thermo}
          frozen={frozen}
          onChange={(updated) => onChange(schedule.map((r, i) => (i === idx ? updated : r)))}
          onRemove={() => onChange(schedule.filter((_, i) => i !== idx))}
        />
      ))}
      {schedule.length < 10 && !frozen && (
        <button
          type="button"
          onClick={addRow}
          className="w-full py-2.5 rounded-xl border-2 border-dashed border-sky-300 text-[13px] font-bold text-sky-700 bg-sky-50/50 hover:bg-sky-50 active:bg-sky-100 flex items-center justify-center gap-1.5 transition-colors shadow-2xs"
        >
          <Plus className="w-4 h-4" />
          <span>Přidat interval ({schedule.length}/10)</span>
        </button>
      )}
    </div>
  );
}

/* ---------------- rychlá blokace plánu ---------------- */

const QUICK_LOCK_ITEMS: { id: QuickLock; title: string; subtitle: string }[] = [
  { id: 'none', title: 'Vypnuto (plán aktivní)', subtitle: 'Standardní provoz podle časového plánu' },
  { id: 'off_midnight_manual', title: 'VYPNUTO do 24:00 (dnes)', subtitle: 'Plán se sám obnoví zítra v 00:00' },
  { id: 'off_midnight_delay', title: 'VYPNUTO na zadaný čas (delay)', subtitle: 'Odpočet zadané doby (až 24 h)' },
  { id: 'off_calendar', title: 'VYPNUTO ve vybrané dny kalendáře', subtitle: 'V konkrétní zvolené kalendářní dny' },
  { id: 'off_forever_manual', title: 'VYPNUTO trvale (dovolená)', subtitle: 'Do ručního opětovného zapnutí' },
  { id: 'off_forever_delay', title: 'ZAPNUTO trvale (manuál bypass)', subtitle: 'Výstup trvale ZAP, ignoruje plán' },
];

export function QuickLockBadge({ value, onOff }: { value: QuickLock; onOff: () => void }) {
  if (value === 'none') return null;
  const item = QUICK_LOCK_ITEMS.find((i) => i.id === value);
  return (
    <div className="p-2.5 rounded-xl border border-orange-200 bg-amber-50 text-orange-950 flex items-center justify-between gap-2 shadow-xs">
      <div className="flex items-center gap-2 min-w-0">
        <Zap className="w-4 h-4 text-orange-600 shrink-0" />
        <div className="min-w-0">
          <span className="block text-[12px] font-bold text-orange-900 truncate">Aktivní blokace: {item?.title}</span>
          <span className="block text-[10.5px] text-orange-700 truncate">{item?.subtitle}</span>
        </div>
      </div>
      <button
        type="button"
        onClick={onOff}
        className="px-2.5 py-1 text-[11px] font-bold bg-white text-orange-800 rounded-lg border border-orange-300 hover:bg-orange-100 shrink-0"
      >
        Vypnout
      </button>
    </div>
  );
}

/** Zavírací menu (akordeon) všech voleb rychlé blokace plánu s vypsaným stavem v záhlaví */
export function QuickLockAccordionPicker({
  value,
  delaySec,
  days,
  onChange,
}: {
  value: QuickLock;
  delaySec: number;
  days: string[];
  onChange: (patch: { quickLock: QuickLock; quickLockDelaySec?: number; quickLockCalendarDays?: string[] }) => void;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [calendarOpen, setCalendarOpen] = useState(false);
  const currentItem = QUICK_LOCK_ITEMS.find((i) => i.id === value) ?? QUICK_LOCK_ITEMS[0];
  const isOff = value === 'none';

  return (
    <div className="pt-2">
      <div className="rounded-xl border border-slate-300/80 bg-white overflow-hidden shadow-sm">
        <button
          type="button"
          onClick={() => setIsOpen((o) => !o)}
          className="w-full flex items-center justify-between gap-2 p-3 text-left hover:bg-slate-50 active:bg-slate-100 select-none transition-colors"
        >
          <div className="flex items-center gap-2 min-w-0">
            <Zap className={`w-4 h-4 shrink-0 ${isOff ? 'text-slate-400' : 'text-amber-600'}`} />
            <div className="min-w-0 flex items-center gap-1.5 flex-wrap">
              <span className="text-[13px] font-bold text-slate-800">Rychlá blokace plánu:</span>
              <span
                className={`text-[12px] font-extrabold px-2 py-0.5 rounded-md ${
                  isOff
                    ? 'bg-slate-100 text-slate-600'
                    : 'bg-amber-100 text-amber-900 border border-amber-300'
                }`}
              >
                {isOff ? 'Vypnuto' : currentItem.title.replace('VYPNUTO ', 'OFF ').replace('ZAPNUTO ', 'ON ')}
              </span>
            </div>
          </div>
          <ChevronDown
            className={`w-4 h-4 text-slate-400 shrink-0 transition-transform duration-200 ${
              isOpen ? 'rotate-180 text-sky-600' : ''
            }`}
          />
        </button>

        {isOpen && (
          <div className="p-2.5 pt-1 space-y-1.5 border-t border-slate-100 bg-slate-50/50">
            {QUICK_LOCK_ITEMS.map((item) => {
              const selected = item.id === value;
              return (
                <div
                  key={item.id}
                  className={`rounded-lg border transition-all overflow-hidden ${
                    selected
                      ? 'border-sky-400 bg-sky-50/80 shadow-xs'
                      : 'border-slate-200/80 bg-white hover:bg-slate-50'
                  }`}
                >
                  <button
                    type="button"
                    onClick={() => onChange({ quickLock: item.id })}
                    className="w-full p-2.5 text-left flex items-start gap-2.5 select-none"
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
                        <span className={`text-[12.5px] font-bold ${selected ? 'text-sky-950' : 'text-slate-800'}`}>
                          {item.title}
                        </span>
                      </div>
                      <span className="block text-[11px] text-slate-500 mt-0.5">{item.subtitle}</span>
                    </div>
                  </button>

                  {/* Nastavení pro delay: s krokem po 0,5 s a rotačním válcem v modálním okně */}
                  {item.id === 'off_midnight_delay' && selected && (
                    <div className="px-3 pb-3 pt-1 border-t border-sky-200/60 bg-white/70">
                      <div className="flex items-center justify-between text-[12px] font-semibold text-slate-700">
                        <span>Délka blokace:</span>
                        <TimeField
                          mode="hms"
                          seconds={delaySec}
                          onChange={(s) => onChange({ quickLock: 'off_midnight_delay', quickLockDelaySec: s })}
                          label="Délka blokace Delay"
                          className="underline decoration-dotted decoration-sky-600 underline-offset-2 font-mono font-black text-sky-800"
                        />
                      </div>
                    </div>
                  )}

                  {/* Nastavení pro vybrané dny kalendáře: interaktivní kalendář (jednotlivé dny i výběr období od–do) */}
                  {item.id === 'off_calendar' && selected && (
                    <div className="px-3 pb-3 pt-2 space-y-2 border-t border-sky-200/60 bg-white/70">
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-[12px] font-bold text-slate-700">
                          Vybrané dny výluky ({days.length}):
                        </span>
                        <button
                          type="button"
                          onClick={() => setCalendarOpen(true)}
                          className="px-2.5 py-1.5 rounded-lg bg-purple-600 hover:bg-purple-500 active:bg-purple-700 text-white text-[11.5px] font-black shadow-2xs flex items-center gap-1.5 transition-transform active:scale-95 cursor-pointer"
                        >
                          <Calendar className="w-3.5 h-3.5" />
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
                              <Calendar className="w-3 h-3 text-purple-600" />
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
        )}
      </div>
    </div>
  );
}

/* ---------------- blokace jiným prvkem (interlock, max 2) ---------------- */

export function InterlockEditor({
  rule,
  onChange,
  onRemove,
}: {
  rule: InterlockRule;
  onChange: (r: InterlockRule) => void;
  onRemove: () => void;
}) {
  return (
    <div className="rounded-xl border border-slate-200 p-3 space-y-2.5 bg-slate-50/60">
      <div className="flex items-center justify-between gap-2">
        <select
          value={rule.elementId}
          onChange={(e) =>
            onChange({
              ...rule,
              elementId: e.target.value,
              elementLabel: catalog.find((c) => c.id === e.target.value)?.label ?? e.target.value,
            })
          }
          className="flex-1 border border-slate-300 rounded-lg px-2.5 py-1.5 text-[13px] font-semibold bg-white min-w-0"
        >
          {catalog.map((c) => (
            <option key={c.id} value={c.id}>
              {c.label}
            </option>
          ))}
        </select>
        <button
          type="button"
          onClick={onRemove}
          className="p-1.5 text-rose-500 hover:bg-rose-50 active:bg-rose-100 rounded-lg shrink-0"
        >
          <Trash2 className="w-4 h-4" />
        </button>
      </div>

      <Seg<'state' | 'edge'>
        value={rule.trigger}
        onChange={(v) => onChange({ ...rule, trigger: v, effect: v === 'state' ? 'forbid' : 'on' })}
        options={[
          { v: 'state', label: 'Pokud JE ve stavu' },
          { v: 'edge', label: 'Pokud NASTANE změna' },
        ]}
      />

      <Seg<OnOff>
        value={rule.when}
        onChange={(v) => onChange({ ...rule, when: v })}
        options={[
          { v: 'on', label: 'ZAPNUTÝ' },
          { v: 'off', label: 'VYPNUTÝ' },
        ]}
      />

      {rule.trigger === 'state' ? (
        <div className="rounded-lg bg-orange-50 border border-orange-200 px-2.5 py-1.5 text-[11px] font-semibold text-orange-800">
          → tento OUT se v tom stavu nesmí přepnout (blokován).
        </div>
      ) : (
        <Seg<'on' | 'off' | 'toggle'>
          value={rule.effect === 'forbid' ? 'toggle' : rule.effect}
          onChange={(v) => onChange({ ...rule, effect: v })}
          options={[
            { v: 'on', label: 'musí ZAPNOUT' },
            { v: 'off', label: 'musí VYPNOUT' },
            { v: 'toggle', label: 'obrátit stav' },
          ]}
        />
      )}
    </div>
  );
}

/* ================================================================== */

interface ConfigCardProps {
  config: OutConfig;
  runtime: OutRuntime;
  editingRole: Role;
  onEditingRoleChange: (r: Role) => void;
  onChange: (patch: Partial<OutConfig>) => void;
}

const MODE_LABEL: Record<OutMode, string> = {
  classic: 'Spínač',
  delay: 'Delay',
  thermostat: 'Termostat',
};

export default function ConfigCard({
  config,
  runtime,
  editingRole,
  onEditingRoleChange,
  onChange,
}: ConfigCardProps) {
  const isAdmin = editingRole === 'admin';
  const prefs = config.prefsByRole[editingRole];
  const access = config.access[editingRole];

  const patchPrefs = (p: Partial<typeof prefs>) =>
    onChange({ prefsByRole: { ...config.prefsByRole, [editingRole]: { ...prefs, ...p } } });

  const patchAccessOf = (role: Role, p: Partial<typeof access>) =>
    onChange({ access: { ...config.access, [role]: { ...config.access[role], ...p } } });

  const isScheduleFrozen =
    config.quickLock !== 'none' ||
    (config.mode === 'thermostat' && config.thermostatProgram === 'auto_24h') ||
    (config.mode === 'thermostat' && config.thermostatProgram === 'manual');

  const [justSorted, setJustSorted] = useState(false);

  const handleSortSchedule = () => {
    const sorted = [...config.schedule].sort((a, b) => {
      const diffFrom = hmToSec(a.from) - hmToSec(b.from);
      if (diffFrom !== 0) return diffFrom;
      return hmToSec(a.to) - hmToSec(b.to);
    });
    onChange({ schedule: sorted });
    setJustSorted(true);
    setTimeout(() => setJustSorted(false), 1400);
  };

  return (
    <div className="w-full space-y-3 pb-8">
      {/* Zcela nahoře v záhlaví: trvale fixovaný (sticky) panel,
          obsahuje název prvku, roli v závorce (Klient / Manažer / Admin)
          a zrcadlení nastaveného režimu (Spínač / Delay / Termostat) */}
      <div className="sticky top-0 z-30 bg-white/95 backdrop-blur-md rounded-2xl border border-slate-300/80 p-3.5 shadow-sm">
        <div className="flex items-center justify-between gap-2">
          <div className="min-w-0 flex-1">
            <h1 className="text-[17px] font-black text-slate-900 leading-tight truncate">
              {config.name} <span className="font-semibold text-slate-500">({ROLE_LABEL[editingRole]})</span>
            </h1>
          </div>
          <div className="shrink-0 flex items-center gap-1.5">
            <span
              className={`text-[11px] font-black uppercase tracking-wider px-2.5 py-0.5 rounded-full border ${
                config.mode === 'thermostat'
                  ? 'bg-amber-50 text-amber-800 border-amber-300'
                  : config.mode === 'delay'
                  ? 'bg-sky-50 text-sky-800 border-sky-300'
                  : 'bg-slate-100 text-slate-800 border-slate-300'
              }`}
            >
              {MODE_LABEL[config.mode]}
            </span>
          </div>
        </div>
      </div>

      {/* 0. Přiřazená role – shodný font jako názvy ostatních karet (pouze první velké písmeno, tmavý font) */}
      <div className="rounded-xl border border-slate-300/80 bg-white p-3.5 space-y-2.5 shadow-sm">
        <span className="text-[14px] font-bold text-slate-900 block">
          Přiřazená role
        </span>
        <Seg<Role>
          value={editingRole}
          onChange={onEditingRoleChange}
          options={([ 'client', 'manager', 'admin'] as Role[]).map((r) => ({
            v: r,
            label: ROLE_LABEL[r],
          }))}
        />
      </div>

      {/* 1. Zařízení a projekt: sbalená záložka má zelenou nebo červenou tečku (online/offline)
          i bez rozbalení a je viditelná i pro klienta */}
      <Section
        title="Zařízení a projekt"
        icon={<Info className="w-4 h-4" />}
        badge="Admin"
        statusDot={runtime.link === 'online' ? 'online' : runtime.link === 'offline' ? 'offline' : 'loading'}
        defaultOpen={false}
        locked={!isAdmin && editingRole !== 'manager'}
      >
        <InfoRow label="Projekt / deska" value={config.deviceName} />
        <InfoRow label="Název DO v kódu konfigurace" value={config.configName} />
        <InfoRow label="Fyzický pin GPIO" value={`OUT_${config.outNumber}`} />
        <InfoRow
          label="Stav spojení"
          value={
            runtime.link === 'online'
              ? '🟢 Online'
              : runtime.link === 'offline'
              ? '🔴 Offline'
              : '⏳ Načítám'
          }
        />
      </Section>

      {/* 2. Zobrazovaný název: se zvýrazněným odznakem Admin */}
      <Section
        title="Zobrazovaný název"
        icon={<Sliders className="w-4 h-4" />}
        badge="Admin"
        defaultOpen
        locked={!isAdmin}
      >
        <Field label="Název na kartách a dlaždicích">
          <input
            type="text"
            value={config.name}
            disabled={!isAdmin}
            onChange={(e) => onChange({ name: e.target.value })}
            className="w-full border border-slate-300 rounded-lg px-3 py-2 text-[14px] font-semibold text-slate-800 bg-white disabled:bg-slate-50 disabled:text-slate-500"
          />
        </Field>
      </Section>

      {/* 3. Režim výstupu – nově přehozeno PŘED Osobní zobrazení */}
      <Section
        title="Režim výstupu"
        icon={<Sliders className="w-4 h-4" />}
        badge="Admin"
        valueBadge={MODE_LABEL[config.mode]}
        defaultOpen
        locked={!isAdmin}
      >
        {/* Poznámka pod bannerem spínač delay termostat odstraněna */}
        <Field label="Základní chování prvku">
          <Seg<OutMode>
            value={config.mode}
            onChange={(v) => onChange({ mode: v })}
            options={[
              { v: 'classic', label: 'Spínač' },
              { v: 'delay', label: 'Delay' },
              { v: 'thermostat', label: 'Termostat' },
            ]}
            disabled={!isAdmin}
          />
        </Field>

        {config.mode === 'delay' && (
          <>
            <Field
              label="Délka odpočtu (ruční spuštění)"
              hint="Rozsah 0,5 s až 24 h — vertikální rolovací válec hodin, minut a sekund."
            >
              <div className="flex items-center justify-between p-2.5 rounded-lg border border-slate-200 bg-slate-50">
                <span className="text-[12px] font-bold text-slate-600">Nastavený čas:</span>
                <TimeField
                  mode="hms"
                  seconds={config.delay.seconds}
                  onChange={(s) => onChange({ delay: { ...config.delay, seconds: s } })}
                  className="underline decoration-dotted decoration-sky-500 underline-offset-2 font-mono text-[16px] font-black text-sky-800"
                />
              </div>
            </Field>

            <Field label="MAX počet opakování (ruční klepnutí)">
              <Seg<number>
                value={config.delay.max}
                onChange={(v) => onChange({ delay: { ...config.delay, max: v as 1 | 2 | 3 | 4 | 5 } })}
                options={[1, 2, 3, 4, 5].map((n) => ({ v: n, label: `${n}×` }))}
              />
            </Field>
          </>
        )}

        {config.mode === 'thermostat' && (
          <>
            {/* Zdroj teploty – poznámka pod výběrovým polem odstraněna */}
            <Field label="Zdroj teploty">
              <select
                value={config.thermostatSensorId}
                disabled={!isAdmin}
                onChange={(e) =>
                  onChange({
                    thermostatSensorId: e.target.value,
                    thermostatSensorLabel:
                      catalog.find((c) => c.id === e.target.value)?.label ?? e.target.value,
                  })
                }
                className="w-full border border-slate-300 rounded-lg px-3 py-2 text-[13.5px] font-semibold bg-white disabled:bg-slate-50 disabled:text-slate-500"
              >
                {catalog.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.label}
                  </option>
                ))}
              </select>
            </Field>

            {/* Volba režimu termostatu: Manuál (vlevo), Auto 24h (uprostřed), Auto Timer (vpravo) */}
            <Field label="Režim termostatu">
              <Seg<ThermostatProgram>
                value={config.thermostatProgram}
                disabled={!isAdmin}
                onChange={(v) => onChange({ thermostatProgram: v })}
                options={[
                  { v: 'manual', label: 'Manuál' },
                  { v: 'auto_24h', label: 'Auto 24h' },
                  { v: 'auto_timer', label: 'Auto Timer' },
                ]}
              />
            </Field>

            {/* Režim Auto 24h: jednoznačné orámování s jemným modrým podbarvením, těsně přimknutou linkou a maximální šířkou pro prvky */}
            {config.thermostatProgram === 'auto_24h' && (
              <div className="rounded-xl border border-sky-300 bg-sky-50/60 p-2.5 space-y-2 shadow-xs ring-1 ring-sky-200/50">
                <div className="pb-0.5">
                  <span className="text-[12.5px] font-black text-sky-950">
                    Podmínky nepřetržité regulace (24 hodin)
                  </span>
                </div>

                {/* Podmínka 1: Teplota vyšší než (>) */}
                <div className="rounded-lg border border-sky-200/90 bg-white p-2 space-y-1.5 shadow-2xs">
                  <span className="text-[10.5px] font-bold text-slate-500 uppercase tracking-wide block pl-0.5">
                    Podmínka 1: Teplota vyšší než (&gt;)
                  </span>
                  <div className="flex items-center justify-between gap-1.5">
                    <div className="flex items-center gap-1.5 min-w-0 flex-1">
                      <span className="text-[12px] font-bold text-slate-700 whitespace-nowrap shrink-0">Teplota &gt;</span>
                      <div className="bg-white border border-slate-300 rounded-md px-1.5 py-0.5 shadow-2xs shrink-0">
                        <TempField
                          value={config.thermostatHysteresis.tempHigh ?? config.thermostatHysteresis.temp1 ?? 24.5}
                          disabled={!isAdmin}
                          onChange={(t) =>
                            onChange({
                              thermostatHysteresis: {
                                ...config.thermostatHysteresis,
                                tempHigh: t,
                                temp1: t,
                              },
                            })
                          }
                          label="Teplota vyšší než (>)"
                        />
                      </div>
                    </div>
                    <div className="w-24 shrink-0">
                      <Seg<OnOff>
                        value={config.thermostatHysteresis.actionHigh ?? config.thermostatHysteresis.action1 ?? 'off'}
                        disabled={!isAdmin}
                        onChange={(v) =>
                          onChange({
                            thermostatHysteresis: {
                              ...config.thermostatHysteresis,
                              actionHigh: v,
                              action1: v,
                            },
                          })
                        }
                        options={[
                          { v: 'on', label: 'ZAP' },
                          { v: 'off', label: 'VYP' },
                        ]}
                      />
                    </div>
                  </div>
                </div>

                {/* Podmínka 2: Teplota menší než (<) */}
                <div className="rounded-lg border border-sky-200/90 bg-white p-2 space-y-1.5 shadow-2xs">
                  <span className="text-[10.5px] font-bold text-slate-500 uppercase tracking-wide block pl-0.5">
                    Podmínka 2: Teplota menší než (&lt;)
                  </span>
                  <div className="flex items-center justify-between gap-1.5">
                    <div className="flex items-center gap-1.5 min-w-0 flex-1">
                      <span className="text-[12px] font-bold text-slate-700 whitespace-nowrap shrink-0">Teplota &lt;</span>
                      <div className="bg-white border border-slate-300 rounded-md px-1.5 py-0.5 shadow-2xs shrink-0">
                        <TempField
                          value={config.thermostatHysteresis.tempLow ?? config.thermostatHysteresis.temp2 ?? 21.0}
                          disabled={!isAdmin}
                          onChange={(t) =>
                            onChange({
                              thermostatHysteresis: {
                                ...config.thermostatHysteresis,
                                tempLow: t,
                                temp2: t,
                              },
                            })
                          }
                          label="Teplota menší než (<)"
                        />
                      </div>
                    </div>
                    <div className="w-24 shrink-0">
                      <Seg<OnOff>
                        value={config.thermostatHysteresis.actionLow ?? config.thermostatHysteresis.action2 ?? 'on'}
                        disabled={!isAdmin}
                        onChange={(v) =>
                          onChange({
                            thermostatHysteresis: {
                              ...config.thermostatHysteresis,
                              actionLow: v,
                              action2: v,
                            },
                          })
                        }
                        options={[
                          { v: 'on', label: 'ZAP' },
                          { v: 'off', label: 'VYP' },
                        ]}
                      />
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Režim Auto Timer */}
            {config.thermostatProgram === 'auto_timer' && (
              <div className="p-2.5 rounded-xl bg-sky-50/70 border border-sky-300 text-sky-950 text-[12px] shadow-2xs flex items-center gap-2">
                <Calendar className="w-4 h-4 text-sky-600 shrink-0" />
                <span className="font-bold text-sky-900">
                  Režim Auto Timer aktivní (teploty i spínání řízeny časovým plánem níže)
                </span>
              </div>
            )}

            {/* Režim Manuál */}
            {config.thermostatProgram === 'manual' && (
              <div className="p-2.5 rounded-xl bg-slate-100/90 border border-slate-300 text-slate-800 text-[12px] shadow-2xs flex items-center gap-2">
                <Sliders className="w-4 h-4 text-slate-600 shrink-0" />
                <span className="font-bold text-slate-800">
                  Režim Manuál aktivní (ruční spínač ZAP/VYP, automatická regulace vypnuta)
                </span>
              </div>
            )}
          </>
        )}
      </Section>

      {/* 4. Osobní zobrazení – bez slova role/admin v názvu, nově umístěno za Režimem výstupu */}
      <Section
        title="Osobní zobrazení"
        icon={<Sparkles className="w-4 h-4" />}
        defaultOpen
      >
        <div className="py-2.5 space-y-1.5">
          <div className="grid grid-cols-5 gap-2.5 items-start">
            {/* Levá část: Velikost dlaždice (3 sloupce z 5) - kostičky 1/1 nalevo, 1/2 uprostřed, 1/4 vpravo */}
            <div className="col-span-3 flex flex-col gap-1.5">
              <span className="text-[12px] font-bold text-slate-700 leading-tight">Velikost dlaždice</span>
              <div
                className={`flex h-10 p-0.5 rounded-lg border border-slate-300 bg-slate-100/90 w-full ${
                  config.mode === 'thermostat' ? 'opacity-50 pointer-events-none' : ''
                }`}
              >
                {(['1/1', '1/2', '1/4'] as TileSize[]).map((sz) => {
                  const isSelected = (config.mode === 'thermostat' ? '1/1' : prefs.size) === sz;
                  return (
                    <button
                      key={sz}
                      type="button"
                      disabled={config.mode === 'thermostat'}
                      onClick={() => patchPrefs({ size: sz })}
                      className={`flex-1 h-full text-[12.5px] font-bold rounded-md transition-all flex items-center justify-center ${
                        isSelected
                          ? 'bg-white text-sky-700 shadow-xs font-black border border-slate-200/80'
                          : 'text-slate-600 hover:text-slate-900 active:bg-slate-200/60'
                      }`}
                    >
                      {sz}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Pravá část: Zobrazení na kartě (2 sloupce z 5) - oko přeškrtnuté vlevo, oko vpravo ve stejné rovině a výšce h-10 */}
            <div className="col-span-2 flex flex-col gap-1.5">
              <span className="text-[12px] font-bold text-slate-700 leading-tight">Zobrazení na kartě</span>
              <div className="flex h-10 p-0.5 rounded-lg border border-slate-300 bg-slate-100/90 w-full">
                {/* Oko přeškrtnuté vlevo = Skryto */}
                <button
                  type="button"
                  onClick={() => patchPrefs({ visible: false })}
                  title="Skryto na mé kartě"
                  className={`flex-1 h-full rounded-md transition-all flex items-center justify-center ${
                    !prefs.visible
                      ? 'bg-white text-rose-600 shadow-xs font-bold border border-slate-200/80'
                      : 'text-slate-400 hover:text-slate-700 active:bg-slate-200/60'
                  }`}
                >
                  <EyeOff className="w-4 h-4" />
                </button>

                {/* Oko vpravo = Zobrazeno */}
                <button
                  type="button"
                  onClick={() => patchPrefs({ visible: true })}
                  title="Zobrazeno na mé kartě"
                  className={`flex-1 h-full rounded-md transition-all flex items-center justify-center ${
                    prefs.visible
                      ? 'bg-white text-sky-700 shadow-xs font-bold border border-slate-200/80'
                      : 'text-slate-400 hover:text-slate-700 active:bg-slate-200/60'
                  }`}
                >
                  <Eye className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>

          {config.mode === 'thermostat' && (
            <span className="block text-[10.5px] text-amber-700 font-medium pl-0.5">Termostat vyžaduje 1/1</span>
          )}
        </div>

        {/* Push notifikace do telefonu zmenšeny na identickou výšku jako banner velikosti dlaždice, s položkou 'Všechny' */}
        <Field label="Push notifikace do telefonu">
          <div className="flex h-10 p-0.5 rounded-lg border border-slate-300 bg-slate-100/90 w-full">
            {([
              { v: 'none', label: 'Vypnuto' },
              { v: 'on_only', label: 'Jen ZAP' },
              { v: 'off_only', label: 'Jen VYP' },
              { v: 'any', label: 'Všechny' },
            ] as const).map((opt) => {
              const isSelected = prefs.notify === opt.v;
              return (
                <button
                  key={opt.v}
                  type="button"
                  onClick={() => patchPrefs({ notify: opt.v })}
                  className={`flex-1 h-full text-[12px] font-bold rounded-md transition-all flex items-center justify-center ${
                    isSelected
                      ? 'bg-white text-sky-700 shadow-xs font-black border border-slate-200/80'
                      : 'text-slate-600 hover:text-slate-900 active:bg-slate-200/60'
                  }`}
                >
                  {opt.label}
                </button>
              );
            })}
          </div>
        </Field>

        {config.mode === 'delay' && (
          <Field
            label="Osobní strop opakování Delay"
            hint={`Admin pro tento prvek povolil globálně až ${config.delay.max}×.`}
          >
            <Seg<number>
              value={prefs.delayMaxOverride ?? config.delay.max}
              onChange={(v) => patchPrefs({ delayMaxOverride: v as 1 | 2 | 3 | 4 | 5 })}
              options={Array.from({ length: config.delay.max }, (_, i) => i + 1).map((n) => ({
                v: n,
                label: `${n}×`,
              }))}
            />
          </Field>
        )}
      </Section>

      {/* 5. Plánovač + rychlá blokace: v záhlaví sekce uvádí POUZE číslici aktivních (zaškrtnutých) plánů */}
      <Section
        title="Časový plán"
        icon={<Calendar className="w-4 h-4" />}
        counter={config.schedule.filter((s) => s.enabled).length}
        defaultOpen
        headerAction={
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              handleSortSchedule();
            }}
            className={`text-[11.5px] font-bold px-2.5 py-1 rounded-lg border flex items-center gap-1 transition-all select-none shadow-2xs ${
              justSorted
                ? 'border-emerald-300 bg-emerald-50 text-emerald-800'
                : 'border-sky-300 bg-sky-50 text-sky-800 hover:bg-sky-100 active:bg-sky-200'
            }`}
            title="Setřídit časové plány podle počátečního času"
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
        {/* Informační panely stavu uzamčení plánu */}
        {config.quickLock !== 'none' && (
          <div className="pt-2">
            <QuickLockBadge value={config.quickLock} onOff={() => onChange({ quickLock: 'none' })} />
          </div>
        )}

        {config.mode === 'thermostat' && config.thermostatProgram === 'auto_24h' && (
          <div className="mt-2 p-2.5 rounded-xl border border-amber-200 bg-amber-50 text-amber-900 flex items-center gap-2 shadow-xs">
            <Lock className="w-4 h-4 text-amber-700 shrink-0" />
            <span className="text-[12px] font-bold leading-tight">
              Režim Auto 24h hlídá teplotu nepřetržitě. Časové plány jsou uzamčeny a slouží pouze pro čtení.
            </span>
          </div>
        )}

        {config.mode === 'thermostat' && config.thermostatProgram === 'manual' && (
          <div className="mt-2 p-2.5 rounded-xl border border-slate-200 bg-slate-100 text-slate-700 flex items-center gap-2 shadow-xs">
            <Lock className="w-4 h-4 text-slate-500 shrink-0" />
            <span className="text-[12px] font-bold leading-tight">
              V režimu Manuál se výstup ovládá jako ruční spínač. Časové plány jsou neaktivní a uzamčeny (pouze pro čtení).
            </span>
          </div>
        )}

        {/* Karty plánu lze otevřít a prohlédnout, při zamknutí (QuickLock nebo Auto 24h) jsou však needitovatelné */}
        <Scheduler
          schedule={config.schedule}
          thermo={config.mode === 'thermostat'}
          frozen={isScheduleFrozen}
          onChange={(s) => onChange({ schedule: s })}
        />

        {/* Rychlá blokace plánu: zavírací menu (akordeon) s vypsaným stavem v záhlaví */}
        <QuickLockAccordionPicker
          value={config.quickLock}
          delaySec={config.quickLockDelaySec}
          days={config.quickLockCalendarDays}
          onChange={(p) => onChange(p)}
        />
      </Section>

      {/* 6. Zámek – bez komentáře / nápovědy */}
      <Section
        title="Bezpečnostní zámek"
        icon={<Lock className="w-4 h-4" />}
        badge="Admin"
        locked={!isAdmin}
      >
        <Field label="Vyžadovat podržení 1 s pro přepnutí">
          <Seg<boolean>
            value={config.lock}
            disabled={!isAdmin}
            onChange={(v) => onChange({ lock: v })}
            options={[
              { v: false, label: 'Vypnutý (okamžité klepnutí)' },
              { v: true, label: 'Zapnutý (podržet 1 s)' },
            ]}
          />
        </Field>
      </Section>

      {/* 7. Bezpečné vypnutí */}
      <Section
        title="Bezpečné vypnutí (hardwarová ochrana)"
        icon={<Shield className="w-4 h-4" />}
        badge="Admin"
        locked={!isAdmin}
      >
        <Field label="Aktivní ochrana výstupu">
          <Seg<boolean>
            value={config.safety.enabled}
            disabled={!isAdmin}
            onChange={(v) => onChange({ safety: { ...config.safety, enabled: v } })}
            options={[
              { v: false, label: 'Vypnuto' },
              { v: true, label: 'Zapnuto' },
            ]}
          />
        </Field>

        {config.safety.enabled && (
          <>
            <Field label="Časově omezený kritický stav">
              <Seg<OnOff>
                value={config.safety.limitedState}
                disabled={!isAdmin}
                onChange={(v) => onChange({ safety: { ...config.safety, limitedState: v } })}
                options={[
                  { v: 'on', label: 'ZAP (např. čerpadlo nesmí jet věčně)' },
                  { v: 'off', label: 'VYP' },
                ]}
              />
            </Field>

            <Field
              label="Maximální povolená doba (HH:MM)"
              hint="Po uplynutí této doby ESP32 sám bezpečně vrátí výstup zpět do klidového stavu."
            >
              <div className="flex items-center justify-between p-2.5 rounded-lg border border-slate-200 bg-slate-50">
                <span className="text-[12px] font-bold text-slate-600">Ochranný limit:</span>
                <TimeField
                  mode="hm"
                  seconds={config.safety.maxSec}
                  maxHours={23}
                  onChange={(s) => onChange({ safety: { ...config.safety, maxSec: s } })}
                  className="underline decoration-dotted decoration-slate-500 underline-offset-2 font-mono text-[16px] font-black text-slate-800"
                />
              </div>
            </Field>
          </>
        )}
      </Section>

      {/* 8. Oprávnění (Admin) – bez spodního komentáře */}
      <Section
        title="Oprávnění rolí (kdo co smí ovládat)"
        icon={<Users className="w-4 h-4" />}
        badge="Admin"
        locked={!isAdmin}
      >
        <div className="py-2.5 space-y-3">
          {(['client', 'manager'] as Role[]).map((r) => (
            <div key={r} className="rounded-xl border border-slate-200 p-3 bg-slate-50/70 space-y-2">
              <span className="text-[13px] font-bold text-slate-800">{ROLE_LABEL[r]}</span>
              <div className="grid grid-cols-2 gap-2 text-[12px]">
                <label className="flex items-center gap-2 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={config.access[r].visible}
                    disabled={!isAdmin}
                    onChange={(e) => patchAccessOf(r, { visible: e.target.checked })}
                    className="rounded text-sky-600 w-4 h-4"
                  />
                  <span className="font-semibold text-slate-700">Vidět prvek</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={config.access[r].operate}
                    disabled={!isAdmin}
                    onChange={(e) => patchAccessOf(r, { operate: e.target.checked })}
                    className="rounded text-sky-600 w-4 h-4"
                  />
                  <span className="font-semibold text-slate-700">Ovládat výstup</span>
                </label>
              </div>
            </div>
          ))}
        </div>
      </Section>

      {/* 9. Vzájemné blokace s jinými prvky (interlock) */}
      <Section
        title="Vzájemné blokace (interlock)"
        icon={<Link2 className="w-4 h-4" />}
        badge="Admin"
        locked={!isAdmin}
      >
        <div className="py-2.5 space-y-2.5">
          {config.interlocks.map((rule, idx) => (
            <InterlockEditor
              key={`${rule.elementId}_${idx}`}
              rule={rule}
              onChange={(updated) =>
                onChange({ interlocks: config.interlocks.map((r, i) => (i === idx ? updated : r)) })
              }
              onRemove={() =>
                onChange({ interlocks: config.interlocks.filter((_, i) => i !== idx) })
              }
            />
          ))}

          {config.interlocks.length < 2 && isAdmin && (
            <button
              type="button"
              onClick={() => {
                const nextTarget = catalog.find((c) => c.id !== config.id)?.id ?? 'esp01:do2';
                const nextLabel = catalog.find((c) => c.id === nextTarget)?.label ?? 'Další prvek';
                const newRule: InterlockRule = {
                  elementId: nextTarget,
                  elementLabel: nextLabel,
                  trigger: 'state',
                  when: 'on',
                  effect: 'forbid',
                };
                onChange({ interlocks: [...config.interlocks, newRule] });
              }}
              className="w-full py-2.5 rounded-xl border border-dashed border-slate-300 text-[13px] font-bold text-sky-700 bg-sky-50/60 hover:bg-sky-50 active:bg-sky-100 flex items-center justify-center gap-1.5 transition-colors"
            >
              <Plus className="w-4 h-4" />
              <span>Přidat blokaci ({config.interlocks.length}/2)</span>
            </button>
          )}
        </div>
      </Section>
    </div>
  );
}
