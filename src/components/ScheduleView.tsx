import React, { useState } from 'react';
import { Clock, Plus, Calendar, Power, Edit2, Play, Sparkles } from 'lucide-react';
import { ScheduleItem, SwitchItem } from '../types';
import { formatScheduleRepeat } from '../utils/formatters';
import { ScheduleModal } from './ScheduleModal';

interface ScheduleViewProps {
  schedules: ScheduleItem[];
  switches: SwitchItem[];
  onToggleSchedule: (id: string) => void;
  onSaveSchedule: (schedule: ScheduleItem) => void;
  onDeleteSchedule: (id: string) => void;
  onTriggerTestSchedule: (schedule: ScheduleItem) => void;
  selectedSchedule?: ScheduleItem | null;
  onClearSelectedSchedule?: () => void;
}

export const ScheduleView: React.FC<ScheduleViewProps> = ({
  schedules,
  switches,
  onToggleSchedule,
  onSaveSchedule,
  onDeleteSchedule,
  onTriggerTestSchedule,
  selectedSchedule,
  onClearSelectedSchedule,
}) => {
  const [editingSchedule, setEditingSchedule] = useState<ScheduleItem | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Otevřít modal pokud přišel požadavek z vnějšku (např. z hlavní karty spínače)
  React.useEffect(() => {
    if (selectedSchedule) {
      setEditingSchedule(selectedSchedule);
      setIsModalOpen(true);
      if (onClearSelectedSchedule) {
        onClearSelectedSchedule();
      }
    }
  }, [selectedSchedule, onClearSelectedSchedule]);

  // Map switchId to Switch item
  const switchMap = new Map<string, SwitchItem>(switches.map((s) => [s.id, s]));

  const handleOpenNew = () => {
    setEditingSchedule(null);
    setIsModalOpen(true);
  };

  const handleEdit = (schedule: ScheduleItem) => {
    setEditingSchedule(schedule);
    setIsModalOpen(true);
  };

  return (
    <div className="p-4 space-y-4">
      {/* Title bar */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-base font-bold text-slate-800 flex items-center gap-1.5">
            <Clock className="w-5 h-5 text-sky-600" />
            <span>Časovače a Plánovač sepnutí</span>
          </h2>
          <p className="text-xs text-slate-500">
            Automatické sepnutí a vypnutí relé dle nastaveného času a dnů
          </p>
        </div>

        <button
          id="btn-add-schedule"
          onClick={handleOpenNew}
          className="flex items-center gap-1.5 bg-sky-600 hover:bg-sky-700 active:scale-95 text-white font-medium text-xs px-3 py-2 rounded-xl transition shadow-xs"
        >
          <Plus className="w-4 h-4" />
          <span>Přidat</span>
        </button>
      </div>

      {/* Schedules List */}
      {schedules.length === 0 ? (
        <div className="bg-white rounded-2xl p-8 text-center border border-slate-200 shadow-xs">
          <Clock className="w-10 h-10 text-slate-300 mx-auto mb-2" />
          <p className="text-sm font-semibold text-slate-700">Žádný aktivní časovač</p>
          <p className="text-xs text-slate-400 mt-1 max-w-xs mx-auto">
            Klikněte na tlačítko "Přidat" výše pro vytvoření automatického sepnutí nebo vypnutí.
          </p>
          <button
            onClick={handleOpenNew}
            className="mt-4 bg-sky-50 text-sky-700 border border-sky-200 px-4 py-1.5 rounded-lg text-xs font-semibold hover:bg-sky-100 transition"
          >
            + Vytvořit první časovač
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {schedules.map((item) => {
            const targetSwitch = switchMap.get(item.switchId);
            const switchName = targetSwitch
              ? `${targetSwitch.name} (OUT ${targetSwitch.channelIndex})`
              : 'Neznámý spínač';

            return (
              <div
                key={item.id}
                id={`schedule-item-${item.id}`}
                className={`rounded-2xl p-4 bg-white border transition-all shadow-xs ${
                  item.enabled
                    ? 'border-slate-200 hover:border-sky-300'
                    : 'border-slate-200/60 opacity-60 bg-slate-50/60'
                }`}
              >
                <div className="flex items-center justify-between gap-3">
                  <div
                    className="flex items-center gap-3 cursor-pointer select-none flex-1 group"
                    onClick={() => handleEdit(item)}
                    title="Kliknutím upravit časovač"
                  >
                    {/* Big time display */}
                    <div className="font-mono text-2xl font-bold tracking-tight text-slate-800 group-hover:text-sky-600 transition-colors">
                      {item.time}
                    </div>

                    <div>
                      {/* Action Pill & Target */}
                      <div className="flex items-center gap-1.5">
                        <span
                          className={`text-[10px] font-extrabold px-1.5 py-0.2 rounded uppercase ${
                            item.action === 'ON'
                              ? 'bg-sky-100 text-sky-700 border border-sky-200'
                              : 'bg-slate-200 text-slate-700'
                          }`}
                        >
                          {item.action === 'ON' ? 'Sepnout (ON)' : 'Vypnout (OFF)'}
                        </span>
                        <span className="text-xs font-semibold text-slate-800 group-hover:underline">
                          {switchName}
                        </span>
                      </div>

                      {/* Repetition label */}
                      <p className="text-xs text-slate-500 mt-0.5 flex items-center gap-1">
                        <Calendar className="w-3 h-3 text-slate-400" />
                        <span>{formatScheduleRepeat(item.repeatType, item.customDays)}</span>
                      </p>
                    </div>
                  </div>

                  {/* Controls */}
                  <div className="flex items-center gap-2">
                    {/* Instant test trigger */}
                    <button
                      onClick={() => onTriggerTestSchedule(item)}
                      title="Simulovat okamžité spuštění tohoto časovače"
                      className="p-1.5 rounded-lg text-slate-400 hover:text-sky-600 hover:bg-sky-50 transition"
                    >
                      <Play className="w-3.5 h-3.5" />
                    </button>

                    {/* Edit button */}
                    <button
                      onClick={() => handleEdit(item)}
                      title="Upravit časovač"
                      className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>

                    {/* Enable Toggle Switch */}
                    <button
                      onClick={() => onToggleSchedule(item.id)}
                      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                        item.enabled ? 'bg-sky-600' : 'bg-slate-300'
                      }`}
                      aria-label="Zapnout/vypnout časovač"
                    >
                      <span
                        className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                          item.enabled ? 'translate-x-6' : 'translate-x-1'
                        }`}
                      />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Schedule Edit / Create Modal */}
      <ScheduleModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSave={onSaveSchedule}
        onDelete={onDeleteSchedule}
        initialSchedule={editingSchedule}
        switches={switches}
      />
    </div>
  );
};
