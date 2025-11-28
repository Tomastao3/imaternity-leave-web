// 产假津贴计算公共工具函数
import { cityDataManager, MATERNITY_LEAVE_TYPES, PREGNANCY_PERIODS } from './cityDataUtils';
import { getHolidaySets, getHolidayDetails } from './holidayUtils';
import { addDays, format, startOfMonth, endOfMonth, addDays as dfAddDays, addMonths as dfAddMonths, startOfDay, endOfDay } from 'date-fns';

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

// 计算区间内的法定假日天数（不包括周末，只计算 isLegalHoliday=true 的节假日）
function countHolidays(start, end, holidayDetailsArray = []) {
  if (!start || !end || start > end) return 0;
  let count = 0;
  for (let d = new Date(start); d <= end; d = dfAddDays(d, 1)) {
    const ds = format(d, 'yyyy-MM-dd');
    const dow = d.getDay();
    const isWeekend = (dow === 0 || dow === 6);
    
    // 查找该日期的节假日信息
    const holidayInfo = holidayDetailsArray.find(h => {
      const hDate = typeof h === 'string' ? h : (h.date || '');
      return hDate === ds;
    });
    
    // 只计算非周末且 isLegalHoliday=true 的法定假日
    if (holidayInfo && !isWeekend) {
      const isLegal = typeof holidayInfo === 'object' && holidayInfo.isLegalHoliday === true;
      if (isLegal) count += 1;
    }
  }
  return count;
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

const toNumber = (value) => {
  if (value === null || value === undefined) return 0;
  const num = Number(value);
  return Number.isFinite(num) ? num : 0;
};

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
export const autoCalculateMaternityDays = (city, isDifficultBirth = false, numberOfBabies = 1, pregnancyPeriod = PREGNANCY_PERIODS.ABOVE_7_MONTHS, isMiscarriage = false, doctorAdviceDays = null, meetsSupplementalDifficultBirth = false, isSecondThirdChild = false) => {
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
        const periodLabel = pregnancyPeriod || '未指定类型';
        appliedRules.push({
          type: `流产假(${periodLabel})`,
          days: totalDays,
          note: '医嘱天数',
          hasAllowance: true
        });
        return { totalDays, appliedRules };
      }

      // 从数据库规则中查找对应的流产假类型
      if (pregnancyPeriod) {
        const miscarriageRule = maternityRules.find(
          rule => rule.leaveType === MATERNITY_LEAVE_TYPES.MISCARRIAGE && 
                  rule.miscarriageType === pregnancyPeriod
        );
        if (miscarriageRule) {
          totalDays = miscarriageRule.days;
          appliedRules.push({
            type: `流产假(${pregnancyPeriod})`,
            days: totalDays,
            hasAllowance: miscarriageRule.hasAllowance !== false
          });
          return { totalDays, appliedRules };
        }
      }

      // 兜底：如果没有找到对应规则，使用默认值
      const periodDefaults = {
        [PREGNANCY_PERIODS.BELOW_4_MONTHS]: 15,
        [PREGNANCY_PERIODS.BETWEEN_4_7_MONTHS]: 42,
        [PREGNANCY_PERIODS.ABOVE_7_MONTHS]: 75
      };
      const fallback = periodDefaults[pregnancyPeriod] ?? 15;
      totalDays = fallback;
      appliedRules.push({
        type: `流产假(${pregnancyPeriod || '未指定'})`,
        days: totalDays,
        note: '使用默认值（未找到对应规则）',
        hasAllowance: true
      });
      return { totalDays, appliedRules };
    }

    // 基础产假（法定产假）
    const legalRule = maternityRules.find(rule => rule.leaveType === MATERNITY_LEAVE_TYPES.LEGAL);
    if (legalRule) {
      totalDays += legalRule.days;
      appliedRules.push({ type: '法定产假', days: legalRule.days, hasAllowance: legalRule.hasAllowance !== false });
    }

    // 难产假
    if (isDifficultBirth) {
      const difficultRule = maternityRules.find(rule => rule.leaveType === MATERNITY_LEAVE_TYPES.DIFFICULT_BIRTH);
      if (difficultRule) {
        totalDays += difficultRule.days;
        const difficultLabel = city === '广州' ? '难产假（吸引产、钳产、臀位牵引产）' : '难产假';
        appliedRules.push({ type: difficultLabel, days: difficultRule.days, hasAllowance: difficultRule.hasAllowance !== false });
      }
    }

    // 补充难产假（特殊类型，广州的）
    if (meetsSupplementalDifficultBirth) {
      const supplementalRule = maternityRules.find(
        rule => rule.leaveType === MATERNITY_LEAVE_TYPES.ASSISTED_DIFFICULT_BIRTH
      );
      if (supplementalRule) {
        totalDays += supplementalRule.days;
        appliedRules.push({
          type: '难产假（剖腹产、会阴Ⅲ度破裂）',
          days: supplementalRule.days,
          hasAllowance: supplementalRule.hasAllowance !== false
        });
      }
    }

    // 多胞胎假
    if (numberOfBabies > 1) {
      const multipleRule = maternityRules.find(rule => rule.leaveType === MATERNITY_LEAVE_TYPES.MULTIPLE_BIRTH);
      if (multipleRule) {
        const extraDays = multipleRule.days * (numberOfBabies - 1);
        totalDays += extraDays;
        appliedRules.push({ type: `多胞胎假(${numberOfBabies}胎)`, days: extraDays, hasAllowance: multipleRule.hasAllowance !== false });
      }
    }

    // 晚育假/生育假/奖励假 与 晚育假/生育假/奖励假-二孩、三孩 互斥
    let extendableRewardDays = 0;
    let extendableRewardRule = null;
    
    if (city === '绍兴' && isSecondThirdChild) {
      // 绍兴市：如果选择了生育二孩、三孩，使用专门的规则
      console.log('绍兴市-生育二孩三孩分支，查找规则类型:', MATERNITY_LEAVE_TYPES.REWARD_SECOND_THIRD_CHILD);
      console.log('可用的产假规则:', maternityRules.map(r => ({ city: r.city, leaveType: r.leaveType, days: r.days })));
      const secondThirdChildRule = maternityRules.find(rule => rule.leaveType === MATERNITY_LEAVE_TYPES.REWARD_SECOND_THIRD_CHILD);
      console.log('找到的二孩三孩规则:', secondThirdChildRule);
      if (secondThirdChildRule) {
        totalDays += secondThirdChildRule.days;
        appliedRules.push({ type: MATERNITY_LEAVE_TYPES.REWARD_SECOND_THIRD_CHILD, days: secondThirdChildRule.days, hasAllowance: secondThirdChildRule.hasAllowance !== false });
        if (secondThirdChildRule.isExtendable) {
          extendableRewardDays = secondThirdChildRule.days;
          extendableRewardRule = secondThirdChildRule;
        }
      } else {
        console.warn('未找到绍兴市的"晚育假/生育假/奖励假-二孩、三孩"规则');
      }
    } else {
      // 普通情况：使用常规的晚育假/生育假/奖励假
      const rewardRule = maternityRules.find(rule => rule.leaveType === MATERNITY_LEAVE_TYPES.REWARD);
      if (rewardRule) {
        totalDays += rewardRule.days;
        appliedRules.push({ type: MATERNITY_LEAVE_TYPES.REWARD, days: rewardRule.days, hasAllowance: rewardRule.hasAllowance !== false });
        if (rewardRule.isExtendable) {
          extendableRewardDays = rewardRule.days;
          extendableRewardRule = rewardRule;
        }
      }
    }

    // 非流产情形下，不叠加流产假

    return { 
      totalDays, 
      appliedRules,
      extendableRewardDays,
      extendableRewardRule
    };
    return { 
      totalDays, 
      appliedRules,
      extendableRewardDays,
      extendableRewardRule
    };
  } catch (error) {
    console.error('计算产假天数时发生错误:', error);
    return { totalDays: 98, appliedRules: [], extendableRewardDays: 0, extendableRewardRule: null };
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
  meetsSupplementalDifficultBirth = false,
  overrideGovernmentPaidAmount = null,
  overridePersonalSSMonthly = null,
  overrideCompanyAvg = null,
  overrideSocialLimit = null,
  employeeBaseSalaryCurrent = null,
  salaryAdjustment = null, // 新增：工资调整信息 { before, after, month }
  socialSecurityAdjustment = null, // 新增：社保调整信息 { before, after, month }
  isSecondThirdChild = false, // 新增：绍兴市生育二孩、三孩标记
  refundLeaveStartDate = null, // 新增：返还计算专用请假开始日期
  refundLeaveEndDate = null // 新增：返还计算专用请假结束日期
) => {
  try {
    // 获取城市津贴规则
    const allowanceRule = cityDataManager.getAllowanceRulesByCity(city);
    if (!allowanceRule) {
      throw new Error(`城市 ${city} 没有找到津贴规则`);
    }

    // 判断是否使用缴费工资
    const calcBase = allowanceRule.calculationBase || '平均工资';
    const useContributionBase = calcBase === '平均缴费工资';
    
    const companyAvg = (overrideCompanyAvg != null && !isNaN(parseFloat(overrideCompanyAvg)))
      ? parseFloat(overrideCompanyAvg)
      : (useContributionBase 
          ? (allowanceRule.companyContributionWage != null ? allowanceRule.companyContributionWage : allowanceRule.companyAverageWage)
          : allowanceRule.companyAverageWage);
    const socialLimit = (overrideSocialLimit != null && !isNaN(parseFloat(overrideSocialLimit)))
      ? parseFloat(overrideSocialLimit)
      : allowanceRule.socialAverageWage * 3;
    const employeeBasic = parseFloat(employeeBasicSalary);
    const employeeBaseCurrent = employeeBaseSalaryCurrent != null && !isNaN(parseFloat(employeeBaseSalaryCurrent))
      ? parseFloat(employeeBaseSalaryCurrent)
      : null;
    const maternityPolicyText = typeof allowanceRule.maternityPolicy === 'string'
      ? allowanceRule.maternityPolicy.trim()
      : '';
    const allowancePolicyText = typeof allowanceRule.allowancePolicy === 'string'
      ? allowanceRule.allowancePolicy.trim()
      : '';
    const isChengdu = city === '成都';
    const isTianjin = city === '天津';

    // 自动计算产假天数
    const {
      totalDays: baseMaternityDays,
      appliedRules,
      extendableRewardDays,
      extendableRewardRule
    } = autoCalculateMaternityDays(
      city,
      isDifficultBirth,
      numberOfBabies,
      pregnancyPeriod,
      isMiscarriage,
      doctorAdviceDays,
      meetsSupplementalDifficultBirth,
      isSecondThirdChild
    );

    let totalMaternityDays = baseMaternityDays;

    // 社保发放产假津贴基数（取社保3倍上限和公司平均工资的较小值）
    const maternityAllowanceBase = Math.min(socialLimit, companyAvg);
    
    // 政府发放金额：可被外部覆盖
    const dailyAllowance = isChengdu
      ? (maternityAllowanceBase * 12) / 365
      : isTianjin
        ? maternityAllowanceBase / 30.4
        : maternityAllowanceBase / 30;
    let totalAllowanceEligibleDays = 0;
    const payableAllowanceDays = (() => {
      const eligibleDays = appliedRules.reduce((sum, rule) => {
        if (!rule || rule.hasAllowance === false) {
          return sum;
        }
        const base = toNumber(rule.days);
        const extension = toNumber(rule.extendedDays);
        return sum + base + extension;
      }, 0);
      totalAllowanceEligibleDays = eligibleDays;
      return Number.isFinite(eligibleDays) && eligibleDays > 0 ? eligibleDays : totalMaternityDays;
    })();

    const computedGovernmentPaidAmount = dailyAllowance * payableAllowanceDays;
    const governmentPaidAmount = (overrideGovernmentPaidAmount != null && !isNaN(parseFloat(overrideGovernmentPaidAmount)))
      ? parseFloat(overrideGovernmentPaidAmount)
      : computedGovernmentPaidAmount;
    
    // 社保缴费基数（取社保3倍上限和员工基本工资的较小值）
    const socialInsuranceBase = Math.min(socialLimit, employeeBasic);
    
    // 公司应发工资基数
    const companyDaysDivisor = isTianjin ? 30.4 : 30;
    const companyShouldPay = (companyAvg / companyDaysDivisor) * payableAllowanceDays;
    const employeeBaseDivisor = isTianjin ? 30.4 : 30;

    let employeeReceivableBase = Number.isFinite(employeeBasic) ? employeeBasic : companyAvg;
    let employeeReceivableBaseSource = !Number.isNaN(employeeBasic) ? 'employeeBasicOnly' : 'companyAvg';
    if (!Number.isNaN(employeeBasic) && employeeBasic <= 0) {
      employeeReceivableBase = companyAvg;
      employeeReceivableBaseSource = 'companyAvg';
    }
    
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
    let personalSSBreakdown = null;

    // 计算结束日期
    let calculatedPeriod = null;
    // 开始/结束月应发工资（按出勤工作日计发）
    let startMonthWage = null;
    let endMonthWage = null;
    let startMonthMeta = null;
    let endMonthMeta = null;
    
    
    if (startDate && totalMaternityDays > 0) {
      const start = new Date(startDate);
      let end;
      
      // 如果提供了覆盖的结束日期（例如用户手动编辑了结束日），以该日期为准
      // 但如果有可顺延假期，优先使用顺延计算
      if (overrideEndDate && !(extendableRewardDays > 0 && extendableRewardRule)) {
        const od = new Date(overrideEndDate);
        if (!isNaN(od.getTime())) {
          end = od;
        } else {
          end = addDays(start, totalMaternityDays - 1);
        }
      } else {
        // 计算结束日期，考虑可顺延假期
        
        if (extendableRewardDays > 0 && extendableRewardRule) {
          let extendedDaysCount = 0; // 记录因法定假日顺延的天数
          // 先计算非顺延假期的天数
          const nonExtendableDays = totalMaternityDays - extendableRewardDays;
          // 计算非顺延假期的结束日期
          let nonExtendableEnd = addDays(start, nonExtendableDays - 1);
          
          
          // 获取节假日数据
          const startYear = start.getFullYear();
          const endYearEstimate = nonExtendableEnd.getFullYear();
          const years = [startYear];
          if (endYearEstimate !== startYear) {
            years.push(endYearEstimate);
          }
          // 可能跨越更多年份
          const maxEndYear = endYearEstimate + 1;
          if (!years.includes(maxEndYear)) {
            years.push(maxEndYear);
          }
          
          // 合并所有年份的节假日数据
          let allHolidays = [];
          years.forEach(year => {
            const { holidays: yearHolidays } = getHolidayDetails(year);
            const holidaysArray = Array.isArray(yearHolidays) ? yearHolidays : [];
            allHolidays = allHolidays.concat(holidaysArray);
          });
          
          // 从非顺延假期结束日的下一天开始，追加可顺延假期天数
          let currentDate = addDays(nonExtendableEnd, 1);
          let remainingDays = extendableRewardDays;
          const extendableStartDate = new Date(currentDate); // 记录可顺延假期的开始日期
          const encounteredLegalHolidays = []; // 记录遇到的法定假日
          
          
          while (remainingDays > 0) {
            const dateStr = format(currentDate, 'yyyy-MM-dd');
            // 检查当前日期是否为法定假日
            const holidayInfo = allHolidays.find(h => {
              const hDate = typeof h === 'string' ? h : (h.date || '');
              return hDate === dateStr;
            });
            
            // 判断是否为法定假日
            let isLegalHoliday = false;
            if (holidayInfo) {
              if (typeof holidayInfo === 'object' && holidayInfo.isLegalHoliday === true) {
                isLegalHoliday = true;
              }
            }
            
            if (!isLegalHoliday) {
              // 非法定假日，计入休假天数
              remainingDays--;
              
              // 如果已经累计够天数，当前日期就是结束日期，不再向后推进
              if (remainingDays === 0) {
                break;
              }
            } else {
              // 法定假日，顺延
              extendedDaysCount++;
              const holidayName = (holidayInfo && typeof holidayInfo === 'object' && holidayInfo.name) ? holidayInfo.name : '法定假日';
              encounteredLegalHolidays.push({ date: dateStr, name: holidayName });
            }
            
            // 向后推进一天
            currentDate = addDays(currentDate, 1);
          }
          
          // 重要：检查最终结束日期是否为法定假日，如果是则继续顺延
          // 因为产假的最后一天不应该是法定假日
          // 注意：循环break时，currentDate就是最后一个非法定假日，不需要回退
          let finalCheckDate = currentDate;
          while (true) {
            const finalDateStr = format(finalCheckDate, 'yyyy-MM-dd');
            const finalHolidayInfo = allHolidays.find(h => {
              const hDate = typeof h === 'string' ? h : (h.date || '');
              return hDate === finalDateStr;
            });
            
            let isFinalLegalHoliday = false;
            if (finalHolidayInfo) {
              if (typeof finalHolidayInfo === 'object' && finalHolidayInfo.isLegalHoliday === true) {
                isFinalLegalHoliday = true;
              }
            }
            
            if (isFinalLegalHoliday) {
              extendedDaysCount++;
              const holidayName = (finalHolidayInfo && typeof finalHolidayInfo === 'object' && finalHolidayInfo.name) ? finalHolidayInfo.name : '法定假日';
              encounteredLegalHolidays.push({ date: finalDateStr, name: holidayName });
              finalCheckDate = addDays(finalCheckDate, 1);
            } else {
              // 找到了非法定假日，作为最终结束日期
              break;
            }
          }
          
          
          end = finalCheckDate;
          
          // 将顺延信息添加到 appliedRules 中
          if (extendedDaysCount > 0) {
            const rewardRuleIndex = appliedRules.findIndex(r => r.type === MATERNITY_LEAVE_TYPES.REWARD);
            if (rewardRuleIndex >= 0) {
              appliedRules[rewardRuleIndex] = {
                ...appliedRules[rewardRuleIndex],
                isExtendable: true,
                extendableStartDate: format(extendableStartDate, 'yyyy-MM-dd'),
                extendableEndDate: format(finalCheckDate, 'yyyy-MM-dd'),
                extendedDays: extendedDaysCount,
                legalHolidays: encounteredLegalHolidays,
                note: `遇法定假日顺延${extendedDaysCount}天`
              };
            }
            totalMaternityDays += extendedDaysCount;
          }
        } else {
          // 没有可顺延假期，使用简单计算
          end = addDays(start, totalMaternityDays - 1);
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
      // 返还计算专用日期：如果提供了refundLeaveStartDate/refundLeaveEndDate，则用于返还相关计算
      const refundStart = refundLeaveStartDate ? new Date(refundLeaveStartDate) : start;
      const refundEnd = refundLeaveEndDate ? new Date(refundLeaveEndDate) : end;
      const leaveStartDay = startOfDay(refundStart);
      const leaveEndDay = endOfDay(refundEnd);
      const firstMonth = startOfMonth(leaveStartDay);
      const lastMonth = startOfMonth(leaveEndDay);
      for (let m = new Date(firstMonth); m <= lastMonth; m = dfAddMonths(m, 1)) {
        const mStart = startOfMonth(m);
        const mEnd = endOfMonth(m);
        if (leaveStartDay <= mStart && leaveEndDay >= mEnd) {
          personalSSMonths.push(format(mStart, 'yyyy-MM'));
        }
      }
      // 计算开始月与结束月的出勤工资（不含产假期间）
      // 自动加载对应年份的节假日与调休上班日；如跨年则合并集合
      const startYear = start.getFullYear();
      const endYearY = end.getFullYear();
      const { holidays: h1, makeupWorkdays: m1 } = getHolidaySets(startYear);
      const { holidays: hDetails1 } = getHolidayDetails(startYear);
      let holidays = new Set([...h1]);
      let makeupWorkdays = new Set([...m1]);
      let holidayDetailsArray = [...hDetails1];
      if (endYearY !== startYear) {
        const { holidays: h2, makeupWorkdays: m2 } = getHolidaySets(endYearY);
        const { holidays: hDetails2 } = getHolidayDetails(endYearY);
        holidays = new Set([...holidays, ...h2]);
        makeupWorkdays = new Set([...makeupWorkdays, ...m2]);
        holidayDetailsArray = [...holidayDetailsArray, ...hDetails2];
      }

      // 检查工资调整是否有效
      let validSalaryAdjustment = null;
      if (salaryAdjustment && salaryAdjustment.before && salaryAdjustment.after && salaryAdjustment.month) {
        const adjustMonth = salaryAdjustment.month; // 格式: 'yyyy-MM'
        const startMonth = format(start, 'yyyy-MM');
        const endMonth = format(end, 'yyyy-MM');
        // 调整月份必须在产假期间内（包括首月和末月）
        if (adjustMonth >= startMonth && adjustMonth <= endMonth) {
          validSalaryAdjustment = {
            before: parseFloat(salaryAdjustment.before),
            after: parseFloat(salaryAdjustment.after),
            month: adjustMonth
          };
        }
      }

      // 判断是否同月
      const isSameMonth = format(refundStart, 'yyyy-MM') === format(refundEnd, 'yyyy-MM');

      // 开始月（使用返还计算专用日期）
      const startMonthStart = startOfMonth(refundStart);
      const startMonthEnd = endOfMonth(refundStart);
      const startMonthWorkingDays = countWorkingDays(startMonthStart, startMonthEnd, holidays, makeupWorkdays);
      const startMonthHolidayDays = countHolidays(startMonthStart, startMonthEnd, holidayDetailsArray);
      
      // 首月实际出勤天数计算
      let startActualWorkDays = 0;
      if (isSameMonth) {
        // 同月：计算请假前 + 请假后的出勤天数
        const beforeLeaveDays = refundStart > startMonthStart
          ? countWorkingDays(startMonthStart, dfAddDays(refundStart, -1), holidays, makeupWorkdays)
          : 0;
        const afterLeaveDays = refundEnd < startMonthEnd
          ? countWorkingDays(dfAddDays(refundEnd, 1), startMonthEnd, holidays, makeupWorkdays)
          : 0;
        startActualWorkDays = beforeLeaveDays + afterLeaveDays;
      } else {
        // 跨月：仅计算请假前的出勤天数
        startActualWorkDays = refundStart > startMonthStart
          ? countWorkingDays(startMonthStart, dfAddDays(refundStart, -1), holidays, makeupWorkdays)
          : 0;
      }
      
      if (startMonthWorkingDays > 0) {
        const startMonth = format(refundStart, 'yyyy-MM');
        // 判断首月使用哪个工资
        let salaryForStartMonth = employeeBaseCurrent != null ? employeeBaseCurrent : employeeBasic;
        if (validSalaryAdjustment) {
          // 如果调整月份在首月之前或等于首月，使用调整后工资
          if (validSalaryAdjustment.month <= startMonth) {
            salaryForStartMonth = validSalaryAdjustment.after;
          } else {
            // 调整月份在首月之后，使用调整前工资
            salaryForStartMonth = validSalaryAdjustment.before;
          }
        }
        // 首月工资按实际出勤天数比例计算
        // 如果出勤天数为0，则不计算工资
        if (startActualWorkDays > 0) {
          // 分母 = 工作日 + 法定假日
          const startMonthDenominator = startMonthWorkingDays + startMonthHolidayDays;
          startMonthWage = (salaryForStartMonth / startMonthDenominator) * startActualWorkDays;
          startMonthMeta = {
            month: startMonth,
            monthWorkingDays: startMonthWorkingDays,
            monthHolidayDays: startMonthHolidayDays,
            actualWorkingDays: startActualWorkDays,
            salaryUsed: salaryForStartMonth
          };
        }
      }

      // 结束月（使用返还计算专用日期）
      const endMonthEnd = endOfMonth(refundEnd);
      // 如果是同月，不计算结束月工资
      if (!isSameMonth) {
        const endMonthStart = startOfMonth(refundEnd);
        const endMonthWorkingDays = countWorkingDays(endMonthStart, endMonthEnd, holidays, makeupWorkdays);
        const endMonthHolidayDays = countHolidays(endMonthStart, endMonthEnd, holidayDetailsArray);
        const endRangeStart = dfAddDays(refundEnd, 1);
        const endActualWorkDays = refundEnd < endMonthEnd
          ? countWorkingDays(endRangeStart, endMonthEnd, holidays, makeupWorkdays)
          : 0;
        if (endMonthWorkingDays > 0) {
          const endMonth = format(refundEnd, 'yyyy-MM');
          // 判断末月使用哪个工资
          let salaryForEndMonth = employeeBaseCurrent != null ? employeeBaseCurrent : employeeBasic;
          if (validSalaryAdjustment) {
            // 如果调整月份在末月之前或等于末月，使用调整后工资
            if (validSalaryAdjustment.month <= endMonth) {
              salaryForEndMonth = validSalaryAdjustment.after;
            } else {
              // 调整月份在末月之后（理论上不应该发生，因为已验证在产假期间内），使用调整前工资
              salaryForEndMonth = validSalaryAdjustment.before;
            }
          }
          // 如果出勤天数为0，则不计算工资
          if (endActualWorkDays > 0) {
            // 分母 = 工作日 + 法定假日
            const endMonthDenominator = endMonthWorkingDays + endMonthHolidayDays;
            endMonthWage = (salaryForEndMonth / endMonthDenominator) * endActualWorkDays;
            endMonthMeta = {
              month: endMonth,
              monthWorkingDays: endMonthWorkingDays,
              monthHolidayDays: endMonthHolidayDays,
              actualWorkingDays: endActualWorkDays,
              salaryUsed: salaryForEndMonth,
              // 调试：列出结束月实际工作日日期
              workdaysList: refundEnd < endMonthEnd ? listWorkingDays(endRangeStart, endMonthEnd, holidays, makeupWorkdays) : []
            };
          }
        }
      }

      const personalMonthsSet = new Set(personalSSMonths);

      // 首月：如果首月实际出勤天数为 0，则计入社保月份
      if (startMonthMeta) {
        const startMonthKey = startMonthMeta.month;
        const startHasNoActualWork = (startMonthMeta.actualWorkingDays ?? 0) === 0;
        const startsOnFirstDay = start.getDate() === 1;
        if (startHasNoActualWork || startsOnFirstDay) {
          personalMonthsSet.add(startMonthKey);
        } else {
          personalMonthsSet.delete(startMonthKey);
        }
      }

      // 末月：如果末月实际出勤天数为 0，则计入社保月份
      if (endMonthMeta) {
        const endMonthKey = endMonthMeta.month;
        const endHasNoActualWork = (endMonthMeta.actualWorkingDays ?? 0) === 0;
        const endsOnLastDay = end.getDate() === endMonthEnd.getDate();
        if (endHasNoActualWork || endsOnLastDay) {
          personalMonthsSet.add(endMonthKey);
        } else {
          personalMonthsSet.delete(endMonthKey);
        }
      }

      personalSSMonths = Array.from(personalMonthsSet).sort();

      // 个人社保缴费：可被“社保公积金个人月缴费”覆盖（按整月）
      const computedMonthly = employeeBasic * personalRate;
      const monthlyOverride = (overridePersonalSSMonthly != null && !isNaN(parseFloat(overridePersonalSSMonthly)))
        ? parseFloat(overridePersonalSSMonthly)
        : computedMonthly;

      let handledByAdjustment = false;
      const hasAdjustmentData = socialSecurityAdjustment && typeof socialSecurityAdjustment === 'object';
      if (hasAdjustmentData && personalSSMonths.length > 0) {
        const { before, after, month } = socialSecurityAdjustment;
        const beforeAmount = Number.isFinite(before) ? before : null;
        const afterAmount = Number.isFinite(after) ? after : null;
        const adjustMonth = typeof month === 'string' ? month : null;
        if (beforeAmount != null && afterAmount != null && adjustMonth) {
          const beforeMonths = [];
          const afterMonths = [];
          personalSSMonths.forEach(m => {
            if (m < adjustMonth) {
              beforeMonths.push(m);
            } else {
              afterMonths.push(m);
            }
          });
          if (beforeMonths.length > 0 || afterMonths.length > 0) {
            personalSocialSecurity = beforeMonths.length * beforeAmount + afterMonths.length * afterAmount;
            personalSSBreakdown = {
              type: 'adjusted',
              beforeAmount,
              afterAmount,
              beforeMonths,
              afterMonths,
              adjustmentMonth: adjustMonth
            };
            handledByAdjustment = true;
          }
        }
      }

      if (!handledByAdjustment) {
        personalSocialSecurity = monthlyOverride * personalSSMonths.length;
        personalSSBreakdown = {
          type: 'uniform',
          monthlyAmount: monthlyOverride,
          months: personalSSMonths.slice()
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

    // 员工应领取金额计算
    // 规则：如果员工产前12月平均工资大于公司平均工资，使用员工工资；否则使用公司平均工资
    let finalEmployeeReceivableBase = employeeReceivableBase;
    if (Number.isFinite(employeeBasic) && employeeBasic > 0 && employeeBasic > companyAvg) {
      finalEmployeeReceivableBase = employeeBasic;
      employeeReceivableBaseSource = 'employeeBasicHigherThanCompanyAvg';
    } else if (Number.isFinite(companyAvg) && companyAvg > 0) {
      finalEmployeeReceivableBase = companyAvg;
      employeeReceivableBaseSource = 'companyAvg';
    }

    let employeeReceivableCalc = 0;
    let employeeReceivableFormulaType = isTianjin ? 'tianjinDefault' : 'default';
    let overrideRuleApplied = false;

    if (isChengdu) {
      employeeReceivableCalc = (finalEmployeeReceivableBase * 12 / 365) * payableAllowanceDays;
      employeeReceivableFormulaType = 'chengduEmployeeBasic';
    } else {
      employeeReceivableCalc = (finalEmployeeReceivableBase / companyDaysDivisor) * payableAllowanceDays;
      employeeReceivableFormulaType = 'employeeBasic';
    }

    // 根据新规则计算补差
    companySupplement = Math.max(0, employeeReceivableCalc - governmentPaidAmount);

    return {
      city,
      totalMaternityDays,
      totalAllowanceEligibleDays,
      appliedRules,
      maternityPolicy: maternityPolicyText,
      allowancePolicy: allowancePolicyText,
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
      personalSSBreakdown,
      actualCompensation: parseFloat(actualCompensation.toFixed(2)),
      totalReceived: parseFloat(totalReceived.toFixed(2)),
      isSupplementNeeded: companySupplement > 0,
      paymentMethod,
      // 开始/结束月按工作日计发工资
      startMonthProratedWage: startMonthWage !== null
        ? parseFloat(startMonthWage.toFixed(2))
        : (Number.isFinite(employeeBasic) && employeeBasic > 0 ? parseFloat(employeeBasic.toFixed(2)) : null),
      endMonthProratedWage: endMonthWage !== null
        ? parseFloat(endMonthWage.toFixed(2))
        : (Number.isFinite(employeeBasic) && employeeBasic > 0 ? parseFloat(employeeBasic.toFixed(2)) : null),
      employeeBaseSalaryUsed: employeeBaseCurrent ?? employeeBasic,
      startMonthMeta,
      endMonthMeta,
      // 个人社保缴费按整月统计
      personalSSMonths,
      personalSSMonthsCount: personalSSMonths.length,
      // 调试信息
      debugInfo: {
        city,
        companyAvg,
        socialLimit,
        useContributionBase,
        companyShouldPay: parseFloat(companyShouldPay.toFixed(2)),
        employeeReceivableBase: Number.isFinite(finalEmployeeReceivableBase) ? parseFloat(finalEmployeeReceivableBase.toFixed(2)) : null,
        employeeReceivableBaseSource,
        employeeBaseCurrent: employeeBaseCurrent != null && !Number.isNaN(employeeBaseCurrent)
          ? parseFloat(employeeBaseCurrent.toFixed(2))
          : null,
        companyDaysDivisor,
        employeeBaseDivisor,
        employeeReceivableCalc: parseFloat(employeeReceivableCalc.toFixed(2)),
        employeeReceivableFormulaType,
        totalAllowanceEligibleDays: parseFloat(totalAllowanceEligibleDays.toFixed(2)),
        payableAllowanceDays: parseFloat(payableAllowanceDays.toFixed(2)),
        overrideRuleApplied
      }
    };
  } catch (error) {
    console.error('计算津贴时发生错误:', error);
    throw error;
  }
};

export const validateEmployeeData = (employee) => {
  const errors = [];

  const trimString = (value) => (typeof value === 'string' ? value.trim() : value);
  const parseNumber = (value) => {
    if (value === null || value === undefined || value === '') return NaN;
    if (typeof value === 'number') return Number.isFinite(value) ? value : NaN;
    const normalized = String(value).replace(/[\s,]/g, '');
    const parsed = parseFloat(normalized);
    return Number.isFinite(parsed) ? parsed : NaN;
  };

  const name = trimString(employee.name);
  if (!name) {
    errors.push('员工姓名不能为空');
  }

  const employeeId = trimString(employee.employeeId);
  if (!employeeId) {
    errors.push('员工编号不能为空');
  }

  const startDate = trimString(employee.startDate);
  if (!startDate || Number.isNaN(new Date(startDate).getTime())) {
    errors.push('产假开始日期格式不正确');
  }

  const basicSalaryNumber = parseNumber(employee.employeeBasicSalary ?? employee.basicSalary);
  if (!Number.isFinite(basicSalaryNumber) || basicSalaryNumber <= 0) {
    errors.push('员工产前12个月的月均工资必须是正数');
  }

  const cityFromInput = trimString(employee.city);
  const cityFromName = !cityFromInput && name ? findCityByEmployeeName(name) : null;
  let resolvedCity = cityFromInput || cityFromName;
  if (!resolvedCity && employeeId) {
    const employeeRecord = findEmployeeById(employeeId);
    if (employeeRecord && employeeRecord.city) {
      resolvedCity = trimString(employeeRecord.city);
    }
  }

  if (!resolvedCity) {
    errors.push(`未找到员工 ${name || employeeId || '未知'} 的城市信息`);
  } else {
    try {
      cityDataManager.loadData();
      const allowanceRule = cityDataManager.getAllowanceRulesByCity(resolvedCity);
      if (!allowanceRule) {
        errors.push(`城市 ${resolvedCity} 没有找到津贴规则`);
      }
    } catch (error) {
      errors.push('无法验证城市津贴规则');
    }
  }

  const paymentMethodRaw = trimString(employee.paymentMethod);
  if (paymentMethodRaw) {
    const normalizedPayment = paymentMethodRaw.includes('个') ? '个人账户' : paymentMethodRaw.includes('企') ? '企业账户' : paymentMethodRaw;
    if (!['企业账户', '个人账户'].includes(normalizedPayment)) {
      errors.push('津贴发放方式必须为“企业账户”或“个人账户”');
    }
  }

  const numberOfBabies = parseInt(employee.numberOfBabies ?? 1, 10);
  if (!Number.isFinite(numberOfBabies) || numberOfBabies <= 0) {
    errors.push('胎数必须为正整数');
  }

  const pregnancyPeriod = trimString(employee.pregnancyPeriod);
  const isMiscarriage = employee.isMiscarriage === true || employee.isMiscarriage === '是';
  if (isMiscarriage && !pregnancyPeriod) {
    errors.push('流产假需填写怀孕时间段');
  }
  if (isMiscarriage) {
    const doctorAdviceDays = parseNumber(employee.doctorAdviceDays);
    if (!Number.isFinite(doctorAdviceDays) || doctorAdviceDays < 0) {
      errors.push('流产医嘱天数需为非负整数');
    }
  }

  const companyPaidWage = parseNumber(employee.companyPaidWage);
  if (Number.isFinite(companyPaidWage) && companyPaidWage < 0) {
    errors.push('公司已发产假工资不能为负数');
  }

  // 减扣项允许负数（表示发放金额），不再进行额外验证

  return errors;
};
