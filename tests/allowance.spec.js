// @ts-check
const { test, expect } = require('@playwright/test');

// 基础端到端用例：进入首页 -> 选择城市 -> 填写工资 -> 计算 -> 断言结果

test.describe('产假津贴计算 - 基础流程', () => {
  test('填写必要信息并计算，出现结果区域', async ({ page }) => {
    // 打开首页
    await page.goto('/', { waitUntil: 'domcontentloaded' });

    // 断言应用标题
    await expect(page.getByRole('heading', { name: '产假计算系统' })).toBeVisible();

    // 切换到“产假津贴计算”标签（如果未激活）
    const allowanceTab = page.getByRole('button', { name: '产假津贴计算' });
    if (await allowanceTab.isVisible()) {
      await allowanceTab.click();
    }

    // 选择城市
    const citySelect = page.getByLabel('选择城市');
    await expect(citySelect).toBeVisible();
    // 读取第一个非占位项并选择（索引1处）
    const options = citySelect.locator('option');
    const optionCount = await options.count();
    expect(optionCount).toBeGreaterThan(1);
    const firstValue = await options.nth(1).getAttribute('value');
    await citySelect.selectOption(firstValue ?? '');

    // 填写“单位申报的上年度月平均工资”
    const companyAvg = page.getByLabel('单位申报的上年度月平均工资（元/月） *');
    await companyAvg.fill('50000');

    // 填写“员工产前12个月的月均工资”
    const empAvg = page.getByLabel('员工产前12个月的月均工资（元/月） *');
    await empAvg.fill('20000');

    // 点击“计算津贴补差”
    await page.getByRole('button', { name: '计算津贴补差' }).click();

    // 断言出现结果区块
    await expect(page.getByRole('heading', { name: '计算结果' })).toBeVisible();
    await expect(page.getByText('享受产假天数：')).toBeVisible();
  });
});
