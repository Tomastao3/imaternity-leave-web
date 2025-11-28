# 单元与集成测试方案

## 测试范围总览
- **AllowanceCalculator 组件 (`src/components/AllowanceCalculator.js`)**
- **共享分解工具 (`src/utils/allowanceBreakdown.js`)**
- **批量处理逻辑 (`src/utils/batchCalculations.js`)**
- **导出工具 (`src/utils/allowancePdfExporter.js`, `src/utils/allowanceExcelExporter.js`)**
- **城市/规则数据层 (`src/utils/cityDataUtils.js`, `configData/`)**
- **端到端流程（Playwright）**

## 1. AllowanceCalculator 组件
- **场景覆盖**
  - **基本计算流程**：填写城市、`companyAvgSalary`、`socialInsuranceLimit`、`startDate`，调用 `calculateAllowance()`，断言 `setResult()` 后结果区显示政府/员工/补差金额。
  - **员工自动填充**：模拟 `handleEmployeeSelect()`，验证 `setSelectedCity()`、`setEmployeeBasicSalary()` 等字段同步，并且 `buildCalculationArgs()` 生成的参数包含员工工资。
  - **输入校验**：当 `companyAvgSalary` 为空时触发 `setCompanyAvgSalaryError(true)`；`socialInsuranceLimit` 缺失时 `alert` 被调用，`calculateMaternityAllowance` 未触发。
  - **工资/社保覆盖**：输入 `overrideGovernmentPaidAmount`、`overridePersonalSSMonthly`，检验 `buildAllowanceBreakdown()` 结果中政府流程显示“手工填写值”。
  - **扣减项管理**：调用 `addDeduction()`、`handleDeductionChange()`、`removeDeduction()`，确认 `deductions` state 更新后 breakdown 中 `totalDeductions` 与条数匹配。
  - **公司已发工资**：填写 `paidWageDuringLeave`，断言 `supplement` 调整金额与 process 字符串显示减去公司已发金额。

- **交互测试**
  - **导出 PDF**：mock `exportAllowancePdf`，执行 `exportToPDF()`，验证参数包含 `appliedPolicyHtml`、`supplementProcess`、`deductionSummaryDisplay`。
  - **导出 Excel**：mock `exportAllowanceExcel`，断言 `personalSSProcess`、`startMonthProcess` 等字段已传入。
  - **休假日历切换**：点击“展示休假日历”，断言 `LeaveCalendar` 接收 `startDate`、`endDate`，以及延伸规则文本正确渲染。
  - **重置流程**：调用 `reset()` 后检查所有 state 恢复默认，尤其是 `deductions` 重置为一条空记录。

- **公式回归**
  - 成都公式：mock `calculateMaternityAllowance` 返回 `debugInfo.employeeReceivableFormulaType = 'chengduDaily'`，断言员工公式文本使用 `* 12 / 365`。
  - 天津公式：设置城市 `天津`，验证政府公式使用 `30.4` 为除数。
  - 顺延展示：传入 `appliedRules` 含 `isExtendable` 的规则，确认导出时 `extensionDetails` 构建正确。

## 2. allowanceBreakdown 工具
- **单元测试（Jest）**
  - `safeNumber()`：测试 `undefined`、空串、非法字符、`Infinity`。
  - `formatCurrency()`：精度、负数、`digits` 参数。
  - `buildAllowanceBreakdown()`：
    - 无结果时返回占位符。
    - 成都/天津/常规城市的公式差异。
    - override 政府金额时返回“手工填写值”。
    - 多扣减、公司已发工资、无扣减等组合。
    - 返回的 `supplement.details` 包含期望字段。

- **补差细节**
  - `buildSupplementDetails()`：
    - 多条扣减：返回 `deductionDetails` 数组与 `deductionSummary` 拼接文本。
    - 0 金额过滤：输入金额为空或负数应被剔除。
    - 公司已发工资：验证 `companyPaidAmount` 与 `adjustedSupplement` 计算。
    - `paidWageDuringLeave` 为空字符串时视为 0。

## 3. batchCalculations 逻辑
- **输入标准化**
  - `parseNumber()` 对千分符、空格、非法字符处理。
  - `normalizeBoolean()` 大小写、中文“是/否”。

- **`processBatchData()` 集成**
  - Mock `cityDataManager.loadData()`、`calculateMaternityAllowance()`，传入多条记录，确认 `results` 输出的 `adjustedSupplement`、`supplementProcess` 与单次 `buildAllowanceBreakdown()` 输出一致。
  - 校验失败：提供缺少必填字段的员工，`errors` 数组包含 `row`、`errors`。
  - 多扣减/公司已发工资：验证 `deductionsTotal`、`companyPaidAmount` 与补差过程正确反映。
  - override 标记：当提供 `overrideGovernmentPaidAmount` 等覆盖值时，`overrideFlags` 对应布尔值应为 `true`。

## 4. 导出工具
- **PDF (`src/utils/allowancePdfExporter.js`)**
  - Mock `html2pdf.js` 模块，调用 `exportAllowancePdf()`，验证 `html2pdf().set()` 参数包含自定义 `margin`、`filename`，并确保 `content` 节点包含政府金额、补差金额字符串。
  - 验证异常处理：`html2pdf` 抛错时 Promise 被拒绝并记录日志。

- **Excel (`src/utils/allowanceExcelExporter.js`)**
  - Mock `xlsx.utils.book_new`/`xlsx.utils.json_to_sheet`，断言头部字段顺序、保留两位小数，`xlsx.write` 使用 `{ bookType: 'xlsx' }`。
  - 检查补差说明列包含 `supplementProcess`，批量数据中的 `deductionSummaryDisplay` 显示正确。

## 5. 数据层
- **城市规则**
  - `cityDataManager.getAllowanceRulesByCity()`：存在/不存在城市。
  - 广州难产、绍兴奖励假字段组合是否正确解析。
  - `warmUpHolidayPlan()` 中节假日顺延逻辑的输入输出。

## 6. 端到端（Playwright）
- **单个模式流程**
  - 填写表单 -> 点击计算 -> 断言结果卡片内容。
  - 展开休假日历、政策说明。

- **批量模式流程**
  - 上传示例 Excel -> 等待计算 -> 校验表格数据（政府金额、补差）。
  - 点击导出按钮，等待下载事件。

- **命令**：
  - 单元测试：`npm test -- --coverage`
  - 端到端：`npx playwright test`

- **夹具与工具**
  - 在 `tests/fixtures/` 维护成都/天津/广州/绍兴等案例 JSON，用于复用。
  - 使用 `jest.mock()` 模拟 `cityDataManager`、导出模块。
  - 通过 `msw` 或自建 mock（若引入 API）。
  - 集成测试前从 `configData/` 目录加载 Excel/配置：
    - 执行 `npm run reset-config`（见 `package.json`）生成 `tests/fixtures/generated/configData.json`。
    - 或在 Playwright `globalSetup` 中直接读取 `configData/产假规则.xlsx`、`configData/津贴规则.xlsx`、`configData/节假日_all.xlsx` 并注入到 `cityDataManager`。
    - 若测试需要清理或重建数据，提供 `tests/scripts/reset-config.js` 执行导入前的清空操作。

- **持续集成建议**
  - 在 CI（如 GitHub Actions）中先运行 `npm ci`，再执行 `npm run lint`、`npm test -- --coverage --watchAll=false`。
  - Playwright 测试前执行 `npm run reset-config` 或依赖 `globalSetup`（`tests/global-setup.js`）自动生成配置，再运行 `npx playwright test --reporter=line`。

- **验收判定**
  - 任一核心流程（成都、天津、广州、绍兴）的样例都通过单元及端到端测试。
  - 当新增城市规则或导出字段时，需要在 `TEST_PLAN.md` 中同步新增案例，并补齐测试。
  - 回归测试需确保 `allowanceBreakdown` 的快照无意外变化（通过 Jest snapshot 审核）。

## 7. 存储模式联调
- **IndexedDB（默认）**
  - **前置条件**：确保 `src/config/storage.config.json` 中 `storageMode` 为 `"indexeddb"` 或设置 `REACT_APP_STORAGE_MODE=indexeddb`。
  - **步骤**：
    - 运行 `npm start` 启动前端，打开节假日管理页。
    - 执行节假日新增/编辑/删除，确认页面刷新后仍能读取数据。
  - **断言**：`IndexedDB` 日志在浏览器控制台出现；刷新页面后数据持久存在。
- **PostgreSQL**
  - **前置条件**：
    - `storage.config.json` 中 `storageMode` 设为 `"postgres"`，并配置数据库连接（默认 `localhost:5450/mydatabase`）。
    - 在 `server/` 目录执行 `npm install`，通过 `npm run dev` 启动后端。
    - 使用 `psql` 执行 `sql/t_initial_setup.sql` 初始化数据，例如：
      ```bash
      psql "host=localhost port=5450 dbname=mydatabase user=postgres password=123" -f sql/t_initial_setup.sql
      ```
    - 前端启动前设置 `REACT_APP_API_URL=http://localhost:3001/api` 和 `REACT_APP_STORAGE_MODE=postgres`。
  - **步骤**：
    - 打开节假日管理页，确认初始数据来自 PostgreSQL。
    - 新增节假日、切换年份、导出导入 Excel。
    - 使用 `psql` 或 `SELECT * FROM t_holidays;` 验证数据库中的记录同步变化。
  - **断言**：接口返回 `success: true`；数据库表 `t_holidays` 与前端展示一致。
- **自动化建议**：
  - 在 CI 中增加一个 PostgreSQL 服务容器，运行 `npm run dev -- --once`（或独立脚本）启动后端，再执行 Playwright 场景验证。
  - 可编写 `tests/scripts/toggle-storage-mode.js`（暂未实现）包装 `storage.config.json` 切换，缩短测试准备时间。

## 8. 持续改进
- 引入 TypeScript 或 JSDoc 提升类型安全。
- 在 React 测试中加入 `jest-axe` 做辅助可访问性检查。
- 针对 `allowanceBreakdown` 编写快照测试监测公式字符串变化。
  - 建立 `scripts/generate-fixtures.js` 自动化生成典型城市输入，减少手写样本。
