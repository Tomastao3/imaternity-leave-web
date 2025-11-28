# 测试实现指南

## 单元测试
- **`src/__tests__/components/AllowanceCalculator.test.js`**
  - 使用 `jest.mock()` 模拟 `cityDataManager`、`calculateMaternityAllowance`、`exportAllowancePdf`、`exportAllowanceExcel`。
  - 结合 `tests/fixtures/cityCases.json` 中的城市场景，验证 `calculateAllowance()` 后的 UI 输出。
  - 通过 `userEvent` 模拟表单交互，实现 `test.todo` 中的校验/导出场景。

- **`src/__tests__/utils/allowanceBreakdown.test.js`**
  - 引入 `tests/fixtures/allowanceBreakdownCases.json` 的参数，循环生成用例。
  - 覆盖成都/天津公式、手动 override、扣减组合，并断言返回结构的 `process`、`details` 字段。

- **`src/__tests__/utils/batchCalculations.test.js`**
  - mock `cityDataManager`、`calculateMaternityAllowance` 为受控返回值。
  - 使用 `tests/fixtures/generated/configData.json`（通过 `npm run reset-config` 生成）构造批量输入。
  - 验证 `overrideFlags`、`deductionsTotal`、`errors` 等字段。

## 集成/端到端
- **配置加载**：Playwright 会通过 `tests/global-setup.js` 自动执行 `npm run reset-config` 并设置 `process.env.CONFIG_FIXTURE_PATH`。
- **单个模式**：参考 `tests/e2e/allowance-calculator.spec.ts`，实现表单填写、计算结果断言。
- **批量模式**：准备 `tests/fixtures/batchSamples.xlsx`，使用 Playwright 上传并验证结果表格、导出操作。

## 其他建议
- 为 `tests/scripts/reset-config.js` 增加可选 CLI 参数（如 `--output`）。
- 在 CI 中执行：
  ```bash
  npm run reset-config
  npm test -- --coverage --watchAll=false
  npx playwright test
  ```
- 测试新增后记得更新 `TEST_PLAN.md` 与本指南。
