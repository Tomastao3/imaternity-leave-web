/**
 * AI助手页面 Page Object
 * 封装AI聊天功能的所有操作和元素定位
 */

class AIChatPage {
  /**
   * @param {import('@playwright/test').Page} page - Playwright页面对象
   */
  constructor(page) {
    this.page = page;
    
    // 标签
    this.aiTab = page.getByRole('button', { name: '智能助手' });
    
    // 输入和按钮
    this.messageInput = page.locator('input[type="text"], textarea').filter({ hasText: '' }).first();
    this.sendButton = page.getByRole('button', { name: /发送|提交/ });
    
    // 消息区域
    this.messagesContainer = page.locator('.message-bubble').first().locator('..');
    this.userMessages = page.locator('.message-bubble.user');
    this.assistantMessages = page.locator('.message-bubble.assistant');
  }

  /**
   * 切换到AI助手标签
   */
  async switchToAITab() {
    const isVisible = await this.aiTab.isVisible({ timeout: 2000 }).catch(() => false);
    if (isVisible) {
      await this.aiTab.click();
      await this.page.waitForTimeout(500);
    }
  }

  /**
   * 发送消息
   * @param {string} message - 消息内容
   */
  async sendMessage(message) {
    await this.messageInput.fill(message);
    await this.sendButton.click();
  }

  /**
   * 等待AI回复
   * @param {number} timeout - 超时时间（毫秒）
   */
  async waitForResponse(timeout = 10000) {
    const initialCount = await this.assistantMessages.count();
    
    // 等待新的助手消息出现
    await this.page.waitForFunction(
      (expectedCount) => {
        const messages = document.querySelectorAll('.message-bubble.assistant');
        return messages.length > expectedCount;
      },
      initialCount,
      { timeout }
    );
  }

  /**
   * 获取最后一条助手回复
   * @returns {Promise<string>} 回复内容
   */
  async getLastResponse() {
    const count = await this.assistantMessages.count();
    if (count === 0) {
      return '';
    }
    
    const lastMessage = this.assistantMessages.nth(count - 1);
    return await lastMessage.textContent();
  }

  /**
   * 获取所有用户消息
   * @returns {Promise<Array<string>>} 用户消息数组
   */
  async getUserMessages() {
    const count = await this.userMessages.count();
    const messages = [];
    
    for (let i = 0; i < count; i++) {
      const text = await this.userMessages.nth(i).textContent();
      messages.push(text);
    }
    
    return messages;
  }

  /**
   * 获取所有助手消息
   * @returns {Promise<Array<string>>} 助手消息数组
   */
  async getAssistantMessages() {
    const count = await this.assistantMessages.count();
    const messages = [];
    
    for (let i = 0; i < count; i++) {
      const text = await this.assistantMessages.nth(i).textContent();
      messages.push(text);
    }
    
    return messages;
  }

  /**
   * 获取消息历史
   * @returns {Promise<Array<Object>>} 消息历史数组
   */
  async getMessageHistory() {
    const userMsgs = await this.getUserMessages();
    const assistantMsgs = await this.getAssistantMessages();
    
    const history = [];
    const maxLength = Math.max(userMsgs.length, assistantMsgs.length);
    
    for (let i = 0; i < maxLength; i++) {
      if (i < userMsgs.length) {
        history.push({ role: 'user', content: userMsgs[i] });
      }
      if (i < assistantMsgs.length) {
        history.push({ role: 'assistant', content: assistantMsgs[i] });
      }
    }
    
    return history;
  }

  /**
   * 检查是否正在加载
   * @returns {Promise<boolean>} 是否正在加载
   */
  async isLoading() {
    const loadingIndicator = this.page.locator('.loading, [class*="loading"]');
    return await loadingIndicator.isVisible({ timeout: 1000 }).catch(() => false);
  }

  /**
   * 检查是否有错误消息
   * @returns {Promise<boolean>} 是否有错误
   */
  async hasError() {
    const errorMessage = this.page.locator('.error, [style*="color: red"]');
    return await errorMessage.isVisible({ timeout: 1000 }).catch(() => false);
  }

  /**
   * 获取错误消息
   * @returns {Promise<string>} 错误消息
   */
  async getErrorMessage() {
    const errorMessage = this.page.locator('.error, [style*="color: red"]');
    if (await errorMessage.isVisible({ timeout: 1000 }).catch(() => false)) {
      return await errorMessage.textContent();
    }
    return '';
  }

  /**
   * 清除消息历史（如果有清除按钮）
   */
  async clearHistory() {
    const clearButton = this.page.getByRole('button', { name: /清除|清空/ });
    if (await clearButton.isVisible({ timeout: 1000 }).catch(() => false)) {
      await clearButton.click();
      await this.page.waitForTimeout(500);
    }
  }
}

module.exports = AIChatPage;
