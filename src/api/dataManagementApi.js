// Mock API for data management operations
// Provides CRUD operations for maternity rules, allowance rules, employees, and holidays

import { cityDataManager } from '../utils/cityDataUtils';

import { 
  getHolidayPlan, 
  setHolidayPlan, 
  addDateToPlan, 
  removeDateFromPlan, 
  getAllHolidayYears,
  getHolidayStorage
} from '../utils/holidayUtils';

// ============ Maternity Rules API ============

export async function getMaternityRulesApi(request = {}) {
  try {
    await cityDataManager.loadData();
    const { city } = request;
    
    let rules;
    let indexMap = [];
    
    if (city) {
      // 过滤后的规则（包含"通用"规则），同时记录原始索引
      rules = [];
      cityDataManager.maternityRules.forEach((rule, globalIndex) => {
        if (rule.city === city || rule.city === '通用') {
          rules.push({ ...rule, _globalIndex: globalIndex });
          indexMap.push(globalIndex);
        }
      });
    } else {
      rules = cityDataManager.maternityRules.map((rule, index) => ({ ...rule, _globalIndex: index }));
    }
    
    return { ok: true, data: rules };
  } catch (error) {
    return { ok: false, error: error?.message || '获取产假规则失败' };
  }
}

export async function addMaternityRuleApi(request) {
  try {
    const { rule } = request;
    if (!rule) {
      return { ok: false, error: '参数错误：rule 不能为空' };
    }
    
    await cityDataManager.addMaternityRule(rule);
    return { ok: true, data: rule };
  } catch (error) {
    return { ok: false, error: error?.message || '添加产假规则失败' };
  }
}

export async function updateMaternityRuleApi(request) {
  try {
    const { index, rule } = request;
    if (index === undefined || !rule) {
      return { ok: false, error: '参数错误：index 和 rule 不能为空' };
    }
    
    // 使用 _globalIndex 如果存在，否则使用 index
    const globalIndex = rule._globalIndex !== undefined ? rule._globalIndex : index;
    const cleanRule = { ...rule };
    delete cleanRule._globalIndex;
    
    await cityDataManager.updateMaternityRule(globalIndex, cleanRule);
    return { ok: true, data: cleanRule };
  } catch (error) {
    return { ok: false, error: error?.message || '更新产假规则失败' };
  }
}

export async function deleteMaternityRuleApi(request) {
  try {
    const { index, globalIndex } = request;
    if (index === undefined && globalIndex === undefined) {
      return { ok: false, error: '参数错误：index 不能为空' };
    }
    
    // 优先使用 globalIndex
    const targetIndex = globalIndex !== undefined ? globalIndex : index;
    await cityDataManager.deleteMaternityRule(targetIndex);
    return { ok: true };
  } catch (error) {
    return { ok: false, error: error?.message || '删除产假规则失败' };
  }
}

export async function importMaternityRulesApi(request) {
  try {
    const { rules } = request;
    if (!rules || !Array.isArray(rules)) {
      return { ok: false, error: '参数错误：rules 必须是数组' };
    }
    
    await cityDataManager.setMaternityRules(rules);
    return { ok: true, data: { count: rules.length } };
  } catch (error) {
    return { ok: false, error: error?.message || '导入产假规则失败' };
  }
}

// ============ Allowance Rules API ============

export async function getAllowanceRulesApi(request = {}) {
  try {
    await cityDataManager.loadData();
    const { city } = request;
    
    let rules;
    if (city) {
      // 返回指定城市和"通用"城市的规则
      rules = cityDataManager.allowanceRules.filter(rule => 
        rule.city === city || rule.city === '通用'
      );
    } else {
      rules = cityDataManager.allowanceRules;
    }
    
    return { ok: true, data: rules };
  } catch (error) {
    return { ok: false, error: error?.message || '获取津贴规则失败' };
  }
}

export async function addAllowanceRuleApi(request) {
  try {
    const { rule } = request;
    if (!rule) {
      return { ok: false, error: '参数错误：rule 不能为空' };
    }
    
    await cityDataManager.addAllowanceRule(rule);
    return { ok: true, data: rule };
  } catch (error) {
    return { ok: false, error: error?.message || '添加津贴规则失败' };
  }
}

export async function updateAllowanceRuleApi(request) {
  try {
    const { index, rule } = request;
    if (index === undefined || !rule) {
      return { ok: false, error: '参数错误：index 和 rule 不能为空' };
    }
    
    await cityDataManager.updateAllowanceRule(index, rule);
    return { ok: true, data: rule };
  } catch (error) {
    return { ok: false, error: error?.message || '更新津贴规则失败' };
  }
}

export async function deleteAllowanceRuleApi(request) {
  try {
    const { index } = request;
    if (index === undefined) {
      return { ok: false, error: '参数错误：index 不能为空' };
    }
    
    await cityDataManager.deleteAllowanceRule(index);
    return { ok: true };
  } catch (error) {
    return { ok: false, error: error?.message || '删除津贴规则失败' };
  }
}

export async function importAllowanceRulesApi(request) {
  try {
    const { rules } = request;
    if (!rules || !Array.isArray(rules)) {
      return { ok: false, error: '参数错误：rules 必须是数组' };
    }
    
    await cityDataManager.setAllowanceRules(rules);
    return { ok: true, data: { count: rules.length } };
  } catch (error) {
    return { ok: false, error: error?.message || '导入津贴规则失败' };
  }
}

// ============ Refund Rules API ============

export async function getRefundRulesApi(request = {}) {
  try {
    await cityDataManager.loadData();
    const { city } = request;

    const rules = city
      ? cityDataManager.getRefundRulesByCity(city)
      : cityDataManager.refundRules;

    return { ok: true, data: rules };
  } catch (error) {
    return { ok: false, error: error?.message || '获取返还规则失败' };
  }
}

export async function addRefundRuleApi(request) {
  try {
    const { rule } = request;
    if (!rule) {
      return { ok: false, error: '参数错误：rule 不能为空' };
    }

    await cityDataManager.addRefundRule(rule);
    return { ok: true, data: rule };
  } catch (error) {
    return { ok: false, error: error?.message || '添加返还规则失败' };
  }
}

export async function updateRefundRuleApi(request) {
  try {
    const { index, rule } = request;
    if (index === undefined || !rule) {
      return { ok: false, error: '参数错误：index 和 rule 不能为空' };
    }

    await cityDataManager.updateRefundRule(index, rule);
    return { ok: true, data: rule };
  } catch (error) {
    return { ok: false, error: error?.message || '更新返还规则失败' };
  }
}

export async function deleteRefundRuleApi(request) {
  try {
    const { index } = request;
    if (index === undefined) {
      return { ok: false, error: '参数错误：index 不能为空' };
    }

    await cityDataManager.deleteRefundRule(index);
    return { ok: true };
  } catch (error) {
    return { ok: false, error: error?.message || '删除返还规则失败' };
  }
}

export async function importRefundRulesApi(request) {
  try {
    const { rules } = request;
    if (!rules || !Array.isArray(rules)) {
      return { ok: false, error: '参数错误：rules 必须是数组' };
    }

    await cityDataManager.setRefundRules(rules);
    return { ok: true, data: { count: rules.length } };
  } catch (error) {
    return { ok: false, error: error?.message || '导入返还规则失败' };
  }
}

// ============ Employee API ============

export async function getEmployeesApi(request = {}) {
  try {
    await cityDataManager.loadData();
    const { city } = request;

    const employees = city
      ? cityDataManager.getEmployeesByCity(city)
      : cityDataManager.employeeData;

    return { ok: true, data: employees };
  } catch (error) {
    return { ok: false, error: error?.message || '获取员工信息失败' };
  }
}

export async function addEmployeeApi(request) {
  try {
    const { employee } = request;
    if (!employee) {
      return { ok: false, error: '参数错误：employee 不能为空' };
    }
    
    await cityDataManager.addEmployee(employee);
    return { ok: true, data: employee };
  } catch (error) {
    return { ok: false, error: error?.message || '添加员工信息失败' };
  }
}

export async function updateEmployeeApi(request) {
  try {
    const { index, employee } = request;
    if (index === undefined || !employee) {
      return { ok: false, error: '参数错误：index 和 employee 不能为空' };
    }
    
    await cityDataManager.updateEmployee(index, employee);
    return { ok: true, data: employee };
  } catch (error) {
    return { ok: false, error: error?.message || '更新员工信息失败' };
  }
}

export async function deleteEmployeeApi(request) {
  try {
    const { index } = request;
    if (index === undefined) {
      return { ok: false, error: '参数错误：index 不能为空' };
    }
    
    await cityDataManager.deleteEmployee(index);
    return { ok: true };
  } catch (error) {
    return { ok: false, error: error?.message || '删除员工信息失败' };
  }
}

export async function importEmployeesApi(request) {
  try {
    const { employees } = request;
    if (!employees || !Array.isArray(employees)) {
      return { ok: false, error: '参数错误：employees 必须是数组' };
    }
    
    await cityDataManager.setEmployeeData(employees);
    return { ok: true, data: { count: employees.length } };
  } catch (error) {
    return { ok: false, error: error?.message || '导入员工信息失败' };
  }
}

export async function getHolidayPlanApi(request = {}) {
  try {
    const { year } = request;
    
    if (year === 'all' || year === undefined) {
      const years = await getAllHolidayYears();
      const allPlans = await Promise.all(
        years.map(async (y) => {
          const plan = await getHolidayPlan(y);
          return plan;
        })
      );
      
      const merged = allPlans.reduce((acc, plan = { holidays: [], makeupWorkdays: [] }) => {
        acc.holidays.push(...(plan.holidays || []));
        acc.makeupWorkdays.push(...(plan.makeupWorkdays || []));
        return acc;
      }, { holidays: [], makeupWorkdays: [] });
      
      // 去重：支持对象格式 { date, name }
      const uniqByDate = (arr) => {
        const map = new Map();
        arr.forEach(item => {
          const date = typeof item === 'string' ? item : item.date;
          if (!date) return;
          const name = typeof item === 'string' ? '' : (item.name || '');
          const isLegalHoliday = typeof item === 'string' ? false : (item.isLegalHoliday === true);
          map.set(date, { date, name, isLegalHoliday });
        });
        return Array.from(map.values()).sort((a, b) => a.date.localeCompare(b.date));
      };
      
      return { 
        ok: true, 
        data: {
          holidays: uniqByDate(merged.holidays),
          makeupWorkdays: uniqByDate(merged.makeupWorkdays),
          years
        }
      };
    } else {
      const plan = await getHolidayPlan(Number(year));
      return { ok: true, data: plan || { holidays: [], makeupWorkdays: [] } };
    }
  } catch (error) {
    return { ok: false, error: error?.message || '获取节假日计划失败' };
  }
}

export async function getHolidayYearsApi() {
  try {
    const years = await getAllHolidayYears();
    return { ok: true, data: years };
  } catch (error) {
    return { ok: false, error: error?.message || '获取年份列表失败' };
  }
}

export async function addHolidayDateApi(request) {
  try {
    const { year, date, type, name, isLegalHoliday } = request;
    if (!year || !date || !type) {
      return { ok: false, error: '参数错误：year、date 和 type 不能为空' };
    }
    
    await addDateToPlan(Number(year), date, type, name || '', isLegalHoliday || false);
    return { ok: true };
  } catch (error) {
    return { ok: false, error: error?.message || '添加节假日失败' };
  }
}

export async function removeHolidayDateApi(request) {
  try {
    const { year, date } = request;
    if (!year || !date) {
      return { ok: false, error: '参数错误：year 和 date 不能为空' };
    }
    
    await removeDateFromPlan(Number(year), date);
    return { ok: true };
  } catch (error) {
    return { ok: false, error: error?.message || '删除节假日失败' };
  }
}

export async function updateHolidayDateApi(request) {
  try {
    const { sourceYear, originalDate, targetYear, newDate, type, name, isLegalHoliday } = request;
    if (!sourceYear || !originalDate || !targetYear || !newDate || !type) {
      return { ok: false, error: '参数错误：所有参数不能为空' };
    }

    const storage = getHolidayStorage();

    if (storage && typeof storage.updateDate === 'function') {
      await storage.updateDate({
        sourceYear,
        originalDate,
        targetYear,
        newDate,
        type,
        name,
        isLegalHoliday
      });
    } else {
      if (originalDate !== newDate || sourceYear !== targetYear) {
        await removeDateFromPlan(Number(sourceYear), originalDate);
      }
      await addDateToPlan(Number(targetYear), newDate, type, name || '', isLegalHoliday || false);
    }
    return { ok: true };
  } catch (error) {
    return { ok: false, error: error?.message || '更新节假日失败' };
  }
}

export async function setHolidayPlanApi(request) {
  try {
    const { year, plan } = request;
    if (!year || !plan) {
      return { ok: false, error: '参数错误：year 和 plan 不能为空' };
    }
    
    await setHolidayPlan(Number(year), plan);
    return { ok: true };
  } catch (error) {
    return { ok: false, error: error?.message || '保存节假日计划失败' };
  }
}

export async function importHolidaysApi(request) {
  try {
    const { holidays } = request;
    if (!holidays || !Array.isArray(holidays)) {
      return { ok: false, error: '参数错误：holidays 必须是数组' };
    }

    const normalizeFlag = (value) => {
      if (value === undefined || value === null || value === '') {
        return false;
      }
      if (typeof value === 'boolean') {
        return value;
      }
      const normalized = String(value).trim().toLowerCase();
      if (['是', 'true', '1', 'y', 'yes'].includes(normalized)) {
        return true;
      }
      if (['否', 'false', '0', 'n', 'no'].includes(normalized)) {
        return false;
      }
      return false;
    };

    const grouped = {};
    holidays.forEach(h => {
      if (!h || !h.date) {
        return;
      }
      const parsedYear = h.year ?? new Date(h.date).getFullYear();
      const y = Number.isFinite(parsedYear) ? parsedYear : new Date().getFullYear();
      if (!grouped[y]) grouped[y] = { holidays: [], makeupWorkdays: [] };
      const item = {
        date: h.date,
        name: h.name || '',
        isLegalHoliday: normalizeFlag(h.isLegalHoliday ?? h['是否为法定假日'])
      };
      if (h.type === 'holiday' || h.type === '节假日') {
        grouped[y].holidays.push(item);
      } else if (h.type === 'makeup' || h.type === '工作日') {
        grouped[y].makeupWorkdays.push(item);
      }
    });

    for (const [y, plan] of Object.entries(grouped)) {
      const uniqByDate = (arr = []) => {
        const map = new Map();
        arr.forEach(item => {
          if (!item || !item.date) return;
          map.set(item.date, item);
        });
        return Array.from(map.values());
      };

      const replaced = {
        holidays: uniqByDate(plan.holidays),
        makeupWorkdays: uniqByDate(plan.makeupWorkdays)
      };

      await setHolidayPlan(Number(y), replaced);
    }

    return { ok: true, data: { count: holidays.length } };
  } catch (error) {
    return { ok: false, error: error?.message || '导入返还规则失败' };
  }
}

export async function getCitiesApi() {
  try {
    await cityDataManager.loadData();
    const cities = cityDataManager.getCities();
    return { ok: true, data: cities };
  } catch (error) {
    return { ok: false, error: error?.message || '获取城市列表失败' };
  }
}

export async function saveAllDataApi() {
  try {
    await cityDataManager.saveData();
    return { ok: true };
  } catch (error) {
    return { ok: false, error: error?.message || '保存数据失败' };
  }
}
