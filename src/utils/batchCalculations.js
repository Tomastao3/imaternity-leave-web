// 批量计算工具函数
import { cityDataManager, MATERNITY_LEAVE_TYPES, PREGNANCY_PERIODS } from './cityDataUtils';
import { addDays, format } from 'date-fns';
import { findCityByEmployeeName, findEmployeeById, calculateMaternityAllowance, validateEmployeeData } from './maternityCalculations';

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
  
  employees.forEach((employee, index) => {
    const rowNumber = index + 2; // Excel行号（考虑标题行）
    
    // 通过员工姓名查找城市
    const city = findCityByEmployeeName(employee.name);
    if (city) {
      employee.city = city;
    }
    
    const validationErrors = validateEmployeeData(employee);
    
    if (validationErrors.length > 0) {
      errors.push({
        row: rowNumber,
        name: employee.name || '未知',
        employeeId: employee.employeeId || '未知',
        errors: validationErrors
      });
      return;
    }
    
    try {
      // 解析产假情况
      const isDifficultBirth = employee.isDifficultBirth === true || employee.isDifficultBirth === '是' || employee.isDifficultBirth === 'true';
      const numberOfBabies = parseInt(employee.numberOfBabies) || 1;
      const pregnancyPeriod = employee.pregnancyPeriod || PREGNANCY_PERIODS.ABOVE_7_MONTHS;
      
      // 获取员工基本工资（兼容新旧字段名）
      const employeeSalary = employee.employeeBasicSalary || employee.basicSalary;
      
      // 使用公共计算函数
      const allowanceResult = calculateMaternityAllowance(
        city,
        employeeSalary,
        employee.startDate,
        isDifficultBirth,
        numberOfBabies,
        pregnancyPeriod
      );
      
      // 计算社保公积金扣除
      const deductionResult = calculateDeduction(employeeSalary, allowanceResult.totalMaternityDays);
      
      results.push({
        // 基本信息
        name: employee.name,
        employeeId: employee.employeeId,
        city: city,
        department: employee.department || '',
        position: employee.position || '',
        
        // 输入数据
        startDate: employee.startDate,
        basicSalary: parseFloat(employeeSalary),
        employeeBasicSalary: parseFloat(employeeSalary),
        isDifficultBirth,
        numberOfBabies,
        pregnancyPeriod,
        
        // 产假周期计算结果
        endDate: allowanceResult.calculatedPeriod ? allowanceResult.calculatedPeriod.endDate : '',
        totalMaternityDays: allowanceResult.totalMaternityDays,
        workingDays: allowanceResult.calculatedPeriod ? allowanceResult.calculatedPeriod.workingDays : 0,
        appliedRules: allowanceResult.appliedRules,
        
        // 产假津贴计算结果
        socialInsuranceBase: allowanceResult.socialInsuranceBase,
        maternityAllowanceBase: allowanceResult.maternityAllowanceBase,
        dailyAllowance: allowanceResult.dailyAllowance,
        maternityAllowance: allowanceResult.maternityAllowance,
        companyShouldPay: allowanceResult.companyShouldPay,
        companySupplement: allowanceResult.companySupplement,
        personalSocialSecurity: allowanceResult.personalSocialSecurity,
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
        name: employee.name || '未知',
        employeeId: employee.employeeId || '未知',
        errors: [`计算错误: ${error.message}`]
      });
    }
  });
  
  return { results, errors };
};
