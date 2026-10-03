import type { InConfig, QuickLock, WeekdayIndex } from '../types';

export const IN_QUICK_LOCK_ITEMS: { id: QuickLock; title: string; subtitle: string }[] = [
  { id: 'none', title: 'Vypnuto (bez blokace)', subtitle: 'Standardní provoz tlačítka podle časového plánu' },
  { id: 'off_midnight_manual', title: 'BLOKOVÁNO do 24:00 (dnes)', subtitle: 'Tlačítko ignorováno do půlnoci, v 00:00 se samo odblokuje' },
  { id: 'off_midnight_delay', title: 'BLOKOVÁNO na zadaný čas (delay)', subtitle: 'Odpočet zadané doby blokace (až 24 h)' },
  { id: 'off_calendar', title: 'BLOKOVÁNO ve vybrané dny kalendáře', subtitle: 'Kalendář výluk v konkrétní zvolené kalendářní dny' },
  { id: 'off_forever_manual', title: 'BLOKOVÁNO trvale (dovolená / servis)', subtitle: 'Trvalé vyřazení tlačítka do ručního odblokování' },
  { id: 'off_forever_delay', title: 'TRVALÝ BYPASS (ignorovat výluky)', subtitle: 'Tlačítko trvale povoleno, ignoruje výluky plánu' },
];

export function hmToSec(hm: string): number {
  if (!hm) return 0;
  const [h, m] = hm.split(':').map(Number);
  return (h || 0) * 3600 + (m || 0) * 60;
}

export function secToHm(sec: number): string {
  const h = Math.floor(sec / 3600);
  const m = Math.round((sec % 3600) / 60);
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

/**
 * Zjistí, zda je tlačítko/vstup IN v daném okamžiku blokován:
 * 1) Rychlou blokací (do 24:00, delay, trvale, kalendářní výluka)
 * 2) Časovým plánem výluk (interval z kalendáře výluk pro dnešní den a aktuální čas)
 *
 * POZOR na konvenci dne v týdnu: WeekdayIndex je 0 = Po ... 6 = Ne. JS Date.getDay()
 * vrací 0 = Ne ... 6 = So, proto je tu nutný přepočet `(now.getDay() + 6) % 7`.
 */
export function isInputBlocked(
  config: InConfig,
  now = new Date()
): { blocked: boolean; reason?: string } {
  // 1. Kontrola rychlé blokace
  if (config.quickLock !== 'none') {
    if (config.quickLock === 'off_forever_delay') {
      // Trvalý bypass -> ignoruje veškeré výluky plánu, nikdy není blokován
      return { blocked: false };
    }
    if (config.quickLock === 'off_forever_manual') {
      return { blocked: true, reason: 'Trvalá blokace (vyřazeno z provozu)' };
    }
    if (config.quickLock === 'off_midnight_manual') {
      return { blocked: true, reason: 'Blokováno do dnešní půlnoci (24:00)' };
    }
    if (config.quickLock === 'off_midnight_delay') {
      return {
        blocked: true,
        reason: `Blokováno na časový interval (${Math.round(config.quickLockDelaySec / 60)} min)`,
      };
    }
    if (config.quickLock === 'off_calendar') {
      const pad2 = (n: number) => String(n).padStart(2, '0');
      const todayStr = `${now.getFullYear()}-${pad2(now.getMonth() + 1)}-${pad2(now.getDate())}`;
      if (config.quickLockCalendarDays?.includes(todayStr)) {
        return { blocked: true, reason: `Kalendářní výluka (den ${todayStr})` };
      }
    }
  }

  // 2. Kontrola časového plánu výluk
  if (config.schedule && config.schedule.length > 0) {
    const dayIndex = ((now.getDay() + 6) % 7) as WeekdayIndex; // 0 = Po, 6 = Ne
    const currentSec = now.getHours() * 3600 + now.getMinutes() * 60 + now.getSeconds();
    const activeToday = config.schedule.filter((i) => i.enabled && i.days.includes(dayIndex));

    if (config.scheduleMode === 'window' && activeToday.length > 0) {
      // Režim aktivního časového okna: tlačítko smí fungovat POUZE v nastavených oknech
      let inAnyWindow = false;
      for (const interval of activeToday) {
        const fromSec = hmToSec(interval.from);
        const toSec = hmToSec(interval.to);
        const inRange = fromSec <= toSec
          ? currentSec >= fromSec && currentSec < toSec
          : currentSec >= fromSec || currentSec < toSec;
        if (inRange) {
          inAnyWindow = true;
          break;
        }
      }
      if (!inAnyWindow) {
        return {
          blocked: true,
          reason: 'Mimo aktivní časové okno (tlačítko blokováno)',
        };
      }
    } else {
      // Výchozí režim výluk: časy znamenají vyloučení tlačítka z činnosti
      for (const interval of activeToday) {
        const fromSec = hmToSec(interval.from);
        const toSec = hmToSec(interval.to);

        let inRange = false;
        if (fromSec <= toSec) {
          inRange = currentSec >= fromSec && currentSec < toSec;
        } else {
          // Interval přes půlnoc (např. 22:00 - 06:00)
          inRange = currentSec >= fromSec || currentSec < toSec;
        }

        if (inRange) {
          if (interval.action === 'allow') {
            return { blocked: false };
          }
          return {
            blocked: true,
            reason: `Časový plán výluky (${interval.from} – ${interval.to})`,
          };
        }
      }
    }
  }

  return { blocked: false };
}
