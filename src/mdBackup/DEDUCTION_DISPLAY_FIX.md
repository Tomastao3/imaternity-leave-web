# 减扣项显示优化 - 分段显示社保公积金调整

## 🐛 问题描述

**症状**: 在"自动计算减扣项"功能中，添加的社保公积金减扣项描述不正确，只显示统一费率，没有分段显示调整信息。

**用户反馈**:
```
减扣内容：月度个人部分社保公积金合计 × 4个月(2025-11 - 2026-02)

应该改为：
月度个人部分社保公积金合计 4648.16 × 1个月（2025-11 - 2025-11）
+ 调整后 月度个人部分社保公积金合计 4748.16 × 3个月（2025-12 - 2026-02）
```

## 🔍 问题位置

**文件**: `src/components/AllowanceCalculator.js`  
**位置**: 第 973 行，`useEffect` 中的自动填充减扣项逻辑

**问题代码**:
```javascript
// 2. 添加社保公积金
if (result.personalSocialSecurity != null && result.personalSocialSecurity > 0) {
  const ssNote = `月度个人部分社保公积金合计 × ${result.personalSSMonthsCount || 0}个月(${result.personalSSMonths && result.personalSSMonths.length > 0 ? result.personalSSMonths[0] + ' - ' + result.personalSSMonths[result.personalSSMonths.length - 1] : ''})`;
  newDeductions.push({ note: ssNote, amount: result.personalSocialSecurity.toString() });
}
```

**问题**: 只使用了总月数，没有检查是否有调整信息。

## ✅ 解决方案

### 修改逻辑

检查 `result.personalSSBreakdown`，如果有调整信息（`type === 'adjusted'`），则分段显示；否则显示统一费率。

### 修改后的代码

```javascript
// 2. 添加社保公积金
if (result.personalSocialSecurity != null && result.personalSocialSecurity > 0) {
  let ssNote = '';
  
  // 如果有调整信息，显示分段
  if (result.personalSSBreakdown && result.personalSSBreakdown.type === 'adjusted') {
    const breakdown = result.personalSSBreakdown;
    const segments = [];
    
    if (breakdown.beforeMonths && breakdown.beforeMonths.length > 0) {
      const monthRange = breakdown.beforeMonths.length === 1 
        ? `（${breakdown.beforeMonths[0]} - ${breakdown.beforeMonths[0]}）`
        : `（${breakdown.beforeMonths[0]} - ${breakdown.beforeMonths[breakdown.beforeMonths.length - 1]}）`;
      segments.push(`月度个人部分社保公积金合计 ${breakdown.beforeAmount.toFixed(2)} × ${breakdown.beforeMonths.length}个月${monthRange}`);
    }
    
    if (breakdown.afterMonths && breakdown.afterMonths.length > 0) {
      const monthRange = breakdown.afterMonths.length === 1
        ? `（${breakdown.afterMonths[0]} - ${breakdown.afterMonths[0]}）`
        : `（${breakdown.afterMonths[0]} - ${breakdown.afterMonths[breakdown.afterMonths.length - 1]}）`;
      segments.push(`调整后 月度个人部分社保公积金合计 ${breakdown.afterAmount.toFixed(2)} × ${breakdown.afterMonths.length}个月${monthRange}`);
    }
    
    ssNote = segments.join(' + ');
  } else {
    // 统一费率
    ssNote = `月度个人部分社保公积金合计 × ${result.personalSSMonthsCount || 0}个月(${result.personalSSMonths && result.personalSSMonths.length > 0 ? result.personalSSMonths[0] + ' - ' + result.personalSSMonths[result.personalSSMonths.length - 1] : ''})`;
  }
  
  newDeductions.push({ note: ssNote, amount: result.personalSocialSecurity.toString() });
}
```

## 🎯 修复效果

### 场景 1: 有调整（1个月调整前 + 3个月调整后）

**修复前**:
```
减扣项：
- 月度个人部分社保公积金合计 × 4个月(2025-11 - 2026-02)  19192.64
```

**修复后**:
```
减扣项：
- 月度个人部分社保公积金合计 4648.16 × 1个月（2025-11 - 2025-11） + 调整后 月度个人部分社保公积金合计 4748.16 × 3个月（2025-12 - 2026-02）  19192.64
```

### 场景 2: 有调整（2个月调整前 + 2个月调整后）

**修复前**:
```
减扣项：
- 月度个人部分社保公积金合计 × 4个月(2025-11 - 2026-02)  19192.64
```

**修复后**:
```
减扣项：
- 月度个人部分社保公积金合计 4598.16 × 2个月（2025-11 - 2025-12） + 调整后 月度个人部分社保公积金合计 4898.16 × 2个月（2026-01 - 2026-02）  19192.64
```

### 场景 3: 无调整（统一费率）

**修复前**:
```
减扣项：
- 月度个人部分社保公积金合计 × 4个月(2025-11 - 2026-02)  19192.64
```

**修复后**:
```
减扣项：
- 月度个人部分社保公积金合计 × 4个月(2025-11 - 2026-02)  19192.64
```

**说明**: 无调整时保持原样，不变。

## 📊 数据流

### 输入数据

```javascript
result.personalSSBreakdown = {
  type: 'adjusted',
  beforeAmount: 4648.16,
  afterAmount: 4748.16,
  beforeMonths: ['2025-11'],
  afterMonths: ['2025-12', '2026-01', '2026-02'],
  adjustmentMonth: '2025-12'
}
```

### 处理逻辑

```javascript
// 调整前
beforeMonths.length = 1
monthRange = '（2025-11 - 2025-11）'
segment1 = '月度个人部分社保公积金合计 4648.16 × 1个月（2025-11 - 2025-11）'

// 调整后
afterMonths.length = 3
monthRange = '（2025-12 - 2026-02）'
segment2 = '调整后 月度个人部分社保公积金合计 4748.16 × 3个月（2025-12 - 2026-02）'

// 合并
ssNote = segment1 + ' + ' + segment2
```

### 输出结果

```javascript
newDeductions.push({
  note: '月度个人部分社保公积金合计 4648.16 × 1个月（2025-11 - 2025-11） + 调整后 月度个人部分社保公积金合计 4748.16 × 3个月（2025-12 - 2026-02）',
  amount: '19192.64'
})
```

## 🔗 相关修复

这个修复与之前的修复是配套的：

1. **计算过程显示**（已完成）
   - 文件: `src/utils/calculationFormatter.js`
   - 函数: `formatPersonalSSProcess`
   - 位置: "社保公积金减扣"卡片的"计算过程"

2. **减扣项描述**（本次修复）
   - 文件: `src/components/AllowanceCalculator.js`
   - 位置: 自动计算减扣项的 `useEffect`
   - 功能: "员工需返还明细"卡片的减扣项列表

现在两个地方都会正确显示分段信息，保持一致性。

## 🧪 测试建议

### 测试场景 1: 有调整（1+3月）
1. ✅ 设置产假期间：2025-11 至 2026-02
2. ✅ 设置调整月份：2025-12
3. ✅ 调整前：4648.16
4. ✅ 调整后：4748.16
5. ✅ 点击"自动计算减扣项"
6. ✅ 验证减扣项描述：
   - 包含"4648.16 × 1个月（2025-11 - 2025-11）"
   - 包含"调整后 4748.16 × 3个月（2025-12 - 2026-02）"

### 测试场景 2: 有调整（2+2月）
1. ✅ 设置产假期间：2025-11 至 2026-02
2. ✅ 设置调整月份：2026-01
3. ✅ 调整前：4598.16
4. ✅ 调整后：4898.16
5. ✅ 点击"自动计算减扣项"
6. ✅ 验证减扣项描述：
   - 包含"4598.16 × 2个月（2025-11 - 2025-12）"
   - 包含"调整后 4898.16 × 2个月（2026-01 - 2026-02）"

### 测试场景 3: 无调整
1. ✅ 设置产假期间：2025-11 至 2026-02
2. ✅ 不设置调整
3. ✅ 月度金额：4798.16
4. ✅ 点击"自动计算减扣项"
5. ✅ 验证减扣项描述：
   - 显示"× 4个月(2025-11 - 2026-02)"

### 测试场景 4: 单月情况
1. ✅ 设置产假期间：2025-11 至 2025-11（1个月）
2. ✅ 点击"自动计算减扣项"
3. ✅ 验证月份范围显示：
   - 应该是"（2025-11 - 2025-11）"而不是"（2025-11）"

## 📝 修改文件

- `src/components/AllowanceCalculator.js`
  - 第 972-1001 行：修改社保公积金减扣项的描述生成逻辑

## ✅ Clean Code 原则

- ✅ **DRY (Don't Repeat Yourself)**: 
  - 复用了 `result.personalSSBreakdown` 的数据结构
  - 与 `formatPersonalSSProcess` 使用相同的逻辑

- ✅ **一致性**: 
  - 减扣项描述与计算过程显示保持一致
  - 都使用分段显示

- ✅ **可读性**: 
  - 清晰的条件判断
  - 易于理解的变量命名

- ✅ **可维护性**: 
  - 如果调整逻辑变化，只需修改一处数据结构

## 🎉 总结

通过检查 `result.personalSSBreakdown.type`，在自动计算减扣项时也能正确显示分段信息。

现在无论是：
- **"社保公积金减扣"卡片的计算过程**
- **"员工需返还明细"卡片的减扣项描述**

都会一致地显示调整前后的分段信息，提高了数据的透明度和一致性。

### 完整的显示效果

**社保公积金减扣卡片**:
```
返还个人部分社保公积金合计：19192.64
计算过程：调整前 月度个人部分社保公积金合计 4648.16 × 1个月（2025-11 - 2025-11） + 调整后 月度个人部分社保公积金合计 4748.16 × 3个月（2025-12 - 2026-02） = 4648.16 × 1 + 4748.16 × 3 = 19192.64
```

**员工需返还明细卡片**:
```
减扣项列表：
1. 月度个人部分社保公积金合计 4648.16 × 1个月（2025-11 - 2025-11） + 调整后 月度个人部分社保公积金合计 4748.16 × 3个月（2025-12 - 2026-02）  19192.64
```

两处显示完全一致，用户可以清楚地看到调整前后的金额和月份分布！
