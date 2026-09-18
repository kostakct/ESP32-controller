export type PowerOnState = 'OFF' | 'ON' | 'KEEP_LAST';

export type NotificationMode = 'OFF' | 'ALL' | 'ONLY_ON' | 'ONLY_OFF';

export interface DelayConfig {
  enabled: boolean;
  durationSeconds: number; // e.g. 5.5s (supports 0.5s steps)
  maxRepeats: number; // 1, 2, 3, 4, 5
}

export interface SwitchItem {
  id: string; // e.g. 'relay_1'
  channelIndex: number; // 1..8
  name: string;
  order: number;
  visible: boolean;
  powerOnState: PowerOnState;
  delayConfig: DelayConfig;
  notificationMode: NotificationMode;
  // Runtime state
  isOn: boolean;
  isDelayRunning: boolean;
  currentRepeats: number; // current clicked repeat count (e.g. 1 to maxRepeats)
  remainingSeconds: number;
  totalDelaySeconds: number;
  lastToggledAt?: number;
}

export type ScheduleRepeatType = 'ONCE' | 'DAILY' | 'WEEKDAYS' | 'WEEKENDS' | 'CUSTOM';

export interface ScheduleItem {
  id: string;
  switchId: string;
  time: string; // "HH:MM"
  action: 'ON' | 'OFF';
  enabled: boolean;
  repeatType: ScheduleRepeatType;
  customDays: number[]; // 0 = Sun, 1 = Mon, 2 = Tue, ..., 6 = Sat
}

export interface ESP32DeviceStatus {
  online: boolean;
  ip: string;
  wifiSsid: string;
  wifiRssi: number; // -55 dBm
  uptimeSeconds: number;
  freeHeap: number;
  // Sensors preview
  oneWireTemp1: number | null;
  oneWireTemp2: number | null;
  am2320Temp: number | null;
  am2320Hum: number | null;
  ldr: number | null;
  input1Active: boolean;
  input2Active: boolean;
  input3Active: boolean;
  input4Active: boolean;
}

export interface AppNotification {
  id: string;
  title: string;
  body: string;
  timestamp: number;
  switchId: string;
  type: 'ON' | 'OFF' | 'TIMER' | 'SCHEDULE';
}
