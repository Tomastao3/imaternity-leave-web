// 计算过程格式化工具函数
// 用于生成产假工资计算的显示文本

/**
 * 格式化月度工资计算过程
 * @param {Object} meta - 月度元数据
 * @param {string} meta.month - 月份 (yyyy-MM)
 * @param {number} meta.monthWorkingDays - 当月工作日天数
 * @param {number} meta.monthHolidayDays - 当月法定假日天数
 * @param {number} meta.actualWorkingDays - 实际出勤天数
 * @param {number} meta.salaryUsed - 使用的工资基数
 * @param {Object} options - 格式化选项
 * @param {number} options.monthlySS - 月度个人部分社保公积金合计
 * @param {number} options.monthlyUnionFee - 月度工会费
 * @param {string} options.salaryLabel - 工资标签（如"员工基本工资"、"员工基本工资（调整前）"等）
 * @param {Function} options.formatCurrency - 货币格式化函数
 * @returns {Object} { process: string, baseWage: number, finalWage: number }
 */
export const formatMonthWageProcess = (meta, options = {}) => {
  if (!meta) return { process: '按工作日比例计算', baseWage: 0, finalWage: 0 };
  
  const {
    monthWorkingDays = 0,
    monthHolidayDays = 0,
    actualWorkingDays = 0,
    salaryUsed = 0
  } = meta;
  
  if (!monthWorkingDays) return { process: '按工作日比例计算', baseWage: 0, finalWage: 0 };
  
  const {
    monthlySS = 0,
    monthlyUnionFee = 0,
    salaryLabel = '员工基本工资',
    formatCurrency = (n) => {
      if (n == null || isNaN(n)) return '0.00';
      return Math.abs(n).toFixed(2);
    }
  } = options;
  
  // 分母 = 工作日 + 法定假日
  const denominator = monthWorkingDays + monthHolidayDays;
  const baseWage = (salaryUsed / denominator) * actualWorkingDays;
  const finalWage = baseWage - monthlySS - monthlyUnionFee;
  
  // 构建计算过程文本（新格式）
  let process = '';
  
  if (monthlySS > 0 || monthlyUnionFee > 0) {
    // 第一行：计算应发工资
    if (monthHolidayDays > 0) {
      process = `应发工资 = ${salaryLabel} / (工作日${monthWorkingDays}天 + 法定假日${monthHolidayDays}天) × 出勤${actualWorkingDays}天 = ${formatCurrency(salaryUsed)} / (${monthWorkingDays} + ${monthHolidayDays}) * ${actualWorkingDays} = ${formatCurrency(baseWage)};`;
    } else {
      process = `应发工资 = ${salaryLabel} / 工作日${monthWorkingDays}天 × 出勤${actualWorkingDays}天 = ${formatCurrency(salaryUsed)} / ${monthWorkingDays} * ${actualWorkingDays} = ${formatCurrency(baseWage)};`;
    }
    
    // 第二行：计算减扣后金额
    process += `\n减扣后 = 应发工资`;
    
    // 添加扣除项标签
    if (monthlySS > 0) {
      process += ` - 个人部分社保公积金`;
    }
    if (monthlyUnionFee > 0) {
      process += ` - 工会费`;
    }
    
    // 添加数值计算
    process += ` = ${formatCurrency(baseWage)}`;
    if (monthlySS > 0) {
      process += ` - ${formatCurrency(monthlySS)}`;
    }
    if (monthlyUnionFee > 0) {
      process += ` - ${formatCurrency(monthlyUnionFee)}`;
    }
    process += ` = ${formatCurrency(finalWage)}`;
  } else {
    // 无扣除项的情况
    if (monthHolidayDays > 0) {
      process = `应发工资=${salaryLabel}/(工作日${monthWorkingDays}天+法定假日${monthHolidayDays}天)×出勤${actualWorkingDays}天=${formatCurrency(salaryUsed)}/(${monthWorkingDays}+${monthHolidayDays})*${actualWorkingDays}=${formatCurrency(baseWage)}`;
    } else {
      process = `应发工资=${salaryLabel}/工作日${monthWorkingDays}天×出勤${actualWorkingDays}天=${formatCurrency(salaryUsed)}/${monthWorkingDays}*${actualWorkingDays}=${formatCurrency(baseWage)}`;
    }
  }
  
  return { process, baseWage, finalWage };
};

/**
 * 格式化产假首月工资计算过程
 * @param {Object} resultData - 计算结果数据
 * @param {Object} options - 格式化选项
 * @returns {string} 格式化后的计算过程文本
 */
export const formatStartMonthProcess = (resultData, options = {}) => {
  if (!resultData || resultData.startMonthProratedWage == null) {
    return '按工作日比例计算';
  }
  
  const meta = resultData.startMonthMeta;
  if (!meta) return '按工作日比例计算';
  
  const salaryUsedRaw = meta.salaryUsed ?? resultData.employeeBaseSalaryUsed ?? resultData.employeeBasicSalary;
  const salaryUsed = typeof salaryUsedRaw === 'number' && isFinite(salaryUsedRaw) ? salaryUsedRaw : 0;
  
  // 确定工资标签
  let salaryLabel = '员工基本工资';
  const { salaryBeforeAdjustment, salaryAfterAdjustment, salaryAdjustmentMonth } = options;
  
  if (salaryBeforeAdjustment && salaryAfterAdjustment && salaryAdjustmentMonth) {
    const adjustBefore = parseFloat(salaryBeforeAdjustment);
    const adjustAfter = parseFloat(salaryAfterAdjustment);
    if (Number.isFinite(adjustBefore) && Math.abs(salaryUsed - adjustBefore) < 0.01) {
      salaryLabel = '员工基本工资（调整前）';
    } else if (Number.isFinite(adjustAfter) && Math.abs(salaryUsed - adjustAfter) < 0.01) {
      salaryLabel = '员工基本工资（调整后）';
    }
  }
  
  const { process } = formatMonthWageProcess(
    { ...meta, salaryUsed },
    { ...options, salaryLabel }
  );
  
  return process;
};

/**
 * 格式化产假结束月工资计算过程
 * @param {Object} resultData - 计算结果数据
 * @param {Object} options - 格式化选项
 * @returns {string} 格式化后的计算过程文本
 */
export const formatEndMonthProcess = (resultData, options = {}) => {
  if (!resultData || resultData.endMonthProratedWage == null) {
    return '按工作日比例计算';
  }
  
  const meta = resultData.endMonthMeta;
  if (!meta) return '按工作日比例计算';
  
  const salaryUsedRaw = meta.salaryUsed ?? resultData.employeeBaseSalaryUsed ?? resultData.employeeBasicSalary;
  const salaryUsed = typeof salaryUsedRaw === 'number' && isFinite(salaryUsedRaw) ? salaryUsedRaw : 0;
  
  // 确定工资标签
  let salaryLabel = '员工基本工资';
  const { salaryBeforeAdjustment, salaryAfterAdjustment, salaryAdjustmentMonth } = options;
  
  if (salaryBeforeAdjustment && salaryAfterAdjustment && salaryAdjustmentMonth) {
    const adjustBefore = parseFloat(salaryBeforeAdjustment);
    const adjustAfter = parseFloat(salaryAfterAdjustment);
    if (Number.isFinite(adjustBefore) && Math.abs(salaryUsed - adjustBefore) < 0.01) {
      salaryLabel = '员工基本工资（调整前）';
    } else if (Number.isFinite(adjustAfter) && Math.abs(salaryUsed - adjustAfter) < 0.01) {
      salaryLabel = '员工基本工资（调整后）';
    }
  }
  
  const { process } = formatMonthWageProcess(
    { ...meta, salaryUsed },
    { ...options, salaryLabel }
  );
  
  return process;
};

/**
 * 格式化个人社保公积金计算过程
 * @param {Object} resultData - 计算结果数据
 * @param {Object} breakdown - 津贴明细数据
 * @param {Function} formatCurrency - 货币格式化函数
 * @returns {string} 格式化后的计算过程文本
 */
export const formatPersonalSSProcess = (resultData, breakdown, formatCurrency) => {
  if (!resultData || !Number.isFinite(Number(resultData.personalSocialSecurity))) {
    return '无整月产假，不计算个人社保';
  }

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
          segments.push(`${label} 月度个人部分社保公积金 ${formatCurrency(adj.monthlyAmount)} × ${adj.months}个月${monthRange}`);
          calculations.push(`${formatCurrency(adj.monthlyAmount)} × ${adj.months}`);
        }
      });

      if (segments.length > 0) {
        return `${segments.join('\n')}\n= ${calculations.join(' + ')} = ${formatCurrency(resultData.personalSocialSecurity)}`;
      }
    }
  }

  // 统一费率，显示单一计算
  const baseMonthly = (() => {
    if (breakdown && breakdown.personalSS && breakdown.personalSS.monthlyAmount) {
      return breakdown.personalSS.monthlyAmount;
    }
    if (resultData.personalSSMonthsCount > 0) {
      return Number(resultData.personalSocialSecurity) / resultData.personalSSMonthsCount;
    }
    return 0;
  })();

  const monthsSpan = resultData.personalSSMonths && resultData.personalSSMonths.length > 0
    ? `（${resultData.personalSSMonths[0]} - ${resultData.personalSSMonths[resultData.personalSSMonths.length - 1]}）`
    : '';

  return `月度个人部分社保公积金合计 ${formatCurrency(baseMonthly)} × ${resultData.personalSSMonthsCount}个月${monthsSpan} = ${formatCurrency(resultData.personalSocialSecurity)}`;
};
