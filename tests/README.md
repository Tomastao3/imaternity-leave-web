# 测试目录说明

本目录包含产假计算系统的所有测试代码，包括前端E2E测试和后端测试。

## 📁 目录结构

```
tests/
├── e2e/                          # 前端E2E测试（Playwright）
│   ├── 01-login.spec.js         # 登录功能测试
│   ├── 02-allowance-calculator.spec.js  # 产假津贴计算器测试
│   ├── 03-batch-processor.spec.js       # 批量处理测试
│   ├── 04-city-data-manager.spec.js     # 数据管理测试
│   └── 05-ai-chat.spec.js              # AI助手测试
├── pages/                        # Page Object模式
│   ├── LoginPage.js
│   ├── AllowanceCalculatorPage.js
│   ├── BatchProcessorPage.js
│   ├── CityDataManagerPage.js
│   └── AIChatPage.js
├── helpers/                      # 测试辅助工具
│   ├── auth.helper.js           # 登录辅助
│   ├── form.helper.js           # 表单填写辅助
│   ├── assertion.helper.js      # 断言辅助
│   └── file.helper.js           # 文件操作辅助
├── fixtures/                     # 测试数据
│   ├── cityCases.json           # 城市规则测试用例
│   ├── allowanceBreakdownCases.json  # 津贴分解测试用例
│   ├── e2e/                     # E2E专用测试数据
│   │   ├── employees.json       # 测试员工数据
│   │   ├── cityRules.json       # 城市规则数据
│   │   └── batchSample.xlsx     # 批量处理测试Excel
│   └── generated/               # 自动生成的配置数据
│       └── configData.json
├── scripts/                      # 测试脚本
│   └── reset-config.js          # 配置数据生成脚本
├── docs/                         # 测试文档
│   ├── PLAYWRIGHT_GUIDE.md      # Playwright快速上手指南
│   └── TEST_SCENARIOS.md        # 测试场景详细说明
├── global-setup.js              # 全局设置
├── allowance.spec.js            # 后端测试（已存在）
├── test-holiday-*.js            # 后端节假日测试（已存在）
└── README.md                    # 本文件
```

## 🚀 快速开始

### 1. 安装依赖

```bash
# 在项目根目录执行
npm install

# 安装Playwright浏览器
npx playwright install chromium
```

### 2. 生成测试配置

```bash
npm run reset-config
```

### 3. 运行测试

```bash
# 运行所有E2E测试
npm run test:e2e

# 运行并显示浏览器
npm run test:e2e:headed

# 调试模式
npm run test:e2e:debug

# 查看测试报告
npm run test:report
```

## 📚 文档

- **[Playwright快速上手指南](./docs/PLAYWRIGHT_GUIDE.md)** - 零基础入门，包含安装、运行、调试等
- **[测试场景详细说明](./docs/TEST_SCENARIOS.md)** - 每个测试的业务含义和数据准备
- **[测试计划](../TEST_PLAN.md)** - 整体测试策略和覆盖范围
- **[实施指南](./IMPLEMENTATION_GUIDE.md)** - 测试实施细节

## 🎯 测试覆盖

### 前端E2E测试

| 测试文件 | 测试场景 | 状态 |
|---------|---------|------|
| 01-login.spec.js | 登录/登出、权限验证 | ✅ |
| 02-allowance-calculator.spec.js | 产假津贴计算、多城市规则 | ✅ |
| 03-batch-processor.spec.js | 批量处理、Excel导入导出 | ✅ |
| 04-city-data-manager.spec.js | 数据管理CRUD操作 | ✅ |
| 05-ai-chat.spec.js | AI助手问答（含Mock） | ✅ |

### 城市规则覆盖

- ✅ 上海（标准公式）
- ✅ 深圳（标准公式）
- ✅ 成都（特殊公式 `* 12 / 365`）
- ✅ 天津（特殊公式 `/ 30.4`）

### 用户角色覆盖

- ✅ 员工角色（受限权限）
- ✅ HR角色（完整权限）

## 🛠️ 测试技术栈

- **Playwright** - E2E测试框架
- **Page Object模式** - 提高代码复用性和可维护性
- **Mock API** - AI服务不可用时自动使用Mock
- **测试数据隔离** - 所有测试数据与实际数据严格分离

## 📝 测试原则

1. **独立性** - 每个测试独立运行，不依赖其他测试
2. **可重复性** - 测试结果稳定可重复
3. **数据隔离** - 测试数据与生产数据严格分离
4. **自动回滚** - 测试后自动清理数据
5. **清晰性** - 测试意图明确，易于理解

## 🔧 常用命令

```bash
# 运行特定测试文件
npx playwright test tests/e2e/01-login.spec.js

# 运行包含特定关键词的测试
npx playwright test --grep "登录成功"

# 显示浏览器窗口
npx playwright test --headed

# 调试模式
npx playwright test --debug

# 生成HTML报告
npx playwright test --reporter=html

# 查看报告
npx playwright show-report

# 慢速执行（方便观察）
npx playwright test --headed --slow-mo=1000
```

## 🐛 调试技巧

### 1. 使用Playwright Inspector

```bash
npx playwright test --debug
```

### 2. 在代码中添加断点

```javascript
await page.pause(); // 测试会在这里暂停
```

### 3. 查看失败测试的截图和视频

失败测试的截图和视频保存在 `test-results/` 目录。

### 4. 查看HTML报告

```bash
npx playwright show-report
```

## ⚠️ 注意事项

### 测试数据

1. **所有测试数据都有明确前缀**
   - 员工ID：`TEST_EMP_`、`TEST_BATCH_`
   - 城市名：`TEST_CITY_`

2. **测试数据不会污染实际系统**
   - 测试后自动回滚
   - 与生产数据严格隔离

3. **测试数据仅存放在 `tests/` 目录**
   - 不修改 `ConfigData/` 目录
   - 测试专用数据在 `tests/fixtures/e2e/`

### AI助手测试

AI服务地址：`http://127.0.0.1:8000/rag/ask`

如果AI服务不可用，测试会自动使用Mock模式，不会影响测试通过率。

### 并发执行

当前配置为串行执行（`workers: 1`），避免数据冲突。如需并行执行，请确保：
1. 测试数据完全独立
2. 不会相互影响
3. 数据库支持并发操作

## 📊 测试报告

### HTML报告

运行测试后，HTML报告会自动生成在 `test-results/html/` 目录。

查看报告：
```bash
npm run test:report
```

报告包含：
- ✅ 测试通过/失败统计
- ✅ 每个测试的执行时间
- ✅ 失败测试的截图
- ✅ 失败测试的视频录像
- ✅ 详细的错误信息

### JSON报告

JSON格式的测试结果保存在 `test-results/results.json`，可用于CI/CD集成。

## 🔄 CI/CD集成

### GitHub Actions示例

```yaml
name: E2E Tests

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'
      - run: npm ci
      - run: npx playwright install --with-deps chromium
      - run: npm run reset-config
      - run: npm run test:e2e
      - uses: actions/upload-artifact@v3
        if: always()
        with:
          name: playwright-report
          path: test-results/
```

## 🤝 贡献指南

### 添加新测试

1. 在 `tests/e2e/` 创建新的测试文件
2. 使用Page Object模式
3. 在 `tests/fixtures/e2e/` 添加测试数据
4. 更新 `tests/docs/TEST_SCENARIOS.md` 文档
5. 运行测试确保通过

### 更新测试

1. 修改测试代码
2. 更新相关文档
3. 运行测试确保通过
4. 提交前运行完整测试套件

## 📞 获取帮助

如果遇到问题：

1. 查看 [Playwright快速上手指南](./docs/PLAYWRIGHT_GUIDE.md)
2. 查看 [测试场景详细说明](./docs/TEST_SCENARIOS.md)
3. 使用 `--debug` 模式调试
4. 查看 [Playwright官方文档](https://playwright.dev/)
5. 联系项目维护人员

## 📄 许可证

与主项目相同

---

**最后更新：** 2025-10-22
