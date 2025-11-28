const safeNumber = (value) => {
  if (typeof value === 'number') {
    return Number.isFinite(value) ? value : 0;
  }
  const parsed = parseFloat(value);
  return Number.isFinite(parsed) ? parsed : 0;
};

const formatDaysValue = (value) => {
  const num = safeNumber(value);
  if (!Number.isFinite(num)) return '0';
  return Number.isInteger(num) ? `${num}` : num.toFixed(2);
};

export const formatAppliedRulesSummaryLine = (rules, city, totalDays) => {
  if (!Array.isArray(rules) || rules.length === 0) {
    return `${city || '未选择城市'} - 按城市默认规则计算`;
  }

  const segments = rules.map((rule) => {
    const noteText = rule?.note && String(rule.note).trim() ? `(${rule.note})` : '';
    const allowanceFlag = rule?.hasAllowance === false ? '（不计入享受津贴天数）' : '';
    return {
      text: `${rule.type} ${formatDaysValue(rule.days)}天${noteText}${allowanceFlag}`,
      base: Math.max(0, safeNumber(rule.days)),
      extension: Math.max(0, safeNumber(rule.extendedDays))
    };
  });

  const summaryText = `${city || '未选择城市'} - ${segments.map((seg) => seg.text).join('+')}`;
  const baseValues = segments
    .map((seg) => seg.base)
    .filter((val) => Number.isFinite(val) && val > 0);
  const extensionValues = segments
    .map((seg) => seg.extension)
    .filter((val) => Number.isFinite(val) && val > 0);

  if (baseValues.length === 0 && extensionValues.length === 0) {
    return summaryText;
  }

  if (rules.length === 1) {
    return summaryText;
  }

  const formatTotal = (value) => (Number.isInteger(value) ? `${value}` : value.toFixed(2));
  const baseExpression = baseValues.length > 0 ? baseValues.map(formatTotal).join('+') : '0';
  const extensionSum = extensionValues.reduce((acc, val) => acc + val, 0);
  const hasExtension = extensionSum > 0;
  const expression = hasExtension
    ? `${baseExpression}+${formatTotal(extensionSum)}（顺延）`
    : baseExpression;

  const totalValue = baseValues.reduce((acc, val) => acc + val, 0) + extensionSum;
  const totalText = Number.isFinite(totalValue) ? formatTotal(totalValue) : '0';
  const totalDaysText = Number.isFinite(totalDays) ? formatDaysValue(totalDays) : totalText;
  return `${summaryText} = ${expression} = ${totalDaysText}天`;
};
