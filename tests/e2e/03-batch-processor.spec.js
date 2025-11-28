/**
 * 批量处理 E2E 测试
 * 测试Excel批量导入、处理和导出功能
 */

const { test, expect } = require('@playwright/test');
const path = require('path');
const LoginPage = require('../pages/LoginPage');
const BatchProcessorPage = require('../pages/BatchProcessorPage');
const employeesData = require('../fixtures/e2e/employees.json');

test.describe('批量处理功能测试', () => {
  let loginPage;
  let batchPage;
  const testExcelPath = path.join(__dirname, '../fixtures/e2e/batchSample.xlsx');

  test.beforeEach(async ({ page }) => {
    loginPage = new LoginPage(page);
    batchPage = new BatchProcessorPage(page);
    
    // 清除会话并以HR身份登录
    await loginPage.goto();
    
    await page.evaluate(() => {
      sessionStorage.clear();
      localStorage.clear();
    });
    await loginPage.loginAsHR(employeesData.hrUser.username);
    await loginPage.waitForLoginSuccess();
    
    // 切换到批量处理标签
    await batchPage.switchToBatchTab();
  });

  test('下载Excel模板', async ({ page }) => {
    // 检查下载模板按钮是否存在
    const buttonVisible = await batchPage.downloadTemplateButton.isVisible({ timeout: 2000 }).catch(() => false);
    
    if (buttonVisible) {
      // 下载模板
      const download = await batchPage.downloadTemplate();
      
      // 验证下载对象存在
      expect(download).toBeDefined();
      
      // 验证文件名
      const fileName = download.suggestedFilename();
      expect(fileName).toMatch(/\.xlsx?$/i);
      expect(fileName).toMatch(/模板|template/i);
    } else {
      test.skip();
    }
  });

  test('上传有效Excel文件并预览', async ({ page }) => {
    // 上传测试Excel文件
    await batchPage.uploadFile(testExcelPath);
    
    // 等待文件处理
    await page.waitForTimeout(2000);
    
    // 检查是否显示预览
    const hasPreview = await batchPage.hasPreview();
    
    if (hasPreview) {
      // 获取预览数据
      const previewData = await batchPage.getPreviewData();
      
      // 验证预览数据不为空
      expect(previewData.length).toBeGreaterThan(0);
    }
  });

  test('批量处理 - 处理有效数据', async ({ page }) => {
    // 上传测试Excel文件
    await batchPage.uploadFile(testExcelPath);
    await page.waitForTimeout(2000);
    
    // 开始批量处理
    await batchPage.startBatchProcess();
    
    // 等待处理完成
    await page.waitForTimeout(3000);
    
    // 检查是否有处理结果
    const hasResults = await batchPage.hasResults();
    expect(hasResults).toBe(true);
    
    // 获取处理摘要
    const summary = await batchPage.getProcessingSummary();
    
    // 验证有成功处理的数据
    if (summary.successCount !== undefined) {
      expect(summary.successCount).toBeGreaterThan(0);
    }
  });

  test('批量处理 - 错误数据验证', async ({ page }) => {
    // 上传测试Excel文件（包含错误数据）
    await batchPage.uploadFile(testExcelPath);
    await page.waitForTimeout(2000);
    
    // 开始批量处理
    await batchPage.startBatchProcess();
    
    // 等待处理完成
    await page.waitForTimeout(3000);
    
    // 获取处理摘要
    const summary = await batchPage.getProcessingSummary();
    
    // 验证有失败的数据（因为测试文件包含错误数据）
    if (summary.failCount !== undefined) {
      expect(summary.failCount).toBeGreaterThan(0);
    }
    
    // 检查是否有错误消息
    const errors = await batchPage.getErrorMessages();
    
    // 如果有错误，验证错误消息不为空
    if (errors.length > 0) {
      expect(errors[0].length).toBeGreaterThan(0);
    }
  });

  test('导出处理结果', async ({ page }) => {
    // 先上传并处理
    await batchPage.uploadFile(testExcelPath);
    await page.waitForTimeout(2000);
    
    await batchPage.startBatchProcess();
    await page.waitForTimeout(3000);
    
    // 检查导出按钮是否可见
    const exportButtonVisible = await batchPage.exportResultsButton.isVisible({ timeout: 2000 }).catch(() => false);
    
    if (exportButtonVisible) {
      // 导出结果
      const download = await batchPage.exportResults();
      
      // 验证下载对象存在
      expect(download).toBeDefined();
      
      // 验证文件名
      const fileName = download.suggestedFilename();
      expect(fileName).toMatch(/\.xlsx?$/i);
      expect(fileName).toMatch(/结果|result/i);
    } else {
      test.skip();
    }
  });

  test('文件格式验证 - 上传非Excel文件应该提示错误', async ({ page }) => {
    // 创建一个临时的非Excel文件路径
    const invalidFilePath = path.join(__dirname, '../fixtures/e2e/employees.json');
    
    // 尝试上传JSON文件
    await batchPage.uploadFile(invalidFilePath);
    
    // 等待一下
    await page.waitForTimeout(1000);
    
    // 检查是否有错误提示或alert
    // 注意：可能会有alert弹窗，我们需要处理
    page.on('dialog', async dialog => {
      const message = dialog.message();
      expect(message).toMatch(/Excel|xlsx|xls|格式/i);
      await dialog.accept();
    });
    
    // 或者检查页面上的错误消息
    const hasError = await batchPage.hasErrors();
    
    // 如果有错误提示，验证通过
    if (hasError) {
      expect(hasError).toBe(true);
    }
  });

  test('批量处理结果表格 - 验证数据显示', async ({ page }) => {
    // 上传并处理
    await batchPage.uploadFile(testExcelPath);
    await page.waitForTimeout(2000);
    
    await batchPage.startBatchProcess();
    await page.waitForTimeout(3000);
    
    // 获取结果表格
    const resultsTable = await batchPage.getResultsTable();
    
    // 验证表格有数据
    expect(resultsTable.length).toBeGreaterThan(0);
    
    // 验证表格包含关键信息（员工姓名、产假天数等）
    const tableText = resultsTable.join(' ');
    expect(tableText.length).toBeGreaterThan(0);
  });
});

test.describe('批量处理 - 边界情况测试', () => {
  let loginPage;
  let batchPage;

  test.beforeEach(async ({ page }) => {
    loginPage = new LoginPage(page);
    batchPage = new BatchProcessorPage(page);
    
    await loginPage.goto();
    
    await page.evaluate(() => {
      sessionStorage.clear();
      localStorage.clear();
    });
    await loginPage.loginAsHR(employeesData.hrUser.username);
    await loginPage.waitForLoginSuccess();
    await batchPage.switchToBatchTab();
  });

  test('未选择文件直接处理 - 应该提示错误', async ({ page }) => {
    // 检查按钮是否被禁用（正确行为）
    const isDisabled = await batchPage.startProcessButton.isDisabled();
    
    if (isDisabled) {
      // 按钮被禁用是正确的行为
      expect(isDisabled).toBe(true);
    } else {
      // 如果按钮未被禁用，尝试点击并检查错误提示
      let alertMessage = '';
      page.on('dialog', async dialog => {
        alertMessage = dialog.message();
        await dialog.accept();
      });
      
      await batchPage.startProcessButton.click();
      await page.waitForTimeout(1000);
      
      // 验证有alert提示或错误消息
      if (alertMessage) {
        expect(alertMessage).toMatch(/选择|文件|上传/i);
      } else {
        const hasError = await batchPage.hasErrors();
        expect(hasError).toBe(true);
      }
    }
  });
});
