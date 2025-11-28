/**
 * 断言辅助工具
 * 提供常用的断言封装函数
 */

const { expect } = require('@playwright/test');

/**
 * 断言计算结果
 * @param {import('@playwright/test').Page} page - Playwright页面对象
 * @param {Object} expected - 期望的结果
 */
async function assertCalculationResult(page, expected) {
  // 等待结果区域出现
  await expect(page.getByRole('heading', { name: '计算结果' })).toBeVisible();
  
  // 断言政府金额
  if (expected.governmentAmount !== undefined) {
    const governmentText = await page.getByText(/政府发放金额/).textContent();
    expect(governmentText).toContain(String(expected.governmentAmount));
  }
  
  // 断言员工应领金额
  if (expected.employeeReceivable !== undefined) {
    const employeeText = await page.getByText(/员工应领金额/).textContent();
    expect(employeeText).toContain(String(expected.employeeReceivable));
  }
  
  // 断言补差金额
  if (expected.supplement !== undefined) {
    const supplementText = await page.getByText(/公司补差/).textContent();
    expect(supplementText).toContain(String(expected.supplement));
  }
  
  // 断言产假天数
  if (expected.totalMaternityDays !== undefined) {
    const daysText = await page.getByText(/享受产假天数/).textContent();
    expect(daysText).toContain(String(expected.totalMaternityDays));
  }
}

/**
 * 断言错误消息
 * @param {import('@playwright/test').Page} page - Playwright页面对象
 * @param {string} message - 期望的错误消息
 */
async function assertErrorMessage(page, message) {
  const errorElement = page.locator('.error, [style*="color: #c33"], [style*="color:#c33"]');
  await expect(errorElement).toBeVisible();
  await expect(errorElement).toContainText(message);
}

/**
 * 断言表格数据
 * @param {import('@playwright/test').Page} page - Playwright页面对象
 * @param {Array<Object>} expectedRows - 期望的表格行数据
 */
async function assertTableData(page, expectedRows) {
  const rows = page.locator('table tbody tr');
  const rowCount = await rows.count();
  
  expect(rowCount).toBeGreaterThanOrEqual(expectedRows.length);
  
  for (let i = 0; i < expectedRows.length; i++) {
    const row = rows.nth(i);
    const expectedRow = expectedRows[i];
    
    for (const [key, value] of Object.entries(expectedRow)) {
      const cellText = await row.textContent();
      expect(cellText).toContain(String(value));
    }
  }
}

/**
 * 断言标签可见性
 * @param {import('@playwright/test').Page} page - Playwright页面对象
 * @param {Array<string>} visibleTabs - 应该可见的标签名称
 * @param {Array<string>} hiddenTabs - 应该隐藏的标签名称
 */
async function assertTabVisibility(page, visibleTabs, hiddenTabs = []) {
  for (const tabName of visibleTabs) {
    const tab = page.getByRole('button', { name: tabName });
    await expect(tab).toBeVisible();
  }
  
  for (const tabName of hiddenTabs) {
    const tab = page.getByRole('button', { name: tabName });
    await expect(tab).not.toBeVisible();
  }
}

/**
 * 断言计算过程包含特定文本
 * @param {import('@playwright/test').Page} page - Playwright页面对象
 * @param {string} processText - 期望包含的过程文本
 */
async function assertProcessContains(page, processText) {
  const processSection = page.locator('[style*="whiteSpace: pre-wrap"]');
  await expect(processSection.first()).toContainText(processText);
}

/**
 * 断言文件下载
 * @param {import('@playwright/test').Page} page - Playwright页面对象
 * @param {Function} action - 触发下载的操作
 * @param {string} expectedFileName - 期望的文件名（可选）
 * @returns {Promise<import('@playwright/test').Download>} 下载对象
 */
async function assertFileDownload(page, action, expectedFileName = null) {
  const downloadPromise = page.waitForEvent('download');
  await action();
  const download = await downloadPromise;
  
  if (expectedFileName) {
    expect(download.suggestedFilename()).toContain(expectedFileName);
  }
  
  return download;
}

/**
 * 断言元素数量
 * @param {import('@playwright/test').Locator} locator - Playwright定位器
 * @param {number} expectedCount - 期望的数量
 */
async function assertElementCount(locator, expectedCount) {
  const count = await locator.count();
  expect(count).toBe(expectedCount);
}

module.exports = {
  assertCalculationResult,
  assertErrorMessage,
  assertTableData,
  assertTabVisibility,
  assertProcessContains,
  assertFileDownload,
  assertElementCount
};
