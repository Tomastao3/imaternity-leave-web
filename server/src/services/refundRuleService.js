import { withTransaction } from '../db/pool.js';
import RefundRule from '../models/RefundRule.js';

const MONTH_PATTERN = /^\d{4}-(0[1-9]|1[0-2])$/;

function normalizeMonth(value) {
  if (!value && value !== 0) {
    return '';
  }
  const text = String(value).trim()
    .replace('/', '-');
  if (/^\d{6}$/.test(text)) {
    return `${text.slice(0, 4)}-${text.slice(4)}`;
  }
  return text;
}

function normalizeBoolean(value, fallback = false) {
  if (typeof value === 'boolean') {
    return value;
  }
  if (typeof value === 'string') {
    const normalized = value.trim().toLowerCase();
    if (['true', '1', 'y', 'yes', '是'].includes(normalized)) {
      return true;
    }
    if (['false', '0', 'n', 'no', '否'].includes(normalized)) {
      return false;
    }
  }
  if (value === 1) return true;
  if (value === 0) return false;
  return fallback;
}

function normalizeRefundRule(rule = {}) {
  const city = typeof rule.city === 'string' ? rule.city.trim() : '';
  const startMonth = normalizeMonth(rule.startMonth ?? rule.start_month);
  const endMonth = normalizeMonth(rule.endMonth ?? rule.end_month);
  const rawAmount = rule.refundAmount ?? rule.refund_amount ?? rule.amount;
  let refundAmount = null;
  if (rawAmount !== '' && rawAmount !== null && rawAmount !== undefined) {
    const parsed = Number(rawAmount);
    refundAmount = Number.isFinite(parsed) ? parsed : null;
  }

  return {
    city,
    startMonth,
    endMonth,
    refundDescription: rule.refundDescription?.trim?.() ?? rule.refund_description ?? '',
    refundAmount,
    directDisplay: normalizeBoolean(rule.directDisplay ?? rule.direct_display, false),
    singleMonthOnly: normalizeBoolean(rule.singleMonthOnly ?? rule.single_month_only, false)
  };
}

function toClientPayload(record) {
  const plain = record.get({ plain: true });
  return {
    id: plain.id,
    city: plain.city,
    startMonth: plain.startMonth,
    endMonth: plain.endMonth,
    refundDescription: plain.refundDescription ?? '',
    refundAmount: plain.refundAmount === null ? null : Number(plain.refundAmount),
    directDisplay: plain.directDisplay,
    singleMonthOnly: plain.singleMonthOnly
  };
}

function validate(payload) {
  if (!payload.city) {
    const err = new Error('城市不能为空');
    err.status = 400;
    err.code = 'INVALID_CITY';
    throw err;
  }
  if (!payload.startMonth || !MONTH_PATTERN.test(payload.startMonth)) {
    const err = new Error('开始月份必须为 YYYY-MM');
    err.status = 400;
    err.code = 'INVALID_START_MONTH';
    throw err;
  }
  if (!payload.endMonth || !MONTH_PATTERN.test(payload.endMonth)) {
    const err = new Error('结束月份必须为 YYYY-MM');
    err.status = 400;
    err.code = 'INVALID_END_MONTH';
    throw err;
  }
  if (payload.startMonth > payload.endMonth) {
    const err = new Error('开始月份不能晚于结束月份');
    err.status = 400;
    err.code = 'INVALID_MONTH_RANGE';
    throw err;
  }
}

export async function listRefundRules({ city } = {}) {
  const where = {};
  if (city) {
    where.city = city;
  }
  const records = await RefundRule.findAll({
    where,
    order: [
      ['city', 'ASC'],
      ['startMonth', 'ASC'],
      ['endMonth', 'ASC'],
      ['id', 'ASC']
    ]
  });
  return records.map(toClientPayload);
}

export async function createRefundRule(rule) {
  const payload = normalizeRefundRule(rule);
  validate(payload);
  const created = await RefundRule.create(payload);
  return toClientPayload(created);
}

export async function updateRefundRule(id, rule) {
  const payload = normalizeRefundRule(rule);
  validate(payload);
  const record = await RefundRule.findByPk(id);
  if (!record) {
    const err = new Error('返还规则不存在');
    err.status = 404;
    err.code = 'NOT_FOUND';
    throw err;
  }
  await record.update(payload);
  return toClientPayload(record);
}

export async function deleteRefundRule(id) {
  const count = await RefundRule.destroy({ where: { id } });
  if (count === 0) {
    const err = new Error('返还规则不存在');
    err.status = 404;
    err.code = 'NOT_FOUND';
    throw err;
  }
  return { success: true };
}

export async function importRefundRules(rules = []) {
  if (!Array.isArray(rules)) {
    const err = new Error('导入数据必须是数组');
    err.status = 400;
    err.code = 'INVALID_PARAMS';
    throw err;
  }

  const normalized = rules
    .map(normalizeRefundRule)
    .filter((rule) => {
      try {
        validate(rule);
        return true;
      } catch (_) {
        return false;
      }
    });

  const dedupMap = new Map();
  normalized.forEach((rule) => {
    const key = `${rule.city}__${rule.startMonth}__${rule.endMonth}`;
    dedupMap.set(key, rule);
  });

  const deduped = Array.from(dedupMap.values());

  await withTransaction(async (_sequelize, transaction) => {
    await RefundRule.destroy({ where: {}, truncate: true, restartIdentity: true, transaction });
    if (deduped.length > 0) {
      await RefundRule.bulkCreate(deduped, { transaction });
    }
  });

  return { count: deduped.length };
}

export default {
  listRefundRules,
  createRefundRule,
  updateRefundRule,
  deleteRefundRule,
  importRefundRules
};
