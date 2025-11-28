import React, { useState, useEffect } from 'react';
import { PREGNANCY_PERIODS } from '../utils/cityDataUtils';
import { calculateMaternityDaysApi, listCitiesApi, listEmployeesByCityApi } from '../api/maternityApi';

const MaternityDaysCalculator = () => {
  const [selectedCity, setSelectedCity] = useState('');
  const [employeeId, setEmployeeId] = useState('');
  const [cities, setCities] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [selectedEmployee, setSelectedEmployee] = useState(null);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [isDifficultBirth, setIsDifficultBirth] = useState(false);
  const [isMiscarriage, setIsMiscarriage] = useState(false);
  const [numberOfBabies, setNumberOfBabies] = useState(1);
  const [pregnancyPeriod, setPregnancyPeriod] = useState(PREGNANCY_PERIODS.ABOVE_7_MONTHS);
  const [doctorAdviceDays, setDoctorAdviceDays] = useState('');
  const [meetsSupplementalDifficultBirth, setMeetsSupplementalDifficultBirth] = useState(false);
  const [result, setResult] = useState(null);

  useEffect(() => {
    // 使用模拟 API 加载城市列表
    let mounted = true;
    (async () => {
      const res = await listCitiesApi();
      if (mounted && res.ok) {
        setCities(res.data || []);
      }
    })();
    return () => { mounted = false; };
  }, []);

  useEffect(() => {
    if (selectedCity) {
      // 使用模拟 API 按城市加载员工
      let mounted = true;
      (async () => {
        const res = await listEmployeesByCityApi({ city: selectedCity });
        if (mounted && res.ok) {
          setEmployees(res.data || []);
          setSelectedEmployee(null);
          setEmployeeId('');
        }
      })();
      return () => { mounted = false; };
    }
  }, [selectedCity]);

  useEffect(() => {
    if (employeeId && employees.length > 0) {
      const employee = employees.find(emp => emp.employeeId === employeeId);
      if (employee) {
        setSelectedEmployee(employee);
        setIsDifficultBirth(employee.isDifficultBirth);
        setNumberOfBabies(employee.numberOfBabies);
        setPregnancyPeriod(employee.pregnancyPeriod);
        const mis = employee.pregnancyPeriod !== PREGNANCY_PERIODS.ABOVE_7_MONTHS;
        setIsMiscarriage(mis);
      } else {
        setSelectedEmployee(null);
      }
    }
  }, [employeeId, employees]);

  // Auto-calculate when city, employee, or start date changes
  useEffect(() => {
    if (selectedCity && startDate) {
      autoCalculateMaternityDays();
    }
  }, [selectedCity, employeeId, startDate, isDifficultBirth, numberOfBabies, pregnancyPeriod]);

  const autoCalculateMaternityDays = async () => {
    if (!selectedCity || !startDate) return;
    const req = {
      city: selectedCity,
      startDate,
      isDifficultBirth,
      numberOfBabies,
      pregnancyPeriod,
    };
    const res = await calculateMaternityDaysApi(req);
    if (res.ok) {
      const data = res.data;
      setResult({
        selectedCity: data.city,
        selectedEmployee,
        totalMaternityDays: data.totalMaternityDays,
        appliedRules: data.appliedRules || [],
        calculatedPeriod: data.calculatedPeriod || null,
        pregnancyConditions: data.pregnancyConditions || {
          isDifficultBirth,
          numberOfBabies,
          pregnancyPeriod,
        }
      });
    } else {
      // 简单错误提示
      console.error('计算失败: ', res.error);
    }
  };

  const calculateMaternityDays = () => {
    if (!selectedCity) {
      alert('请选择城市');
      return;
    }
    autoCalculateMaternityDays();
  };

  const reset = () => {
    setSelectedCity('');
    setEmployeeId('');
    setSelectedEmployee(null);
    setStartDate('');
    setEndDate('');
    setIsDifficultBirth(false);
    setNumberOfBabies(1);
    setPregnancyPeriod(PREGNANCY_PERIODS.ABOVE_7_MONTHS);
    setDoctorAdviceDays('');
    setMeetsSupplementalDifficultBirth(false);
    setResult(null);
  };

  return (
    <div>
      <h3>产假天数计算</h3>
      <p style={{ color: '#6c757d', marginBottom: '24px' }}>
        输入请假开始日期，系统将根据城市规则和员工信息自动计算产假天数和结束日期
      </p>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '16px', marginBottom: '20px' }}>
        <div className="form-group">
          <label htmlFor="selectedCity">选择城市</label>
          <select
            id="selectedCity"
            value={selectedCity}
            onChange={(e) => setSelectedCity(e.target.value)}
          >
            <option value="">请选择城市</option>
            {cities.map(city => (
              <option key={city} value={city}>{city}</option>
            ))}
          </select>
        </div>

        <div className="form-group">
          <label htmlFor="employeeId">员工工号</label>
          <select
            id="employeeId"
            value={employeeId}
            onChange={(e) => setEmployeeId(e.target.value)}
            disabled={!selectedCity}
          >
            <option value="">请选择员工</option>
            {employees.map(emp => (
              <option key={emp.employeeId} value={emp.employeeId}>
                {emp.employeeId} - {emp.employeeName}
              </option>
            ))}
          </select>
          {!selectedCity && (
            <small style={{ color: '#6c757d', fontSize: '12px' }}>
              请先选择城市
            </small>
          )}
        </div>
      </div>

      {selectedEmployee && (
        <div style={{ background: '#f8f9fa', padding: '16px', borderRadius: '8px', marginBottom: '20px' }}>
          <h4 style={{ marginBottom: '12px', color: '#495057' }}>员工信息</h4>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '12px' }}>
            <div><strong>姓名:</strong> {selectedEmployee.employeeName}</div>
            <div><strong>工号:</strong> {selectedEmployee.employeeId}</div>
            <div><strong>部门:</strong> {selectedEmployee.department || '未填写'}</div>
            <div><strong>职位:</strong> {selectedEmployee.position || '未填写'}</div>
            <div><strong>基本工资:</strong> ¥{selectedEmployee.basicSalary?.toLocaleString()}</div>
            <div><strong>社保基数:</strong> ¥{selectedEmployee.socialSecurityBase?.toLocaleString()}</div>
          </div>
        </div>
      )}

      <div className="form-group">
        <label htmlFor="startDate">产假开始日期 *</label>
        <input
          type="date"
          id="startDate"
          value={startDate}
          onChange={(e) => setStartDate(e.target.value)}
          style={{ fontSize: '16px', padding: '12px' }}
        />
      </div>

      <div style={{ background: '#f8f9fa', padding: '16px', borderRadius: '8px', marginBottom: '20px' }}>
        <h4 style={{ marginBottom: '12px', color: '#495057' }}>产假情况</h4>
        {/* 第1行：难产、胎数 */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px', marginBottom: '12px', justifyItems: 'start' }}>
          <div>
            <label>
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
                style={{ marginRight: '8px' }}
              />
              难产
            </label>
          </div>
          <div>
            <label htmlFor="numberOfBabies">胎数</label>
            <input
              type="number"
              id="numberOfBabies"
              value={numberOfBabies}
              onChange={(e) => setNumberOfBabies(parseInt(e.target.value) || 1)}
              min="1"
              max="5"
              style={{ width: '80px', marginLeft: '8px' }}
            />
          </div>
          <div>
            <label>
              <input
                type="checkbox"
                checked={meetsSupplementalDifficultBirth}
                onChange={(e) => setMeetsSupplementalDifficultBirth(e.target.checked)}
                disabled={selectedCity !== '广州'}
                style={{ marginRight: '8px' }}
              />
              是否满足补充难产假要求（仅广州）
            </label>
            {selectedCity !== '广州' && (
              <div style={{ color: '#6c757d', fontSize: '12px' }}>仅广州生效</div>
            )}
          </div>
        </div>

        {/* 第2行：流产、怀孕时间段、流产医嘱天数 */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px', justifyItems: 'start' }}>
          <div>
            <label>
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
                style={{ marginRight: '8px' }}
              />
              流产
            </label>
          </div>

          <div>
            <label htmlFor="pregnancyPeriod">怀孕时间段</label>
            {isMiscarriage ? (
              <select
                id="pregnancyPeriod"
                value={pregnancyPeriod}
                onChange={(e) => setPregnancyPeriod(e.target.value)}
                style={{ marginLeft: '8px' }}
              >
                <option value={PREGNANCY_PERIODS.BELOW_4_MONTHS}>未满4个月</option>
                <option value={PREGNANCY_PERIODS.BETWEEN_4_7_MONTHS}>满4个月</option>
                <option value={PREGNANCY_PERIODS.ABOVE_7_MONTHS}>满7个月</option>
              </select>
            ) : (
              <span style={{ marginLeft: '8px', color: '#6c757d' }}>仅在选择流产后可选</span>
            )}
          </div>

          <div>
            <label htmlFor="doctorAdviceDays">流产医嘱天数</label>
            {isMiscarriage ? (
              <input
                type="number"
                id="doctorAdviceDays"
                value={doctorAdviceDays}
                onChange={(e) => setDoctorAdviceDays(e.target.value)}
                min="1"
                max="365"
                placeholder="填写则以此为准"
                style={{ width: '140px', marginLeft: '8px' }}
              />
            ) : (
              <span style={{ marginLeft: '8px', color: '#6c757d' }}>仅在选择流产后可填</span>
            )}
          </div>
        </div>
      </div>

      <div style={{ display: 'flex', gap: '12px' }}>
        <button className="btn" onClick={calculateMaternityDays}>
          计算产假天数
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
          <h4>计算结果</h4>
          
          <div className="result-item">
            <span className="result-label">计算城市：</span>
            <span className="result-value">{result.selectedCity}</span>
          </div>

          {result.selectedEmployee && (
            <div className="result-item">
              <span className="result-label">员工信息：</span>
              <span className="result-value">
                {result.selectedEmployee.employeeName} ({result.selectedEmployee.employeeId})
              </span>
            </div>
          )}

          <div className="result-item">
            <span className="result-label">产假总天数：</span>
            {/* 备注提前到天数前，按“应用政策：城市-规则1，规则2”格式 */}
            <div style={{ marginRight: '12px', fontSize: '20px', fontWeight: 'bold' }}>
              {Array.isArray(result.appliedRules) && result.appliedRules.length > 0
                ? `应用政策：${result.selectedCity || '未选择城市'}-${result.appliedRules.map(r => `${r.type} ${r.days}天`).join('，')}`
                : `应用政策：${result.selectedCity || '未选择城市'}-按城市默认规则计算`}
            </div>
            <span className="result-value" style={{ fontSize: '20px', fontWeight: 'bold', color: '#28a745' }}>
              {result.totalMaternityDays} 天
            </span>
          </div>

          {result.appliedRules.length > 0 && (
            <div style={{ marginTop: '16px' }}>
              <h5 style={{ color: '#495057', marginBottom: '8px' }}>适用规则明细：</h5>
              {result.appliedRules.map((rule, index) => (
                <div key={index} className="result-item" style={{ fontSize: '14px' }}>
                  <span className="result-label">{rule.type}：</span>
                  <span className="result-value">{rule.days} 天</span>
                </div>
              ))}
            </div>
          )}

          {result.calculatedPeriod && (
            <div style={{ marginTop: '16px', padding: '16px', background: 'linear-gradient(135deg, #e3f2fd 0%, #f3e5f5 100%)', borderRadius: '8px', border: '2px solid #2196f3' }}>
              <h5 style={{ color: '#1976d2', marginBottom: '12px', fontSize: '16px' }}>📅 产假周期计算结果：</h5>
              <div className="result-item">
                <span className="result-label">开始日期：</span>
                <span className="result-value" style={{ fontWeight: 'bold' }}>{result.calculatedPeriod.startDate}</span>
              </div>
              <div className="result-item">
                <span className="result-label">结束日期：</span>
                <span className="result-value" style={{ fontSize: '18px', fontWeight: 'bold', color: '#d32f2f' }}>
                  {result.calculatedPeriod.endDate}
                </span>
              </div>
              <div className="result-item">
                <span className="result-label">产假周期：</span>
                <span className="result-value" style={{ fontWeight: 'bold', color: '#1976d2' }}>
                  {result.calculatedPeriod.period}
                </span>
              </div>
              <div className="result-item">
                <span className="result-label">预估工作日：</span>
                <span className="result-value">{result.calculatedPeriod.workingDays} 天</span>
              </div>
            </div>
          )}

          <div style={{ marginTop: '16px', padding: '12px', background: '#f8f9fa', borderRadius: '4px' }}>
            <h5 style={{ color: '#495057', marginBottom: '8px' }}>产假条件：</h5>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '8px', fontSize: '14px' }}>
              <div>难产：{result.pregnancyConditions.isDifficultBirth ? '是' : '否'}</div>
              <div>胎数：{result.pregnancyConditions.numberOfBabies}</div>
              <div>时间段：{result.pregnancyConditions.pregnancyPeriod}</div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default MaternityDaysCalculator;
