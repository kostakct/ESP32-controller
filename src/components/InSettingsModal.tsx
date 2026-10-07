import React, { useState } from 'react';
import {
  X,
  Eye,
  EyeOff,
  Bell,
  ChevronDown,
  ChevronUp,
  Sliders,
  Sparkles,
  Lock,
  Unlock,
  VolumeX,
  Volume2,
  Calendar as CalendarIcon,
} from 'lucide-react';
import { InConfig, InNotifyMode, QuickLock } from '../types';
import { IN_QUICK_LOCK_ITEMS } from '../utils/inUtils';
import { CalendarPickerModal } from './CalendarPicker';

/*
 * Vrstva 2 pro IN prvky (digitální vstupy) - obdoba SettingsModal.tsx (Vrstva 2
 * pro OUT): rychlé, nejčastěji měněné nastavení - plán (rychlá blokace),
 * notifikace, zámek (bypass). Podrobnosti (debounce, typ kontaktu, dlouhý
 * stisk, celý kalendář výluk...) zůstávají ve Vrstvě 3 (InConfigCard),
 * otevírané stejným tlačítkem "Otevřít pokročilé nastavení prvku" jako u OUT.
 *
 * POZOR: InConfig nemá (na rozdíl od SwitchItem u OUT) přímé pole `visible`/
 * `order` - viditelnost a pořadí jsou u IN uložené per-role v `prefsByRole`.
 * Dokud appka nemá reálné role (viz ARCHITECTURE.md kap. 6 a 9), pracuje
 * tahle karta zjednodušeně jen s rolí 'admin' jako společným nastavením.
 */

interface InSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  inConfigs: InConfig[];
  onUpdateInConfig: (updated: InConfig) => void;
  onRequestNotificationPermission: () => Promise<boolean>;
  notificationPermission: NotificationPermission | 'unsupported';
  activeInId?: string | null;
  onOpenAdvanced?: (inId: string) => void;
}

const NOTIFY_OPTIONS: { mode: InNotifyMode; label: string }[] = [
  { mode: 'none', label: 'Vypnuto' },
  { mode: 'both', label: 'Každá změna' },
  { mode: 'on_active', label: 'Jen Aktivní' },
  { mode: 'on_inactive', label: 'Jen Klid' },
  { mode: 'stuck', label: 'Jen zaseknutí' },
];

export const InSettingsModal: React.FC<InSettingsModalProps> = ({
  isOpen,
  onClose,
  inConfigs,
  onUpdateInConfig,
  onRequestNotificationPermission,
  notificationPermission,
  activeInId,
  onOpenAdvanced,
}) => {
  const [expandedId, setExpandedId] = useState<string | null>(
    activeInId || inConfigs[0]?.id || null
  );
  const [calendarOpenForId, setCalendarOpenForId] = useState<string | null>(null);

  React.useEffect(() => {
    if (activeInId) {
      setExpandedId(activeInId);
      setTimeout(() => {
        const el = document.getElementById(`in-settings-item-${activeInId}`);
        if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }, 100);
    }
  }, [activeInId, isOpen]);

  if (!isOpen) return null;

  const sortedConfigs = [...inConfigs].sort(
    (a, b) => a.prefsByRole.admin.orderInRoom - b.prefsByRole.admin.orderInRoom
  );

  const toggleVisible = (item: InConfig) => {
    onUpdateInConfig({
      ...item,
      prefsByRole: {
        ...item.prefsByRole,
        admin: { ...item.prefsByRole.admin, showInRoom: !item.prefsByRole.admin.showInRoom },
      },
    });
  };

  const setQuickLock = (item: InConfig, quickLock: QuickLock) => {
    onUpdateInConfig({ ...item, quickLock });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-slate-900/60 backdrop-blur-xs p-0 sm:p-4 overflow-y-auto">
      <div
        className="w-full max-w-lg bg-white rounded-t-3xl sm:rounded-2xl shadow-2xl flex flex-col max-h-[92vh] sm:max-h-[85vh] overflow-hidden animate-in fade-in slide-in-from-bottom-6 duration-200"
        role="dialog"
        aria-modal="true"
      >
        {/* Hlavička */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-200 bg-slate-50/80 sticky top-0 z-10">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-indigo-100 text-indigo-700 flex items-center justify-center">
              <Sliders className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-800">Správa a nastavení vstupů</h2>
              <p className="text-xs text-slate-500">Rychlé nastavení pro digitální vstupy ESP32-S3</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-full hover:bg-slate-200 text-slate-500 hover:text-slate-800 transition"
            aria-label="Zavřít"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tělo - scrollovatelné */}
        <div className="p-4 sm:p-5 overflow-y-auto space-y-3 divide-y divide-slate-100 flex-1">
          {notificationPermission !== 'granted' && (
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 flex items-center justify-between text-xs text-amber-800">
              <div className="flex items-center gap-2">
                <Bell className="w-4 h-4 text-amber-600 flex-shrink-0" />
                <span>Povolte oznámení v prohlížeči pro příjem zpráv o aktivaci vstupu.</span>
              </div>
              <button
                onClick={onRequestNotificationPermission}
                className="bg-amber-600 hover:bg-amber-700 text-white font-medium px-2.5 py-1 rounded-md text-[11px] whitespace-nowrap ml-2"
              >
                Povolit
              </button>
            </div>
          )}

          <div className="space-y-3 pt-1">
            {sortedConfigs.map((item) => {
              const isExpanded = expandedId === item.id;
              const prefs = item.prefsByRole.admin;
              const quickLockInfo = IN_QUICK_LOCK_ITEMS.find((q) => q.id === item.quickLock);

              return (
                <div
                  key={item.id}
                  id={`in-settings-item-${item.id}`}
                  className={`rounded-2xl border-2 transition-all duration-200 ${
                    isExpanded
                      ? 'border-indigo-500 bg-indigo-50/90 shadow-md ring-2 ring-indigo-400/30'
                      : 'border-slate-200 bg-white hover:border-slate-300 shadow-xs'
                  }`}
                >
                  {/* Hlavička řádku (sbalitelná) */}
                  <div
                    className={`p-3.5 flex items-center justify-between gap-2 cursor-pointer select-none transition-colors ${
                      isExpanded ? 'bg-indigo-100/50 rounded-t-2xl' : ''
                    }`}
                    onClick={() => setExpandedId(isExpanded ? null : item.id)}
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <span
                        className={`text-[11px] font-bold px-2 py-0.5 rounded border flex-shrink-0 ${
                          isExpanded
                            ? 'bg-indigo-600 text-white border-indigo-600 shadow-xs'
                            : 'bg-slate-100 text-slate-700 border-slate-300'
                        }`}
                      >
                        IN {item.inNumber}
                      </span>
                      <div className="truncate">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-semibold text-slate-800 truncate block">
                            {item.name}
                          </span>
                        </div>
                        <div className="flex items-center gap-2 text-[11px] text-slate-500">
                          <span className={prefs.showInRoom ? 'text-emerald-600 font-medium' : 'text-slate-400'}>
                            {prefs.showInRoom ? 'Viditelný' : 'Skrytý'}
                          </span>
                          {item.quickLock !== 'none' && (
                            <>
                              <span>•</span>
                              <span className="text-rose-700 font-semibold flex items-center gap-0.5">
                                <Lock className="w-3 h-3" /> {quickLockInfo?.title}
                              </span>
                            </>
                          )}
                          {item.bypass.enabled && (
                            <>
                              <span>•</span>
                              <span className="text-slate-500 font-semibold flex items-center gap-0.5">
                                <VolumeX className="w-3 h-3" /> Bypass
                              </span>
                            </>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5 flex-shrink-0" onClick={(e) => e.stopPropagation()}>
                      <button
                        onClick={() => toggleVisible(item)}
                        title={prefs.showInRoom ? 'Skrýt z displeje' : 'Zobrazit na displeji'}
                        className={`p-1.5 rounded transition ${
                          prefs.showInRoom ? 'text-indigo-600 hover:bg-indigo-50' : 'text-slate-400 hover:bg-slate-100'
                        }`}
                      >
                        {prefs.showInRoom ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                      </button>
                      <div className="text-slate-400 pl-1">
                        {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                      </div>
                    </div>
                  </div>

                  {/* Rozbalený obsah */}
                  {isExpanded && (
                    <div className="px-4 pb-4 pt-3 border-t border-indigo-200/80 space-y-4 text-xs bg-indigo-50/90 rounded-b-2xl">
                      {onOpenAdvanced && (
                        <button
                          onClick={() => onOpenAdvanced(item.id)}
                          className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-indigo-600 to-sky-600 hover:from-indigo-700 hover:to-sky-700 text-white font-semibold text-sm px-4 py-2.5 rounded-xl transition shadow-sm"
                        >
                          <Sparkles className="w-4 h-4" />
                          Otevřít pokročilé nastavení prvku
                        </button>
                      )}

                      {/* 1) NÁZEV VSTUPU */}
                      <div>
                        <label className="block font-semibold text-slate-700 mb-1">1) Název vstupu</label>
                        <input
                          type="text"
                          value={item.name}
                          onChange={(e) => onUpdateInConfig({ ...item, name: e.target.value })}
                          placeholder="Např. Nástěnné tlačítko, Dveřní kontakt..."
                          className="w-full px-3 py-2 bg-white rounded-lg border border-slate-300 text-slate-800 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition"
                        />
                      </div>

                      {/* 2) VIDITELNOST A POŘADÍ */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div>
                          <label className="block font-semibold text-slate-700 mb-1">2) Pořadí zobrazení</label>
                          <span className="text-sm font-bold text-slate-800 bg-white border border-slate-200 px-3 py-1.5 rounded-lg inline-block">
                            Pozice: #{prefs.orderInRoom}
                          </span>
                        </div>
                        <div>
                          <label className="block font-semibold text-slate-700 mb-1">Viditelnost na displeji</label>
                          <button
                            onClick={() => toggleVisible(item)}
                            className={`w-full px-3 py-1.5 rounded-lg text-sm font-bold border transition flex items-center justify-center gap-1.5 ${
                              prefs.showInRoom
                                ? 'bg-emerald-50 text-emerald-700 border-emerald-300'
                                : 'bg-slate-100 text-slate-500 border-slate-300'
                            }`}
                          >
                            {prefs.showInRoom ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                            {prefs.showInRoom ? 'Zobrazeno' : 'Skryto'}
                          </button>
                        </div>
                      </div>

                      {/* 3) RYCHLÁ BLOKACE (QuickLock) */}
                      <div>
                        <div className="flex items-center gap-1.5 mb-1.5">
                          <Lock className="w-3.5 h-3.5 text-rose-500" />
                          <label className="font-semibold text-slate-700 text-xs">3) Rychlá blokace</label>
                        </div>
                        <div className="space-y-1">
                          {IN_QUICK_LOCK_ITEMS.map((q) => (
                            <button
                              key={q.id}
                              onClick={() => {
                                setQuickLock(item, q.id);
                                if (q.id === 'off_calendar') setCalendarOpenForId(item.id);
                              }}
                              className={`w-full text-left px-3 py-1.5 rounded-lg border transition ${
                                item.quickLock === q.id
                                  ? 'bg-rose-600 text-white border-rose-600 shadow-xs'
                                  : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                              }`}
                            >
                              <div className="text-[11px] font-bold">{q.title}</div>
                              <div className={`text-[10px] ${item.quickLock === q.id ? 'text-rose-100' : 'text-slate-400'}`}>
                                {q.subtitle}
                              </div>
                            </button>
                          ))}
                          {item.quickLock === 'off_calendar' && (
                            <button
                              onClick={() => setCalendarOpenForId(item.id)}
                              className="w-full flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg border border-rose-300 bg-rose-50 text-rose-700 text-[11px] font-bold"
                            >
                              <CalendarIcon className="w-3.5 h-3.5" />
                              Upravit vybrané dny ({item.quickLockCalendarDays.length})
                            </button>
                          )}
                        </div>
                      </div>

                      {/* 4) NOTIFIKACE */}
                      <div>
                        <div className="flex items-center gap-1.5 mb-1.5">
                          <Bell className="w-3.5 h-3.5 text-amber-500" />
                          <label className="font-semibold text-slate-700 text-xs">4) Notifikace při změně stavu</label>
                        </div>
                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5">
                          {NOTIFY_OPTIONS.map((n) => (
                            <button
                              key={n.mode}
                              onClick={() => onUpdateInConfig({ ...item, notify: n.mode })}
                              className={`py-1.5 px-2 rounded-lg text-[11px] font-medium border text-center transition ${
                                item.notify === n.mode
                                  ? 'bg-amber-500 text-white border-amber-500 shadow-xs'
                                  : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                              }`}
                            >
                              {n.label}
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* 5) BYPASS (DOČASNÉ ZTIŠENÍ VSTUPU) */}
                      <div>
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-1.5">
                            {item.bypass.enabled ? (
                              <VolumeX className="w-3.5 h-3.5 text-slate-500" />
                            ) : (
                              <Volume2 className="w-3.5 h-3.5 text-slate-400" />
                            )}
                            <label className="font-semibold text-slate-700 text-xs">
                              5) Bypass (dočasné ztišení vstupu)
                            </label>
                          </div>
                          <button
                            onClick={() =>
                              onUpdateInConfig({
                                ...item,
                                bypass: { ...item.bypass, enabled: !item.bypass.enabled },
                              })
                            }
                            className={`px-2.5 py-1 rounded-full text-[11px] font-bold transition flex items-center gap-1 ${
                              item.bypass.enabled ? 'bg-slate-600 text-white shadow-xs' : 'bg-slate-200 text-slate-600'
                            }`}
                          >
                            {item.bypass.enabled ? <Lock className="w-3 h-3" /> : <Unlock className="w-3 h-3" />}
                            {item.bypass.enabled ? 'ZTIŠENO' : 'AKTIVNÍ'}
                          </button>
                        </div>
                        <p className="text-[11px] text-slate-500 mt-1">
                          Dočasně vyřadí vstup z vyhodnocování (např. při servisu), bez nutnosti měnit celý plán výluk.
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Patička */}
        <div className="px-5 py-3 border-t border-slate-200 bg-slate-50 flex items-center justify-between">
          <span className="text-xs text-slate-500">Změny se okamžitě ukládají do lokální paměti</span>
          <button
            onClick={onClose}
            className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold px-4 py-2 rounded-lg transition shadow-xs"
          >
            Hotovo
          </button>
        </div>
      </div>

      {calendarOpenForId &&
        (() => {
          const item = inConfigs.find((c) => c.id === calendarOpenForId);
          if (!item) return null;
          return (
            <CalendarPickerModal
              selectedDays={item.quickLockCalendarDays}
              onChange={(days) => onUpdateInConfig({ ...item, quickLockCalendarDays: days })}
              onClose={() => setCalendarOpenForId(null)}
            />
          );
        })()}
    </div>
  );
};
