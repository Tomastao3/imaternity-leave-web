# 测试夹具说明

- `cityCases.json`: 存放成都、天津、广州、绍兴等城市的输入/预期结果样例。
- `allowanceBreakdownCases.json`: 预设 `allowanceBreakdown` 的多场景结果，支持 snapshot。
- `generated/configData.json`: 由 `node tests/scripts/reset-config.js` 自动生成，包含 Excel 配置转化后的 JSON。
- `batchSamples.xlsx`（待补充）: 批量计算的示例文件，覆盖多条员工数据、扣减项、公司已发工资。

> 实际文件可在后续补充，测试编写前请根据需要生成对应数据。
