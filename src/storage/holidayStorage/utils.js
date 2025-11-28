export function normalizeHolidayPlan(plan) {
  const normalizeArray = (arr) => {
    if (!Array.isArray(arr)) {
      return [];
    }

    const map = new Map();
    arr.forEach(item => {
      if (typeof item === 'string') {
        const date = item.trim();
        if (!date) return;
        if (!map.has(date)) {
          map.set(date, { date, name: '', isLegalHoliday: false });
        }
        return;
      }

      if (!item || typeof item !== 'object') {
        return;
      }

      const date = String(item.date || '').trim();
      if (!date) {
        return;
      }

      map.set(date, {
        date,
        name: String(item.name || '').trim(),
        isLegalHoliday: item.isLegalHoliday === true || item.isLegalHoliday === 'true'
      });
    });

    return Array.from(map.values()).sort((a, b) => a.date.localeCompare(b.date));
  };

  const normalized = {
    holidays: normalizeArray(plan?.holidays)
  };

  if (Array.isArray(plan?.makeupWorkdays)) {
    normalized.makeupWorkdays = normalizeArray(plan.makeupWorkdays);
  } else {
    normalized.makeupWorkdays = [];
  }

  return normalized;
}
