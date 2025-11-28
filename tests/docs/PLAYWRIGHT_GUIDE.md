# Playwright E2E 测试快速上手指南

> 本指南面向完全不了解 Playwright 的开发人员，帮助您快速上手运行和编写端到端测试。

## 📚 目录

- [什么是 Playwright](#什么是-playwright)
- [环境准备](#环境准备)
- [安装步骤](#安装步骤)
- [运行测试](#运行测试)
- [查看测试报告](#查看测试报告)
- [调试测试](#调试测试)
- [编写新测试](#编写新测试)
- [常见问题](#常见问题)

---

## 什么是 Playwright

Playwright 是一个现代化的端到端测试框架，可以自动化浏览器操作来测试 Web 应用程序。

**主要特点：**
- ✅ 自动化浏览器操作（点击、输入、导航等）
- ✅ 支持多种浏览器（Chrome、Firefox、Safari）
- ✅ 自动等待元素出现，减少测试不稳定性
- ✅ 自动截图和录屏，方便问题定位
- ✅ 强大的选择器和断言功能

**简单理解：** Playwright 就像一个机器人，按照你的指令自动操作浏览器，验证应用功能是否正常。

---

## 环境准备

### 1. 检查 Node.js 版本

Playwright 需要 Node.js 14 或更高版本。

```bash
# 检查 Node.js 版本
node --version

# 应该显示 v14.x.x 或更高版本
```

如果版本过低或未安装，请访问 [nodejs.org](https://nodejs.org/) 下载安装。

### 2. 项目依赖

确保项目依赖已安装：

```bash
# 在项目根目录执行
npm install
```

---

## 安装步骤

### 第一步：安装 Playwright 浏览器

首次运行测试前，需要安装 Playwright 的浏览器：

```bash
# 安装 Chromium 浏览器（推荐）
npx playwright install chromium

# 或安装所有浏览器（可选）
npx playwright install
```

**说明：** 这个命令会下载测试专用的浏览器，不会影响您系统中已安装的浏览器。

### 第二步：生成测试配置数据

运行测试前需要生成配置数据：

```bash
npm run reset-config
```

**说明：** 这个命令会从 `ConfigData/` 目录读取 Excel 配置文件，生成测试所需的 JSON 数据。

---

## 运行测试

### 基础命令

```bash
# 运行所有 E2E 测试
npx playwright test

# 运行所有测试（包括后端测试）
npx playwright test tests/

# 只运行前端 E2E 测试
npx playwright test tests/e2e/
```

### 运行特定测试文件

```bash
# 运行登录测试
npx playwright test tests/e2e/01-login.spec.js

# 运行产假津贴计算器测试
npx playwright test tests/e2e/02-allowance-calculator.spec.js

# 运行批量处理测试
npx playwright test tests/e2e/03-batch-processor.spec.js

# 运行数据管理测试
npx playwright test tests/e2e/04-city-data-manager.spec.js

# 运行 AI 助手测试
npx playwright test tests/e2e/05-ai-chat.spec.js
```

### 显示浏览器窗口（调试模式）

默认情况下，测试在无头模式运行（看不到浏览器）。如果想看到浏览器操作：

```bash
# 显示浏览器窗口
npx playwright test --headed

# 显示浏览器并运行特定测试
npx playwright test tests/e2e/01-login.spec.js --headed
```

### 运行特定测试用例

```bash
# 运行包含特定关键词的测试
npx playwright test --grep "登录成功"

# 排除某些测试
npx playwright test --grep-invert "AI助手"
```

---

## 查看测试报告

### HTML 报告（推荐）

```bash
# 运行测试并生成 HTML 报告
npx playwright test --reporter=html

# 查看报告
npx playwright show-report
```

报告会在浏览器中打开，包含：
- ✅ 测试通过/失败统计
- ✅ 每个测试的执行时间
- ✅ 失败测试的截图和错误信息
- ✅ 测试执行的视频录像（如果启用）

### 命令行报告

```bash
# 详细输出
npx playwright test --reporter=list

# 简洁输出
npx playwright test --reporter=line
```

### 查看测试结果文件

测试结果保存在 `test-results/` 目录：
- 截图：失败测试的截图
- 视频：失败测试的录像
- 追踪文件：详细的执行追踪

---

## 调试测试

### 方法一：使用 Playwright Inspector（推荐）

```bash
# 启动调试模式
npx playwright test --debug

# 调试特定测试
npx playwright test tests/e2e/01-login.spec.js --debug
```

**调试界面功能：**
- ⏯️ 逐步执行测试代码
- 🔍 查看页面元素
- 📝 查看测试日志
- 🎯 定位选择器

### 方法二：在代码中添加断点

在测试代码中添加 `await page.pause()`：

```javascript
test('我的测试', async ({ page }) => {
  await page.goto('/');
  await page.pause(); // 测试会在这里暂停
  // ... 其他代码
});
```

### 方法三：查看浏览器控制台

```bash
# 显示浏览器并打开开发者工具
PWDEBUG=console npx playwright test --headed
```

### 方法四：慢速执行

```bash
# 每个操作延迟 1000 毫秒
npx playwright test --headed --slow-mo=1000
```

---

## 编写新测试

### 测试文件结构

```javascript
// 1. 导入必要的模块
const { test, expect } = require('@playwright/test');
const LoginPage = require('../pages/LoginPage');

// 2. 定义测试套件
test.describe('功能模块名称', () => {
  
  // 3. 每个测试前的准备工作
  test.beforeEach(async ({ page }) => {
    // 初始化页面对象
    // 清除缓存
    // 登录等
  });

  // 4. 编写测试用例
  test('测试用例描述', async ({ page }) => {
    // 执行操作
    await page.goto('/');
    
    // 验证结果
    await expect(page.locator('h1')).toBeVisible();
  });
});
```

### 使用 Page Object 模式

本项目使用 Page Object 模式，让测试代码更清晰：

```javascript
// 好的做法：使用 Page Object
const loginPage = new LoginPage(page);
await loginPage.loginAsHR('测试用户');
await loginPage.waitForLoginSuccess();

// 不推荐：直接操作页面元素
await page.getByLabel('用户名').fill('测试用户');
await page.getByRole('button', { name: 'HR登录' }).click();
```

### 常用断言

```javascript
// 元素可见性
await expect(page.locator('.result')).toBeVisible();
await expect(page.locator('.loading')).not.toBeVisible();

// 文本内容
await expect(page.locator('h1')).toHaveText('产假计算系统');
await expect(page.locator('.message')).toContainText('成功');

// 输入框值
await expect(page.locator('input')).toHaveValue('测试');

// 元素数量
await expect(page.locator('.item')).toHaveCount(5);

// URL
await expect(page).toHaveURL('/dashboard');
```

### 常用操作

```javascript
// 导航
await page.goto('/');

// 点击
await page.getByRole('button', { name: '登录' }).click();

// 输入
await page.getByLabel('用户名').fill('test');

// 选择下拉框
await page.getByLabel('城市').selectOption('上海');

// 勾选复选框
await page.getByLabel('是否难产').check();

// 上传文件
await page.locator('input[type="file"]').setInputFiles('path/to/file.xlsx');

// 等待
await page.waitForTimeout(1000); // 等待 1 秒
await page.waitForSelector('.result'); // 等待元素出现
```

---

## 常见问题

### Q1: 测试运行失败，提示 "浏览器未安装"

**解决方法：**
```bash
npx playwright install chromium
```

### Q2: 测试超时失败

**原因：** 页面加载慢或元素未出现

**解决方法：**
1. 增加超时时间：
```javascript
await page.waitForSelector('.result', { timeout: 10000 });
```

2. 检查选择器是否正确：
```bash
npx playwright test --debug
```

### Q3: 找不到元素

**解决方法：**
1. 使用 Playwright Inspector 查看页面结构：
```bash
npx playwright test --debug
```

2. 尝试不同的选择器：
```javascript
// 通过角色
page.getByRole('button', { name: '登录' })

// 通过标签
page.getByLabel('用户名')

// 通过文本
page.getByText('产假计算系统')

// 通过 CSS
page.locator('.login-button')
```

### Q4: 测试在本地通过，但在 CI 失败

**原因：** 环境差异、时序问题

**解决方法：**
1. 增加等待时间
2. 使用 `waitForLoadState`：
```javascript
await page.waitForLoadState('networkidle');
```

3. 禁用动画：
```javascript
await page.addStyleTag({ content: '* { animation: none !important; }' });
```

### Q5: 如何查看失败测试的截图？

**位置：** `test-results/` 目录

**或者查看 HTML 报告：**
```bash
npx playwright show-report
```

### Q6: 测试运行很慢

**优化方法：**
1. 减少 `waitForTimeout` 的使用
2. 使用并行执行（谨慎使用，可能导致数据冲突）
3. 只运行需要的测试

### Q7: 如何跳过某个测试？

```javascript
// 跳过单个测试
test.skip('暂时跳过的测试', async ({ page }) => {
  // ...
});

// 条件跳过
test('测试名称', async ({ page }) => {
  if (某个条件) {
    test.skip();
  }
  // ...
});
```

### Q8: 如何只运行一个测试？

```javascript
// 使用 test.only
test.only('只运行这个测试', async ({ page }) => {
  // ...
});
```

或使用命令行：
```bash
npx playwright test --grep "测试名称"
```

---

## 测试最佳实践

### ✅ 推荐做法

1. **使用语义化选择器**
   ```javascript
   // 好
   page.getByRole('button', { name: '登录' })
   page.getByLabel('用户名')
   
   // 不好
   page.locator('#btn-123')
   ```

2. **避免硬编码等待**
   ```javascript
   // 好
   await page.waitForSelector('.result')
   
   // 不好
   await page.waitForTimeout(5000)
   ```

3. **使用 Page Object 模式**
   - 提高代码复用性
   - 降低维护成本

4. **每个测试独立**
   - 不依赖其他测试的结果
   - 可以单独运行

5. **清理测试数据**
   - 测试后回滚数据
   - 使用测试专用数据

### ❌ 避免的做法

1. 不要使用脆弱的选择器（如 `nth-child(3)`）
2. 不要在测试间共享状态
3. 不要测试第三方服务（使用 mock）
4. 不要忽略失败的测试

---

## 进阶学习

### 官方文档
- [Playwright 官方文档](https://playwright.dev/)
- [Playwright API 参考](https://playwright.dev/docs/api/class-playwright)

### 本项目资源
- `tests/pages/` - Page Object 示例
- `tests/helpers/` - 辅助工具函数
- `tests/fixtures/` - 测试数据
- `tests/docs/TEST_SCENARIOS.md` - 测试场景详解

---

## 快速命令参考

```bash
# 安装浏览器
npx playwright install chromium

# 生成配置数据
npm run reset-config

# 运行所有测试
npx playwright test

# 运行并显示浏览器
npx playwright test --headed

# 调试模式
npx playwright test --debug

# 查看报告
npx playwright show-report

# 运行特定文件
npx playwright test tests/e2e/01-login.spec.js

# 运行特定测试
npx playwright test --grep "登录成功"
```

---

## 获取帮助

如果遇到问题：

1. 查看本文档的"常见问题"部分
2. 查看 `tests/docs/TEST_SCENARIOS.md` 了解测试场景
3. 使用 `--debug` 模式调试
4. 查看 Playwright 官方文档
5. 联系项目维护人员

---

**祝您测试顺利！** 🎉
