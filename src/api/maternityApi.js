// Simulated API for maternity-related calculations (Step 1 of FE/BE separation)
// Request-in, Response-out style

import { cityDataManager, MATERNITY_LEAVE_TYPES, PREGNANCY_PERIODS } from '../utils/cityDataUtils';
import { addDays, format } from 'date-fns';

// Helper to ensure data is loaded
const ensureDataLoaded = () => {
  try {
    cityDataManager.loadData();
  } catch (e) {
    // no-op, defaults are handled inside manager
  }
};

// API: Calculate maternity days based on city and conditions
// request: { city, startDate, isDifficultBirth, numberOfBabies, pregnancyPeriod }
// response: { ok: boolean, data?: {...}, error?: string }
export async function calculateMaternityDaysApi(request) {
  try {
    ensureDataLoaded();

    const {
      city,
      startDate,
      isDifficultBirth = false,
      numberOfBabies = 1,
      pregnancyPeriod = PREGNANCY_PERIODS.ABOVE_7_MONTHS,
    } = request || {};

    if (!city || !startDate) {
      return { ok: false, error: '参数错误：city 和 startDate 为必填项' };
    }

    const maternityRules = cityDataManager.getMaternityRulesByCity(city) || [];

    let totalDays = 0;
    const appliedRules = [];

    // 法定产假
    const legalRule = maternityRules.find(r => r.leaveType === MATERNITY_LEAVE_TYPES.LEGAL);
    if (legalRule) {
      totalDays += legalRule.days;
      appliedRules.push({ type: '法定产假', days: legalRule.days });
    }

    // 难产假
    if (isDifficultBirth) {
      const difficultRule = maternityRules.find(r => r.leaveType === MATERNITY_LEAVE_TYPES.DIFFICULT_BIRTH);
      if (difficultRule) {
        totalDays += difficultRule.days;
        appliedRules.push({ type: '难产假', days: difficultRule.days });
      }
    }

    // 多胞胎假
    if (Number(numberOfBabies) > 1) {
      const multipleRule = maternityRules.find(r => r.leaveType === MATERNITY_LEAVE_TYPES.MULTIPLE_BIRTH);
      if (multipleRule) {
        const extraDays = multipleRule.days * (Number(numberOfBabies) - 1);
        totalDays += extraDays;
        appliedRules.push({ type: `多胞胎假(${numberOfBabies}胎)`, days: extraDays });
      }
    }

    // 晚育假/生育假/奖励假
    const rewardRule = maternityRules.find(r => r.leaveType === MATERNITY_LEAVE_TYPES.REWARD);
    if (rewardRule) {
      totalDays += rewardRule.days;
      appliedRules.push({ type: MATERNITY_LEAVE_TYPES.REWARD, days: rewardRule.days });
    }

    // 流产假（根据时间段）
    if (pregnancyPeriod !== PREGNANCY_PERIODS.ABOVE_7_MONTHS) {
      const miscarriageRule = maternityRules.find(r => r.leaveType === MATERNITY_LEAVE_TYPES.MISCARRIAGE);
      if (miscarriageRule) {
        let miscarriageDays = miscarriageRule.days;
        if (pregnancyPeriod === PREGNANCY_PERIODS.BELOW_4_MONTHS) {
          miscarriageDays = Math.floor(miscarriageDays / 2);
        }
        totalDays = miscarriageDays; // 流产假独立覆盖
        appliedRules.length = 0;
        appliedRules.push({ type: `流产假(${pregnancyPeriod})`, days: miscarriageDays });
      }
    }

    let calculatedPeriod = null;
    if (startDate && totalDays > 0) {
      const start = new Date(startDate);
      const end = addDays(start, totalDays - 1);
      calculatedPeriod = {
        startDate: format(start, 'yyyy年MM月dd日'),
        endDate: format(end, 'yyyy年MM月dd日'),
        actualDays: totalDays,
        workingDays: Math.floor(totalDays * 5 / 7),
        period: `${format(start, 'yyyy年MM月dd日')} - ${format(end, 'yyyy年MM月dd日')}`
      };
    }

    const data = {
      city,
      totalMaternityDays: totalDays,
      appliedRules,
      calculatedPeriod,
      pregnancyConditions: {
        isDifficultBirth: !!isDifficultBirth,
        numberOfBabies: Number(numberOfBabies) || 1,
        pregnancyPeriod,
      }
    };

    return { ok: true, data };
  } catch (error) {
    return { ok: false, error: error?.message || '未知错误' };
  }
}

// Other API stubs for later phases
export async function listCitiesApi() {
  ensureDataLoaded();
  return { ok: true, data: cityDataManager.getCities() };
}

export async function listEmployeesByCityApi(request) {
  ensureDataLoaded();
  const { city } = request || {};
  if (!city) return { ok: false, error: '参数错误：city 不能为空' };
  return { ok: true, data: cityDataManager.getEmployeesByCity(city) };
}
