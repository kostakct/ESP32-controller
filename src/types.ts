export type PowerOnState = 'OFF' | 'ON' | 'RESTORE';

export interface DelayConfig {
  enabled: boolean;
  durationSeconds: number; // Interval základního kroku prodloužení (např. 600s = 10 min)
  maxRepeats: number; // 0 = neomezeno (až po limit MAX), jinak 1 až N
}

export interface SwitchItem {
  id: string;
  name: string;
  channelIndex: number; // 1, 2, 3, 4
  isOn: boolean;
  powerOnState: PowerOnState;
  isVisible: boolean;
  order: number;
  
  // Funkce delay (prodlužované sepnutí)
  delayConfig: DelayConfig;
  currentRepeats: number; // Kolikrát bylo stisknuto (1 = základ, 2 = dvojnásobek, atd.)
  remainingSeconds: number; // Zbývající čas aktuálního běhu
  totalDelaySeconds: number; // Celkový napočítaný čas
  isDelayRunning: boolean;

  // Ochrana maximálního času chodu (bez časovače i s časovačem)
  // 0 = Vypnuto / NIKDY, 1 až 1440 = čas v minutách (až 24 hodin)
  maxRuntimeGuardMinutes?: number;

  // Notifikace / zvýraznění stavu OFFLINE (červená linka obrysu při ztrátě spojení)
  offlineAlertEnabled?: boolean;
}

export type ScheduleActionType = 'ON' | 'OFF' | 'TOGGLE' | 'DELAY';

export interface ScheduleItem {
  id: string;
  switchId: string;
  name: string;
  time: string; // "HH:MM"
  daysOfWeek: number[]; // 0 = Neděle, 1 = Pondělí, ..., 6 = Sobota (prázdné = jednorázově)
  action: ScheduleActionType;
  delayDurationSeconds?: number;
  enabled: boolean;
}

export interface ESP32DeviceStatus {
  online: boolean;
  ip: string;
  wifiRssi: number;
  uptimeSeconds: number;
  heapFree: number;
  oneWireTemp1?: number; // Teplota trubky 1 (DS18B20)
  oneWireTemp2?: number; // Teplota trubky 2 (DS18B20)
  am2320Temp?: number;   // Prostorová teplota
  am2320Hum?: number;    // Vlhkost vzduchu
  ldr?: number;          // Fotorezistor (intenzita světla)
  input1Active?: boolean; // Digitální vstup 1 (PIR / tlačítko)
  input2Active?: boolean;
  input3Active?: boolean;
  input4Active?: boolean;
  lastSeenTimestamp?: number;
  sensorOfflineAlertEnabled?: boolean;
}

export type TabType = 'switches' | 'schedules' | 'esp32' | 'mqtt';
