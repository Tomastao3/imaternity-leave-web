# AllowanceCalculator 重构方案

## 📋 当前状态分析

### 现有文件
- **文件**: `src/components/AllowanceCalculator.js`
- **大小**: 123.25 KB
- **行数**: 2755 行
- **状态变量**: 50+ 个
- **主要职责**:
  1. 员工搜索和选择
  2. 城市数据管理
  3. 产假信息表单
  4. 津贴计算表单
  5. 减扣项管理
  6. 返还规则处理
  7. 工资调整
  8. 计算逻辑
  9. 结果展示
  10. PDF/Excel 导出
  11. 日历显示

---

## 🎯 目标目录结构

```
src/
├── features/
│   └── allowance-calculator/
│       ├── index.js                              # 导出入口
│       │
│       ├── components/                           # UI 组件层
│       │   ├── AllowanceCalculatorContainer.jsx  # 主容器（协调器）
│       │   │
│       │   ├── forms/                            # 表单组件
│       │   │   ├── EmployeeSearchForm.jsx        # 员工搜索表单
│       │   │   ├── CitySelector.jsx              # 城市选择器
│       │   │   ├── MaternityInfoForm.jsx         # 产假信息表单
│       │   │   ├── AllowanceInfoForm.jsx         # 津贴信息表单
│       │   │   ├── DeductionForm.jsx             # 减扣项表单
│       │   │   ├── RefundRulesForm.jsx           # 返还规则表单
│       │   │   └── SalaryAdjustmentForm.jsx      # 工资调整表单
│       │   │
│       │   ├── results/                          # 结果展示组件
│       │   │   ├── CalculationResult.jsx         # 计算结果主组件
│       │   │   ├── AllowanceBreakdown.jsx        # 津贴明细
│       │   │   ├── SupplementDetails.jsx         # 补差明细
│       │   │   ├── DeductionSummary.jsx          # 减扣汇总
│       │   │   └── RefundSummary.jsx             # 返还汇总
│       │   │
│       │   ├── calendar/                         # 日历组件
│       │   │   ├── MaternityLeaveCalendar.jsx    # 产假日历
│       │   │   └── RefundLeaveCalendar.jsx       # 返还日历
│       │   │
│       │   ├── actions/                          # 操作按钮组件
│       │   │   ├── CalculateButton.jsx           # 计算按钮
│       │   │   ├── ExportButtons.jsx             # 导出按钮组
│       │   │   └── ResetButton.jsx               # 重置按钮
│       │   │
│       │   └── shared/                           # 共享 UI 组件
│       │       ├── FormField.jsx                 # 表单字段
│       │       ├── ErrorMessage.jsx              # 错误提示
│       │       └── LoadingSpinner.jsx            # 加载动画
│       │
│       ├── hooks/                                # 自定义 Hooks
│       │   ├── useAllowanceCalculator.js         # 主业务逻辑 Hook
│       │   ├── useEmployeeSearch.js              # 员工搜索 Hook
│       │   ├── useCityData.js                    # 城市数据 Hook
│       │   ├── useMaternityInfo.js               # 产假信息 Hook
│       │   ├── useAllowanceInfo.js               # 津贴信息 Hook
│       │   ├── useDeductions.js                  # 减扣项 Hook
│       │   ├── useRefundRules.js                 # 返还规则 Hook
│       │   ├── useSalaryAdjustment.js            # 工资调整 Hook
│       │   └── useCalculationResult.js           # 计算结果 Hook
│       │
│       ├── services/                             # 业务逻辑服务层
│       │   ├── AllowanceCalculatorService.js     # 主计算服务
│       │   ├── EmployeeService.js                # 员工服务
│       │   ├── MaternityCalculationService.js    # 产假计算服务
│       │   ├── AllowanceCalculationService.js    # 津贴计算服务
│       │   ├── DeductionService.js               # 减扣计算服务
│       │   ├── RefundService.js                  # 返还计算服务
│       │   └── ExportService.js                  # 导出服务
│       │
│       ├── utils/                                # 工具函数
│       │   ├── validators.js                     # 表单验证
│       │   ├── formatters.js                     # 数据格式化
│       │   ├── calculators.js                    # 计算辅助函数
│       │   └── transformers.js                   # 数据转换
│       │
│       ├── constants/                            # 常量定义
│       │   ├── formDefaults.js                   # 表单默认值
│       │   ├── validationRules.js                # 验证规则
│       │   └── uiConstants.js                    # UI 常量
│       │
│       ├── types/                                # 类型定义
│       │   ├── allowanceTypes.js                 # 津贴相关类型
│       │   ├── employeeTypes.js                  # 员工相关类型
│       │   └── calculationTypes.js               # 计算相关类型
│       │
│       └── styles/                               # 样式文件
│           ├── AllowanceCalculator.module.css    # 主样式
│           └── themes.js                         # 主题配置
│
└── components/                                   # 保留原位置（向后兼容）
    └── AllowanceCalculator.js                    # 重新导出新组件
```

---

## 📐 详细设计

### 1. 主容器组件 (AllowanceCalculatorContainer.jsx)

**职责**: 协调各个子组件，管理顶层状态

**代码结构** (~150 行):
```jsx
import React from 'react';
import { useAllowanceCalculator } from '../hooks/useAllowanceCalculator';
import EmployeeSearchForm from './forms/EmployeeSearchForm';
import MaternityInfoForm from './forms/MaternityInfoForm';
import AllowanceInfoForm from './forms/AllowanceInfoForm';
import DeductionForm from './forms/DeductionForm';
import CalculationResult from './results/CalculationResult';
import ExportButtons from './actions/ExportButtons';

const AllowanceCalculatorContainer = ({ 
  initialEmployeeName = '', 
  onLogout, 
  userRole = 'hr' 
}) => {
  const {
    // 状态
    state,
    // 操作
    actions,
    // 计算结果
    result,
    // 加载状态
    isLoading,
    // 错误
    error
  } = useAllowanceCalculator({ initialEmployeeName, userRole });

  return (
    <div className="allowance-calculator">
      {/* 员工搜索 */}
      <EmployeeSearchForm
        value={state.employeeSearchTerm}
        onChange={actions.handleEmployeeSearch}
        onSelect={actions.handleEmployeeSelect}
        employees={state.filteredEmployees}
        userRole={userRole}
      />

      {/* 产假信息 */}
      <MaternityInfoForm
        city={state.selectedCity}
        startDate={state.startDate}
        endDate={state.endDate}
        isDifficultBirth={state.isDifficultBirth}
        numberOfBabies={state.numberOfBabies}
        onChange={actions.handleMaternityInfoChange}
      />

      {/* 津贴信息 */}
      <AllowanceInfoForm
        companyAvgSalary={state.companyAvgSalary}
        socialInsuranceLimit={state.socialInsuranceLimit}
        employeeBasicSalary={state.employeeBasicSalary}
        paymentMethod={state.paymentMethod}
        onChange={actions.handleAllowanceInfoChange}
      />

      {/* 减扣项 */}
      <DeductionForm
        deductions={state.deductions}
        onChange={actions.handleDeductionsChange}
      />

      {/* 计算按钮 */}
      <CalculateButton
        onClick={actions.handleCalculate}
        isLoading={isLoading}
      />

      {/* 计算结果 */}
      {result && (
        <>
          <CalculationResult result={result} />
          <ExportButtons
            result={result}
            onExportPdf={actions.handleExportPdf}
            onExportExcel={actions.handleExportExcel}
          />
        </>
      )}

      {/* 错误提示 */}
      {error && <ErrorMessage message={error} />}
    </div>
  );
};

export default AllowanceCalculatorContainer;
```

---

### 2. 主业务逻辑 Hook (useAllowanceCalculator.js)

**职责**: 管理所有业务状态和逻辑

**代码结构** (~200 行):
```javascript
import { useState, useCallback, useEffect } from 'react';
import { useEmployeeSearch } from './useEmployeeSearch';
import { useCityData } from './useCityData';
import { useMaternityInfo } from './useMaternityInfo';
import { useAllowanceInfo } from './useAllowanceInfo';
import { useDeductions } from './useDeductions';
import { AllowanceCalculatorService } from '../services/AllowanceCalculatorService';

export const useAllowanceCalculator = ({ initialEmployeeName, userRole }) => {
  // 1. 组合各个子 Hook
  const employeeSearch = useEmployeeSearch(initialEmployeeName);
  const cityData = useCityData();
  const maternityInfo = useMaternityInfo();
  const allowanceInfo = useAllowanceInfo();
  const deductions = useDeductions();

  // 2. 计算结果状态
  const [result, setResult] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  // 3. 计算逻辑
  const handleCalculate = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const params = {
        // 员工信息
        employeeName: employeeSearch.employeeName,
        employeeId: employeeSearch.employeeId,
        
        // 城市信息
        city: cityData.selectedCity,
        
        // 产假信息
        startDate: maternityInfo.startDate,
        endDate: maternityInfo.endDate,
        isDifficultBirth: maternityInfo.isDifficultBirth,
        numberOfBabies: maternityInfo.numberOfBabies,
        
        // 津贴信息
        companyAvgSalary: allowanceInfo.companyAvgSalary,
        socialInsuranceLimit: allowanceInfo.socialInsuranceLimit,
        employeeBasicSalary: allowanceInfo.employeeBasicSalary,
        paymentMethod: allowanceInfo.paymentMethod,
        
        // 减扣项
        deductions: deductions.items
      };

      // 调用服务层计算
      const calculationResult = await AllowanceCalculatorService.calculate(params);
      setResult(calculationResult);
    } catch (err) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  }, [employeeSearch, cityData, maternityInfo, allowanceInfo, deductions]);

  // 4. 导出操作
  const handleExportPdf = useCallback(() => {
    if (result) {
      ExportService.exportPdf(result);
    }
  }, [result]);

  const handleExportExcel = useCallback(() => {
    if (result) {
      ExportService.exportExcel(result);
    }
  }, [result]);

  // 5. 返回状态和操作
  return {
    state: {
      // 员工搜索状态
      ...employeeSearch.state,
      // 城市数据状态
      ...cityData.state,
      // 产假信息状态
      ...maternityInfo.state,
      // 津贴信息状态
      ...allowanceInfo.state,
      // 减扣项状态
      ...deductions.state
    },
    actions: {
      // 员工搜索操作
      handleEmployeeSearch: employeeSearch.handleSearch,
      handleEmployeeSelect: employeeSearch.handleSelect,
      // 产假信息操作
      handleMaternityInfoChange: maternityInfo.handleChange,
      // 津贴信息操作
      handleAllowanceInfoChange: allowanceInfo.handleChange,
      // 减扣项操作
      handleDeductionsChange: deductions.handleChange,
      // 计算操作
      handleCalculate,
      // 导出操作
      handleExportPdf,
      handleExportExcel
    },
    result,
    isLoading,
    error
  };
};
```

---

### 3. 子 Hook 示例 (useEmployeeSearch.js)

**职责**: 管理员工搜索相关状态和逻辑

**代码结构** (~100 行):
```javascript
import { useState, useCallback, useEffect } from 'react';
import { EmployeeService } from '../services/EmployeeService';

export const useEmployeeSearch = (initialEmployeeName = '') => {
  const [employeeSearchTerm, setEmployeeSearchTerm] = useState(initialEmployeeName);
  const [allEmployees, setAllEmployees] = useState([]);
  const [filteredEmployees, setFilteredEmployees] = useState([]);
  const [selectedEmployee, setSelectedEmployee] = useState(null);
  const [showSuggestions, setShowSuggestions] = useState(false);

  // 加载所有员工
  useEffect(() => {
    const loadEmployees = async () => {
      const employees = await EmployeeService.getAllEmployees();
      setAllEmployees(employees);
    };
    loadEmployees();
  }, []);

  // 搜索员工
  const handleSearch = useCallback((searchTerm) => {
    setEmployeeSearchTerm(searchTerm);
    
    if (searchTerm.trim() === '') {
      setFilteredEmployees([]);
      setShowSuggestions(false);
      return;
    }

    const filtered = allEmployees.filter(emp =>
      emp.employeeName.includes(searchTerm) ||
      emp.employeeId.includes(searchTerm)
    );
    
    setFilteredEmployees(filtered);
    setShowSuggestions(filtered.length > 0);
  }, [allEmployees]);

  // 选择员工
  const handleSelect = useCallback((employee) => {
    setSelectedEmployee(employee);
    setEmployeeSearchTerm(employee.employeeName);
    setShowSuggestions(false);
  }, []);

  return {
    state: {
      employeeSearchTerm,
      employeeName: selectedEmployee?.employeeName || employeeSearchTerm,
      employeeId: selectedEmployee?.employeeId || '',
      filteredEmployees,
      showSuggestions
    },
    handleSearch,
    handleSelect
  };
};
```

---

### 4. 服务层示例 (AllowanceCalculatorService.js)

**职责**: 纯业务逻辑，不依赖 React

**代码结构** (~300 行):
```javascript
import { MaternityCalculationService } from './MaternityCalculationService';
import { AllowanceCalculationService } from './AllowanceCalculationService';
import { DeductionService } from './DeductionService';
import { RefundService } from './RefundService';

export class AllowanceCalculatorService {
  /**
   * 主计算方法
   * @param {Object} params - 计算参数
   * @returns {Promise<Object>} 计算结果
   */
  static async calculate(params) {
    // 1. 计算产假天数和周期
    const maternityResult = await MaternityCalculationService.calculate({
      city: params.city,
      startDate: params.startDate,
      endDate: params.endDate,
      isDifficultBirth: params.isDifficultBirth,
      numberOfBabies: params.numberOfBabies
    });

    // 2. 计算津贴
    const allowanceResult = await AllowanceCalculationService.calculate({
      city: params.city,
      maternityDays: maternityResult.totalDays,
      companyAvgSalary: params.companyAvgSalary,
      socialInsuranceLimit: params.socialInsuranceLimit,
      paymentMethod: params.paymentMethod
    });

    // 3. 计算补差
    const supplementResult = this.calculateSupplement({
      allowance: allowanceResult.governmentPaidAmount,
      employeeBasicSalary: params.employeeBasicSalary,
      maternityDays: maternityResult.totalDays,
      paymentMethod: params.paymentMethod
    });

    // 4. 计算减扣
    const deductionResult = DeductionService.calculate({
      deductions: params.deductions,
      startDate: params.startDate,
      endDate: params.endDate
    });

    // 5. 计算返还
    const refundResult = await RefundService.calculate({
      city: params.city,
      startDate: params.startDate,
      endDate: params.endDate
    });

    // 6. 汇总结果
    return {
      // 产假信息
      maternityDays: maternityResult.totalDays,
      maternityStartDate: maternityResult.startDate,
      maternityEndDate: maternityResult.endDate,
      appliedRules: maternityResult.appliedRules,
      
      // 津贴信息
      governmentPaidAmount: allowanceResult.governmentPaidAmount,
      dailyAllowance: allowanceResult.dailyAllowance,
      maternityAllowanceBase: allowanceResult.base,
      
      // 补差信息
      supplementAmount: supplementResult.amount,
      supplementDetails: supplementResult.details,
      
      // 减扣信息
      totalDeduction: deductionResult.total,
      deductionItems: deductionResult.items,
      
      // 返还信息
      totalRefund: refundResult.total,
      refundItems: refundResult.items,
      
      // 最终金额
      finalAmount: this.calculateFinalAmount({
        supplement: supplementResult.amount,
        deduction: deductionResult.total,
        refund: refundResult.total
      })
    };
  }

  /**
   * 计算补差
   */
  static calculateSupplement({ allowance, employeeBasicSalary, maternityDays, paymentMethod }) {
    // 补差计算逻辑
    const employeeExpected = (employeeBasicSalary / 30) * maternityDays;
    const supplement = Math.max(0, employeeExpected - allowance);

    return {
      amount: supplement,
      details: {
        employeeExpected,
        governmentPaid: allowance,
        difference: supplement
      }
    };
  }

  /**
   * 计算最终金额
   */
  static calculateFinalAmount({ supplement, deduction, refund }) {
    return supplement - deduction + refund;
  }
}
```

---

### 5. UI 组件示例 (EmployeeSearchForm.jsx)

**职责**: 纯 UI 展示，接收 props 和回调

**代码结构** (~80 行):
```jsx
import React from 'react';
import FormField from '../shared/FormField';
import './EmployeeSearchForm.module.css';

const EmployeeSearchForm = ({
  value,
  onChange,
  onSelect,
  employees,
  userRole
}) => {
  const handleInputChange = (e) => {
    onChange(e.target.value);
  };

  const handleEmployeeClick = (employee) => {
    onSelect(employee);
  };

  return (
    <div className="employee-search-form">
      <FormField
        label="员工搜索"
        required
        disabled={userRole === 'employee'}
      >
        <input
          type="text"
          value={value}
          onChange={handleInputChange}
          placeholder="输入员工姓名或工号"
          className="employee-search-input"
        />
      </FormField>

      {employees.length > 0 && (
        <div className="employee-suggestions">
          {employees.map((emp) => (
            <div
              key={emp.employeeId}
              className="employee-suggestion-item"
              onClick={() => handleEmployeeClick(emp)}
            >
              <span className="employee-name">{emp.employeeName}</span>
              <span className="employee-id">({emp.employeeId})</span>
              <span className="employee-city">{emp.city}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default EmployeeSearchForm;
```

---

## 🔄 迁移步骤

### 阶段 1: 准备工作（1天）

1. **创建目录结构**
   ```bash
   mkdir -p src/features/allowance-calculator/{components/{forms,results,calendar,actions,shared},hooks,services,utils,constants,types,styles}
   ```

2. **创建入口文件**
   ```javascript
   // src/features/allowance-calculator/index.js
   export { default as AllowanceCalculator } from './components/AllowanceCalculatorContainer';
   export * from './hooks';
   export * from './services';
   ```

3. **设置向后兼容**
   ```javascript
   // src/components/AllowanceCalculator.js (保留原文件)
   export { AllowanceCalculator as default } from '../features/allowance-calculator';
   ```

### 阶段 2: 提取常量和类型（1天）

1. **提取常量**
   - `constants/formDefaults.js`
   - `constants/validationRules.js`
   - `constants/uiConstants.js`

2. **定义类型**
   - `types/allowanceTypes.js`
   - `types/employeeTypes.js`
   - `types/calculationTypes.js`

### 阶段 3: 提取服务层（2-3天）

1. **创建服务类**
   - `AllowanceCalculatorService.js`
   - `EmployeeService.js`
   - `MaternityCalculationService.js`
   - `AllowanceCalculationService.js`
   - `DeductionService.js`
   - `RefundService.js`
   - `ExportService.js`

2. **迁移计算逻辑**
   - 从原组件中提取纯函数
   - 移除 React 依赖
   - 添加单元测试

### 阶段 4: 创建自定义 Hooks（2-3天）

1. **创建子 Hooks**
   - `useEmployeeSearch.js`
   - `useCityData.js`
   - `useMaternityInfo.js`
   - `useAllowanceInfo.js`
   - `useDeductions.js`
   - `useRefundRules.js`
   - `useSalaryAdjustment.js`

2. **创建主 Hook**
   - `useAllowanceCalculator.js`
   - 组合所有子 Hooks
   - 添加测试

### 阶段 5: 拆分 UI 组件（3-4天）

1. **创建表单组件**
   - `EmployeeSearchForm.jsx`
   - `CitySelector.jsx`
   - `MaternityInfoForm.jsx`
   - `AllowanceInfoForm.jsx`
   - `DeductionForm.jsx`
   - `RefundRulesForm.jsx`
   - `SalaryAdjustmentForm.jsx`

2. **创建结果组件**
   - `CalculationResult.jsx`
   - `AllowanceBreakdown.jsx`
   - `SupplementDetails.jsx`
   - `DeductionSummary.jsx`
   - `RefundSummary.jsx`

3. **创建操作组件**
   - `CalculateButton.jsx`
   - `ExportButtons.jsx`
   - `ResetButton.jsx`

4. **创建共享组件**
   - `FormField.jsx`
   - `ErrorMessage.jsx`
   - `LoadingSpinner.jsx`

### 阶段 6: 创建主容器（1天）

1. **创建容器组件**
   - `AllowanceCalculatorContainer.jsx`
   - 组合所有子组件
   - 使用主 Hook

2. **测试集成**
   - 确保功能完整
   - 验证数据流

### 阶段 7: 测试和优化（2天）

1. **添加测试**
   - 服务层单元测试
   - Hook 测试
   - 组件测试
   - 集成测试

2. **性能优化**
   - React.memo
   - useMemo/useCallback
   - 代码分割

3. **清理旧代码**
   - 删除或注释原 `AllowanceCalculator.js`
   - 更新导入路径
   - 更新文档

---

## ✅ 验收标准

### 功能完整性
- ✅ 所有原有功能正常工作
- ✅ 数据流正确
- ✅ 计算结果准确

### 代码质量
- ✅ 单个文件不超过 300 行
- ✅ 单个函数不超过 50 行
- ✅ 组件职责单一
- ✅ 无重复代码

### 可测试性
- ✅ 服务层有单元测试
- ✅ Hook 有测试
- ✅ 组件有测试
- ✅ 测试覆盖率 > 80%

### 性能
- ✅ 首次渲染时间不增加
- ✅ 重渲染次数减少
- ✅ 内存占用合理

---

## 📊 预期收益

| 指标 | 重构前 | 重构后 | 改善 |
|------|--------|--------|------|
| 最大文件行数 | 2755 | <300 | **89%** ↓ |
| 组件数量 | 1 | 20+ | 更易维护 |
| 可测试性 | 低 | 高 | 显著提升 |
| 代码复用 | 低 | 高 | 显著提升 |
| 新人理解成本 | 极高 | 低 | 显著降低 |

---

## ⏱️ 时间估算

- **总工时**: 10-12 天
- **建议人员**: 1-2 人
- **风险**: 中等（需要充分测试）

---

## 🚨 风险和注意事项

### 风险
1. 功能遗漏或破坏
2. 性能下降
3. 测试不充分

### 缓解措施
1. 保留原文件作为参考
2. 逐步迁移，每步验证
3. 充分的自动化测试
4. Code Review
5. 灰度发布

---

## 📝 下一步行动

1. **Review 本方案**，确认目录结构和拆分策略
2. **创建 Git 分支**: `feature/refactor-allowance-calculator`
3. **开始阶段 1**: 创建目录结构
4. **每完成一个阶段提交代码**，便于回滚
5. **持续测试**，确保功能正常

准备好开始了吗？我可以帮你创建初始的目录结构和第一批文件！
