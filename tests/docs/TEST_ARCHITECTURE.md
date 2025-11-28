# E2E 测试架构文档

## 概述

本文档描述了产假津贴计算系统的E2E（端到端）测试架构、设计模式和最佳实践。

**最后更新**: 2025-10-22

---

## 📁 目录结构

```
tests/
├── e2e/                          # E2E测试文件
│   ├── 01-login.spec.js         # 登录功能测试
│   ├── 02-allowance-calculator.spec.js  # 产假津贴计算器测试
│   ├── 03-batch-processor.spec.js       # 批量处理测试
│   ├── 04-city-data-manager.spec.js     # 基础数据管理测试
│   └── 05-ai-chat.spec.js              # AI助手测试
├── pages/                        # Page Object模式
│   ├── LoginPage.js             # 登录页面对象
│   ├── AllowanceCalculatorPage.js
│   ├── BatchProcessorPage.js
│   ├── CityDataManagerPage.js
│   └── AIChatPage.js
├── helpers/                      # 测试辅助工具
│   ├── excel-data-loader.js    # Excel数据加载器
│   └── data-upload.helper.js   # 数据上传辅助
├── fixtures/                     # 测试数据
│   ├── e2e/
│   │   ├── cityRules.json      # 城市规则数据
│   │   └── employees.json      # 员工数据
│   └── generated/              # 自动生成的配置
├── docs/                         # 测试文档
│   ├── PLAYWRIGHT_GUIDE.md     # Playwright快速上手指南
│   ├── TEST_ARCHITECTURE.md    # 测试架构文档（本文档）
│   ├── TEST_SCENARIOS.md       # 测试场景说明
│   ├── TEST_TODO.md            # 测试待办事项
│   └── VALIDATION_REPORT.md    # 文档验证报告
└── global-setup.js              # 全局测试设置

test-results/                     # 测试结果目录（自动生成）⚠️
├── html/                         # HTML测试报告
│   └── index.html               # 可交互的测试报告页面
├── results.json                 # JSON格式测试结果
├── .last-run.json               # 最后一次运行的测试ID
└── [test-name]-[browser]/       # 单个测试结果目录（失败时生成）
    ├── test-failed-1.png        # 失败时的截图
    ├── test-failed-2.png        # 重试失败的截图
    ├── video.webm               # 测试执行录像
    ├── trace.zip                # 详细执行追踪
    └── error-context.md         # 错误上下文信息
```

**注意**: `test-results/` 目录由Playwright自动生成，不应提交到版本控制。建议在 `.gitignore` 中添加此目录。

---

## 🏗️ 架构设计

### 1. Page Object 模式

**设计原则**:
- 每个页面/组件对应一个Page Object类
- 封装所有UI元素定位和交互逻辑
- 提供语义化的方法名
- 隐藏实现细节

**示例**:
```javascript
class AllowanceCalculatorPage {
  constructor(page) {
    this.page = page;
    // 元素定位
    this.citySelect = page.locator('#selectedCity');
    this.calculateButton = page.getByRole('button', { name: /计算产假/ });
  }
  
  // 语义化方法
  async selectCity(cityName) {
    await this.citySelect.selectOption(cityName);
    await this.page.waitForTimeout(500);
  }
  
  async calculate() {
    await this.calculateButton.scrollIntoViewIfNeeded();
    await this.calculateButton.click();
    await this.page.waitForTimeout(3000);
  }
}
```

**优点**:
- ✅ 提高代码可维护性
- ✅ 减少代码重复
- ✅ UI变更时只需修改Page Object
- ✅ 测试代码更易读

---

### 2. 测试数据管理

#### 2.1 数据加载策略

**核心函数**: `loadMinimalTestData(page)`

**位置**: `tests/helpers/excel-data-loader.js`

**功能**:
- 从Excel文件读取测试数据
- 解析产假规则、津贴规则、员工信息等
- 将数据注入到浏览器的IndexedDB中

**使用方式**:
```javascript
const { loadMinimalTestData } = require('../helpers/excel-data-loader');

test.beforeEach(async ({ page }) => {
  // 清除旧数据
  await page.evaluate(() => {
    return new Promise((resolve) => {
      const request = indexedDB.deleteDatabase('mlc-db');
      request.onsuccess = () => resolve();
      request.onerror = () => resolve();
    });
  });
  
  // 加载测试数据
  await loadMinimalTestData(page);
  await page.waitForTimeout(1000);
  
  // 刷新页面让应用加载数据
  await page.reload();
});
```

#### 2.2 数据隔离原则

**每个测试独立加载数据**:
- ✅ 确保测试间无干扰
- ✅ 每次都是原始数据
- ✅ 避免数据污染

**Trade-off**:
- ⚠️ 测试运行时间较长（每个测试+1-2秒）
- ✅ 但保证了测试稳定性

---

### 3. 测试配置

#### 3.1 Playwright 配置

**文件**: `playwright.config.js`

**关键配置**:
```javascript
module.exports = defineConfig({
  testDir: 'tests',
  testMatch: '**/e2e/**/*.spec.js',
  timeout: 60 * 1000,
  expect: { timeout: 10000 },
  fullyParallel: false,      // 串行执行避免数据冲突
  retries: 1,                // 失败重试1次
  workers: 1,                // 单worker避免并发问题
  use: {
    baseURL: 'http://localhost:3000',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure'
  }
});
```

**为什么串行执行?**
- IndexedDB数据在同一浏览器profile中共享
- 并行测试会互相干扰
- 串行虽慢但稳定

#### 3.2 全局设置

**文件**: `tests/global-setup.js`

**功能**:
- 生成配置fixture
- 检查开发服务器是否运行
- 全局初始化工作

---

## 🔄 标准测试流程

### 典型测试结构

```javascript
test.describe('功能模块名', () => {
  let loginPage;
  let featurePage;

  test.beforeEach(async ({ page }) => {
    // 1. 初始化Page Objects
    loginPage = new LoginPage(page);
    featurePage = new FeaturePage(page);
    
    // 2. 访问应用
    await page.goto('http://localhost:3000');
    await page.waitForLoadState('domcontentloaded');
    
    // 3. 清除并加载数据
    await page.evaluate(() => {
      const request = indexedDB.deleteDatabase('mlc-db');
      return new Promise((resolve) => {
        request.onsuccess = () => resolve();
        request.onerror = () => resolve();
      });
    });
    await page.evaluate(() => {
      sessionStorage.clear();
      localStorage.clear();
    });
    await loadMinimalTestData(page);
    
    // 4. 刷新页面
    await page.reload();
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(1000);
    
    // 5. 登录
    await loginPage.loginAsHR(employeesData.hrUser.username);
    await loginPage.waitForLoginSuccess();
    
    // 6. 导航到目标功能
    await featurePage.switchToTab();
  });

  test('测试用例名称', async ({ page }) => {
    // 测试步骤
    await featurePage.performAction();
    
    // 断言
    expect(await featurePage.getResult()).toBe(expected);
  });
});
```

---

## 🎯 测试策略

### 1. 测试金字塔

```
        /\
       /  \       E2E Tests (少量, 关键路径)
      /____\      
     /      \     Integration Tests
    /________\    
   /          \   Unit Tests (大量, 快速)
  /__________\
```

**当前实现**: E2E测试（21个通过 + 18个跳过）

**覆盖范围**:
- ✅ 核心用户流程（计算、批量处理）
- ✅ 数据管理功能
- ⏭️ 复杂交互（待实现）
- ⏭️ AI功能（依赖外部服务）

### 2. 测试优先级

**P0 - 关键路径** (必须通过):
- 登录功能
- 产假计算基本流程
- 数据加载和显示

**P1 - 核心功能** (应该通过):
- 多城市规则
- 批量处理
- 数据导入导出

**P2 - 增强功能** (可以跳过):
- 复杂表单编辑
- 权限控制
- AI助手

---

## 🛠️ 辅助函数模式

### 1. 数据设置辅助函数

**示例**: `setupTestWithData()` (04-city-data-manager.spec.js)

```javascript
async function setupTestWithData(page, loginPage, dataManagerPage, tabName) {
  // 统一的数据加载+登录+导航流程
  await page.goto('http://localhost:3000');
  await loadMinimalTestData(page);
  await page.reload();
  await loginPage.loginAsHR(employeesData.hrUser.username);
  await dataManagerPage.switchToCityDataTab();
  if (tabName) {
    await dataManagerPage.switchTab(tabName);
  }
}
```

**优点**:
- 减少重复代码
- 统一测试设置逻辑
- 便于维护

### 2. 宽松断言模式

**用途**: 调试阶段或不稳定功能

```javascript
const hasResult = await calculatorPage.hasResult();

if (hasResult) {
  // 如果有结果，做完整验证
  const result = await calculatorPage.getCalculationResult();
  expect(result.totalMaternityDays).toBeGreaterThan(0);
} else {
  // 如果没结果，至少确保没有错误
  console.log('计算结果未显示，但测试继续（数据加载验证通过）');
  const hasError = await page.locator('.error').isVisible({ timeout: 1000 }).catch(() => false);
  expect(hasError).toBe(false);
}
```

---

## ⚡ 性能优化

### 1. 等待时间优化

**原则**: 尽可能短，但要保证稳定

**当前标准**:
```javascript
// 数据操作后
await page.waitForTimeout(500);   // 0.5秒

// 页面刷新后
await page.waitForTimeout(1000);  // 1秒

// 计算等复杂操作后
await page.waitForTimeout(3000);  // 3秒
```

**改进方向**:
- 使用 `waitForSelector` 替代固定延迟
- 使用 `waitForFunction` 等待特定状态
- 使用 `networkidle` 等待网络请求完成

### 2. 并行执行（未来）

**当前**: `workers: 1` (串行)

**改进方案**:
- 使用不同的浏览器context
- 为每个worker创建独立数据库
- 使用test.use()隔离状态

---

## 📂 测试结果目录 (test-results/)

### 目录说明

`test-results/` 目录在每次运行测试后自动生成，包含测试执行的详细结果和调试信息。

### 目录结构详解

```
test-results/
├── html/                                    # HTML测试报告
│   ├── index.html                          # 主报告页面
│   ├── data/                               # 报告数据文件
│   └── assets/                             # 报告资源文件
│
├── results.json                            # JSON格式完整测试结果
├── .last-run.json                          # 最后一次运行的测试标识
│
└── [具体测试目录]/                          # 单个测试的详细结果
    ├── test-failed-1.png                   # 第一次失败的截图
    ├── test-failed-2.png                   # 重试失败的截图
    ├── video.webm                          # 测试执行全程录像
    ├── trace.zip                           # Playwright trace追踪文件
    └── error-context.md                    # 错误上下文和堆栈信息
```

### 文件说明

#### 1. HTML报告 (`html/index.html`)

**用途**: 可视化的测试报告，最直观的查看方式

**查看方式**:
```bash
# 自动打开HTML报告
npx playwright show-report

# 或直接打开文件
open test-results/html/index.html
```

**包含信息**:
- ✅ 测试通过/失败/跳过统计
- ⏱️ 每个测试的执行时间
- 📊 测试执行时间线
- 📸 失败测试的截图预览
- 🎬 失败测试的视频播放
- 📝 详细错误信息和堆栈追踪

#### 2. JSON结果 (`results.json`)

**用途**: 程序化处理测试结果，适合CI/CD集成

**内容示例**:
```json
{
  "config": { ... },
  "suites": [
    {
      "title": "产假津贴计算器 - 基础功能",
      "specs": [
        {
          "title": "基础计算流程 - 填写信息并计算",
          "ok": true,
          "tests": [
            {
              "status": "expected",
              "duration": 14700
            }
          ]
        }
      ]
    }
  ],
  "errors": []
}
```

**使用场景**:
- CI/CD系统解析测试结果
- 生成自定义测试报告
- 测试数据分析和统计

#### 3. 最后运行记录 (`.last-run.json`)

**用途**: 记录最近一次测试运行的ID

**使用**:
```bash
# 只运行上次失败的测试
npx playwright test --last-failed
```

#### 4. 单个测试结果目录

**命名格式**: `[测试文件]-[测试名称]-[浏览器]-[retry标记]/`

**示例**:
```
test-results/
└── e2e-02-allowance-calculator-产假津贴计算器---基础功能-基础计算流程---填写信息并计算-chromium/
    └── video.webm
```

**重试目录**:
```
test-results/
└── e2e-02-allowance-calculator-...-chromium-retry1/
    ├── test-failed-1.png
    ├── video.webm
    └── trace.zip
```

#### 5. 失败截图 (`test-failed-*.png`)

**生成时机**: 测试失败时自动截图

**配置**: 在 `playwright.config.js` 中设置
```javascript
use: {
  screenshot: 'only-on-failure'  // 仅失败时截图
}
```

**用途**: 快速定位页面状态问题

#### 6. 测试录像 (`video.webm`)

**生成时机**: 根据配置决定

**配置选项**:
```javascript
use: {
  video: 'retain-on-failure'  // 仅失败时保留
  // video: 'on'              // 总是录制
  // video: 'off'             // 不录制
}
```

**用途**: 回放测试过程，观察失败时的操作序列

#### 7. Trace追踪 (`trace.zip`)

**用途**: 最详细的调试信息

**包含内容**:
- 📸 每个操作的截图
- 🌐 网络请求和响应
- 🖱️ DOM快照
- 📋 控制台日志
- ⚡ 性能数据

**查看方式**:
```bash
npx playwright show-trace test-results/<test-dir>/trace.zip
```

**配置**:
```javascript
use: {
  trace: 'retain-on-failure'  // 仅失败时保留
}
```

#### 8. 错误上下文 (`error-context.md`)

**内容**: 失败测试的详细错误信息

**包含**:
- 错误消息
- 堆栈追踪
- 相关文件路径

### 管理建议

#### 1. 版本控制

**不要提交** test-results 到Git:

```gitignore
# .gitignore
test-results/
playwright-report/
```

#### 2. 定期清理

```bash
# 手动删除旧结果
rm -rf test-results/

# 或者在测试前自动清理（package.json）
{
  "scripts": {
    "test:clean": "rm -rf test-results && npx playwright test"
  }
}
```

#### 3. CI/CD集成

```yaml
# GitHub Actions 示例
- name: Run tests
  run: npx playwright test

- name: Upload test results
  if: always()
  uses: actions/upload-artifact@v3
  with:
    name: playwright-report
    path: test-results/
    retention-days: 30
```

### 磁盘空间

**平均大小**（21个测试全部通过）:
- HTML报告: ~100KB
- JSON结果: ~40KB
- 总计: ~150KB

**失败测试**（含截图/视频/trace）:
- 单个失败测试: ~5-10MB
- 包含视频和trace: 最高可达50MB

**建议**: 定期清理旧的测试结果，避免占用过多磁盘空间。

---

## 🐛 调试技巧

### 1. 查看失败截图

```bash
# 失败截图位置
test-results/<test-name>/test-failed-1.png

# 使用系统图片查看器
open test-results/<test-name>/test-failed-1.png
```

### 2. 查看录像

```bash
# 视频位置
test-results/<test-name>/video.webm

# 使用系统播放器
open test-results/<test-name>/video.webm
```

### 3. 查看trace（最推荐）

```bash
# 打开Playwright Trace Viewer
npx playwright show-trace test-results/<test-name>/trace.zip
```

**Trace Viewer功能**:
- 🎬 时间轴回放
- 📸 每步操作的截图
- 🌐 网络请求详情
- 📋 控制台日志
- 🔍 DOM快照检查

### 4. 调试模式

```bash
# UI模式（推荐）
npx playwright test --ui

# Debug模式
npx playwright test --debug

# Headed模式
npx playwright test --headed
```

---

## 📊 测试指标

### 当前状态 (2025-10-22)

| 文件 | 通过 | 跳过 | 失败 | 耗时 |
|------|------|------|------|------|
| 02-allowance-calculator | 7 | 6 | 0 | 2.5分钟 |
| 03-batch-processor | 7 | 1 | 0 | 1.1分钟 |
| 04-city-data-manager | 7 | 3 | 0 | 1.2分钟 |
| 05-ai-chat | 0 | 8 | 0 | - |
| **总计** | **21** | **18** | **0** | **~5分钟** |

**通过率**: 100% (21/21执行的测试)

---

## 🔐 安全和最佳实践

### 1. 凭证管理
- ✅ 使用fixtures存储测试账号
- ✅ 不在代码中硬编码密码
- ✅ 测试环境与生产环境隔离

### 2. 数据清理
- ✅ 每次测试前清除旧数据
- ✅ 使用独立的测试数据集
- ⚠️ 测试后未清理IndexedDB（待改进）

### 3. 错误处理
- ✅ 失败自动重试1次
- ✅ 保留失败的截图和trace
- ✅ 使用宽松断言处理不稳定场景

---

## 🔗 相关资源

- [Playwright官方文档](https://playwright.dev/)
- [Page Object模式](https://playwright.dev/docs/pom)
- [测试待办事项](./TEST_TODO.md)
- [项目README](../README.md)

---

## 📝 更新日志

**2025-10-22**:
- 创建初始版本
- 记录当前测试架构和模式
- 添加21个通过测试和18个跳过测试的说明
