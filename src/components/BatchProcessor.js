import React, { useState } from 'react';
import { generateEmployeeTemplate, readExcelFile, exportResults, exportHistoryData } from '../utils/excelUtils';
import { processBatchData } from '../utils/batchCalculations';
import { formatAppliedRulesSummaryLine } from '../utils/allowanceFormatters';
import TabHeader from './TabHeader';

const BatchProcessor = () => {
  const [selectedFile, setSelectedFile] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [results, setResults] = useState(null);
  const [errors, setErrors] = useState([]);
  const [historyData, setHistoryData] = useState([]);
  const [showHistory, setShowHistory] = useState(false);
  const [activeGroup, setActiveGroup] = useState('all');
  const [previewData, setPreviewData] = useState([]);

  // 读取计算历史
  const loadCalculationHistory = () => {
    try {
      const allCalculations = [];
      const keys = Object.keys(localStorage);

      // 查找所有以 maternityCalculation_ 开头的键
      for (const key of keys) {
        if (key.startsWith('maternityCalculation_')) {
          const employeeName = key.replace('maternityCalculation_', '');
          const calculationData = JSON.parse(localStorage.getItem(key));
          if (calculationData) {
            allCalculations.push(calculationData);
          }
        }
      }

      if (allCalculations.length === 0) {
        alert('暂无历史计算数据。请先在产假津贴计算页面进行计算，数据会自动保存到此处。');
        return;
      }

      // 按计算时间排序（最新的在前）
      allCalculations.sort((a, b) => new Date(b.calculatedAt || 0) - new Date(a.calculatedAt || 0));

      setHistoryData(allCalculations);
      setShowHistory(true);
    } catch (error) {
      alert('读取历史数据失败：' + error.message);
    }
  };

  // 计算分组数量
  const enterpriseCount = results ? results.filter(r => r.paymentMethod === '企业账户').length : 0;
  const personalCount = results ? results.filter(r => r.paymentMethod === '个人账户').length : 0;

  // 根据当前分组筛选显示结果
  const displayedResults = results ? (
    activeGroup === 'all' ? results :
    activeGroup === 'enterprise' ? results.filter(r => r.paymentMethod === '企业账户') :
    results.filter(r => r.paymentMethod === '个人账户')
  ) : [];

  // 下载模板
  const handleDownloadTemplate = () => {
    generateEmployeeTemplate();
  };

  // 文件选择
  const handleFileSelect = async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    if (!file.name.match(/\.(xlsx|xls)$/)) {
      alert('请选择Excel文件（.xlsx或.xls格式）');
      return;
    }

    setSelectedFile(file);
    setResults(null);
    setErrors([]);

    try {
      const data = await readExcelFile(file);
      setPreviewData(data); // 显示所有数据，不限制前5条
    } catch (error) {
      alert('文件读取失败：' + error.message);
      setSelectedFile(null);
      setPreviewData([]);
    }
  };

  // 批量处理
  const handleBatchProcess = async () => {
    if (!selectedFile) {
      alert('请先选择Excel文件');
      return;
    }

    setIsProcessing(true);
    
    try {
      const employeeData = await readExcelFile(selectedFile);
      
      if (employeeData.length === 0) {
        alert('Excel文件中没有找到有效数据');
        setIsProcessing(false);
        return;
      }

      const { results: processResults, errors: processErrors } = processBatchData(employeeData);
      
      setResults(processResults);
      setErrors(processErrors);
      
      // 如果有错误，显示错误提示
      if (processErrors.length > 0 && processResults.length === 0) {
        alert(`批量处理失败！所有数据都有错误，请检查数据格式。`);
      }
      
    } catch (error) {
      alert('批量处理失败：' + error.message);
    } finally {
      setIsProcessing(false);
    }
  };

  // 导出结果
  const handleExportResults = () => {
    if (!results || results.length === 0) {
      alert('没有可导出的结果');
      return;
    }
    
    exportResults(results, errors);
  };

  // 导出历史数据
  const handleExportHistory = () => {
    exportHistoryData(historyData);
  };

  // 重置
  const handleReset = () => {
    setSelectedFile(null);
    setResults(null);
    setErrors([]);
    setPreviewData([]);
    setHistoryData([]);
    setShowHistory(false);

    // 清空所有计算历史数据
    const keys = Object.keys(localStorage);
    keys.forEach(key => {
      if (key.startsWith('maternityCalculation_')) {
        localStorage.removeItem(key);
      }
    });

    // 清空文件输入
    const fileInput = document.getElementById('excel-file-input');
    if (fileInput) {
      fileInput.value = '';
    }
  };

  return (
    <div className="batch-processor">
      <TabHeader
        icon="📦"
        title="批量处理"
        subtitle="支持Excel批量导入员工数据，一键计算产假周期、津贴补差和社保扣除"
      />

      {/* 操作按钮区域 */}
      <div style={{ marginBottom: '24px' }}>
        <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', marginBottom: '16px' }}>
          <button 
            className="btn" 
            onClick={handleDownloadTemplate}
            style={{ backgroundColor: '#17a2b8' }}
          >
            📥 下载Excel模板
          </button>
          
          <label className="btn" style={{ backgroundColor: '#28a745', cursor: 'pointer' }}>
            📁 选择Excel文件
            <input
              id="excel-file-input"
              type="file"
              accept=".xlsx,.xls"
              onChange={handleFileSelect}
              style={{ display: 'none' }}
            />
          </label>
          
          <button 
            className="btn" 
            onClick={handleBatchProcess}
            disabled={!selectedFile || isProcessing}
            style={{ 
              backgroundColor: isProcessing ? '#6c757d' : '#007bff',
              cursor: isProcessing ? 'not-allowed' : 'pointer'
            }}
          >
            {isProcessing ? '⏳ 处理中...' : '🚀 开始批量处理'}
          </button>
          
          {results && results.length > 0 && (
            <>
              <button
                className="btn"
                onClick={handleExportResults}
                style={{ backgroundColor: '#28a745' }}
              >
                📊 导出结果
              </button>
            </>
          )}
          
          <button
            className="btn"
            onClick={loadCalculationHistory}
            style={{ backgroundColor: '#17a2b8' }}
          >
            📜 读取计算历史
          </button>
          
          <button 
            className="btn" 
            onClick={handleReset}
            style={{ backgroundColor: '#6c757d' }}
          >
            🔄 重置
          </button>
        </div>
      </div>

      {/* 文件信息 */}
      {selectedFile && (
        <div style={{ 
          marginBottom: '24px', 
          padding: '16px', 
          backgroundColor: '#e3f2fd', 
          borderRadius: '8px',
          border: '1px solid #bbdefb'
        }}>
          <h4 style={{ margin: '0 0 8px 0', color: '#1976d2' }}>已选择文件</h4>
          <p style={{ margin: '0', color: '#424242' }}>
            📄 {selectedFile.name} ({(selectedFile.size / 1024).toFixed(1)} KB)
          </p>
        </div>
      )}

      {/* 数据预览 */}
      {previewData.length > 0 && (
        <div style={{ marginBottom: '24px' }}>
          <h4>数据预览（共{previewData.length}条）</h4>
          <div style={{
            overflowX: 'auto',
            border: '1px solid #dee2e6',
            borderRadius: '8px',
            maxHeight: '600px',
            overflowY: 'auto'
          }}>
            <table style={{ 
              width: '100%', 
              borderCollapse: 'collapse',
              fontSize: '14px',
              minWidth: '1400px'
            }}>
              <thead style={{ position: 'sticky', top: 0, backgroundColor: '#f8f9fa', zIndex: 1 }}>
                <tr style={{ backgroundColor: '#f8f9fa' }}>
                  <th style={{ padding: '8px', border: '1px solid #dee2e6', textAlign: 'left' }}>员工姓名</th>
                  <th style={{ padding: '8px', border: '1px solid #dee2e6', textAlign: 'left' }}>员工编号</th>
                  <th style={{ padding: '8px', border: '1px solid #dee2e6', textAlign: 'left' }}>所在城市</th>
                  <th style={{ padding: '8px', border: '1px solid #dee2e6', textAlign: 'left' }}>产假开始日期</th>
                  <th style={{ padding: '8px', border: '1px solid #dee2e6', textAlign: 'left' }}>员工产前12个月的月均工资</th>
                  <th style={{ padding: '8px', border: '1px solid #dee2e6', textAlign: 'left' }}>员工基本工资</th>
                  <th style={{ padding: '8px', border: '1px solid #dee2e6', textAlign: 'left' }}>月个人部分社保公积金合计</th>
                  <th style={{ padding: '8px', border: '1px solid #dee2e6', textAlign: 'left' }}>公司已发产假工资</th>
                  <th style={{ padding: '8px', border: '1px solid #dee2e6', textAlign: 'left' }}>政府发放津贴金额</th>
                  <th style={{ padding: '8px', border: '1px solid #dee2e6', textAlign: 'left' }}>生产情况</th>
                  <th style={{ padding: '8px', border: '1px solid #dee2e6', textAlign: 'left' }}>流产类型</th>
                  <th style={{ padding: '8px', border: '1px solid #dee2e6', textAlign: 'left' }}>胎数</th>
                </tr>
              </thead>
              <tbody>
                {previewData.map((row, index) => (
                  <tr key={index}>
                    <td style={{ padding: '8px', border: '1px solid #dee2e6' }}>{row.name || ''}</td>
                    <td style={{ padding: '8px', border: '1px solid #dee2e6' }}>{row.employeeId || ''}</td>
                    <td style={{ padding: '8px', border: '1px solid #dee2e6' }}>{row.city || ''}</td>
                    <td style={{ padding: '8px', border: '1px solid #dee2e6' }}>{row.startDate || ''}</td>
                    <td style={{ padding: '8px', border: '1px solid #dee2e6' }}>{row.employeeBasicSalary || ''}</td>
                    <td style={{ padding: '8px', border: '1px solid #dee2e6' }}>{row.employeeBaseSalary || ''}</td>
                    <td style={{ padding: '8px', border: '1px solid #dee2e6' }}>{row.overridePersonalSSMonthly || ''}</td>
                    <td style={{ padding: '8px', border: '1px solid #dee2e6' }}>{row.companyPaidWage || ''}</td>
                    <td style={{ padding: '8px', border: '1px solid #dee2e6' }}>{row.overrideGovernmentPaidAmount || ''}</td>
                    <td style={{ padding: '8px', border: '1px solid #dee2e6' }}>{row.isDifficultBirth ? '难产' : '顺产'}</td>
                    <td style={{ padding: '8px', border: '1px solid #dee2e6' }}>{row.pregnancyPeriod || (row.isMiscarriage ? '流产' : '')}</td>
                    <td style={{ padding: '8px', border: '1px solid #dee2e6' }}>{row.numberOfBabies || ''}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 处理结果摘要 */}
      {(results || errors.length > 0) && (
        <div style={{ marginBottom: '24px' }}>
          <h4>处理结果摘要</h4>
          <div style={{ 
            display: 'grid', 
            gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', 
            gap: '16px' 
          }}>
            <div style={{ 
              padding: '16px', 
              backgroundColor: '#d4edda', 
              borderRadius: '8px',
              border: '1px solid #c3e6cb'
            }}>
              <h5 style={{ margin: '0 0 8px 0', color: '#155724' }}>✅ 成功处理</h5>
              <p style={{ margin: '0', fontSize: '24px', fontWeight: 'bold', color: '#155724' }}>
                {results ? results.length : 0}
              </p>
            </div>
            
            <div style={{ 
              padding: '16px', 
              backgroundColor: '#f8d7da', 
              borderRadius: '8px',
              border: '1px solid #f5c6cb'
            }}>
              <h5 style={{ margin: '0 0 8px 0', color: '#721c24' }}>❌ 处理失败</h5>
              <p style={{ margin: '0', fontSize: '24px', fontWeight: 'bold', color: '#721c24' }}>
                {errors.length}
              </p>
            </div>
            
            {results && results.length > 0 && (
              <>
                <div style={{ 
                  padding: '16px', 
                  backgroundColor: '#fff3cd', 
                  borderRadius: '8px',
                  border: '1px solid #ffeaa7'
                }}>
                  <h5 style={{ margin: '0 0 8px 0', color: '#856404' }}>💰 津贴总额</h5>
                  <p style={{ margin: '0', fontSize: '18px', fontWeight: 'bold', color: '#856404' }}>
                    ¥{results.reduce((sum, r) => sum + r.maternityAllowance, 0).toLocaleString()}
                  </p>
                </div>
                
                <div style={{ 
                  padding: '16px', 
                  backgroundColor: '#cce5ff', 
                  borderRadius: '8px',
                  border: '1px solid #99d6ff'
                }}>
                  <h5 style={{ margin: '0 0 8px 0', color: '#004085' }}>🏢 补差总额</h5>
                  <p style={{ margin: '0', fontSize: '18px', fontWeight: 'bold', color: '#004085' }}>
                    ¥{results.reduce((sum, r) => sum + r.companySupplement, 0).toLocaleString()}
                  </p>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* 已计算数据列表 */}
      {results && results.length > 0 && (
        <div style={{ marginBottom: '24px' }}>
          <h4>已计算数据列表</h4>

          {/* 分组选择器 */}
          <div style={{ marginBottom: '16px', display: 'flex', gap: '8px' }}>
            <button
              className={`btn ${activeGroup === 'all' ? '' : 'btn-outline'}`}
              onClick={() => setActiveGroup('all')}
              style={{
                backgroundColor: activeGroup === 'all' ? '#007bff' : '#f8f9fa',
                color: activeGroup === 'all' ? 'white' : '#495057',
                border: '1px solid #dee2e6'
              }}
            >
              全部数据 ({results.length})
            </button>
            <button
              className={`btn ${activeGroup === 'enterprise' ? '' : 'btn-outline'}`}
              onClick={() => setActiveGroup('enterprise')}
              style={{
                backgroundColor: activeGroup === 'enterprise' ? '#007bff' : '#f8f9fa',
                color: activeGroup === 'enterprise' ? 'white' : '#495057',
                border: '1px solid #dee2e6'
              }}
            >
              企业账户 ({enterpriseCount})
            </button>
            <button
              className={`btn ${activeGroup === 'personal' ? '' : 'btn-outline'}`}
              onClick={() => setActiveGroup('personal')}
              style={{
                backgroundColor: activeGroup === 'personal' ? '#007bff' : '#f8f9fa',
                color: activeGroup === 'personal' ? 'white' : '#495057',
                border: '1px solid #dee2e6'
              }}
            >
              个人账户 ({personalCount})
            </button>
          </div>

          <div style={{
            overflowX: 'auto',
            border: '1px solid #dee2e6',
            borderRadius: '8px',
            maxHeight: '600px',
            overflowY: 'auto'
          }}>
            <table style={{
              width: '100%',
              borderCollapse: 'collapse',
              fontSize: '14px',
              minWidth: '2000px'
            }}>
              <thead style={{ position: 'sticky', top: 0, backgroundColor: '#f8f9fa', zIndex: 1 }}>
                <tr style={{ backgroundColor: '#f8f9fa' }}>
                  <th style={{ padding: '8px', border: '1px solid #dee2e6', textAlign: 'left' }}>员工姓名</th>
                  <th style={{ padding: '8px', border: '1px solid #dee2e6', textAlign: 'left' }}>员工编号</th>
                  <th style={{ padding: '8px', border: '1px solid #dee2e6', textAlign: 'left' }}>所在城市</th>
                  <th style={{ padding: '8px', border: '1px solid #dee2e6', textAlign: 'left' }}>产假开始日期</th>
                  <th style={{ padding: '8px', border: '1px solid #dee2e6', textAlign: 'left' }}>产假结束日期</th>
                  <th style={{ padding: '8px', border: '1px solid #dee2e6', textAlign: 'right' }}>享受产假天数</th>
                  <th style={{ padding: '8px', border: '1px solid #dee2e6', textAlign: 'left' }}>津贴发放方式</th>
                  <th style={{ padding: '8px', border: '1px solid #dee2e6', textAlign: 'right' }}>社保基数</th>
                  <th style={{ padding: '8px', border: '1px solid #dee2e6', textAlign: 'right' }}>津贴基数</th>
                  <th style={{ padding: '8px', border: '1px solid #dee2e6', textAlign: 'right' }}>日津贴</th>
                  <th style={{ padding: '8px', border: '1px solid #dee2e6', textAlign: 'right' }}>政府发放金额</th>
                  <th style={{ padding: '8px', border: '1px solid #dee2e6', textAlign: 'right' }}>员工应领取金额</th>
                  <th style={{ padding: '8px', border: '1px solid #dee2e6', textAlign: 'right' }}>公司应发工资</th>
                  <th style={{ padding: '8px', border: '1px solid #dee2e6', textAlign: 'right' }}>需补差金额</th>
                  <th style={{ padding: '8px', border: '1px solid #dee2e6', textAlign: 'right' }}>个人社保缴费</th>
                  <th style={{ padding: '8px', border: '1px solid #dee2e6', textAlign: 'right' }}>实际补差金额</th>
                  <th style={{ padding: '8px', border: '1px solid #dee2e6', textAlign: 'right' }}>员工实际可得</th>
                  <th style={{ padding: '8px', border: '1px solid #dee2e6', textAlign: 'left' }}>社保公积金扣除</th>
                  <th style={{ padding: '8px', border: '1px solid #dee2e6', textAlign: 'left' }}>减扣项</th>
                </tr>
              </thead>
              <tbody>
                {displayedResults.map((result, index) => (
                  <tr key={index} style={{ backgroundColor: index % 2 === 0 ? '#ffffff' : '#f8f9fa' }}>
                    <td style={{ padding: '8px', border: '1px solid #dee2e6' }}>{result.name}</td>
                    <td style={{ padding: '8px', border: '1px solid #dee2e6' }}>{result.employeeId}</td>
                    <td style={{ padding: '8px', border: '1px solid #dee2e6' }}>{result.city}</td>
                    <td style={{ padding: '8px', border: '1px solid #dee2e6' }}>{result.startDate}</td>
                    <td style={{ padding: '8px', border: '1px solid #dee2e6' }}>{result.endDate}</td>
                    <td style={{ padding: '8px', border: '1px solid #dee2e6', textAlign: 'right' }}>{result.totalMaternityDays || 0}</td>
                    <td style={{ padding: '8px', border: '1px solid #dee2e6' }}>{result.paymentMethod}</td>
                    <td style={{ padding: '8px', border: '1px solid #dee2e6', textAlign: 'right' }}>¥{result.socialInsuranceBase?.toLocaleString() || '0'}</td>
                    <td style={{ padding: '8px', border: '1px solid #dee2e6', textAlign: 'right' }}>¥{result.maternityAllowanceBase?.toLocaleString() || '0'}</td>
                    <td style={{ padding: '8px', border: '1px solid #dee2e6', textAlign: 'right' }}>¥{result.dailyAllowance?.toLocaleString() || '0'}</td>
                    <td style={{ padding: '8px', border: '1px solid #dee2e6', textAlign: 'right' }}>¥{result.maternityAllowance?.toLocaleString() || '0'}</td>
                    <td style={{ padding: '8px', border: '1px solid #dee2e6', textAlign: 'right' }}>¥{result.employeeReceivable?.toLocaleString() || '0'}</td>
                    <td style={{ padding: '8px', border: '1px solid #dee2e6', textAlign: 'right' }}>¥{result.companyShouldPay?.toLocaleString() || '0'}</td>
                    <td style={{ padding: '8px', border: '1px solid #dee2e6', textAlign: 'right', color: result.companySupplement > 0 ? '#dc3545' : '#28a745' }}>
                      ¥{result.companySupplement?.toLocaleString() || '0'}
                    </td>
                    <td style={{ padding: '8px', border: '1px solid #dee2e6', textAlign: 'right' }}>¥{result.personalSocialSecurity?.toLocaleString() || '0'}</td>
                    <td style={{ padding: '8px', border: '1px solid #dee2e6', textAlign: 'right' }}>¥{result.adjustedSupplement?.toLocaleString() || '0'}</td>
                    <td style={{ padding: '8px', border: '1px solid #dee2e6', textAlign: 'right' }}>¥{result.totalReceived?.toLocaleString() || '0'}</td>
                    <td style={{ padding: '8px', border: '1px solid #dee2e6', textAlign: 'right' }}>
                      ¥{result.totalActualDeduction?.toLocaleString() || '0'}
                    </td>
                    <td style={{ padding: '8px', border: '1px solid #dee2e6', textAlign: 'right' }}>
                      ¥{result.deductionsTotal?.toLocaleString() || '0'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 计算历史数据列表 */}
      {showHistory && historyData.length > 0 && (
        <div style={{ marginBottom: '24px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <h4>计算历史数据列表（共{historyData.length}条）</h4>
            <div style={{ display: 'flex', gap: '8px' }}>
              <button
                className="btn"
                onClick={handleExportHistory}
                style={{ backgroundColor: '#28a745' }}
              >
                📊 导出历史数据
              </button>
              <button
                className="btn"
                onClick={() => setShowHistory(false)}
                style={{ backgroundColor: '#6c757d' }}
              >
                ❌ 关闭历史
              </button>
            </div>
          </div>

          <div style={{
            overflowX: 'auto',
            border: '1px solid #dee2e6',
            borderRadius: '8px',
            maxHeight: '600px',
            overflowY: 'auto'
          }}>
            <table style={{
              width: '100%',
              borderCollapse: 'collapse',
              fontSize: '14px',
              minWidth: '2500px'
            }}>
              <thead style={{ position: 'sticky', top: 0, backgroundColor: '#f8f9fa', zIndex: 1 }}>
                <tr style={{ backgroundColor: '#f8f9fa' }}>
                  <th style={{ padding: '8px', border: '1px solid #dee2e6', textAlign: 'left' }}>员工姓名</th>
                  <th style={{ padding: '8px', border: '1px solid #dee2e6', textAlign: 'left' }}>员工编号</th>
                  <th style={{ padding: '8px', border: '1px solid #dee2e6', textAlign: 'left' }}>所在城市</th>
                  <th style={{ padding: '8px', border: '1px solid #dee2e6', textAlign: 'left' }}>产假开始日期</th>
                  <th style={{ padding: '8px', border: '1px solid #dee2e6', textAlign: 'left' }}>产假结束日期</th>
                  <th style={{ padding: '8px', border: '1px solid #dee2e6', textAlign: 'right' }}>享受产假天数</th>
                  <th style={{ padding: '8px', border: '1px solid #dee2e6', textAlign: 'left' }}>津贴发放方式</th>
                  <th style={{ padding: '8px', border: '1px solid #dee2e6', textAlign: 'right' }}>社保基数</th>
                  <th style={{ padding: '8px', border: '1px solid #dee2e6', textAlign: 'right' }}>津贴基数</th>
                  <th style={{ padding: '8px', border: '1px solid #dee2e6', textAlign: 'right' }}>日津贴</th>
                  <th style={{ padding: '8px', border: '1px solid #dee2e6', textAlign: 'right' }}>政府发放金额</th>
                  <th style={{ padding: '8px', border: '1px solid #dee2e6', textAlign: 'right' }}>员工应领取金额</th>
                  <th style={{ padding: '8px', border: '1px solid #dee2e6', textAlign: 'right' }}>公司应发工资</th>
                  <th style={{ padding: '8px', border: '1px solid #dee2e6', textAlign: 'right' }}>需补差金额</th>
                  <th style={{ padding: '8px', border: '1px solid #dee2e6', textAlign: 'right' }}>个人社保缴费</th>
                  <th style={{ padding: '8px', border: '1px solid #dee2e6', textAlign: 'right' }}>实际补差金额</th>
                  <th style={{ padding: '8px', border: '1px solid #dee2e6', textAlign: 'right' }}>员工实际可得</th>
                  <th style={{ padding: '8px', border: '1px solid #dee2e6', textAlign: 'left' }}>社保公积金扣除</th>
                  <th style={{ padding: '8px', border: '1px solid #dee2e6', textAlign: 'left' }}>减扣项</th>
                  <th style={{ padding: '8px', border: '1px solid #dee2e6', textAlign: 'left' }}>计算时间</th>
                </tr>
              </thead>
              <tbody>
                {historyData.map((result, index) => {
                  // 从breakdown中提取数据
                  const breakdown = result.breakdown || {};
                  const government = breakdown.government || {};
                  const employee = breakdown.employee || {};
                  const supplement = breakdown.supplement || {};

                  return (
                    <tr key={`${result.employeeDisplayName}_${result.calculatedAt}_${index}`} style={{ backgroundColor: index % 2 === 0 ? '#ffffff' : '#f8f9fa' }}>
                      <td style={{ padding: '8px', border: '1px solid #dee2e6' }}>{result.employeeDisplayName || ''}</td>
                      <td style={{ padding: '8px', border: '1px solid #dee2e6' }}>{result.selectedEmployee?.employeeId || ''}</td>
                      <td style={{ padding: '8px', border: '1px solid #dee2e6' }}>{result.city || ''}</td>
                      <td style={{ padding: '8px', border: '1px solid #dee2e6' }}>{result.calculatedPeriod?.startDate || ''}</td>
                      <td style={{ padding: '8px', border: '1px solid #dee2e6' }}>{result.calculatedPeriod?.endDate || ''}</td>
                      <td style={{ padding: '8px', border: '1px solid #dee2e6', textAlign: 'right' }}>{result.totalMaternityDays || 0}</td>
                      <td style={{ padding: '8px', border: '1px solid #dee2e6' }}>{result.paymentMethod || ''}</td>
                      <td style={{ padding: '8px', border: '1px solid #dee2e6', textAlign: 'right' }}>¥{result.socialInsuranceBase?.toLocaleString() || '0'}</td>
                      <td style={{ padding: '8px', border: '1px solid #dee2e6', textAlign: 'right' }}>¥{result.maternityAllowanceBase?.toLocaleString() || '0'}</td>
                      <td style={{ padding: '8px', border: '1px solid #dee2e6', textAlign: 'right' }}>¥{result.dailyAllowance?.toLocaleString() || '0'}</td>
                      <td style={{ padding: '8px', border: '1px solid #dee2e6', textAlign: 'right' }}>¥{government.formatted || '0'}</td>
                      <td style={{ padding: '8px', border: '1px solid #dee2e6', textAlign: 'right' }}>¥{employee.formatted || '0'}</td>
                      <td style={{ padding: '8px', border: '1px solid #dee2e6', textAlign: 'right' }}>¥{result.companyShouldPay?.toLocaleString() || '0'}</td>
                      <td style={{ padding: '8px', border: '1px solid #dee2e6', textAlign: 'right', color: supplement.adjustedAmount > 0 ? '#dc3545' : '#28a745' }}>
                        ¥{supplement.formattedAdjusted || '0'}
                      </td>
                      <td style={{ padding: '8px', border: '1px solid #dee2e6', textAlign: 'right' }}>¥{result.personalSocialSecurity?.toLocaleString() || '0'}</td>
                      <td style={{ padding: '8px', border: '1px solid #dee2e6', textAlign: 'right' }}>¥{supplement.formattedAdjusted || '0'}</td>
                      <td style={{ padding: '8px', border: '1px solid #dee2e6', textAlign: 'right' }}>¥{result.totalReceived?.toLocaleString() || '0'}</td>
                      <td style={{ padding: '8px', border: '1px solid #dee2e6', textAlign: 'right' }}>
                        ¥{result.totalActualDeduction?.toLocaleString() || '0'}
                      </td>
                      <td style={{ padding: '8px', border: '1px solid #dee2e6', textAlign: 'right' }}>
                        ¥{supplement.details?.totalDeductions?.toLocaleString() || '0'}
                      </td>
                      <td style={{ padding: '8px', border: '1px solid #dee2e6', textAlign: 'left' }}>
                        {result.calculatedAt ? new Date(result.calculatedAt).toLocaleString() : ''}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 空历史提示 */}
      {showHistory && historyData.length === 0 && (
        <div style={{ marginBottom: '24px', textAlign: 'center', padding: '40px', backgroundColor: '#f8f9fa', borderRadius: '8px', border: '1px solid #dee2e6' }}>
          <h4 style={{ color: '#6c757d', margin: '0 0 16px 0' }}>📭 暂无历史数据</h4>
          <p style={{ color: '#6c757d', margin: '0' }}>请在产假津贴计算页面进行计算，数据会按员工姓名自动保存到此处。</p>
          <button
            className="btn"
            onClick={() => setShowHistory(false)}
            style={{ marginTop: '16px', backgroundColor: '#6c757d' }}
          >
            关闭
          </button>
        </div>
      )}

      {/* 使用说明 */}
      <div style={{ 
        marginTop: '32px',
        padding: '20px',
        backgroundColor: '#f8f9fa',
        borderRadius: '8px',
        border: '1px solid #e9ecef'
      }}>
        <h4 style={{ margin: '0 0 16px 0', color: '#495057' }}>📋 使用说明</h4>
        <ol style={{ margin: '0', paddingLeft: '20px', color: '#6c757d' }}>
          <li style={{ marginBottom: '8px' }}>点击"下载Excel模板"获取标准格式的数据模板</li>
          <li style={{ marginBottom: '8px' }}>按照模板格式填写员工信息（必填字段不能为空）</li>
          <li style={{ marginBottom: '8px' }}>点击"选择Excel文件"上传填写好的数据文件</li>
          <li style={{ marginBottom: '8px' }}>系统会自动预览所有数据，确认无误后点击"开始批量处理"</li>
          <li style={{ marginBottom: '8px' }}>处理完成后可点击"导出结果"下载包含计算结果的Excel文件</li>
          <li style={{ marginBottom: '8px' }}>点击"🔄 重置"按钮可清空页面所有数据（包括批量结果和所有计算历史记录）</li>
          <li style={{ marginBottom: '8px' }}><strong>💡 新功能：</strong>点击"📜 读取计算历史"按钮可查看所有已保存的计算记录</li>
          <li style={{ marginBottom: '8px' }}>在产假津贴计算页面进行计算后，数据会按员工姓名自动保存到计算历史中</li>
          <li style={{ marginBottom: '8px' }}>历史记录包含完整的计算结果：产假津贴、工资、社保公积金、工会费、补差和返还金额</li>
          <li style={{ marginBottom: '8px' }}>查看历史记录后，可点击"📊 导出历史数据"按钮下载Excel文件</li>
          <li>导出的Excel文件包含：计算结果、错误信息、处理汇总三个工作表</li>
        </ol>
      </div>
    </div>
  );
};

export default BatchProcessor;
