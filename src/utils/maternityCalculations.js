// 产假津贴计算公共工具函数
import { cityDataManager, MATERNITY_LEAVE_TYPES, PREGNANCY_PERIODS } from './cityDataUtils';
import { getHolidaySets } from './holidayUtils';
import { addDays, format, startOfMonth, endOfMonth, addDays as dfAddDays, addMonths as dfAddMonths } from 'date-fns';

// 通过员工姓名查找城市
export const findCityByEmployeeName = (employeeName) => {
  try {
    cityDataManager.loadData();
    const allEmployees = cityDataManager.getAllEmployees();
    const employee = allEmployees.find(emp => emp.employeeName === employeeName);
    return employee ? employee.city : null;
  } catch (error) {
    console.error('查找员工城市时发生错误:', error);
    return null;
  }

};

// 列出区间内的工作日日期（用于调试与校验），返回 'yyyy-MM-dd' 字符串数组
function listWorkingDays(start, end, holidays = new Set(), makeupWorkdays = new Set()) {
  const list = [];
  if (!start || !end || start > end) return list;
  for (let d = new Date(start); d <= end; d = dfAddDays(d, 1)) {
    const ds = format(d, 'yyyy-MM-dd');
    const dow = d.getDay();
    const isWeekend = (dow === 0 || dow === 6);
    const isHoliday = holidays.has(ds);
    const isMakeup = makeupWorkdays.has(ds);
    const isWorkday = (!isWeekend && !isHoliday) || (isWeekend && isMakeup);
    if (isWorkday) list.push(ds);
  }
  return list;
}

// 计算区间内的工作日天数（默认周一至周五为工作日；支持传入节假日与调休上班日）
function countWorkingDays(start, end, holidays = new Set(), makeupWorkdays = new Set()) {
  if (!start || !end || start > end) return 0;
  let count = 0;
  for (let d = new Date(start); d <= end; d = dfAddDays(d, 1)) {
    const ds = format(d, 'yyyy-MM-dd');
    const dow = d.getDay(); // 0-6: Sun-Sat
    const isWeekend = (dow === 0 || dow === 6);
    const isHoliday = holidays.has(ds);
    const isMakeup = makeupWorkdays.has(ds);
    // 工作日判断：
    // - 默认工作日：非周末且非节假日
    // - 调休上班：周末但在makeupWorkdays中
    const isWorkday = (!isWeekend && !isHoliday) || (isWeekend && isMakeup);
    if (isWorkday) count += 1;
  }
  return count;
}

// 通过员工工号查找员工信息
export const findEmployeeById = (employeeId) => {
  try {
    cityDataManager.loadData();
    const allEmployees = cityDataManager.getAllEmployees();
    return allEmployees.find(emp => emp.employeeId === employeeId);
  } catch (error) {
    console.error('查找员工信息时发生错误:', error);
    return null;
  }
};

// 根据城市规则自动计算产假天数
export const autoCalculateMaternityDays = (city, isDifficultBirth = false, numberOfBabies = 1, pregnancyPeriod = PREGNANCY_PERIODS.ABOVE_7_MONTHS, isMiscarriage = false, doctorAdviceDays = null) => {
  try {
    let totalDays = 0;
    const maternityRules = cityDataManager.getMaternityRulesByCity(city);
    const appliedRules = [];

    if (!maternityRules || maternityRules.length === 0) {
      return { totalDays: 98, appliedRules: [] };
    }

    // 若选择流产：与其它产假互斥
    if (isMiscarriage) {
      // 医嘱优先
      if (doctorAdviceDays && Number(doctorAdviceDays) > 0) {
        totalDays = parseInt(doctorAdviceDays);
        appliedRules.push({ type: `流产假(${pregnancyPeriod}，医嘱)`, days: totalDays });
        return { totalDays, appliedRules };
      }

      // 默认按怀孕时间段取值
      const periodDefaults = {
        [PREGNANCY_PERIODS.BELOW_4_MONTHS]: 15,
        [PREGNANCY_PERIODS.BETWEEN_4_7_MONTHS]: 42,
        [PREGNANCY_PERIODS.ABOVE_7_MONTHS]: 75
      };
      const fallback = periodDefaults[pregnancyPeriod] ?? 15;
      totalDays = fallback;
      appliedRules.push({ type: `流产假(${pregnancyPeriod})`, days: totalDays });
      return { totalDays, appliedRules };
    }

    // 基础产假（法定产假）
    const legalRule = maternityRules.find(rule => rule.leaveType === MATERNITY_LEAVE_TYPES.LEGAL);
    if (legalRule) {
      totalDays += legalRule.days;
      appliedRules.push({ type: '法定产假', days: legalRule.days });
    }

    // 难产假
    if (isDifficultBirth) {
      const difficultRule = maternityRules.find(rule => rule.leaveType === MATERNITY_LEAVE_TYPES.DIFFICULT_BIRTH);
      if (difficultRule) {
        totalDays += difficultRule.days;
        appliedRules.push({ type: '难产假', days: difficultRule.days });
      }
    }

    // 多胞胎假
    if (numberOfBabies > 1) {
      const multipleRule = maternityRules.find(rule => rule.leaveType === MATERNITY_LEAVE_TYPES.MULTIPLE_BIRTH);
      if (multipleRule) {
        const extraDays = multipleRule.days * (numberOfBabies - 1);
        totalDays += extraDays;
        appliedRules.push({ type: `多胞胎假(${numberOfBabies}胎)`, days: extraDays });
      }
    }

    // 奖励假
    const rewardRule = maternityRules.find(rule => rule.leaveType === MATERNITY_LEAVE_TYPES.REWARD);
    if (rewardRule) {
      totalDays += rewardRule.days;
      appliedRules.push({ type: '奖励假', days: rewardRule.days });
    }

    // 非流产情形下，不叠加流产假

    return { totalDays, appliedRules };
  } catch (error) {
    console.error('计算产假天数时发生错误:', error);
    return { totalDays: 98, appliedRules: [] };
  }
};

// 产假津贴计算（与AllowanceCalculator保持一致）
export const calculateMaternityAllowance = (
  city,
  employeeBasicSalary,
  startDate,
  isDifficultBirth = false,
  numberOfBabies = 1,
  pregnancyPeriod = PREGNANCY_PERIODS.ABOVE_7_MONTHS,
  paymentMethod = '企业账户',
  overrideEndDate = null,
  isMiscarriage = false,
  doctorAdviceDays = null,
  overrideGovernmentPaidAmount = null,
  overridePersonalSSMonthly = null,
  overrideCompanyAvg = null,
  overrideSocialLimit = null,
  employeeBaseSalaryCurrent = null
) => {
  try {
    // 获取城市津贴规则
    const allowanceRule = cityDataManager.getAllowanceRulesByCity(city);
    if (!allowanceRule) {
      throw new Error(`城市 ${city} 没有找到津贴规则`);
    }

    const companyAvg = (overrideCompanyAvg != null && !isNaN(parseFloat(overrideCompanyAvg)))
      ? parseFloat(overrideCompanyAvg)
      : allowanceRule.companyAverageWage;
    const socialLimit = (overrideSocialLimit != null && !isNaN(parseFloat(overrideSocialLimit)))
      ? parseFloat(overrideSocialLimit)
      : allowanceRule.socialAverageWage * 3;
    const employeeBasic = parseFloat(employeeBasicSalary);
    const employeeBaseCurrent = employeeBaseSalaryCurrent != null && !isNaN(parseFloat(employeeBaseSalaryCurrent))
      ? parseFloat(employeeBaseSalaryCurrent)
      : null;
    
    // 自动计算产假天数
    const { totalDays: totalMaternityDays, appliedRules } = autoCalculateMaternityDays(city, isDifficultBirth, numberOfBabies, pregnancyPeriod, isMiscarriage, doctorAdviceDays);

    // 社保发放产假津贴基数（取社保3倍上限和公司平均工资的较小值）
    const maternityAllowanceBase = Math.min(socialLimit, companyAvg);
    
    // 政府发放金额：可被外部覆盖
    const dailyAllowance = maternityAllowanceBase / 30;
    const computedGovernmentPaidAmount = dailyAllowance * totalMaternityDays;
    const governmentPaidAmount = (overrideGovernmentPaidAmount != null && !isNaN(parseFloat(overrideGovernmentPaidAmount)))
      ? parseFloat(overrideGovernmentPaidAmount)
      : computedGovernmentPaidAmount;
    
    // 社保缴费基数（取社保3倍上限和员工基本工资的较小值）
    const socialInsuranceBase = Math.min(socialLimit, employeeBasic);
    
    // 公司应发工资 = 公司平均工资 / 30 * 产假天数
    const companyShouldPay = (companyAvg / 30) * totalMaternityDays;
    
    // 先不急于得出补差金额，需依据“员工应领取金额”的最终口径（见下）
    // 原逻辑：公司补差金额 = 公司应发工资 - 政府发放金额
    // 新业务规则：补差金额 = 员工应领取金额 - 政府发放金额（若为正）
    // 因此将补差的确定放在计算 employeeReceivableCalc 之后。
    let companySupplement = 0;
    
    // 个人社保计算（仅按整月计）：
    // 费率：养老8% + 医疗2% + 失业0.5% + 公积金12% = 22.5%
    const personalRate = 0.08 + 0.02 + 0.005 + 0.12;
    let personalSSMonths = [];
    let personalSocialSecurity = 0;

    // 计算结束日期
    let calculatedPeriod = null;
    // 开始/结束月应发工资（按出勤工作日计发）
    let startMonthWage = null;
    let endMonthWage = null;
    let startMonthMeta = null;
    let endMonthMeta = null;
    if (startDate && totalMaternityDays > 0) {
      const start = new Date(startDate);
      let end = addDays(start, totalMaternityDays - 1);
      // 如果提供了覆盖的结束日期（例如用户手动编辑了结束日），以该日期为准
      if (overrideEndDate) {
        const od = new Date(overrideEndDate);
        if (!isNaN(od.getTime())) {
          end = od;
        }
      }
      
      calculatedPeriod = {
        startDate: format(start, 'yyyy年MM月dd日'),
        endDate: format(end, 'yyyy年MM月dd日'),
        actualDays: totalMaternityDays,
        workingDays: Math.floor(totalMaternityDays * 5 / 7),
        period: `${format(start, 'yyyy年MM月dd日')} - ${format(end, 'yyyy年MM月dd日')}`
      };

      // 计算整月区间：仅将完全覆盖的月份计入个人社保缴费月份
      const firstMonth = startOfMonth(start);
      const lastMonth = startOfMonth(end);
      for (let m = new Date(firstMonth); m <= lastMonth; m = dfAddMonths(m, 1)) {
        const mStart = startOfMonth(m);
        const mEnd = endOfMonth(m);
        if (start <= mStart && end >= mEnd) {
          personalSSMonths.push(format(mStart, 'yyyy-MM'));
        }
      }
      // 个人社保缴费：可被“社保公积金个人月缴费”覆盖（按整月）
      const computedMonthly = employeeBasic * personalRate;
      const monthlyOverride = (overridePersonalSSMonthly != null && !isNaN(parseFloat(overridePersonalSSMonthly)))
        ? parseFloat(overridePersonalSSMonthly)
        : computedMonthly;
      personalSocialSecurity = monthlyOverride * personalSSMonths.length;

      // 计算开始月与结束月的出勤工资（不含产假期间）
      // 自动加载对应年份的节假日与调休上班日；如跨年则合并集合
      const startYear = start.getFullYear();
      const endYearY = end.getFullYear();
      const { holidays: h1, makeupWorkdays: m1 } = getHolidaySets(startYear);
      let holidays = new Set([...h1]);
      let makeupWorkdays = new Set([...m1]);
      if (endYearY !== startYear) {
        const { holidays: h2, makeupWorkdays: m2 } = getHolidaySets(endYearY);
        holidays = new Set([...holidays, ...h2]);
        makeupWorkdays = new Set([...makeupWorkdays, ...m2]);
      }

      // 开始月
      const startMonthStart = startOfMonth(start);
      const startMonthEnd = endOfMonth(start);
      const startMonthWorkingDays = countWorkingDays(startMonthStart, startMonthEnd, holidays, makeupWorkdays);
      const startActualWorkDays = start > startMonthStart
        ? countWorkingDays(startMonthStart, dfAddDays(start, -1), holidays, makeupWorkdays)
        : 0;
      if (startMonthWorkingDays > 0) {
        startMonthWage = (employeeBasic / startMonthWorkingDays) * startActualWorkDays;
        startMonthMeta = {
          month: format(start, 'yyyy-MM'),
          monthWorkingDays: startMonthWorkingDays,
          actualWorkingDays: startActualWorkDays
        };
      }

      // 结束月
      const endMonthStart = startOfMonth(end);
      const endMonthEnd = endOfMonth(end);
      const endMonthWorkingDays = countWorkingDays(endMonthStart, endMonthEnd, holidays, makeupWorkdays);
      const endRangeStart = dfAddDays(end, 1);
      const endActualWorkDays = end < endMonthEnd
        ? countWorkingDays(endRangeStart, endMonthEnd, holidays, makeupWorkdays)
        : 0;
      if (endMonthWorkingDays > 0) {
        endMonthWage = (employeeBasic / endMonthWorkingDays) * endActualWorkDays;
        endMonthMeta = {
          month: format(end, 'yyyy-MM'),
          monthWorkingDays: endMonthWorkingDays,
          actualWorkingDays: endActualWorkDays,
          // 调试：列出结束月实际工作日日期
          workdaysList: end < endMonthEnd ? listWorkingDays(endRangeStart, endMonthEnd, holidays, makeupWorkdays) : []
        };
      }
    }

    // 实际补差计算（仅用于个人账户显示）
    const actualCompensation = Math.max(0, companySupplement - personalSocialSecurity);
    
    // 员工实际可得 = 公司补差金额 - 个人社保缴费
    const totalReceived = Math.max(0, companySupplement - personalSocialSecurity);

    // 产假条件信息
    const pregnancyConditions = {
      isDifficultBirth,
      numberOfBabies,
      pregnancyPeriod
    };

    // 员工应领取金额默认按公司应发（公司平均工资基数）
    let employeeReceivableCalc = companyShouldPay;
    // 业务规则：若“员工基本工资”同时高于“单位申报的上年度月平均工资”和“员工产前12个月的月均工资”，
    // 则员工应领金额 = 员工基本工资 / 30 * 产假天数
    if (employeeBaseCurrent != null && employeeBaseCurrent > companyAvg && employeeBaseCurrent > employeeBasic) {
      employeeReceivableCalc = (employeeBaseCurrent / 30) * totalMaternityDays;
    }

    // 根据新规则计算补差
    companySupplement = Math.max(0, employeeReceivableCalc - governmentPaidAmount);

    return {
      city,
      totalMaternityDays,
      appliedRules,
      calculatedPeriod,
      pregnancyConditions,
      socialInsuranceBase: parseFloat(socialInsuranceBase.toFixed(2)),
      maternityAllowanceBase: parseFloat(maternityAllowanceBase.toFixed(2)),
      dailyAllowance: parseFloat(dailyAllowance.toFixed(2)),
      governmentPaidAmount: parseFloat(governmentPaidAmount.toFixed(2)),
      // 为向后兼容保留字段
      maternityAllowance: parseFloat(governmentPaidAmount.toFixed(2)),
      employeeReceivable: parseFloat(employeeReceivableCalc.toFixed(2)),
      // 兼容旧字段名（过渡期保留）
      companyShouldPay: parseFloat(companyShouldPay.toFixed(2)),
      companySupplement: parseFloat(companySupplement.toFixed(2)),
      personalSocialSecurity: parseFloat(personalSocialSecurity.toFixed(2)),
      actualCompensation: parseFloat(actualCompensation.toFixed(2)),
      totalReceived: parseFloat(totalReceived.toFixed(2)),
      isSupplementNeeded: companySupplement > 0,
      paymentMethod,
      // 开始/结束月按工作日计发工资
      startMonthProratedWage: startMonthWage !== null ? parseFloat(startMonthWage.toFixed(2)) : null,
      endMonthProratedWage: endMonthWage !== null ? parseFloat(endMonthWage.toFixed(2)) : null,
      startMonthMeta,
      endMonthMeta,
      // 个人社保缴费按整月统计
      personalSSMonths,
      personalSSMonthsCount: personalSSMonths.length,
      // 调试信息
      debugInfo: {
        companyAvg,
        socialLimit,
        maternityAllowanceBase,
        governmentPaidAmount: parseFloat(governmentPaidAmount.toFixed(2)),
        employeeBasic,
        employeeBaseCurrent: employeeBaseCurrent ?? null,
        employeeReceivableCalc: parseFloat(employeeReceivableCalc.toFixed(2)),
        overrideRuleApplied: employeeBaseCurrent != null && employeeBaseCurrent > companyAvg && employeeBaseCurrent > employeeBasic
      }
    };
  } catch (error) {
    console.error('计算津贴时发生错误:', error);
    throw error;
  }
};

// 数据验证函数
export const validateEmployeeData = (employee) => {
  const errors = [];
  
  if (!employee.name || employee.name.trim() === '') {
    errors.push('员工姓名不能为空');
  }
  
  if (!employee.employeeId || employee.employeeId.trim() === '') {
    errors.push('员工编号不能为空');
  }
  
  if (!employee.startDate || isNaN(new Date(employee.startDate).getTime())) {
    errors.push('产假开始日期格式不正确');
  }
  
  const salary = employee.employeeBasicSalary || employee.basicSalary;
  if (!salary || isNaN(parseFloat(salary)) || parseFloat(salary) <= 0) {
    errors.push('员工产前12个月的月均工资必须是正数');
  }
  
  // 通过员工姓名查找城市
  const city = findCityByEmployeeName(employee.name);
  if (!city) {
    errors.push(`未找到员工 ${employee.name} 的城市信息`);
  } else {
    // 验证城市是否存在津贴规则
    try {
      cityDataManager.loadData();
      const allowanceRule = cityDataManager.getAllowanceRulesByCity(city);
      if (!allowanceRule) {
        errors.push(`城市 ${city} 没有找到津贴规则`);
      }
    } catch (error) {
      errors.push('无法验证城市津贴规则');
    }
  }
  
  return errors;
};
