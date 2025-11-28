import * as XLSX from 'xlsx';
import { saveAs } from 'file-saver';
import { idbGet, idbSet } from './indexedDb';
import { getStorageMode } from '../config/storageConfig';
import {
  listMaternityRules,
  createMaternityRule as createMaternityRuleApi,
  updateMaternityRule as updateMaternityRuleApi,
  deleteMaternityRule as deleteMaternityRuleApi,
  importMaternityRules as importMaternityRulesApi
} from '../api/postgresMaternityRulesClient';
import {
  listAllowanceRules as listAllowanceRulesApi,
  createAllowanceRule as createAllowanceRuleApi,
  updateAllowanceRule as updateAllowanceRuleApi,
  deleteAllowanceRule as deleteAllowanceRuleApi,
  importAllowanceRules as importAllowanceRulesApi
} from '../api/postgresAllowanceRulesClient';
import {
  listEmployees as listEmployeesApi,
  createEmployee as createEmployeeApi,
  updateEmployee as updateEmployeeApi,
  deleteEmployee as deleteEmployeeApi,
  importEmployees as importEmployeesApi
} from '../api/postgresEmployeesClient';
import {
  listRefundRules as listRefundRulesApi,
  createRefundRule as createRefundRuleApi,
  updateRefundRule as updateRefundRuleApi,
  deleteRefundRule as deleteRefundRuleApi,
  importRefundRules as importRefundRulesApi
} from '../api/postgresRefundRulesClient';

// 产假类型枚举
export const MATERNITY_LEAVE_TYPES = {
  LEGAL: '法定产假',
  DIFFICULT_BIRTH: '难产假',
  ASSISTED_DIFFICULT_BIRTH: '难产假（剖腹产、会阴Ⅲ度破裂）',
  MULTIPLE_BIRTH: '多胞胎',
  REWARD: '晚育假/生育假/奖励假',
  REWARD_SECOND_THIRD_CHILD: '晚育假/生育假/奖励假-二孩、三孩',
  MISCARRIAGE: '流产假'
};

const LEGACY_REWARD_LABELS = ['奖励假'];
const LEGACY_DIFFICULT_LABELS = [
  '难产假（剖腹产、会阴Ⅲ度破裂）'
];

const normalizeMaternityRuleEntry = (rule) => {
  if (!rule || typeof rule !== 'object') return rule;
  const normalized = { ...rule };
  
  // 去除产假类型的首尾空格
  if (typeof normalized.leaveType === 'string') {
    normalized.leaveType = normalized.leaveType.trim();
  }
  
  if (LEGACY_REWARD_LABELS.includes(normalized.leaveType)) {
    normalized.leaveType = MATERNITY_LEAVE_TYPES.REWARD;
  }
  if (LEGACY_DIFFICULT_LABELS.includes(normalized.leaveType)) {
    normalized.leaveType = MATERNITY_LEAVE_TYPES.ASSISTED_DIFFICULT_BIRTH;
  }
  if (normalized.leaveType === MATERNITY_LEAVE_TYPES.MISCARRIAGE) {
    const type = normalized.miscarriageType ?? normalized.miscarriageCategory ?? '';
    if (typeof type === 'string') {
      normalized.miscarriageType = type.trim();
    } else {
      normalized.miscarriageType = '';
    }
  } else {
    normalized.miscarriageType = '';
  }

  if (normalized.hasAllowance === undefined || normalized.hasAllowance === null) {
    normalized.hasAllowance = true;
  } else if (typeof normalized.hasAllowance === 'string') {
    const value = normalized.hasAllowance.trim().toLowerCase();
    normalized.hasAllowance = value === 'true' || value === '是' || value === 'yes' || value === 'y' || value === '1';
  } else {
    normalized.hasAllowance = normalized.hasAllowance === true || normalized.hasAllowance === 1;
  }
  return normalized;
};

const normalizeBooleanFlag = (value, fallback = false) => {
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
};

const normalizeRefundRuleEntry = (rule) => {
  if (!rule || typeof rule !== 'object') return rule;
  const normalized = { ...rule };
  normalized.city = typeof normalized.city === 'string' ? normalized.city.trim() : (normalized.city || '');
  normalized.startMonth = typeof normalized.startMonth === 'string'
    ? normalized.startMonth.trim()
    : (normalized.start_month ? String(normalized.start_month).trim() : '');
  normalized.endMonth = typeof normalized.endMonth === 'string'
    ? normalized.endMonth.trim()
    : (normalized.end_month ? String(normalized.end_month).trim() : '');
  const amountValue = normalized.refundAmount ?? normalized.amount ?? normalized.refund_amount;
  if (amountValue === '' || amountValue === null || amountValue === undefined) {
    normalized.refundAmount = null;
  } else {
    const parsed = Number(amountValue);
    normalized.refundAmount = Number.isFinite(parsed) ? parsed : null;
  }
  normalized.refundDescription = typeof normalized.refundDescription === 'string'
    ? normalized.refundDescription.trim()
    : (normalized.refund_description ? String(normalized.refund_description).trim() : '');
  normalized.directDisplay = normalizeBooleanFlag(normalized.directDisplay ?? normalized.direct_display, false);
  normalized.singleMonthOnly = normalizeBooleanFlag(normalized.singleMonthOnly ?? normalized.single_month_only, false);
  return normalized;
};

// 账户类型枚举
export const ACCOUNT_TYPES = {
  COMPANY: '企业',
  PERSONAL: '个人'
};

// 时间段枚举
export const PREGNANCY_PERIODS = {
  ABOVE_7_MONTHS: '7个月以上',
  BETWEEN_4_7_MONTHS: '4个月以上7个月以下',
  BELOW_4_MONTHS: '4个月以下'
};

// 数据存储管理
export class CityDataManager {
  constructor() {
    // Defer actual async load to explicit calls
    this.maternityRules = [];
    this.allowanceRules = [];
    this.refundRules = [];
    this.employeeData = [];
    this.listeners = new Set();
    this.dataVersion = 0;
  }

  addChangeListener(listener) {
    if (typeof listener !== 'function') {
      return () => {};
    }
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  notifyChange(reason = 'update') {
    this.dataVersion += 1;
    const payload = { version: this.dataVersion, reason };
    this.listeners.forEach((listener) => {
      try {
        listener(payload);
      } catch (err) {
        console.error('数据变更通知回调失败:', err);
      }
    });
  }

  // 优先从 IndexedDB 加载，若无则用默认并写入 IndexedDB
  async loadData(options = {}) {
    const { scope = 'all' } = options;
    const includeMaternity = scope === 'all' || scope === 'maternity';
    const includeAllowance = scope === 'all' || scope === 'allowance';
    const includeRefund = scope === 'all' || scope === 'refund';
    const includeEmployees = scope === 'all' || scope === 'employees';
    try {
      if (getStorageMode() === 'postgres') {
        const results = await Promise.all([
          includeMaternity ? listMaternityRules() : Promise.resolve(this.maternityRules),
          includeAllowance ? listAllowanceRulesApi() : Promise.resolve(this.allowanceRules),
          includeRefund ? listRefundRulesApi() : Promise.resolve(this.refundRules),
          includeEmployees ? listEmployeesApi() : Promise.resolve(this.employeeData)
        ]);
        this.maternityRules = Array.isArray(results[0]) ? results[0] : this.maternityRules;
        this.allowanceRules = Array.isArray(results[1]) ? results[1] : this.allowanceRules;
        this.refundRules = Array.isArray(results[2]) ? results[2] : this.refundRules;
        this.employeeData = Array.isArray(results[3]) ? results[3] : this.employeeData;
      } else {
        const results = await Promise.all([
          includeMaternity ? idbGet('maternityRules') : Promise.resolve(this.maternityRules),
          includeAllowance ? idbGet('allowanceRules') : Promise.resolve(this.allowanceRules),
          includeRefund ? idbGet('refundRules') : Promise.resolve(this.refundRules),
          includeEmployees ? idbGet('employeeData') : Promise.resolve(this.employeeData)
        ]);
        this.maternityRules = Array.isArray(results[0]) ? results[0] : this.maternityRules;
        this.allowanceRules = Array.isArray(results[1]) ? results[1] : this.allowanceRules;
        this.refundRules = Array.isArray(results[2]) ? results[2] : this.refundRules;
        this.employeeData = Array.isArray(results[3]) ? results[3] : this.employeeData;
      }
      if (includeMaternity) {
        this.maternityRules = this.maternityRules.map(rule => {
          const normalized = normalizeMaternityRuleEntry(rule);
          if (LEGACY_REWARD_LABELS.includes(normalized.leaveType)) {
            return { ...normalized, leaveType: MATERNITY_LEAVE_TYPES.REWARD, hasAllowance: normalized.hasAllowance !== false };
          }
          return { ...normalized, hasAllowance: normalized.hasAllowance !== false };
        });
      }
      if (includeRefund) {
        this.refundRules = this.refundRules.map(normalizeRefundRuleEntry);
      }
      this.notifyChange('load');
    } catch (error) {
      console.error('加载IndexedDB失败，保留内存数据，不覆盖数据库:', error);
      // 不要在加载失败时将空数组写回数据库，避免覆盖已导入的数据。
      // 此处仅记录错误并保留当前内存状态；如需清空请使用 resetToDefaults()
    }
  }

  // 保存数据到 IndexedDB
  async saveData() {
    try {
      if (getStorageMode() !== 'postgres') {
        await Promise.all([
          idbSet('maternityRules', this.maternityRules),
          idbSet('allowanceRules', this.allowanceRules),
          idbSet('refundRules', this.refundRules),
          idbSet('employeeData', this.employeeData)
        ]);
      }
      this.notifyChange('save');
    } catch (error) {
      console.error('保存数据失败:', error);
      throw new Error('数据保存失败，请检查浏览器存储空间');
    }
  }

  // 重置为“空数据”（不再回退到配置JSON）
  async resetToDefaults() {
    this.maternityRules = [];
    this.allowanceRules = [];
    this.refundRules = [];
    this.employeeData = [];
    await this.saveData();
    this.notifyChange('reset');
  }

  // 导入：IndexedDB按城市覆盖，Postgres全量覆盖
  async setMaternityRules(rules) {
    const incoming = Array.isArray(rules) ? rules : [];
    const normalizedList = incoming.map(rule => {
      const normalized = normalizeMaternityRuleEntry(rule);
      if (LEGACY_REWARD_LABELS.includes(normalized.leaveType)) {
        return { ...normalized, leaveType: MATERNITY_LEAVE_TYPES.REWARD };
      }
      return normalized;
    });

    if (normalizedList.length === 0) {
      return;
    }

    if (getStorageMode() === 'postgres') {
      await importMaternityRulesApi(normalizedList);
      this.maternityRules = await listMaternityRules();
    } else {
      const cities = Array.from(new Set(normalizedList.map(rule => rule.city).filter(Boolean)));
      const remaining = this.maternityRules.filter(rule => !cities.includes(rule.city));
      this.maternityRules = [...remaining, ...normalizedList];
      await idbSet('maternityRules', this.maternityRules);
      await this.saveData();
    }

    this.notifyChange('maternityRules');
  }
  async setAllowanceRules(rules) {
    const normalized = Array.isArray(rules) ? [...rules] : [];
    if (getStorageMode() === 'postgres') {
      await importAllowanceRulesApi(normalized);
      this.allowanceRules = await listAllowanceRulesApi();
    } else {
      this.allowanceRules = normalized;
      await idbSet('allowanceRules', this.allowanceRules);
      await this.saveData();
    }
    this.notifyChange('allowanceRules');
  }
  async setRefundRules(rules) {
    const normalized = Array.isArray(rules) ? rules.map(normalizeRefundRuleEntry) : [];
    if (getStorageMode() === 'postgres') {
      await importRefundRulesApi(normalized);
      this.refundRules = await listRefundRulesApi();
    } else {
      this.refundRules = normalized;
      await idbSet('refundRules', this.refundRules);
      await this.saveData();
    }
    this.notifyChange('refundRules');
  }

  // 添加返还规则
  async addRefundRule(rule) {
    const normalized = normalizeRefundRuleEntry(rule);
    if (getStorageMode() === 'postgres') {
      await createRefundRuleApi(normalized);
      this.refundRules = await listRefundRulesApi();
    } else {
      this.refundRules.push(normalized);
      await idbSet('refundRules', this.refundRules);
      await this.saveData();
    }
    this.notifyChange('refundRules');
  }

  // 便捷：获取全部（用于完整导出）
  getAllMaternityRules() { return this.maternityRules; }
  getAllAllowanceRules() { return this.allowanceRules; }
  getAllRefundRules() { return this.refundRules; }
  getAllEmployeeData() { return this.employeeData; }

  // 便捷：根据城市插入或更新津贴规则
  async upsertAllowanceRuleByCity(rule) {
    const idx = this.allowanceRules.findIndex(r => r.city === rule.city);
    if (idx >= 0) this.allowanceRules[idx] = rule; else this.allowanceRules.push(rule);
    await this.saveData();
    this.notifyChange('allowanceRules');
  }

  // 重置津贴规则为默认
  async resetAllowanceRulesToDefaults() {
    // 改为清空，保持“仅IndexedDB来源”的原则
    this.allowanceRules = [];
    await this.saveData();
    this.notifyChange('allowanceRules');
  }

  // 获取所有城市列表
  getCities() {
    const cities = new Set();
    this.maternityRules.forEach(rule => cities.add(rule.city));
    this.allowanceRules.forEach(rule => cities.add(rule.city));
    this.refundRules.forEach(rule => cities.add(rule.city));
    this.employeeData.forEach(emp => cities.add(emp.city));
    return Array.from(cities).sort();
  }

  // 根据城市获取产假规则（包含"通用"规则）
  getMaternityRulesByCity(city) {
    return this.maternityRules.filter(rule => rule.city === city || rule.city === '通用');
  }

  // 根据城市获取津贴规则（优先返回指定城市，其次返回"通用"规则）
  getAllowanceRulesByCity(city) {
    // 优先查找指定城市的规则
    const cityRule = this.allowanceRules.find(rule => rule.city === city);
    if (cityRule) return cityRule;
    // 如果没有找到，返回通用规则
    return this.allowanceRules.find(rule => rule.city === '通用');
  }

  // 根据城市获取返还规则列表（包含"通用"规则）
  getRefundRulesByCity(city) {
    return this.refundRules.filter(rule => rule.city === city || rule.city === '通用');
  }

  // 根据城市获取员工数据
  getEmployeesByCity(city) {
    return this.employeeData.filter(emp => emp.city === city);
  }

  // 获取所有员工数据
  getAllEmployees() {
    return this.employeeData;
  }

  // 添加产假规则
  async addMaternityRule(rule) {
    const normalizedBase = normalizeMaternityRuleEntry(rule);
    const normalized = LEGACY_REWARD_LABELS.includes(normalizedBase.leaveType)
      ? { ...normalizedBase, leaveType: MATERNITY_LEAVE_TYPES.REWARD }
      : normalizedBase;
    if (getStorageMode() === 'postgres') {
      await createMaternityRuleApi(normalized);
      this.maternityRules = await listMaternityRules();
    } else {
      this.maternityRules.push(normalized);
      await idbSet('maternityRules', this.maternityRules);
    }
    this.notifyChange('maternityRules');
  }

  // 更新产假规则
  async updateMaternityRule(index, rule) {
    if (index >= 0 && index < this.maternityRules.length) {
      const normalizedBase = normalizeMaternityRuleEntry(rule);
      const updatedEntry = LEGACY_REWARD_LABELS.includes(normalizedBase.leaveType)
        ? { ...normalizedBase, leaveType: MATERNITY_LEAVE_TYPES.REWARD }
        : normalizedBase;
      if (getStorageMode() === 'postgres') {
        const target = this.maternityRules[index];
        if (target?.id !== undefined) {
          await updateMaternityRuleApi(target.id, updatedEntry);
        }
        this.maternityRules = await listMaternityRules();
      } else {
        this.maternityRules[index] = updatedEntry;
        await idbSet('maternityRules', this.maternityRules);
      }
      this.notifyChange('maternityRules');
    }
  }

  // 删除产假规则
  async deleteMaternityRule(index) {
    if (index >= 0 && index < this.maternityRules.length) {
      if (getStorageMode() === 'postgres') {
        const target = this.maternityRules[index];
        if (target?.id !== undefined) {
          await deleteMaternityRuleApi(target.id);
        }
        this.maternityRules = await listMaternityRules();
      } else {
        this.maternityRules.splice(index, 1);
        await idbSet('maternityRules', this.maternityRules);
      }
      this.notifyChange('maternityRules');
    }
  }

  // 添加津贴规则
  async addAllowanceRule(rule) {
    if (getStorageMode() === 'postgres') {
      await createAllowanceRuleApi(rule);
      this.allowanceRules = await listAllowanceRulesApi();
    } else {
      this.allowanceRules.push(rule);
      await idbSet('allowanceRules', this.allowanceRules);
      await this.saveData();
    }
    this.notifyChange('allowanceRules');
  }

  // 更新津贴规则
  async updateAllowanceRule(index, rule) {
    if (index >= 0 && index < this.allowanceRules.length) {
      if (getStorageMode() === 'postgres') {
        const target = this.allowanceRules[index];
        const id = target?.id;
        if (id !== undefined) {
          await updateAllowanceRuleApi(id, rule);
        }
        this.allowanceRules = await listAllowanceRulesApi();
      } else {
        this.allowanceRules[index] = rule;
        await idbSet('allowanceRules', this.allowanceRules);
        await this.saveData();
      }
      this.notifyChange('allowanceRules');
    }
  }

  // 更新返还规则
  async updateRefundRule(index, rule) {
    if (index >= 0 && index < this.refundRules.length) {
      const normalized = normalizeRefundRuleEntry(rule);
      if (getStorageMode() === 'postgres') {
        const target = this.refundRules[index];
        const id = target?.id;
        if (id !== undefined) {
          await updateRefundRuleApi(id, normalized);
        }
        this.refundRules = await listRefundRulesApi();
      } else {
        this.refundRules[index] = normalized;
        await idbSet('refundRules', this.refundRules);
        await this.saveData();
      }
      this.notifyChange('refundRules');
    }
  }

  // 删除返还规则
  async deleteRefundRule(index) {
    if (index >= 0 && index < this.refundRules.length) {
      if (getStorageMode() === 'postgres') {
        const target = this.refundRules[index];
        const id = target?.id;
        if (id !== undefined) {
          await deleteRefundRuleApi(id);
        }
        this.refundRules = await listRefundRulesApi();
      } else {
        this.refundRules.splice(index, 1);
        await idbSet('refundRules', this.refundRules);
        await this.saveData();
      }
      this.notifyChange('refundRules');
    }
  }

  // 添加员工数据
  async addEmployee(employee) {
    if (getStorageMode() === 'postgres') {
      await createEmployeeApi(employee);
      this.employeeData = await listEmployeesApi();
    } else {
      this.employeeData.push(employee);
      await idbSet('employeeData', this.employeeData);
      await this.saveData();
    }
    this.notifyChange('employees');
  }

  // 更新员工数据
  async updateEmployee(index, employee) {
    if (index >= 0 && index < this.employeeData.length) {
      if (getStorageMode() === 'postgres') {
        const target = this.employeeData[index];
        const id = target?.id;
        if (id !== undefined) {
          await updateEmployeeApi(id, employee);
        }
        this.employeeData = await listEmployeesApi();
      } else {
        this.employeeData[index] = employee;
        await idbSet('employeeData', this.employeeData);
        await this.saveData();
      }
      this.notifyChange('employees');
    }
  }

  // 删除员工数据
  async deleteEmployee(index) {
    if (index >= 0 && index < this.employeeData.length) {
      if (getStorageMode() === 'postgres') {
        const target = this.employeeData[index];
        const id = target?.id;
        if (id !== undefined) {
          await deleteEmployeeApi(id);
        }
        this.employeeData = await listEmployeesApi();
      } else {
        this.employeeData.splice(index, 1);
        await idbSet('employeeData', this.employeeData);
        await this.saveData();
      }
      this.notifyChange('employees');
    }
  }

  // 批量导入员工数据（支持 upsert：有则更新，无则插入）
  async setEmployeeData(employees) {
    const incoming = Array.isArray(employees) ? employees : [];
    if (incoming.length === 0) {
      return;
    }

    if (getStorageMode() === 'postgres') {
      // PostgreSQL 模式：调用批量导入 API（后端处理 upsert）
      await importEmployeesApi(incoming);
      this.employeeData = await listEmployeesApi();
    } else {
      // IndexedDB 模式：手动实现 upsert 逻辑
      incoming.forEach(newEmp => {
        // 根据 employeeId 查找是否已存在
        const existingIndex = this.employeeData.findIndex(
          emp => emp.employeeId === newEmp.employeeId
        );
        
        if (existingIndex >= 0) {
          // 存在则更新
          this.employeeData[existingIndex] = { ...this.employeeData[existingIndex], ...newEmp };
        } else {
          // 不存在则插入
          this.employeeData.push(newEmp);
        }
      });
      
      await idbSet('employeeData', this.employeeData);
      await this.saveData();
    }
    
    this.notifyChange('employees');
  }
}

// 数据验证函数
export const validateMaternityRule = (rule) => {
  const errors = [];
  if (!rule || typeof rule !== 'object') {
    return ['数据无效'];
  }

  const normalized = normalizeMaternityRuleEntry(rule);
  Object.assign(rule, normalized);
  
  if (!normalized.city || normalized.city.trim() === '') {
    errors.push('城市名称不能为空');
  }
  
  if (!normalized.leaveType || !Object.values(MATERNITY_LEAVE_TYPES).includes(normalized.leaveType)) {
    if (!LEGACY_REWARD_LABELS.includes(normalized.leaveType) && !LEGACY_DIFFICULT_LABELS.includes(normalized.leaveType)) {
      errors.push(`产假类型无效: "${normalized.leaveType || '空'}"`);
    }
  }

  if (normalized.leaveType === MATERNITY_LEAVE_TYPES.MISCARRIAGE) {
    if (!normalized.miscarriageType || normalized.miscarriageType.trim() === '') {
      errors.push('流产类型不能为空');
    }
  }

  if (LEGACY_REWARD_LABELS.includes(normalized.leaveType)) {
    rule.leaveType = MATERNITY_LEAVE_TYPES.REWARD;
  }
  
  if (!normalized.days || normalized.days <= 0 || !Number.isInteger(Number(normalized.days))) {
    errors.push('产假天数必须为正整数');
  }
  
  if (typeof normalized.isExtendable !== 'boolean') {
    errors.push('是否遇法定节假日顺延标记必须为布尔值');
  }
  
  return errors;
};

export const validateRefundRule = (rule) => {
  const errors = [];
  if (!rule || typeof rule !== 'object') {
    return ['数据无效'];
  }

  if (rule.city && typeof rule.city !== 'string') {
    errors.push('城市名称必须为文本');
  }

  const start = rule.startMonth || '';
  const end = rule.endMonth || '';
  const monthPattern = /^\d{4}-(0[1-9]|1[0-2])$/;
  if (start && !monthPattern.test(start)) {
    errors.push('开始月份必须为 YYYY-MM 格式');
  }
  if (end && !monthPattern.test(end)) {
    errors.push('结束月份必须为 YYYY-MM 格式');
  }

  if (start && end && monthPattern.test(start) && monthPattern.test(end)) {
    if (start > end) {
      errors.push('开始月份不能晚于结束月份');
    }
  }

  if (rule.refundAmount !== null && rule.refundAmount !== undefined && rule.refundAmount !== '') {
    const amount = Number(rule.refundAmount);
    if (!Number.isFinite(amount)) {
      errors.push('返还金额必须为数字');
    }
  }

  if (rule.refundDescription && typeof rule.refundDescription !== 'string') {
    errors.push('返还说明必须为文本');
  }

  return errors;
};

export const validateAllowanceRule = (rule) => {
  const errors = [];
  
  if (!rule.city || rule.city.trim() === '') {
    errors.push('城市名称不能为空');
  }
  
  if (!rule.socialAverageWage || rule.socialAverageWage <= 0) {
    errors.push('社平工资必须为正数');
  }
  
  if (!rule.companyAverageWage || rule.companyAverageWage <= 0) {
    errors.push('公司平均工资必须为正数');
  }
  
  const calcBase = rule.calculationBase || '平均工资';
  if (!['平均工资', '平均缴费工资'].includes(calcBase)) {
    errors.push('津贴基数类型无效');
  }
  
  if (!rule.accountType || !Object.values(ACCOUNT_TYPES).includes(rule.accountType)) {
    errors.push('账户类型无效');
  }
  if (rule.maternityPolicy && typeof rule.maternityPolicy !== 'string') {
    errors.push('产假政策字段必须为文本');
  }
  if (rule.allowancePolicy && typeof rule.allowancePolicy !== 'string') {
    errors.push('津贴政策字段必须为文本');
  }
  if (typeof rule.maternityPolicy === 'string') {
    rule.maternityPolicy = rule.maternityPolicy.trim();
  }
  if (typeof rule.allowancePolicy === 'string') {
    rule.allowancePolicy = rule.allowancePolicy.trim();
  }
  
  return errors;
};

export const validateEmployee = (employee) => {
  const errors = [];
  
  if (!employee.employeeId || employee.employeeId.trim() === '') {
    errors.push('编号不能为空');
  }
  
  if (!employee.employeeName || employee.employeeName.trim() === '') {
    errors.push('员工姓名不能为空');
  }
  
  if (!employee.city || employee.city.trim() === '') {
    errors.push('城市不能为空');
  }
  
  // 注意：personalSSMonthly, basicSalary, socialSecurityBase 允许为0或空值
  // 不进行正数验证
  
  return errors;
};

// Excel导入导出功能
export const generateMaternityRulesTemplate = () => {
  const rows = (cityDataManager.getAllMaternityRules() || []).map(r => ({
    '城市': r.city,
    '产假类型': r.leaveType,
    '流产类型': r.leaveType === MATERNITY_LEAVE_TYPES.MISCARRIAGE ? (r.miscarriageType || '') : '',
    '产假天数': r.days,
    '是否遇法定节假日顺延': r.isExtendable ? '是' : '否',
    '是否享受津贴': r.hasAllowance === false ? '否' : '是'
  }));
  const template = rows.length > 0 ? rows : [
    {
      '城市': '北京',
      '产假类型': MATERNITY_LEAVE_TYPES.LEGAL,
      '流产类型': '',
      '产假天数': 98,
      '是否遇法定节假日顺延': '是',
      '是否享受津贴': '是'
    },
    {
      '城市': '北京',
      '产假类型': MATERNITY_LEAVE_TYPES.MISCARRIAGE,
      '流产类型': '未满4个月',
      '产假天数': 15,
      '是否遇法定节假日顺延': '否',
      '是否享受津贴': '是'
    }
  ];

  const ws = XLSX.utils.json_to_sheet(template);
  ws['!cols'] = [
    { wch: 12 },
    { wch: 18 },
    { wch: 18 },
    { wch: 10 },
    { wch: 16 },
    { wch: 16 }
  ];

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, '产假规则模板');

  const instructions = [
    { '字段名': '城市', '说明': '城市名称，如：北京、上海、深圳', '是否必填': '是' },
    { '字段名': '产假类型', '说明': '法定产假/难产假/多胞胎/晚育假/生育假/奖励假/流产假', '是否必填': '是' },
    { '字段名': '流产类型', '说明': '仅当产假类型为流产假时必填，如：早期流产、中期流产等', '是否必填': '条件必填' },
    { '字段名': '产假天数', '说明': '产假天数，必须为正整数', '是否必填': '是' },
    { '字段名': '是否遇法定节假日顺延', '说明': '是/否', '是否必填': '是' },
    { '字段名': '是否享受津贴', '说明': '是/否，若该规则享受津贴请选择“是”', '是否必填': '是' }
  ];

  const instructionWs = XLSX.utils.json_to_sheet(instructions);
  instructionWs['!cols'] = [
    { wch: 16 },
    { wch: 45 },
    { wch: 10 }
  ];
  XLSX.utils.book_append_sheet(wb, instructionWs, '填写说明');

  const excelBuffer = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
  const data = new Blob([excelBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  saveAs(data, '产假规则模板.xlsx');
};

export const generateAllowanceRulesTemplate = () => {
  const rows = (cityDataManager.getAllAllowanceRules() || []).map(r => ({
    '城市': r.city,
    '社平工资': r.socialAverageWage,
    '津贴计算基数': r.companyAverageWage,
    '津贴基数类型': r.calculationBase || '平均工资',
    '津贴发放方式': r.accountType,
    '产假政策': r.maternityPolicy || '',
    '津贴政策': r.allowancePolicy || ''
  }));
  const template = rows.length > 0 ? rows : [
    {
      '城市': '北京',
      '社平工资': 11518,
      '津贴计算基数': 12000,
      '津贴基数类型': '平均工资',
      '津贴发放方式': ACCOUNT_TYPES.COMPANY,
      '产假政策': '示例：按照当地法规享受98天法定产假，如遇双胞胎增加15天',
      '津贴政策': '示例：津贴按社平工资计算，发放至企业账户'
    }
  ];
  
  const ws = XLSX.utils.json_to_sheet(template);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, '津贴规则模板');
  
  // 添加说明工作表
  const instructions = [
    { '字段名': '城市', '说明': '城市名称，如：北京、上海、深圳', '是否必填': '是' },
    { '字段名': '社平工资', '说明': '社会平均工资，单位：元', '是否必填': '是' },
    { '字段名': '津贴计算基数', '说明': '津贴计算基数（通常为公司平均工资），单位：元', '是否必填': '是' },
    { '字段名': '津贴基数类型', '说明': '可选值：平均工资 或 平均缴费工资', '是否必填': '是' },
    { '字段名': '津贴发放方式', '说明': '企业/个人，对应系统展示的发放方式', '是否必填': '是' },
    { '字段名': '产假政策', '说明': '可填写该城市适用的产假政策概要', '是否必填': '否' },
    { '字段名': '津贴政策', '说明': '可填写津贴发放政策说明', '是否必填': '否' }
  ];
  
  const instructionWs = XLSX.utils.json_to_sheet(instructions);
  XLSX.utils.book_append_sheet(wb, instructionWs, '填写说明');
  
  const excelBuffer = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
  const data = new Blob([excelBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  saveAs(data, '津贴规则模板.xlsx');
};

export const generateRefundRulesTemplate = () => {
  const rows = (cityDataManager.getAllRefundRules() || []).map(r => ({
    '城市': r.city,
    '开始月份': r.startMonth,
    '结束月份': r.endMonth,
    '返还说明': r.refundDescription || '',
    '返还金额': r.refundAmount ?? '',
    '直接显示': r.directDisplay ? '是' : '否',
    '仅单月有效': r.singleMonthOnly ? '是' : '否'
  }));
  const template = rows.length > 0 ? rows : [
    {
      '城市': '上海',
      '开始月份': '2020-01',
      '结束月份': '2025-12',
      '返还说明': '示例：月弹性福利自费',
      '返还金额': '0',
      '直接显示': '是',
      '仅单月有效': '否'
    }
  ];

  const ws = XLSX.utils.json_to_sheet(template);
  ws['!cols'] = [
    { wch: 12 },
    { wch: 10 },
    { wch: 10 },
    { wch: 24 },
    { wch: 12 },
    { wch: 10 },
    { wch: 10 }
  ];

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, '返还规则模板');

  const instructions = [
    { '字段名': '城市', '说明': '城市名称，如：北京、上海、深圳', '是否必填': '是' },
    { '字段名': '开始月份', '说明': '格式 YYYY-MM，返还规则生效开始月份', '是否必填': '是' },
    { '字段名': '结束月份', '说明': '格式 YYYY-MM，返还规则生效结束月份', '是否必填': '是' },
    { '字段名': '返还说明', '说明': '对返还内容的说明，可为空', '是否必填': '否' },
    { '字段名': '返还金额', '说明': '允许填写负数或留空，留空表示仅展示说明', '是否必填': '否' },
    { '字段名': '直接显示', '说明': '填“是/否”或 true/false，决定是否直接在界面展示', '是否必填': '否' },
    { '字段名': '仅单月有效', '说明': '填“是/否”或 true/false，表示是否仅在单个月份有效', '是否必填': '否' }
  ];

  const instructionWs = XLSX.utils.json_to_sheet(instructions);
  instructionWs['!cols'] = [
    { wch: 16 },
    { wch: 50 },
    { wch: 10 }
  ];
  XLSX.utils.book_append_sheet(wb, instructionWs, '填写说明');

  const excelBuffer = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
  const data = new Blob([excelBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  saveAs(data, '返还规则模板.xlsx');
};

export const generateEmployeeTemplate = () => {
  const rows = (cityDataManager.getAllEmployees() || []).map(emp => ({
    '编号': emp.employeeId,
    '员工姓名': emp.employeeName,
    '产前12月平均工资': emp.basicSalary || 0,
    '基本工资': emp.socialSecurityBase || 0,
    '个人部分社保公积金合计': emp.personalSSMonthly || 0,
    '城市': emp.city
  }));
  const template = rows.length > 0 ? rows : [
    {
      '编号': 'EMP001',
      '员工姓名': '张三',
      '产前12月平均工资': 0,
      '基本工资': 0,
      '个人部分社保公积金合计': 0,
      '城市': '北京'
    }
  ];
  
  const ws = XLSX.utils.json_to_sheet(template);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, '员工信息模板');
  
  // 添加说明工作表
  const instructions = [
    { '字段名': '编号', '说明': '员工唯一标识', '是否必填': '是' },
    { '字段名': '员工姓名', '说明': '员工真实姓名', '是否必填': '是' },
    { '字段名': '产前12月平均工资', '说明': '产前12个月平均工资，单位：元，默认为0', '是否必填': '否' },
    { '字段名': '基本工资', '说明': '基本工资，单位：元，默认为0', '是否必填': '否' },
    { '字段名': '个人部分社保公积金合计', '说明': '月度个人部分社保公积金合计，单位：元，默认为0', '是否必填': '否' },
    { '字段名': '城市', '说明': '员工所在城市', '是否必填': '是' }
  ];
  
  const instructionWs = XLSX.utils.json_to_sheet(instructions);
  XLSX.utils.book_append_sheet(wb, instructionWs, '填写说明');
  
  const excelBuffer = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
  const data = new Blob([excelBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  saveAs(data, '员工信息模板.xlsx');
};

// 解析Excel文件
export const parseExcelFile = (file, type) => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target.result);
        const workbook = XLSX.read(data, { type: 'array' });
        const firstSheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[firstSheetName];
        const jsonData = XLSX.utils.sheet_to_json(worksheet);
        
        let parsedData = [];
        let errors = [];
        
        jsonData.forEach((row, index) => {
          try {
            let parsedRow;
            
            if (type === 'maternity') {
              const rawExtendValue = row['是否遇法定节假日顺延'];
              let normalizedExtend = rawExtendValue;

              if (typeof rawExtendValue === 'string') {
                normalizedExtend = rawExtendValue.trim().toLowerCase();
              }

              const isExtendable =
                normalizedExtend === true ||
                normalizedExtend === 'true' ||
                normalizedExtend === '是' ||
                normalizedExtend === 'yes' ||
                normalizedExtend === 'y' ||
                normalizedExtend === '1' ||
                normalizedExtend === 1;

              const rawAllowanceValue = row['是否享受津贴'];
              let normalizedAllowance = rawAllowanceValue;

              if (typeof rawAllowanceValue === 'string') {
                normalizedAllowance = rawAllowanceValue.trim().toLowerCase();
              }

              const hasAllowance =
                normalizedAllowance === undefined ||
                normalizedAllowance === null ||
                normalizedAllowance === '' ||
                normalizedAllowance === true ||
                normalizedAllowance === 'true' ||
                normalizedAllowance === '是' ||
                normalizedAllowance === 'yes' ||
                normalizedAllowance === 'y' ||
                normalizedAllowance === '1' ||
                normalizedAllowance === 1;

              parsedRow = {
                city: row['城市'] || '',
                leaveType: row['产假类型'] || '',
                miscarriageType: row['流产类型'] || row['流产假类型'] || '',
                days: parseInt(row['产假天数']) || 0,
                isExtendable,
                hasAllowance
              };
              
              const validationErrors = validateMaternityRule(parsedRow);
              if (validationErrors.length > 0) {
                errors.push({ row: index + 1, errors: validationErrors });
              } else {
                parsedData.push(parsedRow);
              }
            } else if (type === 'allowance') {
              parsedRow = {
                city: row['城市'] || '',
                socialAverageWage: parseFloat(row['社平工资']) || 0,
                companyAverageWage: parseFloat(row['津贴计算基数'] ?? row['公司平均工资']) || 0,
                calculationBase: (() => {
                  const base = (row['津贴基数类型'] || '').trim();
                  return ['平均工资', '平均缴费工资'].includes(base) ? base : '平均工资';
                })(),
                accountType: row['津贴发放方式'] || row['账户类型'] || '',
                maternityPolicy: (row['产假政策'] || '').trim(),
                allowancePolicy: (row['津贴政策'] || '').trim()
              };
              
              const validationErrors = validateAllowanceRule(parsedRow);
              if (validationErrors.length > 0) {
                errors.push({ row: index + 1, errors: validationErrors });
              } else {
                parsedData.push(parsedRow);
              }
            } else if (type === 'refund') {
              const normalizeBoolean = (value) => {
                if (typeof value === 'boolean') {
                  return value;
                }
                if (typeof value === 'string') {
                  const normalized = value.trim().toLowerCase();
                  if (['true', '1', 'y', 'yes', '是'].includes(normalized)) return true;
                  if (['false', '0', 'n', 'no', '否'].includes(normalized)) return false;
                }
                if (value === 1) return true;
                if (value === 0) return false;
                return false;
              };

              const rawAmount = row['返还金额'];
              const amount = rawAmount === '' || rawAmount === null || rawAmount === undefined
                ? null
                : Number(rawAmount);

              parsedRow = {
                city: (row['城市'] || '').trim(),
                startMonth: (row['开始月份'] || '').trim(),
                endMonth: (row['结束月份'] || '').trim(),
                refundDescription: (row['返还说明'] || '').trim(),
                refundAmount: Number.isFinite(amount) ? amount : null,
                directDisplay: normalizeBoolean(row['直接显示']),
                singleMonthOnly: normalizeBoolean(row['仅单月有效'])
              };

              const validationErrors = validateRefundRule(parsedRow);
              if (validationErrors.length > 0) {
                errors.push({ row: index + 1, errors: validationErrors });
              } else {
                parsedData.push(parsedRow);
              }
            } else if (type === 'employee') {
              parsedRow = {
                employeeId: (row['编号'] || '').toString().trim(),
                employeeName: (row['员工姓名'] || '').toString().trim(),
                basicSalary: parseFloat(row['产前12月平均工资']) || 0,
                socialSecurityBase: parseFloat(row['基本工资']) || 0,
                personalSSMonthly: parseFloat(row['个人部分社保公积金合计']) || 0,
                city: (row['城市'] || '').toString().trim()
              };
              
              const validationErrors = validateEmployee(parsedRow);
              if (validationErrors.length > 0) {
                errors.push({ row: index + 1, errors: validationErrors });
              } else {
                parsedData.push(parsedRow);
              }
            }
          } catch (error) {
            errors.push({ row: index + 1, errors: [`数据解析错误: ${error.message}`] });
          }
        });
        
        resolve({ data: parsedData, errors });
      } catch (error) {
        reject(new Error(`文件解析失败: ${error.message}`));
      }
    };
    
    reader.onerror = () => {
      reject(new Error('文件读取失败'));
    };
    
    reader.readAsArrayBuffer(file);
  });
};

// 导出数据到Excel
export const exportDataToExcel = (data, type, filename) => {
  let exportData = [];
  
  if (type === 'maternity') {
    exportData = data.map(rule => ({
      '城市': rule.city,
      '产假类型': rule.leaveType,
      '流产类型': rule.leaveType === MATERNITY_LEAVE_TYPES.MISCARRIAGE ? (rule.miscarriageType || '') : '',
      '产假天数': rule.days,
      '是否遇法定节假日顺延': rule.isExtendable ? '是' : '否',
      '是否享受津贴': rule.hasAllowance === false ? '否' : '是'
    }));
  } else if (type === 'allowance') {
    exportData = data.map(rule => ({
      '城市': rule.city,
      '社平工资': rule.socialAverageWage,
      '津贴计算基数': rule.companyAverageWage,
      '津贴基数类型': rule.calculationBase || '平均工资',
      '津贴发放方式': rule.accountType,
      '产假政策': rule.maternityPolicy || '',
      '津贴政策': rule.allowancePolicy || ''
    }));
  } else if (type === 'employee') {
    exportData = data.map(emp => ({
      '编号': emp.employeeId,
      '员工姓名': emp.employeeName,
      '产前12月平均工资': emp.basicSalary || 0,
      '基本工资': emp.socialSecurityBase || 0,
      '个人部分社保公积金合计': emp.personalSSMonthly || 0,
      '城市': emp.city
    }));
  } else if (type === 'refund') {
    exportData = data.map(rule => ({
      '城市': rule.city,
      '开始月份': rule.startMonth,
      '结束月份': rule.endMonth,
      '返还说明': rule.refundDescription || '',
      '返还金额': rule.refundAmount ?? '',
      '直接显示': rule.directDisplay ? '是' : '否',
      '仅单月有效': rule.singleMonthOnly ? '是' : '否'
    }));
  }
  
  const ws = XLSX.utils.json_to_sheet(exportData);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Sheet1');
  
  const excelBuffer = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
  const fileData = new Blob([excelBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  saveAs(fileData, filename);
};

// 创建全局数据管理器实例
export const cityDataManager = new CityDataManager();

// 对外导出便捷函数（可在组件中直接调用）
export const upsertAllowanceRule = (rule) => cityDataManager.upsertAllowanceRuleByCity(rule);
export const setAllowanceRules = (rules) => cityDataManager.setAllowanceRules(rules);
export const getAllAllowanceRules = () => cityDataManager.getAllAllowanceRules();
export const resetAllowanceRulesToDefaults = () => cityDataManager.resetAllowanceRulesToDefaults();
export const setRefundRules = (rules) => cityDataManager.setRefundRules(rules);
export const getAllRefundRules = () => cityDataManager.getAllRefundRules();
