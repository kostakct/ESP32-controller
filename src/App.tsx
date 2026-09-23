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
  // Load saved switches or fall back to initial with robust 8-channel migration
  const [switches, setSwitches] = useState<SwitchItem[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_SWITCHES);
      if (saved) {
        const parsed: SwitchItem[] = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          // VŽDY zajistíme plných 8 kanálů sloučením s INITIAL_SWITCHES
          const merged: SwitchItem[] = INITIAL_SWITCHES.map((initSw) => {
            const existing = parsed.find(
              (p) => p.channelIndex === initSw.channelIndex || p.id === initSw.id
            );
            if (existing) {
              // Záchrana viditelnosti: podpora starých i nových klíčů (visible vs isVisible)
              const rawVis = existing.visible !== undefined 
                ? existing.visible 
                : ((existing as any).isVisible !== undefined ? (existing as any).isVisible : true);

              return {
                ...initSw,
                ...existing,
                name: existing.name || initSw.name,
                visible: Boolean(rawVis),
                delayConfig: {
                  ...initSw.delayConfig,
                  ...(existing.delayConfig || {}),
                },
                maxRuntimeGuardMinutes: existing.maxRuntimeGuardMinutes !== undefined 
                  ? existing.maxRuntimeGuardMinutes 
                  : initSw.maxRuntimeGuardMinutes,
                powerOnState: existing.powerOnState || initSw.powerOnState,
                notificationMode: existing.notificationMode || initSw.notificationMode,
                // Runtime stavy: inicializujeme bezpečně, reálný stav převezmeme z ESP32 přes MQTT
                isOn:
                  existing.powerOnState === 'ON'
                    ? true
                    : existing.powerOnState === 'OFF'
                    ? false
                    : Boolean(existing.isOn),
                isDelayRunning: false,
                currentRepeats: 1,
                remainingSeconds: 0,
                totalDelaySeconds: 0,
              };
            }
            return initSw;
          });

          // Bezpečnostní kontrola: pokud by z nějakého důvodu všechny prvky měly visible: false,
          // automaticky všechny zviditelníme, aby plocha nikdy nezůstala prázdná
          const hasAnyVisible = merged.some((s) => s.visible);
          if (!hasAnyVisible) {
            return merged.map((s) => ({ ...s, visible: true }));
          }

          return merged;
        }
      }
    } catch (e) {
      console.warn('Chyba při načítání spínačů z paměti, použity výchozí:', e);
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
  const {
    isConnected,
    telemetry,
    schedules: espSchedules,
    scheduleCommandError,
    lastMqttEvent,
    sendRelayCommand,
    sendRelayConfig,
    requestStatus,
    requestSchedules,
    sendSaveSchedule,
    sendDeleteSchedule,
  } = useMqtt();

  // Stav online/offline: NESTAČÍ, aby appka byla jen připojená k MQTT brokeru -
  // dokud nepřijde alespoň jedna SKUTEČNÁ telemetrie s reálným stavem výstupů
  // z ESP32, appka nesmí nic z lokální/domnělé paměti prezentovat jako platné
  // ("obnova appky nemůže tvrdit ON, když ESP má výstup reálně OFF").
  const [hasRealStatus, setHasRealStatus] = useState(false);
  const isOffline = !isConnected || !hasRealStatus;

  // Jakmile appka o spojení přijde, je nutné znovu počkat na novou, potvrzenou
  // telemetrii po opětovném připojení - stará data už neplatí jako jistota.
  useEffect(() => {
    if (!isConnected) setHasRealStatus(false);
  }, [isConnected]);

  const hasRealStatusRef = useRef(hasRealStatus);
  useEffect(() => { hasRealStatusRef.current = hasRealStatus; }, [hasRealStatus]);

  // Ref pro přístup k aktuálnímu stavu spínačů uvnitř MQTT efektu bez zacyklení
  const switchesRef = useRef(switches);
  useEffect(() => { switchesRef.current = switches; }, [switches]);

  // Listen to MQTT Telemetry to update device status & synchronize actual hardware reality
  useEffect(() => {
    if (telemetry) {
      if (telemetry.event === 'boot') {
        // ESP se probudilo / restartovalo. DŮLEŽITÉ: ESP32 NVS je jediný zdroj
        // pravdy pro konfiguraci (delay, guard, power-on) - appka už mu ji sem
        // záměrně nepřeposílá, jinak by po každém rebootu přepsala to, co má
        // ESP32 reálně uložené, svou vlastní (potenciálně starou) kopií.
        setDeviceStatus(prev => ({ ...prev, online: true, lastSeenTimestamp: Date.now() }));
        requestStatus();
        requestSchedules();
      } else if (telemetry.event === 'telemetry' || telemetry.event === 'status_response') {
        setDeviceStatus(prev => ({
          ...prev,
          online: true,
          lastSeenTimestamp: Date.now(),
          oneWireTemp1: telemetry.onewire1_temp ?? prev.oneWireTemp1,
          oneWireTemp2: telemetry.onewire2_temp ?? prev.oneWireTemp2,
          am2320Temp: telemetry.am2320_temp ?? prev.am2320Temp,
          am2320Hum: telemetry.am2320_hum ?? prev.am2320Hum,
          ldr: telemetry.ldr ?? prev.ldr,
        }));

        // ZPĚTNÁ SYNCHRONIZACE KONFIGURACE: ESP32 posílá i svou aktuální NVS
        // konfiguraci (ne jen on/off stav) - appka si podle ní opraví zobrazené
        // nastavení, nikdy naopak. Pole chybí u firmwaru, který tuto sekci
        // (cfg_*) ještě neposílá - pak se konfigurace jednoduše nezmění.
        if (Array.isArray(telemetry.cfg_delay_en)) {
          setSwitches(prev =>
            prev.map(sw => {
              const idx = sw.channelIndex - 1;
              const delayEn = telemetry.cfg_delay_en?.[idx];
              const delaySec = telemetry.cfg_delay_sec?.[idx];
              const guardMin = telemetry.cfg_guard_min?.[idx];
              const ponRaw = telemetry.cfg_power_on?.[idx];
              if (delayEn === undefined) return sw;
              const ponMap: Record<number, SwitchItem['powerOnState']> = { 0: 'OFF', 1: 'ON', 2: 'KEEP_LAST' };
              return {
                ...sw,
                delayConfig: {
                  ...sw.delayConfig,
                  enabled: Boolean(delayEn),
                  durationSeconds: typeof delaySec === 'number' ? delaySec : sw.delayConfig.durationSeconds,
                },
                maxRuntimeGuardMinutes: typeof guardMin === 'number' ? guardMin : sw.maxRuntimeGuardMinutes,
                powerOnState: ponMap[ponRaw] ?? sw.powerOnState,
              };
            })
          );
        }

        // ZPĚTNÁ SYNCHRONIZACE: Načtení skutečného stavu hardware z ESP32 do aplikace
        // ESP32 je pánem reálného stavu - aplikace převezme skutečnost z HW
        if (telemetry.relays && Array.isArray(telemetry.relays)) {
          // Teprve TEĎ máme jistotu - od této chvíle appka smí opustit
          // "offline/neznámý" stav a zobrazovat reálné hodnoty.
          setHasRealStatus(true);
          setSwitches(prev =>
            prev.map(sw => {
              const hwVal = telemetry.relays[sw.channelIndex - 1];
              if (hwVal !== undefined) {
                const isHwOn = hwVal === 1;

                // Kontrola zbývajícího času z telemetrie ESP (pokud firmware posílá timers[])
                const remTimerSec = (telemetry.timers && Array.isArray(telemetry.timers))
                  ? (telemetry.timers[sw.channelIndex - 1] ?? 0)
                  : 0;

                if (isHwOn) {
                  // Hardwarové relé je v ESP skutečně ZAPNUTO
                  const delayEnabled = sw.delayConfig.enabled;
                  const hasActiveTimer = remTimerSec > 0 || sw.isDelayRunning;
                  const activeSec = remTimerSec > 0 
                    ? remTimerSec 
                    : (sw.remainingSeconds > 0 ? sw.remainingSeconds : sw.delayConfig.durationSeconds);

                  return {
                    ...sw,
                    isOn: true,
                    isDelayRunning: delayEnabled && hasActiveTimer,
                    remainingSeconds: delayEnabled ? activeSec : 0,
                    totalDelaySeconds: delayEnabled ? Math.max(sw.totalDelaySeconds, activeSec) : 0,
                  };
                } else {
                  // Hardwarové relé je v ESP skutečně VYPNUTO
                  return {
                    ...sw,
                    isOn: false,
                    isDelayRunning: false,
                    remainingSeconds: 0,
                    totalDelaySeconds: 0,
                    currentRepeats: 1,
                  };
                }
              }
              return sw;
            })
          );
        }

      } else if (telemetry.event === 'button_long_press') {
        // Dlouhý stisk na hardwarovém tlačítku ESP32 (1.5s) -> okamžitý reset delay v aplikaci
        const btnIdx = telemetry.button_index;
        const targetSw = switchesRef.current.find(s => s.channelIndex - 1 === btnIdx);
        if (targetSw) {
          handleLongPressReset(targetSw.id);
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
  const [selectedScheduleForEdit, setSelectedScheduleForEdit] = useState<ScheduleItem | null>(null);
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
      // Dokud nemáme potvrzenou reálnou telemetrii z ESP32, appka nesmí
      // vizuálně "dokončovat" odpočet podle staré/domnělé hodnoty z paměti -
      // počká, až přijde skutečný stav, a teprve pak z něj vychází.
      if (!hasRealStatusRef.current) return;

      let expiredSwitchToNotify: SwitchItem | null = null;

      setSwitches((prevSwitches) => {
        let changed = false;
        const updated = prevSwitches.map((sw) => {
          if (sw.isOn && sw.isDelayRunning && sw.remainingSeconds > 0) {
            const nextSec = Math.max(0, sw.remainingSeconds - 0.2);
            if (nextSec <= 0) {
              // Čas vypršel jen VIZUÁLNĚ v appce. Reálné vypnutí provádí
              // autonomně ESP32 (vlastní millis() časovač) a pošle telemetrii
              // zpět - appka už sem záměrně neposílá vlastní duplicitní OFF
              // příkaz, aby nemohlo dojít k rozjetí dvou nezávislých časů.
              changed = true;
              if (!expiredSwitchToNotify) {
                expiredSwitchToNotify = sw;
              }
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

  // ČASOVAČE: DŮLEŽITÁ ZMĚNA OPROTI PŮVODNÍ VERZI
  // -------------------------------------------------------------------------
  // Původně appka sama každou vteřinu porovnávala čas v prohlížeči (setInterval)
  // a při shodě poslala příkaz. To fungovalo JEN dokud byla appka otevřená a
  // aktivní na popředí - jakmile se telefon uzamkl nebo appka šla na pozadí,
  // mobilní prohlížeč tyto časovače uspí/zastaví a naplánovaná akce se vůbec
  // neprovede. Časovače teď vyhodnocuje výhradně ESP32 samo (má vlastní čas
  // z NTP a seznam uložený v NVS) - appka je jen editor, který posílá/maže
  // položky a zobrazuje aktuální seznam z ESP32.
  // -------------------------------------------------------------------------

  // Převod bitmasky dní (bit0=Ne..bit6=So) na pole čísel 0-6 a zpět
  const daysMaskToArray = (mask: number): number[] => {
    const days: number[] = [];
    for (let i = 0; i < 7; i++) if (mask & (1 << i)) days.push(i);
    return days;
  };
  const daysArrayToMask = (days: number[]): number =>
    days.reduce((mask, d) => mask | (1 << d), 0);

  // Sync: seznam časovačů z ESP32 (autorita) -> zobrazovaný stav appky
  useEffect(() => {
    setSchedules((prev) =>
      espSchedules.map((esp) => {
        const targetSwitch = switches.find((s) => s.channelIndex - 1 === esp.relay_index);
        const existing = prev.find((p) => p.espSlot === esp.slot);
        return {
          id: existing?.id ?? `esp_slot_${esp.slot}`,
          espSlot: esp.slot,
          switchId: targetSwitch?.id ?? '',
          time: `${String(esp.hour).padStart(2, '0')}:${String(esp.minute).padStart(2, '0')}`,
          action: esp.action,
          enabled: esp.enabled,
          repeatType: esp.repeat_type,
          customDays: esp.repeat_type === 'CUSTOM' ? daysMaskToArray(esp.days_mask) : [],
        };
      })
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [espSchedules, switches]);

  // Vyžádat aktuální seznam časovačů hned po připojení k brokeru
  useEffect(() => {
    if (isConnected) requestSchedules();
  }, [isConnected]);

  // Ruční okamžité vyzkoušení akce časovače (tlačítko "test" v UI), NE
  // pravidelné automatické spouštění - to dělá výhradně ESP32.
  const triggerScheduleAction = (sch: ScheduleItem) => {
    const target = switches.find((s) => s.id === sch.switchId);
    if (!target) return;

    const nextState = sch.action === 'ON';
    sendRelayCommand(target.channelIndex - 1, nextState);

    notify(
      `Časovač (test): ${target.name}`,
      `Ručně vyzkoušená akce: ${sch.action === 'ON' ? 'ZAPNUTO (ON)' : 'VYPNUTO (OFF)'}.`,
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
          // [MQTT SEND] Odešleme sepnutí i s přesnou dobou zpoždění pro autonomní běh ESP32
          sendRelayCommand(sw.channelIndex - 1, true, baseDuration);
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

        // [MQTT SEND] Odešleme aktualizovaný zbývající čas do ESP32
        sendRelayCommand(sw.channelIndex - 1, true, nextRemaining);

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

  // 1.5s Long Press strict reset to default state (OFF, cancels timer & repeats)
  const handleLongPressReset = (id: string) => {
    const currentSw = switches.find((s) => s.id === id);
    if (currentSw) {
      // [MQTT SEND] Okamžitě vypnout relé na ESP32
      sendRelayCommand(currentSw.channelIndex - 1, false);
    }

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
    // [MQTT SEND CONFIG] Odešleme novou konfiguraci do paměti NVS v ESP32
    sendRelayConfig(
      updated.channelIndex - 1,
      updated.delayConfig.enabled,
      updated.delayConfig.durationSeconds,
      updated.maxRuntimeGuardMinutes || 0,
      updated.powerOnState
    );
  };

  useEffect(() => {
    if (scheduleCommandError) {
      notify('Časovač se neuložil', scheduleCommandError, 'system', 'SCHEDULE');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scheduleCommandError]);

  // Schedule handlers - vše se posílá na ESP32; zobrazený seznam (kap. výše)
  // se pak sám přepíše, jakmile ESP32 pošle zpět aktualizovaný schedules_response.
  const sendScheduleToEsp = (sch: ScheduleItem) => {
    const targetSwitch = switches.find((s) => s.id === sch.switchId);
    if (!targetSwitch) return;
    const [hh, mm] = sch.time.split(':').map((n) => parseInt(n, 10));
    sendSaveSchedule({
      slot: sch.espSlot,
      relay_index: targetSwitch.channelIndex - 1,
      hour: hh || 0,
      minute: mm || 0,
      action: sch.action,
      repeat_type: sch.repeatType,
      days_mask: daysArrayToMask(sch.customDays),
      enabled: sch.enabled,
    });
  };

  const handleToggleSchedule = (id: string) => {
    const current = schedules.find((s) => s.id === id);
    if (!current) return;
    sendScheduleToEsp({ ...current, enabled: !current.enabled });
  };

  const handleSaveSchedule = (newOrUpdated: ScheduleItem) => {
    sendScheduleToEsp(newOrUpdated);
  };

  const handleDeleteSchedule = (id: string) => {
    const current = schedules.find((s) => s.id === id);
    if (current?.espSlot !== undefined) {
      sendDeleteSchedule(current.espSlot);
    }
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
          isOffline={isOffline}
          onOpenSettings={() => {
            setActiveSwitchSettingsId(null);
            setIsSettingsOpen(true);
          }}
          onOpenMobileTest={() => setIsMobileTestOpen(true)}
          isPhoneFrame={isPhoneFrame}
          onTogglePhoneFrame={() => setIsPhoneFrame(!isPhoneFrame)}
        />

        {/* DIAGNOSTIKA MQTT SPOJENÍ - viditelná přímo na telefonu, bez nutnosti
            DevTools konzole. Zobrazuje se jen dokud appka není plně online,
            ať v běžném provozu nepřekáží. */}
        {isOffline && (
          <div className="px-3 py-1.5 bg-red-50 border-b border-red-200 text-[11px] text-red-700 font-mono break-words">
            {lastMqttEvent}
          </div>
        )}

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
                        isOffline
                          ? 'bg-red-500 animate-ping'
                          : activeSwitchesCount > 0
                          ? 'bg-sky-500 animate-pulse'
                          : 'bg-slate-300'
                      }`}
                    />
                    <span>
                      {isOffline
                        ? 'Bez odezvy (Offline)'
                        : `${activeSwitchesCount} z ${visibleSwitches.length} sepnuto`}
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
                  <div className="bg-white rounded-2xl p-8 text-center border border-slate-200 text-slate-500 shadow-xs">
                    <p className="text-sm font-bold text-slate-700">Všechny spínače jsou skryté</p>
                    <p className="text-xs text-slate-400 mt-1 max-w-xs mx-auto">
                      Na základní ploše není aktivní žádný kanál. Můžete jedním kliknutím zobrazit všech 8 výstupů.
                    </p>
                    <div className="mt-4 flex flex-wrap items-center justify-center gap-2">
                      <button
                        id="btn-show-all-empty-screen"
                        onClick={() => {
                          setSwitches(prev => prev.map(s => ({ ...s, visible: true })));
                        }}
                        className="px-4 py-2 bg-sky-600 hover:bg-sky-700 text-white rounded-xl text-xs font-bold transition shadow-xs active:scale-95"
                      >
                        Zobrazit všech 8 kanálů
                      </button>
                      <button
                        onClick={() => setIsSettingsOpen(true)}
                        className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold transition active:scale-95"
                      >
                        Otevřít nastavení
                      </button>
                    </div>
                  </div>
                ) : (
                  visibleSwitches.map((item) => (
                    <SwitchCard
                      key={item.id}
                      item={item}
                      schedules={schedules}
                      isOffline={isOffline}
                      onToggle={handleToggleSwitch}
                      onLongPressReset={handleLongPressReset}
                      onOpenItemSettings={(id) => {
                        setActiveSwitchSettingsId(id);
                        setIsSettingsOpen(true);
                      }}
                      onOpenSchedule={(sch) => {
                        setSelectedScheduleForEdit(sch);
                        setActiveTab('schedules');
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
              selectedSchedule={selectedScheduleForEdit}
              onClearSelectedSchedule={() => setSelectedScheduleForEdit(null)}
            />
          )}

          {/* TAB 3: ESP32 HARDWARE A SENZORY */}
          {activeTab === 'esp32' && (
            <HardwareInfoView
              mode="esp32"
              deviceStatus={deviceStatus}
              switches={switches}
              isOffline={isOffline}
              onUpdateDeviceStatus={(updated) => setDeviceStatus(updated)}
            />
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
