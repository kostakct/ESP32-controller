import type { ExtSwitchConfig, Role, RoleAccess, RolePrefs, ScheduleInterval, WeekdayIndex } from '../types';

// POZOR na konvenci: WeekdayIndex je 0 = Po(ndělí) ... 6 = Ne(děle) - JINAK
// než počítá dny v týdnu firmware ESP32 (tam je 0 = Ne, jak to vrací
// standardní C funkce tm_wday). Adaptér (outConfigAdapter.ts) musí při
// překladu do/z NVS schedule slotů tenhle posun o 1 zohlednit.
export const WORKDAYS: WeekdayIndex[] = [0, 1, 2, 3, 4]; // Po-Pá
export const WEEKEND: WeekdayIndex[] = [5, 6]; // So, Ne
export const ALL_DAYS: WeekdayIndex[] = [0, 1, 2, 3, 4, 5, 6];

export const makeAccess = (visible: boolean, operate: boolean): RoleAccess => ({
  visible,
  operate,
});

export const makePrefs = (size: '1/1' | '1/2' | '1/4' = '1/1'): RolePrefs => ({
  size,
  visible: true,
  notify: 'any',
});

export const defaultAccess: Record<Role, RoleAccess> = {
  admin: makeAccess(true, true),
  manager: makeAccess(true, true),
  client: makeAccess(true, true),
};

export const defaultPrefs: Record<Role, RolePrefs> = {
  admin: makePrefs('1/1'),
  manager: makePrefs('1/1'),
  client: makePrefs('1/2'),
};

// Rozumný výchozí (prázdný) plán pro nově vytvořený prvek - žádné intervaly,
// uživatel si je přidá sám v ConfigCard.
export const emptySchedule: ScheduleInterval[] = [];

export const defaultExtSwitch: ExtSwitchConfig = {
  inputId: '',
  inputLabel: '',
  logic: 'pulse',
  pulse: {
    shortAction: 'toggle',
    shortDelaySec: 60,
    longEnabled: false,
    longAction: 'delay',
    longDelaySec: 180,
  },
  state: {
    onAction: 'on',
    offAction: 'off',
  },
  staircase: {
    durationSec: 120,
    retrigger: 'restart',
  },
  scheduleWindowOnly: false,
};

export interface CatalogItem {
  id: string;
  label: string;
  type: 'in' | 'out' | 'ai';
  source?: 'local' | 'iot';
}

// DŮLEŽITÉ: na rozdíl od původního testovacího bench souboru NENÍ tento
// katalog statický vzorek - je to živý seznam SKUTEČNÝCH prvků aktuální
// desky (relé, digitální vstupy, senzory), který App.tsx aktualizuje přes
// setCatalog() pokaždé, když se změní seznam spínačů/senzorů/vstupů. Používá
// ho ConfigCard/InConfigCard pro výběr termostatického čidla, zdroje pro
// "Ext. spínač" a cílů vzájemných blokací (interlocks).
export let catalog: CatalogItem[] = [];

export function setCatalog(items: CatalogItem[]) {
  catalog = items;
}
