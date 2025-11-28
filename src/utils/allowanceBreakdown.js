// Shared helpers to format maternity allowance results consistently across UI and batch flows
import { format as formatDate } from 'date-fns';

const hasOverrideValue = (value) => value !== null && value !== undefined && value !== '';

export const safeNumber = (value) => {
  if (typeof value === 'number') {
    return Number.isFinite(value) ? value : 0;
  }
  if (value === null || value === undefined || value === '') {
    return 0;
  }
  const parsed = parseFloat(value);
  return Number.isFinite(parsed) ? parsed : 0;
};

export const formatCurrency = (value, digits = 2) => {
  const num = Number(value);
  if (!Number.isFinite(num)) {
    return (0).toFixed(digits);
  }
  return num.toFixed(digits);
};

const deriveCityName = (resultData) => `${resultData?.city || resultData?.selectedCity || ''}`.trim();

const buildGovernmentProcess = (resultData, options = {}) => {
  if (!resultData) return '—';
  if (resultData.paymentMethod && resultData.paymentMethod !== '个人账户') {
    return '—';
  }
  // 只有手动填写时才显示"手工填写值"，自动填充时显示计算过程
  if (hasOverrideValue(options.overrideGovernmentPaidAmount) && !options.overrideGovernmentPaidAmountAutoFilled) {
    return '手工填写值';
  }

  const totalDays = safeNumber(resultData.totalMaternityDays);
  const allowanceDays = safeNumber(resultData.totalAllowanceEligibleDays);
  const amount = safeNumber(resultData.governmentPaidAmount ?? resultData.maternityAllowance);
  if ((allowanceDays <= 0 && totalDays <= 0) || amount <= 0) {
    return '—';
  }

  const debugInfo = resultData.debugInfo || {};
  const companyAvg = safeNumber(debugInfo.companyAvg);
  const socialLimit = safeNumber(debugInfo.socialLimit);
  const recordedBase = safeNumber(resultData.maternityAllowanceBase);
  const dailyAllowance = safeNumber(resultData.dailyAllowance);
  const cityName = deriveCityName(resultData);
  const isChengdu = cityName.includes('成都');
  const isTianjin = cityName.includes('天津');

  const baseFromDaily = Number.isFinite(dailyAllowance) && dailyAllowance > 0
    ? (isChengdu
        ? (dailyAllowance * 365) / 12
        : isTianjin
          ? dailyAllowance * 30.4
          : dailyAllowance * 30)
    : null;

  const baseCandidates = [recordedBase, baseFromDaily, companyAvg, socialLimit]
    .filter((val) => Number.isFinite(val) && val > 0);
  const baseForFormula = baseCandidates.length > 0 ? baseCandidates[0] : 0;
  if (baseForFormula <= 0) {
    return '—';
  }

  const divisor = isChengdu ? 365 : isTianjin ? 30.4 : 30;
  const baseSourceLabel = '单位上年度月平均工资';
  const comparisonLine = `取小值（${baseSourceLabel} ${formatCurrency(companyAvg)}, 三倍社保上限 ${formatCurrency(socialLimit)}）`;
  const daysForDisplay = Math.round(allowanceDays > 0 ? allowanceDays : totalDays);
  const daysLabel = allowanceDays > 0 && Math.abs(allowanceDays - totalDays) > 0.01
    ? `${daysForDisplay}天（享受津贴天数）`
    : `${daysForDisplay}天`;
  const formulaLine = isChengdu
    ? `${formatCurrency(baseForFormula)} * 12 / 365 * ${daysLabel} = ${formatCurrency(amount)}`
    : `${formatCurrency(baseForFormula)} / ${divisor} * ${daysLabel} = ${formatCurrency(amount)}`;

  return `${comparisonLine} ${formulaLine}`;
};

const buildEmployeeProcess = (resultData, options = {}) => {
  if (!resultData) return '—';

  const debugInfo = resultData.debugInfo || {};
  const employeeReceivableAmount = safeNumber(resultData.employeeReceivable);
  if (!Number.isFinite(employeeReceivableAmount) || employeeReceivableAmount <= 0) {
    return '—';
  }

  const totalDaysRaw = safeNumber(resultData.totalMaternityDays);
  const allowanceDaysRaw = safeNumber(resultData.totalAllowanceEligibleDays);
  const companyAvg = typeof debugInfo.companyAvg === 'number' ? debugInfo.companyAvg : null;
  const receivableBase = typeof debugInfo.employeeReceivableBase === 'number' ? debugInfo.employeeReceivableBase : null;
  const employeeBaseCurrent = typeof debugInfo.employeeBaseCurrent === 'number' ? debugInfo.employeeBaseCurrent : null;
  const companyDivisor = typeof debugInfo.companyDaysDivisor === 'number' ? debugInfo.companyDaysDivisor : 30;
  const employeeBaseDivisor = typeof debugInfo.employeeBaseDivisor === 'number' ? debugInfo.employeeBaseDivisor : 30;
  const employeeReceivableCalc = safeNumber(debugInfo.employeeReceivableCalc);
  const useContributionBase = debugInfo.useContributionBase === true;
  const baseSource = debugInfo.employeeReceivableBaseSource;

  const employeeBasicForComparison = safeNumber(
    options.employeeBasicSalaryInput ??
    resultData.employeeBasicSalary ??
    resultData.employeeBaseSalaryUsed
  );

  const companyBaseLabel = '单位上年度月平均工资';

  const buildComparisonLine = () => {
    if (!Number.isFinite(companyAvg)) return '';
    return `取大值（${companyBaseLabel} ${formatCurrency(companyAvg)}, 员工产前12月平均工资 ${formatCurrency(Math.max(employeeBasicForComparison, 0))}）\n`;
  };

  let baseLabel = companyBaseLabel;
  if (['employeeBasicOverSocialLimit', 'employeeBasicHigherThanCompanyAvg', 'employeeBasicOnly'].includes(baseSource)) {
    baseLabel = '员工产前12月平均工资';
  } else if (baseSource === 'employeeBaseCurrent') {
    baseLabel = '员工基本工资';
  }

  const baseValue = (() => {
    if (baseSource === 'employeeBaseCurrent' && Number.isFinite(employeeBaseCurrent)) return employeeBaseCurrent;
    if (Number.isFinite(receivableBase)) return receivableBase;
    if (Number.isFinite(companyAvg)) return companyAvg;
    return null;
  })();

  const formatDays = (perDayValue, fallbackDays) => {
    if (!Number.isFinite(perDayValue) || perDayValue <= 0) return fallbackDays;
    const rawDays = employeeReceivableAmount / perDayValue;
    if (!Number.isFinite(rawDays) || rawDays <= 0) return fallbackDays;
    const rounded = Math.round(rawDays);
    if (Math.abs(rawDays - rounded) < 0.01) {
      return rounded;
    }
    return parseFloat(rawDays.toFixed(2));
  };

  const resolveDaysForFormula = (perDayValue, fallbackDays) => {
    const primary = allowanceDaysRaw > 0 ? allowanceDaysRaw : fallbackDays;
    if (Number.isFinite(primary) && primary > 0) {
      return primary;
    }
    const resolved = formatDays(perDayValue, fallbackDays);
    return Number.isFinite(resolved) && resolved > 0 ? resolved : null;
  };

  const formatDaysDisplay = (value) => {
    if (!Number.isFinite(value)) return '—';
    const rounded = Math.round(value);
    if (Math.abs(value - rounded) < 0.01) {
      return `${rounded}`;
    }
    return value.toFixed(2);
  };

  const formattedReceivable = formatCurrency(employeeReceivableAmount);
  const formulaType = debugInfo.employeeReceivableFormulaType;
  const comparisonLine = buildComparisonLine();

  const formatDaysLabel = (value) => {
    if (!Number.isFinite(value) || value <= 0) return '—';
    const roundedDisplay = formatDaysDisplay(value);
    const differsFromTotal = allowanceDaysRaw > 0 && Number.isFinite(totalDaysRaw) && Math.abs(allowanceDaysRaw - totalDaysRaw) > 0.01;
    if (allowanceDaysRaw > 0) {
      return differsFromTotal ? `${roundedDisplay}天（享受津贴天数）` : `${roundedDisplay}天（享受津贴天数）`;
    }
    return `${roundedDisplay}天`;
  };

  const handleBaseFormula = (baseValueLocal, divisor) => {
    const perDay = baseValueLocal / divisor;
    const inferredDays = resolveDaysForFormula(perDay, totalDaysRaw);
    if (!Number.isFinite(inferredDays) || inferredDays <= 0) {
      return comparisonLine ? `${comparisonLine.trimEnd()}缺少基数无法展示公式` : '缺少基数无法展示公式';
    }
    const baseDisplay = formatCurrency(baseValueLocal);
    const daysLabelLocal = formatDaysLabel(inferredDays);
    return `${comparisonLine ? comparisonLine.trimEnd() : ''}${comparisonLine ? '' : `${baseLabel} `}${baseDisplay} / ${divisor} * ${daysLabelLocal} = ${formattedReceivable}`;
  };

  if (typeof formulaType === 'string' && formulaType.toLowerCase().startsWith('chengdu')) {
    if (!Number.isFinite(baseValue) || baseValue <= 0) {
      return '成都算法缺少基数无法展示公式';
    }
    const perDay = (baseValue * 12) / 365;
    const numericDays = resolveDaysForFormula(perDay, totalDaysRaw);
    if (!Number.isFinite(numericDays) || numericDays <= 0) {
      return '成都算法缺少天数无法展示公式';
    }
    const primaryDays = allowanceDaysRaw > 0 ? allowanceDaysRaw : totalDaysRaw;
    const displayDays = Number.isFinite(primaryDays) && primaryDays > 0
      ? primaryDays
      : numericDays;
    const comparisonPrefix = comparisonLine ? comparisonLine.trimEnd() : '取大值（单位上年度月平均工资，员工产前12月平均工资）';
    const label = formatDaysLabel(displayDays);
    return `${comparisonPrefix} ${formatCurrency(baseValue)} * 12 / 365 * ${label} = ${formattedReceivable}`;
  }

  if (formulaType === 'overrideEmployeeBase' && Number.isFinite(employeeBaseCurrent)) {
    const perDay = employeeBaseCurrent / employeeBaseDivisor;
    const numericDays = resolveDaysForFormula(perDay, totalDaysRaw);
    const daysLabelLocal = formatDaysLabel(numericDays);
    return `员工基本工资 ${formatCurrency(employeeBaseCurrent)} / ${employeeBaseDivisor} * ${daysLabelLocal} = ${formattedReceivable}`;
  }

  if (Number.isFinite(baseValue) && baseValue > 0) {
    return handleBaseFormula(baseValue, companyDivisor);
  }

  if (Number.isFinite(companyAvg) && companyAvg > 0) {
    return handleBaseFormula(companyAvg, companyDivisor);
  }

  return comparisonLine ? `${comparisonLine.trimEnd()}缺少基数无法展示公式` : '缺少基数无法展示公式';
};

export const buildSupplementDetails = (resultData, options = {}) => {
  const deductionsInput = Array.isArray(options.deductions) ? options.deductions : [];
  const normalizedDeductions = deductionsInput
    .map((item) => {
      const amount = safeNumber(item?.amount);
      return {
        amount: amount, // 保留负数，负数表示发放金额
        note: item?.note ? String(item.note).trim() : ''
      };
    })
    .filter((item) => item.amount !== 0); // 只过滤掉零值

  const paymentMethod = (resultData?.paymentMethod || '').trim();
  const employeeReceivableAmount = safeNumber(resultData?.employeeReceivable);
  const governmentAmountRaw = safeNumber(resultData?.governmentPaidAmount ?? resultData?.maternityAllowance);
  const governmentAmount = paymentMethod === '个人账户' ? governmentAmountRaw : 0;
  const paidInput = options.paidWageDuringLeave;
  const companyPaidAmountRaw = safeNumber(paidInput);
  const companyPaidAmount = companyPaidAmountRaw > 0 ? companyPaidAmountRaw : 0;

  const rawSupplement = Math.max(0, employeeReceivableAmount - (paymentMethod === '个人账户' ? governmentAmountRaw : companyPaidAmount));

  const effectiveDeductions = paymentMethod === '个人账户' ? normalizedDeductions : [];
  const deductionDetails = effectiveDeductions.map((item) => {
    const absAmount = Math.abs(item.amount);
    const label = item.note || (item.amount > 0 ? '扣减' : '发放');
    return `${label} ${item.amount >= 0 ? '+' : ''}${formatCurrency(absAmount)}`;
  });
  const totalDeductions = effectiveDeductions.reduce((sum, item) => sum + item.amount, 0);
  const deductionSummary = deductionDetails.length > 0 ? deductionDetails.join('；') : '0';

  const buildDeductionFormula = () => {
    if (effectiveDeductions.length === 0) {
      return `减扣项合计 = 0`;
    }
    
    // 构建详细的计算过程：每行一个项目
    const detailedLines = effectiveDeductions.map((item) => {
      const label = item.note || (item.amount > 0 ? '扣减' : '发放');
      const absAmount = Math.abs(item.amount);
      const sign = item.amount >= 0 ? '' : '-';
      return `${label}${sign}${formatCurrency(absAmount)}`;
    }).join('\n');
    
    // 构建纯数字计算：305-100+50
    const numericParts = effectiveDeductions.map((item, index) => {
      const absAmount = Math.abs(item.amount);
      const formattedAmount = formatCurrency(absAmount);
      if (index === 0) {
        // 第一项：正数不加符号，负数加负号
        return item.amount >= 0 ? formattedAmount : `-${formattedAmount}`;
      } else {
        // 后续项：正数加+号，负数加-号
        return item.amount >= 0 ? `+${formattedAmount}` : `-${formattedAmount}`;
      }
    }).join('');
    
    // 构建最终结果
    const result = formatCurrency(totalDeductions);
    
    return `${detailedLines}\n= ${numericParts} = ${result}`;
  };
  const deductionFormula = buildDeductionFormula();
  const adjustedSupplement = Math.max(0, rawSupplement);

  const deductionBreakdown = effectiveDeductions.length > 1
    ? `\n减扣项合计 = ${effectiveDeductions.map((item) => {
        const absAmount = Math.abs(item.amount);
        return item.amount >= 0 ? `+${formatCurrency(absAmount)}` : `-${formatCurrency(absAmount)}`;
      }).join(' ')} = ${totalDeductions >= 0 ? '+' : ''}${formatCurrency(totalDeductions)}`
    : '';

  const formattedEmployeeReceivable = formatCurrency(employeeReceivableAmount);
  const formattedGovernment = formatCurrency(governmentAmountRaw);
  const formattedCompanyPaid = formatCurrency(companyPaidAmount);
  const formattedDeductions = formatCurrency(totalDeductions);
  const formattedRawSupplement = formatCurrency(rawSupplement);
  const formattedAdjusted = formatCurrency(adjustedSupplement);

  let processText;
  if (paymentMethod === '个人账户') {
    processText = `员工应领取 ${formattedEmployeeReceivable} - 政府发放 ${formattedGovernment} = ${formattedEmployeeReceivable} - ${formattedGovernment} = ${formattedRawSupplement}`;
  } else {
    const components = [`员工应领取 ${formattedEmployeeReceivable}`];
    const numericParts = [formattedEmployeeReceivable];
    if (companyPaidAmount > 0) {
      components.push(`公司已发产假工资 ${formattedCompanyPaid}`);
      numericParts.push(formattedCompanyPaid);
    }
    processText = `${components.join(' - ')} = ${numericParts.join(' - ')} = ${formattedRawSupplement}`;
  }

  return {
    employeeReceivableAmount,
    governmentAmount,
    rawSupplement,
    totalDeductions,
    deductionSummary,
    deductionDetails,
    adjustedSupplement,
    companyPaidAmount,
    processText,
    deductionFormula
  };
};

export const buildAllowanceBreakdown = (resultData, options = {}) => {
  if (!resultData) {
    return {
      government: { amount: 0, formatted: formatCurrency(0), process: '—' },
      employee: { amount: 0, formatted: formatCurrency(0), process: '—' },
      supplement: {
        raw: 0,
        formattedRaw: formatCurrency(0),
        adjusted: 0,
        formattedAdjusted: formatCurrency(0),
        totalDeductions: 0,
        deductionSummary: '0',
        process: '—',
        details: null
      }
    };
  }

  const governmentAmountRaw = safeNumber(resultData.governmentPaidAmount ?? resultData.maternityAllowance);
  const governmentAmount = (resultData.paymentMethod && resultData.paymentMethod !== '个人账户') ? 0 : governmentAmountRaw;
  const employeeAmount = safeNumber(resultData.employeeReceivable);

  const supplementDetails = buildSupplementDetails({
    ...resultData,
    governmentPaidAmount: resultData.paymentMethod && resultData.paymentMethod !== '个人账户'
      ? 0
      : resultData.governmentPaidAmount
  }, options);
  const governmentProcess = buildGovernmentProcess(resultData, options);
  const employeeProcess = buildEmployeeProcess(resultData, options);

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
        const monthRange = breakdown.beforeMonths.length === 1
          ? breakdown.beforeMonths[0]
          : `${breakdown.beforeMonths[0]} - ${breakdown.beforeMonths[breakdown.beforeMonths.length - 1]}`;
        adjustments.push({
          monthlyAmount: breakdown.beforeAmount,
          months: breakdown.beforeMonths.length,
          monthRange: monthRange,
          label: '调整前'
        });
      }
      
      if (breakdown.afterMonths && breakdown.afterMonths.length > 0) {
        const monthRange = breakdown.afterMonths.length === 1
          ? breakdown.afterMonths[0]
          : `${breakdown.afterMonths[0]} - ${breakdown.afterMonths[breakdown.afterMonths.length - 1]}`;
        adjustments.push({
          monthlyAmount: breakdown.afterAmount,
          months: breakdown.afterMonths.length,
          monthRange: monthRange,
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
    government: resultData.paymentMethod && resultData.paymentMethod !== '个人账户'
      ? null
      : {
        amount: governmentAmount,
        formatted: formatCurrency(governmentAmount),
        process: governmentProcess
      },
    employee: {
      amount: employeeAmount,
      formatted: formatCurrency(employeeAmount),
      process: employeeProcess
    },
    supplement: {
      raw: supplementDetails.rawSupplement,
      formattedRaw: formatCurrency(supplementDetails.rawSupplement),
      adjusted: supplementDetails.adjustedSupplement,
      formattedAdjusted: formatCurrency(supplementDetails.adjustedSupplement),
      totalDeductions: supplementDetails.totalDeductions,
      deductionSummary: supplementDetails.deductionSummary,
      process: supplementDetails.processText,
      details: supplementDetails
    },
    personalSS: personalSSInfo
  };
};

