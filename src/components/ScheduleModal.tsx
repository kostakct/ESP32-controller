import React, { useState } from 'react';
import { X, Clock, Calendar, Check, Trash2 } from 'lucide-react';
import { ScheduleItem, SwitchItem, ScheduleRepeatType } from '../types';
import { CZECH_DAY_LABELS, CZECH_DAY_FULL } from '../utils/formatters';

interface ScheduleModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (schedule: ScheduleItem) => void;
  onDelete?: (id: string) => void;
  initialSchedule?: ScheduleItem | null;
  switches: SwitchItem[];
}

export const ScheduleModal: React.FC<ScheduleModalProps> = ({
  isOpen,
  onClose,
  onSave,
  onDelete,
  initialSchedule,
  switches,
}) => {
  const [switchId, setSwitchId] = useState<string>(
    initialSchedule?.switchId || switches[0]?.id || ''
  );
  const [time, setTime] = useState<string>(initialSchedule?.time || '20:00');
  const [action, setAction] = useState<'ON' | 'OFF'>(initialSchedule?.action || 'ON');
  const [repeatType, setRepeatType] = useState<ScheduleRepeatType>(
    initialSchedule?.repeatType || 'DAILY'
  );
  const [customDays, setCustomDays] = useState<number[]>(
    initialSchedule?.customDays || [1, 2, 3, 4, 5] // Po-Pá
  );
  const [enabled, setEnabled] = useState<boolean>(
    initialSchedule ? initialSchedule.enabled : true
  );

  if (!isOpen) return null;

  const handleToggleDay = (dayIndex: number) => {
    if (customDays.includes(dayIndex)) {
      setCustomDays(customDays.filter((d) => d !== dayIndex));
    } else {
      setCustomDays([...customDays, dayIndex]);
    }
  };

  const handleRepeatChange = (type: ScheduleRepeatType) => {
    setRepeatType(type);
    if (type === 'DAILY') {
      setCustomDays([0, 1, 2, 3, 4, 5, 6]);
    } else if (type === 'WEEKDAYS') {
      setCustomDays([1, 2, 3, 4, 5]); // Po-Pá
    } else if (type === 'WEEKENDS') {
      setCustomDays([0, 6]); // So, Ne
    } else if (type === 'ONCE') {
      setCustomDays([]);
    }
  };

  const handleSave = () => {
    const newSchedule: ScheduleItem = {
      id: initialSchedule?.id || `sch_${Date.now()}`,
      switchId,
      time,
      action,
      repeatType,
      customDays: repeatType === 'CUSTOM' ? customDays : customDays,
      enabled,
    };
    onSave(newSchedule);
    onClose();
  };

  // Quick helper to order days starting with Monday (1..6, 0)
  const orderedDays = [1, 2, 3, 4, 5, 6, 0];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4">
      <div
        className="w-full max-w-md bg-white rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh] animate-in fade-in zoom-in-95 duration-150"
        role="dialog"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-200 bg-slate-50">
          <div className="flex items-center gap-2">
            <Clock className="w-5 h-5 text-sky-600" />
            <h3 className="font-bold text-slate-800 text-base">
              {initialSchedule ? 'Upravit časovač' : 'Nový časovač / Plánovač'}
            </h3>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-full text-slate-400 hover:text-slate-700 hover:bg-slate-200 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-5 space-y-4 overflow-y-auto text-xs sm:text-sm">
          {/* Target Switch */}
          <div>
            <label className="block font-semibold text-slate-700 mb-1">
              Vyberte spínač pro naplánování
            </label>
            <select
              id="select-schedule-switch"
              value={switchId}
              onChange={(e) => setSwitchId(e.target.value)}
              className="w-full px-3 py-2 bg-white rounded-lg border border-slate-300 text-slate-800 font-medium focus:ring-2 focus:ring-sky-500 focus:outline-none"
            >
              {switches.map((sw) => (
                <option key={sw.id} value={sw.id}>
                  OUT {sw.channelIndex}: {sw.name}
                </option>
              ))}
            </select>
          </div>

          {/* Time Picker HH:MM */}
          <div>
            <label className="block font-semibold text-slate-700 mb-1">
              Čas sepnutí (Hodina : Minuta)
            </label>
            <input
              id="input-schedule-time"
              type="time"
              value={time}
              onChange={(e) => setTime(e.target.value)}
              className="w-full px-4 py-2.5 bg-slate-50 rounded-xl border border-slate-300 text-slate-800 font-mono text-xl font-bold text-center focus:ring-2 focus:ring-sky-500 focus:outline-none"
            />
          </div>

          {/* Action ON or OFF */}
          <div>
            <label className="block font-semibold text-slate-700 mb-1">
              Požadovaná akce spínače
            </label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                id="btn-schedule-action-on"
                onClick={() => setAction('ON')}
                className={`py-2 px-3 rounded-lg font-bold text-xs border transition ${
                  action === 'ON'
                    ? 'bg-sky-600 text-white border-sky-600 shadow-sm'
                    : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                }`}
              >
                Zapnout (ON)
              </button>
              <button
                type="button"
                id="btn-schedule-action-off"
                onClick={() => setAction('OFF')}
                className={`py-2 px-3 rounded-lg font-bold text-xs border transition ${
                  action === 'OFF'
                    ? 'bg-slate-700 text-white border-slate-700 shadow-sm'
                    : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                }`}
              >
                Vypnout (OFF)
              </button>
            </div>
          </div>

          {/* Repeat Type */}
          <div>
            <label className="block font-semibold text-slate-700 mb-1">
              Režim opakování
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5">
              {(
                [
                  { type: 'DAILY', label: 'Denně' },
                  { type: 'WEEKDAYS', label: 'Pracovní dny' },
                  { type: 'WEEKENDS', label: 'Víkend' },
                  { type: 'CUSTOM', label: 'Vlastní dny' },
                  { type: 'ONCE', label: 'Pouze jednou' },
                ] as { type: ScheduleRepeatType; label: string }[]
              ).map((rep) => (
                <button
                  key={rep.type}
                  type="button"
                  id={`btn-repeat-${rep.type}`}
                  onClick={() => handleRepeatChange(rep.type)}
                  className={`py-1.5 px-2 rounded-lg text-xs font-medium border text-center transition ${
                    repeatType === rep.type
                      ? 'bg-sky-100 text-sky-800 border-sky-300 font-semibold'
                      : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                  }`}
                >
                  {rep.label}
                </button>
              ))}
            </div>
          </div>

          {/* Custom Day Checkboxes / Pills (always accessible or highlighted when custom) */}
          <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
            <span className="block text-[11px] font-semibold text-slate-700 mb-2">
              Dny v týdnu pro spuštění:
            </span>
            <div className="grid grid-cols-7 gap-1">
              {orderedDays.map((dayIdx) => {
                const isSelected = customDays.includes(dayIdx);
                return (
                  <button
                    key={dayIdx}
                    type="button"
                    onClick={() => {
                      setRepeatType('CUSTOM');
                      handleToggleDay(dayIdx);
                    }}
                    title={CZECH_DAY_FULL[dayIdx]}
                    className={`h-9 rounded-lg font-bold text-xs flex items-center justify-center transition border ${
                      isSelected
                        ? 'bg-sky-600 text-white border-sky-600 shadow-xs'
                        : 'bg-white text-slate-500 border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    {CZECH_DAY_LABELS[dayIdx]}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-5 py-3.5 border-t border-slate-200 bg-slate-50 flex items-center justify-between">
          {initialSchedule && onDelete ? (
            <button
              type="button"
              onClick={() => {
                onDelete(initialSchedule.id);
                onClose();
              }}
              className="text-rose-600 hover:text-rose-700 flex items-center gap-1 text-xs font-medium px-2 py-1 rounded hover:bg-rose-50 transition"
            >
              <Trash2 className="w-4 h-4" />
              <span>Smazat</span>
            </button>
          ) : (
            <div />
          )}

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-3 py-1.5 text-xs text-slate-600 hover:bg-slate-200 rounded-lg transition"
            >
              Zrušit
            </button>
            <button
              type="button"
              id="btn-save-schedule"
              onClick={handleSave}
              className="px-4 py-1.5 text-xs font-bold bg-sky-600 hover:bg-sky-700 text-white rounded-lg transition shadow-xs flex items-center gap-1"
            >
              <Check className="w-3.5 h-3.5" />
              <span>Uložit časovač</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
