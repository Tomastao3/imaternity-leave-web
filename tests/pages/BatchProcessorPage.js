/**
 * 批量处理页面 Page Object
 * 封装批量处理功能的所有操作和元素定位
 */

class BatchProcessorPage {
  /**
   * @param {import('@playwright/test').Page} page - Playwright页面对象
   */
  constructor(page) {
    this.page = page;
    
    // 标签
    this.batchTab = page.getByRole('button', { name: '批量处理' });
    
    // 按钮
    this.downloadTemplateButton = page.getByRole('button', { name: /下载.*模板/ });
    this.startProcessButton = page.getByRole('button', { name: /🚀.*开始批量处理/ });
    this.exportResultsButton = page.getByRole('button', { name: /导出结果/ });
    
    // 文件上传 - 使用更具体的选择器避免匹配多个元素
    this.fileInput = page.locator('input[type="file"]#excel-file-input').or(page.getByLabel('📁 选择Excel文件'));
    
    // 预览和结果区域
    this.previewSection = page.locator('.card').filter({ hasText: '数据预览' });
    this.resultsSection = page.locator('.card').filter({ hasText: '处理结果' });
    this.resultsTable = page.locator('table');
    this.errorSection = page.locator('.error, [style*="color: red"]');
  }

  /**
   * 切换到批量处理标签
   */
  async switchToBatchTab() {
    const isVisible = await this.batchTab.isVisible({ timeout: 2000 }).catch(() => false);
    if (isVisible) {
      await this.batchTab.click();
      await this.page.waitForTimeout(500);
    }
  }

  /**
   * 下载Excel模板
   * @returns {Promise<import('@playwright/test').Download>} 下载对象
   */
  async downloadTemplate() {
    const downloadPromise = this.page.waitForEvent('download');
    await this.downloadTemplateButton.click();
    return await downloadPromise;
  }

  /**
   * 上传Excel文件
   * @param {string} filePath - 文件路径
   */
  async uploadFile(filePath) {
    await this.fileInput.setInputFiles(filePath);
    // 等待文件处理
    await this.page.waitForTimeout(1000);
  }

  /**
   * 获取预览数据
   * @returns {Promise<Array<Object>>} 预览数据数组
   */
  async getPreviewData() {
    await this.previewSection.waitFor({ state: 'visible', timeout: 5000 });
    
    const table = this.previewSection.locator('table');
    const rows = table.locator('tbody tr');
    const count = await rows.count();
    
    const data = [];
    for (let i = 0; i < count; i++) {
      const row = rows.nth(i);
      const cells = row.locator('td');
      const cellCount = await cells.count();
      
      const rowData = {};
      for (let j = 0; j < cellCount; j++) {
        const text = await cells.nth(j).textContent();
        rowData[`col${j}`] = text.trim();
      }
      data.push(rowData);
    }
    
    return data;
  }

  /**
   * 检查是否显示预览
   * @returns {Promise<boolean>} 是否显示预览
   */
  async hasPreview() {
    return await this.previewSection.isVisible();
  }

  /**
   * 开始批量处理
   */
  async startBatchProcess() {
    await this.startProcessButton.click();
    // 等待处理完成（可能需要较长时间）
    await this.page.waitForTimeout(3000);
  }

  /**
   * 获取处理结果表格数据
   * @returns {Promise<Array<Object>>} 结果数据数组
   */
  async getResultsTable() {
    await this.resultsSection.waitFor({ state: 'visible', timeout: 10000 });
    
    const table = this.resultsSection.locator('table');
    const rows = table.locator('tbody tr');
    const count = await rows.count();
    
    const data = [];
    for (let i = 0; i < count; i++) {
      const row = rows.nth(i);
      const text = await row.textContent();
      data.push(text);
    }
    
    return data;
  }

  /**
   * 检查是否有处理结果
   * @returns {Promise<boolean>} 是否有结果
   */
  async hasResults() {
    return await this.resultsSection.isVisible();
  }

  /**
   * 导出结果
   * @returns {Promise<import('@playwright/test').Download>} 下载对象
   */
  async exportResults() {
    const downloadPromise = this.page.waitForEvent('download');
    await this.exportResultsButton.click();
    return await downloadPromise;
  }

  /**
   * 获取错误消息
   * @returns {Promise<Array<string>>} 错误消息数组
   */
  async getErrorMessages() {
    const errorElements = this.page.locator('.error, [style*="color: red"], [style*="color:#c33"]');
    const count = await errorElements.count();
    
    const errors = [];
    for (let i = 0; i < count; i++) {
      const text = await errorElements.nth(i).textContent();
      if (text.trim()) {
        errors.push(text.trim());
      }
    }
    
    return errors;
  }

  /**
   * 检查是否有错误
   * @returns {Promise<boolean>} 是否有错误
   */
  async hasErrors() {
    const errors = await this.getErrorMessages();
    return errors.length > 0;
  }

  /**
   * 获取处理摘要信息
   * @returns {Promise<Object>} 摘要信息
   */
  async getProcessingSummary() {
    const summaryText = await this.resultsSection.textContent();
    
    const summary = {
      fullText: summaryText
    };
    
    // 提取成功和失败数量
    const successMatch = summaryText.match(/成功[：:]\s*(\d+)/);
    const failMatch = summaryText.match(/失败[：:]\s*(\d+)/);
    
    if (successMatch) {
      summary.successCount = parseInt(successMatch[1]);
    }
    
    if (failMatch) {
      summary.failCount = parseInt(failMatch[1]);
    }
    
    return summary;
  }
}

module.exports = BatchProcessorPage;
