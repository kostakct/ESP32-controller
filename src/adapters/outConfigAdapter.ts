import type {
  SwitchItem,
  PowerOnState,
  OutConfig,
  OutRuntime,
} from '../types';
import { defaultAccess, defaultPrefs, defaultExtSwitch } from '../components/fixtures';

/*
 * =============================================================================
 * ADAPTÉR MEZI "DRÁTOVÝM" FORMÁTEM (SwitchItem, co chodí přes MQTT do ESP32)
 * A BOHATÝM UI MODELEM (OutConfig/OutRuntime z ConfigCard/SwitchTile).
 * =============================================================================
 * CO SE REÁLNĚ SYNCHRONIZUJE S ESP32 (přes App.tsx -> sendRelayConfig):
 *   - name, mode (classic/delay), delay.seconds, delay.max,
 *     safety.enabled + safety.maxSec (= maxRuntimeGuardMinutes), powerOn
 *   - "lock" (fyzický zámek/podržení) je čistě UI/interakční chování
 *     (SwitchTile řeší samo, kdy poslat příkaz) - žádná firmware změna
 *     není potřeba.
 *
 * CO JE ZATÍM JEN LOKÁLNÍ (ukládá se do localStorage, NEPOSÍLÁ SE na ESP32):
 *   - termostat (mode='thermostat' a vše kolem), interlocky, rychlé zámky
 *     (quickLock), role-based access/prefsByRole.
 *   Důvod: firmware v14 tyhle režimy zatím neumí a role/preference podle
 *   architektury (ARCHITECTURE.md) stejně patří do Supabase, ne do NVS na
 *   desce. Až budou hotové, stačí rozšířit jen tuto vrstvu, UI se měnit nemusí.
 *
 * Časový plán (ScheduleInterval, "od-do") je ZÁMĚRNĚ mimo tento adaptér -
 * ESP32 rozumí jen jednotlivým bodům v čase (ScheduleItem), ne intervalům.
 * Skutečné časovače se nastavují stále přes záložku "Časovače" (ScheduleView),
 * která už je s ESP32 ověřeně propojená. Napojení nového intervalového
 * editoru uvnitř ConfigCard přijde jako samostatný, otestovaný krok.
 * =============================================================================
 */

const powerOnToOut: Record<PowerOnState, 'off' | 'on' | 'last'> = {
  OFF: 'off',
  ON: 'on',
  KEEP_LAST: 'last',
};

const outToPowerOn: Record<'off' | 'on' | 'last', PowerOnState> = {
  off: 'OFF',
  on: 'ON',
  last: 'KEEP_LAST',
};

const LOCAL_EXTRAS_KEY = 'richConfigExtras_v1';

// "Extra" pole, která ještě neumí firmware - držíme je oddělené v localStorage,
// aby přežila reload appky, ale nikdy se neposílaly přes MQTT.
type LocalExtras = Pick<
  OutConfig,
  | 'mode'
  | 'lock'
  | 'quickLock'
  | 'quickLockDelaySec'
  | 'quickLockCalendarDays'
  | 'thermostatSensorId'
  | 'thermostatSensorLabel'
  | 'thermostatProgram'
  | 'thermostatAutoDefault'
  | 'thermostatAutoMode'
  | 'thermostatHysteresis'
  | 'access'
  | 'prefsByRole'
  | 'operateFrom'
  | 'interlocks'
  | 'schedule'
  | 'extSwitch'
>;

function defaultExtras(sw: SwitchItem): LocalExtras {
  return {
    mode: sw.delayConfig.enabled ? 'delay' : 'classic',
    lock: false,
    quickLock: 'none',
    quickLockDelaySec: 1800,
    quickLockCalendarDays: [],
    thermostatSensorId: '',
    thermostatSensorLabel: '',
    thermostatProgram: 'manual',
    thermostatAutoDefault: false,
    thermostatAutoMode: 'hysteresis',
    thermostatHysteresis: {
      tempHigh: 24.5,
      actionHigh: 'off',
      tempLow: 21.0,
      actionLow: 'on',
    },
    access: defaultAccess,
    prefsByRole: defaultPrefs,
    operateFrom: 'client',
    interlocks: [],
    schedule: [],
    extSwitch: defaultExtSwitch,
  };
}

function loadAllExtras(): Record<string, LocalExtras> {
  try {
    const raw = localStorage.getItem(LOCAL_EXTRAS_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

function saveExtrasFor(switchId: string, extras: LocalExtras) {
  try {
    const all = loadAllExtras();
    all[switchId] = extras;
    localStorage.setItem(LOCAL_EXTRAS_KEY, JSON.stringify(all));
  } catch {
    // localStorage nedostupné (privátní režim apod.) - v pořádku, jen se
    // rozšířená nastavení nezapamatují mezi relacemi.
  }
}

export function getExtrasFor(sw: SwitchItem): LocalExtras {
  const all = loadAllExtras();
  return all[sw.id] ?? defaultExtras(sw);
}

// Sestaví kompletní OutConfig pro ConfigCard/SwitchTile ze skutečného stavu
// spínače (to, co reálně chodí z/do ESP32) + lokálně uložených "extra" polí.
export function switchToOutConfig(sw: SwitchItem, deviceName: string): OutConfig {
  const extras = getExtrasFor(sw);
  return {
    id: sw.id,
    deviceId: 'esp_01_kotelna',
    deviceName,
    configName: `Výstup ${sw.channelIndex}`,
    outNumber: sw.channelIndex,
    name: sw.name,
    enabled: true,
    room: 1,
    mode: extras.mode,
    powerOn: powerOnToOut[sw.powerOnState],
    lock: extras.lock,
    safety: {
      enabled: (sw.maxRuntimeGuardMinutes ?? 0) > 0,
      limitedState: 'off', // Guard na ESP32 vždy nuceně VYPÍNÁ po uplynutí limitu
      maxSec: (sw.maxRuntimeGuardMinutes ?? 0) * 60,
    },
    delay: {
      seconds: sw.delayConfig.durationSeconds,
      max: (sw.delayConfig.maxRepeats as 1 | 2 | 3 | 4 | 5) || 1,
    },
    schedule: extras.schedule,
    quickLock: extras.quickLock,
    quickLockDelaySec: extras.quickLockDelaySec,
    quickLockCalendarDays: extras.quickLockCalendarDays,
    thermostatSensorId: extras.thermostatSensorId,
    thermostatSensorLabel: extras.thermostatSensorLabel,
    thermostatProgram: extras.thermostatProgram,
    thermostatAutoDefault: extras.thermostatAutoDefault,
    thermostatAutoMode: extras.thermostatAutoMode,
    thermostatHysteresis: extras.thermostatHysteresis,
    access: extras.access,
    prefsByRole: extras.prefsByRole,
    operateFrom: extras.operateFrom,
    interlocks: extras.interlocks,
    extSwitch: extras.extSwitch,
  };
}

export function switchToOutRuntime(sw: SwitchItem, isOffline: boolean): OutRuntime {
  return {
    link: isOffline ? 'offline' : 'online',
    state: sw.isOn ? 'on' : 'off',
    pending: false,
    blocked: false,
    delay: {
      running: sw.isDelayRunning,
      count: sw.currentRepeats,
      remainingSec: sw.remainingSeconds,
      totalSec: sw.totalDelaySeconds,
    },
    schedule: null,
    manualOverride: false,
    thermostat: null,
    receivedAt: sw.lastToggledAt ?? Date.now(),
  };
}

export interface FirmwareRelevantPatch {
  isDelayEnabled: boolean;
  delaySeconds: number;
  delayMax: number;
  guardMinutes: number;
  powerOn: PowerOnState;
}

// Z nového (patchnutého) OutConfig vytáhne jen to, čemu ESP32 rozumí, aby to
// šlo rovnou poslat do sendRelayConfig(). Volá se PO merge patch -> newConfig.
export function extractFirmwareRelevantConfig(newConfig: OutConfig): FirmwareRelevantPatch {
  return {
    isDelayEnabled: newConfig.mode === 'delay',
    delaySeconds: newConfig.delay.seconds,
    delayMax: newConfig.delay.max,
    guardMinutes: newConfig.safety.enabled ? Math.round(newConfig.safety.maxSec / 60) : 0,
    powerOn: outToPowerOn[newConfig.powerOn],
  };
}

// Uloží VŠE, co ESP32 (zatím) neumí, zpátky do localStorage.
export function persistExtras(newConfig: OutConfig) {
  const { mode, lock, quickLock, quickLockDelaySec, quickLockCalendarDays,
    thermostatSensorId, thermostatSensorLabel, thermostatProgram,
    thermostatAutoDefault, thermostatAutoMode, thermostatHysteresis,
    access, prefsByRole, operateFrom, interlocks, schedule, extSwitch,
  } = newConfig;
  saveExtrasFor(newConfig.id, {
    mode, lock, quickLock, quickLockDelaySec, quickLockCalendarDays,
    thermostatSensorId, thermostatSensorLabel, thermostatProgram,
    thermostatAutoDefault, thermostatAutoMode, thermostatHysteresis,
    access, prefsByRole, operateFrom, interlocks, schedule, extSwitch,
  });
}
