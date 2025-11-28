/**
 * 产假津贴计算器页面 Page Object
 * 封装产假津贴计算器的所有操作和元素定位
 */

class AllowanceCalculatorPage {
  /**
   * @param {import('@playwright/test').Page} page - Playwright页面对象
   */
  constructor(page) {
    this.page = page;
    
    // 标签和导航
    this.allowanceTab = page.getByRole('button', { name: '产假津贴计算' });
    
    // 表单元素
    this.citySelect = page.getByLabel('选择城市');
    this.companyAvgSalaryInput = page.getByLabel(/公司平均工资/);
    this.employeeBasicSalaryInput = page.getByLabel(/员工.*12.*平均工资/);
    this.socialInsuranceLimitInput = page.getByLabel(/社保.*上限/);
    this.startDateInput = page.getByLabel(/产假开始日期/);
    this.difficultBirthCheckbox = page.getByLabel(/是否难产/);
    this.numberOfBabiesInput = page.getByLabel(/生育胎数|胎数/);
    this.pregnancyPeriodSelect = page.getByLabel('怀孕时间段');
    this.paymentMethodSelect = page.getByLabel(/津贴发放方式/);
    this.paidWageInput = page.getByLabel(/公司已发工资/);
    
    // 按钮
    this.calculateButton = page.getByRole('button', { name: /计算产假/ });
    this.resetButton = page.getByRole('button', { name: /重置|清空/ });
    this.exportPDFButton = page.getByRole('button', { name: /导出PDF/ });
    this.exportExcelButton = page.getByRole('button', { name: /导出Excel/ });
    this.addDeductionButton = page.getByRole('button', { name: /手动增加扣减项/ });
    this.toggleCalendarButton = page.getByRole('button', { name: /展示休假日历|隐藏休假日历/ });
    
    // 结果区域
    this.resultHeading = page.getByRole('heading', { name: '计算结果' });
    this.resultSection = page.locator('.card').filter({ hasText: '计算结果' });
  }

  /**
   * 切换到产假津贴计算标签
   */
  async switchToAllowanceTab() {
    const isVisible = await this.allowanceTab.isVisible({ timeout: 2000 }).catch(() => false);
    if (isVisible) {
      await this.allowanceTab.click();
      await this.page.waitForTimeout(500); // 等待标签切换动画
    }
    // 如果标签不可见，说明已经在该标签页，无需切换
  }

  /**
   * 选择城市
   * @param {string} cityName - 城市名称
   */
  async selectCity(cityName) {
    await this.citySelect.selectOption(cityName);
  }

  /**
   * 设置生产情况（自定义下拉框）
   * @param {Object} options - 生产情况选项
   */
  async setProductionCondition(options = {}) {
    const { isDifficultBirth = false, isMiscarriage = false } = options;
    
    // 找到生产情况输入框并点击打开下拉菜单
    const productionInput = this.page.locator('#productionConditions');
    await productionInput.click();
    await this.page.waitForTimeout(500);
    
    if (!isDifficultBirth && !isMiscarriage) {
      // 不选择任何特殊情况，点击"完成"按钮关闭
      const doneButton = this.page.getByRole('button', { name: '完成' }).first();
      const buttonExists = await doneButton.isVisible({ timeout: 1000 }).catch(() => false);
      if (buttonExists) {
        await doneButton.click();
      }
    } else if (isDifficultBirth) {
      // 选择难产
      const difficultLabel = this.page.locator('label:has-text("难产")').first();
      await difficultLabel.click();
      await this.page.waitForTimeout(300);
      const doneButton = this.page.getByRole('button', { name: '完成' });
      await doneButton.click();
    } else if (isMiscarriage) {
      // 选择流产
      const miscarriageLabel = this.page.locator('label:has-text("流产")').first();
      await miscarriageLabel.click();
      await this.page.waitForTimeout(300);
      const doneButton = this.page.getByRole('button', { name: '完成' });
      await doneButton.click();
    }
    
    await this.page.waitForTimeout(500);
  }

  /**
   * 填写基本信息
   * @param {Object} data - 表单数据
   */
  async fillBasicInfo(data) {
    if (data.city) {
      await this.selectCity(data.city);
      await this.page.waitForTimeout(500);
    }
    
    if (data.companyAvgSalary) {
      await this.companyAvgSalaryInput.fill(String(data.companyAvgSalary));
    }
    
    if (data.employeeBasicSalary) {
      await this.employeeBasicSalaryInput.fill(String(data.employeeBasicSalary));
    }
    
    if (data.socialInsuranceLimit) {
      await this.socialInsuranceLimitInput.fill(String(data.socialInsuranceLimit));
    }
    
    if (data.startDate) {
      await this.startDateInput.fill(data.startDate);
    }
    
    // 处理生产情况（自定义下拉框）
    await this.setProductionCondition({
      isDifficultBirth: data.isDifficultBirth || false,
      isMiscarriage: data.isMiscarriage || false
    });
    
    if (data.numberOfBabies) {
      const inputExists = await this.numberOfBabiesInput.isVisible({ timeout: 2000 }).catch(() => false);
      if (inputExists) {
        await this.numberOfBabiesInput.fill(String(data.numberOfBabies));
      }
    }
    
    if (data.pregnancyPeriod) {
      const selectExists = await this.pregnancyPeriodSelect.isVisible({ timeout: 2000 }).catch(() => false);
      if (selectExists) {
        // 检查字段是否可用（不是 disabled）
        const isDisabled = await this.pregnancyPeriodSelect.isDisabled().catch(() => true);
        if (!isDisabled) {
          await this.pregnancyPeriodSelect.selectOption(data.pregnancyPeriod);
        }
      }
    }
    
    if (data.paymentMethod) {
      const selectExists = await this.paymentMethodSelect.isVisible({ timeout: 2000 }).catch(() => false);
      if (selectExists) {
        await this.paymentMethodSelect.selectOption(data.paymentMethod);
      }
    }
    
    if (data.paidWageDuringLeave) {
      await this.paidWageInput.fill(String(data.paidWageDuringLeave));
    }
  }

  /**
   * 点击计算按钮
   */
  async calculate() {
    // 滚动到按钮可见位置
    await this.calculateButton.scrollIntoViewIfNeeded({ timeout: 5000 }).catch(() => {});
    await this.page.waitForTimeout(500);
    await this.calculateButton.click();
    // 等待计算完成
    await this.page.waitForTimeout(3000);
  }

  /**
   * 获取计算结果
   * @returns {Promise<Object>} 计算结果对象
   */
  async getCalculationResult() {
    await this.resultHeading.waitFor({ state: 'visible', timeout: 10000 });
    
    const resultText = await this.resultSection.textContent();
    
    // 提取关键数字
    const result = {
      hasResult: true,
      fullText: resultText
    };
    
    // 提取产假天数
    const daysMatch = resultText.match(/享受产假天数[：:]\s*(\d+)/);
    if (daysMatch) {
      result.totalMaternityDays = parseInt(daysMatch[1]);
    }
    
    return result;
  }

  /**
   * 检查结果是否显示
   * @returns {Promise<boolean>} 是否显示结果
   */
  async hasResult() {
    try {
      await this.resultHeading.waitFor({ state: 'visible', timeout: 5000 });
      return true;
    } catch {
      return false;
    }
  }

  /**
   * 添加扣减项
   * @param {string} note - 扣减说明
   * @param {number} amount - 扣减金额
   */
  async addDeduction(note, amount) {
    await this.addDeductionButton.click();
    
    // 找到最后一个扣减项输入框
    const deductionNotes = this.page.locator('input[placeholder*="扣减说明"]');
    const deductionAmounts = this.page.locator('input[placeholder*="扣减金额"]');
    
    const count = await deductionNotes.count();
    await deductionNotes.nth(count - 1).fill(note);
    await deductionAmounts.nth(count - 1).fill(String(amount));
  }

  /**
   * 删除扣减项
   * @param {number} index - 扣减项索引
   */
  async removeDeduction(index) {
    const removeButtons = this.page.getByRole('button', { name: /删除|移除/ });
    await removeButtons.nth(index).click();
  }

  /**
   * 导出PDF
   */
  async exportPDF() {
    const downloadPromise = this.page.waitForEvent('download');
    await this.exportPDFButton.click();
    return await downloadPromise;
  }

  /**
   * 导出Excel
   */
  async exportExcel() {
    const downloadPromise = this.page.waitForEvent('download');
    await this.exportExcelButton.click();
    return await downloadPromise;
  }

  /**
   * 重置表单
   */
  async reset() {
    await this.resetButton.click();
  }

  /**
   * 切换休假日历显示
   */
  async toggleCalendar() {
    await this.toggleCalendarButton.click();
    await this.page.waitForTimeout(500);
  }

  /**
   * 检查计算过程是否包含特定文本
   * @param {string} text - 要查找的文本
   * @returns {Promise<boolean>} 是否包含该文本
   */
  async processContains(text) {
    const processSection = this.page.locator('[style*="whiteSpace: pre-wrap"]');
    const count = await processSection.count();
    
    for (let i = 0; i < count; i++) {
      const content = await processSection.nth(i).textContent();
      if (content.includes(text)) {
        return true;
      }
    }
    
    return false;
  }

  /**
   * 获取可见的标签列表
   * @returns {Promise<Array<string>>} 标签名称数组
   */
  async getVisibleTabs() {
    // 只获取主标签栏的标签，不包括子标签
    const mainTabs = this.page.locator('.tabs').first();
    const tabs = mainTabs.locator('button.tab');
    const count = await tabs.count();
    const visibleTabs = [];
    
    for (let i = 0; i < count; i++) {
      const tab = tabs.nth(i);
      if (await tab.isVisible()) {
        const text = await tab.textContent();
        visibleTabs.push(text.trim());
      }
    }
    
    return visibleTabs;
  }
}

module.exports = AllowanceCalculatorPage;
