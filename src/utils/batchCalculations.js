// 批量计算工具函数
import { cityDataManager, MATERNITY_LEAVE_TYPES, PREGNANCY_PERIODS } from './cityDataUtils';
import { addDays, format } from 'date-fns';
import { findCityByEmployeeName, findEmployeeById, calculateMaternityAllowance, validateEmployeeData } from './maternityCalculations';
import { buildAllowanceBreakdown } from './allowanceBreakdown';

// 产假周期计算
export const calculateMaternityPeriod = (startDate, maternityDays) => {
  const start = new Date(startDate);
  const end = new Date(start);
  end.setDate(start.getDate() + parseInt(maternityDays) - 1);
  
  // 计算工作日（简化计算，排除周末）
  let workDays = 0;
  const current = new Date(start);
  while (current <= end) {
    const dayOfWeek = current.getDay();
    if (dayOfWeek !== 0 && dayOfWeek !== 6) { // 不是周末
      workDays++;
    }
    current.setDate(current.getDate() + 1);
  }
  
  return {
    startDate: start.toISOString().split('T')[0],
    endDate: end.toISOString().split('T')[0],
    totalDays: parseInt(maternityDays),
    workDays: workDays
  };
};

// 产假津贴计算
export const calculateAllowance = (companyAvgSalary, socialInsuranceLimit, employeeAvgSalary, maternityDays = 98) => {
  const socialLimit = parseFloat(socialInsuranceLimit);
  const employeeAvg = parseFloat(employeeAvgSalary);
  const days = parseInt(maternityDays);
  
  // 计算社保基数（取社保3倍上限和员工平均工资的较小值）
  const socialInsuranceBase = Math.min(socialLimit, employeeAvg);
  
  // 产假津贴 = 社保基数 / 30 * 产假天数
  const dailyAllowance = socialInsuranceBase / 30;
  const maternityAllowance = dailyAllowance * days;
  
  // 公司需要补差的金额 = 员工平均工资 - 产假津贴（如果员工工资高于津贴）
  const companySupplement = Math.max(0, employeeAvg - maternityAllowance);
  
  // 员工实际可得 = 产假津贴 + 公司补差
  const totalReceived = maternityAllowance + companySupplement;

  return {
    socialInsuranceBase: parseFloat(socialInsuranceBase.toFixed(2)),
    dailyAllowance: parseFloat(dailyAllowance.toFixed(2)),
    maternityAllowance: parseFloat(maternityAllowance.toFixed(2)),
    companySupplement: parseFloat(companySupplement.toFixed(2)),
    totalReceived: parseFloat(totalReceived.toFixed(2)),
    isSupplementNeeded: companySupplement > 0
  };
};

// 社保公积金扣除计算
export const calculateDeduction = (employeeAvgSalary, maternityDays) => {
  const salary = parseFloat(employeeAvgSalary);
  const days = parseInt(maternityDays);
  
  // 扣除比例
  const rates = {
    pension: 0.08,      // 养老保险 8%
    medical: 0.02,      // 医疗保险 2%
    unemployment: 0.005, // 失业保险 0.5%
    housing: 0.12       // 住房公积金 12%
  };
  
  // 月度扣除标准
  const monthlyDeductions = {
    pension: salary * rates.pension,
    medical: salary * rates.medical,
    unemployment: salary * rates.unemployment,
    housing: salary * rates.housing
  };
  
  const totalMonthlyDeduction = Object.values(monthlyDeductions).reduce((sum, amount) => sum + amount, 0);
  
  // 产假期间实际扣除金额 = 月度标准 × (产假天数 / 30)
  const actualDeductions = {
    pension: monthlyDeductions.pension * (days / 30),
    medical: monthlyDeductions.medical * (days / 30),
    unemployment: monthlyDeductions.unemployment * (days / 30),
    housing: monthlyDeductions.housing * (days / 30)
  };
  
  const totalActualDeduction = Object.values(actualDeductions).reduce((sum, amount) => sum + amount, 0);
  
  return {
    monthlyDeductions: {
      pension: parseFloat(monthlyDeductions.pension.toFixed(2)),
      medical: parseFloat(monthlyDeductions.medical.toFixed(2)),
      unemployment: parseFloat(monthlyDeductions.unemployment.toFixed(2)),
      housing: parseFloat(monthlyDeductions.housing.toFixed(2)),
      total: parseFloat(totalMonthlyDeduction.toFixed(2))
    },
    actualDeductions: {
      pension: parseFloat(actualDeductions.pension.toFixed(2)),
      medical: parseFloat(actualDeductions.medical.toFixed(2)),
      unemployment: parseFloat(actualDeductions.unemployment.toFixed(2)),
      housing: parseFloat(actualDeductions.housing.toFixed(2)),
      total: parseFloat(totalActualDeduction.toFixed(2))
    }
  };
};


// 批量处理员工数据（使用公共计算函数）
export const processBatchData = (employees) => {
  const results = [];
  const errors = [];

  // 确保数据已加载
  cityDataManager.loadData();

  const trimString = (value) => (typeof value === 'string' ? value.trim() : value);
  const parseNumber = (value) => {
    if (value === null || value === undefined || value === '') return NaN;
    if (typeof value === 'number') return Number.isFinite(value) ? value : NaN;
    const normalized = String(value).replace(/[\s,]/g, '');
    const parsed = parseFloat(normalized);
    return Number.isFinite(parsed) ? parsed : NaN;
  };
  const normalizeBoolean = (value) => {
    if (typeof value === 'boolean') return value;
    if (value == null) return false;
    const normalized = String(value).trim().toLowerCase();
    return ['是', 'true', '1', 'y', 'yes'].includes(normalized);
  };
  const safeNumber = (value) => (Number.isFinite(value) ? value : 0);

  employees.forEach((employee, index) => {
    const rowNumber = index + 2; // Excel行号（考虑标题行）
    const name = trimString(employee.name);
    const employeeId = trimString(employee.employeeId);

    let resolvedCity = trimString(employee.city);
    if (!resolvedCity && name) {
      const cityByName = findCityByEmployeeName(name);
      if (cityByName) {
        resolvedCity = trimString(cityByName);
      }
    }
    if (!resolvedCity && employeeId) {
      const employeeRecord = findEmployeeById(employeeId);
      if (employeeRecord && employeeRecord.city) {
        resolvedCity = trimString(employeeRecord.city);
      }
    }
    if (resolvedCity) {
      employee.city = resolvedCity;
    }

    const validationErrors = validateEmployeeData(employee);

    if (validationErrors.length > 0) {
      errors.push({
        row: rowNumber,
        name: name || '未知',
        employeeId: employeeId || '未知',
        errors: validationErrors
      });
      return;
    }

    try {
      const city = employee.city;
      const employeeBasicSalaryNumber = parseNumber(employee.employeeBasicSalary ?? employee.basicSalary);
      const employeeBaseSalaryCurrent = parseNumber(employee.employeeBaseSalary ?? employee.employeeBaseSalaryCurrent);
      const companyAvgSalaryOverride = parseNumber(
        employee.companyAvgSalaryOverride ?? employee.companyAverageSalaryOverride ?? employee.companyAvgSalary ?? employee.companyAverageSalary
      );
      const socialInsuranceLimitOverride = parseNumber(
        employee.socialInsuranceLimitOverride ?? employee.socialInsuranceLimit ?? employee.socialLimitOverride ?? employee.socialLimit
      );
      const overrideGovernmentPaidAmount = parseNumber(employee.overrideGovernmentPaidAmount);
      const overridePersonalSSMonthly = parseNumber(employee.overridePersonalSSMonthly);
      const companyPaidAmount = parseNumber(employee.companyPaidWage ?? employee.companyPaidAmount);
      const numberOfBabies = Number.isFinite(parseInt(employee.numberOfBabies, 10))
        ? parseInt(employee.numberOfBabies, 10)
        : 1;
      const pregnancyPeriod = trimString(employee.pregnancyPeriod) || PREGNANCY_PERIODS.ABOVE_7_MONTHS;
      const paymentMethodRaw = trimString(employee.paymentMethod);
      const paymentMethod = paymentMethodRaw
        ? paymentMethodRaw.includes('个')
          ? '个人账户'
          : paymentMethodRaw.includes('企')
            ? '企业账户'
            : paymentMethodRaw
        : '企业账户';
      const overrideEndDate = trimString(employee.endDateOverride || employee.overrideEndDate || employee.endDate) || null;
      const isDifficultBirth = normalizeBoolean(employee.isDifficultBirth);
      const meetsSupplementalDifficultBirth = normalizeBoolean(employee.meetsSupplementalDifficultBirth);
      const isMiscarriage = normalizeBoolean(employee.isMiscarriage);
      const doctorAdviceDaysRaw = employee.doctorAdviceDays;
      const doctorAdviceDays = Number.isFinite(parseInt(doctorAdviceDaysRaw, 10))
        ? parseInt(doctorAdviceDaysRaw, 10)
        : null;
      const isSecondThirdChild = normalizeBoolean(employee.isSecondThirdChild);

      const salaryAdjustment = employee.salaryAdjustment && typeof employee.salaryAdjustment === 'object'
        ? {
            before: parseNumber(employee.salaryAdjustment.before),
            after: parseNumber(employee.salaryAdjustment.after),
            month: trimString(employee.salaryAdjustment.month)
          }
        : null;

      const socialSecurityAdjustment = employee.socialSecurityAdjustment && typeof employee.socialSecurityAdjustment === 'object'
        ? {
            before: parseNumber(employee.socialSecurityAdjustment.before),
            after: parseNumber(employee.socialSecurityAdjustment.after),
            month: trimString(employee.socialSecurityAdjustment.month)
          }
        : null;

      const allowanceResult = calculateMaternityAllowance(
        city,
        employeeBasicSalaryNumber,
        employee.startDate,
        isDifficultBirth,
        numberOfBabies,
        pregnancyPeriod,
        paymentMethod,
        overrideEndDate,
        isMiscarriage,
        doctorAdviceDays,
        meetsSupplementalDifficultBirth,
        Number.isFinite(overrideGovernmentPaidAmount) ? overrideGovernmentPaidAmount : null,
        Number.isFinite(overridePersonalSSMonthly) ? overridePersonalSSMonthly : null,
        Number.isFinite(companyAvgSalaryOverride) ? companyAvgSalaryOverride : null,
        Number.isFinite(socialInsuranceLimitOverride) ? socialInsuranceLimitOverride : null,
        Number.isFinite(employeeBaseSalaryCurrent) ? employeeBaseSalaryCurrent : null,
        salaryAdjustment,
        socialSecurityAdjustment,
        isSecondThirdChild
      );

      const deductionResult = calculateDeduction(
        Number.isFinite(employeeBasicSalaryNumber) ? employeeBasicSalaryNumber : allowanceResult.employeeReceivable,
        allowanceResult.totalMaternityDays
      );

      const deductionEntries = Array.isArray(employee.deductions)
        ? employee.deductions
            .map((item) => ({
              amount: parseNumber(item?.amount),
              note: trimString(item?.note)
            }))
            .filter((item) => Number.isFinite(item.amount) && item.amount > 0)
        : [];

      const allowancesBreakdown = buildAllowanceBreakdown(allowanceResult, {
        deductions: deductionEntries,
        paidWageDuringLeave: companyPaidAmount,
        overrideGovernmentPaidAmount,
        employeeBasicSalaryInput: employeeBasicSalaryNumber
      });

      const supplementInfo = allowancesBreakdown.supplement?.details;
      const adjustedSupplement = allowancesBreakdown.supplement?.adjusted || 0;
      const totalDeductions = allowancesBreakdown.supplement?.totalDeductions || 0;
      const supplementProcess = allowancesBreakdown.supplement?.process || '';
      const deductionSummary = supplementInfo?.deductionSummary || '0';
      const companyPaidFinal = supplementInfo?.companyPaidAmount ?? 0;

      const overrideFlags = {
        overrideGovernmentPaidAmount: Number.isFinite(overrideGovernmentPaidAmount),
        overridePersonalSSMonthly: Number.isFinite(overridePersonalSSMonthly),
        overrideCompanyAvg: Number.isFinite(companyAvgSalaryOverride),
        overrideSocialLimit: Number.isFinite(socialInsuranceLimitOverride)
      };

      results.push({
        // 基本信息
        name,
        employeeId,
        city,
        department: employee.department || '',
        position: employee.position || '',
        paymentMethod,

        // 输入数据
        startDate: employee.startDate,
        endDateOverride: overrideEndDate,
        basicSalary: safeNumber(employeeBasicSalaryNumber),
        employeeBasicSalary: safeNumber(employeeBasicSalaryNumber),
        employeeBaseSalary: Number.isFinite(employeeBaseSalaryCurrent) ? parseFloat(employeeBaseSalaryCurrent.toFixed(2)) : null,
        companyAvgSalaryOverride: Number.isFinite(companyAvgSalaryOverride) ? parseFloat(companyAvgSalaryOverride.toFixed(2)) : null,
        socialInsuranceLimitOverride: Number.isFinite(socialInsuranceLimitOverride) ? parseFloat(socialInsuranceLimitOverride.toFixed(2)) : null,
        isDifficultBirth,
        numberOfBabies,
        pregnancyPeriod,
        isMiscarriage,
        doctorAdviceDays,
        meetsSupplementalDifficultBirth,
        isSecondThirdChild,
        overrideFlags,
        salaryAdjustment,
        socialSecurityAdjustment,
        companyPaidAmount: parseFloat(companyPaidFinal.toFixed(2)),
        deductions: deductionEntries,
        deductionsTotal: parseFloat(totalDeductions.toFixed(2)),
        deductionSummary,
        remark: employee.remark || '',

        // 产假周期计算结果
        endDate: allowanceResult.calculatedPeriod ? allowanceResult.calculatedPeriod.endDate : overrideEndDate || '',
        totalMaternityDays: allowanceResult.totalMaternityDays,
        workingDays: allowanceResult.calculatedPeriod ? allowanceResult.calculatedPeriod.workingDays : 0,
        appliedRules: allowanceResult.appliedRules,
        appliedPolicySummary: allowanceResult.appliedPolicySummary,
        calculatedPeriod: allowanceResult.calculatedPeriod,

        // 产假津贴计算结果
        socialInsuranceBase: allowanceResult.socialInsuranceBase,
        maternityAllowanceBase: allowanceResult.maternityAllowanceBase,
        dailyAllowance: allowanceResult.dailyAllowance,
        maternityAllowance: allowanceResult.maternityAllowance,
        companyShouldPay: allowanceResult.companyShouldPay,
        companySupplement: allowanceResult.companySupplement,
        governmentPaidAmount: allowanceResult.governmentPaidAmount,
        employeeReceivable: allowanceResult.employeeReceivable,
        adjustedSupplement,
        supplementProcess,
        deductionSummaryDisplay: deductionSummary,
        personalSocialSecurity: allowanceResult.personalSocialSecurity,
        personalSSBreakdown: allowanceResult.personalSSBreakdown,
        totalReceived: allowanceResult.totalReceived,

        // 社保公积金扣除结果
        monthlyPensionDeduction: deductionResult.monthlyDeductions.pension,
        monthlyMedicalDeduction: deductionResult.monthlyDeductions.medical,
        monthlyUnemploymentDeduction: deductionResult.monthlyDeductions.unemployment,
        monthlyHousingDeduction: deductionResult.monthlyDeductions.housing,
        totalMonthlyDeduction: deductionResult.monthlyDeductions.total,

        actualPensionDeduction: deductionResult.actualDeductions.pension,
        actualMedicalDeduction: deductionResult.actualDeductions.medical,
        actualUnemploymentDeduction: deductionResult.actualDeductions.unemployment,
        actualHousingDeduction: deductionResult.actualDeductions.housing,
        totalActualDeduction: deductionResult.actualDeductions.total
      });
    } catch (error) {
      errors.push({
        row: rowNumber,
        name: name || '未知',
        employeeId: employeeId || '未知',
        errors: [`计算错误: ${error.message}`]
      });
    }
  });

  return { results, errors };
};
