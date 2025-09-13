import React, { useState } from 'react';

const DeductionCalculator = () => {
  const [companyAvgSalary, setCompanyAvgSalary] = useState('');
  const [socialInsuranceLimit, setSocialInsuranceLimit] = useState('');
  const [employeeAvgSalary, setEmployeeAvgSalary] = useState('');
  const [leaveDays, setLeaveDays] = useState('98');
  const [result, setResult] = useState(null);

  const calculateDeduction = () => {
    if (!companyAvgSalary || !socialInsuranceLimit || !employeeAvgSalary || !leaveDays) {
      alert('请填写完整的工资和产假信息');
      return;
    }

    const socialLimit = parseFloat(socialInsuranceLimit);
    const employeeAvg = parseFloat(employeeAvgSalary);
    const days = parseInt(leaveDays);

    // 社保缴费基数（取社保3倍上限和员工平均工资的较小值）
    const socialInsuranceBase = Math.min(socialLimit, employeeAvg);
    
    // 社保扣除比例（按标准比例计算）
    const pensionRate = 0.08; // 养老保险个人缴费8%
    const medicalRate = 0.02; // 医疗保险个人缴费2%
    const unemploymentRate = 0.005; // 失业保险个人缴费0.5%
    
    // 公积金扣除比例（按12%计算）
    const housingFundRate = 0.12;
    
    // 月度扣除金额
    const monthlyPensionDeduction = socialInsuranceBase * pensionRate;
    const monthlyMedicalDeduction = socialInsuranceBase * medicalRate;
    const monthlyUnemploymentDeduction = socialInsuranceBase * unemploymentRate;
    const monthlyHousingFundDeduction = employeeAvg * housingFundRate;
    
    const totalMonthlySocialInsurance = monthlyPensionDeduction + monthlyMedicalDeduction + monthlyUnemploymentDeduction;
    const totalMonthlyDeduction = totalMonthlySocialInsurance + monthlyHousingFundDeduction;
    
    // 产假期间扣除金额（按天数比例计算）
    const deductionRatio = days / 30; // 产假天数占月度比例
    const maternityPensionDeduction = monthlyPensionDeduction * deductionRatio;
    const maternityMedicalDeduction = monthlyMedicalDeduction * deductionRatio;
    const maternityUnemploymentDeduction = monthlyUnemploymentDeduction * deductionRatio;
    const maternityHousingFundDeduction = monthlyHousingFundDeduction * deductionRatio;
    
    const totalMaternitySocialInsurance = maternityPensionDeduction + maternityMedicalDeduction + maternityUnemploymentDeduction;
    const totalMaternityDeduction = totalMaternitySocialInsurance + maternityHousingFundDeduction;

    setResult({
      socialInsuranceBase: socialInsuranceBase.toFixed(2),
      leaveDays: days,
      deductionRatio: (deductionRatio * 100).toFixed(1),
      
      // 月度扣除明细
      monthlyPensionDeduction: monthlyPensionDeduction.toFixed(2),
      monthlyMedicalDeduction: monthlyMedicalDeduction.toFixed(2),
      monthlyUnemploymentDeduction: monthlyUnemploymentDeduction.toFixed(2),
      monthlyHousingFundDeduction: monthlyHousingFundDeduction.toFixed(2),
      totalMonthlySocialInsurance: totalMonthlySocialInsurance.toFixed(2),
      totalMonthlyDeduction: totalMonthlyDeduction.toFixed(2),
      
      // 产假期间扣除明细
      maternityPensionDeduction: maternityPensionDeduction.toFixed(2),
      maternityMedicalDeduction: maternityMedicalDeduction.toFixed(2),
      maternityUnemploymentDeduction: maternityUnemploymentDeduction.toFixed(2),
      maternityHousingFundDeduction: maternityHousingFundDeduction.toFixed(2),
      totalMaternitySocialInsurance: totalMaternitySocialInsurance.toFixed(2),
      totalMaternityDeduction: totalMaternityDeduction.toFixed(2)
    });
  };

  const reset = () => {
    setCompanyAvgSalary('');
    setSocialInsuranceLimit('');
    setEmployeeAvgSalary('');
    setLeaveDays('98');
    setResult(null);
  };

  return (
    <div>
      <h3>社保公积金扣除计算</h3>
      <p style={{ color: '#6c757d', marginBottom: '24px' }}>
        计算产假期间不发工资员工的社保和公积金扣除金额
      </p>

      <div className="form-group">
        <label htmlFor="companyAvgSalary">公司平均工资（元/月）</label>
        <input
          type="number"
          id="companyAvgSalary"
          value={companyAvgSalary}
          onChange={(e) => setCompanyAvgSalary(e.target.value)}
          placeholder="请输入公司平均工资"
          min="0"
          step="0.01"
        />
      </div>

      <div className="form-group">
        <label htmlFor="socialInsuranceLimit">社保3倍上限（元/月）</label>
        <input
          type="number"
          id="socialInsuranceLimit"
          value={socialInsuranceLimit}
          onChange={(e) => setSocialInsuranceLimit(e.target.value)}
          placeholder="请输入社保缴费基数3倍上限"
          min="0"
          step="0.01"
        />
      </div>

      <div className="form-group">
        <label htmlFor="employeeAvgSalary">员工平均工资（元/月）</label>
        <input
          type="number"
          id="employeeAvgSalary"
          value={employeeAvgSalary}
          onChange={(e) => setEmployeeAvgSalary(e.target.value)}
          placeholder="请输入员工平均工资"
          min="0"
          step="0.01"
        />
      </div>

      <div className="form-group">
        <label htmlFor="leaveDays">产假天数</label>
        <input
          type="number"
          id="leaveDays"
          value={leaveDays}
          onChange={(e) => setLeaveDays(e.target.value)}
          placeholder="请输入产假天数"
          min="1"
        />
      </div>

      <div style={{ display: 'flex', gap: '12px' }}>
        <button className="btn" onClick={calculateDeduction}>
          计算扣除金额
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
          
          <div style={{ marginBottom: '16px' }}>
            <strong>基础信息：</strong>
          </div>
          <div className="result-item">
            <span className="result-label">社保缴费基数：</span>
            <span className="result-value">¥{result.socialInsuranceBase}</span>
          </div>
          <div className="result-item">
            <span className="result-label">产假天数：</span>
            <span className="result-value">{result.leaveDays} 天</span>
          </div>
          <div className="result-item">
            <span className="result-label">扣除比例：</span>
            <span className="result-value">{result.deductionRatio}%</span>
          </div>

          <div style={{ marginTop: '20px', marginBottom: '16px' }}>
            <strong>月度扣除标准：</strong>
          </div>
          <div className="result-item">
            <span className="result-label">养老保险（8%）：</span>
            <span className="result-value">¥{result.monthlyPensionDeduction}</span>
          </div>
          <div className="result-item">
            <span className="result-label">医疗保险（2%）：</span>
            <span className="result-value">¥{result.monthlyMedicalDeduction}</span>
          </div>
          <div className="result-item">
            <span className="result-label">失业保险（0.5%）：</span>
            <span className="result-value">¥{result.monthlyUnemploymentDeduction}</span>
          </div>
          <div className="result-item">
            <span className="result-label">住房公积金（12%）：</span>
            <span className="result-value">¥{result.monthlyHousingFundDeduction}</span>
          </div>
          <div className="result-item" style={{ borderTop: '2px solid #dee2e6', paddingTop: '8px' }}>
            <span className="result-label">月度社保合计：</span>
            <span className="result-value">¥{result.totalMonthlySocialInsurance}</span>
          </div>
          <div className="result-item">
            <span className="result-label">月度总扣除：</span>
            <span className="result-value" style={{ fontWeight: 'bold' }}>¥{result.totalMonthlyDeduction}</span>
          </div>

          <div style={{ marginTop: '20px', marginBottom: '16px' }}>
            <strong>产假期间扣除金额：</strong>
          </div>
          <div className="result-item">
            <span className="result-label">养老保险扣除：</span>
            <span className="result-value">¥{result.maternityPensionDeduction}</span>
          </div>
          <div className="result-item">
            <span className="result-label">医疗保险扣除：</span>
            <span className="result-value">¥{result.maternityMedicalDeduction}</span>
          </div>
          <div className="result-item">
            <span className="result-label">失业保险扣除：</span>
            <span className="result-value">¥{result.maternityUnemploymentDeduction}</span>
          </div>
          <div className="result-item">
            <span className="result-label">住房公积金扣除：</span>
            <span className="result-value">¥{result.maternityHousingFundDeduction}</span>
          </div>
          <div className="result-item" style={{ borderTop: '2px solid #dee2e6', paddingTop: '8px' }}>
            <span className="result-label">产假社保扣除合计：</span>
            <span className="result-value">¥{result.totalMaternitySocialInsurance}</span>
          </div>
          <div className="result-item">
            <span className="result-label">产假总扣除金额：</span>
            <span className="result-value" style={{ fontSize: '18px', fontWeight: 'bold', color: '#dc3545' }}>
              ¥{result.totalMaternityDeduction}
            </span>
          </div>
        </div>
      )}
    </div>
  );
};

export default DeductionCalculator;
