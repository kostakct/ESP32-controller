import React, { useState, useEffect, useRef } from 'react';
import {
  SwitchItem,
  ScheduleItem,
  ESP32DeviceStatus,
  AppNotification,
} from './types';
import {
  INITIAL_SWITCHES,
  INITIAL_SCHEDULES,
  INITIAL_DEVICE_STATUS,
} from './data/initialData';
import { Header } from './components/Header';
import { SwitchCard } from './components/SwitchCard';
import { SettingsModal } from './components/SettingsModal';
import { MobileTestModal } from './components/MobileTestModal';
import { ScheduleView } from './components/ScheduleView';
import { HardwareInfoView } from './components/HardwareInfoView';
import { BottomNav, TabType } from './components/BottomNav';
import { EspCodeModal } from './components/EspCodeModal';
import { NotificationToast } from './components/NotificationToast';
import { Power, CheckCircle, RotateCcw, Sparkles, FileCode } from 'lucide-react';
import { formatDuration } from './utils/formatters';
import { useMqtt } from './hooks/useMqtt';

const STORAGE_KEY_SWITCHES = 'ewelink_esp32_switches_v1';
const STORAGE_KEY_SCHEDULES = 'ewelink_esp32_schedules_v1';

export default function App() {
  // Load saved switches or fall back to initial
  const [switches, setSwitches] = useState<SwitchItem[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_SWITCHES);
      if (saved) {
        const parsed: SwitchItem[] = JSON.parse(saved);
        // Reset volatile runtime states on initial load according to powerOnState!
        return parsed.map((item) => ({
          ...item,
          isOn:
            item.powerOnState === 'ON'
              ? true
              : item.powerOnState === 'OFF'
              ? false
              : item.isOn,
          isDelayRunning: false,
          currentRepeats: 1,
          remainingSeconds: 0,
          totalDelaySeconds: 0,
        }));
      }
    } catch {
      // ignore
    }
    return INITIAL_SWITCHES;
  });

  // Load saved schedules
  const [schedules, setSchedules] = useState<ScheduleItem[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_SCHEDULES);
      if (saved) return JSON.parse(saved);
    } catch {
      // ignore
    }
    return INITIAL_SCHEDULES;
  });

  // Device status simulation
  const [deviceStatus, setDeviceStatus] = useState<ESP32DeviceStatus>(INITIAL_DEVICE_STATUS);

  // Custom MQTT Hook
  const { isConnected, telemetry, sendRelayCommand } = useMqtt();

  // Ref pro přístup k aktuálnímu stavu spínačů uvnitř MQTT efektu bez zacyklení
  const switchesRef = useRef(switches);
  useEffect(() => { switchesRef.current = switches; }, [switches]);

  // Listen to MQTT Telemetry to update device status
  useEffect(() => {
    if (telemetry) {
      if (telemetry.event === 'boot') {
        // ESP se právě probudilo/restartovalo -> Diktujeme stav!
        setDeviceStatus(prev => ({ ...prev, online: true }));
        setSwitches(prev => {
          const next = [...prev];
          next.forEach(sw => {
            let targetState = false;
            if (sw.powerOnState === 'ON') targetState = true;
            else if (sw.powerOnState === 'OFF') targetState = false;
            else if (sw.powerOnState === 'KEEP') targetState = sw.isOn; // Poslední známý stav
            
            // Okamžitě odešleme garantovaně přes QoS 1
            sendRelayCommand(sw.channelIndex - 1, targetState);
            sw.isOn = targetState;
          });
          return next;
        });
      } else if (telemetry.event === 'telemetry') {
        setDeviceStatus(prev => ({
          ...prev,
          online: true,
          oneWireTemp1: telemetry.onewire1_temp ?? prev.oneWireTemp1,
          oneWireTemp2: telemetry.onewire2_temp ?? prev.oneWireTemp2,
          am2320Temp: telemetry.am2320_temp ?? prev.am2320Temp,
          am2320Hum: telemetry.am2320_hum ?? prev.am2320Hum,
          ldr: telemetry.ldr ?? prev.ldr,
        }));

        // SELF-HEALING: Kontrola, zda se hardware nerozjel s aplikací
        if (telemetry.relays && Array.isArray(telemetry.relays)) {
          switchesRef.current.forEach(sw => {
            const hwState = telemetry.relays[sw.channelIndex - 1];
            if (hwState !== undefined) {
              const isHwOn = hwState === 1;
              if (isHwOn !== sw.isOn) {
                // Aplikace si myslí něco jiného než HW hlásí. 
                // Aplikace je MASTER (kvůli Delay a Schedules), takže převálcujeme HW.
                console.log(`[AUTOSYNC] Nesoulad relé ${sw.channelIndex}. App: ${sw.isOn}, HW: ${isHwOn}. Odesílám opravu.`);
                sendRelayCommand(sw.channelIndex - 1, sw.isOn);
              }
            }
          });
        }

      } else if (telemetry.event === 'button_press') {
        const btnIndex = telemetry.button_index;
        setDeviceStatus(prev => {
          const next = { ...prev };
          if (btnIndex === 0) next.input1Active = true;
          if (btnIndex === 1) next.input2Active = true;
          if (btnIndex === 2) next.input3Active = true;
          if (btnIndex === 3) next.input4Active = true;
          return next;
        });
        
        // Auto-release button visual in 500ms
        setTimeout(() => {
          setDeviceStatus(prev => {
            const next = { ...prev };
            if (btnIndex === 0) next.input1Active = false;
            if (btnIndex === 1) next.input2Active = false;
            if (btnIndex === 2) next.input3Active = false;
            if (btnIndex === 3) next.input4Active = false;
            return next;
          });
        }, 500);
      }
    }
  }, [telemetry]);

  // Active view tab
  const [activeTab, setActiveTab] = useState<TabType>('switches');

  // Modals state
  const [isSettingsOpen, setIsSettingsOpen] = useState<boolean>(false);
  const [activeSwitchSettingsId, setActiveSwitchSettingsId] = useState<string | null>(null);
  const [isMobileTestOpen, setIsMobileTestOpen] = useState<boolean>(false);
  const [isEspCodeOpen, setIsEspCodeOpen] = useState<boolean>(false);

  // Mobile frame simulator toggle
  const [isPhoneFrame, setIsPhoneFrame] = useState<boolean>(true);

  // Notifications
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const notifTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const lastNotifTimestamps = useRef<Record<string, number>>({});
  const lastToggleClickRef = useRef<Record<string, number>>({});

  const [notificationPermission, setNotificationPermission] = useState<
    NotificationPermission | 'unsupported'
  >(() => {
    if (typeof window !== 'undefined' && 'Notification' in window) {
      return Notification.permission;
    }
    return 'unsupported';
  });

  // Save changes to localStorage
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY_SWITCHES, JSON.stringify(switches));
    } catch {
      // ignore
    }
  }, [switches]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY_SCHEDULES, JSON.stringify(schedules));
    } catch {
      // ignore
    }
  }, [schedules]);

  // Request browser notification permission
  const requestNotificationPermission = async (): Promise<boolean> => {
    if (typeof window !== 'undefined' && 'Notification' in window) {
      try {
        const res = await Notification.requestPermission();
        setNotificationPermission(res);
        return res === 'granted';
      } catch {
        return false;
      }
    }
    return false;
  };

  // Dispatch an app notification (in-app toast + browser push)
  // Strictly triggers only 1x per event and ensures only 1 notification on the display
  const notify = (
    title: string,
    body: string,
    switchId: string,
    type: 'ON' | 'OFF' | 'TIMER' | 'SCHEDULE'
  ) => {
    const now = Date.now();
    const dedupeKey = `${switchId}_${type}`;
    const lastTimestamp = lastNotifTimestamps.current[dedupeKey] || 0;

    // Reject duplicate notification within 1200ms for the same switch & action type
    if (now - lastTimestamp < 1200) {
      return;
    }
    lastNotifTimestamps.current[dedupeKey] = now;

    const id = `notif_${now}_${Math.random().toString(36).substring(2, 7)}`;
    const newNotif: AppNotification = { id, title, body, timestamp: now, switchId, type };

    // Strict requirement: Only 1 active notification shown on the display at a time
    setNotifications([newNotif]);

    if (notifTimeoutRef.current) {
      clearTimeout(notifTimeoutRef.current);
    }

    // Auto dismiss after 3.5 seconds
    notifTimeoutRef.current = setTimeout(() => {
      setNotifications([]);
    }, 3500);

    // Browser Notification API
    if (
      typeof window !== 'undefined' &&
      'Notification' in window &&
      Notification.permission === 'granted'
    ) {
      try {
        new Notification(title, {
          body,
          icon: '/favicon.ico',
        });
      } catch {
        // ignore
      }
    }
  };

  // Helper to test notifications on switch state change
  const checkAndNotifySwitch = (item: SwitchItem, nextState: boolean, isTimerAuto: boolean = false) => {
    const mode = item.notificationMode;
    // If notification for this switch is turned off, do nothing
    if (mode === 'OFF') return;

    if (nextState) {
      // Turning ON
      if (mode === 'ALL' || mode === 'ONLY_ON') {
        notify(
          `${item.name} se zapnul`,
          `Relé OUT ${item.channelIndex} bylo sepnuto do stavu ON.`,
          item.id,
          'ON'
        );
      }
    } else {
      // Turning OFF
      if (mode === 'ALL' || mode === 'ONLY_OFF') {
        notify(
          `${item.name} se vypnul`,
          isTimerAuto
            ? `Delay časovač vypršel. Relé OUT ${item.channelIndex} bylo automaticky vypnuto.`
            : `Relé OUT ${item.channelIndex} bylo vypnuto do stavu OFF.`,
          item.id,
          isTimerAuto ? 'TIMER' : 'OFF'
        );
      }
    }
  };

  // Timer Tick Interval (running every 200ms to handle smooth 0.5s decrements)
  useEffect(() => {
    const interval = setInterval(() => {
      let expiredSwitchToNotify: SwitchItem | null = null;

      setSwitches((prevSwitches) => {
        let changed = false;
        const updated = prevSwitches.map((sw) => {
          if (sw.isOn && sw.isDelayRunning && sw.remainingSeconds > 0) {
            const nextSec = Math.max(0, sw.remainingSeconds - 0.2);
            if (nextSec <= 0) {
              // Time expired! Switch OFF, reset repeat count to 1
              changed = true;
              if (!expiredSwitchToNotify) {
                expiredSwitchToNotify = sw;
              }
              // [MQTT SEND]
              sendRelayCommand(sw.channelIndex - 1, false);
              return {
                ...sw,
                isOn: false,
                isDelayRunning: false,
                remainingSeconds: 0,
                totalDelaySeconds: 0,
                currentRepeats: 1, // Resets back to default
              };
            }
            changed = true;
            return {
              ...sw,
              remainingSeconds: nextSec,
            };
          }
          return sw;
        });

        return changed ? updated : prevSwitches;
      });

      // Trigger notification strictly OUTSIDE state updater
      if (expiredSwitchToNotify) {
        checkAndNotifySwitch(expiredSwitchToNotify, false, true);
      }
    }, 200);

    return () => clearInterval(interval);
  }, []);

  // Scheduler interval (checks current minute)
  const lastCheckedMinute = useRef<string>('');
  const lastTriggeredScheduleKeys = useRef<Set<string>>(new Set());

  useEffect(() => {
    const checkSchedule = () => {
      const now = new Date();
      const currentDay = now.getDay(); // 0 = Sun, 1 = Mon ...
      const hh = String(now.getHours()).padStart(2, '0');
      const mm = String(now.getMinutes()).padStart(2, '0');
      const timeKey = `${now.toDateString()} ${hh}:${mm}`;

      if (lastCheckedMinute.current !== timeKey) {
        lastCheckedMinute.current = timeKey;
        lastTriggeredScheduleKeys.current.clear();
      }

      schedules.forEach((sch) => {
        if (!sch.enabled) return;
        if (sch.time !== `${hh}:${mm}`) return;
        if (lastTriggeredScheduleKeys.current.has(sch.id)) return;

        // Check day match
        let dayMatches = false;
        if (sch.repeatType === 'ONCE') dayMatches = true;
        else if (sch.repeatType === 'DAILY') dayMatches = true;
        else if (sch.repeatType === 'WEEKDAYS') dayMatches = currentDay >= 1 && currentDay <= 5;
        else if (sch.repeatType === 'WEEKENDS') dayMatches = currentDay === 0 || currentDay === 6;
        else if (sch.repeatType === 'CUSTOM') dayMatches = sch.customDays.includes(currentDay);

        if (dayMatches) {
          lastTriggeredScheduleKeys.current.add(sch.id);
          triggerScheduleAction(sch);
        }
      });
    };

    const interval = setInterval(checkSchedule, 1000);
    return () => clearInterval(interval);
  }, [schedules]);

  // Trigger a schedule action
  const triggerScheduleAction = (sch: ScheduleItem) => {
    const target = switches.find((s) => s.id === sch.switchId);
    if (!target) return;

    const nextState = sch.action === 'ON';
    // [MQTT SEND]
    sendRelayCommand(target.channelIndex - 1, nextState);
    setSwitches((prev) =>
      prev.map((s) => {
        if (s.id === sch.switchId) {
          return {
            ...s,
            isOn: nextState,
            isDelayRunning: false,
            remainingSeconds: 0,
            currentRepeats: 1,
          };
        }
        return s;
      })
    );

    // Notify strictly 1x outside state updater
    notify(
      `Časovač: ${target.name}`,
      `Plánovač provedl akci: ${sch.action === 'ON' ? 'ZAPNUTO (ON)' : 'VYPNUTO (OFF)'} dle času ${sch.time}.`,
      target.id,
      'SCHEDULE'
    );
  };

  // Switch Toggle & Delay Repeat rotation handler
  const handleToggleSwitch = (id: string) => {
    // 300ms anti-bounce for fast taps / double clicks
    const now = Date.now();
    if (now - (lastToggleClickRef.current[id] || 0) < 300) {
      return;
    }
    lastToggleClickRef.current[id] = now;

    // Check current switch state outside state updater
    const currentSw = switches.find((s) => s.id === id);
    if (!currentSw) return;

    let willNotify = false;
    let willTurnOn = false;

    if (!currentSw.delayConfig.enabled) {
      willTurnOn = !currentSw.isOn;
      willNotify = true;
    } else {
      if (!currentSw.isOn) {
        willTurnOn = true;
        willNotify = true;
      } else {
        // Rotating repeat (1x, 2x, 3x...) - no notification per spec
        willNotify = false;
      }
    }

    // Pure state updater - NO side effects inside!
    setSwitches((prev) =>
      prev.map((sw) => {
        if (sw.id !== id) return sw;

        // Case 1: Delay is NOT enabled -> simple ON/OFF toggle
        if (!sw.delayConfig.enabled) {
          const nextState = !sw.isOn;
          // [MQTT SEND]
          sendRelayCommand(sw.channelIndex - 1, nextState);
          return {
            ...sw,
            isOn: nextState,
            isDelayRunning: false,
            remainingSeconds: 0,
            currentRepeats: 1,
          };
        }

        // Case 2: Delay is enabled
        // 2a) If switch is OFF -> Turn ON, start Delay at 1x
        if (!sw.isOn) {
          const baseDuration = sw.delayConfig.durationSeconds;
          // [MQTT SEND]
          sendRelayCommand(sw.channelIndex - 1, true);
          return {
            ...sw,
            isOn: true,
            isDelayRunning: true,
            currentRepeats: 1,
            totalDelaySeconds: baseDuration,
            remainingSeconds: baseDuration,
          };
        }

        // 2b) Switch is already ON and Delay is running:
        // Rotate repeats
        const max = sw.delayConfig.maxRepeats;
        const nextRepeats = sw.currentRepeats >= max ? 1 : sw.currentRepeats + 1;
        const baseDuration = sw.delayConfig.durationSeconds;
        const newTotalDuration = baseDuration * nextRepeats;
        const nextRemaining =
          nextRepeats === 1
            ? baseDuration
            : sw.remainingSeconds + baseDuration;

        return {
          ...sw,
          currentRepeats: nextRepeats,
          totalDelaySeconds: newTotalDuration,
          remainingSeconds: nextRemaining,
        };
      })
    );

    // Strictly trigger notification ONCE outside the state updater
    if (willNotify) {
      checkAndNotifySwitch(currentSw, willTurnOn, false);
    }
  };

  // 2s Long Press strict reset to default state (OFF, cancels timer & repeats)
  const handleLongPressReset = (id: string) => {
    const currentSw = switches.find((s) => s.id === id);
    setSwitches((prev) =>
      prev.map((sw) => {
        if (sw.id !== id) return sw;
        return {
          ...sw,
          isOn: false,
          isDelayRunning: false,
          remainingSeconds: 0,
          currentRepeats: 1,
          totalDelaySeconds: 0,
        };
      })
    );

    if (currentSw && currentSw.isOn) {
      checkAndNotifySwitch(currentSw, false, false);
    }
  };

  // Reorder switches
  const handleMoveOrder = (id: string, direction: 'up' | 'down') => {
    setSwitches((prev) => {
      const sorted = [...prev].sort((a, b) => a.order - b.order);
      const index = sorted.findIndex((s) => s.id === id);
      if (index === -1) return prev;

      const targetIndex = direction === 'up' ? index - 1 : index + 1;
      if (targetIndex < 0 || targetIndex >= sorted.length) return prev;

      // Swap orders
      const currentItem = sorted[index];
      const targetItem = sorted[targetIndex];

      const currentOrder = currentItem.order;
      currentItem.order = targetItem.order;
      targetItem.order = currentOrder;

      return [...sorted];
    });
  };

  // Update switch properties from Settings modal
  const handleUpdateSwitch = (updated: SwitchItem) => {
    setSwitches((prev) => prev.map((s) => (s.id === updated.id ? updated : s)));
  };

  // Schedule handlers
  const handleToggleSchedule = (id: string) => {
    setSchedules((prev) =>
      prev.map((s) => (s.id === id ? { ...s, enabled: !s.enabled } : s))
    );
  };

  const handleSaveSchedule = (newOrUpdated: ScheduleItem) => {
    setSchedules((prev) => {
      const exists = prev.some((s) => s.id === newOrUpdated.id);
      if (exists) {
        return prev.map((s) => (s.id === newOrUpdated.id ? newOrUpdated : s));
      }
      return [...prev, newOrUpdated];
    });
  };

  const handleDeleteSchedule = (id: string) => {
    setSchedules((prev) => prev.filter((s) => s.id !== id));
  };

  // Master All ON / All OFF controls
  const handleSetAll = (turnOn: boolean) => {
    setSwitches((prev) =>
      prev.map((s) => {
        if (!s.visible) return s;
        // [MQTT SEND]
        sendRelayCommand(s.channelIndex - 1, turnOn);
        return {
          ...s,
          isOn: turnOn,
          isDelayRunning: false,
          remainingSeconds: 0,
          currentRepeats: 1,
        };
      })
    );

    // Single unified notification for master action
    notify(
      turnOn ? 'Vše zapnuto (ALL ON)' : 'Vše vypnuto (ALL OFF)',
      turnOn
        ? 'Všechny viditelné kanály byly hromadně sepnuty do stavu ON.'
        : 'Všechny viditelné kanály byly hromadně vypnuty do stavu OFF.',
      'master_all',
      turnOn ? 'ON' : 'OFF'
    );
  };

  // Filter visible switches and sort by order
  const visibleSwitches = switches
    .filter((s) => s.visible)
    .sort((a, b) => a.order - b.order);

  const activeSwitchesCount = visibleSwitches.filter((s) => s.isOn).length;
  const activeTimersCount = schedules.filter((s) => s.enabled).length;

  return (
    <div className="fixed inset-0 sm:relative sm:inset-auto sm:min-h-screen w-full h-full sm:h-auto bg-slate-900 text-slate-800 flex flex-col items-center justify-start antialiased selection:bg-sky-500 selection:text-white overflow-hidden sm:overflow-visible">
      {/* Toast notifications */}
      <NotificationToast
        notifications={notifications}
        onDismiss={(id) => setNotifications((prev) => prev.filter((n) => n.id !== id))}
      />

      {/* External Desktop Tool: TEST SW ESP32 (.ino) - placed outside the App view */}
      <div className="hidden sm:flex fixed top-4 right-4 z-40 items-center gap-2">
        <button
          id="btn-test-sw-esp32"
          onClick={() => setIsEspCodeOpen(true)}
          className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-slate-800/95 hover:bg-slate-700 text-slate-100 border border-slate-700 shadow-2xl backdrop-blur-md transition hover:scale-105 active:scale-95 text-xs font-semibold cursor-pointer group ring-1 ring-sky-500/30"
          title="Zobrazit a zkopírovat Arduino C++ kód pro ESP32 (.ino)"
        >
          <div className="w-5 h-5 rounded-md bg-sky-500/20 text-sky-400 flex items-center justify-center group-hover:bg-sky-500 group-hover:text-white transition">
            <FileCode className="w-3.5 h-3.5" />
          </div>
          <span>TEST SW ESP32</span>
          <span className="px-1.5 py-0.5 rounded text-[10px] font-mono bg-sky-500/20 text-sky-300 font-bold border border-sky-400/20">
            .ino
          </span>
        </button>
      </div>

      {/* Main Container: Mobile Frame or Full Screen */}
      <div
        className={`w-full h-[100dvh] sm:h-[840px] sm:max-h-[92vh] sm:my-6 transition-all duration-300 flex flex-col bg-[#eaf1f7] relative ${
          isPhoneFrame
            ? 'sm:max-w-md sm:rounded-[36px] sm:shadow-2xl sm:border-8 sm:border-slate-800 sm:ring-1 sm:ring-slate-700/50 sm:overflow-hidden'
            : 'sm:max-w-3xl sm:max-h-[95vh] sm:my-4 sm:rounded-2xl sm:shadow-xl sm:overflow-hidden'
        }`}
      >
        {/* Top App Header with eWeLink styling and Top-Corner Menu */}
        <Header
          deviceStatus={deviceStatus}
          onOpenSettings={() => {
            setActiveSwitchSettingsId(null);
            setIsSettingsOpen(true);
          }}
          onOpenMobileTest={() => setIsMobileTestOpen(true)}
          isPhoneFrame={isPhoneFrame}
          onTogglePhoneFrame={() => setIsPhoneFrame(!isPhoneFrame)}
        />

        {/* Scrollable View Area - optimized for smooth mobile touch pan */}
        <main className="flex-1 min-h-0 overflow-y-auto pb-4 touch-pan-y overscroll-y-contain">
          {/* TAB 1: SPÍNAČE (Hlavní ovládání) */}
          {activeTab === 'switches' && (
            <div className="p-3.5 space-y-3">
              {/* Quick Summary Card & Master Controls */}
              <div className="bg-white rounded-2xl p-3.5 border border-slate-200 shadow-xs flex items-center justify-between">
                <div>
                  <span className="text-[11px] text-slate-500 font-semibold block uppercase tracking-wide">
                    Stav relé
                  </span>
                  <div className="text-sm font-bold text-slate-800 mt-0.5 flex items-center gap-1.5">
                    <span
                      className={`w-2.5 h-2.5 rounded-full ${
                        activeSwitchesCount > 0 ? 'bg-sky-500 animate-pulse' : 'bg-slate-300'
                      }`}
                    />
                    <span>
                      {activeSwitchesCount} z {visibleSwitches.length} sepnuto
                    </span>
                  </div>
                </div>

                {/* Master Buttons */}
                <div className="flex items-center gap-1.5">
                  <button
                    id="btn-all-off"
                    onClick={() => handleSetAll(false)}
                    className="px-2.5 py-1.5 rounded-xl text-xs font-semibold bg-slate-100 hover:bg-slate-200 text-slate-700 transition active:scale-95 border border-slate-200"
                    title="Vypnout všechny spínače"
                  >
                    Vše OFF
                  </button>
                  <button
                    id="btn-all-on"
                    onClick={() => handleSetAll(true)}
                    className="px-2.5 py-1.5 rounded-xl text-xs font-semibold bg-sky-50 hover:bg-sky-100 text-sky-700 transition active:scale-95 border border-sky-300"
                    title="Zapnout všechny spínače"
                  >
                    Vše ON
                  </button>
                </div>
              </div>

              {/* Switches Grid / List with compact separation */}
              <div className="space-y-2.5">
                {visibleSwitches.length === 0 ? (
                  <div className="bg-white rounded-2xl p-8 text-center border border-slate-200 text-slate-500">
                    <p className="text-sm font-semibold">Všechny spínače jsou skryté</p>
                    <p className="text-xs text-slate-400 mt-1">
                      Otevřete horní menu "Nastavení" a aktivujte viditelnost požadovaných relé.
                    </p>
                    <button
                      onClick={() => setIsSettingsOpen(true)}
                      className="mt-3 px-3 py-1.5 bg-sky-600 text-white rounded-lg text-xs font-semibold"
                    >
                      Otevřít nastavení
                    </button>
                  </div>
                ) : (
                  visibleSwitches.map((item) => (
                    <SwitchCard
                      key={item.id}
                      item={item}
                      schedules={schedules}
                      onToggle={handleToggleSwitch}
                      onLongPressReset={handleLongPressReset}
                      onOpenItemSettings={(id) => {
                        setActiveSwitchSettingsId(id);
                        setIsSettingsOpen(true);
                      }}
                    />
                  ))
                )}
              </div>
            </div>
          )}

          {/* TAB 2: ČASOVAČ / PLÁNOVAČ (jak má ewelink) */}
          {activeTab === 'schedules' && (
            <ScheduleView
              schedules={schedules}
              switches={switches}
              onToggleSchedule={handleToggleSchedule}
              onSaveSchedule={handleSaveSchedule}
              onDeleteSchedule={handleDeleteSchedule}
              onTriggerTestSchedule={triggerScheduleAction}
            />
          )}

          {/* TAB 3: ESP32 HARDWARE A SENZORY */}
          {activeTab === 'esp32' && (
            <HardwareInfoView mode="esp32" deviceStatus={deviceStatus} switches={switches} />
          )}
        </main>

        {/* Bottom eWeLink-style Navigation Bar */}
        <BottomNav
          activeTab={activeTab}
          onChangeTab={setActiveTab}
          activeTimersCount={activeTimersCount}
        />
      </div>

      {/* Top Corner Settings Modal (Name, Order, Power-on state, Visibility, Delay mm:ss, Repeat limit, Notifications) */}
      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        switches={switches}
        onUpdateSwitch={handleUpdateSwitch}
        onMoveOrder={handleMoveOrder}
        onRequestNotificationPermission={requestNotificationPermission}
        notificationPermission={notificationPermission}
        activeSwitchId={activeSwitchSettingsId}
      />

      {/* Mobile Test & Android Install Modal */}
      <MobileTestModal
        isOpen={isMobileTestOpen}
        onClose={() => setIsMobileTestOpen(false)}
      />

      {/* External ESP32 Firmware Code Modal */}
      <EspCodeModal
        isOpen={isEspCodeOpen}
        onClose={() => setIsEspCodeOpen(false)}
      />
    </div>
  );
}
