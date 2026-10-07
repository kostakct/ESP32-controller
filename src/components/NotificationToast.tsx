import React from 'react';
import { Bell, X, Zap, Timer } from 'lucide-react';
import { AppNotification } from '../types';

interface NotificationToastProps {
  notifications: AppNotification[];
  onDismiss: (id: string) => void;
}

export const NotificationToast: React.FC<NotificationToastProps> = ({
  notifications,
  onDismiss,
}) => {
  if (notifications.length === 0) return null;

  // Enforce strictly 1 notification on the display
  const notif = notifications[0];
  if (!notif) return null;

  return (
    <div className="fixed top-3 left-0 right-0 z-50 flex flex-col items-center pointer-events-none px-3">
      <div
        key={notif.id}
        className="pointer-events-auto w-full max-w-sm bg-slate-900/95 text-white backdrop-blur-md rounded-2xl p-3 shadow-2xl border border-slate-700/80 flex items-start justify-between gap-3 animate-in slide-in-from-top-4 fade-in duration-200"
      >
        <div className="flex items-start gap-2.5 min-w-0">
          <div className="w-8 h-8 rounded-xl bg-sky-500/20 text-sky-400 border border-sky-500/30 flex items-center justify-center flex-shrink-0 mt-0.5">
            {notif.type === 'TIMER' ? (
              <Timer className="w-4 h-4 text-sky-400" />
            ) : (
              <Bell className="w-4 h-4 text-amber-400" />
            )}
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-bold text-sky-400 uppercase tracking-wide">
                eWeLink • ESP32
              </span>
              <span className="text-[10px] text-slate-400">právě teď</span>
            </div>
            <h4 className="text-xs font-semibold text-white truncate">{notif.title}</h4>
            <p className="text-[11px] text-slate-300 leading-snug">{notif.body}</p>
          </div>
        </div>

        <button
          onClick={() => onDismiss(notif.id)}
          className="p-1 text-slate-400 hover:text-white rounded-lg transition shrink-0"
          aria-label="Zavřít oznámení"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};
