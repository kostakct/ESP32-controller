import { SwitchItem, ScheduleItem, ESP32DeviceStatus } from '../types';

export const INITIAL_SWITCHES: SwitchItem[] = [
  {
    id: 'sw-1',
    name: 'Oběhové čerpadlo',
    channelIndex: 1,
    isOn: false,
    powerOnState: 'OFF',
    isVisible: true,
    order: 1,
    delayConfig: {
      enabled: true,
      durationSeconds: 900, // 15 min
      maxRepeats: 4,
    },
    currentRepeats: 1,
    remainingSeconds: 0,
    totalDelaySeconds: 0,
    isDelayRunning: false,
    maxRuntimeGuardMinutes: 0,
    offlineAlertEnabled: true,
  },
  {
    id: 'sw-2',
    name: 'Topná spirála bojler',
    channelIndex: 2,
    isOn: false,
    powerOnState: 'OFF',
    isVisible: true,
    order: 2,
    delayConfig: {
      enabled: false,
      durationSeconds: 1800, // 30 min
      maxRepeats: 3,
    },
    currentRepeats: 1,
    remainingSeconds: 0,
    totalDelaySeconds: 0,
    isDelayRunning: false,
    maxRuntimeGuardMinutes: 120, // 2 hodiny bezpečnostní limit
    offlineAlertEnabled: true,
  },
  {
    id: 'sw-3',
    name: 'Osvětlení dvůr',
    channelIndex: 3,
    isOn: false,
    powerOnState: 'OFF',
    isVisible: true,
    order: 3,
    delayConfig: {
      enabled: true,
      durationSeconds: 300, // 5 min
      maxRepeats: 5,
    },
    currentRepeats: 1,
    remainingSeconds: 0,
    totalDelaySeconds: 0,
    isDelayRunning: false,
    maxRuntimeGuardMinutes: 0,
    offlineAlertEnabled: true,
  },
  {
    id: 'sw-4',
    name: 'Zavlažování zahrada',
    channelIndex: 4,
    isOn: false,
    powerOnState: 'OFF',
    isVisible: true,
    order: 4,
    delayConfig: {
      enabled: true,
      durationSeconds: 1200, // 20 min
      maxRepeats: 2,
    },
    currentRepeats: 1,
    remainingSeconds: 0,
    totalDelaySeconds: 0,
    isDelayRunning: false,
    maxRuntimeGuardMinutes: 60,
    offlineAlertEnabled: true,
  },
];

export const INITIAL_SCHEDULES: ScheduleItem[] = [
  {
    id: 'sch-1',
    switchId: 'sw-1',
    name: 'Ranní předehřev oběhu',
    time: '06:00',
    daysOfWeek: [1, 2, 3, 4, 5],
    action: 'DELAY',
    delayDurationSeconds: 1800,
    enabled: true,
  },
  {
    id: 'sch-2',
    switchId: 'sw-3',
    name: 'Večerní dvůr ON',
    time: '20:30',
    daysOfWeek: [0, 1, 2, 3, 4, 5, 6],
    action: 'ON',
    enabled: true,
  },
  {
    id: 'sch-3',
    switchId: 'sw-3',
    name: 'Noční zhasnutí',
    time: '23:30',
    daysOfWeek: [0, 1, 2, 3, 4, 5, 6],
    action: 'OFF',
    enabled: true,
  },
];

export const INITIAL_DEVICE_STATUS: ESP32DeviceStatus = {
  online: true,
  ip: '192.168.1.145',
  wifiRssi: -58,
  uptimeSeconds: 84320,
  heapFree: 198400,
  oneWireTemp1: 42.6,
  oneWireTemp2: 38.1,
  am2320Temp: 22.4,
  am2320Hum: 46.5,
  ldr: 680,
  input1Active: false,
  input2Active: false,
  input3Active: false,
  input4Active: false,
  lastSeenTimestamp: Date.now(),
  sensorOfflineAlertEnabled: true,
};
