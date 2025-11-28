/**
 * 数据上传辅助工具
 * 通过页面UI上传ConfigData目录下的Excel文件来初始化测试数据
 */

const path = require('path');

/**
 * Excel文件与数据类型的映射关系
 */
const DATA_FILE_MAPPING = {
  maternity: {
    file: '产假规则.xlsx',
    tabName: '产假规则',
    description: '产假规则数据'
  },
  allowance: {
    file: '津贴规则.xlsx',
    tabName: '津贴规则',
    description: '津贴规则数据'
  },
  refund: {
    file: '返还规则.xlsx',
    tabName: '返还规则',
    description: '返还规则数据'
  },
  employee: {
    file: '员工信息.xlsx',
    tabName: '员工信息',
    description: '员工信息数据'
  },
  holiday: {
    file: '节假日_all.xlsx',
    tabName: '节假日',
    description: '节假日数据'
  }
};

/**
 * 通过页面UI上传所有测试数据
 * @param {import('@playwright/test').Page} page - Playwright页面对象
 * @param {Object} options - 选项
 * @param {Array<string>} options.types - 要上传的数据类型数组，默认全部上传
 */
async function uploadTestDataViaUI(page, options = {}) {
  const { types = ['maternity', 'allowance', 'refund', 'employee', 'holiday'] } = options;
  
  const configDataDir = path.join(__dirname, '../../ConfigData');
  
  console.log('开始通过UI上传测试数据...');
  
  // 切换到基础数据管理标签
  const cityDataTab = page.getByRole('button', { name: '基础数据管理' });
  const isVisible = await cityDataTab.isVisible({ timeout: 2000 }).catch(() => false);
  
  if (!isVisible) {
    throw new Error('基础数据管理标签不可见，请确保已以HR身份登录');
  }
  
  await cityDataTab.click();
  await page.waitForTimeout(1000);
  
  // 依次上传各类数据
  for (const type of types) {
    const mapping = DATA_FILE_MAPPING[type];
    if (!mapping) {
      console.warn(`未知的数据类型: ${type}`);
      continue;
    }
    
    console.log(`上传${mapping.description}...`);
    
    try {
      // 切换到对应的子标签
      await switchToDataTab(page, type);
      await page.waitForTimeout(500);
      
      // 上传文件
      const filePath = path.join(configDataDir, mapping.file);
      await uploadExcelFile(page, filePath);
      
      // 等待上传完成
      await page.waitForTimeout(2000);
      
      console.log(`${mapping.description}上传完成`);
    } catch (error) {
      console.error(`上传${mapping.description}失败:`, error.message);
      // 继续上传其他文件
    }
  }
  
  console.log('所有测试数据上传完成');
}

/**
 * 切换到指定的数据管理子标签
 * @param {import('@playwright/test').Page} page - Playwright页面对象
 * @param {string} type - 数据类型
 */
async function switchToDataTab(page, type) {
  const tabMapping = {
    'maternity': '产假规则',
    'allowance': '津贴规则',
    'refund': '返还规则',
    'employee': '员工信息',
    'holiday': '节假日'
  };
  
  const tabName = tabMapping[type];
  if (!tabName) return;
  
  // 查找包含该文本的按钮
  const tab = page.getByRole('button', { name: new RegExp(tabName) });
  const exists = await tab.isVisible({ timeout: 2000 }).catch(() => false);
  
  if (exists) {
    await tab.click();
    await page.waitForTimeout(500);
  }
}

/**
 * 上传Excel文件
 * @param {import('@playwright/test').Page} page - Playwright页面对象
 * @param {string} filePath - 文件路径
 */
async function uploadExcelFile(page, filePath) {
  // 查找文件输入框（可能是隐藏的）
  const fileInput = page.locator('input[type="file"]').first();
  
  // 设置文件
  await fileInput.setInputFiles(filePath);
  
  // 等待文件处理
  await page.waitForTimeout(1000);
  
  // 查找并点击确认/保存按钮（如果有）
  const confirmButton = page.getByRole('button', { name: /确认|保存|导入/ });
  const hasConfirm = await confirmButton.isVisible({ timeout: 1000 }).catch(() => false);
  
  if (hasConfirm) {
    await confirmButton.click();
    await page.waitForTimeout(500);
  }
}

/**
 * 只上传必要的数据（产假规则和津贴规则）
 * @param {import('@playwright/test').Page} page - Playwright页面对象
 */
async function uploadMinimalTestData(page) {
  return await uploadTestDataViaUI(page, {
    types: ['maternity', 'allowance']
  });
}

/**
 * 清除所有测试数据
 * @param {import('@playwright/test').Page} page - Playwright页面对象
 */
async function clearAllTestData(page) {
  // 通过删除IndexedDB来清除数据
  await page.evaluate(() => {
    return new Promise((resolve) => {
      const request = indexedDB.deleteDatabase('MaternityLeaveDB');
      request.onsuccess = () => resolve();
      request.onerror = () => resolve();
    });
  });
  
  // 也清除sessionStorage和localStorage
  await page.evaluate(() => {
    sessionStorage.clear();
    localStorage.clear();
  });
}

module.exports = {
  uploadTestDataViaUI,
  uploadMinimalTestData,
  clearAllTestData,
  DATA_FILE_MAPPING
};
