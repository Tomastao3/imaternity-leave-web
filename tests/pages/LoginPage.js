/**
 * 登录页面 Page Object
 * 封装登录页面的所有操作和元素定位
 */

class LoginPage {
  /**
   * @param {import('@playwright/test').Page} page - Playwright页面对象
   */
  constructor(page) {
    this.page = page;
    
    // 元素定位器
    this.usernameInput = page.getByLabel('用户名 *');
    this.passwordInput = page.getByLabel('密码');
    this.employeeLoginButton = page.getByRole('button', { name: '员工登录' });
    this.hrLoginButton = page.getByRole('button', { name: 'HR登录' });
    this.errorMessage = page.locator('div').filter({ hasText: /员工信息不存在|请输入用户名|获取员工信息失败/ }).first();
  }

  /**
   * 访问登录页面
   */
  async goto() {
    await this.page.goto('/');
    await this.page.waitForLoadState('domcontentloaded');
  }

  /**
   * 填写用户名
   * @param {string} username - 用户名
   */
  async fillUsername(username) {
    await this.usernameInput.fill(username);
  }

  /**
   * 填写密码
   * @param {string} password - 密码
   */
  async fillPassword(password) {
    await this.passwordInput.fill(password);
  }

  /**
   * 点击员工登录按钮
   */
  async clickEmployeeLogin() {
    await this.employeeLoginButton.click();
  }

  /**
   * 点击HR登录按钮
   */
  async clickHRLogin() {
    await this.hrLoginButton.click();
  }

  /**
   * 员工登录
   * @param {string} username - 用户名
   * @param {string} password - 密码（可选）
   */
  async loginAsEmployee(username, password = '') {
    await this.fillUsername(username);
    if (password) {
      await this.fillPassword(password);
    }
    await this.clickEmployeeLogin();
  }

  /**
   * HR登录
   * @param {string} username - 用户名
   * @param {string} password - 密码（可选）
   */
  async loginAsHR(username, password = '') {
    await this.fillUsername(username);
    if (password) {
      await this.fillPassword(password);
    }
    await this.clickHRLogin();
  }

  /**
   * 获取错误消息文本
   * @returns {Promise<string>} 错误消息
   */
  async getErrorMessage() {
    await this.errorMessage.waitFor({ state: 'visible', timeout: 5000 });
    return await this.errorMessage.textContent();
  }

  /**
   * 检查是否显示错误消息
   * @returns {Promise<boolean>} 是否显示错误
   */
  async hasError() {
    return await this.errorMessage.isVisible();
  }

  /**
   * 等待登录成功（主页面出现）
   */
  async waitForLoginSuccess() {
    // 等待主标签栏出现（不是子标签）
    await this.page.locator('.tabs').first().waitFor({ state: 'visible', timeout: 10000 });
  }

  /**
   * 检查是否已登录
   * @returns {Promise<boolean>} 是否已登录
   */
  async isLoggedIn() {
    const session = await this.page.evaluate(() => {
      const sessionStr = sessionStorage.getItem('maternity-login-session');
      return sessionStr ? JSON.parse(sessionStr) : null;
    });
    return session !== null;
  }

  /**
   * 获取会话信息
   * @returns {Promise<Object|null>} 会话信息
   */
  async getSession() {
    return await this.page.evaluate(() => {
      const sessionStr = sessionStorage.getItem('maternity-login-session');
      return sessionStr ? JSON.parse(sessionStr) : null;
    });
  }
}

module.exports = LoginPage;
