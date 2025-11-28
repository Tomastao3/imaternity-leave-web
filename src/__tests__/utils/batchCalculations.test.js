import { processBatchData } from '../../utils/batchCalculations';

jest.mock('../../utils/cityDataUtils', () => ({
  cityDataManager: {
    loadData: jest.fn().mockResolvedValue(),
    getAllEmployees: jest.fn(() => [])
  },
  PREGNANCY_PERIODS: { ABOVE_7_MONTHS: '7个月以上' }
}));

jest.mock('../../utils/maternityCalculations', () => ({
  calculateMaternityAllowance: jest.fn(() => ({
    city: '成都',
    totalMaternityDays: 158,
    governmentPaidAmount: 35000,
    employeeReceivable: 42000,
    companySupplement: 7000,
    personalSocialSecurity: 1800,
    personalSSBreakdown: null,
    calculatedPeriod: { endDate: '2025-08-05', workingDays: 110 },
    appliedRules: [],
    appliedPolicySummary: '示例规则',
    socialInsuranceBase: 23000,
    maternityAllowanceBase: 23000,
    dailyAllowance: 766.67,
    maternityAllowance: 35000,
    companyShouldPay: 7000,
    totalReceived: 42000,
    debugInfo: {}
  })),
  validateEmployeeData: jest.fn(() => [])
}));

jest.mock('../../utils/allowanceBreakdown', () => ({
  buildAllowanceBreakdown: jest.fn(() => ({
    supplement: {
      adjusted: 6200,
      totalDeductions: 800,
      process: 'supplement process',
      deductionSummary: '税费 ¥800.00',
      details: {
        deductionSummary: '税费 ¥800.00',
        companyPaidAmount: 1000,
        adjustedSupplement: 6200
      }
    }
  }))
}));

describe('batchCalculations.processBatchData', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  test('returns results with breakdown-aligned supplement fields', () => {
    const input = [
      {
        name: '李四',
        employeeId: 'E100',
        city: '成都',
        employeeBasicSalary: 18500,
        startDate: '2025-03-01',
        deductions: [{ note: '税费', amount: 800 }],
        companyPaidAmount: 1000
      }
    ];

    const { results, errors } = processBatchData(input);
    expect(errors).toHaveLength(0);
    expect(results).toHaveLength(1);
    const row = results[0];
    expect(row.deductionsTotal).toBeCloseTo(800, 5);
    expect(row.adjustedSupplement).toBe(6200);
    expect(row.supplementProcess).toBe('supplement process');
    expect(row.overrideFlags.overrideGovernmentPaidAmount).toBe(false);
  });

  test('collects validation errors for invalid employee rows', () => {
    const { validateEmployeeData } = require('../../utils/maternityCalculations');
    validateEmployeeData.mockReturnValueOnce(['工号不能为空']);

    const { results, errors } = processBatchData([
      { name: '', employeeId: '', startDate: '2025-01-01' }
    ]);

    expect(results).toHaveLength(0);
    expect(errors).toHaveLength(1);
    expect(errors[0].errors[0]).toContain('工号');
  });

  test('respects override flags when overrides are present', () => {
    const input = [
      {
        name: '王五',
        employeeId: 'E200',
        city: '成都',
        employeeBasicSalary: 19000,
        startDate: '2025-03-01',
        overrideGovernmentPaidAmount: 18000,
        overridePersonalSSMonthly: 900,
        socialInsuranceLimitOverride: 30000,
        companyAvgSalaryOverride: 25000
      }
    ];

    const { results } = processBatchData(input);
    expect(results[0].overrideFlags).toEqual({
      overrideGovernmentPaidAmount: true,
      overridePersonalSSMonthly: true,
      overrideCompanyAvg: true,
      overrideSocialLimit: true
    });
  });
});
