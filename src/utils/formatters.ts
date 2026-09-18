/**
 * Formats seconds into mm:ss or mm:ss.s format
 */
export function formatDuration(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  const isFractional = secs % 1 !== 0;

  const minStr = String(mins).padStart(2, '0');
  const secStr = isFractional
    ? secs.toFixed(1).padStart(4, '0')
    : String(Math.floor(secs)).padStart(2, '0');

  return `${minStr}:${secStr}`;
}

/**
 * Formats countdown seconds (e.g. 4.5s -> 00:04.5 or 00:05)
 */
export function formatCountdown(seconds: number): string {
  if (seconds <= 0) return '00:00';
  const mins = Math.floor(seconds / 60);
  const remainingSecs = seconds % 60;
  
  // Show tenths when under 10 seconds or fractional
  if (seconds < 10) {
    return `${String(mins).padStart(2, '0')}:${remainingSecs.toFixed(1).padStart(4, '0')}`;
  }
  return `${String(mins).padStart(2, '0')}:${String(Math.floor(remainingSecs)).padStart(2, '0')}`;
}

export const CZECH_DAY_LABELS = ['Ne', 'Po', 'Út', 'St', 'Čt', 'Pá', 'So']; // 0 = Sun, 1 = Mon ...
export const CZECH_DAY_FULL = ['Neděle', 'Pondělí', 'Úterý', 'Středa', 'Čtvrtek', 'Pátek', 'Sobota'];

export function getNextScheduleEvent(switchId: string, schedules: any[]): { time: string; action: 'ON' | 'OFF'; dayOffset: number; dayName: string } | null {
  const activeSchedules = schedules.filter(s => s.switchId === switchId && s.enabled);
  if (activeSchedules.length === 0) return null;

  const now = new Date();
  const currentTotalMinutes = now.getHours() * 60 + now.getMinutes();
  const currentDay = now.getDay();

  let nextEvent: any = null;
  let minMinutesDiff = Infinity;

  activeSchedules.forEach(sch => {
    const [hh, mm] = sch.time.split(':').map(Number);
    const schTotalMinutes = hh * 60 + mm;

    // Check which days this schedule runs
    const validDays = new Set<number>();
    if (sch.repeatType === 'ONCE') {
      // ONCE means today if time > now, otherwise tomorrow
      if (schTotalMinutes > currentTotalMinutes) {
        validDays.add(currentDay);
      } else {
        validDays.add((currentDay + 1) % 7);
      }
    } else if (sch.repeatType === 'DAILY') {
      [0, 1, 2, 3, 4, 5, 6].forEach(d => validDays.add(d));
    } else if (sch.repeatType === 'WEEKDAYS') {
      [1, 2, 3, 4, 5].forEach(d => validDays.add(d));
    } else if (sch.repeatType === 'WEEKENDS') {
      [0, 6].forEach(d => validDays.add(d));
    } else if (sch.repeatType === 'CUSTOM') {
      sch.customDays.forEach((d: number) => validDays.add(d));
    }

    // Find the next upcoming occurrence
    for (let dayOffset = 0; dayOffset < 7; dayOffset++) {
      const checkDay = (currentDay + dayOffset) % 7;
      if (validDays.has(checkDay)) {
        let minutesDiff = (dayOffset * 24 * 60) + schTotalMinutes - currentTotalMinutes;
        // If it's today but already passed, skip (unless it's the only one and will run next week)
        if (dayOffset === 0 && schTotalMinutes <= currentTotalMinutes) {
          // If it repeats on this same day, it means it will run in exactly 7 days
          if (sch.repeatType !== 'ONCE') {
             minutesDiff = (7 * 24 * 60) + schTotalMinutes - currentTotalMinutes;
          } else {
             continue; // ONCE already passed today? Wait, handled above for ONCE.
          }
        }

        if (minutesDiff < minMinutesDiff && minutesDiff > 0) {
          minMinutesDiff = minutesDiff;
          
          let dayNameStr = '';
          if (dayOffset === 0) dayNameStr = 'Dnes';
          else if (dayOffset === 1) dayNameStr = 'Zítra';
          else dayNameStr = CZECH_DAY_FULL[checkDay];

          nextEvent = {
            time: sch.time,
            action: sch.action,
            dayOffset,
            dayName: dayNameStr,
          };
        }
        break; // found the earliest for this schedule
      }
    }
  });

  return nextEvent;
}

export function formatScheduleRepeat(repeatType: string, customDays: number[]): string {
  switch (repeatType) {
    case 'ONCE':
      return 'Jednou';
    case 'DAILY':
      return 'Denně';
    case 'WEEKDAYS':
      return 'Pracovní dny (Po - Pá)';
    case 'WEEKENDS':
      return 'Víkend (So, Ne)';
    case 'CUSTOM': {
      if (customDays.length === 7) return 'Denně';
      if (customDays.length === 0) return 'Bez opakování';
      // Sort with Monday first: [1,2,3,4,5,6,0]
      const sorted = [...customDays].sort((a, b) => {
        const orderA = a === 0 ? 7 : a;
        const orderB = b === 0 ? 7 : b;
        return orderA - orderB;
      });
      return sorted.map((d) => CZECH_DAY_LABELS[d]).join(', ');
    }
    default:
      return repeatType;
  }
}
