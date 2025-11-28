# Bug 修复总结 - 员工登录重置后卡片不显示

## 🐛 问题描述

**症状**: 员工登录后点击重置按钮，即使员工城市（上海）的津贴发放方式是"个人账户"，三个卡片（需返还信息、需返还明细、社保公积金减扣）仍然隐藏不显示。

**影响范围**: 员工登录模式

## 🔍 根本原因

### 问题1: 硬编码导致状态错误

在 `reset()` 函数中，`paymentMethod` 被硬编码设置为 `'企业账户'`：

```javascript
// 问题代码（第 1214 行和 1273 行）
setPaymentMethod('企业账户');
setPaymentMethodAutoFilled(false);
```

### 执行流程分析

#### 员工登录重置流程：
1. ✅ 用户点击"重置"按钮
2. ❌ `reset()` 函数将 `paymentMethod` 硬编码设置为 `'企业账户'`
3. ✅ `setTimeout` 后调用 `selectEmployeeFromSuggestion(matchedEmployee)`
4. ✅ `selectEmployeeFromSuggestion` 调用 `applyCitySelection(employee.city)`
5. ✅ `applyCitySelection` 根据城市规则设置 `paymentMethod` 为 `'个人账户'`
6. ❌ **但是**，由于 React 状态更新的批处理机制，硬编码的值可能覆盖了自动设置的值

#### 正确的流程应该是：
1. ✅ 用户点击"重置"按钮
2. ✅ `reset()` 函数**先清空** `paymentMethod` 为空字符串
3. ✅ 卡片立即隐藏（因为 `paymentMethod === '个人账户'` 为 false）
4. ✅ `setTimeout` 后调用 `selectEmployeeFromSuggestion(matchedEmployee)`
5. ✅ `selectEmployeeFromSuggestion` 调用 `applyCitySelection(employee.city)`
6. ✅ `applyCitySelection` 根据城市规则设置 `paymentMethod` 为 `'个人账户'`
7. ✅ 卡片正确显示

### 问题2: 闪烁问题（先显示后隐藏）

如果在重置时不设置 `paymentMethod`，会出现闪烁：

**闪烁原因**:
1. 重置前 `paymentMethod = '个人账户'`，卡片显示
2. 重置时没有清空 `paymentMethod`，仍然是 `'个人账户'`
3. React 批量更新后重新渲染，卡片仍然显示（❌ 不应该显示）
4. 100ms 后 `applyCitySelection` 设置 `paymentMethod = '个人账户'`
5. 卡片继续显示

**用户体验**: 重置时卡片应该先隐藏，判断为个人账户后再显示，而不是一直显示。

**解决方案**: 在重置时先将 `paymentMethod` 设置为空字符串 `''`，这样：
1. 重置时 `paymentMethod = ''`
2. 条件 `paymentMethod === '个人账户'` 为 false
3. 卡片立即隐藏 ✅
4. 100ms 后 `applyCitySelection` 设置 `paymentMethod = '个人账户'`
5. 卡片显示 ✅

## ✅ 解决方案

### 修改内容

**将 `reset()` 函数中的 `paymentMethod` 先设置为空字符串，避免闪烁，然后让 `applyCitySelection` 根据城市规则自动设置正确的值。**

**关键点**:
- ✅ 不要硬编码为 `'企业账户'`（会导致状态错误）
- ✅ 不要不设置（会导致闪烁）
- ✅ 先设置为空字符串 `''`（正确方案）

#### 1. 员工登录分支（第 1214-1216 行）

**修改前**:
```javascript
setEmployeeBasicSalary('');
setPaymentMethod('企业账户');
setPaymentMethodAutoFilled(false);
const today = new Date();
```

**修改后**:
```javascript
setEmployeeBasicSalary('');
// 先清空 paymentMethod，避免闪烁（先显示后隐藏），然后让 applyCitySelection 根据城市规则自动设置
setPaymentMethod('');
setPaymentMethodAutoFilled(false);
const today = new Date();
```

#### 2. HR登录分支（第 1274-1276 行）

**修改前**:
```javascript
setEmployeeBasicSalary('');
setPaymentMethod('企业账户');
setPaymentMethodAutoFilled(false);
const today = new Date();
```

**修改后**:
```javascript
setEmployeeBasicSalary('');
// 先清空 paymentMethod，避免闪烁（先显示后隐藏），然后让 applyCitySelection 根据城市规则自动设置
setPaymentMethod('');
setPaymentMethodAutoFilled(false);
const today = new Date();
```

## 🎯 修复效果

### 修复前
| 操作 | 城市 | 津贴规则 | paymentMethod | 卡片显示 |
|------|------|---------|--------------|---------|
| 员工登录 | 上海 | 个人账户 | ✅ 个人账户 | ✅ 显示 |
| 点击重置 | 上海 | 个人账户 | ❌ 企业账户 | ❌ 隐藏 |

### 修复后
| 操作 | 城市 | 津贴规则 | paymentMethod | 卡片显示 |
|------|------|---------|--------------|---------|
| 员工登录 | 上海 | 个人账户 | ✅ 个人账户 | ✅ 显示 |
| 点击重置 | 上海 | 个人账户 | ✅ 个人账户 | ✅ 显示 |

## 📝 技术细节

### applyCitySelection 的逻辑

```javascript
const applyCitySelection = useCallback((city) => {
  if (city) {
    const allowanceRule = cityDataManager.getAllowanceRulesByCity(city);
    if (allowanceRule) {
      if (allowanceRule.accountType) {
        const acct = allowanceRule.accountType.trim();
        if (acct === '公司') {
          setPaymentMethod('企业账户');
          setPaymentMethodAutoFilled(true);
        } else if (acct === '个人') {
          setPaymentMethod('个人账户');  // 上海的规则
          setPaymentMethodAutoFilled(true);
        }
      }
    }
  }
}, []);
```

### 上海的津贴规则

根据数据库配置（`t_initial_setup.sql` 第 137 行）：
```sql
INSERT INTO t_allowance_rules (
    city,
    social_average_wage,
    company_average_wage,
    company_contribution_wage,
    calculation_base,
    payout_method,  -- '个人'
    maternity_policy,
    allowance_policy
)
VALUES
    ('上海', 12307.00, 49000.00, 30000.00, '平均工资', '个人', ...);
```

## 🧪 测试建议

### 测试场景 1: 员工登录重置
1. ✅ 以员工身份登录（员工城市：上海）
2. ✅ 验证三个卡片显示
3. ✅ 点击"重置"按钮
4. ✅ 验证三个卡片仍然显示
5. ✅ 验证 `paymentMethod` 为"个人账户"

### 测试场景 2: HR登录重置
1. ✅ 以HR身份登录
2. ✅ 选择城市"上海"
3. ✅ 验证 `paymentMethod` 自动设置为"个人账户"
4. ✅ 验证三个卡片显示
5. ✅ 点击"重置"按钮
6. ✅ 验证 `paymentMethod` 仍为"个人账户"
7. ✅ 验证三个卡片仍然显示

### 测试场景 3: 深圳（企业账户）
1. ✅ 选择城市"深圳"
2. ✅ 验证 `paymentMethod` 自动设置为"企业账户"
3. ✅ 验证三个卡片隐藏
4. ✅ 点击"重置"按钮
5. ✅ 验证 `paymentMethod` 仍为"企业账户"
6. ✅ 验证三个卡片仍然隐藏

## 📚 相关代码

### 修改文件
- `src/components/AllowanceCalculator.js`
  - 第 1214-1216 行：员工登录重置分支
  - 第 1274-1276 行：HR登录重置分支

### 相关函数
- `reset()` - 重置函数
- `applyCitySelection()` - 应用城市选择
- `selectEmployeeFromSuggestion()` - 选择员工

## ✅ Clean Code 原则

- ✅ **单一数据源**: `paymentMethod` 由城市规则统一管理，不在多处设置
- ✅ **避免硬编码**: 移除了硬编码的默认值，让数据驱动UI
- ✅ **一致性**: 无论是初始加载还是重置，都使用相同的逻辑设置 `paymentMethod`
- ✅ **可维护性**: 如果将来修改津贴规则，不需要修改重置逻辑

## 🎉 总结

通过移除 `reset()` 函数中硬编码的 `paymentMethod` 设置，让它由 `applyCitySelection` 根据城市的津贴规则自动设置，确保了员工登录重置后，三个卡片能够根据实际的津贴发放方式正确显示或隐藏。

这个修复体现了"数据驱动UI"的设计原则，避免了状态不一致的问题。
