import type React from 'react';
import {
  Zap,
  ToggleLeft,
  DoorOpen,
  Radar,
  Waves,
  CircleDot,
  Settings,
  Lock,
  AlertTriangle,
  WifiOff,
} from 'lucide-react';
import type { InConfig, InRuntime } from '../types';
import { isInputBlocked } from '../utils/inUtils';

const TILE_HEIGHT = 100; // stejná výška jako SwitchTile, ať dlaždice v mřížce pěkně sedí

// Ikona podle typu vstupu - stejný princip jako ikony u OUT prvků v SwitchTile.
const TYPE_ICON: Record<InConfig['type'], React.ElementType> = {
  button: Zap,
  switch: ToggleLeft,
  door: DoorOpen,
  pir: Radar,
  level: Waves,
  generic: CircleDot,
};

const TYPE_LABEL: Record<InConfig['type'], string> = {
  button: 'Tlačítko',
  switch: 'Vypínač',
  door: 'Dveřní kontakt',
  pir: 'PIR čidlo',
  level: 'Hladina',
  generic: 'Vstup',
};

export interface InTileProps {
  config: InConfig;
  runtime: InRuntime;
  onOpenSettings: () => void;
}

/**
 * Vrstva 1 pro IN prvek - kompaktní dlaždice analogická SwitchTile, ale
 * pro vstup: nic se tu nepřepíná (IN se jen sleduje), ukazuje se živý stav,
 * případná blokace/výluka a varování při zaseknutí.
 */
export function InTile({ config, runtime, onOpenSettings }: InTileProps) {
  const isOnline = runtime.link === 'online';
  const isActive = runtime.state === 'active';
  const Icon = TYPE_ICON[config.type] ?? CircleDot;

  const blockInfo = isInputBlocked(config);

  const containerBg = !isOnline
    ? 'bg-slate-100 border-[1.5px] border-dashed border-red-400'
    : runtime.isStuck
    ? 'bg-rose-50 border-[1.5px] border-rose-400'
    : isActive
    ? 'bg-amber-50 border-[1.5px] border-amber-300'
    : 'bg-white border-[1.5px] border-slate-200';

  return (
    <div
      className={`relative w-full rounded-xl overflow-hidden px-3 py-2.5 flex flex-col justify-between transition-colors ${containerBg}`}
      style={{ height: TILE_HEIGHT }}
    >
      {/* Horní řádek: ikona + název + nastavení */}
      <div className="flex items-start justify-between gap-1.5">
        <div className="flex items-center gap-1.5 min-w-0">
          <Icon
            className={`w-[20px] h-[20px] shrink-0 ${
              !isOnline ? 'text-slate-400' : isActive ? 'text-amber-600' : 'text-slate-400'
            }`}
            strokeWidth={1.8}
          />
          <div className="min-w-0">
            <div className="text-[13px] font-bold text-slate-800 truncate leading-tight">
              {config.name}
            </div>
            <div className="text-[10px] text-slate-400 font-medium">
              {TYPE_LABEL[config.type]} · GPIO {config.gpioPin}
            </div>
          </div>
        </div>
        <button
          onClick={onOpenSettings}
          className="p-1 rounded-lg text-slate-400 hover:text-sky-600 hover:bg-sky-50 shrink-0"
          aria-label={`Nastavení ${config.name}`}
          title="Pokročilé nastavení"
        >
          <Settings className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Spodní řádek: stavový odznak + varování */}
      <div className="flex items-center justify-between gap-1 flex-wrap">
        <span
          className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
            !isOnline
              ? 'bg-red-100 text-red-600'
              : isActive
              ? 'bg-amber-100 text-amber-700 animate-pulse'
              : 'bg-slate-200 text-slate-600'
          }`}
        >
          {!isOnline ? 'OFFLINE' : isActive ? 'Aktivní' : 'Klid'}
        </span>

        <div className="flex items-center gap-1">
          {runtime.isStuck && (
            <span
              title={`Zaseknuto aktivní > ${config.stuckAlarm.maxSec}s`}
              className="flex items-center gap-0.5 px-1.5 py-0.5 rounded bg-rose-100 text-rose-700 text-[9.5px] font-bold"
            >
              <AlertTriangle className="w-3 h-3" />
              Zaseknuto
            </span>
          )}
          {blockInfo.blocked && (
            <span
              title={blockInfo.reason}
              className="flex items-center gap-0.5 px-1.5 py-0.5 rounded bg-slate-200 text-slate-600 text-[9.5px] font-bold"
            >
              <Lock className="w-3 h-3" />
              Blokováno
            </span>
          )}
          {!isOnline && <WifiOff className="w-3.5 h-3.5 text-red-400" />}
        </div>
      </div>
    </div>
  );
}
