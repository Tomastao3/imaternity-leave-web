import {
  idbGetHoliday,
  idbSetHoliday,
  idbGetAllHolidayYears
} from '../../utils/indexedDb';

import { normalizeHolidayPlan } from './utils';

function mapTypeToPlanKey(type) {
  return type === 'makeup' ? 'makeupWorkdays' : 'holidays';
}

export default class IndexedDbHolidayStorage {
  async getYears() {
    const years = await idbGetAllHolidayYears();
    return (years || []).map(Number).sort((a, b) => a - b);
  }

  async getPlan(year) {
    const plan = await idbGetHoliday(Number(year));
    return normalizeHolidayPlan(plan);
  }

  async upsertPlan(year, plan) {
    const normalized = normalizeHolidayPlan(plan);
    await idbSetHoliday(Number(year), normalized);
  }

  async addDate({ year, date, type, name = '', isLegalHoliday = false }) {
    const numericYear = Number(year);
    const currentPlan = await this.getPlan(numericYear);
    const key = mapTypeToPlanKey(type);
    const record = {
      date,
      name,
      isLegalHoliday: !!isLegalHoliday
    };
    const filteredOtherKey = mapTypeToPlanKey(type === 'holiday' ? 'makeup' : 'holiday');

    const updated = {
      ...currentPlan,
      [key]: [...(currentPlan[key] || []).filter(item => (item && item.date) !== date), record],
      [filteredOtherKey]: (currentPlan[filteredOtherKey] || []).filter(item => (item && item.date) !== date)
    };

    await this.upsertPlan(numericYear, updated);
  }

  async removeDate(year, date) {
    const numericYear = Number(year);
    const currentPlan = await this.getPlan(numericYear);
    const updated = {
      holidays: (currentPlan.holidays || []).filter(item => item.date !== date),
      makeupWorkdays: (currentPlan.makeupWorkdays || []).filter(item => item.date !== date)
    };
    await this.upsertPlan(numericYear, updated);
  }

  async updateDate({
    sourceYear,
    originalDate,
    targetYear,
    newDate,
    type,
    name = '',
    isLegalHoliday = false
  }) {
    const sourceNumeric = Number(sourceYear);
    const targetNumeric = Number(targetYear);

    if (sourceNumeric !== targetNumeric) {
      await this.removeDate(sourceNumeric, originalDate);
      await this.addDate({
        year: targetNumeric,
        date: newDate,
        type,
        name,
        isLegalHoliday
      });
      return;
    }

    const currentPlan = await this.getPlan(sourceNumeric);
    const key = mapTypeToPlanKey(type);
    const otherKey = mapTypeToPlanKey(type === 'holiday' ? 'makeup' : 'holiday');

    const updated = {
      ...currentPlan,
      [key]: [
        ...(currentPlan[key] || []).filter(item => item.date !== originalDate),
        { date: newDate, name, isLegalHoliday: !!isLegalHoliday }
      ],
      [otherKey]: (currentPlan[otherKey] || []).filter(item => item.date !== newDate)
    };

    await this.upsertPlan(sourceNumeric, updated);
  }

  async importBulk(records) {
    const grouped = new Map();

    (records || []).forEach(record => {
      const { year, date, type, name = '', isLegalHoliday = false } = record || {};
      const numericYear = Number(year);
      if (Number.isNaN(numericYear)) {
        return;
      }
      if (!grouped.has(numericYear)) {
        grouped.set(numericYear, {
          holidays: new Map(),
          makeupWorkdays: new Map()
        });
      }
      const buckets = grouped.get(numericYear);
      const map = type === 'makeup' || type === '工作日' ? buckets.makeupWorkdays : buckets.holidays;
      map.set(date, { date, name, isLegalHoliday: !!isLegalHoliday });
    });

    for (const [year, buckets] of grouped.entries()) {
      const plan = {
        holidays: Array.from(buckets.holidays.values()),
        makeupWorkdays: Array.from(buckets.makeupWorkdays.values())
      };
      await this.upsertPlan(year, plan);
    }
  }
}
