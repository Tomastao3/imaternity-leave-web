import { Op, literal, fn, col, UniqueConstraintError } from 'sequelize';
import { withTransaction, sequelize } from '../db/pool.js';
import Holiday from '../models/Holiday.js';

function normalizeType(type) {
  if (!type) return 'holiday';
  const lower = String(type).toLowerCase();
  if (lower === 'makeup' || lower === '工作日') {
    return 'makeup';
  }
  return 'holiday';
}

function createDuplicateHolidayError() {
  const conflict = new Error('节假日日期已存在，请选择其他日期');
  conflict.code = 'HOLIDAY_DATE_EXISTS';
  conflict.status = 409;
  return conflict;
}

function toPlanStructure(records = []) {
  const holidays = [];
  const makeupWorkdays = [];
  records.forEach((record) => {
    const entry = {
      date: record.holidayDate,
      name: record.holidayName,
      isLegalHoliday: record.isLegalHoliday === true
    };
    if (record.holidayType === 'makeup') {
      makeupWorkdays.push(entry);
    } else {
      holidays.push(entry);
    }
  });
  return { holidays, makeupWorkdays };
}

function buildYearRange(year) {
  const numericYear = Number(year);
  const start = new Date(numericYear, 0, 1);
  const end = new Date(numericYear, 11, 31);
  return { start, end };
}

export async function getPlanByYear(year) {
  const { start, end } = buildYearRange(year);
  const records = await Holiday.findAll({
    where: {
      holidayDate: {
        [Op.between]: [start, end]
      }
    },
    order: [['holidayDate', 'ASC']]
  });
  return toPlanStructure(records.map((r) => r.get({ plain: true })));
}

export async function getAllPlans() {
  const records = await Holiday.findAll({
    order: [['holidayDate', 'ASC']]
  });
  const plan = toPlanStructure(records.map((r) => r.get({ plain: true })));
  const years = await getAvailableYears();
  return { ...plan, years };
}

export async function getAvailableYears() {
  const [results] = await sequelize.query(`
    SELECT DISTINCT EXTRACT(YEAR FROM holiday_date)::int AS year
    FROM t_holidays
    ORDER BY 1 ASC
  `);
  return results
    .map((row) => Number(row.year))
    .filter((year) => !Number.isNaN(year));
}

export async function replacePlan(year, plan = {}) {
  const normalized = [];
  const pushRecord = (list = [], type) => {
    list.forEach((item) => {
      if (!item?.date) return;
      normalized.push({
        holidayName: item.name || '',
        holidayDate: item.date,
        holidayType: normalizeType(type),
        isLegalHoliday: item.isLegalHoliday === true
      });
    });
  };

  pushRecord(plan.holidays, 'holiday');
  pushRecord(plan.makeupWorkdays, 'makeup');

  const { start, end } = buildYearRange(year);

  await withTransaction(async (_sequelize, transaction) => {
    await Holiday.destroy({
      where: {
        holidayDate: {
          [Op.between]: [start, end]
        }
      },
      transaction
    });

    if (normalized.length > 0) {
      await Holiday.bulkCreate(normalized, { transaction });
    }
  });

  return { count: normalized.length };
}

export async function addHolidayDate({ year, date, type, name = '', isLegalHoliday = false }) {
  const targetType = normalizeType(type);
  await withTransaction(async (_sequelize, transaction) => {
    const existing = await Holiday.findOne({
      where: { holidayDate: date },
      transaction,
      lock: transaction.LOCK.UPDATE
    });

    if (existing) {
      const conflict = createDuplicateHolidayError();
      conflict.status = 409;
      throw conflict;
    }

    await Holiday.create({
      holidayName: name,
      holidayDate: date,
      holidayType: targetType,
      isLegalHoliday: isLegalHoliday === true
    }, { transaction });
  });
  return getPlanByYear(year);
}

export async function removeHolidayDate({ year, date }) {
  await Holiday.destroy({
    where: {
      holidayDate: date
    }
  });
  return getPlanByYear(year);
}

export async function updateHolidayDate({
  sourceYear,
  originalDate,
  targetYear,
  newDate,
  type,
  name = '',
  isLegalHoliday = false
}) {
  const targetType = normalizeType(type);
  try {
    await withTransaction(async (_sequelize, transaction) => {
      const normalizedPayload = {
        holidayName: name,
        holidayDate: newDate,
        holidayType: targetType,
        isLegalHoliday: isLegalHoliday === true
      };

      const existing = await Holiday.findOne({
        where: { holidayDate: originalDate },
        transaction,
        lock: transaction.LOCK.UPDATE
      });

      if (existing) {
        await existing.update(normalizedPayload, { transaction });
      } else {
        const conflict = await Holiday.findOne({
          where: { holidayDate: newDate },
          transaction,
          lock: transaction.LOCK.UPDATE
        });
        if (conflict) {
          throw createDuplicateHolidayError();
        }
        await Holiday.create(normalizedPayload, { transaction });
      }
    });
  } catch (error) {
    if (error instanceof UniqueConstraintError) {
      throw createDuplicateHolidayError();
    }
    throw error;
  }
  const yearToRefresh = Number(sourceYear) === Number(targetYear) ? sourceYear : targetYear;
  return getPlanByYear(yearToRefresh);
}

export async function importHolidays(records = []) {
  await withTransaction(async (_sequelize, transaction) => {
    for (const record of records) {
      const date = record?.date;
      if (!date) continue;
      await Holiday.upsert({
        holidayName: record.name || '',
        holidayDate: date,
        holidayType: normalizeType(record.type),
        isLegalHoliday: record.isLegalHoliday === true
      }, { transaction });
    }
  });
  return { count: records.length };
}

export default {
  getPlanByYear,
  getAllPlans,
  getAvailableYears,
  replacePlan,
  addHolidayDate,
  removeHolidayDate,
  updateHolidayDate,
  importHolidays
};
