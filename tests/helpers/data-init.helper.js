/**
 * 数据初始化辅助工具
 * 在测试前初始化IndexedDB数据
 */

const fs = require('fs');
const path = require('path');

/**
 * 初始化测试数据 - 直接设置到cityDataManager
 * @param {import('@playwright/test').Page} page - Playwright页面对象
 */
async function initializeTestData(page) {
  // 读取生成的配置数据
  const configPath = path.join(__dirname, '../fixtures/generated/configData.json');
  
  if (!fs.existsSync(configPath)) {
    console.warn('配置数据文件不存在，跳过数据初始化');
    return;
  }
  
  const configData = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
  
  // 处理Excel导入的数据结构（Sheet1嵌套）
  const processedData = {
    maternityRules: configData.maternityRules?.Sheet1 || [],
    allowanceRules: configData.allowanceRules?.Sheet1 || [],
    refundRules: configData.refundRules?.Sheet1 || [],
    employeeData: configData.employeeData?.Sheet1 || []
  };
  
  // 在window对象上设置测试数据，让应用可以访问
  await page.evaluate((data) => {
    window.__TEST_DATA__ = data;
  }, processedData);
  
  // 同时写入IndexedDB作为后备
  await page.evaluate((data) => {
    return new Promise((resolve) => {
      const dbName = 'MaternityLeaveDB';
      const request = indexedDB.open(dbName, 1);
      
      request.onupgradeneeded = (event) => {
        const db = event.target.result;
        if (!db.objectStoreNames.contains('cityData')) {
          db.createObjectStore('cityData');
        }
      };
      
      request.onsuccess = (event) => {
        const db = event.target.result;
        const transaction = db.transaction(['cityData'], 'readwrite');
        const store = transaction.objectStore('cityData');
        
        store.put(data.maternityRules, 'maternityRules');
        store.put(data.allowanceRules, 'allowanceRules');
        store.put(data.refundRules, 'refundRules');
        store.put(data.employeeData, 'employeeData');
        
        transaction.oncomplete = () => {
          db.close();
          resolve();
        };
      };
      
      request.onerror = () => resolve(); // 忽略错误，继续执行
    });
  }, processedData);
}

/**
 * 清除IndexedDB数据
 * @param {import('@playwright/test').Page} page - Playwright页面对象
 */
async function clearTestData(page) {
  await page.evaluate(() => {
    return new Promise((resolve) => {
      const dbName = 'MaternityLeaveDB';
      const request = indexedDB.deleteDatabase(dbName);
      request.onsuccess = () => resolve();
      request.onerror = () => resolve(); // 即使失败也继续
    });
  });
}

module.exports = {
  initializeTestData,
  clearTestData
};
