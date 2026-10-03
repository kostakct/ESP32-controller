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
  maxRuntimeGuardMinutes?: number; // 0 = NIKDY (vypnuto), 1 až 1440 minut (24h) pro spínače bez Delay
  notificationMode: NotificationMode;
  offlineAlertEnabled?: boolean; // Aktivace optické indikace offline stavu (červený obrys, jemné tónování)
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
  // Index NVS slotu na ESP32 (0..MAX_SCHEDULES-1). ESP32 je autoritativní zdroj
  // pravdy pro časovače - undefined jen krátce, než ESP potvrdí uložení nové položky.
  espSlot?: number;
}

export interface ESP32DeviceStatus {
  online: boolean;
  lastSeenTimestamp?: number;
  sensorOfflineAlertEnabled?: boolean; // Povolení offline zvýraznění pro senzory a vstupy
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

// =============================================================================
// ROZŠÍŘENÝ "UNIVERZÁLNÍ PRVEK" MODEL (převzato z návrhu uživatele)
// -----------------------------------------------------------------------------
// Toto je bohatší, cílový datový model pro konfiguraci prvku (ConfigCard/
// SwitchTile). NENAHRAZUJE SwitchItem/ScheduleItem výše - ty zůstávají "drátový"
// formát, kterému rozumí firmware přes MQTT. OutConfig je "UI vrstva navíc":
// část polí (mode classic/delay, delay, safety/guard, powerOn, lock, schedule)
// se překládá do/z SwitchItem+ScheduleItem a reálně chodí do ESP32 - viz
// src/adapters/outConfigAdapter.ts. Zbytek (termostat, interlocky, rychlé
// zámky, role) se zatím ukládá jen lokálně (localStorage) a čeká na rozšíření
// firmwaru / napojení na Supabase (role a osobní preference tam patří i
// architektonicky - viz ARCHITECTURE.md, tabulky user_component_permissions
// a user_component_preferences).
// =============================================================================

export type Role = 'client' | 'manager' | 'admin';

export type WeekdayIndex = 0 | 1 | 2 | 3 | 4 | 5 | 6; // 0 = Po, 6 = Ne

export type TileSize = '1/1' | '1/2' | '1/4';

export type NotifyMode = 'none' | 'on_only' | 'off_only' | 'any';

export type OutMode = 'classic' | 'delay' | 'thermostat';

export type ThermostatProgram = 'auto_24h' | 'auto_timer' | 'manual';

export type OnOff = 'on' | 'off';

export type QuickLock =
  | 'none'
  | 'off_midnight_manual'
  | 'off_midnight_delay'
  | 'off_forever_manual'
  | 'off_forever_delay'
  | 'off_calendar';

export interface ScheduleInterval {
  id: string;
  enabled: boolean;
  from: string; // "HH:MM"
  to: string; // "HH:MM"
  action: OnOff;
  days: WeekdayIndex[];
  tempHigh?: number;
  tempHighAction?: OnOff;
  tempLow?: number;
  tempLowAction?: OnOff;
}

export interface InterlockRule {
  elementId: string;
  elementLabel: string;
  trigger: 'state' | 'edge';
  when: OnOff;
  effect: 'forbid' | 'on' | 'off' | 'toggle';
}

export interface RoleAccess {
  visible: boolean;
  operate: boolean;
}

export interface RolePrefs {
  size: TileSize;
  visible: boolean;
  notify: NotifyMode;
  delayMaxOverride?: 1 | 2 | 3 | 4 | 5;
}

export interface OutConfig {
  id: string;
  deviceId: string;
  deviceName: string;
  configName: string;
  outNumber: number;
  name: string;
  enabled: boolean;
  room: number;
  mode: OutMode;
  powerOn: 'last' | 'off' | 'on';
  lock: boolean;
  safety: {
    enabled: boolean;
    limitedState: OnOff;
    maxSec: number;
  };
  delay: {
    seconds: number;
    max: 1 | 2 | 3 | 4 | 5;
  };
  schedule: ScheduleInterval[];
  quickLock: QuickLock;
  quickLockDelaySec: number;
  quickLockCalendarDays: string[];
  thermostatSensorId: string;
  thermostatSensorLabel: string;
  thermostatProgram: ThermostatProgram;
  thermostatAutoDefault?: boolean;
  thermostatAutoMode?: 'schedule' | 'hysteresis';
  thermostatHysteresis: {
    tempHigh: number;
    actionHigh: OnOff;
    tempLow: number;
    actionLow: OnOff;
    temp1?: number;
    action1?: OnOff;
    temp2?: number;
    action2?: OnOff;
  };
  access: Record<Role, RoleAccess>;
  prefsByRole: Record<Role, RolePrefs>;
  operateFrom: Role;
  interlocks: InterlockRule[];
}

export interface OutRuntime {
  link: 'online' | 'offline' | 'loading';
  state: OnOff;
  pending: boolean;
  blocked: boolean;
  delay: {
    running: boolean;
    count: number;
    remainingSec: number;
    totalSec: number;
  };
  schedule: {
    nextTime: string;
    nextAction: OnOff;
    nextTempLow?: number;
    nextTempHigh?: number;
  } | null;
  manualOverride: boolean;
  thermostat: {
    currentTemp: number;
    auto: boolean;
  } | null;
  receivedAt: number;
}

export type OutCommand =
  | 'toggle'
  | 'delay_start'
  | 'delay_extend'
  | 'delay_cancel'
  | 'thermostat_auto'
  | 'thermostat_manual';
