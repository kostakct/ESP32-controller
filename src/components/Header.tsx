import React from 'react';
import { Wifi, SlidersHorizontal, Smartphone, Monitor, Cpu, WifiOff } from 'lucide-react';
import { ESP32DeviceStatus } from '../types';

interface HeaderProps {
  deviceStatus: ESP32DeviceStatus;
  isOffline?: boolean;
  onOpenSettings: () => void;
  onOpenMobileTest?: () => void;
  isPhoneFrame: boolean;
  onTogglePhoneFrame: () => void;
  unreadCount?: number;
}

export const Header: React.FC<HeaderProps> = ({
  deviceStatus,
  isOffline = false,
  onOpenSettings,
  onOpenMobileTest,
  isPhoneFrame,
  onTogglePhoneFrame,
}) => {
  return (
    <header className={`shrink-0 text-white px-3 py-2 shadow-md sticky top-0 z-30 transition-colors select-none flex items-center justify-between ${
      isOffline
        ? 'bg-gradient-to-r from-red-800 via-rose-900 to-red-900 border-b border-red-700'
        : 'bg-gradient-to-r from-sky-600 via-blue-600 to-sky-700'
    }`}>
      {/* Left side: Network & Status */}
      <div className="flex items-center gap-2 text-xs font-medium tracking-wide">
        <span
          className={`inline-block w-2.5 h-2.5 rounded-full ${
            isOffline
              ? 'bg-red-400 animate-ping'
              : 'bg-emerald-400 animate-pulse'
          }`}
        />
        <span className={`truncate max-w-[140px] xs:max-w-none ${isOffline ? 'text-red-200 font-bold' : 'text-sky-100'}`}>
          {isOffline ? 'ESP32 • ODPOJENO (OFFLINE)' : 'ESP32-S3 • PŘIPOJENO'}
        </span>
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

        <div className={`flex items-center gap-1 text-[11px] px-2 py-1 rounded-md border ${
          isOffline
            ? 'bg-red-950/60 border-red-500/50 text-red-200'
            : 'bg-white/10 border-white/10 text-emerald-300'
        }`}>
          {isOffline ? (
            <>
              <WifiOff className="w-3.5 h-3.5 text-red-400" />
              <span>Offline</span>
            </>
          ) : (
            <>
              <Wifi className="w-3.5 h-3.5 text-emerald-300" />
              <span>{deviceStatus.wifiRssi} dB</span>
            </>
          )}
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
