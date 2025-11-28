import { buildAllowanceBreakdown, buildSupplementDetails, safeNumber } from '../../utils/allowanceBreakdown';

const fixtures = require('../../../tests/fixtures/allowanceBreakdownCases.json');

describe('allowanceBreakdown helpers', () => {
  test('returns placeholder values when result data is missing', () => {
    const breakdown = buildAllowanceBreakdown(null);
    expect(breakdown.government.formatted).toBe('0.00');
    expect(breakdown.employee.process).toBe('—');
    expect(breakdown.supplement.totalDeductions).toBe(0);
  });

  test('honors overrideGovernmentPaidAmount by returning manual marker', () => {
    const { input, assertions } = fixtures.withOverrides;
    const breakdown = buildAllowanceBreakdown(input.resultData, input.options);
    expect(breakdown.government.process).toContain(assertions.governmentProcessIncludes);
  });

  test('filters zero or negative deductions in buildSupplementDetails', () => {
    const { input, assertions } = fixtures.withDeductions;
    const details = buildSupplementDetails(input.resultData, input.options);
    expect(details.totalDeductions).toBe(assertions.totalDeductions);
    expect(details.deductionSummary).toContain(assertions.deductionSummaryIncludes);
    expect(details.deductionDetails.every((item) => item.includes('无效记录'))).toBe(false);
  });

  test('computes adjusted supplement when company paid wages exist', () => {
    const { input, assertions } = fixtures.withDeductions;
    const details = buildSupplementDetails(input.resultData, input.options);
    const breakdown = buildAllowanceBreakdown(input.resultData, input.options);
    expect(breakdown.supplement.totalDeductions).toBe(details.totalDeductions);
    expect(breakdown.supplement.details.companyPaidAmount).toBe(details.companyPaidAmount);
    expect(breakdown.supplement.details.adjustedSupplement).toBe(details.adjustedSupplement);
    expect(details.adjustedSupplement).toBeGreaterThanOrEqual(0);
  });

  test('safeNumber handles invalid inputs', () => {
    expect(safeNumber(null)).toBe(0);
    expect(safeNumber('')).toBe(0);
    expect(safeNumber('123.45')).toBeCloseTo(123.45);
    expect(safeNumber('abc')).toBe(0);
    expect(safeNumber(Infinity)).toBe(0);
  });
});
