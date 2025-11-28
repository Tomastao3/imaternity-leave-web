/**
 * 认证辅助工具
 * 提供登录、登出等认证相关的辅助函数
 */

/**
 * 员工登录
 * @param {import('@playwright/test').Page} page - Playwright页面对象
 * @param {string} username - 用户名
 */
async function loginAsEmployee(page, username) {
  await page.goto('/');
  await page.waitForLoadState('domcontentloaded');
  
  // 填写用户名
  await page.getByLabel('用户名 *').fill(username);
  
  // 点击员工登录按钮
  await page.getByRole('button', { name: '员工登录' }).click();
  
  // 等待登录完成（等待登录页面消失或主页面出现）
  await page.locator('.tabs').first().waitFor({ state: 'visible', timeout: 10000 });
}

/**
 * HR登录
 * @param {import('@playwright/test').Page} page - Playwright页面对象
 * @param {string} username - 用户名
 */
async function loginAsHR(page, username) {
  await page.goto('/');
  await page.waitForLoadState('domcontentloaded');
  
  // 填写用户名
  await page.getByLabel('用户名 *').fill(username);
  
  // 点击HR登录按钮
  await page.getByRole('button', { name: 'HR登录' }).click();
  
  // 等待登录完成
  await page.locator('.tabs').first().waitFor({ state: 'visible', timeout: 10000 });
}

/**
 * 登出
 * @param {import('@playwright/test').Page} page - Playwright页面对象
 */
async function logout(page) {
  // 查找并点击登出按钮（可能在header中）
  const logoutButton = page.getByRole('button', { name: /登出|退出/ });
  if (await logoutButton.isVisible()) {
    await logoutButton.click();
  }
  
  // 等待返回登录页面
  await page.waitForSelector('input[id="username"]', { timeout: 5000 });
}

/**
 * 获取当前会话信息
 * @param {import('@playwright/test').Page} page - Playwright页面对象
 * @returns {Promise<Object|null>} 会话信息
 */
async function getSession(page) {
  return await page.evaluate(() => {
    const sessionStr = sessionStorage.getItem('maternity-login-session');
    return sessionStr ? JSON.parse(sessionStr) : null;
  });
}

/**
 * 清除会话
 * @param {import('@playwright/test').Page} page - Playwright页面对象
 */
async function clearSession(page) {
  await page.evaluate(() => {
    sessionStorage.removeItem('maternity-login-session');
  });
}

/**
 * 检查是否已登录
 * @param {import('@playwright/test').Page} page - Playwright页面对象
 * @returns {Promise<boolean>} 是否已登录
 */
async function isLoggedIn(page) {
  const session = await getSession(page);
  return session !== null && session.username !== undefined;
}

module.exports = {
  loginAsEmployee,
  loginAsHR,
  logout,
  getSession,
  clearSession,
  isLoggedIn
};
