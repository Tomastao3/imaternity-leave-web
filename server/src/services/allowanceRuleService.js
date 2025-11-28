import { UniqueConstraintError } from 'sequelize';
import { withTransaction } from '../db/pool.js';
import AllowanceRule from '../models/AllowanceRule.js';

function normalizeRule(rule = {}) {
  return {
    city: typeof rule.city === 'string' ? rule.city.trim() : '',
    socialAverageWage: Number(rule.socialAverageWage ?? rule.social_average_wage) || 0,
    companyAverageWage: Number(rule.companyAverageWage ?? rule.company_average_wage) || 0,
    companyContributionWage: Number(rule.companyContributionWage ?? rule.company_contribution_wage) || 0,
    calculationBase: rule.calculationBase || rule.calculation_base || '平均工资',
    payoutMethod: rule.payoutMethod || rule.payout_method || rule.accountType || '企业',
    maternityPolicy: rule.maternityPolicy ?? '',
    allowancePolicy: rule.allowancePolicy ?? ''
  };
}

function toClientPayload(record) {
  const plain = record.get({ plain: true });
  return {
    id: plain.id,
    city: plain.city,
    socialAverageWage: Number(plain.socialAverageWage),
    companyAverageWage: Number(plain.companyAverageWage),
    companyContributionWage: Number(plain.companyContributionWage),
    calculationBase: plain.calculationBase,
    payoutMethod: plain.payoutMethod,
    accountType: plain.payoutMethod,
    maternityPolicy: plain.maternityPolicy,
    allowancePolicy: plain.allowancePolicy
  };
}

function wrapUnique(error) {
  if (error instanceof UniqueConstraintError) {
    const err = new Error('该城市津贴规则已存在');
    err.code = 'DUPLICATE_ALLOWANCE_RULE';
    err.status = 409;
    throw err;
  }
  throw error;
}

export async function listAllowanceRules({ city } = {}) {
  const where = {};
  if (city) where.city = city;
  const records = await AllowanceRule.findAll({
    where,
    order: [['city', 'ASC']]
  });
  return records.map(toClientPayload);
}

export async function createAllowanceRule(rule) {
  const payload = normalizeRule(rule);
  if (!payload.city) {
    const err = new Error('城市必填');
    err.status = 400;
    err.code = 'INVALID_PARAMS';
    throw err;
  }
  try {
    const created = await AllowanceRule.create(payload);
    return toClientPayload(created);
  } catch (error) {
    wrapUnique(error);
  }
}

export async function updateAllowanceRule(id, rule) {
  const payload = normalizeRule(rule);
  const record = await AllowanceRule.findByPk(id);
  if (!record) {
    const err = new Error('津贴规则不存在');
    err.status = 404;
    err.code = 'NOT_FOUND';
    throw err;
  }
  try {
    await record.update(payload);
    return toClientPayload(record);
  } catch (error) {
    wrapUnique(error);
  }
}

export async function deleteAllowanceRule(id) {
  const count = await AllowanceRule.destroy({ where: { id } });
  if (count === 0) {
    const err = new Error('津贴规则不存在');
    err.status = 404;
    err.code = 'NOT_FOUND';
    throw err;
  }
  return { success: true };
}

export async function importAllowanceRules(rules = []) {
  if (!Array.isArray(rules)) {
    const err = new Error('导入数据必须是数组');
    err.status = 400;
    err.code = 'INVALID_PARAMS';
    throw err;
  }
  let affected = 0;
  await withTransaction(async (_sequelize, transaction) => {
    for (const rule of rules) {
      const payload = normalizeRule(rule);
      if (!payload.city) continue;
      try {
        await AllowanceRule.upsert(payload, { transaction });
        affected += 1;
      } catch (error) {
        wrapUnique(error);
      }
    }
  });
  return { count: affected };
}

export default {
  listAllowanceRules,
  createAllowanceRule,
  updateAllowanceRule,
  deleteAllowanceRule,
  importAllowanceRules
};
