import React, { useState, useEffect } from 'react';
import { addDays, addMonths, format } from 'date-fns';
import { cityDataManager, MATERNITY_LEAVE_TYPES, PREGNANCY_PERIODS } from '../utils/cityDataUtils';
import { warmUpHolidayPlan } from '../utils/holidayUtils';
import { calculateMaternityAllowance } from '../utils/maternityCalculations';

const AllowanceCalculator = () => {
  const [selectedCity, setSelectedCity] = useState('');
  const [cities, setCities] = useState([]);
  const [allEmployees, setAllEmployees] = useState([]);
  const [employeeId, setEmployeeId] = useState('');
  const [employeeName, setEmployeeName] = useState('');
  const [employeeSearchTerm, setEmployeeSearchTerm] = useState('');
  const [filteredEmployees, setFilteredEmployees] = useState([]);
  const [showEmployeeSuggestions, setShowEmployeeSuggestions] = useState(false);
  const [selectedEmployee, setSelectedEmployee] = useState(null);
  const [companyAvgSalary, setCompanyAvgSalary] = useState('');
  const [socialInsuranceLimit, setSocialInsuranceLimit] = useState('');
  const [employeeBasicSalary, setEmployeeBasicSalary] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('企业账户');
  const [startDate, setStartDate] = useState(() => {
    const today = new Date();
    return format(today, 'yyyy-MM-dd');
  });
  const [endDate, setEndDate] = useState('');
  const [userEditedEndDate, setUserEditedEndDate] = useState(false);
  const [isDifficultBirth, setIsDifficultBirth] = useState(false);
  const [isMiscarriage, setIsMiscarriage] = useState(false);
  const [numberOfBabies, setNumberOfBabies] = useState(1);
  const [pregnancyPeriod, setPregnancyPeriod] = useState(PREGNANCY_PERIODS.ABOVE_7_MONTHS);
  const [doctorAdviceDays, setDoctorAdviceDays] = useState('');
  const [result, setResult] = useState(null);
  const [meetsSupplementalDifficultBirth, setMeetsSupplementalDifficultBirth] = useState(false);
  // 可选覆盖项
  const [overrideGovernmentPaidAmount, setOverrideGovernmentPaidAmount] = useState('');
  const [overridePersonalSSMonthly, setOverridePersonalSSMonthly] = useState('');
  // 新增：员工基本工资（元/月）
  const [employeeBaseSalary, setEmployeeBaseSalary] = useState('');
  // 新增：已发产假期间工资（仅企业账户显示）
  const [paidWageDuringLeave, setPaidWageDuringLeave] = useState('');

  useEffect(() => {
    cityDataManager.loadData();
    setCities(cityDataManager.getCities());
    // 预热 2025 节假日计划（最佳努力，从公共源拉取并缓存）
    try { warmUpHolidayPlan(2025); } catch (e) { /* ignore */ }
    // 加载所有员工数据用于搜索
    const allEmps = cityDataManager.getAllEmployees();
    setAllEmployees(allEmps || []);
  }, []);

  useEffect(() => {
    if (startDate) {
      try { warmUpHolidayPlan(new Date(startDate).getFullYear()); } catch (e) { /* ignore */ }
    }
  }, [startDate]);

  useEffect(() => {
    if (selectedCity) {
      try {
        const allowanceRule = cityDataManager.getAllowanceRulesByCity(selectedCity);
        if (allowanceRule) {
          setCompanyAvgSalary(allowanceRule.companyAverageWage.toString());
          setSocialInsuranceLimit((allowanceRule.socialAverageWage * 3).toString());
          // 津贴发放方式跟随城市规则（账户类型 -> 发放方式）
          if (allowanceRule.accountType) {
            const acct = allowanceRule.accountType;
            // 规则中账户类型：公司/个人 -> UI：企业账户/个人账户
            if (acct === '公司') {
              setPaymentMethod('企业账户');
            } else if (acct === '个人') {
              setPaymentMethod('个人账户');
            } else {
              setPaymentMethod('企业账户');
            }
          } else {
            setPaymentMethod('企业账户');
          }
        } else {
          // 如果没有找到津贴规则，清空相关字段
          setCompanyAvgSalary('');
          setSocialInsuranceLimit('');
          setPaymentMethod('企业账户');
        }
        
        // 城市变化时不需要单独设置城市员工，统一使用allEmployees进行搜索
        // 不要在城市变化时重置员工数据，保持当前选择的员工
      } catch (error) {
        console.error('选择城市时发生错误:', error);
        // 重置相关状态
        setFilteredEmployees([]);
        // 错误时才重置员工数据
        setCompanyAvgSalary('');
        setSocialInsuranceLimit('');
        setPaymentMethod('企业账户');
      }
    } else {
      // 清空城市时重置所有相关状态
      setFilteredEmployees([]);
      setSelectedEmployee(null);
      setEmployeeId('');
      setEmployeeName('');
      setEmployeeSearchTerm('');
      setEmployeeBasicSalary('');
      setShowEmployeeSuggestions(false);
      setCompanyAvgSalary('');
      setSocialInsuranceLimit('');
      setPaymentMethod('企业账户');
    }
  }, [selectedCity]);

  // 根据规则自动填充结束日期（仅当用户未手动修改时）
  useEffect(() => {
    try {
      if (!userEditedEndDate) {
        const days = calculateMaternityDays();
        if (startDate && days && days > 0) {
          const start = new Date(startDate);
          const end = addDays(start, days - 1);
          setEndDate(format(end, 'yyyy-MM-dd'));
        } else {
          setEndDate('');
        }
      }
      // 预热与开始日期对应年份（以及可能的跨年下一年）的节假日数据
      if (startDate) {
        const y = new Date(startDate).getFullYear();
        try { warmUpHolidayPlan(y); } catch (e) { /* ignore */ }
        try { warmUpHolidayPlan(y + 1); } catch (e) { /* ignore */ }
      }
    } catch (e) {
      // ignore
    }
  }, [startDate, isDifficultBirth, numberOfBabies, pregnancyPeriod, selectedCity]);

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
    }
    setShowEmployeeSuggestions(false);
  };

  useEffect(() => {
    if (employeeId && allEmployees.length > 0) {
      try {
        const employee = allEmployees.find(emp => emp.employeeId === employeeId);
        if (employee) {
          setSelectedEmployee(employee);
          setEmployeeBasicSalary(employee.basicSalary ? employee.basicSalary.toString() : '');
          // 产假情况由用户自行填写，不再从员工信息自动获取
          // 不要在这里设置公司平均工资，应该保持从城市津贴规则获取的值
          // 公司平均工资应该完全从城市津贴规则中获取，不被员工数据覆盖
        } else {
          setSelectedEmployee(null);
          setEmployeeBasicSalary('');
        }
      } catch (error) {
        console.error('选择员工时发生错误:', error);
        setSelectedEmployee(null);
        setEmployeeBasicSalary('');
      }
    } else if (!employeeId) {
      setSelectedEmployee(null);
      setEmployeeBasicSalary('');
    }
  }, [employeeId, allEmployees]);


  const autoCalculateMaternityDays = () => {
    if (!selectedCity) return;

    try {
      let totalDays = 0;
      const maternityRules = cityDataManager.getMaternityRulesByCity(selectedCity);
      const appliedRules = [];

      if (!maternityRules || maternityRules.length === 0) {
        console.warn(`城市 ${selectedCity} 没有找到产假规则`);
        return { totalDays: 98, appliedRules: [] };
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

      // 流产假（根据时间段）
      if (pregnancyPeriod !== PREGNANCY_PERIODS.ABOVE_7_MONTHS) {
        const miscarriageRule = maternityRules.find(rule => rule.leaveType === MATERNITY_LEAVE_TYPES.MISCARRIAGE);
        if (miscarriageRule) {
          let miscarriageDays = miscarriageRule.days;
          if (pregnancyPeriod === PREGNANCY_PERIODS.BELOW_4_MONTHS) {
            miscarriageDays = Math.floor(miscarriageDays / 2);
          }
          totalDays = miscarriageDays;
          appliedRules.length = 0;
          appliedRules.push({ type: `流产假(${pregnancyPeriod})`, days: miscarriageDays });
        }
      }

      return { totalDays, appliedRules };
    } catch (error) {
      console.error('计算产假天数时发生错误:', error);
      return { totalDays: 98, appliedRules: [] };
    }
  };

  const calculateMaternityDays = () => {
    if (!selectedCity) return 98;
    const result = autoCalculateMaternityDays();
    return result ? result.totalDays : 98;
  };

  const calculateAllowance = () => {
    if (!companyAvgSalary || !socialInsuranceLimit || !employeeBasicSalary) {
      alert('请填写完整的工资和社保信息');
      return;
    }

    try {
      const result = calculateMaternityAllowance(
        selectedCity,
        employeeBasicSalary,
        startDate,
        isDifficultBirth,
        numberOfBabies,
        pregnancyPeriod,
        paymentMethod,
        endDate || null,
        isMiscarriage,
        doctorAdviceDays ? parseInt(doctorAdviceDays) : null,
        overrideGovernmentPaidAmount !== '' ? parseFloat(overrideGovernmentPaidAmount) : null,
        overridePersonalSSMonthly !== '' ? parseFloat(overridePersonalSSMonthly) : null,
        companyAvgSalary !== '' ? parseFloat(companyAvgSalary) : null,
        null,
        employeeBaseSalary !== '' ? parseFloat(employeeBaseSalary) : null
      );

      setResult({
        ...result,
        selectedEmployee
      });
    } catch (error) {
      alert('计算失败：' + error.message);
    }
  };

  const reset = () => {
    setSelectedCity('');
    setEmployeeId('');
    setEmployeeName('');
    setEmployeeSearchTerm('');
    setSelectedEmployee(null);
    setShowEmployeeSuggestions(false);
    setFilteredEmployees([]);
    setCompanyAvgSalary('');
    setSocialInsuranceLimit('');
    setEmployeeBasicSalary('');
    setPaymentMethod('企业账户');
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
    setOverrideGovernmentPaidAmount('');
    setOverridePersonalSSMonthly('');
    setEmployeeBaseSalary('');
    setPaidWageDuringLeave('');
  };

  return (
    <div>
      <h3>产假津贴计算</h3>
      <p style={{ color: '#6c757d', marginBottom: '24px' }}>
        根据城市规则、员工信息和产假天数自动计算产假津贴补差，包含完整的产假周期计算
      </p>

      {/* 第一排：员工搜索、开始日期、结束日期 */}
      <div className="grid-3" style={{ marginBottom: '24px' }}>
        <div className="form-group inline-field" style={{ position: 'relative' }}>
          <label htmlFor="employeeSearch">员工搜索（工号/姓名）</label>
          <div style={{ position: 'relative', flex: 1 }}>
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
              style={{ width: '100%', borderColor: !selectedEmployee ? '#dc3545' : '#ced4da' }}
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
                    <div style={{ fontWeight: 'bold' }}>{emp.employeeId} - {emp.employeeName}</div>
                    <div style={{ fontSize: '12px', color: '#666' }}>
                      {emp.city} | {emp.position}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="form-group inline-field">
          <label htmlFor="startDate">产假开始日期 *</label>
          <input
            type="date"
            id="startDate"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            style={{ fontSize: '16px', padding: '12px', width: '100%' }}
          />
        </div>
        <div className="form-group inline-field">
          <label htmlFor="endDate">产假结束日期（可编辑）</label>
          <input
            type="date"
            id="endDate"
            value={endDate}
            onChange={(e) => { setEndDate(e.target.value); setUserEditedEndDate(true); }}
            style={{ fontSize: '16px', padding: '12px', width: '100%' }}
          />
        </div>
      </div>

      {/* 第二排：选择城市、津贴发放方式、已发产假期间工资 */}
      <div className="grid-3" style={{ marginBottom: '16px' }}>
        <div className="form-group inline-field">
          <label htmlFor="selectedCity">选择城市</label>
          <select
            id="selectedCity"
            value={selectedCity}
            onChange={(e) => setSelectedCity(e.target.value)}
            style={{ width: '100%' }}
          >
            <option value="">请选择城市</option>
            {cities.map(city => (
              <option key={city} value={city}>{city}</option>
            ))}
          </select>
        </div>

        <div className="form-group inline-field">
          <label htmlFor="paymentMethod">津贴发放方式 *</label>
          <select
            id="paymentMethod"
            value={paymentMethod}
            onChange={(e) => setPaymentMethod(e.target.value)}
            style={{ fontSize: '16px', padding: '12px', backgroundColor: '#f8f9fa', cursor: 'not-allowed', width: '100%' }}
            disabled
          >
            <option value="企业账户">企业账户</option>
            <option value="个人账户">个人账户</option>
          </select>
        </div>

        {paymentMethod === '企业账户' ? (
          <div className="form-group inline-field">
            <label htmlFor="paidWageDuringLeave" className="label-260">已发产假期间工资</label>
            <input
              type="number"
              id="paidWageDuringLeave"
              value={paidWageDuringLeave}
              onChange={(e) => setPaidWageDuringLeave(e.target.value)}
              placeholder="如有公司已发放的产假期间工资，可在此记录"
              min="0"
              step="0.01"
              className="field-220"
            />
          </div>
        ) : (
          <div />
        )}
      </div>

      <div className="section-card section-muted">
        <h4 className="section-title">产假情况</h4>
          {/* 第1行：难产、胎数、补充难产（左对齐） */}
          <div className="grid-3" style={{ marginBottom: '12px', gap: '12px' }}>
            <div className="form-group" style={{ display: 'flex', alignItems: 'center', gap: '6px', paddingLeft: '8px' }}>
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
            </div>
            <div className="form-group inline-field">
              <label htmlFor="numberOfBabies" className="label-180">胎数</label>
              <input
                type="number"
                id="numberOfBabies"
                value={numberOfBabies}
                onChange={(e) => setNumberOfBabies(parseInt(e.target.value) || 1)}
                min="1"
                max="5"
                className="field-220"
              />
            </div>
            <div className="form-group" style={{ display: 'flex', alignItems: 'center', gap: '6px', paddingLeft: '8px' }}>
              <input
                type="checkbox"
                checked={meetsSupplementalDifficultBirth}
                onChange={(e) => setMeetsSupplementalDifficultBirth(e.target.checked)}
                disabled={selectedCity !== '广州'}
              />
              <span>满足补充难产假条件(仅广州可选)</span>
            </div>
          </div>

          {/* 第2行：流产、怀孕时间段、医生建议天数（左对齐） */}
          <div className="grid-3" style={{ marginBottom: '12px', gap: '12px' }}>
            <div className="form-group" style={{ display: 'flex', alignItems: 'center', gap: '6px', paddingLeft: '8px' }}>
              <input
                type="checkbox"
                checked={isMiscarriage}
                onChange={(e) => {
                  const checked = e.target.checked;
                  setIsMiscarriage(checked);
                  if (checked) {
                    setIsDifficultBirth(false);
                    setPregnancyPeriod(PREGNANCY_PERIODS.BETWEEN_4_7_MONTHS);
                  } else {
                    setPregnancyPeriod(PREGNANCY_PERIODS.ABOVE_7_MONTHS);
                  }
                }}
              />
              <span>流产</span>
            </div>
            <div className="form-group inline-field">
              <label htmlFor="pregnancyPeriod" className="label-180">怀孕时间段</label>
              <select
                id="pregnancyPeriod"
                value={isMiscarriage ? pregnancyPeriod : ''}
                onChange={(e) => setPregnancyPeriod(e.target.value)}
                className="field-220"
                disabled={!isMiscarriage}
              >
                {!isMiscarriage && <option value="">请选择（仅流产可选）</option>}
                <option value={PREGNANCY_PERIODS.BELOW_4_MONTHS}>未满4个月</option>
                <option value={PREGNANCY_PERIODS.BETWEEN_4_7_MONTHS}>满4个月</option>
                <option value={PREGNANCY_PERIODS.ABOVE_7_MONTHS}>满7个月</option>
              </select>
            </div>
            <div className="form-group inline-field">
              <label htmlFor="doctorAdviceDays" className="label-180">流产医嘱天数</label>
              <input
                type="number"
                id="doctorAdviceDays"
                value={doctorAdviceDays}
                onChange={(e) => setDoctorAdviceDays(e.target.value)}
                min="1"
                max="365"
                className="field-220"
                disabled={!isMiscarriage}
              />
            </div>
          </div>
      </div>


      {/* 工资与金额：两排三列，左对齐；行内标签+输入，避免上下堆叠 */}
      {/* 第一排：单位申报平均、社保3倍上限、政府发放金额 */}
      <div className="grid-3" style={{ marginBottom: '24px' }}>
        <div className="form-group inline-field">
          <label htmlFor="companyAvgSalary" className="label-260">单位申报的上年度月平均工资（元/月） *</label>
          <input
            type="number"
            id="companyAvgSalary"
            value={companyAvgSalary}
            onChange={(e) => setCompanyAvgSalary(e.target.value)}
            min="0"
            step="0.01"
            className="field-220"
          />
        </div>

        <div className="form-group inline-field">
          <label htmlFor="socialInsuranceLimit" className="label-260">社保3倍上限（元/月）</label>
          <input
            type="number"
            id="socialInsuranceLimit"
            value={socialInsuranceLimit}
            onChange={(e) => setSocialInsuranceLimit(e.target.value)}
            placeholder="请输入社保缴费基数3倍上限"
            min="0"
            step="0.01"
            className="field-220"
            disabled
            readOnly
          />
        </div>

        <div className="form-group inline-field">
          <label htmlFor="overrideGovernmentPaidAmount" className="label-260">政府发放金额</label>
          <input
            type="number"
            id="overrideGovernmentPaidAmount"
            value={overrideGovernmentPaidAmount}
            onChange={(e) => setOverrideGovernmentPaidAmount(e.target.value)}
            placeholder="留空则按算法计算"
            min="0"
            step="0.01"
            className="field-220"
          />
        </div>
      </div>

      {/* 第二排：员工12个月月均、员工基本工资、社保+公积金个人部分月缴费 */}
      <div className="grid-3" style={{ marginBottom: '24px' }}>
        <div className="form-group inline-field">
          <label htmlFor="employeeBasicSalary" className="label-260">员工产前12个月的月均工资（元/月） *</label>
          <input
            type="number"
            id="employeeBasicSalary"
            value={employeeBasicSalary}
            onChange={(e) => setEmployeeBasicSalary(e.target.value)}
            min="0"
            step="0.01"
            className="field-220"
          />
        </div>

        <div className="form-group inline-field">
          <label htmlFor="employeeBaseSalary" className="label-260">员工基本工资（元/月）</label>
          <input
            type="number"
            id="employeeBaseSalary"
            value={employeeBaseSalary}
            onChange={(e) => setEmployeeBaseSalary(e.target.value)}
            placeholder="可选，员工当前基本工资"
            min="0"
            step="0.01"
            className="field-220"
          />
        </div>

        <div className="form-group inline-field">
          <label htmlFor="overridePersonalSSMonthly" className="label-260">社保公积金个人月缴费金额合计</label>
          <input
            type="number"
            id="overridePersonalSSMonthly"
            value={overridePersonalSSMonthly}
            onChange={(e) => setOverridePersonalSSMonthly(e.target.value)}
            placeholder="留空则按算法计算（22.5%）"
            min="0"
            step="0.01"
            className="field-220"
          />
        </div>
      </div>

      <div style={{ display: 'flex', gap: '12px' }}>
        <button className="btn" onClick={calculateAllowance}>
          计算津贴补差
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
        <div className="result">
          <h3>计算结果</h3>
          
          

          {result.selectedEmployee && (
            <div className="result-item">
              <span className="result-label">员工/工号：</span>
              <span className="result-value">
                {result.selectedEmployee.employeeName} ({result.selectedEmployee.employeeId})
              </span>
            </div>
          )}

          {result.calculatedPeriod && (
            <>
              <div className="result-item">
                <span className="result-label">产假开始日期：</span>
                <span className="result-value">{result.calculatedPeriod.startDate}</span>
              </div>
              <div className="result-item">
                <span className="result-label">产假结束日期：</span>
                <span className="result-value" style={{ fontWeight: 'bold' }}>{result.calculatedPeriod.endDate}{userEditedEndDate ? '（已手动调整）' : ''}</span>
              </div>
            </>
          )}

          <div className="result-item">
            <span className="result-label">享受生育津贴天数：</span>
            <div style={{ marginRight: '12px', fontSize: '20px', fontWeight: 'bold' }}>
              {Array.isArray(result.appliedRules) && result.appliedRules.length > 0
                ? `应用政策：${result.city || '未选择城市'}-${result.appliedRules.map(r => `${r.type} ${r.days}天`).join('，')}`
                : `应用政策：${result.city || '未选择城市'}-按城市默认规则计算`}
            </div>
            <span className="result-value" style={{ fontSize: '20px', fontWeight: 'bold', color: '#28a745' }}>
              {result.totalMaternityDays} 天
            </span>
          </div>
          
          <div className="result-item">
            <span className="result-label">政府发放金额：</span>
            <span className="result-value">¥{(result.governmentPaidAmount ?? result.maternityAllowance)}</span>
          </div>
          <div className="result-item">
            <span className="result-label">员工应领取金额：</span>
            <span className="result-value">¥{result.employeeReceivable}</span>
          </div>
          <div className="result-item">
            <span className="result-label">产假期间个人社保公积金合计：</span>
            <span className="result-value" style={{ color: '#28a745' }}>
              ¥{result.personalSocialSecurity}
            </span>
          </div>
          

          {result.startMonthProratedWage != null && (
            <div className="result-item">
              <span className="result-label">产假首月应发工资：</span>
              <span className="result-value" style={{ marginLeft: '8px' }}>¥{result.startMonthProratedWage}</span>
            </div>
          )}
          {result.endMonthProratedWage != null && (
            <div className="result-item">
              <span className="result-label">产假结束月应发工资：</span>
              <span className="result-value" style={{ marginLeft: '8px' }}>¥{result.endMonthProratedWage}</span>
            </div>
          )}
          {/* 补差金额移动至结束月应发工资之后 */}
          <div className="result-item">
            <span className="result-label">补差金额：</span>
            <span className="result-value" style={{ color: result.isSupplementNeeded ? '#dc3545' : '#28a745' }}>
              ¥{result.companySupplement}
            </span>
          </div>
          

          <div style={{ marginTop: '16px', padding: '16px', background: '#e8f4fd', borderRadius: '8px', border: '1px solid #bee5eb' }}>
            <h5 style={{ color: '#0c5460', marginBottom: '12px' }}>💰 费用说明：</h5>
            <div style={{ fontSize: '14px', lineHeight: '1.6' }}>
              <ul style={{ margin: 0, paddingLeft: '20px' }}>
                <li>产假期间个人社保公积金合计：¥{result.personalSocialSecurity}</li>
                {Array.isArray(result.personalSSMonths) && result.personalSSMonths.length > 0 && (
                  <li>个人社保缴费月份：{result.personalSSMonths.join(', ')}</li>
                )}
                <li>员工实际到手：¥{result.totalReceived}（补差 - 个人社保）</li>
                {result.startMonthMeta && (
                  <li>产假首月：当月工作日天数 {result.startMonthMeta.monthWorkingDays}，实际工作天数 {result.startMonthMeta.actualWorkingDays}</li>
                )}
                {result.endMonthMeta && (
                  <li>产假结束月：当月工作日天数 {result.endMonthMeta.monthWorkingDays}，实际工作天数 {result.endMonthMeta.actualWorkingDays}</li>
                )}
                {paymentMethod === '企业账户' && paidWageDuringLeave && (
                  <li>已发产假期间工资（记录）：¥{paidWageDuringLeave}</li>
                )}
              </ul>
            </div>
            {/* 将产假条件并入费用说明 */}
            <div style={{ marginTop: '12px', paddingTop: '12px', borderTop: '1px dashed #bee5eb' }}>
              <h5 style={{ color: '#0c5460', marginBottom: '8px' }}>产假条件</h5>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '8px', fontSize: '14px' }}>
                <div>难产：{(result.pregnancyConditions && result.pregnancyConditions.isDifficultBirth) ? '是' : '否'}</div>
                <div>流产：{(result.pregnancyConditions && result.pregnancyConditions.pregnancyPeriod !== PREGNANCY_PERIODS.ABOVE_7_MONTHS) ? '是' : '否'}</div>
                <div>胎数：{(result.pregnancyConditions && result.pregnancyConditions.numberOfBabies != null) ? result.pregnancyConditions.numberOfBabies : 1}</div>
                <div>时间段：{(result.pregnancyConditions && result.pregnancyConditions.pregnancyPeriod) ? result.pregnancyConditions.pregnancyPeriod : PREGNANCY_PERIODS.ABOVE_7_MONTHS}</div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AllowanceCalculator;
