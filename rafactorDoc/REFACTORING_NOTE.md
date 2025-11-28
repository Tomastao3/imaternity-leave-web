# CityDataManager 重构说明

## 重构策略调整

根据用户反馈，**保持原有界面不变**，采用渐进式重构策略。

## 当前状态 ✅ 保持原界面 + Mock API 准备

### 1. 生产环境文件
- ✅ `src/components/CityDataManager.js` - **原界面版本（当前使用）**
- ✅ `src/api/dataManagementApi.js` - 完整的 Mock API 层（已就绪）
- ✅ `src/components/MaternityRulesManager.js` - 独立组件（备用）
- ✅ `src/components/AllowanceRulesManager.js` - 独立组件（备用）
- ✅ `src/components/EmployeeInfoManager.js` - 独立组件（备用）
- ✅ `src/components/HolidayManager.js` - 独立组件（备用）

### 2. 当前策略
- ✅ **保持原界面** - 用户体验完全一致
- ✅ **Mock API 已就绪** - 可随时切换
- ✅ **模块化组件备用** - 供未来使用
- ✅ **零风险运行** - 稳定可靠

### 3. 备份文件（已移至 backup 文件夹）
- `src/components/backup/CityDataManager.old.js` - 原界面版本（与当前相同）
- `src/components/backup/CityDataManager.backup.js` - 完整原始版本
- `src/components/backup/CityDataManager.refactored.js` - 模块化重构版本（备用）

## 优势

### 渐进式重构
1. **零风险** - 界面和功能完全保持不变
2. **向后兼容** - 所有现有代码继续工作
3. **为未来准备** - Mock API 层已就绪，可随时切换

### 模块化组件已就绪
当需要时，可以：
1. 逐个 Tab 替换为独立组件
2. 或整体切换到完全重构版本
3. 或保持现状，仅在后端集成时使用 Mock API

## 使用建议

### 当前使用
- 继续使用现有 CityDataManager
- 界面和功能完全不变
- 数据操作稳定可靠

### 未来迁移（可选）
如需要模块化架构，可以：
```javascript
// 方案1：逐步替换
// 在 CityDataManager.js 中，将某个 Tab 的渲染替换为独立组件
{activeTab === 'maternity' && (
  <MaternityRulesManager 
    selectedCity={selectedCity} 
    onDataChange={loadData} 
  />
)}

// 方案2：完全切换
// 使用 CityDataManager.refactored.js 替换当前文件
```

## 文件说明

| 文件 | 用途 | 状态 |
|------|------|------|
| `CityDataManager.js` | 原界面版本 | ✅ **生产环境（当前）** |
| `dataManagementApi.js` | Mock API 层 | ✅ 已就绪（备用）|
| `MaternityRulesManager.js` | 产假规则管理 | 🚧 备用组件 |
| `AllowanceRulesManager.js` | 津贴规则管理 | 🚧 备用组件 |
| `EmployeeInfoManager.js` | 员工信息管理 | 🚧 备用组件 |
| `HolidayManager.js` | 节假日管理 | 🚧 备用组件 |
| `backup/CityDataManager.old.js` | 原界面版本 | 📦 备份 |
| `backup/CityDataManager.backup.js` | 原始版本 | 📦 备份 |
| `backup/CityDataManager.refactored.js` | 模块化版本 | 📦 备用 |

## 当前策略 ✅

### 保持原界面
✅ **界面完全一致** - 用户体验不变  
✅ **功能完全相同** - 所有操作正常  
✅ **稳定可靠** - 经过充分测试  
✅ **零风险运行** - 生产环境稳定  

### 架构已准备
✅ **Mock API 层** - 完整实现，可随时启用  
✅ **模块化组件** - 4个独立管理器已就绪  
✅ **灵活切换** - 可选择是否使用新架构  

### 切换到模块化架构（可选）
如需使用模块化架构：
```bash
# 切换到模块化版本
Copy-Item src\components\backup\CityDataManager.refactored.js src\components\CityDataManager.js -Force
```

### 恢复原界面（当前已是）
```bash
# 恢复原界面版本
Copy-Item src\components\backup\CityDataManager.old.js src\components\CityDataManager.js -Force
```

应用运行在 http://localhost:3000，界面保持原样


### 重构原则
1. 保持原界面和功能不变
2. 检索所有代码（除backup文件夹），按照clean code 原则，所有都要数据获取和逻辑计算，都要使用模拟调用API的方式调用并统一放在api文件夹下，未来要方便切换为调用后端API，给出代码重构方案，生成markdown文件。


基础数据管理 - 🎌节假日 - 每一行增加了复制按钮，但是复制按钮点击后没有复制数据，是没有入库，还是界面没有刷新？
产假津贴计算- 计算结果  所有的 计算过程 的展示， 字体，大小和 跟计算过程的字体一致

产假津贴计算- 计算结果  
返还个人部分社保公积金合计：
产假首月应发工资：
产假结束月应发工资
以及对应的 计算过程， 位置移到 休假日历 下面

产假津贴计算- 计算结果  
 减扣项 上面增加一个区域名为 产假期间工资调整， 4个输入框分别为  工资调整，工资调整年月，社保基数调整，社保基数调整年月。 
先只改UI界面，逻辑保持不变