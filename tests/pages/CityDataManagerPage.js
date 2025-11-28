/**
 * 基础数据管理页面 Page Object
 * 封装城市数据管理功能的所有操作和元素定位
 */

class CityDataManagerPage {
  /**
   * @param {import('@playwright/test').Page} page - Playwright页面对象
   */
  constructor(page) {
    this.page = page;
    
    // 主标签
    this.cityDataTab = page.getByRole('button', { name: '基础数据管理' });
    
    // 子标签 - 使用locator和filter来精确匹配，排除包含"添加"的按钮
    this.maternityRulesTab = page.locator('button.tab').filter({ hasText: '产假规则' });
    this.allowanceRulesTab = page.locator('button.tab').filter({ hasText: '津贴规则' });
    this.refundRulesTab = page.locator('button.tab').filter({ hasText: '返还规则' });
    this.employeeInfoTab = page.locator('button.tab').filter({ hasText: '员工信息' });
    this.holidayTab = page.locator('button.tab').filter({ hasText: '节假日' });
    
    // 城市选择 - 基础数据管理页面的城市选择器
    this.citySelect = page.locator('select').last(); // 使用last因为可能有多个select，这个在右上角
    
    // 按钮
    this.addButton = page.getByRole('button', { name: /添加|新增/ }).first();
    this.saveAllButton = page.getByRole('button', { name: /保存全部|保存所有/ });
    this.importButton = page.getByRole('button', { name: /导入/ });
    this.exportButton = page.getByRole('button', { name: /导出/ });
    
    // 表格
    this.dataTable = page.locator('table').first();
    
    // 文件上传
    this.fileInput = page.locator('input[type="file"]');
  }

  /**
   * 切换到基础数据管理标签
   */
  async switchToCityDataTab() {
    const isVisible = await this.cityDataTab.isVisible({ timeout: 2000 }).catch(() => false);
    if (isVisible) {
      await this.cityDataTab.click();
      await this.page.waitForTimeout(500);
    }
  }

  /**
   * 切换子标签
   * @param {string} tabName - 标签名称（maternity|allowance|refund|employee|holiday）
   */
  async switchTab(tabName) {
    const tabMap = {
      'maternity': this.maternityRulesTab,
      'allowance': this.allowanceRulesTab,
      'refund': this.refundRulesTab,
      'employee': this.employeeInfoTab,
      'holiday': this.holidayTab
    };
    
    const tab = tabMap[tabName];
    if (tab) {
      await tab.click();
      await this.page.waitForTimeout(500);
    }
  }

  /**
   * 选择城市
   * @param {string} cityName - 城市名称
   */
  async selectCity(cityName) {
    await this.citySelect.selectOption(cityName);
    await this.page.waitForTimeout(500);
  }

  /**
   * 点击添加按钮
   */
  async clickAdd() {
    await this.addButton.click();
    await this.page.waitForTimeout(500);
  }

  /**
   * 填写规则表单（通用）
   * @param {Object} ruleData - 规则数据
   */
  async fillRuleForm(ruleData) {
    for (const [key, value] of Object.entries(ruleData)) {
      // 尝试通过label查找输入框
      const input = this.page.getByLabel(new RegExp(key, 'i'));
      if (await input.count() > 0) {
        const firstInput = input.first();
        const tagName = await firstInput.evaluate(el => el.tagName.toLowerCase());
        
        if (tagName === 'select') {
          await firstInput.selectOption(String(value));
        } else if (tagName === 'input') {
          const type = await firstInput.getAttribute('type');
          if (type === 'checkbox') {
            if (value) {
              await firstInput.check();
            } else {
              await firstInput.uncheck();
            }
          } else {
            await firstInput.fill(String(value));
          }
        }
      }
    }
  }

  /**
   * 保存当前编辑（点击保存按钮）
   */
  async save() {
    const saveButton = this.page.getByRole('button', { name: /^保存$|^确定$/ }).first();
    await saveButton.click();
    await this.page.waitForTimeout(500);
  }

  /**
   * 编辑表格中的某一行
   * @param {number} rowIndex - 行索引
   */
  async editRow(rowIndex) {
    const editButton = this.dataTable
      .locator('tbody tr')
      .nth(rowIndex)
      .getByRole('button', { name: /编辑/ });
    await editButton.click();
    await this.page.waitForTimeout(500);
  }

  /**
   * 删除表格中的某一行
   * @param {number} rowIndex - 行索引
   */
  async deleteRow(rowIndex) {
    const deleteButton = this.dataTable
      .locator('tbody tr')
      .nth(rowIndex)
      .getByRole('button', { name: /删除/ });
    await deleteButton.click();
    
    // 确认删除（如果有确认对话框）
    const confirmButton = this.page.getByRole('button', { name: /确定|确认/ });
    if (await confirmButton.isVisible({ timeout: 1000 }).catch(() => false)) {
      await confirmButton.click();
    }
    
    await this.page.waitForTimeout(500);
  }

  /**
   * 获取表格行数
   * @returns {Promise<number>} 行数
   */
  async getTableRowCount() {
    const rows = this.dataTable.locator('tbody tr');
    return await rows.count();
  }

  /**
   * 获取表格数据
   * @returns {Promise<Array<string>>} 表格文本内容数组
   */
  async getTableData() {
    const rows = this.dataTable.locator('tbody tr');
    const count = await rows.count();
    
    const data = [];
    for (let i = 0; i < count; i++) {
      const text = await rows.nth(i).textContent();
      data.push(text);
    }
    
    return data;
  }

  /**
   * 导入Excel文件
   * @param {string} filePath - 文件路径
   */
  async importExcel(filePath) {
    await this.importButton.click();
    await this.fileInput.setInputFiles(filePath);
    await this.page.waitForTimeout(1000);
  }

  /**
   * 导出Excel
   * @returns {Promise<import('@playwright/test').Download>} 下载对象
   */
  async exportExcel() {
    const downloadPromise = this.page.waitForEvent('download');
    await this.exportButton.click();
    return await downloadPromise;
  }

  /**
   * 保存全部数据
   */
  async saveAll() {
    await this.saveAllButton.click();
    await this.page.waitForTimeout(1000);
  }

  /**
   * 检查是否显示成功消息
   * @returns {Promise<boolean>} 是否显示成功消息
   */
  async hasSuccessMessage() {
    const successMessage = this.page.locator('[style*="color: green"], .success');
    return await successMessage.isVisible({ timeout: 3000 }).catch(() => false);
  }

  /**
   * 检查是否显示错误消息
   * @returns {Promise<boolean>} 是否显示错误消息
   */
  async hasErrorMessage() {
    const errorMessage = this.page.locator('[style*="color: red"], .error');
    return await errorMessage.isVisible({ timeout: 3000 }).catch(() => false);
  }
}

module.exports = CityDataManagerPage;
