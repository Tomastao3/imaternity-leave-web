/**
 * 表单辅助工具
 * 提供表单填写相关的辅助函数
 */

const { format } = require('date-fns');

/**
 * 选择城市
 * @param {import('@playwright/test').Page} page - Playwright页面对象
 * @param {string} cityName - 城市名称
 */
async function selectCity(page, cityName) {
  const citySelect = page.getByLabel('选择城市');
  await citySelect.waitFor({ state: 'visible' });
  await citySelect.selectOption(cityName);
}

/**
 * 填写日期字段
 * @param {import('@playwright/test').Page} page - Playwright页面对象
 * @param {string} label - 字段标签
 * @param {string|Date} date - 日期（字符串或Date对象）
 */
async function fillDateField(page, label, date) {
  const dateStr = typeof date === 'string' ? date : format(date, 'yyyy-MM-dd');
  const dateInput = page.getByLabel(label);
  await dateInput.fill(dateStr);
}

/**
 * 填写产假津贴计算表单
 * @param {import('@playwright/test').Page} page - Playwright页面对象
 * @param {Object} data - 表单数据
 */
async function fillAllowanceForm(page, data) {
  // 选择城市
  if (data.city) {
    await selectCity(page, data.city);
  }
  
  // 填写单位申报的上年度月平均工资
  if (data.companyAvgSalary) {
    const companyAvgInput = page.getByLabel(/单位申报的上年度月平均工资.*\*/);
    await companyAvgInput.fill(String(data.companyAvgSalary));
  }
  
  // 填写员工产前12个月的月均工资
  if (data.employeeBasicSalary) {
    const employeeAvgInput = page.getByLabel(/员工产前12个月的月均工资.*\*/);
    await employeeAvgInput.fill(String(data.employeeBasicSalary));
  }
  
  // 填写社保3倍上限
  if (data.socialInsuranceLimit) {
    const socialLimitInput = page.getByLabel(/社保3倍上限/);
    await socialLimitInput.fill(String(data.socialInsuranceLimit));
  }
  
  // 填写产假开始日期
  if (data.startDate) {
    await fillDateField(page, /产假开始日期/, data.startDate);
  }
  
  // 选择是否难产
  if (data.isDifficultBirth !== undefined) {
    const difficultBirthCheckbox = page.getByLabel(/是否难产/);
    if (data.isDifficultBirth) {
      await difficultBirthCheckbox.check();
    } else {
      await difficultBirthCheckbox.uncheck();
    }
  }
  
  // 填写胎数
  if (data.numberOfBabies) {
    const babiesInput = page.getByLabel(/胎数/);
    await babiesInput.fill(String(data.numberOfBabies));
  }
  
  // 选择怀孕时间段
  if (data.pregnancyPeriod) {
    const periodSelect = page.getByLabel(/怀孕时间段/);
    await periodSelect.selectOption(data.pregnancyPeriod);
  }
  
  // 选择津贴发放方式
  if (data.paymentMethod) {
    const paymentSelect = page.getByLabel(/津贴发放方式/);
    await paymentSelect.selectOption(data.paymentMethod);
  }
  
  // 填写公司已发工资
  if (data.paidWageDuringLeave) {
    const paidWageInput = page.getByLabel(/公司已发工资/);
    await paidWageInput.fill(String(data.paidWageDuringLeave));
  }
}

/**
 * 添加扣减项
 * @param {import('@playwright/test').Page} page - Playwright页面对象
 * @param {string} note - 扣减说明
 * @param {number} amount - 扣减金额
 */
async function addDeduction(page, note, amount) {
  // 点击添加扣减项按钮
  const addButton = page.getByRole('button', { name: /添加扣减项/ });
  await addButton.click();
  
  // 填写最后一个扣减项
  const deductionNotes = page.locator('input[placeholder*="扣减说明"]');
  const deductionAmounts = page.locator('input[placeholder*="扣减金额"]');
  
  const count = await deductionNotes.count();
  await deductionNotes.nth(count - 1).fill(note);
  await deductionAmounts.nth(count - 1).fill(String(amount));
}

/**
 * 填写批量处理员工数据（用于创建测试Excel）
 * @param {Array<Object>} employees - 员工数据数组
 * @returns {Array<Object>} 格式化后的员工数据
 */
function formatBatchEmployeeData(employees) {
  return employees.map(emp => ({
    '员工工号': emp.employeeId || '',
    '员工姓名': emp.employeeName || '',
    '城市': emp.city || '',
    '请假开始日期': emp.startDate || '',
    '公司申报工资': emp.companyAvgSalary || '',
    '津贴发放方式': emp.paymentMethod || '企业账户',
    '是否难产': emp.isDifficultBirth ? '是' : '否',
    '胎数': emp.numberOfBabies || 1,
    '怀孕时间段': emp.pregnancyPeriod || '7个月以上',
    '部门': emp.department || '',
    '职位': emp.position || '',
    '备注': emp.remark || ''
  }));
}

module.exports = {
  selectCity,
  fillDateField,
  fillAllowanceForm,
  addDeduction,
  formatBatchEmployeeData
};
