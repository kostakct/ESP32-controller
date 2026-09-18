import React from 'react';
import { ToggleLeft, Clock, Cpu } from 'lucide-react';

export type TabType = 'switches' | 'schedules' | 'esp32';

interface BottomNavProps {
  activeTab: TabType;
  onChangeTab: (tab: TabType) => void;
  activeTimersCount: number;
}

export const BottomNav: React.FC<BottomNavProps> = ({
  activeTab,
  onChangeTab,
  activeTimersCount,
}) => {
  return (
    <nav className="shrink-0 w-full bg-white border-t border-slate-200/90 shadow-lg z-30 pb-[max(0.6rem,env(safe-area-inset-bottom))] pt-1.5 select-none">
      <div className="grid grid-cols-3 max-w-sm mx-auto px-3 gap-1">
        {/* 1) SPÍNAČE */}
        <button
          id="tab-switches"
          onClick={() => onChangeTab('switches')}
          className={`py-2 px-1 flex flex-col items-center justify-center transition rounded-2xl ${
            activeTab === 'switches'
              ? 'text-sky-600 font-bold bg-sky-50/80 shadow-xs'
              : 'text-slate-400 hover:text-slate-600'
          }`}
        >
          <div className="relative">
            <ToggleLeft className="w-5 h-5 stroke-[2.2]" />
          </div>
          <span className="text-[11px] sm:text-xs mt-1 tracking-tight font-medium">Spínače</span>
        </button>

        {/* 2) ČASOVAČE */}
        <button
          id="tab-schedules"
          onClick={() => onChangeTab('schedules')}
          className={`py-2 px-1 flex flex-col items-center justify-center transition rounded-2xl relative ${
            activeTab === 'schedules'
              ? 'text-sky-600 font-bold bg-sky-50/80 shadow-xs'
              : 'text-slate-400 hover:text-slate-600'
          }`}
        >
          <div className="relative">
            <Clock className="w-5 h-5 stroke-[2.2]" />
            {activeTimersCount > 0 && (
              <span className="absolute -top-1.5 -right-2.5 w-4 h-4 bg-sky-600 text-white rounded-full text-[9px] font-bold flex items-center justify-center shadow-xs">
                {activeTimersCount}
              </span>
            )}
          </div>
          <span className="text-[11px] sm:text-xs mt-1 tracking-tight font-medium">Časovače</span>
        </button>

        {/* 3) ESP32 */}
        <button
          id="tab-esp32"
          onClick={() => onChangeTab('esp32')}
          className={`py-2 px-1 flex flex-col items-center justify-center transition rounded-2xl ${
            activeTab === 'esp32'
              ? 'text-sky-600 font-bold bg-sky-50/80 shadow-xs'
              : 'text-slate-400 hover:text-slate-600'
          }`}
        >
          <div className="relative">
            <Cpu className="w-5 h-5 stroke-[2.2]" />
          </div>
          <span className="text-[11px] sm:text-xs mt-1 tracking-tight font-medium">ESP32</span>
        </button>
      </div>
    </nav>
  );
};
