import React from 'react';
import { Wifi, SlidersHorizontal, Smartphone, Monitor, Cpu } from 'lucide-react';
import { ESP32DeviceStatus } from '../types';

interface HeaderProps {
  deviceStatus: ESP32DeviceStatus;
  onOpenSettings: () => void;
  onOpenMobileTest?: () => void;
  isPhoneFrame: boolean;
  onTogglePhoneFrame: () => void;
  unreadCount?: number;
}

export const Header: React.FC<HeaderProps> = ({
  deviceStatus,
  onOpenSettings,
  onOpenMobileTest,
  isPhoneFrame,
  onTogglePhoneFrame,
}) => {
  return (
    <header className="shrink-0 bg-gradient-to-r from-sky-600 via-blue-600 to-sky-700 text-white px-3 py-2 shadow-md sticky top-0 z-30 transition-all select-none flex items-center justify-between">
      {/* Left side: Network & Status */}
      <div className="flex items-center gap-2 text-xs text-sky-100 font-medium tracking-wide">
        <span className="inline-block w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
        <span className="truncate max-w-[120px] xs:max-w-none">ESP32-S3 • DOMÁCÍ SÍŤ</span>
      </div>

      {/* Right side: Tools, WiFi, Settings */}
      <div className="flex items-center gap-2.5">
        <button
          onClick={onTogglePhoneFrame}
          title={isPhoneFrame ? 'Přepnout na celou obrazovku' : 'Zobrazit v rámečku telefonu'}
          className="hidden sm:flex p-1.5 bg-sky-800/60 hover:bg-sky-800 rounded-lg text-sky-100 transition active:scale-95"
        >
          {isPhoneFrame ? <Monitor className="w-4 h-4" /> : <Smartphone className="w-4 h-4" />}
        </button>

        {onOpenMobileTest && (
          <button
            onClick={onOpenMobileTest}
            className="p-1.5 bg-white/15 hover:bg-white/25 rounded-lg text-white transition border border-white/20 active:scale-95"
            title="Otestovat na mobilu (QR Kód)"
          >
            <Smartphone className="w-4 h-4" />
          </button>
        )}

        <div className="flex items-center gap-1 text-[11px] bg-white/10 px-2 py-1 rounded-md border border-white/10">
          <Wifi className="w-3.5 h-3.5 text-emerald-300" />
          <span>{deviceStatus.wifiRssi} dB</span>
        </div>

        <button
          onClick={onOpenSettings}
          className="p-1.5 bg-white/20 hover:bg-white/30 rounded-lg text-white transition border border-white/30 shadow-xs active:scale-95"
          title="Nastavení spínačů"
        >
          <SlidersHorizontal className="w-4 h-4" />
        </button>
      </div>
    </header>
  );
};
