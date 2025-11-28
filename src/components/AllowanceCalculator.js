import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { addDays, addMonths, format, parse } from 'date-fns';
import { cityDataManager, PREGNANCY_PERIODS } from '../utils/cityDataUtils';
import { warmUpHolidayPlan } from '../utils/holidayUtils';
import { calculateMaternityAllowance } from '../utils/maternityCalculations';
import { formatAppliedRulesSummaryLine } from '../utils/allowanceFormatters';
import {
  buildAllowanceBreakdown,
  buildSupplementDetails,
  formatCurrency,
  safeNumber
} from '../utils/allowanceBreakdown';
import {
  formatStartMonthProcess,
  formatEndMonthProcess,
  formatPersonalSSProcess
} from '../utils/calculationFormatter';
import LeaveCalendar from './LeaveCalendar';
import { exportAllowancePdf } from '../utils/allowancePdfExporter';
import { exportAllowanceExcel } from '../utils/allowanceExcelExporter';
import TabHeader from './TabHeader';

const DEFAULT_CITY = '上海';
const pickAvailableCity = (cityList, preferred) => {
  if (!Array.isArray(cityList) || cityList.length === 0) {
    return '';
  }
  if (preferred && preferred !== '通用' && cityList.includes(preferred)) {
    return preferred;
  }
  if (cityList.includes(DEFAULT_CITY)) {
    return DEFAULT_CITY;
  }
  const nonGeneral = cityList.find(city => city !== '通用');
  if (nonGeneral) {
    return nonGeneral;
  }
  if (preferred && cityList.includes(preferred)) {
    return preferred;
  }
  return cityList[0];
};

const themedCardContainerStyle = {
  marginTop: '24px',
  padding: '20px',
  borderRadius: '18px',
  background: 'linear-gradient(135deg, rgba(255, 229, 217, 0.9), rgba(231, 198, 255, 0.85))',
  boxShadow: '0 18px 45px rgba(255, 175, 204, 0.25)',
  border: '1px solid rgba(255, 214, 224, 0.6)',
  display: 'flex',
  flexDirection: 'column',
  gap: '14px'
};

const themedRowStyle = {
  borderBottom: '1px solid rgba(255, 214, 224, 0.55)',
  paddingTop: '8px'
};

const themedValueStyle = {
  marginLeft: '8px',
  color: '#a44d69',
  fontWeight: 700
};

const themedProcessStyle = {
  backgroundColor: 'rgba(255, 255, 255, 0.6)',
  border: '1px dashed rgba(164, 77, 105, 0.3)',
  borderRadius: '12px',
  color: '#6d5160'
};

const themedProcessValueStyle = {
  whiteSpace: 'pre-wrap',
  lineHeight: 1.6
};

const themedSectionHeaderStyle = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  gap: '12px',
  padding: '12px 18px',
  borderRadius: '12px',
  background: 'linear-gradient(135deg, rgba(255, 229, 217, 0.85), rgba(231, 198, 255, 0.8))',
  color: '#5a2d43',
  marginBottom: '12px',
  boxShadow: '0 8px 18px rgba(164, 77, 105, 0.15)'
};

const REFUND_FIELD_LEFT_OFFSET = 132;

const AllowanceCalculator = ({ initialEmployeeName = '', onLogout, userRole = 'hr' }) => {
  const [selectedCity, setSelectedCity] = useState(DEFAULT_CITY);
  const [citySetByEmployee, setCitySetByEmployee] = useState(false);
  const [cities, setCities] = useState([]);
  const displayCities = useMemo(() => {
    if (!Array.isArray(cities)) {
      return [];
    }
    const filtered = cities.filter(city => city !== '通用');
    return filtered.length > 0 ? filtered : cities;
  }, [cities]);
  const [allEmployees, setAllEmployees] = useState([]);
  const [employeeId, setEmployeeId] = useState('');
  const [employeeName, setEmployeeName] = useState(initialEmployeeName || '');
  const [employeeSearchTerm, setEmployeeSearchTerm] = useState(initialEmployeeName || '');
  const [filteredEmployees, setFilteredEmployees] = useState([]);
  const [showEmployeeSuggestions, setShowEmployeeSuggestions] = useState(false);
  const [selectedEmployee, setSelectedEmployee] = useState(null);
  const [companyAvgSalary, setCompanyAvgSalary] = useState('');
  const [companyAvgSalaryAutoFilled, setCompanyAvgSalaryAutoFilled] = useState(false);
  const [companyAvgSalaryLabel, setCompanyAvgSalaryLabel] = useState('公司平均工资 *');
  const [socialInsuranceLimit, setSocialInsuranceLimit] = useState('');
  const [socialInsuranceLimitAutoFilled, setSocialInsuranceLimitAutoFilled] = useState(false);
  const [employeeBasicSalary, setEmployeeBasicSalary] = useState('');
  const [employeeBasicSalaryAutoFilled, setEmployeeBasicSalaryAutoFilled] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState('企业账户');
  const [paymentMethodAutoFilled, setPaymentMethodAutoFilled] = useState(false);
  const [startDate, setStartDate] = useState(() => {
    const today = new Date();
    return format(today, 'yyyy-MM-dd');
  });
  const [endDate, setEndDate] = useState('');
  const [userEditedEndDate, setUserEditedEndDate] = useState(false);
  const [isDifficultBirth, setIsDifficultBirth] = useState(false);
  const [isMiscarriage, setIsMiscarriage] = useState(false);
  const [numberOfBabies, setNumberOfBabies] = useState(1);
  const [pregnancyPeriod, setPregnancyPeriod] = useState('');
  const [miscarriageOptions, setMiscarriageOptions] = useState([]);
  const [doctorAdviceDays, setDoctorAdviceDays] = useState('');
  const [result, setResult] = useState(null);
  const [shouldAutoFillDeductions, setShouldAutoFillDeductions] = useState(false);
  const [showLeaveCalendar, setShowLeaveCalendar] = useState(true);
  const [meetsSupplementalDifficultBirth, setMeetsSupplementalDifficultBirth] = useState(false);
  const [isSecondThirdChild, setIsSecondThirdChild] = useState(false);
  // 可选覆盖项
  const [overrideGovernmentPaidAmount, setOverrideGovernmentPaidAmount] = useState('');
  const [overrideGovernmentPaidAmountAutoFilled, setOverrideGovernmentPaidAmountAutoFilled] = useState(false);
  const [overridePersonalSSMonthly, setOverridePersonalSSMonthly] = useState('');
  const [overridePersonalSSMonthlyAutoFilled, setOverridePersonalSSMonthlyAutoFilled] = useState(false);
  // 新增：员工基本工资（元/月）
  const [employeeBaseSalary, setEmployeeBaseSalary] = useState('');
  const [employeeBaseSalaryAutoFilled, setEmployeeBaseSalaryAutoFilled] = useState(false);
  // 新增：已发产假期间工资（仅企业账户显示）
  const [paidWageDuringLeave, setPaidWageDuringLeave] = useState('');
  // 新增：产假期间工资调整
  const [salaryBeforeAdjustment, setSalaryBeforeAdjustment] = useState('');
  const [salaryAfterAdjustment, setSalaryAfterAdjustment] = useState('');
  const [salaryAdjustmentMonth, setSalaryAdjustmentMonth] = useState('');
  const [socialSecurityBeforeAdjustment, setSocialSecurityBeforeAdjustment] = useState('');
  const [socialSecurityAfterAdjustment, setSocialSecurityAfterAdjustment] = useState('');
  const [socialSecurityAdjustmentMonth, setSocialSecurityAdjustmentMonth] = useState('');
  const [showSalaryAdjustments, setShowSalaryAdjustments] = useState(false);
  // 新增：返还计算专用请假日期（默认联动产假日期，可手工修改）
  const [refundLeaveStartDate, setRefundLeaveStartDate] = useState('');
  const [refundLeaveEndDate, setRefundLeaveEndDate] = useState('');
  const [refundStartDateManuallySet, setRefundStartDateManuallySet] = useState(false);
  const [refundEndDateManuallySet, setRefundEndDateManuallySet] = useState(false);
  // 新增：返还请假日历显示切换
  const [showRefundLeaveCalendar, setShowRefundLeaveCalendar] = useState(false);
  // 新增：减扣项（动态列表）
  const [deductions, setDeductions] = useState([{ amount: '', note: '' }]);
  // 生成“需返还编辑”后，等待 state 提交再进行二次计算的标志
  const [shouldRecalculateAfterDeductions, setShouldRecalculateAfterDeductions] = useState(false);
  // 在减扣项生成后的二次计算是否需要自动滚动到结果区域
  const [shouldScrollResultAfterDeductions, setShouldScrollResultAfterDeductions] = useState(false);
  const [refundRules, setRefundRules] = useState([]);
  const [showConditionDropdown, setShowConditionDropdown] = useState(false);
  const employeeBasicSalaryRef = useRef(null);
  const deductionSectionRef = useRef(null);
  const refundResultRef = useRef(null);
  const conditionDropdownRef = useRef(null);
  const resultRef = useRef(null);
  const calculateButtonRef = useRef(null);
  const [employeeBasicSalaryError, setEmployeeBasicSalaryError] = useState(false);
  const [companyAvgSalaryError, setCompanyAvgSalaryError] = useState(false);
  const [socialInsuranceLimitError, setSocialInsuranceLimitError] = useState(false);
  // 滚动目标：null | 'top' | 'refund'
  const [scrollTarget, setScrollTarget] = useState(null);
  const hasInitialNameAppliedRef = useRef(false);

  const applyCitySelection = useCallback((city) => {
    if (city) {
      try {
        const allowanceRule = cityDataManager.getAllowanceRulesByCity(city);
        if (allowanceRule) {
          // 使用公司平均工资（companyAverageWage）
          const companyAverageValue = allowanceRule.companyAverageWage;
          setCompanyAvgSalaryLabel('公司平均工资 *');
          const companyAverageString = companyAverageValue != null && companyAverageValue !== '' ? companyAverageValue.toString() : '';
          setCompanyAvgSalary(companyAverageString);
          setCompanyAvgSalaryAutoFilled(companyAverageString !== '');
          setCompanyAvgSalaryError(false);
          setSocialInsuranceLimitError(false);
          const socialLimitValue = allowanceRule.socialAverageWage != null && allowanceRule.socialAverageWage !== ''
            ? (allowanceRule.socialAverageWage * 3).toString()
            : '';
          setSocialInsuranceLimit(socialLimitValue);
          setSocialInsuranceLimitAutoFilled(socialLimitValue !== '');
          if (allowanceRule.accountType) {
            const acct = allowanceRule.accountType.trim();
            if (acct === '公司') {
              setPaymentMethod('企业账户');
              setPaymentMethodAutoFilled(true);
            } else if (acct === '个人') {
              setPaymentMethod('个人账户');
              setPaymentMethodAutoFilled(true);
              // 个人账户模式下，启用政府发放金额自动填充
              setOverrideGovernmentPaidAmountAutoFilled(true);
            } else {
              setPaymentMethod('企业账户');
              setPaymentMethodAutoFilled(true);
            }
          }
        } else {
          setCompanyAvgSalary('');
          setCompanyAvgSalaryAutoFilled(false);
          setCompanyAvgSalaryLabel('公司平均工资 *');
          setCompanyAvgSalaryError(false);
          setSocialInsuranceLimit('');
          setSocialInsuranceLimitAutoFilled(false);
          setSocialInsuranceLimitError(false);
          setPaymentMethod('企业账户');
          setPaymentMethodAutoFilled(false);
        }

        // 初始化减扣项为空行（等待用户点击"计算社保公积金返还"按钮加载）
        setDeductions([{ amount: '', note: '' }]);
        
        // 保存返还规则供后续使用
        const refundRulesForCity = cityDataManager.getRefundRulesByCity(city);
        setRefundRules(refundRulesForCity);
      } catch (error) {
        console.error('选择城市时发生错误:', error);
        setFilteredEmployees([]);
        setCompanyAvgSalary('');
        setCompanyAvgSalaryAutoFilled(false);
        setCompanyAvgSalaryLabel('公司平均工资 *');
        setSocialInsuranceLimit('');
        setSocialInsuranceLimitAutoFilled(false);
        setSocialInsuranceLimitError(false);
        setPaymentMethod('企业账户');
        setPaymentMethodAutoFilled(false);
        setDeductions([{ amount: '', note: '' }]);
        setRefundRules([]);
      }
    } else {
      setFilteredEmployees([]);
      setSelectedEmployee(null);
      setEmployeeId('');
      setEmployeeName('');
      setEmployeeSearchTerm('');
      setEmployeeBasicSalary('');
      setShowEmployeeSuggestions(false);
      setCompanyAvgSalary('');
      setCompanyAvgSalaryAutoFilled(false);
      setCompanyAvgSalaryLabel('公司平均工资 *');
      setCompanyAvgSalaryError(false);
      setSocialInsuranceLimit('');
      setSocialInsuranceLimitAutoFilled(false);
      setSocialInsuranceLimitError(false);
      setPaymentMethod('企业账户');
      setPaymentMethodAutoFilled(false);
      setDeductions([{ amount: '', note: '' }]);
      setRefundRules([]);
    }
  }, []);

  useEffect(() => {
    let isMounted = true;
    const initializeData = async () => {
      try {
        await cityDataManager.loadData();
        if (!isMounted) return;
        const rawCities = cityDataManager.getCities();
        const loadedCities = Array.isArray(rawCities) ? rawCities.filter(city => city !== '通用') : [];
        setCities(loadedCities);
        const allEmps = cityDataManager.getAllEmployees();
        setAllEmployees(allEmps || []);
        const refundList = cityDataManager.getAllRefundRules();
        setRefundRules(Array.isArray(refundList) ? refundList : []);
        
        // 员工登录逻辑：根据员工姓名查找员工信息并设置城市
        let initialCity = null;
        let employeeFound = false;
        if (initialEmployeeName && allEmps && allEmps.length > 0) {
          const matchedEmployees = allEmps.filter(emp => emp.employeeName === initialEmployeeName);
          if (matchedEmployees.length === 1) {
            // 找到唯一记录，自动填入并trigger
            const matchedEmployee = matchedEmployees[0];
            if (matchedEmployee.city) {
              initialCity = matchedEmployee.city;
              employeeFound = true;
              setCitySetByEmployee(true);
            }
            // 直接选择该员工，触发联动
            selectEmployeeFromSuggestion(matchedEmployee);
          } else if (matchedEmployees.length > 1) {
            // 找到多条记录，触发搜索让用户选择
            handleUnifiedEmployeeSearch(initialEmployeeName);
            // 使用第一个匹配员工的城市
            if (matchedEmployees[0].city) {
              initialCity = matchedEmployees[0].city;
              employeeFound = true;
              setCitySetByEmployee(true);
            }
          } else if (matchedEmployees.length === 0) {
            // 找不到员工信息（这种情况理论上不应该发生，因为登录时已验证）
            alert(`员工信息不存在，请联系HR\n\n员工姓名：${initialEmployeeName}`);
          }
        }
        
        // 如果没有找到员工或员工没有城市信息，使用默认城市
        const resolvedCity = pickAvailableCity(loadedCities, employeeFound ? initialCity : null);
        if (resolvedCity) {
          setSelectedCity(resolvedCity);
          applyCitySelection(resolvedCity);
        }
        try { warmUpHolidayPlan(2025); } catch (e) { /* ignore */ }
      } catch (error) {
        console.error('初始化城市和员工数据失败:', error);
      }
    };
    initializeData();

    const unsubscribe = cityDataManager.addChangeListener(({ reason }) => {
      if (!isMounted) return;
      if (['save', 'load', 'allowanceRules', 'maternityRules', 'employees', 'refundRules'].includes(reason)) {
        const rawUpdatedCities = cityDataManager.getCities();
        const updatedCities = Array.isArray(rawUpdatedCities) ? rawUpdatedCities.filter(city => city !== '通用') : [];
        setCities(updatedCities);
        const allEmps = cityDataManager.getAllEmployees();
        setAllEmployees(allEmps || []);
        const refundList = cityDataManager.getAllRefundRules();
        setRefundRules(Array.isArray(refundList) ? refundList : []);
        
        // 使用函数式更新来获取最新的状态值
        setCitySetByEmployee(currentCitySetByEmployee => {
          setSelectedCity(currentCity => {
            if (currentCity && updatedCities.includes(currentCity)) {
              applyCitySelection(currentCity);
            } else if (updatedCities.length > 0 && !currentCitySetByEmployee) {
              const fallbackCity = pickAvailableCity(updatedCities, null);
              if (fallbackCity) {
                applyCitySelection(fallbackCity);
                return fallbackCity;
              }
            }
            return currentCity;
          });
          return currentCitySetByEmployee;
        });
      }
    });

    return () => {
      isMounted = false;
      unsubscribe();
    };
  }, [applyCitySelection]);

  useEffect(() => {
    if (startDate) {
      try { warmUpHolidayPlan(new Date(startDate).getFullYear()); } catch (e) { /* ignore */ }
    }
  }, [startDate]);

  useEffect(() => {
    applyCitySelection(selectedCity);
  }, [selectedCity, applyCitySelection]);

  useEffect(() => {
    if (!initialEmployeeName) {
      return;
    }
    if (hasInitialNameAppliedRef.current) {
      return;
    }
    setEmployeeName(prev => (prev ? prev : initialEmployeeName));
    setEmployeeSearchTerm(prev => (prev ? prev : initialEmployeeName));
    hasInitialNameAppliedRef.current = true;
  }, [initialEmployeeName]);

  useEffect(() => {
    if (selectedCity !== '广州') {
      setMeetsSupplementalDifficultBirth(false);
    }
    if (selectedCity !== '绍兴') {
      setIsSecondThirdChild(false);
    }
  }, [selectedCity]);

  const productionConditionSummary = useMemo(() => {
    const labels = [];
    if (isDifficultBirth) {
      labels.push(selectedCity === '广州' ? '难产（吸引/钳产/臀位）' : '难产');
    }
    if (meetsSupplementalDifficultBirth) {
      labels.push('难产（剖腹产、会阴Ⅲ度破裂）');
    }
    if (isMiscarriage) {
      labels.push('流产');
    }
    if (isSecondThirdChild) {
      labels.push('生育二孩、三孩');
    }
    return labels.length > 0 ? labels.join('，') : '未选择';
  }, [isDifficultBirth, meetsSupplementalDifficultBirth, isSecondThirdChild, isMiscarriage, selectedCity]);

  useEffect(() => {
    if (!showConditionDropdown) return;
    
    // 使用 requestAnimationFrame 确保在下一帧才添加监听器
    // 这样可以避免当前点击事件被立即捕获
    let rafId;
    let cleanupFn = null;
    
    rafId = requestAnimationFrame(() => {
      const handleClickOutside = (event) => {
        if (conditionDropdownRef.current && !conditionDropdownRef.current.contains(event.target)) {
          setShowConditionDropdown(false);
        }
      };
      document.addEventListener('mousedown', handleClickOutside);
      
      // 保存清理函数
      cleanupFn = () => document.removeEventListener('mousedown', handleClickOutside);
    });
    
    return () => {
      if (rafId) {
        cancelAnimationFrame(rafId);
      }
      if (cleanupFn) {
        cleanupFn();
      }
    };
  }, [showConditionDropdown]);

  // 动态加载流产假选项
  useEffect(() => {
    if (selectedCity && isMiscarriage) {
      try {
        const maternityRules = cityDataManager.getMaternityRulesByCity(selectedCity);
        if (maternityRules && maternityRules.length > 0) {
          const miscarriageRules = maternityRules.filter(
            rule => rule.leaveType === '流产假'
          );
          const options = miscarriageRules.map(rule => ({
            label: rule.miscarriageType || '未分类',
            value: rule.miscarriageType || '',
            days: rule.days || 0
          }));
          // 去重
          const uniqueOptions = options.filter((opt, index, self) =>
            index === self.findIndex(t => t.value === opt.value)
          );
          setMiscarriageOptions(uniqueOptions);
          // 如果当前选择的值不在新选项中，重置
          if (uniqueOptions.length > 0 && !uniqueOptions.find(opt => opt.value === pregnancyPeriod)) {
            setPregnancyPeriod(uniqueOptions[0].value);
          }
        } else {
          setMiscarriageOptions([]);
        }
      } catch (error) {
        console.error('加载流产假选项失败:', error);
        setMiscarriageOptions([]);
      }
    } else if (!isMiscarriage) {
      setMiscarriageOptions([]);
      setPregnancyPeriod('');
    }
  }, [selectedCity, isMiscarriage, pregnancyPeriod]);

  const selectedMiscarriageOption = useMemo(() => (
    miscarriageOptions.find(option => option.value === pregnancyPeriod)
  ), [miscarriageOptions, pregnancyPeriod]);

  const showDoctorAdviceInput = useMemo(() => {
    if (!isMiscarriage) return false;
    if (!['深圳', '珠海', '广州', '佛山'].includes(selectedCity)) return false;
    if (!selectedMiscarriageOption) return false;
    const label = selectedMiscarriageOption.label || '';
    return label.includes('妊娠未满4个月流产') && Number(selectedMiscarriageOption.days) === 15;
  }, [isMiscarriage, selectedCity, selectedMiscarriageOption]);

  useEffect(() => {
    if (!showDoctorAdviceInput) {
      if (doctorAdviceDays !== '') {
        setDoctorAdviceDays('');
      }
    }
  }, [showDoctorAdviceInput, doctorAdviceDays]);

  // 根据规则预热节假日数据
  useEffect(() => {
    try {
      if (startDate) {
        const y = new Date(startDate).getFullYear();
        try { warmUpHolidayPlan(y); } catch (e) { /* ignore */ }
        try { warmUpHolidayPlan(y + 1); } catch (e) { /* ignore */ }
      }
    } catch (e) {
      // ignore
    }
  }, [startDate]);

  // 统一员工搜索功能 - 同时匹配工号和姓名
  const handleUnifiedEmployeeSearch = (searchValue) => {
    setEmployeeSearchTerm(searchValue);
    
    if (!searchValue.trim()) {
      setFilteredEmployees([]);
      setShowEmployeeSuggestions(false);
      return;
    }
    
    // 从所有员工中搜索，不限制城市
    const filtered = allEmployees.filter(emp => {
      const searchTerm = searchValue.toLowerCase();
      const matchId = emp.employeeId.toLowerCase().includes(searchTerm);
      const matchName = emp.employeeName.toLowerCase().includes(searchTerm);
      const matchCombined = (emp.employeeId + ' ' + emp.employeeName).toLowerCase().includes(searchTerm);
      return matchId || matchName || matchCombined;
    });
    
    setFilteredEmployees(filtered);
    setShowEmployeeSuggestions(filtered.length > 0);
  };

  // 从建议列表中选择员工
  const selectEmployeeFromSuggestion = (employee) => {
    setEmployeeId(employee.employeeId);
    setEmployeeName(employee.employeeName);
    // 选择后仅显示姓名
    setEmployeeSearchTerm(employee.employeeName);
    if (employee.city && employee.city !== selectedCity) {
      setSelectedCity(employee.city);
      setCitySetByEmployee(true);
    }
    setShowEmployeeSuggestions(false);
    
    // 重置页面其他信息
    const today = new Date();
    setStartDate(format(today, 'yyyy-MM-dd'));
    setEndDate('');
    setUserEditedEndDate(false);
    setIsDifficultBirth(false);
    setIsMiscarriage(false);
    setNumberOfBabies(1);
    setPregnancyPeriod(PREGNANCY_PERIODS.ABOVE_7_MONTHS);
    setDoctorAdviceDays('');
    setResult(null);
    setMeetsSupplementalDifficultBirth(false);
    setIsSecondThirdChild(false);
    setOverrideGovernmentPaidAmount('');
    setPaidWageDuringLeave('');
    setDeductions([{ amount: '', note: '' }]);
    setRefundLeaveStartDate('');
    setRefundLeaveEndDate('');
    setRefundStartDateManuallySet(false);
    setRefundEndDateManuallySet(false);
    setEmployeeBasicSalaryError(false);
    setCompanyAvgSalaryError(false);
    setSocialInsuranceLimitError(false);
  };

  useEffect(() => {
    if (employeeId && allEmployees.length > 0) {
      try {
        const employee = allEmployees.find(emp => emp.employeeId === employeeId);
        if (employee) {
          setSelectedEmployee(employee);
          
          // 设置城市信息（员工登录时立即设置）
          if (employee.city && employee.city !== selectedCity) {
            setSelectedCity(employee.city);
            setCitySetByEmployee(true);
          }
          
          // 员工产前12月平均工资 = 产前12月平均工资(basicSalary)
          const basicSalaryValue = employee.basicSalary ? employee.basicSalary.toString() : '';
          setEmployeeBasicSalary(basicSalaryValue);
          setEmployeeBasicSalaryAutoFilled(basicSalaryValue !== '');
          // 员工基本工资 = 基本工资(socialSecurityBase)
          const baseSalary = employee.socialSecurityBase ? employee.socialSecurityBase.toString() : '';
          setEmployeeBaseSalary(baseSalary);
          setEmployeeBaseSalaryAutoFilled(baseSalary !== '');
          // 月度个人部分社保公积金合计 = 个人部分社保公积金合计(personalSSMonthly)
          const personalSS = employee.personalSSMonthly ? employee.personalSSMonthly.toString() : '';
          setOverridePersonalSSMonthly(personalSS);
          setOverridePersonalSSMonthlyAutoFilled(personalSS !== '');
          // 联动更新调整前和调整后的字段（都填入相同的值），用户根据实际情况修改
          setSalaryBeforeAdjustment(baseSalary);
          setSalaryAfterAdjustment(baseSalary);
          setSalaryAdjustmentMonth('');
          setSocialSecurityBeforeAdjustment(personalSS);
          setSocialSecurityAfterAdjustment(personalSS);
          setSocialSecurityAdjustmentMonth('');
          // 产假情况由用户自行填写，不再从员工信息自动获取
          // 不要在这里设置公司平均工资，应该保持从城市津贴规则获取的值
          // 公司平均工资应该完全从城市津贴规则获取，不被员工数据覆盖
        } else {
          setSelectedEmployee(null);
          setEmployeeBasicSalary('');
          setEmployeeBasicSalaryAutoFilled(false);
          setEmployeeBaseSalary('');
          setEmployeeBaseSalaryAutoFilled(false);
          setOverridePersonalSSMonthly('');
          setOverridePersonalSSMonthlyAutoFilled(false);
          setSalaryBeforeAdjustment('');
          setSalaryAfterAdjustment('');
          setSalaryAdjustmentMonth('');
          setSocialSecurityBeforeAdjustment('');
          setSocialSecurityAfterAdjustment('');
          setSocialSecurityAdjustmentMonth('');
        }
      } catch (error) {
        console.error('选择员工时发生错误:', error);
        setSelectedEmployee(null);
        setEmployeeBasicSalary('');
        setEmployeeBasicSalaryAutoFilled(false);
        setEmployeeBaseSalary('');
        setEmployeeBaseSalaryAutoFilled(false);
        setOverridePersonalSSMonthly('');
        setOverridePersonalSSMonthlyAutoFilled(false);
        setSalaryBeforeAdjustment('');
        setSalaryAfterAdjustment('');
        setSalaryAdjustmentMonth('');
        setSocialSecurityBeforeAdjustment('');
        setSocialSecurityAfterAdjustment('');
        setSocialSecurityAdjustmentMonth('');
      }
    } else if (!employeeId) {
      setSelectedEmployee(null);
      setEmployeeBasicSalary('');
      setEmployeeBasicSalaryAutoFilled(false);
      setEmployeeBaseSalary('');
      setEmployeeBaseSalaryAutoFilled(false);
      setOverridePersonalSSMonthly('');
      setOverridePersonalSSMonthlyAutoFilled(false);
      setSalaryBeforeAdjustment('');
      setSalaryAfterAdjustment('');
      setSalaryAdjustmentMonth('');
      setSocialSecurityBeforeAdjustment('');
      setSocialSecurityAfterAdjustment('');
      setSocialSecurityAdjustmentMonth('');
    }
  }, [employeeId, allEmployees]);


  const buildCalculationArgs = useCallback((options = {}) => {
    const {
      useOverrideEndDate = true,
      overrideGovernmentValue = overrideGovernmentPaidAmount,
      overridePersonalSSValue = overridePersonalSSMonthly
    } = options;

    const parsedEmployeeBasicSalary = employeeBasicSalary !== '' ? parseFloat(employeeBasicSalary) : NaN;
    const normalizedEmployeeBasicSalary = Number.isFinite(parsedEmployeeBasicSalary) ? parsedEmployeeBasicSalary : 0;

    const parsedEmployeeBaseSalary = employeeBaseSalary !== '' ? parseFloat(employeeBaseSalary) : NaN;
    const normalizedEmployeeBaseSalary = Number.isFinite(parsedEmployeeBaseSalary)
      ? parsedEmployeeBaseSalary
      : normalizedEmployeeBasicSalary;

    let salaryAdjustmentParam = null;
    if (salaryBeforeAdjustment && salaryAfterAdjustment && salaryAdjustmentMonth) {
      salaryAdjustmentParam = {
        before: salaryBeforeAdjustment,
        after: salaryAfterAdjustment,
        month: salaryAdjustmentMonth
      };
    }

    let socialSecurityAdjustmentParam = null;
    if (socialSecurityBeforeAdjustment && socialSecurityAfterAdjustment && socialSecurityAdjustmentMonth) {
      const beforeAmount = parseFloat(socialSecurityBeforeAdjustment);
      const afterAmount = parseFloat(socialSecurityAfterAdjustment);
      if (!Number.isNaN(beforeAmount) && !Number.isNaN(afterAmount)) {
        socialSecurityAdjustmentParam = {
          before: beforeAmount,
          after: afterAmount,
          month: socialSecurityAdjustmentMonth
        };
      }
    }

    return [
      selectedCity,
      normalizedEmployeeBasicSalary,
      startDate,
      isDifficultBirth,
      numberOfBabies,
      pregnancyPeriod,
      paymentMethod,
      useOverrideEndDate ? (endDate || null) : null,
      isMiscarriage,
      doctorAdviceDays ? parseInt(doctorAdviceDays, 10) : null,
      meetsSupplementalDifficultBirth,
      overrideGovernmentValue !== '' ? parseFloat(overrideGovernmentValue) : null,
      overridePersonalSSValue !== '' ? parseFloat(overridePersonalSSValue) : null,
      companyAvgSalary !== '' ? parseFloat(companyAvgSalary) : null,
      socialInsuranceLimit !== '' ? parseFloat(socialInsuranceLimit) : null,
      normalizedEmployeeBaseSalary,
      salaryAdjustmentParam,
      socialSecurityAdjustmentParam,
      isSecondThirdChild,
      refundLeaveStartDate || null,
      refundLeaveEndDate || null
    ];
  }, [
    selectedCity,
    employeeBasicSalary,
    startDate,
    isDifficultBirth,
    numberOfBabies,
    pregnancyPeriod,
    paymentMethod,
    endDate,
    isMiscarriage,
    doctorAdviceDays,
    meetsSupplementalDifficultBirth,
    overrideGovernmentPaidAmount,
    overridePersonalSSMonthly,
    companyAvgSalary,
    socialInsuranceLimit,
    employeeBaseSalary,
    salaryBeforeAdjustment,
    salaryAfterAdjustment,
    salaryAdjustmentMonth,
    socialSecurityBeforeAdjustment,
    socialSecurityAfterAdjustment,
    socialSecurityAdjustmentMonth,
    isSecondThirdChild,
    refundLeaveStartDate,
    refundLeaveEndDate
  ]);

  useEffect(() => {
    if (!startDate || userEditedEndDate || !selectedCity) {
      return;
    }

    try {
      const args = buildCalculationArgs({ useOverrideEndDate: false, overrideGovernmentValue: '', overridePersonalSSValue: '' });
      const previewResult = calculateMaternityAllowance(...args);

      const previewEnd = previewResult?.calculatedPeriod?.endDate;
      if (!previewEnd) {
        return;
      }

      const parsedEnd = parse(previewEnd, 'yyyy年MM月dd日', new Date());
      if (Number.isNaN(parsedEnd.getTime())) {
        console.warn('预览结束日期解析失败，使用原始字符串:', previewEnd);
        return;
      }

      const formatted = format(parsedEnd, 'yyyy-MM-dd');
      if (formatted !== endDate) {
        setEndDate(formatted);
      }
    } catch (err) {
      console.error('自动计算产假结束日期失败:', err);
    }
  }, [
    startDate,
    userEditedEndDate,
    selectedCity,
    buildCalculationArgs,
    endDate
  ]);

  // 联动更新返还计算专用请假日期：当产假开始日期变化时自动同步
  // 只在用户没有手动修改时才自动更新
  useEffect(() => {
    if (refundStartDateManuallySet) return; // 如果用户手动设置过，不自动更新
    
    if (startDate && startDate !== refundLeaveStartDate) {
      setRefundLeaveStartDate(startDate);
    }
  }, [startDate, refundLeaveStartDate, refundStartDateManuallySet]);

  // 自动设置返还计算的结束日期（从计算结果中获取）
  // 只在用户没有手动修改时才自动更新
  useEffect(() => {
    if (refundEndDateManuallySet) return; // 如果用户手动设置过，不自动更新
    
    // 优先使用计算结果中的结束日期
    if (result && result.calculatedPeriod && result.calculatedPeriod.endDate) {
      const calculatedEndDate = result.calculatedPeriod.endDate;
      // 将中文格式转换为 yyyy-MM-dd 格式
      try {
        const parsedDate = parse(calculatedEndDate, 'yyyy年MM月dd日', new Date());
        if (!Number.isNaN(parsedDate.getTime())) {
          const formatted = format(parsedDate, 'yyyy-MM-dd');
          if (formatted !== refundLeaveEndDate) {
            setRefundLeaveEndDate(formatted);
          }
        }
      } catch (e) {
        console.error('解析结束日期失败:', e);
      }
    } else if (endDate && endDate !== refundLeaveEndDate) {
      // 备用：使用产假结束日期
      setRefundLeaveEndDate(endDate);
    }
  }, [result, endDate, refundLeaveEndDate, refundEndDateManuallySet]);

  // 当切换到个人账户时，启用政府发放金额自动填充
  useEffect(() => {
    if (paymentMethod === '个人账户') {
      setOverrideGovernmentPaidAmountAutoFilled(true);
    }
  }, [paymentMethod]);

  // 自动计算并填充政府发放金额（仅在个人账户且未手工填写时）
  useEffect(() => {
    // 只在个人账户模式下自动计算
    if (paymentMethod !== '个人账户') {
      return;
    }

    // 检查必要的参数是否齐全
    if (!selectedCity || !companyAvgSalary || !socialInsuranceLimit) {
      // 参数不全，清空自动填充的值
      if (overrideGovernmentPaidAmountAutoFilled) {
        setOverrideGovernmentPaidAmount('');
        setOverrideGovernmentPaidAmountAutoFilled(false);
      }
      return;
    }

    try {
      // 使用当前参数进行计算（不传overrideGovernmentPaidAmount以获取计算值）
      const args = buildCalculationArgs({ 
        useOverrideEndDate: true, 
        overrideGovernmentValue: '', // 不使用覆盖值，让系统计算
        overridePersonalSSValue: overridePersonalSSMonthly 
      });
      const calculationResult = calculateMaternityAllowance(...args);

      if (calculationResult && calculationResult.governmentPaidAmount != null) {
        const computedValue = calculationResult.governmentPaidAmount;
        if (Number.isFinite(computedValue) && computedValue > 0) {
          const valueString = computedValue.toFixed(2);
          
          // 只有在自动填充状态下才更新
          // 如果用户手动编辑过（包括清空），不再自动覆盖
          if (overrideGovernmentPaidAmountAutoFilled) {
            if (valueString !== overrideGovernmentPaidAmount) {
              setOverrideGovernmentPaidAmount(valueString);
            }
          }
        } else {
          // 计算结果无效，清空自动填充的值
          if (overrideGovernmentPaidAmountAutoFilled) {
            setOverrideGovernmentPaidAmount('');
            setOverrideGovernmentPaidAmountAutoFilled(false);
          }
        }
      }
    } catch (err) {
      console.error('自动计算政府发放金额失败:', err);
      // 计算失败，清空自动填充的值
      if (overrideGovernmentPaidAmountAutoFilled) {
        setOverrideGovernmentPaidAmount('');
        setOverrideGovernmentPaidAmountAutoFilled(false);
      }
    }
  }, [
    paymentMethod,
    selectedCity,
    companyAvgSalary,
    socialInsuranceLimit,
    startDate,
    endDate,
    isDifficultBirth,
    numberOfBabies,
    pregnancyPeriod,
    isMiscarriage,
    doctorAdviceDays,
    meetsSupplementalDifficultBirth,
    isSecondThirdChild,
    overrideGovernmentPaidAmountAutoFilled,
    overridePersonalSSMonthly,
    buildCalculationArgs
  ]);

  const formatMonthRange = (list) => {
    if (!Array.isArray(list) || list.length === 0) return '';
    if (list.length === 1) return `（${list[0]}）`;
    return `（${list[0]} - ${list[list.length - 1]}）`;
  };

  // 使用新的格式化模块中的函数
  // formatStartMonthProcess 和 formatEndMonthProcess 已从 calculationFormatter 导入

  const calculateUnionFee = (resultData, refundRules, city) => {
    if (!resultData || !resultData.personalSSMonths || resultData.personalSSMonths.length === 0) {
      return { total: 0, monthlyFee: 50, months: [], monthCount: 0, process: '无整月产假，不计算工会费' };
    }

    // 从返还规则中查找工会费
    let monthlyUnionFee = 50; // 默认50元
    const unionFeeRule = refundRules.find(rule => 
      (rule.city === city || rule.city === '通用') && 
      rule.refundDescription && 
      rule.refundDescription.includes('工会费')
    );
    
    if (unionFeeRule && unionFeeRule.refundAmount != null) {
      monthlyUnionFee = Number(unionFeeRule.refundAmount);
    }

    const formatNumber = (value) => {
      const num = Number(value);
      if (!Number.isFinite(num)) return String(value ?? '');
      return Number.isInteger(num) ? String(num) : num.toFixed(2);
    };

    const months = resultData.personalSSMonths || [];
    const monthCount = months.length;
    const total = monthlyUnionFee * monthCount;

    const monthRange = months.length > 0 
      ? `${months[0]} - ${months[months.length - 1]}`
      : '';
    const monthRangePart = monthRange ? `(${monthRange})` : '';

    const process = `工会费¥${formatNumber(monthlyUnionFee)} × ${monthCount}个月${monthRangePart} = ${formatNumber(monthlyUnionFee)} * ${monthCount} = ${formatNumber(total)}`;

    return {
      total,
      monthlyFee: monthlyUnionFee,
      months,
      monthCount,
      monthRange,
      process
    };
  };

  // formatPersonalSSProcess 已从 calculationFormatter 导入

  const scrollToDeductionSection = () => {
    if (deductionSectionRef.current) {
      deductionSectionRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
      const focusableElement = deductionSectionRef.current.querySelector('input, button, select, textarea');
      if (focusableElement && typeof focusableElement.focus === 'function') {
        focusableElement.focus({ preventScroll: true });
      }
    }
  };

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // 使用 useEffect 监听 result 变化，自动填充减扣项
  useEffect(() => {
    if (!shouldAutoFillDeductions || !result) return;
    
    // 重置标志
    setShouldAutoFillDeductions(false);
    
    // ========== 第一部分：从返还规则加载条目（放最前面） ==========
    // 加载返还规则并动态生成减扣项
    const refundRulesForCity = cityDataManager.getRefundRulesByCity(selectedCity);
    const directDisplayRules = refundRulesForCity.filter(rule => rule.directDisplay === true);
    
    let newDeductions = [];
    if (directDisplayRules.length > 0) {
      newDeductions = directDisplayRules.map(rule => ({
        note: rule.refundDescription || '',
        amount: rule.refundAmount !== null && rule.refundAmount !== undefined ? rule.refundAmount.toString() : ''
      }));
    }
    
    // ========== 第二部分：社保公积金相关的条目（放后面） ==========
    
    // 1. 添加工会费
    if (result.unionFee && result.unionFee.total > 0) {
      const unionFeeNote = `工会费 × ${result.unionFee.monthCount}个月(${result.unionFee.months.length > 0 ? result.unionFee.months[0] + ' - ' + result.unionFee.months[result.unionFee.months.length - 1] : ''})`;
      newDeductions.push({ note: unionFeeNote, amount: result.unionFee.total.toString() });
    }
    
    // 2. 添加社保公积金
    if (result.personalSocialSecurity != null && result.personalSocialSecurity > 0) {
      let ssNote = '';
      
      // 如果有调整信息，显示分段
      if (result.personalSSBreakdown && result.personalSSBreakdown.type === 'adjusted') {
        const breakdown = result.personalSSBreakdown;
        const segments = [];
        
        if (breakdown.beforeMonths && breakdown.beforeMonths.length > 0) {
          const monthRange = breakdown.beforeMonths.length === 1 
            ? `(${breakdown.beforeMonths[0]})`
            : `(${breakdown.beforeMonths[0]} - ${breakdown.beforeMonths[breakdown.beforeMonths.length - 1]})`;
          segments.push(`调整前 个人部分社保公积金 ${breakdown.beforeAmount.toFixed(2)} × ${breakdown.beforeMonths.length}个月${monthRange}`);
        }
        
        if (breakdown.afterMonths && breakdown.afterMonths.length > 0) {
          const monthRange = breakdown.afterMonths.length === 1
            ? `(${breakdown.afterMonths[0]})`
            : `(${breakdown.afterMonths[0]} - ${breakdown.afterMonths[breakdown.afterMonths.length - 1]})`;
          segments.push(`调整后 个人部分社保公积金 ${breakdown.afterAmount.toFixed(2)} × ${breakdown.afterMonths.length}个月${monthRange}`);
        }
        
        ssNote = segments.join(' + ');
      } else {
        // 统一费率
        ssNote = `月度个人部分社保公积金合计 × ${result.personalSSMonthsCount || 0}个月(${result.personalSSMonths && result.personalSSMonths.length > 0 ? result.personalSSMonths[0] + ' - ' + result.personalSSMonths[result.personalSSMonths.length - 1] : ''})`;
      }
      
      newDeductions.push({ note: ssNote, amount: result.personalSocialSecurity.toString() });
    }
    
    // 3. 添加产假首月工资不够扣的情况
    if (result.startMonthProratedWage != null && result.startMonthMeta?.actualWorkingDays > 0) {
      const monthlySS = parseFloat(overridePersonalSSMonthly) || 0;
      const monthlyUnionFee = result.unionFee?.monthlyFee || 50;
      const baseWage = result.startMonthProratedWage;
      const finalWage = baseWage - monthlySS - monthlyUnionFee;
      
      if (finalWage < 0) {
        const startMonth = result.startMonthMeta.month;
        const startMonthNote = `产假首月（${startMonth}）工资不够扣`;
        newDeductions.push({ note: startMonthNote, amount: Math.abs(finalWage).toFixed(2) });
      }
    }
    
    // 4. 添加产假结束月工资不够扣的情况
    if (result.endMonthProratedWage != null && result.endMonthMeta?.actualWorkingDays > 0) {
      const monthlySS = parseFloat(overridePersonalSSMonthly) || 0;
      const monthlyUnionFee = result.unionFee?.monthlyFee || 50;
      const baseWage = result.endMonthProratedWage;
      const finalWage = baseWage - monthlySS - monthlyUnionFee;
      
      if (finalWage < 0) {
        const endMonth = result.endMonthMeta.month;
        const endMonthNote = `产假结束月（${endMonth}）工资不够扣`;
        newDeductions.push({ note: endMonthNote, amount: Math.abs(finalWage).toFixed(2) });
      }
    }
    
    setDeductions(newDeductions);
    // 标记在减扣项提交到 state 后进行二次计算
    setShouldRecalculateAfterDeductions(true);
    
    // 定位到返还明细区域：仅当目标是“需补差、需返还计算结果”时才滚动
    if (newDeductions.length > 0 && scrollTarget === 'refund') {
      setTimeout(() => {
        if (deductionSectionRef.current) {
          deductionSectionRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
      }, 100);
    }

  }, [shouldAutoFillDeductions, result, deductions, overridePersonalSSMonthly, scrollTarget]);

  // 等待“需返还编辑”减扣项写入完成后再触发二次计算，避免因异步 state 导致的竞态
  useEffect(() => {
    if (!shouldRecalculateAfterDeductions) return;
    // 若无减扣项（全部为空）也允许计算，以保证计算过程里显示“0”的一致性
    try {
      // 需要滚动到结果区域，由 calculateAllowance 决定具体锚点
      const skipScroll = !shouldScrollResultAfterDeductions ? true : false;
      calculateAllowance({ skipScroll });
    } finally {
      setShouldRecalculateAfterDeductions(false);
      setShouldScrollResultAfterDeductions(false);
    }
  }, [shouldRecalculateAfterDeductions, shouldScrollResultAfterDeductions, deductions]);

  // 计算社保公积金返还并自动添加减扣项
  const calculateSocialSecurityRefund = (target = 'refund') => {
    // 若当前还没有基础计算结果，先进行一次计算（会触发必要的校验与错误提示）
    if (!result) {
      try {
        calculateAllowance({ skipScroll: true });
      } catch (_) {
        // ignore
      }
    }

    // 设置标志，触发自动填充（useEffect 将在有 result 的前提下生成“需返还编辑”，随后自动二次计算）
    setShouldAutoFillDeductions(true);
    // 二次计算时定位控制：
    // - 当 target 为 'top'（来自“自动计算”按钮）时，允许滚动至结果区
    // - 当为默认 'refund'（来自“自动计算减扣项”按钮）时，不进行滚动，保持页面不变
    if (target === 'top') {
      setShouldScrollResultAfterDeductions(true);
      setScrollTarget('top');
    } else {
      setShouldScrollResultAfterDeductions(false);
      setScrollTarget(null);
    }
  };

  const calculateAllowance = (options = {}) => {
    const { skipScroll = false, focusOnButton = false } = options;

    // 验证必填项
    // 企业账户模式：公司已发产假期间工资为必填
    // 个人账户模式：员工基本工资和月度个人部分社保公积金合计为必填
    
    if (paymentMethod === '企业账户') {
      // 验证公司已发产假期间工资
      if (!paidWageDuringLeave || paidWageDuringLeave.trim() === '') {
        const input = document.getElementById('paidWageDuringLeave');
        if (input) {
          input.style.border = '2px solid #dc3545';
          input.scrollIntoView({ behavior: 'smooth', block: 'center' });
          input.focus();
          setTimeout(() => {
            input.style.border = '1px solid #ddd';
          }, 3000);
        }
        return;
      }
      
      // 验证公司已发产假期间工资必须大于等于零
      const paidWageValue = parseFloat(paidWageDuringLeave);
      if (isNaN(paidWageValue) || paidWageValue < 0) {
        const input = document.getElementById('paidWageDuringLeave');
        if (input) {
          input.style.border = '2px solid #dc3545';
          input.scrollIntoView({ behavior: 'smooth', block: 'center' });
          input.focus();
          setTimeout(() => {
            input.style.border = '1px solid #ddd';
          }, 3000);
        }
        return;
      }
    } else if (paymentMethod === '个人账户') {
      // 验证需返还计算部分的员工基本工资
      if (!employeeBaseSalary || employeeBaseSalary.trim() === '') {
        const input = document.getElementById('employeeBaseSalary');
        if (input) {
          input.style.border = '2px solid #dc3545';
          input.scrollIntoView({ behavior: 'smooth', block: 'center' });
          input.focus();
          setTimeout(() => {
            input.style.border = '1px solid #ddd';
          }, 3000);
        }
        return;
      }
      
      // 验证员工基本工资必须大于零
      const baseSalaryValue = parseFloat(employeeBaseSalary);
      if (isNaN(baseSalaryValue) || baseSalaryValue <= 0) {
        const input = document.getElementById('employeeBaseSalary');
        if (input) {
          input.style.border = '2px solid #dc3545';
          input.scrollIntoView({ behavior: 'smooth', block: 'center' });
          input.focus();
          setTimeout(() => {
            input.style.border = '1px solid #ddd';
          }, 3000);
        }
        return;
      }
      
      // 验证月度个人部分社保公积金合计
      if (!overridePersonalSSMonthly || overridePersonalSSMonthly.trim() === '') {
        const input = document.getElementById('overridePersonalSSMonthly');
        if (input) {
          input.style.border = '2px solid #dc3545';
          input.scrollIntoView({ behavior: 'smooth', block: 'center' });
          input.focus();
          setTimeout(() => {
            input.style.border = '1px solid #ddd';
          }, 3000);
        }
        return;
      }
      
      // 验证月度个人部分社保公积金合计必须大于零
      const ssMonthlyValue = parseFloat(overridePersonalSSMonthly);
      if (isNaN(ssMonthlyValue) || ssMonthlyValue <= 0) {
        const input = document.getElementById('overridePersonalSSMonthly');
        if (input) {
          input.style.border = '2px solid #dc3545';
          input.scrollIntoView({ behavior: 'smooth', block: 'center' });
          input.focus();
          setTimeout(() => {
            input.style.border = '1px solid #ddd';
          }, 3000);
        }
        return;
      }
    }

    // 参数规范化与覆盖逻辑统一在 buildCalculationArgs() 内处理，避免重复

    try {
      const args = buildCalculationArgs();
      const calculationResult = calculateMaternityAllowance(...args);

      const employeeDisplayName = employeeSearchTerm || employeeName || (selectedEmployee ? selectedEmployee.employeeName : '');

      const breakdown = buildAllowanceBreakdown(calculationResult, {
        deductions,
        paidWageDuringLeave,
        overrideGovernmentPaidAmount,
        overrideGovernmentPaidAmountAutoFilled,
        employeeBasicSalaryInput: employeeBasicSalary,
        refundRules
      });

      // 计算工会费
      const unionFeeData = calculateUnionFee(calculationResult, refundRules, selectedCity);

      setResult({
        ...calculationResult,
        breakdown,
        selectedEmployee,
        employeeDisplayName,
        unionFee: unionFeeData
      });

      // 保存计算结果到localStorage
      const saveCalculationResult = () => {
        try {
          const timestamp = new Date().toISOString();
          const resultWithTimestamp = {
            ...calculationResult,
            breakdown,
            selectedEmployee,
            employeeDisplayName,
            unionFee: unionFeeData,
            calculatedAt: timestamp,
            source: 'individual'
          };

          // 只在有员工姓名时才保存
          if (employeeDisplayName && employeeDisplayName.trim()) {
            const employeeKey = employeeDisplayName.trim();
            localStorage.setItem(`maternityCalculation_${employeeKey}`, JSON.stringify(resultWithTimestamp));
          }
        } catch (error) {
          console.error('保存计算结果失败:', error);
        }
      };
      saveCalculationResult();
      setTimeout(() => {
        if (focusOnButton && calculateButtonRef.current) {
          calculateButtonRef.current.focus();
          calculateButtonRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
          const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
          if (!isIOS) {
            window.scrollBy({ top: -80, left: 0, behavior: 'smooth' });
          }
        } else if (!skipScroll) {
          if (scrollTarget === 'refund' && refundResultRef.current) {
            refundResultRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
          } else if (resultRef.current) {
            resultRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
          }
          setScrollTarget(null);
        }
      }, 0);
    } catch (error) {
      alert('计算失败：' + error.message);
    }
  };

  const reset = () => {
    setEmployeeId('');
    setEmployeeName('');
    setEmployeeSearchTerm('');
    setSelectedEmployee(null);
    setShowEmployeeSuggestions(false);
    setFilteredEmployees([]);
    setEmployeeBasicSalary('');
    setEmployeeBaseSalary('');
    setOverrideGovernmentPaidAmount('');
    setOverridePersonalSSMonthly('');
    setPaidWageDuringLeave('');
    setSalaryBeforeAdjustment('');
    setSalaryAfterAdjustment('');
    setSalaryAdjustmentMonth('');
    setSocialSecurityBeforeAdjustment('');
    setSocialSecurityAfterAdjustment('');
    setSocialSecurityAdjustmentMonth('');
    setDeductions([{ amount: '', note: '' }]);
    setResult(null);
    setUserEditedEndDate(false);
    setIsDifficultBirth(false);
    setIsMiscarriage(false);
    setNumberOfBabies(1);
    setPregnancyPeriod(PREGNANCY_PERIODS.ABOVE_7_MONTHS);
    setDoctorAdviceDays('');
    const today = new Date();
    setStartDate(format(today, 'yyyy-MM-dd'));
    setEndDate('');
    setRefundLeaveStartDate('');
    setRefundLeaveEndDate('');
    setRefundStartDateManuallySet(false);
    setRefundEndDateManuallySet(false);
    setEmployeeBasicSalaryError(false);
    setCompanyAvgSalaryError(false);
    setSocialInsuranceLimitError(false);
    if (selectedCity) {
      applyCitySelection(selectedCity);
    }
  };

  // 减扣项操作
  const handleDeductionChange = (index, field, value) => {
    setDeductions(prev => prev.map((item, i) => i === index ? { ...item, [field]: value } : item));
  };
  const addDeduction = () => setDeductions(prev => [...prev, { amount: '', note: '' }]);
  const removeDeduction = (index) => {
    setDeductions(prev => {
      const newDeductions = prev.filter((_, i) => i !== index);
      // 至少保留一行空行
      return newDeductions.length === 0 ? [{ amount: '', note: '' }] : newDeductions;
    });
  };

  // 导出为PDF
  const exportToPDF = () => {
    if (!result) {
      alert('请先进行计算');
      return;
    }

    const breakdown = result.breakdown || buildAllowanceBreakdown(result, {
      deductions,
      paidWageDuringLeave,
      overrideGovernmentPaidAmount,
      overrideGovernmentPaidAmountAutoFilled,
      employeeBasicSalaryInput: employeeBasicSalary,
      refundRules
    });
    const showGovernmentSection = paymentMethod === '个人账户' && !!breakdown.government;
    const supplementInfo = breakdown.supplement?.details;
    const governmentAmountDisplay = showGovernmentSection ? breakdown.government.formatted : '—';
    const employeeReceivableDisplay = breakdown.employee ? breakdown.employee.formatted : '0.00';
    const adjustedSupplementDisplay = breakdown.supplement ? breakdown.supplement.formattedAdjusted : '0.00';
    const deductionSummaryDisplay = breakdown.supplement
      ? `${formatCurrency(breakdown.supplement.totalDeductions)}（${breakdown.supplement.deductionSummary}）`
      : '0.00（0）';
    const governmentProcess = showGovernmentSection ? breakdown.government.process || '—' : '—';
    const employeeProcess = breakdown.employee?.process || '—';
    const supplementProcess = breakdown.supplement?.process || '—';
    
    // 获取产假日历详情
    const getLeaveCalendarDetails = () => {
      if (!result || !result.leaveCalendar) return null;
      
      const { leaveCalendar } = result;
      const details = [];
      
      // 添加产假基本信息
      details.push(`产假总天数: ${leaveCalendar.totalDays}天`);
      details.push(`开始日期: ${leaveCalendar.startDate}`);
      details.push(`结束日期: ${leaveCalendar.endDate}`);
      
      // 添加各段假期详情
      if (Array.isArray(leaveCalendar.leaveSegments)) {
        details.push('\n各段假期详情:');
        leaveCalendar.leaveSegments.forEach((segment, index) => {
          details.push(`
${index + 1}. ${segment.type || '产假'}:`);
          details.push(`   - 开始日期: ${segment.startDate}`);
          details.push(`   - 结束日期: ${segment.endDate}`);
          details.push(`   - 天数: ${segment.days}天`);
          if (segment.extendedDays > 0) {
            details.push(`   - 顺延天数: ${segment.extendedDays}天`);
            details.push(`   - 顺延原因: ${segment.extensionReason || '遇法定假日顺延'}`);
          }
          if (segment.legalHolidays && segment.legalHolidays.length > 0) {
            const holidayText = segment.legalHolidays
              .map(h => `${h.date} ${h.name || ''}`.trim())
              .join('、');
            details.push(`   - 遇到的法定假日: ${holidayText}`);
          }
        });
      }
      
      // 添加工作日和休息日统计
      if (leaveCalendar.workdayCount !== undefined && leaveCalendar.weekendCount !== undefined && leaveCalendar.holidayCount !== undefined) {
        details.push(`
工作日/休息日统计:`);
        details.push(`   - 工作日: ${leaveCalendar.workdayCount}天`);
        details.push(`   - 周末: ${leaveCalendar.weekendCount}天`);
        details.push(`   - 法定假日: ${leaveCalendar.holidayCount}天`);
      }
      
      return details.join('\n');
    };
    
    // 获取工资计算明细
    const getSalaryCalculationDetails = () => {
      if (!breakdown) return null;
      
      const details = [];
      
      // 添加政府发放金额明细
      if (showGovernmentSection && breakdown.government) {
        details.push('政府发放金额明细:');
        details.push(`   - 基础工资: ${formatCurrency(breakdown.government.baseSalary || 0)}`);
        details.push(`   - 津贴天数: ${breakdown.government.eligibleDays || 0}天`);
        details.push(`   - 日津贴标准: ${formatCurrency(breakdown.government.dailyRate || 0)}`);
        details.push(`   - 总金额: ${formatCurrency(breakdown.government.amount || 0)}`);
      }
      
      // 添加员工应领取金额明细
      if (breakdown.employee) {
        details.push('\n员工应领取金额明细:');
        details.push(`   - 基础工资: ${formatCurrency(breakdown.employee.baseSalary || 0)}`);
        details.push(`   - 津贴天数: ${breakdown.employee.eligibleDays || 0}天`);
        details.push(`   - 日津贴标准: ${formatCurrency(breakdown.employee.dailyRate || 0)}`);
        details.push(`   - 总金额: ${formatCurrency(breakdown.employee.amount || 0)}`);
      }
      
      // 添加补差金额明细
      if (breakdown.supplement) {
        details.push('\n补差金额明细:');
        details.push(`   - 补差基数: ${formatCurrency(breakdown.supplement.baseAmount || 0)}`);
        details.push(`   - 减扣总额: ${formatCurrency(breakdown.supplement.totalDeductions || 0)}`);
        if (breakdown.supplement.deductions && breakdown.supplement.deductions.length > 0) {
          details.push('   减扣明细:');
          breakdown.supplement.deductions.forEach(deduction => {
            details.push(`     - ${deduction.reason}: ${formatCurrency(deduction.amount)}`);
          });
        }
        details.push(`   - 实际补差金额: ${formatCurrency(breakdown.supplement.adjustedAmount || 0)}`);
      }
      
      return details.join('\n');
    };
    const appliedPolicySummary = formatAppliedRulesSummaryLine(result.appliedRules, result.city || selectedCity, result.totalMaternityDays);
    const formatDaysForExport = (value) => {
      const num = safeNumber(value);
      if (!Number.isFinite(num)) return '0';
      return Number.isInteger(num) ? `${num}` : num.toFixed(2);
    };
    const extensionDetails = Array.isArray(result.appliedRules)
      ? result.appliedRules
          .filter((r) => r && r.isExtendable && safeNumber(r.extendedDays) > 0)
          .map((r) => {
            const baseDays = Math.max(0, safeNumber(r.days));
            let originalEnd = '';
            if (r.extendableStartDate) {
              const start = new Date(r.extendableStartDate);
              if (!Number.isNaN(start.getTime()) && baseDays > 0) {
                const end = new Date(start);
                end.setDate(end.getDate() + baseDays - 1);
                originalEnd = end.toISOString().split('T')[0];
              }
            }
            const header = r.type && r.type.includes('晚育假/生育假/奖励假')
              ? '晚育假/生育假/奖励假 遇法定假日顺延详情：'
              : `${r.type || '顺延假期'} 遇法定假日顺延详情：`;
            const detailLines = [
              header,
              `开始日期：${r.extendableStartDate || '-'}`,
              `原定结束：${originalEnd || '-'}；实际结束：${r.extendableEndDate || '-'}（顺延${formatDaysForExport(r.extendedDays)}天）`
            ];
            if (Array.isArray(r.legalHolidays) && r.legalHolidays.length > 0) {
              const holidayText = r.legalHolidays
                .map((h) => {
                  if (!h) return '';
                  if (typeof h === 'string') return h;
                  const date = h.date || '';
                  const name = h.name ? `(${h.name})` : '';
                  return `${date}${name}`;
                })
                .filter(Boolean)
                .join('、');
              if (holidayText) {
                detailLines.push(`遇到的法定假日：${holidayText}`);
              }
            }
            return detailLines.join('\n');
          })
      : [];
    const appliedPolicyText = extensionDetails.length > 0
      ? `${appliedPolicySummary}\n\n${extensionDetails.join('\n\n')}`
      : appliedPolicySummary;
    const maternityPolicyText = result.maternityPolicy
      ? `${result.city || '未选择城市'} - ${result.maternityPolicy}`
      : `${result.city || '未选择城市'} - 未配置津贴规则产假政策`;
    const allowancePolicyText = result.allowancePolicy && result.allowancePolicy.trim()
      ? `${result.city || '未选择城市'} - ${result.allowancePolicy}`
      : `${result.city || '未选择城市'} - 未配置津贴补差政策`;

    const filename = `产假津贴计算_${result.employeeDisplayName || '未命名'}_${format(new Date(), 'yyyyMMdd')}.pdf`;

    // 需返还导出字段
    const supplementInfoForPdf = breakdown && breakdown.supplement ? breakdown.supplement.details : null;
    const refundAmountDisplay = paymentMethod === '个人账户' && supplementInfoForPdf
      ? formatCurrency(supplementInfoForPdf.totalDeductions || 0)
      : '—';
    const refundCalcProcess = paymentMethod === '个人账户' && supplementInfoForPdf
      ? (supplementInfoForPdf.deductionFormula || '—')
      : '—';
    
    // 使用与Excel一致的格式化器，生成PDF中的计算过程
    const pdfFormatterOptions = {
      monthlySS: parseFloat(overridePersonalSSMonthly) || 0,
      monthlyUnionFee: result.unionFee?.monthlyFee || 50,
      salaryBeforeAdjustment,
      salaryAfterAdjustment,
      salaryAdjustmentMonth,
      formatCurrency
    };
    const pdfStartMonthProcess = formatStartMonthProcess(result, pdfFormatterOptions);
    const pdfEndMonthProcess = formatEndMonthProcess(result, pdfFormatterOptions);
    const pdfPersonalSSProcess = formatPersonalSSProcess(result, breakdown, formatCurrency);
    
    // 准备导出数据
    const exportData = {
      filename,
      employeeName:
        result.employeeDisplayName
        || (result.selectedEmployee && result.selectedEmployee.employeeName)
        || '',
      city: selectedCity || '',
      startDate: result.calculatedPeriod ? result.calculatedPeriod.startDate : startDate,
      endDate: result.calculatedPeriod ? result.calculatedPeriod.endDate : endDate,
      totalMaternityDays: result.totalMaternityDays,
      totalAllowanceEligibleDays: Number.isFinite(result.totalAllowanceEligibleDays) ? result.totalAllowanceEligibleDays : '—',
      appliedPolicyHtml: appliedPolicyText,
      paymentMethod,
      governmentAmountDisplay,
      governmentProcess,
      employeeReceivableDisplay,
      employeeProcess,
      adjustedSupplementDisplay,
      deductionSummaryDisplay,
      supplementProcess,
      refundAmountDisplay,
      refundCalcProcess,
      maternityPolicyText,
      allowancePolicyText,
      showGovernmentSection,
      // 添加产假期间工资和社保信息（带是否需返还标注）
      startMonthProratedWage: (() => {
        if (result.startMonthProratedWage == null || !(result.startMonthMeta?.actualWorkingDays > 0)) return '—';
        const monthlySS = parseFloat(overridePersonalSSMonthly) || 0;
        const monthlyUnionFee = result.unionFee?.monthlyFee || 50;
        const baseWage = result.startMonthProratedWage;
        const finalWage = baseWage - monthlySS - monthlyUnionFee;
        const suffix = (monthlySS > 0 || monthlyUnionFee > 0)
          ? (finalWage < 0 ? '(工资不够减 需要返还)' : '(无需返还，工资够扣除)')
          : '';
        return `${formatCurrency(baseWage)}${suffix}`;
      })(),
      startMonthProcess: pdfStartMonthProcess || '—',
      endMonthProratedWage: (() => {
        if (result.endMonthProratedWage == null || !(result.endMonthMeta?.actualWorkingDays > 0)) return '—';
        const monthlySS = parseFloat(overridePersonalSSMonthly) || 0;
        const monthlyUnionFee = result.unionFee?.monthlyFee || 50;
        const baseWage = result.endMonthProratedWage;
        const finalWage = baseWage - monthlySS - monthlyUnionFee;
        const suffix = (monthlySS > 0 || monthlyUnionFee > 0)
          ? (finalWage < 0 ? '(工资不够减 需要返还)' : '(无需返还，工资够扣除)')
          : '';
        return `${formatCurrency(baseWage)}${suffix}`;
      })(),
      endMonthProcess: pdfEndMonthProcess || '—',
      personalSocialSecurity: result.personalSocialSecurity ? formatCurrency(result.personalSocialSecurity) : '—',
      personalSSProcess: pdfPersonalSSProcess || '—',
      unionFee: result.unionFee ? formatCurrency(result.unionFee.total) : '—',
      unionFeeProcess: result.unionFee?.process || '—',
      // 新增字段
      leaveCalendarDetails: getLeaveCalendarDetails(),
      salaryCalculationDetails: getSalaryCalculationDetails()
    };
    
    // 导出PDF
    exportAllowancePdf(exportData);
  };

  // 导出为Excel
  const exportToExcel = () => {
    if (!result) {
      alert('请先进行计算');
      return;
    }

    const breakdown = result.breakdown || buildAllowanceBreakdown(result, {
      deductions,
      paidWageDuringLeave,
      overrideGovernmentPaidAmount,
      overrideGovernmentPaidAmountAutoFilled,
      employeeBasicSalaryInput: employeeBasicSalary
    });
    const showGovernmentSection = paymentMethod === '个人账户' && !!breakdown.government;
    const supplementInfo = breakdown.supplement?.details;
    
    // 使用新的格式化模块，传入必要的参数
    const formatterOptions = {
      monthlySS: parseFloat(overridePersonalSSMonthly) || 0,
      monthlyUnionFee: result.unionFee?.monthlyFee || 50,
      salaryBeforeAdjustment,
      salaryAfterAdjustment,
      salaryAdjustmentMonth,
      formatCurrency
    };
    
    const personalSSProcess = formatPersonalSSProcess(result, breakdown, formatCurrency);
    const personalSSAmountDisplay = formatCurrency(result.personalSocialSecurity);
    const governmentAmountDisplay = showGovernmentSection ? breakdown.government.formatted : '—';
    const employeeReceivableDisplay = breakdown.employee ? breakdown.employee.formatted : '0.00';
    const adjustedSupplementDisplay = breakdown.supplement ? breakdown.supplement.formattedAdjusted : '0.00';
    const deductionSummaryDisplay = breakdown.supplement
      ? `${formatCurrency(breakdown.supplement.totalDeductions)}（${breakdown.supplement.deductionSummary}）`
      : '0.00（0）';
    const governmentProcess = showGovernmentSection ? breakdown.government.process || '—' : '—';
    const employeeProcess = breakdown.employee?.process || '—';
    const supplementProcess = breakdown.supplement?.process || '—';
    const startMonthProcess = formatStartMonthProcess(result, formatterOptions);
    const endMonthProcess = formatEndMonthProcess(result, formatterOptions);
    const startMonthAmountDisplay = result.startMonthProratedWage != null ? formatCurrency(result.startMonthProratedWage) : null;
    const endMonthAmountDisplay = result.endMonthProratedWage != null ? formatCurrency(result.endMonthProratedWage) : null;
    const appliedRulesText = Array.isArray(result.appliedRules) && result.appliedRules.length > 0
      ? `${result.city || '未选择城市'} - ${result.appliedRules.map(r => {
          const ruleText = `${r.type} ${r.days}天`;
          return r.note ? `${ruleText}(${r.note})` : ruleText;
        }).join('，')}`
      : `${result.city || '未选择城市'} - 按城市默认规则计算`;
    const maternityPolicyText = result.maternityPolicy
      ? `${result.city || '未选择城市'} - ${result.maternityPolicy}`
      : `${result.city || '未选择城市'} - 未配置津贴规则产假政策`;
    const allowancePolicyText = result.allowancePolicy && result.allowancePolicy.trim()
      ? `${result.city || '未选择城市'} - ${result.allowancePolicy}`
      : `${result.city || '未选择城市'} - 未配置津贴补差政策`;

    // 基本信息
    const basicInfoData = [
      ['基本信息', ''],
      ['员工姓名', result.employeeDisplayName || (result.selectedEmployee && result.selectedEmployee.employeeName) || ''],
      ['选择城市', selectedCity || ''],
      ['产假开始日期', result.calculatedPeriod ? result.calculatedPeriod.startDate : startDate],
      ['产假结束日期', result.calculatedPeriod ? result.calculatedPeriod.endDate : endDate],
      ['享受产假天数', (() => {
        const extendedRule = Array.isArray(result.appliedRules) 
          ? result.appliedRules.find(r => r.isExtendable && r.extendedDays > 0)
          : null;
        if (extendedRule && extendedRule.extendedDays > 0) {
          return `${result.totalMaternityDays} 天（遇法定假日顺延${extendedRule.extendedDays}天）`;
        }
        return `${result.totalMaternityDays} 天`;
      })()],
      ['享受产假津贴天数', Number.isFinite(result.totalAllowanceEligibleDays)
        ? `${result.totalAllowanceEligibleDays} 天`
        : '—'],
      ['津贴发放方式', paymentMethod],
      ['', ''],
    ];

    // 计算结果
    const calculationData = [
      ['计算结果', ''],
      ['员工应领取金额', employeeReceivableDisplay],
      ['员工应领取计算过程', employeeProcess],
      ['补差金额', adjustedSupplementDisplay],
      ['补差减扣明细', deductionSummaryDisplay],
      ['补差计算过程', supplementProcess],
    ];

    // 需返还信息（与结果卡片一致，仅个人账户导出）
    if (paymentMethod === '个人账户' && supplementInfo) {
      calculationData.push(['需返还', formatCurrency(supplementInfo.totalDeductions || 0)]);
      calculationData.push(['需返还计算过程', supplementInfo.deductionFormula || '—']);
    }

    if (showGovernmentSection) {
      calculationData.splice(1, 0, ['政府发放计算过程', governmentProcess]);
      calculationData.splice(1, 0, ['政府发放金额', governmentAmountDisplay]);
    }

    // 如果是个人账户，添加首尾月工资和社保
    const hasStartMonthWage = result.startMonthProratedWage != null && result.startMonthMeta?.actualWorkingDays > 0;
    const hasEndMonthWage = result.endMonthProratedWage != null && result.endMonthMeta?.actualWorkingDays > 0;
    if (paymentMethod === '个人账户' && (hasStartMonthWage || hasEndMonthWage)) {
      calculationData.push(['', '']);
      calculationData.push(['个人账户相关信息', '']);
      if (hasStartMonthWage) {
        calculationData.push(['产假首月应发工资', startMonthAmountDisplay]);
        calculationData.push(['产假首月计算过程', startMonthProcess]);
      }
      if (hasEndMonthWage) {
        calculationData.push(['产假结束月应发工资', endMonthAmountDisplay]);
        calculationData.push(['产假结束月计算过程', endMonthProcess]);
      }
      calculationData.push(['产假期间个人社保公积金合计', personalSSAmountDisplay]);
      calculationData.push(['个人社保计算过程', personalSSProcess]);
      
      // 添加工会费信息
      if (result.unionFee && result.unionFee.total > 0) {
        calculationData.push(['返还工会费合计', formatCurrency(result.unionFee.total)]);
        calculationData.push(['工会费计算过程', result.unionFee.process]);
      }
    }

    // 应用政策
    const policyData = [
      ['', ''],
      ['应用政策', ''],
      ['规则明细', appliedRulesText],
      ['产假政策', result.maternityPolicy || '未配置产假政策'],
      ['津贴补差政策', result.allowancePolicy || '未配置津贴补差政策'],
    ];

    // 合并所有数据
    const fileName = `产假津贴计算_${result.employeeDisplayName || '未命名'}_${format(new Date(), 'yyyyMMdd')}.xlsx`;

    exportAllowanceExcel({
      filename: fileName,
      basicInfoData,
      calculationData,
      policyData
    });
  };

  return (
    <div className="allowance-calculator">
      <TabHeader
        icon="💖"
        title="产假津贴计算"
        subtitle="根据城市规则、员工信息和产假天数自动计算产假津贴补差，包含完整的产假周期计算"
      />

      {/* 第一排：员工搜索、开始日期 */}
      <div className="grid-3" style={{ marginBottom: '24px' }}>
        <div className="form-group inline-field">
          <label htmlFor="employeeSearch" className="label-wide label-inline">员工姓名</label>
          <div className="field-control field-fluid" style={{ position: 'relative' }}>
            <input
              type="text"
              id="employeeSearch"
              value={employeeSearchTerm}
              onChange={(e) => handleUnifiedEmployeeSearch(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && filteredEmployees.length > 0) {
                  const firstEmployee = filteredEmployees[0];
                  selectEmployeeFromSuggestion(firstEmployee);
                }
              }}
              placeholder="输入员工工号或姓名进行搜索"
              readOnly={userRole === 'employee'}
              style={{
                width: '100%',
                borderColor: filteredEmployees.length > 0 && !selectedEmployee ? '#dc3545' : '#ced4da',
                backgroundColor: userRole === 'employee' ? '#e9ecef' : '#fff',
                cursor: userRole === 'employee' ? 'not-allowed' : 'text'
              }}
            />
            {showEmployeeSuggestions && filteredEmployees.length > 0 && (
              <div style={{
                position: 'absolute',
                top: '100%',
                left: 0,
                right: 0,
                backgroundColor: 'white',
                border: '1px solid #ccc',
                borderRadius: '4px',
                maxHeight: '200px',
                overflowY: 'auto',
                zIndex: 1000,
                boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
              }}>
                {filteredEmployees.map(emp => (
                  <div
                    key={emp.employeeId}
                    onClick={() => selectEmployeeFromSuggestion(emp)}
                    style={{ padding: '8px 12px', cursor: 'pointer', borderBottom: '1px solid #eee' }}
                    onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#f5f5f5'}
                    onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'white'}
                  >
                    <div style={{ fontWeight: 'bold' }}>{emp.employeeName}</div>
                    <div style={{ fontSize: '12px', color: '#666' }}>
                      {emp.city} | 编号{emp.employeeId}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="form-group inline-field">
          <label htmlFor="startDate" className="label-wide label-inline">产假开始日期 *</label>
          <div className="field-control field-fixed">
            <input
              type="date"
              id="startDate"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              style={{ fontSize: '16px', padding: '12px', width: '100%' }}
            />
          </div>
        </div>
      </div>

      {/* 第二排：选择城市、结束日期 */}
      <div className="grid-3" style={{ marginBottom: '16px' }}>
        <div className="form-group inline-field">
          <label htmlFor="selectedCity" className="label-wide label-inline">选择城市</label>
          <div className="field-control field-fixed">
            <select
              id="selectedCity"
              value={selectedCity}
              onChange={(e) => {
                setSelectedCity(e.target.value);
                setCitySetByEmployee(false);
              }}
              disabled={userRole === 'employee'}
              style={{
                backgroundColor: userRole === 'employee' ? '#e9ecef' : '#fff',
                cursor: userRole === 'employee' ? 'not-allowed' : 'pointer'
              }}
            >
              {displayCities.map(city => (
                <option key={city} value={city}>{city}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="form-group inline-field">
          <label htmlFor="endDate" className="label-wide label-inline">产假结束日期</label>
          <div className="field-control field-fixed">
            <input
              type="date"
              id="endDate"
              value={endDate}
              readOnly
              onFocus={(e) => e.target.blur()}
              style={{
                fontSize: '16px',
                padding: '12px',
                width: '100%',
                color: '#1976d2',
                fontWeight: 600,
                backgroundColor: '#f5f5f5'
              }}
            />
          </div>
        </div>
      </div>

      {/* 新增：公司平均工资、社保三倍上限 */}
      <div className="grid-3" style={{ marginBottom: '16px' }}>
        <div className="form-group inline-field">
          <label htmlFor="companyAvgSalary" className="label-wide label-inline">{companyAvgSalaryLabel}</label>
          <div className="field-control field-fixed">
            <input
              type="number"
              id="companyAvgSalary"
              value={companyAvgSalary}
              onChange={(e) => {
                setCompanyAvgSalary(e.target.value);
                setCompanyAvgSalaryAutoFilled(false);
              }}
              placeholder="从津贴规则自动填充"
              min="0"
              step="0.01"
              style={{
                backgroundColor: companyAvgSalaryAutoFilled ? '#e7f3ff' : '#fff'
              }}
            />
          </div>
        </div>

        <div className="form-group inline-field">
          <label htmlFor="socialInsuranceLimit" className="label-wide label-inline">社保三倍上限</label>
          <div className="field-control field-fixed">
            <input
              type="number"
              id="socialInsuranceLimit"
              value={socialInsuranceLimit}
              onChange={(e) => {
                setSocialInsuranceLimit(e.target.value);
                setSocialInsuranceLimitAutoFilled(false);
              }}
              placeholder="社平工资×3"
              min="0"
              step="0.01"
              style={{
                backgroundColor: socialInsuranceLimitAutoFilled ? '#e7f3ff' : '#fff'
              }}
            />
          </div>
        </div>
      </div>

      {/* 第三排：员工产前12月平均工资 政府发放金额/公司已发产假期间工资 */}

      <div className="grid-3" style={{ marginBottom: '24px' }}>
        <div className="form-group inline-field">
          <label htmlFor="employeeBasicSalary" className="label-wide label-inline">员工产前12月平均工资 *</label>
          <div className="field-control field-fixed">
            <input
              type="number"
              id="employeeBasicSalary"
              value={employeeBasicSalary}
              onChange={(e) => {
                setEmployeeBasicSalary(e.target.value);
                setEmployeeBasicSalaryAutoFilled(false);
                if (employeeBasicSalaryError && e.target.value) {
                  setEmployeeBasicSalaryError(false);
                }
              }}
              placeholder="大于单位平均工资需填写"
              min="0"
              step="0.01"
              style={{
                backgroundColor: employeeBasicSalaryAutoFilled ? '#e7f3ff' : '#fff',
                borderColor: employeeBasicSalaryError ? '#dc3545' : undefined,
                boxShadow: employeeBasicSalaryError ? '0 0 0 2px rgba(220,53,69,0.2)' : undefined
              }}
            />
          </div>
        </div>
        {paymentMethod === '个人账户' ? (
          <div className="form-group inline-field">
            <label htmlFor="overrideGovernmentPaidAmount" className="label-wide label-inline">政府发放金额</label>
            <div className="field-control field-fixed">
              <input
                type="number"
                id="overrideGovernmentPaidAmount"
                value={overrideGovernmentPaidAmount}
                onChange={(e) => {
                  setOverrideGovernmentPaidAmount(e.target.value);
                  setOverrideGovernmentPaidAmountAutoFilled(false);
                }}
                placeholder="自动计算，可手工修改"
                min="0"
                step="0.01"
                style={{
                  backgroundColor: overrideGovernmentPaidAmountAutoFilled ? '#e7f3ff' : '#fff'
                }}
              />
            </div>
          </div>
        ) : (
          <div className="form-group inline-field">
            <label htmlFor="paidWageDuringLeave" className="label-wide label-inline">公司已发产假期间工资 *</label>
            <div className="field-control field-fixed">
              <input
                type="number"
                id="paidWageDuringLeave"
                value={paidWageDuringLeave}
                onChange={(e) => setPaidWageDuringLeave(e.target.value)}
                placeholder="津贴发放方式为企业时，HR应填写"
                min="0"
                step="0.01"
              />
            </div>
          </div>
        )}
        {/* 保留隐藏字段以确保业务逻辑中始终有值 */}
        {paymentMethod === '个人账户' ? (
          <input type="hidden" value={paidWageDuringLeave} readOnly />
        ) : (
          <input type="hidden" value={overrideGovernmentPaidAmount} readOnly />
        )}
      </div>


      {/* 第四排：生产情况，生育胎数 */}
      <div className="grid-3" style={{ marginBottom: '24px', gap: '12px' }}>
        <div className="form-group inline-field">
          <label htmlFor="productionConditions" className="label-wide label-inline">生产情况</label>
          <div
            className="field-control field-fixed"
            style={{ position: 'relative' }}
            ref={conditionDropdownRef}
          >
            <input
              type="text"
              id="productionConditions"
              value={productionConditionSummary}
              readOnly
              onMouseDown={(e) => {
                e.stopPropagation();
                setShowConditionDropdown(prev => !prev);
              }}
              style={{ cursor: 'pointer', backgroundColor: '#fff', width: '100%', paddingRight: '28px' }}
            />
            <span style={{ position: 'absolute', right: '10px', color: '#999', pointerEvents: 'none' }}>▾</span>
            {showConditionDropdown && (
              <div
                style={{
                  position: 'absolute',
                  top: '50px',
                  left: 0,
                  zIndex: 1000,
                  backgroundColor: '#fff',
                  border: '1px solid #ced4da',
                  borderRadius: '6px',
                  padding: '12px',
                  boxShadow: '0 8px 16px rgba(0,0,0,0.1)',
                  minWidth: '240px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '8px'
                }}
              >
                {selectedCity === '广州' ? (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <input
                        type="radio"
                        name="guangzhouDifficultOption"
                        value="none"
                        checked={!isDifficultBirth && !meetsSupplementalDifficultBirth && !isMiscarriage}
                        onChange={() => {
                          setIsDifficultBirth(false);
                          setMeetsSupplementalDifficultBirth(false);
                          setIsMiscarriage(false);
                          setPregnancyPeriod(PREGNANCY_PERIODS.ABOVE_7_MONTHS);
                        }}
                      />
                      <span>不选择</span>
                    </label>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <input
                        type="radio"
                        name="guangzhouDifficultOption"
                        value="normal"
                        checked={isDifficultBirth && !meetsSupplementalDifficultBirth}
                        onChange={() => {
                          setIsDifficultBirth(true);
                          setMeetsSupplementalDifficultBirth(false);
                          setIsMiscarriage(false);
                          setPregnancyPeriod(PREGNANCY_PERIODS.ABOVE_7_MONTHS);
                        }}
                      />
                      <span>难产（吸引产、钳产、臀位牵引产）</span>
                    </label>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <input
                        type="radio"
                        name="guangzhouDifficultOption"
                        value="supplement"
                        checked={meetsSupplementalDifficultBirth}
                        onChange={() => {
                          setMeetsSupplementalDifficultBirth(true);
                          setIsDifficultBirth(false);
                          setIsMiscarriage(false);
                          setPregnancyPeriod(PREGNANCY_PERIODS.ABOVE_7_MONTHS);
                        }}
                      />
                      <span>难产（剖腹产、会阴Ⅲ度破裂）</span>
                    </label>
                  </div>
                ) : (
                  <label style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <input
                      type="checkbox"
                      checked={isDifficultBirth}
                      onChange={(e) => {
                        const checked = e.target.checked;
                        setIsDifficultBirth(checked);
                        if (checked) {
                          setIsMiscarriage(false);
                          setPregnancyPeriod(PREGNANCY_PERIODS.ABOVE_7_MONTHS);
                        }
                      }}
                    />
                    <span>难产</span>
                  </label>
                )}
                {selectedCity === '绍兴' && (
                  <label style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <input
                      type="checkbox"
                      checked={isSecondThirdChild}
                      onChange={(e) => {
                        const checked = e.target.checked;
                        setIsSecondThirdChild(checked);
                        if (checked) {
                          setIsMiscarriage(false);
                          setPregnancyPeriod(PREGNANCY_PERIODS.ABOVE_7_MONTHS);
                        }
                      }}
                    />
                    <span>生育二孩、三孩（仅绍兴）</span>
                  </label>
                )}
                <label style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <input
                    type="checkbox"
                    checked={isMiscarriage}
                    onChange={(e) => {
                      const checked = e.target.checked;
                      setIsMiscarriage(checked);
                      if (checked) {
                        setIsDifficultBirth(false);
                        setMeetsSupplementalDifficultBirth(false);
                        setIsSecondThirdChild(false);
                        setPregnancyPeriod(PREGNANCY_PERIODS.BETWEEN_4_7_MONTHS);
                      } else {
                        setPregnancyPeriod(PREGNANCY_PERIODS.ABOVE_7_MONTHS);
                      }
                    }}
                  />
                  <span>流产</span>
                </label>
                <button
                  type="button"
                  className="btn"
                  style={{ alignSelf: 'flex-end', padding: '6px 12px', fontSize: '12px' }}
                  onClick={() => setShowConditionDropdown(false)}
                >
                  完成
                </button>
              </div>
            )}
          </div>
        </div>
        <div className="form-group inline-field">
          {isMiscarriage ? (
            <>
              <label htmlFor="pregnancyPeriod" className="label-wide label-inline">怀孕时间段</label>
              <div className="field-control field-fixed">
                <select
                  id="pregnancyPeriod"
                  value={isMiscarriage ? pregnancyPeriod : ''}
                  onChange={(e) => setPregnancyPeriod(e.target.value)}
                  disabled={!isMiscarriage}
                >
                  {!isMiscarriage && <option value="">请选择（仅流产可选）</option>}
                  {isMiscarriage && miscarriageOptions.length === 0 && <option value="">暂无数据</option>}
                  {isMiscarriage && miscarriageOptions.map(option => (
                    <option key={option.value} value={option.value}>
                      {option.label} ({option.days}天)
                    </option>
                  ))}
                </select>
              </div>
            </>
          ) : (
            <>
              <label htmlFor="numberOfBabies" className="label-wide label-inline">生育胎数</label>
              <div className="field-control field-fixed">
                <input
                  type="number"
                  id="numberOfBabies"
                  value={numberOfBabies}
                  onChange={(e) => setNumberOfBabies(parseInt(e.target.value) || 1)}
                  min="1"
                  max="5"
                  style={{ textAlign: 'center' }}
                />
              </div>
            </>
          )}
        </div>
      </div>

            {isMiscarriage && showDoctorAdviceInput && (
        <div className="grid-3" style={{ marginBottom: '24px', gap: '12px' }}>
          <div className="form-group inline-field">
            <label htmlFor="doctorAdviceDays" className="label-wide label-inline">流产医嘱天数</label>
            <div className="field-control field-fixed">
              <input
                type="number"
                id="doctorAdviceDays"
                value={doctorAdviceDays}
                onChange={(e) => setDoctorAdviceDays(e.target.value)}
                onBlur={() => {
                  if (doctorAdviceDays === '') return;
                  const n = Number(doctorAdviceDays);
                  if (Number.isNaN(n)) {
                    setDoctorAdviceDays('');
                    return;
                  }
                  const clamped = Math.max(15, Math.min(30, Math.round(n)));
                  if (String(clamped) !== doctorAdviceDays) {
                    setDoctorAdviceDays(String(clamped));
                  }
                }}
                min="15"
                max="30"
                placeholder="仅医嘱超过15天时填写"
                style={{ width: '100%' }}
              />
            </div>
          </div>
          <div className="form-group inline-field" />
          <div className="form-group inline-field" />
        </div>
      )}


      {/* 需返还信息 - 仅在津贴发放方式为个人账户时显示 */}
      {paymentMethod === '个人账户' && (
      <div
        className="section-card section-muted"
        style={{
          marginTop: '12px',
          background: 'transparent',
          border: '1px solid rgba(164, 77, 105, 0.2)',
          boxShadow: '0 10px 24px rgba(164, 77, 105, 0.08)'
        }}
      >
        <div style={{ ...themedSectionHeaderStyle, gap: '16px' }}>
          <h3 className="section-title" style={{ margin: 0, color: 'inherit' }}>需返还信息</h3>
        </div>
                      {/* 移动后的请假开始/结束时间控件 */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: '12px', marginTop: '4px', marginBottom: '12px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <label htmlFor="refundLeaveStartDate" style={{ flex: '0 0 auto', minWidth: '120px', fontWeight: '500' }}>请假开始时间</label>
                  <input
                    type="date"
                    id="refundLeaveStartDate"
                    value={refundLeaveStartDate}
                    max={refundLeaveEndDate || undefined}
                    onChange={(e) => {
                      const newStartDate = e.target.value;
                      if (refundLeaveEndDate && newStartDate > refundLeaveEndDate) {
                        alert('请假开始时间不能晚于结束时间');
                        return;
                      }
                      setRefundLeaveStartDate(newStartDate);
                      setRefundStartDateManuallySet(true);
                    }}
                    style={{ flex: '1', padding: '12px 14px', fontSize: '14px', border: '1px solid #ddd', borderRadius: '6px', transition: 'border-color 0.3s, box-shadow 0.3s' }}
                  />
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <label htmlFor="refundLeaveEndDate" style={{ flex: '0 0 auto', minWidth: '120px', fontWeight: '500' }}>请假结束时间</label>
                  <input
                    type="date"
                    id="refundLeaveEndDate"
                    value={refundLeaveEndDate}
                    min={refundLeaveStartDate || undefined}
                    onChange={(e) => {
                      const newEndDate = e.target.value;
                      if (refundLeaveStartDate && newEndDate < refundLeaveStartDate) {
                        alert('请假结束时间不能早于开始时间');
                        return;
                      }
                      setRefundLeaveEndDate(newEndDate);
                      setRefundEndDateManuallySet(true);
                    }}
                    style={{ flex: '1', padding: '12px 14px', fontSize: '14px', border: '1px solid #ddd', borderRadius: '6px', transition: 'border-color 0.3s, box-shadow 0.3s' }}
                  />
                </div>
              </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr auto', gap: '16px', marginTop: '12px', marginBottom: '12px', alignItems: 'end' }}>
          <div className="form-group">
            <label htmlFor="employeeBaseSalary">员工基本工资{paymentMethod === '个人账户' ? ' *' : ''}</label>
            <input
              type="number"
              id="employeeBaseSalary"
              value={employeeBaseSalary}
              onChange={(e) => {
                const value = e.target.value;
                setEmployeeBaseSalary(value);
                setEmployeeBaseSalaryAutoFilled(false);
                setSalaryBeforeAdjustment(value);
                setSalaryAfterAdjustment(value);
              }}
              placeholder="产假首、尾月工资基数"
              min="0"
              step="0.01"
              style={{
                backgroundColor: employeeBaseSalaryAutoFilled ? '#e7f3ff' : '#fff'
              }}
            />
          </div>
          <div className="form-group">
            <label htmlFor="overridePersonalSSMonthly">月度个人部分社保公积金合计{paymentMethod === '个人账户' ? ' *' : ''}</label>
            <input
              type="number"
              id="overridePersonalSSMonthly"
              value={overridePersonalSSMonthly}
              onChange={(e) => {
                const value = e.target.value;
                setOverridePersonalSSMonthly(value);
                setOverridePersonalSSMonthlyAutoFilled(false);
                setSocialSecurityBeforeAdjustment(value);
                setSocialSecurityAfterAdjustment(value);
              }}
              placeholder="月个人部分缴费金额"
              min="0"
              step="0.01"
              style={{
                backgroundColor: overridePersonalSSMonthlyAutoFilled ? '#e7f3ff' : '#fff'
              }}
            />
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 'bold', color: '#495057', fontSize: '16px' }}>
            <span>工资社保调整</span>
            <button
              onClick={(e) => {
                e.preventDefault();
                setShowSalaryAdjustments(prev => {
                  const next = !prev;
                  if (next) {
                    setTimeout(() => {
                      const adjustmentSection = document.getElementById('salary-adjustments-section');
                      if (adjustmentSection) {
                        adjustmentSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
                      }
                    }, 50);
                  }
                  return next;
                });
              }}
              style={{
                border: 'none',
                background: 'transparent',
                cursor: 'pointer',
                fontSize: '18px',
                padding: '0 4px',
                display: 'flex',
                alignItems: 'center',
                gap: '2px'
              }}
              title={showSalaryAdjustments ? '隐藏调整' : '显示调整'}
            >
              {showSalaryAdjustments ? '🙈' : '👁️'}
            </button>
          </div>
        </div>
        {showSalaryAdjustments && (
          <>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: '16px', marginTop: '16px', marginBottom: '16px' }}>
              <div className="form-group">
                <label htmlFor="salaryBeforeAdjustment">调整前 员工基本工资</label>
                <input
                  type="number"
                  id="salaryBeforeAdjustment"
                  value={salaryBeforeAdjustment}
                  onChange={(e) => setSalaryBeforeAdjustment(e.target.value)}
                  placeholder="输入调整前工资"
                  min="0"
                  step="0.01"
                />
              </div>
              <div className="form-group">
                <label htmlFor="salaryAfterAdjustment">调整后 员工基本工资</label>
                <input
                  type="number"
                  id="salaryAfterAdjustment"
                  value={salaryAfterAdjustment}
                  onChange={(e) => setSalaryAfterAdjustment(e.target.value)}
                  placeholder="输入调整后工资"
                  min="0"
                  step="0.01"
                />
              </div>
              <div className="form-group">
                <label htmlFor="salaryAdjustmentMonth">工资调整年月</label>
                <input
                  type="month"
                  id="salaryAdjustmentMonth"
                  value={salaryAdjustmentMonth}
                  onChange={(e) => setSalaryAdjustmentMonth(e.target.value)}
                />
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: '16px' }}>
              <div className="form-group">
                <label htmlFor="socialSecurityBeforeAdjustment">调整前 月度个人部分社保公积金合计</label>
                <input
                  type="number"
                  id="socialSecurityBeforeAdjustment"
                  value={socialSecurityBeforeAdjustment}
                  onChange={(e) => setSocialSecurityBeforeAdjustment(e.target.value)}
                  placeholder="输入金额"
                  min="0"
                  step="0.01"
                />
              </div>
              <div className="form-group">
                <label htmlFor="socialSecurityAfterAdjustment">调整后 月度个人部分社保公积金合计</label>
                <input
                  type="number"
                  id="socialSecurityAfterAdjustment"
                  value={socialSecurityAfterAdjustment}
                  onChange={(e) => setSocialSecurityAfterAdjustment(e.target.value)}
                  placeholder="输入金额"
                  min="0"
                  step="0.01"
                />
              </div>
              <div className="form-group">
                <label htmlFor="socialSecurityAdjustmentMonth">社保调整年月</label>
                <input
                  type="month"
                  id="socialSecurityAdjustmentMonth"
                  value={socialSecurityAdjustmentMonth}
                  onChange={(e) => setSocialSecurityAdjustmentMonth(e.target.value)}
                />
              </div>
            </div>
          </>
        )}
      </div>
      )}
      

      <div style={{ display: 'flex', justifyContent: 'center', gap: '12px' }}>
          <button
            className="btn"
            onClick={() => calculateSocialSecurityRefund('top')}
          >
            自动计算
          </button>
        <button
          className="btn"
          onClick={reset}
          style={{ backgroundColor: '#6c757d' }}
        >
          重置
        </button>
      </div>

      {result && (
        <div className="result" ref={resultRef}>
          <div>     </div>
          <div className="section-card" style={{ marginTop: '16px' }}>
            <div style={{ marginBottom: '12px', fontSize: '18px', fontWeight: 'bold', color: '#495057' }}>产假计算结果</div>

            <div style={themedCardContainerStyle}>
              {(result.employeeDisplayName || result.selectedEmployee) && (
                <div className="result-item" style={themedRowStyle}>
                  <span className="result-label">员工姓名：</span>
                  <span className="result-value" style={themedValueStyle}>
                    {result.employeeDisplayName || (result.selectedEmployee && result.selectedEmployee.employeeName)}
                  </span>
                </div>
              )}

              {result.calculatedPeriod && (
                <>
                  <div className="result-item" style={themedRowStyle}>
                    <span className="result-label">产假开始日期：</span>
                    <span className="result-value" style={themedValueStyle}>{result.calculatedPeriod.startDate}</span>
                  </div>
                  <div className="result-item" style={themedRowStyle}>
                    <span className="result-label">产假结束日期：</span>
                    <span className="result-value" style={{ ...themedValueStyle, fontWeight: 700 }}>
                      {result.calculatedPeriod.endDate}{userEditedEndDate ? '（已手动调整）' : ''}
                    </span>
                  </div>
                </>
              )}

              <div className="result-item" style={themedRowStyle}>
                <span className="result-label">享受产假天数：</span>
                <span className="result-value" style={{ ...themedValueStyle, color: '#28a745' }}>
                  {(() => {
                    const extendedRule = Array.isArray(result.appliedRules) 
                      ? result.appliedRules.find(r => r.isExtendable && r.extendedDays > 0)
                      : null;
                    if (extendedRule && extendedRule.extendedDays > 0) {
                      return `${result.totalMaternityDays} 天（遇法定假日顺延${extendedRule.extendedDays}天）`;
                    }
                    return `${result.totalMaternityDays} 天`;
                  })()}
                </span>
              </div>
              {Number.isFinite(result.totalAllowanceEligibleDays) && (
                <div className="result-item" style={themedRowStyle}>
                  <span className="result-label">享受产假津贴天数：</span>
                  <span className="result-value" style={{ ...themedValueStyle, color: '#17a2b8' }}>
                    {result.totalAllowanceEligibleDays} 天
                  </span>
                </div>
              )}

              <div
                className="result-item"
                style={{
                  ...themedRowStyle,
                  borderBottom: 'none',
                  paddingBottom: '8px',
                  alignItems: 'stretch'
                }}
              >
                <div
                  style={{
                    ...themedProcessStyle,
                    border: '1px dashed rgba(164, 77, 105, 0.4)',
                    color: '#5a2d43',
                    padding: '10px 16px',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '10px',
                    width: '100%'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px', flexWrap: 'wrap', justifyContent: 'space-between' }}>
                    <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px', flexWrap: 'wrap', flex: 1 }}>
                      <span className="result-label" style={{ color: '#5a2d43', fontWeight: 600 }}>产假应用政策：</span>
                      <span
                        className="result-value"
                        style={{
                          ...themedProcessValueStyle,
                          color: '#5a2d43',
                          fontWeight: 500,
                          flex: 1,
                          minWidth: '220px',
                          wordBreak: 'break-word'
                        }}
                      >
                        {formatAppliedRulesSummaryLine(result.appliedRules, result.city || selectedCity, result.totalMaternityDays)}
                      </span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'baseline', gap: '4px', whiteSpace: 'nowrap', marginLeft: '12px' }}>
                      <span style={{ color: '#5a2d43', fontWeight: 600 }}>休假日历</span>
                      <button
                        onClick={(e) => {
                          e.preventDefault();
                          setShowLeaveCalendar((prev) => !prev);
                        }}
                        style={{
                          border: 'none',
                          background: 'transparent',
                          cursor: 'pointer',
                          fontSize: '18px',
                          padding: '0 4px',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '2px'
                        }}
                        title={showLeaveCalendar ? '隐藏日历' : '显示日历'}
                      >
                        {showLeaveCalendar ? '🙈' : '👁️'}
                      </button>
                    </div>
                  </div>

                  {Array.isArray(result.appliedRules) && result.appliedRules.some(r => r.isExtendable && r.extendedDays > 0) && (
                    <div style={{ display: 'flex', gap: '8px', alignItems: 'flex-start' }}>
                      <span className="result-label" style={{ color: '#5a2d43', fontWeight: 600, visibility: 'hidden' }}>产假应用政策：</span>
                      <div style={{ ...themedProcessValueStyle, color: '#6d5160', flex: 1 }}>
                        {result.appliedRules
                          .filter(r => r.isExtendable && r.extendedDays > 0)
                          .map((r, idx, extendableRules) => {
                            const originalEnd = (() => {
                              const start = new Date(r.extendableStartDate);
                              const end = new Date(start);
                              end.setDate(start.getDate() + r.days - 1);
                              return end.toISOString().split('T')[0];
                            })();
                            return (
                              <div key={idx} style={{ marginBottom: idx === extendableRules.length - 1 ? 0 : '12px' }}>
                                <div style={{ fontWeight: 500, marginBottom: '6px', color: '#5a2d43' }}>
                                  {r.type} 遇法定假日顺延详情：
                                </div>
                                <div style={{ paddingLeft: '16px' }}>
                                  <div>• 开始日期：{r.extendableStartDate}</div>
                                  <div>• 原定结束：{originalEnd} ；实际结束：{r.extendableEndDate}（顺延{r.extendedDays}天）</div>
                                  {Array.isArray(r.legalHolidays) && r.legalHolidays.length > 0 && (
                                    <div>
                                      • 遇到的法定假日：{r.legalHolidays.map(h => `${h.date}${h.name ? `(${h.name})` : ''}`).join('、')}
                                    </div>
                                  )}
                                </div>
                              </div>
                            );
                          })}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {showLeaveCalendar && (
              <div style={{ marginTop: '16px' }}>
                <LeaveCalendar
                  startDate={startDate}
                  endDate={(() => {
                    if (result.calculatedPeriod && result.calculatedPeriod.endDate) {
                      const match = result.calculatedPeriod.endDate.match(/(\d{4})年(\d{1,2})月(\d{1,2})日/);
                      if (match) {
                        const [, year, month, day] = match;
                        return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
                      }
                    }
                    return endDate || null;
                  })()}
                  totalDays={result.totalMaternityDays}
                />
              </div>
            )}

            {result.maternityPolicy && (
              <div className="result-item" style={{ marginTop: '16px' }}>
                <span className="result-label">产假政策：</span>
                <span
                  className="result-value"
                  style={{ fontSize: '14px', lineHeight: 1.6, whiteSpace: 'pre-wrap', color: '#212529' }}
                >
                  {`${result.city || '未选择城市'} - ${result.maternityPolicy}`}
                </span>
              </div>
            )}
            {!result.maternityPolicy && (
              <div className="result-item" style={{ marginTop: '16px' }}>
                <span className="result-label">产假政策：</span>
                <span className="result-value" style={{ fontSize: '14px', color: '#6c757d' }}>
                  {`${result.city || '未选择城市'} - 未配置津贴规则产假政策`}
                </span>
              </div>
            )}

          </div>


          {/* 社保公积金减扣 - 仅在津贴发放方式为个人账户时显示 */}
          {paymentMethod === '个人账户' && result && (() => {
            // 准备格式化选项和breakdown（用于渲染）
            const breakdown = result.breakdown || buildAllowanceBreakdown(result, {
              deductions,
              paidWageDuringLeave,
              overrideGovernmentPaidAmount,
              overrideGovernmentPaidAmountAutoFilled,
              employeeBasicSalaryInput: employeeBasicSalary,
              refundRules
            });
            
            const formatterOptions = {
              monthlySS: parseFloat(overridePersonalSSMonthly) || 0,
              monthlyUnionFee: result.unionFee?.monthlyFee || 50,
              salaryBeforeAdjustment,
              salaryAfterAdjustment,
              salaryAdjustmentMonth,
              formatCurrency
            };
            
            return (
            <div className="section-card" style={{ marginTop: '16px' }}>
              <div style={{ marginBottom: '12px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px' }}>
                <div style={{ fontSize: '18px', fontWeight: 'bold', color: '#495057' }}>工资、社保公积金、工会费计算结果</div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 'bold', color: '#495057', fontSize: '16px', whiteSpace: 'nowrap' }}>
                  <span>请假日历</span>
                  <button
                    onClick={(e) => {
                      e.preventDefault();
                      setShowRefundLeaveCalendar(prev => !prev);
                    }}
                    style={{
                      border: 'none',
                      background: 'transparent',
                      cursor: 'pointer',
                      fontSize: '18px',
                      padding: '0 4px',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '2px'
                    }}
                    title={showRefundLeaveCalendar ? '隐藏日历' : '显示日历'}
                  >
                    {showRefundLeaveCalendar ? '🙈' : '👁️'}
                  </button>
                </div>
              </div>

              {/* 移动后的请假日历展示 */}
              {refundLeaveStartDate && refundLeaveEndDate && (
                <div style={{ marginTop: '8px', marginBottom: '16px' }}>
                  {showRefundLeaveCalendar && (() => {
                    let calendarEndDate = '';
                    if (refundLeaveEndDate) {
                      try {
                        const parsed = new Date(refundLeaveEndDate);
                        if (!Number.isNaN(parsed.getTime())) {
                          calendarEndDate = format(parsed, 'yyyy-MM-dd');
                        }
                      } catch (e) {
                        console.error('请假结束日期解析失败:', e);
                      }
                    }

                    const startMonthKey = (() => {
                      if (!refundLeaveStartDate) return null;
                      const d = new Date(refundLeaveStartDate);
                      if (Number.isNaN(d.getTime())) return null;
                      return `${d.getFullYear()}-${d.getMonth()}`;
                    })();
                    const endMonthKey = (() => {
                      if (!calendarEndDate) return startMonthKey;
                      const d = new Date(calendarEndDate);
                      if (Number.isNaN(d.getTime())) return startMonthKey;
                      return `${d.getFullYear()}-${d.getMonth()}`;
                    })();
                    const sameMonth = startMonthKey && startMonthKey === endMonthKey;

                    const intermediateMonths = (() => {
                      if (!refundLeaveStartDate || !calendarEndDate) return [];
                      const startDateObj = new Date(refundLeaveStartDate);
                      const endDateObj = new Date(calendarEndDate);
                      if (Number.isNaN(startDateObj.getTime()) || Number.isNaN(endDateObj.getTime())) return [];
                      const months = [];
                      const cursor = new Date(startDateObj.getFullYear(), startDateObj.getMonth() + 1, 1);
                      const endBoundary = new Date(endDateObj.getFullYear(), endDateObj.getMonth(), 1);
                      while (cursor < endBoundary) {
                        months.push(`${cursor.getFullYear()}-${String(cursor.getMonth() + 1).padStart(2, '0')}`);
                        cursor.setMonth(cursor.getMonth() + 1);
                      }
                      // 显式排除结束月（防御性处理）
                      const endMonthStr = `${endDateObj.getFullYear()}-${String(endDateObj.getMonth() + 1).padStart(2, '0')}`;
                      return months.filter(m => m !== endMonthStr);
                    })();
                    const intermediateRows = (() => {
                      if (sameMonth || intermediateMonths.length === 0) return [];
                      const rows = [];
                      for (let i = 0; i < intermediateMonths.length; i += 3) {
                        rows.push(intermediateMonths.slice(i, i + 3));
                      }
                      return rows;
                    })();
                    const showIntermediateLabel = false;

                    return (
                      <div
                        style={{
                          display: 'grid',
                          gridTemplateColumns: sameMonth ? '1fr' : 'repeat(auto-fit, minmax(360px, 1fr))',
                          gap: '8px',
                          alignItems: 'start'
                        }}
                      >
                        <div>
                          <LeaveCalendar
                            startDate={refundLeaveStartDate}
                            endDate={calendarEndDate}
                            visibleMonthsFormatter={(months) => {
                              if (!Array.isArray(months) || months.length === 0) return months;
                              return [months[0]];
                            }}
                            hideLegend
                            containerStyle={{ marginTop: '4px', marginLeft: REFUND_FIELD_LEFT_OFFSET }}
                          />
                        </div>
                        {!sameMonth && (
                          <>
                            {showIntermediateLabel && (
                              <div
                                style={{
                                  alignSelf: 'stretch',
                                  display: 'flex',
                                  flexDirection: 'column',
                                  alignItems: 'flex-start',
                                  justifyContent: 'center',
                                  padding: '8px 12px',
                                  color: '#a44d69',
                                  fontWeight: 600,
                                  fontSize: '14px',
                                  textAlign: 'left',
                                  lineHeight: 1.4,
                                  gap: '2px'
                                }}
                              >
                                {intermediateRows.map((row, rowIndex) => (
                                  <div key={rowIndex}>
                                    {row
                                      .map((month, index) => `${month}${index < row.length - 1 ? '，' : ''}`)
                                      .join(' ')}
                                  </div>
                                ))}
                              </div>
                            )}
                            <div>
                              <LeaveCalendar
                                startDate={refundLeaveStartDate}
                                endDate={calendarEndDate}
                                visibleMonthsFormatter={(months) => {
                                  if (!Array.isArray(months) || months.length === 0) return months;
                                  return [months[months.length - 1]];
                                }}
                                hideLegend
                                containerStyle={{ marginTop: '4px', marginLeft: REFUND_FIELD_LEFT_OFFSET }}
                              />
                            </div>
                          </>
                        )}
                      </div>
                    );
                  })()}
                </div>
              )}
              <div style={themedCardContainerStyle}>
                {result.startMonthProratedWage != null && result.startMonthMeta?.actualWorkingDays > 0 && (() => {
                  const monthlySS = parseFloat(overridePersonalSSMonthly) || 0;
                  const monthlyUnionFee = result.unionFee?.monthlyFee || 50;
                  const baseWage = result.startMonthProratedWage;
                  const finalWage = baseWage - monthlySS - monthlyUnionFee;
                  const isNegative = finalWage < 0;
                  
                  return (
                    <>
                      <div className="result-item" style={{ ...themedRowStyle, marginTop: '4px' }}>
                        <span className="result-label">产假首月应发工资：</span>
                        <span className="result-value" style={{ ...themedValueStyle, color: isNegative ? '#dc3545' : themedValueStyle.color }}>
                          {isNegative ? '-' : ''}{formatCurrency(Math.abs(finalWage))}
                          {(monthlySS > 0 || monthlyUnionFee > 0) && (
                            <span style={{ marginLeft: '8px', color: isNegative ? '#dc3545' : '#28a745' }}>
                              {isNegative ? '(工资不够减 需要返还)' : '(无需返还，工资够扣除)'}
                            </span>
                          )}
                        </span>
                      </div>
                      <div className="result-item calc-process" style={themedProcessStyle}>
                        <span className="result-label">计算过程：</span>
                        <span className="result-value" style={themedProcessValueStyle}>
                          {formatStartMonthProcess(result, formatterOptions)}
                        </span>
                      </div>
                    </>
                  );
                })()}

                {result.endMonthProratedWage != null && result.endMonthMeta?.actualWorkingDays > 0 && (() => {
                  const monthlySS = parseFloat(overridePersonalSSMonthly) || 0;
                  const monthlyUnionFee = result.unionFee?.monthlyFee || 50;
                  const baseWage = result.endMonthProratedWage;
                  const finalWage = baseWage - monthlySS - monthlyUnionFee;
                  const isNegative = finalWage < 0;
                  
                  return (
                    <>
                      <div className="result-item" style={themedRowStyle}>
                        <span className="result-label">产假结束月应发工资：</span>
                        <span className="result-value" style={{ ...themedValueStyle, color: isNegative ? '#dc3545' : themedValueStyle.color }}>
                          {isNegative ? '-' : ''}{formatCurrency(Math.abs(finalWage))}
                          {(monthlySS > 0 || monthlyUnionFee > 0) && (
                            <span style={{ marginLeft: '8px', color: isNegative ? '#dc3545' : '#28a745' }}>
                              {isNegative ? '(工资不够减 需要返还)' : '(无需返还，工资够扣除)'}
                            </span>
                          )}
                        </span>
                      </div>
                      <div className="result-item calc-process" style={themedProcessStyle}>
                        <span className="result-label">计算过程：</span>
                        <span className="result-value" style={themedProcessValueStyle}>
                          {formatEndMonthProcess(result, formatterOptions)}
                        </span>
                      </div>
                    </>
                  );
                })()}

                <div className="result-item" style={themedRowStyle}>
                  <span className="result-label">返还个人部分社保公积金合计：</span>
                  <span className="result-value" style={themedValueStyle}>
                    {result.personalSocialSecurity != null ? formatCurrency(result.personalSocialSecurity) : ''}
                  </span>
                </div>
                <div className="result-item calc-process" style={themedProcessStyle}>
                  <span className="result-label">计算过程：</span>
                  <span className="result-value" style={themedProcessValueStyle}>
                    {result.personalSocialSecurity != null ? formatPersonalSSProcess(result, breakdown, formatCurrency) : ''}
                  </span>
                </div>

                {result.unionFee && result.unionFee.total > 0 && (
                  <>
                    <div className="result-item" style={themedRowStyle}>
                      <span className="result-label">返还工会费合计：</span>
                      <span className="result-value" style={themedValueStyle}>
                        {formatCurrency(result.unionFee.total)}
                      </span>
                    </div>
                    <div className="result-item calc-process" style={themedProcessStyle}>
                      <span className="result-label">计算过程：</span>
                      <span className="result-value" style={themedProcessValueStyle}>
                        {result.unionFee.process}
                      </span>
                    </div>
                  </>
                )}
              </div>
            </div>
            );
          })()}

          {/* 员工需返还明细 - 仅在津贴发放方式为个人账户时显示 */}
          {paymentMethod === '个人账户' && (
            <div
              ref={deductionSectionRef}
              className="section-card section-muted"
              style={{
                marginTop: '12px',
                background: 'transparent',
                border: '1px solid rgba(164, 77, 105, 0.2)',
                boxShadow: '0 10px 24px rgba(164, 77, 105, 0.08)'
              }}
            >
              <div style={{ ...themedSectionHeaderStyle, justifyContent: 'space-between' }}>
                <h4 className="section-title" style={{ margin: 0, color: 'inherit' }}>需返还编辑</h4>
                <div style={{ display: 'flex', gap: '12px' }}>
                  <button
                    className="btn"
                    style={{ backgroundColor: '#6c757d' }}
                    onClick={addDeduction}
                  >
                    + 手动增加扣减项
                  </button>
                  <button
                    className="btn"
                    onClick={calculateSocialSecurityRefund}
                  >
                    自动计算减扣项
                  </button>
                </div>
              </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {deductions.map((row, idx) => (
                <div
                  key={idx}
                  className="deduction-grid-row"
                  style={{ display: 'flex', alignItems: 'center', gap: '12px', width: '100%' }}
                >
                  <div className="form-group" style={{ flex: '1', display: 'flex', alignItems: 'center', gap: '8px', marginBottom: 0 }}>
                    <label className="label-inline" style={{ minWidth: '70px', marginBottom: 0 }}>减扣内容</label>
                    <input
                      type="text"
                      value={row.note}
                      onChange={(e) => handleDeductionChange(idx, 'note', e.target.value)}
                      placeholder="请输入减扣内容（可选）"
                      style={{ flex: '1' }}
                    />
                  </div>
                  <div className="form-group" style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: 0 }}>
                    <label className="label-inline" style={{ minWidth: '70px', marginBottom: 0 }}>扣减金额</label>
                    <input
                      type="number"
                      step="0.01"
                      value={row.amount}
                      onChange={(e) => handleDeductionChange(idx, 'amount', e.target.value)}
                      placeholder="正数扣减，负数发放"
                      style={{ width: '200px' }}
                    />
                  </div>
                  {deductions.length > 1 && (
                    <button
                      className="btn"
                      style={{ backgroundColor: '#dc3545' }}
                      onClick={() => removeDeduction(idx)}
                    >
                      删除
                    </button>
                  )}
                </div>
              ))}
            </div>
            </div>
          )}


          {/* 导出按钮和链接 */}
          <div style={{ marginTop: '24px', display: 'flex', flexDirection: 'column', alignItems: 'stretch', gap: '12px' }}>
            <div style={{ display: 'flex', justifyContent: 'center', gap: '12px', margin: '0 auto' }}>
              <button 
                className="btn" 
                onClick={exportToPDF}
                style={{ backgroundColor: '#dc3545' }}
              >
                导出为PDF
              </button>
              <button 
                className="btn" 
                onClick={exportToExcel}
                style={{ backgroundColor: '#28a745' }}
              >
                导出为Excel
              </button>
              <button className="btn" onClick={() => { calculateAllowance({ skipScroll: true }); }}>
                计算产假和津贴
              </button>              
            </div>

            <div className="section-card" ref={refundResultRef} style={{ marginTop: '16px' }}>
            {(() => {
              const breakdown = result.breakdown || buildAllowanceBreakdown(result, {
                deductions,
                paidWageDuringLeave,
                overrideGovernmentPaidAmount,
                overrideGovernmentPaidAmountAutoFilled,
                employeeBasicSalaryInput: employeeBasicSalary,
                refundRules
              });
              const supplementInfo = breakdown.supplement?.details;
              return (
                <>
            <div style={{ marginBottom: '12px', fontSize: '18px', fontWeight: 'bold', color: '#495057' }}>
              需补差、需返还计算结果
            </div>

            <div style={themedCardContainerStyle}>
              {paymentMethod === '个人账户' && breakdown.government && (
                <>
                  <div className="result-item" style={themedRowStyle}>
                    <span className="result-label">政府发放金额：</span>
                    <span className="result-value" style={themedValueStyle}>{breakdown.government.formatted || '0.00'}</span>
                  </div>
                  <div className="result-item calc-process" style={themedProcessStyle}>
                    <span className="result-label">计算过程：</span>
                    <span className="result-value" style={themedProcessValueStyle}>
                      {breakdown.government.process || '—'}
                    </span>
                  </div>
                </>
              )}

              <div className="result-item" style={themedRowStyle}>
                <span className="result-label">员工应领取金额：</span>
                <span className="result-value" style={themedValueStyle}>{breakdown.employee?.formatted || '0.00'}</span>
              </div>
              <div className="result-item calc-process" style={themedProcessStyle}>
                <span className="result-label">计算过程：</span>
                <span className="result-value" style={themedProcessValueStyle}>
                  {breakdown.employee?.process || '—'}
                </span>
              </div>

              <div className="result-item" style={themedRowStyle}>
                <span className="result-label">需补差：</span>
                <span className="result-value" style={themedValueStyle}>
                  {breakdown.supplement?.formattedAdjusted || '0.00'}
                </span>
              </div>
              <div className="result-item calc-process" style={themedProcessStyle}>
                <span className="result-label">计算过程：</span>
                <span className="result-value" style={themedProcessValueStyle}>
                  {breakdown.supplement?.process || '—'}
                </span>
              </div>

              {paymentMethod === '个人账户' && breakdown.supplement?.details && (
                <>
                  <div className="result-item" style={themedRowStyle}>
                    <span className="result-label">需返还：</span>
                    <span className="result-value" style={themedValueStyle}>
                      {formatCurrency(breakdown.supplement.details.totalDeductions || 0)}
                    </span>
                  </div>
                  <div className="result-item calc-process" style={themedProcessStyle}>
                    <span className="result-label">计算过程：</span>
                    <span className="result-value" style={themedProcessValueStyle}>
                      {breakdown.supplement.details.deductionFormula || '—'}
                    </span>
                  </div>
                </>
              )}
            </div>

            {/* 用户请求隐藏减扣项与公司已发工资信息 */}
            </>
              );
            })()}

            <div className="result-item" style={{ marginTop: '12px' }}>
              <span className="result-label">津贴补差政策：</span>
              <span className="result-value" style={{ fontSize: '14px', lineHeight: 1.6, whiteSpace: 'pre-wrap', color: '#212529' }}>
                {result.allowancePolicy && result.allowancePolicy.trim()
                  ? `${result.city || '未选择城市'} - ${result.allowancePolicy}`
                  : `${result.city || '未选择城市'} - 未配置津贴补差政策`}
              </span>
            </div>
          </div>


            <div style={{ display: 'flex', gap: '16px', alignItems: 'center', justifyContent: 'flex-end', alignSelf: 'stretch' }}>
              <a
                href="#!"
                onClick={(e) => {
                  e.preventDefault();
                  scrollToTop();
                }}
                style={{ color: '#a44d69', textDecoration: 'none', cursor: 'pointer', fontSize: '14px', fontWeight: 500 }}
              >
                返回
              </a>

            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AllowanceCalculator;
