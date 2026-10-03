import type { Role, RoleAccess, RolePrefs, WeekdayIndex } from '../types';

export const WORKDAYS: WeekdayIndex[] = [1, 2, 3, 4, 5]; // Po-Pá
export const WEEKEND: WeekdayIndex[] = [0, 6]; // Ne, So
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

export interface CatalogItem {
  id: string;
  label: string;
}

// DŮLEŽITÉ: na rozdíl od původního testovacího bench souboru NENÍ tento
// katalog statický vzorek - je to živý seznam SKUTEČNÝCH prvků aktuální
// desky (8x relé + digitální vstupy + senzory), který App.tsx aktualizuje
// přes setCatalog() pokaždé, když se změní seznam spínačů/senzorů. Používá
// ho ConfigCard pro výběr termostatického čidla a cílů vzájemných blokací.
export let catalog: CatalogItem[] = [];

export function setCatalog(items: CatalogItem[]) {
  catalog = items;
}
