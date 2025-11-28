import html2pdf from 'html2pdf.js';

const ensureString = (value, fallback = '') => {
  if (value === null || value === undefined) {
    return fallback;
  }
  return String(value);
};

export const exportAllowancePdf = ({
  filename,
  employeeName,
  city,
  startDate,
  endDate,
  totalMaternityDays,
  totalAllowanceEligibleDays,
  appliedPolicyHtml,
  paymentMethod,
  governmentAmountDisplay,
  governmentProcess,
  employeeReceivableDisplay,
  employeeProcess,
  adjustedSupplementDisplay,
  deductionSummaryDisplay,
  supplementProcess,
  refundAmountDisplay = '—',
  refundCalcProcess = '—',
  maternityPolicyText,
  allowancePolicyText,
  showGovernmentSection = false,
  // 新增参数
  startMonthProratedWage = '—',
  startMonthProcess = '—',
  endMonthProratedWage = '—',
  endMonthProcess = '—',
  personalSocialSecurity = '—',
  personalSSProcess = '—',
  unionFee = '—',
  unionFeeProcess = '—'
}) => {
  const htmlContent = `
    <div style="font-family: 'Microsoft YaHei', SimSun, sans-serif; padding: 20px;">
      <h1 style="text-align: center; color: #333; margin-bottom: 30px;">产假津贴计算结果</h1>

      <!-- 基本信息 -->
      <div style="margin-bottom: 20px; border: 1px solid #e0e0e0; border-radius: 4px; overflow: hidden;">
        <div style="background-color: #f5f5f5; padding: 10px 15px; font-weight: bold; border-bottom: 1px solid #e0e0e0;">
          基本信息
        </div>
        <table style="width: 100%; border-collapse: collapse;">
          <tr>
            <td style="border: 1px solid #e0e0e0; padding: 10px 15px; width: 30%; font-weight: bold; background-color: #f9f9f9;">员工姓名</td>
            <td style="border: 1px solid #e0e0e0; padding: 10px 15px;">${ensureString(employeeName)}</td>
          </tr>
          <tr>
            <td style="border: 1px solid #e0e0e0; padding: 10px 15px; font-weight: bold; background-color: #f9f9f9;">选择城市</td>
            <td style="border: 1px solid #e0e0e0; padding: 10px 15px;">${ensureString(city)}</td>
          </tr>
          <tr>
            <td style="border: 1px solid #e0e0e0; padding: 10px 15px; font-weight: bold; background-color: #f9f9f9;">产假开始日期</td>
            <td style="border: 1px solid #e0e0e0; padding: 10px 15px;">${ensureString(startDate)}</td>
          </tr>
          <tr>
            <td style="border: 1px solid #e0e0e0; padding: 10px 15px; font-weight: bold; background-color: #f9f9f9;">产假结束日期</td>
            <td style="border: 1px solid #e0e0e0; padding: 10px 15px;">${ensureString(endDate)}</td>
          </tr>
          <tr>
            <td style="border: 1px solid #e0e0e0; padding: 10px 15px; font-weight: bold; background-color: #f9f9f9;">享受产假天数</td>
            <td style="border: 1px solid #e0e0e0; padding: 10px 15px; color: #28a745; font-weight: bold;">${ensureString(totalMaternityDays)} 天</td>
          </tr>
          <tr>
            <td style="border: 1px solid #e0e0e0; padding: 10px 15px; font-weight: bold; background-color: #f9f9f9;">享受产假津贴天数</td>
            <td style="border: 1px solid #e0e0e0; padding: 10px 15px; color: #17a2b8; font-weight: bold;">${ensureString(totalAllowanceEligibleDays, '—')} 天</td>
          </tr>
          <tr>
            <td style="border: 1px solid #e0e0e0; padding: 10px 15px; font-weight: bold; background-color: #f9f9f9;">应用政策</td>
            <td style="border: 1px solid #e0e0e0; padding: 10px 15px; line-height: 1.6; white-space: pre-wrap;">${ensureString(appliedPolicyHtml, '—')}</td>
          </tr>
          <tr>
            <td style="border: 1px solid #e0e0e0; padding: 10px 15px; font-weight: bold; background-color: #f9f9f9;">津贴发放方式</td>
            <td style="border: 1px solid #e0e0e0; padding: 10px 15px;">${ensureString(paymentMethod)}</td>
          </tr>
        </table>
      </div>

      <!-- 计算结果 -->
      <div style="margin-bottom: 20px; border: 1px solid #e0e0e0; border-radius: 4px; overflow: hidden;">
        <div style="background-color: #f5f5f5; padding: 10px 15px; font-weight: bold; border-bottom: 1px solid #e0e0e0;">
          计算结果
        </div>
        <table style="width: 100%; border-collapse: collapse;">
          ${showGovernmentSection ? `
          <tr>
            <td style="border: 1px solid #e0e0e0; padding: 10px 15px; width: 30%; font-weight: bold; background-color: #f9f9f9;">政府发放金额</td>
            <td style="border: 1px solid #e0e0e0; padding: 10px 15px; color: #dc3545; font-weight: bold;">¥${ensureString(governmentAmountDisplay)}</td>
          </tr>
          <tr>
            <td style="border: 1px solid #e0e0e0; padding: 10px 15px; font-weight: bold; background-color: #f9f9f9;">政府发放计算过程</td>
            <td style="border: 1px solid #e0e0e0; padding: 10px 15px; line-height: 1.6; white-space: pre-wrap;">${ensureString(governmentProcess, '—')}</td>
          </tr>
          ` : ''}
          <tr>
            <td style="border: 1px solid #e0e0e0; padding: 10px 15px; font-weight: bold; background-color: #f9f9f9;">员工应领取金额</td>
            <td style="border: 1px solid #e0e0e0; padding: 10px 15px; color: #dc3545; font-weight: bold;">¥${ensureString(employeeReceivableDisplay)}</td>
          </tr>
          <tr>
            <td style="border: 1px solid #e0e0e0; padding: 10px 15px; font-weight: bold; background-color: #f9f9f9;">员工应领取计算过程</td>
            <td style="border: 1px solid #e0e0e0; padding: 10px 15px; line-height: 1.6; white-space: pre-wrap;">${ensureString(employeeProcess, '—')}</td>
          </tr>
          <tr>
            <td style="border: 1px solid #e0e0e0; padding: 10px 15px; font-weight: bold; background-color: #f9f9f9;">补差金额</td>
            <td style="border: 1px solid #e0e0e0; padding: 10px 15px; color: #dc3545; font-weight: bold;">¥${ensureString(adjustedSupplementDisplay)}</td>
          </tr>
          <tr>
            <td style="border: 1px solid #e0e0e0; padding: 10px 15px; font-weight: bold; background-color: #f9f9f9;">补差减扣明细</td>
            <td style="border: 1px solid #e0e0e0; padding: 10px 15px; line-height: 1.6; white-space: pre-wrap;">${ensureString(deductionSummaryDisplay)}</td>
          </tr>
          <tr>
            <td style="border: 1px solid #e0e0e0; padding: 10px 15px; font-weight: bold; background-color: #f9f9f9;">需补差 - 计算过程</td>
            <td style="border: 1px solid #e0e0e0; padding: 10px 15px; line-height: 1.6; white-space: pre-wrap;">${ensureString(supplementProcess, '—')}</td>
          </tr>
          ${paymentMethod === '个人账户' && refundAmountDisplay && refundAmountDisplay !== '—' ? `
          <tr>
            <td style="border: 1px solid #e0e0e0; padding: 10px 15px; font-weight: bold; background-color: #f9f9f9;">需返还</td>
            <td style="border: 1px solid #e0e0e0; padding: 10px 15px; color: #dc3545; font-weight: bold;">¥${ensureString(refundAmountDisplay)}</td>
          </tr>
          <tr>
            <td style="border: 1px solid #e0e0e0; padding: 10px 15px; font-weight: bold; background-color: #f9f9f9;">需返还计算过程</td>
            <td style="border: 1px solid #e0e0e0; padding: 10px 15px; line-height: 1.6; white-space: pre-wrap;">${ensureString(refundCalcProcess, '—')}</td>
          </tr>
          ` : ''}
          ${startMonthProratedWage && startMonthProratedWage !== '—' ? `
          <tr>
            <td style="border: 1px solid #e0e0e0; padding: 10px 15px; font-weight: bold; background-color: #f9f9f9;">产假首月应发工资</td>
            <td style="border: 1px solid #e0e0e0; padding: 10px 15px; color: #dc3545; font-weight: bold;">¥${startMonthProratedWage}</td>
          </tr>
          <tr>
            <td style="border: 1px solid #e0e0e0; padding: 10px 15px; font-weight: bold; background-color: #f9f9f9;">产假首月计算过程</td>
            <td style="border: 1px solid #e0e0e0; padding: 10px 15px; line-height: 1.6; white-space: pre-wrap;">${startMonthProcess || '—'}</td>
          </tr>
          ` : ''}
          ${endMonthProratedWage && endMonthProratedWage !== '—' ? `
          <tr>
            <td style="border: 1px solid #e0e0e0; padding: 10px 15px; font-weight: bold; background-color: #f9f9f9;">产假结束月应发工资</td>
            <td style="border: 1px solid #e0e0e0; padding: 10px 15px; color: #dc3545; font-weight: bold;">¥${endMonthProratedWage}</td>
          </tr>
          <tr>
            <td style="border: 1px solid #e0e0e0; padding: 10px 15px; font-weight: bold; background-color: #f9f9f9;">产假结束月计算过程</td>
            <td style="border: 1px solid #e0e0e0; padding: 10px 15px; line-height: 1.6; white-space: pre-wrap;">${endMonthProcess || '—'}</td>
          </tr>
          ` : ''}
          ${personalSocialSecurity && personalSocialSecurity !== '—' ? `
          <tr>
            <td style="border: 1px solid #e0e0e0; padding: 10px 15px; font-weight: bold; background-color: #f9f9f9;">产假期间个人社保公积金合计</td>
            <td style="border: 1px solid #e0e0e0; padding: 10px 15px; color: #dc3545; font-weight: bold;">¥${personalSocialSecurity}</td>
          </tr>
          <tr>
            <td style="border: 1px solid #e0e0e0; padding: 10px 15px; font-weight: bold; background-color: #f9f9f9;">个人社保计算过程</td>
            <td style="border: 1px solid #e0e0e0; padding: 10px 15px; line-height: 1.6; white-space: pre-wrap;">${personalSSProcess || '—'}</td>
          </tr>
          ` : ''}
          ${unionFee && unionFee !== '—' ? `
          <tr>
            <td style="border: 1px solid #e0e0e0; padding: 10px 15px; font-weight: bold; background-color: #f9f9f9;">返还工会费合计</td>
            <td style="border: 1px solid #e0e0e0; padding: 10px 15px; color: #28a745; font-weight: bold;">¥${unionFee}</td>
          </tr>
          <tr>
            <td style="border: 1px solid #e0e0e0; padding: 10px 15px; font-weight: bold; background-color: #f9f9f9;">工会费计算过程</td>
            <td style="border: 1px solid #e0e0e0; padding: 10px 15px; line-height: 1.6; white-space: pre-wrap;">${unionFeeProcess || '—'}</td>
          </tr>
          ` : ''}
        </table>
      </div>

      <!-- 政策与规则 -->
      <div style="margin-bottom: 20px; border: 1px solid #e0e0e0; border-radius: 4px; overflow: hidden;">
        <div style="background-color: #f5f5f5; padding: 10px 15px; font-weight: bold; border-bottom: 1px solid #e0e0e0;">
          政策与规则
        </div>
        <table style="width: 100%; border-collapse: collapse;">
          <tr>
            <td style="border: 1px solid #e0e0e0; padding: 10px 15px; width: 30%; font-weight: bold; background-color: #f9f9f9;">产假政策</td>
            <td style="border: 1px solid #e0e0e0; padding: 10px 15px; line-height: 1.6; white-space: pre-wrap;">${ensureString(maternityPolicyText, '—')}</td>
          </tr>
          <tr>
            <td style="border: 1px solid #e0e0e0; padding: 10px 15px; font-weight: bold; background-color: #f9f9f9;">津贴补差政策</td>
            <td style="border: 1px solid #e0e0e0; padding: 10px 15px; line-height: 1.6; white-space: pre-wrap;">${ensureString(allowancePolicyText, '—')}</td>
          </tr>
        </table>
      </div>
    </div>
  `;

  const element = document.createElement('div');
  element.innerHTML = htmlContent;

  const options = {
    margin: 10,
    filename: filename || `产假津贴计算_${Date.now()}.pdf`,
    image: { type: 'jpeg', quality: 0.98 },
    html2canvas: { 
      scale: 2, 
      useCORS: true,
      scrollY: 0,
      windowHeight: document.documentElement.offsetHeight
    },
    pagebreak: { 
      mode: ['avoid-all', 'css', 'legacy'],
      before: '.page-break-before',
      after: '.page-break-after' 
    },
    jsPDF: { 
      unit: 'mm', 
      format: 'a4', 
      orientation: 'portrait'
    }
  };

  return html2pdf().set(options).from(element).save();
};
