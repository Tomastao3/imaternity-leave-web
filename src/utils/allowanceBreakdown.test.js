import { buildSupplementDetails, buildAllowanceBreakdown, safeNumber, formatCurrency } from './allowanceBreakdown.js';

// 测试数据：根据用户提供的数据
const testData = {
  employeeReceivable: 286913.58,
  governmentPaidAmount: 212911.04,
  maternityAllowance: 212911.04,
  paymentMethod: '个人账户',
  paidWageDuringLeave: 0
};

const options = {
  deductions: [],
  paidWageDuringLeave: 0
};

console.log('=== 补差计算测试 ===');
console.log('输入数据：');
console.log('  员工应领取:', testData.employeeReceivable);
console.log('  政府发放:', testData.governmentPaidAmount);
console.log('  支付方式:', testData.paymentMethod);
console.log('');

// 测试 buildSupplementDetails
const supplementDetails = buildSupplementDetails(testData, options);
console.log('buildSupplementDetails 结果：');
console.log('  rawSupplement:', supplementDetails.rawSupplement);
console.log('  adjustedSupplement:', supplementDetails.adjustedSupplement);
console.log('  processText:', supplementDetails.processText);
console.log('');

// 手动计算验证
const manualCalc = testData.employeeReceivable - testData.governmentPaidAmount;
console.log('手动计算验证：');
console.log('  286913.58 - 212911.04 =', manualCalc);
console.log('  格式化:', formatCurrency(manualCalc));
console.log('');

// 检查是否一致
console.log('验证结果：');
console.log('  rawSupplement 是否正确:', supplementDetails.rawSupplement === manualCalc ? '✓ 正确' : '✗ 错误');
console.log('  adjustedSupplement 是否正确:', supplementDetails.adjustedSupplement === manualCalc ? '✓ 正确' : '✗ 错误');
console.log('');

// 测试 buildAllowanceBreakdown
const breakdown = buildAllowanceBreakdown(testData, options);
console.log('buildAllowanceBreakdown 结果：');
console.log('  supplement.raw:', breakdown.supplement.raw);
console.log('  supplement.adjusted:', breakdown.supplement.adjusted);
console.log('  supplement.formattedAdjusted:', breakdown.supplement.formattedAdjusted);
console.log('  supplement.process:', breakdown.supplement.process);
console.log('');

// 最终验证
console.log('=== 最终验证 ===');
console.log('期望补差值: 48335.85');
console.log('实际补差值:', breakdown.supplement.formattedAdjusted);
console.log('是否匹配:', breakdown.supplement.formattedAdjusted === '48335.85' ? '✓ 正确' : '✗ 错误');
