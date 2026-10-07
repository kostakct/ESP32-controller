import type { ESP32DeviceStatus, InConfig, InRuntime } from '../types';

/*
 * =============================================================================
 * ADAPTÉR PRO IN PRVKY (digitální vstupy / tlačítka)
 * =============================================================================
 * Na rozdíl od OUT adaptéru (outConfigAdapter.ts) tu zatím NENÍ žádné reálné
 * "drátové" nastavení - firmware v14 vstupy jen čte a hlásí aktuální úroveň
 * (viz pole `in_active` v telemetrii), ale neumí od appky přijmout debounce,
 * dlouhý stisk, výluky/plán ani blokace. Celý InConfig se proto zatím ukládá
 * JEN lokálně (localStorage) - UI je plně funkční a připravené, napojení na
 * firmware (a případně Supabase pro roli/sdílení) je plánovaná práce navíc.
 *
 * CO UŽ JE REÁLNÉ (z firmwaru, ne vymyšlené):
 *   - gpioPin (pevně dané zapojením desky)
 *   - InRuntime.state (aktivní/neaktivní) - živé, z telemetrie `in_active`
 *   - InRuntime.lastChanged / activeDurationSec / isStuck - odvozené z toho
 *     živého stavu na straně appky
 *
 * CO JE ZATÍM JEN NÁVRH (potřebuje rozšíření firmwaru):
 *   - debounceMs, longPressThresholdMs, contactType, pullResistor (firmware
 *     je má pevně zadrátované, appka je teď jen zobrazuje/edituje jako
 *     "záměr", neposílá se na desku)
 *   - schedule (výluky), quickLock, bypass, touchLock, notify, access/prefs
 * =============================================================================
 */

// Pevné zapojení pinů pro 4 vstupy na pilotní desce (viz ESP32_Controller_V14.ino)
const BTN_GPIO_PINS = [15, 16, 17, 46];

const LOCAL_IN_KEY = 'inConfigExtras_v1';

function loadAll(): Record<string, InConfig> {
  try {
    const raw = localStorage.getItem(LOCAL_IN_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

function saveOne(config: InConfig) {
  try {
    const all = loadAll();
    all[config.id] = config;
    localStorage.setItem(LOCAL_IN_KEY, JSON.stringify(all));
  } catch {
    // localStorage nedostupné - v pořádku, jen se nastavení nezapamatuje mezi relacemi.
  }
}

function buildDefaultInConfig(index: number, deviceName: string): InConfig {
  const inNumber = index + 1;
  return {
    id: `in_${index}`,
    deviceId: 'esp_01_kotelna',
    deviceName,
    configName: `Vstup ${inNumber}`,
    inNumber,
    gpioPin: BTN_GPIO_PINS[index] ?? 0,
    name: `Vstup ${inNumber}`,
    enabled: true,
    room: 1,
    type: 'button',
    contactType: 'no',
    pullResistor: index === 3 ? 'pulldown' : 'pullup', // odpovídá reálnému zapojení v firmwaru
    debounceMs: 30,
    longPressThresholdMs: 1500, // odpovídá reálné 1.5s hranici v loop() firmwaru
    stuckAlarm: {
      enabled: false,
      maxSec: 900,
    },
    bypass: {
      enabled: false,
      untilMidnight: false,
    },
    scheduleMode: 'exclusion',
    schedule: [],
    quickLock: 'none',
    quickLockDelaySec: 1800,
    quickLockCalendarDays: [],
    touchLock: 'none',
    notify: 'none',
    access: {
      admin: { operate: true, view: true },
      manager: { operate: true, view: true },
      client: { operate: true, view: true },
    },
    prefsByRole: {
      admin: { tileSize: '1/1', showInRoom: true, orderInRoom: inNumber },
      manager: { tileSize: '1/1', showInRoom: true, orderInRoom: inNumber },
      client: { tileSize: '1/1', showInRoom: true, orderInRoom: inNumber },
    },
  };
}

export function getInConfig(index: number, deviceName: string): InConfig {
  const all = loadAll();
  return all[`in_${index}`] ?? buildDefaultInConfig(index, deviceName);
}

export function saveInConfig(config: InConfig) {
  saveOne(config);
}

const ACTIVE_FIELD = ['input1Active', 'input2Active', 'input3Active', 'input4Active'] as const;

export function buildInRuntime(
  index: number,
  deviceStatus: ESP32DeviceStatus,
  isOffline: boolean,
  lastChangedAt: number,
  config: InConfig
): InRuntime {
  const isActive = Boolean(deviceStatus[ACTIVE_FIELD[index]]);
  const activeDurationSec = isActive ? Math.max(0, Math.round((Date.now() - lastChangedAt) / 1000)) : 0;
  const isStuck =
    config.stuckAlarm.enabled && isActive && activeDurationSec > config.stuckAlarm.maxSec;

  return {
    state: isActive ? 'active' : 'inactive',
    lastChanged: lastChangedAt,
    virtualPulse: 'none', // appka zatím neumí poslat virtuální stisk na ESP32
    link: isOffline ? 'offline' : 'online',
    isStuck,
    activeDurationSec,
  };
}
