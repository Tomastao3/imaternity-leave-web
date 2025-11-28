import { UniqueConstraintError } from 'sequelize';
import { withTransaction } from '../db/pool.js';
import MaternityRule from '../models/MaternityRule.js';

function normalizeIncomingRule(rule = {}) {
  const normalizedCity = typeof rule.city === 'string' ? rule.city.trim() : '';
  const leaveDays = rule.leaveDays ?? rule.days;
  return {
    city: normalizedCity,
    leaveType: typeof rule.leaveType === 'string' ? rule.leaveType.trim() : '',
    miscarriageType: rule.miscarriageType ? String(rule.miscarriageType).trim() : null,
    leaveDays: Number.parseInt(leaveDays, 10) || 0,
    isExtendable: rule.isExtendable === true || rule.isExtendable === 'true',
    hasAllowance: rule.hasAllowance === false ? false : true
  };
}

function toClientPayload(record) {
  const plain = record.get({ plain: true });
  return {
    id: plain.id,
    city: plain.city,
    leaveType: plain.leaveType,
    miscarriageType: plain.miscarriageType,
    days: plain.leaveDays,
    isExtendable: plain.isExtendable,
    hasAllowance: plain.hasAllowance
  };
}

function handleUniqueConstraint(error) {
  if (error instanceof UniqueConstraintError) {
    const message = '重复的产假规则：同一城市相同产假类型与流产类型组合已存在';
    const err = new Error(message);
    err.code = 'DUPLICATE_RULE';
    err.status = 409;
    throw err;
  }
  throw error;
}

export async function listRules({ city } = {}) {
  const where = {};
  if (city) {
    where.city = city;
  }
  const records = await MaternityRule.findAll({
    where,
    order: [
      ['city', 'ASC'],
      ['leaveType', 'ASC'],
      ['miscarriageType', 'ASC']
    ]
  });
  return records.map(toClientPayload);
}

export async function createRule(rule) {
  const payload = normalizeIncomingRule(rule);
  if (!payload.city || !payload.leaveType || payload.leaveDays <= 0) {
    const err = new Error('城市、产假类型和产假天数为必填项');
    err.code = 'INVALID_PARAMS';
    err.status = 400;
    throw err;
  }
  try {
    const created = await MaternityRule.create(payload);
    return toClientPayload(created);
  } catch (error) {
    handleUniqueConstraint(error);
  }
}

export async function updateRule(id, rule) {
  const payload = normalizeIncomingRule(rule);
  if (payload.leaveDays <= 0) {
    const err = new Error('产假天数必须为正数');
    err.code = 'INVALID_PARAMS';
    err.status = 400;
    throw err;
  }
  const record = await MaternityRule.findByPk(id);
  if (!record) {
    const err = new Error('指定的产假规则不存在');
    err.code = 'NOT_FOUND';
    err.status = 404;
    throw err;
  }
  try {
    await record.update(payload);
    return toClientPayload(record);
  } catch (error) {
    handleUniqueConstraint(error);
  }
}

export async function deleteRule(id) {
  const count = await MaternityRule.destroy({ where: { id } });
  if (count === 0) {
    const err = new Error('指定的产假规则不存在');
    err.code = 'NOT_FOUND';
    err.status = 404;
    throw err;
  }
  return { success: true };
}

export async function importRules(rules = []) {
  if (!Array.isArray(rules)) {
    const err = new Error('导入数据必须是数组');
    err.code = 'INVALID_PARAMS';
    err.status = 400;
    throw err;
  }

  const deduped = [];
  const seenKeys = new Set();

  for (const rule of rules) {
    const payload = normalizeIncomingRule(rule);
    if (!payload.city || !payload.leaveType || payload.leaveDays <= 0) {
      continue;
    }
    const key = `${payload.city}__${payload.leaveType}__${payload.miscarriageType || ''}`;
    if (seenKeys.has(key)) {
      // 覆盖重复项，使用最后一条记录
      const index = deduped.findIndex(item => item.city === payload.city
        && item.leaveType === payload.leaveType
        && (item.miscarriageType || '') === (payload.miscarriageType || ''));
      if (index >= 0) {
        deduped[index] = payload;
      }
    } else {
      seenKeys.add(key);
      deduped.push(payload);
    }
  }

  let affected = 0;
  await withTransaction(async (_sequelize, transaction) => {
    await MaternityRule.destroy({ where: {}, truncate: true, transaction });
    if (deduped.length > 0) {
      await MaternityRule.bulkCreate(deduped, { transaction });
    }
    affected = deduped.length;
  });

  return { count: affected };
}

export default {
  listRules,
  updateRule,
  deleteRule,
  importRules
};
