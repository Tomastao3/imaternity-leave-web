import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

jest.mock('../../utils/cityDataUtils', () => ({
  cityDataManager: {
    loadData: jest.fn().mockResolvedValue(),
    getAllEmployees: jest.fn(() => [
      {
        employeeId: 'E001',
        employeeName: '张三',
        city: '成都',
        basicSalary: 18500,
        socialSecurityBase: 18500
      }
    ])
  },
  MATERNITY_LEAVE_TYPES: {},
  PREGNANCY_PERIODS: { ABOVE_7_MONTHS: '7个月以上' }
}));

jest.mock('../../utils/maternityCalculations', () => ({
  calculateMaternityAllowance: jest.fn(() => ({
    governmentPaidAmount: 35000,
    employeeReceivable: 42000,
    companySupplement: 7000,
    totalMaternityDays: 158,
    maternityAllowance: 35000,
    debugInfo: {
      companyAvg: 24500,
      socialLimit: 32000
    }
  })),
  validateEmployeeData: jest.fn(() => ({ errors: [] }))
}));

jest.mock('../../utils/allowanceBreakdown', () => ({
  buildAllowanceBreakdown: jest.fn(() => ({
    government: { formatted: '35000.00', process: '¥24500 / 30 * 158天' },
    employee: { formatted: '42000.00', process: '员工公式' },
    supplement: {
      formattedAdjusted: '7000.00',
      totalDeductions: 800,
      deductionSummary: '个税预扣 ¥800.00',
      process: '员工应领取 - 政府发放 - 公司已发工资 - 减扣项'
    }
  }))
}));

jest.mock('../../utils/allowancePdfExporter', () => ({
  exportAllowancePdf: jest.fn()
}));

jest.mock('../../utils/allowanceExcelExporter', () => ({
  exportAllowanceExcel: jest.fn()
}));

jest.mock('../../components/LeaveCalendar', () => () => <div data-testid="leave-calendar" />);

const cityCases = require('../../../tests/fixtures/cityCases.json');
const AllowanceCalculator = require('../../components/AllowanceCalculator').default;

describe('AllowanceCalculator', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  test('renders calculation results when required fields are provided', async () => {
    const { input } = cityCases.chengdu;
    const user = userEvent.setup();
    render(<AllowanceCalculator />);

    await user.clear(screen.getByLabelText('城市'));
    await user.type(screen.getByLabelText('城市'), input.city);
    await user.type(screen.getByLabelText('单位上年度月平均工资 *'), String(input.companyAvgSalary));
    await user.type(screen.getByLabelText('三倍社平工资 *'), String(input.socialInsuranceLimit));
    await user.type(screen.getByLabelText('开始日期 *'), input.startDate);

    await user.click(screen.getByRole('button', { name: /开始计算/i }));

    await waitFor(() => {
      expect(screen.getByText('政府发放金额：')).toBeInTheDocument();
      expect(screen.getByText(/¥35000.00/)).toBeInTheDocument();
      expect(screen.getByText(/补差金额/)).toBeInTheDocument();
    });
  });

  test('prevents calculation when company average salary is missing', async () => {
    const { input } = cityCases.shaoxing;
    const user = userEvent.setup();
    render(<AllowanceCalculator />);

    jest.spyOn(window, 'alert').mockImplementation(() => {});

    await user.clear(screen.getByLabelText('城市'));
    await user.type(screen.getByLabelText('城市'), input.city);
    await user.type(screen.getByLabelText('三倍社平工资 *'), String(input.socialInsuranceLimit));
    await user.type(screen.getByLabelText('开始日期 *'), input.startDate);

    await user.click(screen.getByRole('button', { name: /开始计算/i }));

    await waitFor(() => {
      expect(window.alert).toHaveBeenCalled();
    });

    window.alert.mockRestore();
  });

  test('calls exportAllowancePdf with breakdown data when exporting to PDF', async () => {
    const { exportAllowancePdf } = require('../../utils/allowancePdfExporter');
    const user = userEvent.setup();
    render(<AllowanceCalculator />);

    await user.click(screen.getByRole('button', { name: /开始计算/i }));
    await waitFor(() => expect(screen.getByText(/政府发放金额/)).toBeInTheDocument());

    await user.click(screen.getByRole('button', { name: /导出为PDF/i }));

    expect(exportAllowancePdf).toHaveBeenCalled();
    const args = exportAllowancePdf.mock.calls[0][0];
    expect(args.governmentAmountDisplay).toContain('¥35000.00');
    expect(args.supplementProcess).toContain('员工应领取');
  });
});
