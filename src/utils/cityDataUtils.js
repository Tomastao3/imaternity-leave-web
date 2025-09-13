import * as XLSX from 'xlsx';
import { saveAs } from 'file-saver';

// 产假类型枚举
export const MATERNITY_LEAVE_TYPES = {
  LEGAL: '法定产假',
  DIFFICULT_BIRTH: '难产假',
  MULTIPLE_BIRTH: '多胞胎',
  REWARD: '奖励假',
  MISCARRIAGE: '流产假'
};

// 账户类型枚举
export const ACCOUNT_TYPES = {
  COMPANY: '公司',
  PERSONAL: '个人'
};

// 时间段枚举
export const PREGNANCY_PERIODS = {
  ABOVE_7_MONTHS: '7个月以上',
  BETWEEN_4_7_MONTHS: '4个月以上7个月以下',
  BELOW_4_MONTHS: '4个月以下'
};

// 默认产假规则数据
export const DEFAULT_MATERNITY_RULES = [
  {
    city: '北京',
    leaveType: MATERNITY_LEAVE_TYPES.LEGAL,
    days: 98,
    isExtendable: true
  },
  {
    city: '北京',
    leaveType: MATERNITY_LEAVE_TYPES.DIFFICULT_BIRTH,
    days: 15,
    isExtendable: false
  },
  {
    city: '北京',
    leaveType: MATERNITY_LEAVE_TYPES.MULTIPLE_BIRTH,
    days: 15,
    isExtendable: false
  },
  {
    city: '北京',
    leaveType: MATERNITY_LEAVE_TYPES.REWARD,
    days: 30,
    isExtendable: true
  },
  {
    city: '上海',
    leaveType: MATERNITY_LEAVE_TYPES.LEGAL,
    days: 98,
    isExtendable: true
  },
  {
    city: '上海',
    leaveType: MATERNITY_LEAVE_TYPES.DIFFICULT_BIRTH,
    days: 15,
    isExtendable: false
  },
  {
    city: '上海',
    leaveType: MATERNITY_LEAVE_TYPES.REWARD,
    days: 60,
    isExtendable: true
  }
];

// 默认津贴规则数据
export const DEFAULT_ALLOWANCE_RULES = [
  {
    city: '北京',
    socialAverageWage: 11518,
    companyAverageWage: 12000,
    accountType: ACCOUNT_TYPES.COMPANY
  },
  {
    city: '上海',
    socialAverageWage: 12183,
    companyAverageWage: 13000,
    accountType: ACCOUNT_TYPES.PERSONAL
  },
  {
    city: '深圳',
    socialAverageWage: 12964,
    companyAverageWage: 14000,
    accountType: ACCOUNT_TYPES.COMPANY
  }
];

// 默认员工信息数据
export const DEFAULT_EMPLOYEE_DATA = [
  {
    employeeId: 'EMP001',
    employeeName: '张三',
    basicSalary: 15000,
    socialSecurityBase: 15000,
    city: '北京',
    
  },
  {
    employeeId: 'EMP002',
    employeeName: '李四',
    basicSalary: 18000,
    socialSecurityBase: 18000,
    city: '上海',
    
  }
];

// 数据存储管理
export class CityDataManager {
  constructor() {
    this.loadData();
  }

  // 从localStorage加载数据
  loadData() {
    try {
      this.maternityRules = JSON.parse(localStorage.getItem('maternityRules')) || [...DEFAULT_MATERNITY_RULES];
      this.allowanceRules = JSON.parse(localStorage.getItem('allowanceRules')) || [...DEFAULT_ALLOWANCE_RULES];
      this.employeeData = JSON.parse(localStorage.getItem('employeeData')) || [...DEFAULT_EMPLOYEE_DATA];
    } catch (error) {
      console.error('加载数据失败:', error);
      this.resetToDefaults();
    }
  }

  // 保存数据到localStorage
  saveData() {
    try {
      localStorage.setItem('maternityRules', JSON.stringify(this.maternityRules));
      localStorage.setItem('allowanceRules', JSON.stringify(this.allowanceRules));
      localStorage.setItem('employeeData', JSON.stringify(this.employeeData));
    } catch (error) {
      console.error('保存数据失败:', error);
      throw new Error('数据保存失败，请检查浏览器存储空间');
    }
  }

  // 重置为默认数据
  resetToDefaults() {
    this.maternityRules = [...DEFAULT_MATERNITY_RULES];
    this.allowanceRules = [...DEFAULT_ALLOWANCE_RULES];
    this.employeeData = [...DEFAULT_EMPLOYEE_DATA];
    this.saveData();
  }

  // 获取所有城市列表
  getCities() {
    const cities = new Set();
    this.maternityRules.forEach(rule => cities.add(rule.city));
    this.allowanceRules.forEach(rule => cities.add(rule.city));
    this.employeeData.forEach(emp => cities.add(emp.city));
    return Array.from(cities).sort();
  }

  // 根据城市获取产假规则
  getMaternityRulesByCity(city) {
    return this.maternityRules.filter(rule => rule.city === city);
  }

  // 根据城市获取津贴规则
  getAllowanceRulesByCity(city) {
    return this.allowanceRules.find(rule => rule.city === city);
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
  addMaternityRule(rule) {
    this.maternityRules.push(rule);
    this.saveData();
  }

  // 更新产假规则
  updateMaternityRule(index, rule) {
    if (index >= 0 && index < this.maternityRules.length) {
      this.maternityRules[index] = rule;
      this.saveData();
    }
  }

  // 删除产假规则
  deleteMaternityRule(index) {
    if (index >= 0 && index < this.maternityRules.length) {
      this.maternityRules.splice(index, 1);
      this.saveData();
    }
  }

  // 添加津贴规则
  addAllowanceRule(rule) {
    this.allowanceRules.push(rule);
    this.saveData();
  }

  // 更新津贴规则
  updateAllowanceRule(index, rule) {
    if (index >= 0 && index < this.allowanceRules.length) {
      this.allowanceRules[index] = rule;
      this.saveData();
    }
  }

  // 删除津贴规则
  deleteAllowanceRule(index) {
    if (index >= 0 && index < this.allowanceRules.length) {
      this.allowanceRules.splice(index, 1);
      this.saveData();
    }
  }

  // 添加员工数据
  addEmployee(employee) {
    this.employeeData.push(employee);
    this.saveData();
  }

  // 更新员工数据
  updateEmployee(index, employee) {
    if (index >= 0 && index < this.employeeData.length) {
      this.employeeData[index] = employee;
      this.saveData();
    }
  }

  // 删除员工数据
  deleteEmployee(index) {
    if (index >= 0 && index < this.employeeData.length) {
      this.employeeData.splice(index, 1);
      this.saveData();
    }
  }
}

// 数据验证函数
export const validateMaternityRule = (rule) => {
  const errors = [];
  
  if (!rule.city || rule.city.trim() === '') {
    errors.push('城市名称不能为空');
  }
  
  if (!rule.leaveType || !Object.values(MATERNITY_LEAVE_TYPES).includes(rule.leaveType)) {
    errors.push('产假类型无效');
  }
  
  if (!rule.days || rule.days <= 0 || !Number.isInteger(Number(rule.days))) {
    errors.push('产假天数必须为正整数');
  }
  
  if (typeof rule.isExtendable !== 'boolean') {
    errors.push('是否遇法定节假日顺延标记必须为布尔值');
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
  
  if (!rule.accountType || !Object.values(ACCOUNT_TYPES).includes(rule.accountType)) {
    errors.push('账户类型无效');
  }
  
  return errors;
};

export const validateEmployee = (employee) => {
  const errors = [];
  
  if (!employee.employeeId || employee.employeeId.trim() === '') {
    errors.push('工号不能为空');
  }
  
  if (!employee.employeeName || employee.employeeName.trim() === '') {
    errors.push('员工姓名不能为空');
  }
  
  if (!employee.basicSalary || employee.basicSalary <= 0) {
    errors.push('基本工资必须为正数');
  }
  
  if (!employee.socialSecurityBase || employee.socialSecurityBase <= 0) {
    errors.push('社保基数必须为正数');
  }
  
  if (!employee.city || employee.city.trim() === '') {
    errors.push('城市不能为空');
  }
  
  return errors;
};

// Excel导入导出功能
export const generateMaternityRulesTemplate = () => {
  const template = [
    {
      '城市': '北京',
      '产假类型': MATERNITY_LEAVE_TYPES.LEGAL,
      '产假天数': 98,
      '是否遇法定节假日顺延': '是'
    },
    {
      '城市': '上海',
      '产假类型': MATERNITY_LEAVE_TYPES.DIFFICULT_BIRTH,
      '产假天数': 15,
      '是否遇法定节假日顺延': '否'
    }
  ];
  
  const ws = XLSX.utils.json_to_sheet(template);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, '产假规则模板');
  
  // 添加说明工作表
  const instructions = [
    { '字段名': '城市', '说明': '城市名称，如：北京、上海、深圳', '是否必填': '是' },
    { '字段名': '产假类型', '说明': '法定产假/难产假/多胞胎/奖励假/流产假', '是否必填': '是' },
    { '字段名': '产假天数', '说明': '产假天数，必须为正整数', '是否必填': '是' },
    { '字段名': '是否遇法定节假日顺延', '说明': '是/否', '是否必填': '是' }
  ];
  
  const instructionWs = XLSX.utils.json_to_sheet(instructions);
  XLSX.utils.book_append_sheet(wb, instructionWs, '填写说明');
  
  const excelBuffer = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
  const data = new Blob([excelBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  saveAs(data, '产假规则模板.xlsx');
};

export const generateAllowanceRulesTemplate = () => {
  const template = [
    {
      '城市': '北京',
      '社平工资': 11518,
      '公司平均工资': 12000,
      '账户类型': ACCOUNT_TYPES.COMPANY
    },
    {
      '城市': '上海',
      '社平工资': 12183,
      '公司平均工资': 13000,
      '账户类型': ACCOUNT_TYPES.COMPANY
    }
  ];
  
  const ws = XLSX.utils.json_to_sheet(template);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, '津贴规则模板');
  
  // 添加说明工作表
  const instructions = [
    { '字段名': '城市', '说明': '城市名称，如：北京、上海、深圳', '是否必填': '是' },
    { '字段名': '社平工资', '说明': '社会平均工资，单位：元', '是否必填': '是' },
    { '字段名': '公司平均工资', '说明': '公司平均工资，单位：元', '是否必填': '是' },
    { '字段名': '账户类型', '说明': '公司/个人', '是否必填': '是' }
  ];
  
  const instructionWs = XLSX.utils.json_to_sheet(instructions);
  XLSX.utils.book_append_sheet(wb, instructionWs, '填写说明');
  
  const excelBuffer = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
  const data = new Blob([excelBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  saveAs(data, '津贴规则模板.xlsx');
};

export const generateEmployeeTemplate = () => {
  const template = [
    {
      '工号': 'EMP001',
      '员工姓名': '张三',
      '基本工资': 15000,
      '社保基数': 15000,
      '城市': '北京'
    },
    {
      '工号': 'EMP002',
      '员工姓名': '李四',
      '基本工资': 18000,
      '社保基数': 18000,
      '城市': '上海'
    }
  ];
  
  const ws = XLSX.utils.json_to_sheet(template);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, '员工信息模板');
  
  // 添加说明工作表
  const instructions = [
    { '字段名': '工号', '说明': '员工唯一标识', '是否必填': '是' },
    { '字段名': '员工姓名', '说明': '员工真实姓名', '是否必填': '是' },
    { '字段名': '基本工资', '说明': '月基本工资，单位：元', '是否必填': '是' },
    { '字段名': '社保基数', '说明': '社保缴费基数，单位：元', '是否必填': '是' },
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
              parsedRow = {
                city: row['城市'] || '',
                leaveType: row['产假类型'] || '',
                days: parseInt(row['产假天数']) || 0,
                isExtendable: row['是否遇法定节假日顺延'] === '是'
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
                companyAverageWage: parseFloat(row['公司平均工资']) || 0,
                accountType: row['账户类型'] || ''
              };
              
              const validationErrors = validateAllowanceRule(parsedRow);
              if (validationErrors.length > 0) {
                errors.push({ row: index + 1, errors: validationErrors });
              } else {
                parsedData.push(parsedRow);
              }
            } else if (type === 'employee') {
              parsedRow = {
                employeeId: row['工号'] || '',
                employeeName: row['员工姓名'] || '',
                basicSalary: parseFloat(row['基本工资']) || 0,
                socialSecurityBase: parseFloat(row['社保基数']) || 0,
                city: row['城市'] || ''
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
      '产假天数': rule.days,
      '是否顺延': rule.isExtendable ? '是' : '否',
      '是否包含工作日': rule.includeWorkdays ? '是' : '否'
    }));
  } else if (type === 'allowance') {
    exportData = data.map(rule => ({
      '城市': rule.city,
      '社平工资': rule.socialAverageWage,
      '公司平均工资': rule.companyAverageWage,
      '账户类型': rule.accountType
    }));
  } else if (type === 'employee') {
    exportData = data.map(emp => ({
      '工号': emp.employeeId,
      '员工姓名': emp.employeeName,
      '基本工资': emp.basicSalary,
      '社保基数': emp.socialSecurityBase,
      '城市': emp.city
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
