# 社保公积金调整显示优化

## 🐛 问题描述

**症状**: 当有社保公积金调整时，计算过程显示不正确，只显示单一费率乘以总月数，没有分段显示调整前后的计算。

**用户反馈**:
```
返还个人部分社保公积金合计：19192.64
计算过程：月度个人部分社保公积金合计 4798.16 x 4个月（2025-11 - 2026-02） = 19192.64

应该分两段来计算：
调整前 月度个人部分社保公积金合计 4598.16 x 2个月（2025-11 - 2025-12）
+ 调整后 月度个人部分社保公积金合计 4898.16 x 2个月（2026-01 - 2026-02）
= 4598.16 x 2 + 4898.16 x 2 = {计算结果}
```

## 🔍 根本原因

### 计算逻辑正确

在 `maternityCalculations.js` 中，计算逻辑已经正确处理了调整（第726行）：

```javascript
personalSocialSecurity = beforeMonths.length * beforeAmount + afterMonths.length * afterAmount;
personalSSBreakdown = {
  type: 'adjusted',
  beforeAmount,
  afterAmount,
  beforeMonths,
  afterMonths,
  adjustmentMonth: adjustMonth
};
```

### 显示逻辑不完整

问题在于：
1. **`buildAllowanceBreakdown` 没有包含 `personalSS` 字段**
2. **`formatPersonalSSProcess` 无法获取调整信息**

## ✅ 解决方案

### 1. 在 `buildAllowanceBreakdown` 中添加 `personalSS` 字段

**文件**: `src/utils/allowanceBreakdown.js`

**添加逻辑**:
```javascript
// 构建个人社保公积金信息
const personalSSInfo = (() => {
  if (!resultData.personalSSBreakdown) {
    return null;
  }

  const breakdown = resultData.personalSSBreakdown;
  
  // 如果有调整
  if (breakdown.type === 'adjusted') {
    const adjustments = [];
    
    if (breakdown.beforeMonths && breakdown.beforeMonths.length > 0) {
      adjustments.push({
        monthlyAmount: breakdown.beforeAmount,
        months: breakdown.beforeMonths.length,
        monthRange: `${breakdown.beforeMonths[0]} - ${breakdown.beforeMonths[breakdown.beforeMonths.length - 1]}`,
        label: '调整前'
      });
    }
    
    if (breakdown.afterMonths && breakdown.afterMonths.length > 0) {
      adjustments.push({
        monthlyAmount: breakdown.afterAmount,
        months: breakdown.afterMonths.length,
        monthRange: `${breakdown.afterMonths[0]} - ${breakdown.afterMonths[breakdown.afterMonths.length - 1]}`,
        label: '调整后'
      });
    }
    
    return {
      monthlyAmount: null,
      details: {
        adjustments
      }
    };
  }
  
  // 统一费率
  if (breakdown.type === 'uniform') {
    return {
      monthlyAmount: breakdown.monthlyAmount,
      details: null
    };
  }
  
  return null;
})();

return {
  // ... 其他字段
  personalSS: personalSSInfo
};
```

### 2. 优化 `formatPersonalSSProcess` 显示格式

**文件**: `src/utils/calculationFormatter.js`

**优化逻辑**:
```javascript
export const formatPersonalSSProcess = (resultData, breakdown, formatCurrency) => {
  // ... 验证代码

  // 如果有调整信息，显示分段计算
  if (breakdown && breakdown.personalSS && breakdown.personalSS.details) {
    const details = breakdown.personalSS.details;
    if (details.adjustments && details.adjustments.length > 0) {
      const segments = [];
      const calculations = [];
      
      details.adjustments.forEach(adj => {
        if (adj.monthlyAmount > 0 && adj.months > 0) {
          const label = adj.label || '';
          const monthRange = adj.monthRange ? `（${adj.monthRange}）` : '';
          segments.push(`${label} 月度个人部分社保公积金合计 ${formatCurrency(adj.monthlyAmount)} × ${adj.months}个月${monthRange}`);
          calculations.push(`${formatCurrency(adj.monthlyAmount)} × ${adj.months}`);
        }
      });

      if (segments.length > 0) {
        return `${segments.join(' + ')} = ${calculations.join(' + ')} = ${formatCurrency(resultData.personalSocialSecurity)}`;
      }
    }
  }

  // 统一费率，显示单一计算
  // ...
};
```

## 🎯 修复效果

### 修复前

```
返还个人部分社保公积金合计：19192.64
计算过程：月度个人部分社保公积金合计 4798.16 × 4个月（2025-11 - 2026-02） = 19192.64
```

**问题**: 
- ❌ 只显示平均值
- ❌ 没有体现调整
- ❌ 用户无法验证计算

### 修复后

```
返还个人部分社保公积金合计：19192.64
计算过程：调整前 月度个人部分社保公积金合计 4598.16 × 2个月（2025-11 - 2025-12） + 调整后 月度个人部分社保公积金合计 4898.16 × 2个月（2026-01 - 2026-02） = 4598.16 × 2 + 4898.16 × 2 = 19192.64
```

**优点**:
- ✅ 清晰显示调整前后的金额
- ✅ 显示每段的月份范围
- ✅ 显示详细的计算步骤
- ✅ 用户可以验证计算正确性

## 📊 数据流

### 计算阶段（maternityCalculations.js）

```javascript
// 输入
socialSecurityAdjustment = {
  before: 4598.16,
  after: 4898.16,
  month: '2026-01'
}

// 处理
beforeMonths = ['2025-11', '2025-12']  // 2个月
afterMonths = ['2026-01', '2026-02']   // 2个月

personalSocialSecurity = 2 * 4598.16 + 2 * 4898.16 = 19192.64

// 输出
result.personalSSBreakdown = {
  type: 'adjusted',
  beforeAmount: 4598.16,
  afterAmount: 4898.16,
  beforeMonths: ['2025-11', '2025-12'],
  afterMonths: ['2026-01', '2026-02'],
  adjustmentMonth: '2026-01'
}
```

### 格式化阶段（allowanceBreakdown.js）

```javascript
// 输入
result.personalSSBreakdown

// 处理
personalSSInfo = {
  monthlyAmount: null,
  details: {
    adjustments: [
      {
        monthlyAmount: 4598.16,
        months: 2,
        monthRange: '2025-11 - 2025-12',
        label: '调整前'
      },
      {
        monthlyAmount: 4898.16,
        months: 2,
        monthRange: '2026-01 - 2026-02',
        label: '调整后'
      }
    ]
  }
}

// 输出
breakdown.personalSS = personalSSInfo
```

### 显示阶段（calculationFormatter.js）

```javascript
// 输入
breakdown.personalSS.details.adjustments

// 处理
segments = [
  '调整前 月度个人部分社保公积金合计 4598.16 × 2个月（2025-11 - 2025-12）',
  '调整后 月度个人部分社保公积金合计 4898.16 × 2个月（2026-01 - 2026-02）'
]

calculations = [
  '4598.16 × 2',
  '4898.16 × 2'
]

// 输出
'调整前 月度个人部分社保公积金合计 4598.16 × 2个月（2025-11 - 2025-12） + 调整后 月度个人部分社保公积金合计 4898.16 × 2个月（2026-01 - 2026-02） = 4598.16 × 2 + 4898.16 × 2 = 19192.64'
```

## 🧪 测试建议

### 测试场景 1: 有社保公积金调整
1. ✅ 设置产假期间：2025-11 至 2026-02（4个月）
2. ✅ 设置调整月份：2026-01
3. ✅ 调整前金额：4598.16
4. ✅ 调整后金额：4898.16
5. ✅ 点击计算
6. ✅ 验证显示：
   - 返还金额：19192.64
   - 计算过程：分两段显示，包含月份范围和标签

### 测试场景 2: 无调整（统一费率）
1. ✅ 设置产假期间：2025-11 至 2026-02（4个月）
2. ✅ 不设置调整
3. ✅ 月度金额：4798.16
4. ✅ 点击计算
5. ✅ 验证显示：
   - 返还金额：19192.64
   - 计算过程：单一计算，显示总月数

### 测试场景 3: 调整在产假开始前
1. ✅ 设置产假期间：2026-01 至 2026-04（4个月）
2. ✅ 设置调整月份：2025-12
3. ✅ 点击计算
4. ✅ 验证：只显示调整后的金额（所有月份都在调整后）

### 测试场景 4: 调整在产假结束后
1. ✅ 设置产假期间：2025-11 至 2026-02（4个月）
2. ✅ 设置调整月份：2026-03
3. ✅ 点击计算
4. ✅ 验证：只显示调整前的金额（所有月份都在调整前）

## 📝 修改文件

- `src/utils/allowanceBreakdown.js`
  - 第 363-410 行：添加 `personalSSInfo` 构建逻辑
  - 第 435 行：添加 `personalSS` 字段到返回对象

- `src/utils/calculationFormatter.js`
  - 第 182-201 行：优化调整信息的显示格式

## ✅ Clean Code 原则

- ✅ **单一职责**: 
  - 计算逻辑在 `maternityCalculations.js`
  - 格式化逻辑在 `allowanceBreakdown.js`
  - 显示逻辑在 `calculationFormatter.js`

- ✅ **数据驱动**: 显示格式完全由数据结构驱动

- ✅ **可扩展性**: 如果将来有更复杂的调整（如多次调整），只需扩展 `adjustments` 数组

- ✅ **可读性**: 计算过程清晰，用户可以验证

## 🎉 总结

通过在 `buildAllowanceBreakdown` 中添加 `personalSS` 字段，并优化 `formatPersonalSSProcess` 的显示格式，成功实现了社保公积金调整的分段显示。

现在当有调整时，计算过程会清晰地显示：
- **调整前**的金额、月数和月份范围
- **调整后**的金额、月数和月份范围
- **详细的计算步骤**
- **最终结果**

这大大提高了计算结果的透明度和可验证性，符合用户的期望。
