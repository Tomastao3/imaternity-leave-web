// 中国法定节假日与调休上班日工具（完全离线，内置默认表）
// 提供：
// - getHolidaySets(year): 返回 { holidays: Set<string>, makeupWorkdays: Set<string> }，日期格式 'yyyy-MM-dd'
// - saveHolidayPlan(year, plan): NO-OP（不再写入 localStorage）
// - warmUpHolidayPlan(year): NO-OP（不再依赖在线数据源）
// - 内置 2023/2024/2025 年默认表（可在此文件中维护）

import { format, addDays, startOfYear, endOfYear } from 'date-fns';

// 预置的 2023/2024/2025 节假日与调休（建议根据国务院发布的放假安排完整维护）
// 示例：
// holidays: ['2025-01-01','2025-01-27','2025-01-28', ...]
// makeupWorkdays: ['2025-02-01','2025-02-08', ...]

const defaultHolidayPlan2023 = {
  holidays: [
    // TODO: 在此完整填入 2023 年法定节假日（含调休形成的连休休息日）
  ],
  makeupWorkdays: [
    // TODO: 在此完整填入 2023 年周末调休上班日
  ]
};

const defaultHolidayPlan2024 = {
  holidays: [
    // 2024 清明节放假：4/4-4/6 休息
    '2024-04-04','2024-04-05','2024-04-06',
    // 2024 劳动节：5/1-5/5 休息（放这里以防跨月计算引用；完整表可后续补齐）
    '2024-05-01','2024-05-02','2024-05-03','2024-05-04','2024-05-05'
  ],
  makeupWorkdays: [
    // 2024 清明调休：4/7（周日）上班
    '2024-04-07',
    // 2024 劳动节调休涉及：4/28（周日）上班（影响4月统计）
    '2024-04-28'
  ]
};
const defaultHolidayPlan2025 = {
  holidays: [
    // 元旦
    '2025-01-01',
    // 清明节（按官方安排，这里标记 4/4 为休息日；若有连休请补全相邻日期）
    '2025-04-04',
    // 劳动节常见放假（以官方为准，若与官方有出入，可通过保存计划覆盖）
    '2025-05-01','2025-05-02','2025-05-03','2025-05-04','2025-05-05'
  ],
  makeupWorkdays: [
    // 劳动节调休：4/27（周日）上班（用于修复用户反馈的工作日问题）
    '2025-04-27'
    // 如有其它调休上班日，请在此补充或通过 saveHolidayPlan(2025, plan) 覆盖
  ]
};

const defaultPlansByYear = {
  2023: defaultHolidayPlan2023,
  2024: defaultHolidayPlan2024,
  2025: defaultHolidayPlan2025
};

// 可被管理页面覆盖的自定义计划（内存态；如需持久化可扩展到localStorage或后端）
const customPlansByYear = {};

export function saveHolidayPlan(year, plan) {
  // 兼容旧接口：保存整年的计划
  setHolidayPlan(year, plan);
}

export function warmUpHolidayPlan(_year) {
  // NO-OP: 不再依赖在线数据源
  return Promise.resolve();
}

export function getHolidaySets(year) {
  const plan = getHolidayPlan(year);
  return {
    holidays: new Set(plan.holidays),
    makeupWorkdays: new Set(plan.makeupWorkdays)
  };
}

// 读取某年的节假日计划（优先自定义，其次默认，最后空表）
export function getHolidayPlan(year) {
  if (customPlansByYear[year]) return customPlansByYear[year];
  return defaultPlansByYear[year] || { holidays: [], makeupWorkdays: [] };
}

// 设置某年的节假日计划（覆盖默认）
export function setHolidayPlan(year, plan) {
  const norm = normalizePlan(plan);
  customPlansByYear[year] = norm;
  return norm;
}

// 追加某一日期到指定类型（'holiday' 或 'makeup'）
export function addDateToPlan(year, dateStr, type) {
  const plan = { ...getHolidayPlan(year) };
  if (type === 'holiday') {
    if (!plan.holidays.includes(dateStr)) plan.holidays = [...plan.holidays, dateStr];
    plan.makeupWorkdays = plan.makeupWorkdays.filter(d => d !== dateStr);
  } else if (type === 'makeup') {
    if (!plan.makeupWorkdays.includes(dateStr)) plan.makeupWorkdays = [...plan.makeupWorkdays, dateStr];
    plan.holidays = plan.holidays.filter(d => d !== dateStr);
  }
  return setHolidayPlan(year, plan);
}

// 从计划中移除某日期
export function removeDateFromPlan(year, dateStr) {
  const plan = { ...getHolidayPlan(year) };
  plan.holidays = plan.holidays.filter(d => d !== dateStr);
  plan.makeupWorkdays = plan.makeupWorkdays.filter(d => d !== dateStr);
  return setHolidayPlan(year, plan);
}

function normalizePlan(plan) {
  const uniq = (arr) => Array.from(new Set((arr || []).map(String)));
  return {
    holidays: uniq(plan.holidays || []),
    makeupWorkdays: uniq(plan.makeupWorkdays || [])
  };
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
