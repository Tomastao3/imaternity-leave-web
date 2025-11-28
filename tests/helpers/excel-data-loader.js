/**
 * Excel 数据加载器
 * 解析 ConfigData 目录下的 Excel 文件并直接注入到 IndexedDB
 * 避免 UI 上传流程和 UTF-8 编码问题
 */

const fs = require('fs');
const path = require('path');
const XLSX = require('xlsx');

const DB_NAME = 'mlc-db';
const DB_VERSION = 1;
const KV_STORE = 'kv';
const HOLIDAYS_STORE = 'holidays';

/**
 * 从 Excel 文件解析产假规则数据
 * @param {string} filePath - Excel 文件路径
 * @returns {Array} 产假规则数组
 */
function parseMaternityRules(filePath) {
  const workbook = XLSX.readFile(filePath);
  const sheetName = workbook.SheetNames[0];
  const worksheet = workbook.Sheets[sheetName];
  const data = XLSX.utils.sheet_to_json(worksheet);
  
  return data.map(row => ({
    city: String(row['城市'] || '').trim(),
    leaveType: String(row['产假类型'] || '').trim(),
    miscarriageType: String(row['流产类型'] || '').trim(),
    days: parseInt(row['产假天数']) || 0,
    isExtendable: normalizeBooleanValue(row['是否遇法定节假日顺延']),
    hasAllowance: normalizeBooleanValue(row['是否享受津贴'], true)
  }));
}

/**
 * 从 Excel 文件解析津贴规则数据
 * @param {string} filePath - Excel 文件路径
 * @returns {Array} 津贴规则数组
 */
function parseAllowanceRules(filePath) {
  const workbook = XLSX.readFile(filePath);
  const sheetName = workbook.SheetNames[0];
  const worksheet = workbook.Sheets[sheetName];
  const data = XLSX.utils.sheet_to_json(worksheet);
  
  return data.map(row => ({
    city: String(row['城市'] || '').trim(),
    socialAverageWage: parseFloat(row['社平工资']) || 0,
    companyAverageWage: parseFloat(row['津贴计算基数']) || 0,
    calculationBase: String(row['津贴基数类型'] || '平均工资').trim(),
    accountType: String(row['津贴发放方式'] || '').trim(),
    maternityPolicy: String(row['产假政策'] || '').trim(),
    allowancePolicy: String(row['津贴政策'] || '').trim()
  }));
}

/**
 * 从 Excel 文件解析返还规则数据
 * @param {string} filePath - Excel 文件路径
 * @returns {Array} 返还规则数组
 */
function parseRefundRules(filePath) {
  const workbook = XLSX.readFile(filePath);
  const sheetName = workbook.SheetNames[0];
  const worksheet = workbook.Sheets[sheetName];
  const data = XLSX.utils.sheet_to_json(worksheet);
  
  return data.map(row => ({
    city: String(row['城市'] || '').trim(),
    startMonth: String(row['开始月份'] || '').trim(),
    endMonth: String(row['结束月份'] || '').trim(),
    refundDescription: String(row['返还说明'] || '').trim(),
    refundAmount: row['返还金额'] !== undefined && row['返还金额'] !== '' ? parseFloat(row['返还金额']) : null,
    directDisplay: normalizeBooleanValue(row['直接显示'], false),
    singleMonthOnly: normalizeBooleanValue(row['仅单月有效'], false)
  }));
}

/**
 * 从 Excel 文件解析员工信息数据
 * @param {string} filePath - Excel 文件路径
 * @returns {Array} 员工信息数组
 */
function parseEmployeeData(filePath) {
  const workbook = XLSX.readFile(filePath);
  const sheetName = workbook.SheetNames[0];
  const worksheet = workbook.Sheets[sheetName];
  const data = XLSX.utils.sheet_to_json(worksheet);
  
  return data.map(row => ({
    employeeId: String(row['编号'] || row['员工编号'] || '').trim(),
    employeeName: String(row['员工姓名'] || row['姓名'] || '').trim(),
    city: String(row['城市'] || '').trim(),
    personalSSMonthly: parseFloat(row['个人社保月缴纳额']) || 0,
    basicSalary: parseFloat(row['基本工资']) || 0,
    socialSecurityBase: parseFloat(row['社保缴纳基数']) || 0,
    isHR: normalizeBooleanValue(row['是否HR'], false)
  }));
}

/**
 * 从 Excel 文件解析节假日数据
 * @param {string} filePath - Excel 文件路径
 * @returns {Object} 按年份分组的节假日数据 { year: [...holidays] }
 */
function parseHolidayData(filePath) {
  const workbook = XLSX.readFile(filePath);
  const holidaysByYear = {};
  
  // 遍历所有工作表（每个表可能代表一个年份）
  workbook.SheetNames.forEach(sheetName => {
    const worksheet = workbook.Sheets[sheetName];
    const data = XLSX.utils.sheet_to_json(worksheet);
    
    // 尝试从表名或数据中提取年份
    let year = null;
    const yearMatch = sheetName.match(/(\d{4})/);
    if (yearMatch) {
      year = parseInt(yearMatch[1]);
    }
    
    // 如果从表名无法获取年份，尝试从数据中获取
    if (!year && data.length > 0) {
      const firstDate = data[0]['日期'] || data[0]['date'] || '';
      const dateMatch = String(firstDate).match(/(\d{4})/);
      if (dateMatch) {
        year = parseInt(dateMatch[1]);
      }
    }
    
    if (year) {
      const holidays = data.map(row => {
        const dateStr = String(row['日期'] || row['date'] || '').trim();
        return {
          date: dateStr,
          name: String(row['节假日名称'] || row['name'] || row['名称'] || '').trim(),
          isWorkday: normalizeBooleanValue(row['是否工作日'] || row['isWorkday'], false)
        };
      }).filter(h => h.date);
      
      holidaysByYear[year] = holidays;
    }
  });
  
  return holidaysByYear;
}

/**
 * 规范化布尔值
 * @param {*} value - 输入值
 * @param {boolean} defaultValue - 默认值
 * @returns {boolean}
 */
function normalizeBooleanValue(value, defaultValue = false) {
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
  return defaultValue;
}

/**
 * 从 ConfigData 目录加载所有 Excel 数据
 * @param {string} configDataDir - ConfigData 目录路径
 * @returns {Object} 包含所有解析后的数据
 */
function loadAllExcelData(configDataDir) {
  const result = {
    maternityRules: [],
    allowanceRules: [],
    refundRules: [],
    employeeData: [],
    holidays: {}
  };
  
  try {
    // 产假规则
    const maternityFile = path.join(configDataDir, '产假规则.xlsx');
    if (fs.existsSync(maternityFile)) {
      result.maternityRules = parseMaternityRules(maternityFile);
    }
    
    // 津贴规则
    const allowanceFile = path.join(configDataDir, '津贴规则.xlsx');
    if (fs.existsSync(allowanceFile)) {
      result.allowanceRules = parseAllowanceRules(allowanceFile);
    }
    
    // 返还规则
    const refundFile = path.join(configDataDir, '返还规则.xlsx');
    if (fs.existsSync(refundFile)) {
      result.refundRules = parseRefundRules(refundFile);
    }
    
    // 员工信息
    const employeeFile = path.join(configDataDir, '员工信息.xlsx');
    if (fs.existsSync(employeeFile)) {
      result.employeeData = parseEmployeeData(employeeFile);
    }
    
    // 节假日
    const holidayFile = path.join(configDataDir, '节假日_all.xlsx');
    if (fs.existsSync(holidayFile)) {
      result.holidays = parseHolidayData(holidayFile);
    }
  } catch (error) {
    console.error('解析 Excel 文件时出错:', error);
    throw error;
  }
  
  return result;
}

/**
 * 通过 Playwright 页面直接注入数据到 IndexedDB
 * @param {import('@playwright/test').Page} page - Playwright 页面对象
 * @param {Object} data - 要注入的数据
 */
async function injectDataToIndexedDB(page, data) {
  return await page.evaluate(async ({ data, DB_NAME, DB_VERSION, KV_STORE, HOLIDAYS_STORE }) => {
    // 打开 IndexedDB
    const openDB = () => {
      return new Promise((resolve, reject) => {
        const req = indexedDB.open(DB_NAME, DB_VERSION);
        req.onupgradeneeded = (e) => {
          const db = req.result;
          if (!db.objectStoreNames.contains(KV_STORE)) {
            db.createObjectStore(KV_STORE, { keyPath: 'key' });
          }
          if (!db.objectStoreNames.contains(HOLIDAYS_STORE)) {
            db.createObjectStore(HOLIDAYS_STORE, { keyPath: 'year' });
          }
        };
        req.onsuccess = () => resolve(req.result);
        req.onerror = () => reject(req.error);
      });
    };
    
    const db = await openDB();
    
    // 写入 KV 数据
    const kvTx = db.transaction(KV_STORE, 'readwrite');
    const kvStore = kvTx.objectStore(KV_STORE);
    
    if (data.maternityRules) {
      kvStore.put({ key: 'maternityRules', value: data.maternityRules });
    }
    if (data.allowanceRules) {
      kvStore.put({ key: 'allowanceRules', value: data.allowanceRules });
    }
    if (data.refundRules) {
      kvStore.put({ key: 'refundRules', value: data.refundRules });
    }
    if (data.employeeData) {
      kvStore.put({ key: 'employeeData', value: data.employeeData });
    }
    
    await new Promise((resolve, reject) => {
      kvTx.oncomplete = resolve;
      kvTx.onerror = () => reject(kvTx.error);
    });
    
    // 写入节假日数据
    if (data.holidays && Object.keys(data.holidays).length > 0) {
      const holidayTx = db.transaction(HOLIDAYS_STORE, 'readwrite');
      const holidayStore = holidayTx.objectStore(HOLIDAYS_STORE);
      
      for (const [year, plan] of Object.entries(data.holidays)) {
        holidayStore.put({ year: Number(year), plan });
      }
      
      await new Promise((resolve, reject) => {
        holidayTx.oncomplete = resolve;
        holidayTx.onerror = () => reject(holidayTx.error);
      });
    }
    
    db.close();
    return { success: true };
  }, { data, DB_NAME, DB_VERSION, KV_STORE, HOLIDAYS_STORE });
}

/**
 * 加载并注入测试数据（主函数）
 * @param {import('@playwright/test').Page} page - Playwright 页面对象
 * @param {Object} options - 选项
 * @param {string} options.configDataDir - ConfigData 目录路径（可选，默认为项目根目录下的 ConfigData）
 * @param {Array<string>} options.types - 要加载的数据类型（可选）
 */
async function loadAndInjectTestData(page, options = {}) {
  const projectRoot = path.join(__dirname, '../..');
  const configDataDir = options.configDataDir || path.join(projectRoot, 'ConfigData');
  
  console.log('开始加载测试数据...');
  console.log('ConfigData 目录:', configDataDir);
  
  // 解析 Excel 数据
  const allData = loadAllExcelData(configDataDir);
  
  // 根据选项过滤数据
  const dataToInject = {
    maternityRules: options.types?.includes('maternity') !== false ? allData.maternityRules : undefined,
    allowanceRules: options.types?.includes('allowance') !== false ? allData.allowanceRules : undefined,
    refundRules: options.types?.includes('refund') !== false ? allData.refundRules : undefined,
    employeeData: options.types?.includes('employee') !== false ? allData.employeeData : undefined,
    holidays: options.types?.includes('holiday') !== false ? allData.holidays : undefined
  };
  
  // 注入到 IndexedDB
  await injectDataToIndexedDB(page, dataToInject);
  console.log('✓ 测试数据加载完成');
  
  return dataToInject;
}

/**
 * 只加载最小必要数据（产假规则和津贴规则）
 * @param {import('@playwright/test').Page} page - Playwright 页面对象
 */
async function loadMinimalTestData(page) {
  return await loadAndInjectTestData(page, {
    types: ['maternity', 'allowance', 'employee']
  });
}

module.exports = {
  loadAndInjectTestData,
  loadMinimalTestData,
  loadAllExcelData,
  injectDataToIndexedDB,
  parseMaternityRules,
  parseAllowanceRules,
  parseRefundRules,
  parseEmployeeData,
  parseHolidayData
};
