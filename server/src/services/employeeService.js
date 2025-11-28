import { UniqueConstraintError } from 'sequelize';
import { withTransaction } from '../db/pool.js';
import Employee from '../models/Employee.js';

const DEFAULT_PREGNANCY_PERIOD = '7个月以上';

function normalizeEmployee(employee = {}) {
  const employeeNo = (employee.employeeNo || employee.employeeId || '').trim();
  const employeeName = (employee.employeeName || employee.name || '').trim();
  const city = (employee.city || '').trim();
  const personalSSMonthly = Number(employee.personalSSMonthly ?? 0) || 0;
  const basicSalaryValue = Number(employee.employeeBasicSalary ?? employee.basicSalary ?? 0) || 0;
  const baseSalaryCurrent = employee.employeeBaseSalaryCurrent ?? employee.socialSecurityBase;
  const parsedBaseSalary = baseSalaryCurrent === null || baseSalaryCurrent === undefined
    ? null
    : Number(baseSalaryCurrent) || 0;

  return {
    employeeNo,
    employeeName,
    city,
    personalSSMonthly,
    employeeBasicSalary: basicSalaryValue,
    employeeBaseSalaryCurrent: parsedBaseSalary ?? basicSalaryValue,
    isDifficultBirth: employee.isDifficultBirth === true || employee.isDifficultBirth === 'true',
    numberOfBabies: Number(employee.numberOfBabies ?? 1) || 1,
    pregnancyPeriod: employee.pregnancyPeriod || DEFAULT_PREGNANCY_PERIOD
  };
}

function toClientPayload(record) {
  const plain = record.get({ plain: true });
  return {
    id: plain.id,
    employeeId: plain.employeeNo,
    employeeName: plain.employeeName,
    city: plain.city,
    personalSSMonthly: Number(plain.personalSSMonthly ?? 0),
    basicSalary: Number(plain.employeeBasicSalary),
    socialSecurityBase: plain.employeeBaseSalaryCurrent != null
      ? Number(plain.employeeBaseSalaryCurrent)
      : Number(plain.employeeBasicSalary),
    isDifficultBirth: plain.isDifficultBirth,
    numberOfBabies: plain.numberOfBabies,
    pregnancyPeriod: plain.pregnancyPeriod
  };
}

function wrapUnique(error) {
  if (error instanceof UniqueConstraintError) {
    const err = new Error('该员工编号已存在');
    err.code = 'DUPLICATE_EMPLOYEE';
    err.status = 409;
    throw err;
  }
  throw error;
}

export async function listEmployees({ city } = {}) {
  const where = {};
  if (city) {
    where.city = city;
  }
  const records = await Employee.findAll({
    where,
    order: [['employeeName', 'ASC']]
  });
  return records.map(toClientPayload);
}

export async function createEmployee(employee) {
  const payload = normalizeEmployee(employee);
  if (!payload.employeeNo || !payload.employeeName || !payload.city) {
    const err = new Error('员工编号、姓名和城市为必填项');
    err.code = 'INVALID_PARAMS';
    err.status = 400;
    throw err;
  }
  // 注意：personalSSMonthly, employeeBasicSalary, employeeBaseSalaryCurrent 允许为0
  // 不再验证必须为正数
  try {
    const created = await Employee.create(payload);
    return toClientPayload(created);
  } catch (error) {
    wrapUnique(error);
  }
}

export async function updateEmployee(id, employee) {
  const payload = normalizeEmployee(employee);
  const record = await Employee.findByPk(id);
  if (!record) {
    const err = new Error('员工不存在');
    err.code = 'NOT_FOUND';
    err.status = 404;
    throw err;
  }
  try {
    await record.update(payload);
    return toClientPayload(record);
  } catch (error) {
    wrapUnique(error);
  }
}

export async function deleteEmployee(id) {
  const count = await Employee.destroy({ where: { id } });
  if (count === 0) {
    const err = new Error('员工不存在');
    err.code = 'NOT_FOUND';
    err.status = 404;
    throw err;
  }
  return { success: true };
}

export async function importEmployees(employees = []) {
  if (!Array.isArray(employees)) {
    const err = new Error('导入数据必须是数组');
    err.code = 'INVALID_PARAMS';
    err.status = 400;
    throw err;
  }
  let affected = 0;
  await withTransaction(async (_sequelize, transaction) => {
    for (const employee of employees) {
      const payload = normalizeEmployee(employee);
      if (!payload.employeeNo || !payload.employeeName || !payload.city) {
        continue;
      }
      try {
        await Employee.upsert(payload, { transaction });
        affected += 1;
      } catch (error) {
        wrapUnique(error);
      }
    }
  });
  return { count: affected };
}

export default {
  listEmployees,
  createEmployee,
  updateEmployee,
  deleteEmployee,
  importEmployees
};
