// 中国法定节假日与调休上班日工具（完全离线，内置默认表）
// 提供：
// - getHolidaySets(year): 返回 { holidays: Set<string>, makeupWorkdays: Set<string> }，日期格式 'yyyy-MM-dd'
// - saveHolidayPlan(year, plan): 写入 IndexedDB 并更新内存缓存
// - warmUpHolidayPlan(year): 从 IndexedDB 预热缓存
// - 数据来源：IndexedDB（不再从 config JSON 读取）

import { format, addDays, startOfYear, endOfYear } from 'date-fns';
import { getHolidayStorage } from '../storage/holidayStorage/factory';
import { normalizeHolidayPlan } from '../storage/holidayStorage/utils';

// 默认表移除，全部依赖 IndexedDB，内存缓存仅保存会话内的改动

// 可被管理页面覆盖的自定义计划（内存态；持久化存 IndexedDB）
const customPlansByYear = {};
const holidayChangeListeners = new Set();
let holidayChangeVersion = 0;

export function addHolidayChangeListener(listener) {
  if (typeof listener !== 'function') {
    return () => {};
  }
  holidayChangeListeners.add(listener);
  return () => {
    holidayChangeListeners.delete(listener);
  };
}

export function notifyHolidayChange(payload = {}) {
  holidayChangeVersion += 1;
  const event = { ...payload, version: holidayChangeVersion };
  holidayChangeListeners.forEach((listener) => {
    try {
      listener(event);
    } catch (error) {
      console.error('holiday change listener failed:', error);
    }
  });
}

export function getHolidayVersion() {
  return holidayChangeVersion;
}

function getStorage() {
  return getHolidayStorage();
}

export { getHolidayStorage };

export function saveHolidayPlan(year, plan) {
  // 兼容旧接口：保存整年的计划
  return setHolidayPlan(year, plan);
}

export async function warmUpHolidayPlan(_year) {
  const year = Number(_year);
  try {
    const plan = await getStorage().getPlan(year);
    customPlansByYear[year] = normalizeHolidayPlan(plan);
  } catch (error) {
    console.warn('预热节假日数据失败:', error);
    if (!customPlansByYear[year]) {
      customPlansByYear[year] = { holidays: [], makeupWorkdays: [] };
    }
  }
}

export function getHolidaySets(year) {
  const numericYear = Number(year);
  const plan = customPlansByYear[numericYear] || { holidays: [], makeupWorkdays: [] };
  // 提取日期字符串用于Set（向后兼容）
  const extractDates = (arr) => arr.map(item => typeof item === 'string' ? item : item.date);
  return {
    holidays: new Set(extractDates(plan.holidays)),
    makeupWorkdays: new Set(extractDates(plan.makeupWorkdays))
  };
}

// 获取完整的节假日对象数组（包含 isLegalHoliday 等元数据）
export function getHolidayDetails(year) {
  const numericYear = Number(year);
  const plan = customPlansByYear[numericYear] || { holidays: [], makeupWorkdays: [] };
  return {
    holidays: plan.holidays || [],
    makeupWorkdays: plan.makeupWorkdays || []
  };
}

// 读取某年的节假日计划（直接从IndexedDB读取，不使用内存缓存）
export async function getHolidayPlan(year) {
  try {
    const plan = await getStorage().getPlan(Number(year));
    const normalized = normalizeHolidayPlan(plan);
    customPlansByYear[year] = normalized;
    return normalized;
  } catch (error) {
    console.warn('获取节假日数据失败:', error);
    const emptyPlan = { holidays: [], makeupWorkdays: [] };
    customPlansByYear[year] = emptyPlan;
    return emptyPlan;
  }
}

// 设置某年的节假日计划（覆盖默认）
export async function setHolidayPlan(year, plan) {
  const norm = normalizeHolidayPlan(plan);
  customPlansByYear[year] = norm;
  try {
    await getStorage().upsertPlan(Number(year), norm);
  } catch (error) {
    customPlansByYear[year] = customPlansByYear[year] || { holidays: [], makeupWorkdays: [] };
    throw error;
  }
  return norm;
}

// 追加某一日期到指定类型（'holiday' 或 'makeup'），支持节日名称
export function addDateToPlan(year, dateStr, type, name = '', isLegalHoliday = false) {
  const numericYear = Number(year);
  return getStorage().addDate({
    year: numericYear,
    date: dateStr,
    type,
    name,
    isLegalHoliday
  }).then(async () => {
    const updated = await getStorage().getPlan(numericYear);
    const normalized = normalizeHolidayPlan(updated);
    customPlansByYear[numericYear] = normalized;
    return normalized;
  });
}

// 从计划中移除某日期
export function removeDateFromPlan(year, dateStr) {
  const numericYear = Number(year);
  return getStorage().removeDate(numericYear, dateStr).then(async () => {
    const updated = await getStorage().getPlan(numericYear);
    const normalized = normalizeHolidayPlan(updated);
    customPlansByYear[numericYear] = normalized;
    return normalized;
  });
}

export async function refreshHolidayPlanCache(year) {
  const numericYear = Number(year);
  if (Number.isNaN(numericYear)) {
    return { holidays: [], makeupWorkdays: [] };
  }
  try {
    const plan = await getHolidayPlan(numericYear);
    return plan;
  } catch (error) {
    console.warn('刷新节假日缓存失败:', error);
    return customPlansByYear[numericYear] || { holidays: [], makeupWorkdays: [] };
  }
}

// 便捷函数：返回一个年份内所有自然日字符串数组（用于校验/生成数据）
export function enumerateDatesOfYear(year) {
  const dates = [];
  const start = startOfYear(new Date(year, 0, 1));
  const end = endOfYear(start);
  for (let d = start; d <= end; d = addDays(d, 1)) {
    dates.push(format(d, 'yyyy-MM-dd'));
  }
  return dates;
}

// 返回所有可用年份（默认配置 + IndexedDB中已有的年份），升序
export async function getAllHolidayYears() {
  try {
    const years = await getStorage().getYears();
    return (years || []).map(Number).sort((a, b) => a - b);
  } catch (error) {
    console.warn('获取年份列表失败:', error);
    return [];
  }
}
