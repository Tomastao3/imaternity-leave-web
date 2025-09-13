import React, { useState } from 'react';
import { generateEmployeeTemplate, readExcelFile, exportResults } from '../utils/excelUtils';
import { processBatchData } from '../utils/batchCalculations';

const BatchProcessor = () => {
  const [selectedFile, setSelectedFile] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [results, setResults] = useState(null);
  const [errors, setErrors] = useState([]);
  const [previewData, setPreviewData] = useState([]);

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
      setPreviewData(data.slice(0, 5)); // 预览前5条数据
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

  // 重置
  const handleReset = () => {
    setSelectedFile(null);
    setResults(null);
    setErrors([]);
    setPreviewData([]);
    // 清空文件输入
    const fileInput = document.getElementById('excel-file-input');
    if (fileInput) {
      fileInput.value = '';
    }
  };

  return (
    <div>
      <h3>批量处理</h3>
      <p style={{ color: '#6c757d', marginBottom: '24px' }}>
        支持Excel批量导入员工数据，一键计算产假周期、津贴补差和社保扣除
      </p>

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
            <button 
              className="btn" 
              onClick={handleExportResults}
              style={{ backgroundColor: '#28a745' }}
            >
              📊 导出结果
            </button>
          )}
          
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
          <h4>数据预览（前5条）</h4>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ 
              width: '100%', 
              borderCollapse: 'collapse',
              fontSize: '14px'
            }}>
              <thead>
                <tr style={{ backgroundColor: '#f8f9fa' }}>
                  <th style={{ padding: '8px', border: '1px solid #dee2e6', textAlign: 'left' }}>姓名</th>
                  <th style={{ padding: '8px', border: '1px solid #dee2e6', textAlign: 'left' }}>编号</th>
                  <th style={{ padding: '8px', border: '1px solid #dee2e6', textAlign: 'left' }}>部门</th>
                  <th style={{ padding: '8px', border: '1px solid #dee2e6', textAlign: 'left' }}>开始日期</th>
                  <th style={{ padding: '8px', border: '1px solid #dee2e6', textAlign: 'left' }}>员工产前12个月的月均工资</th>
                  <th style={{ padding: '8px', border: '1px solid #dee2e6', textAlign: 'left' }}>是否难产</th>
                  <th style={{ padding: '8px', border: '1px solid #dee2e6', textAlign: 'left' }}>胎数</th>
                  <th style={{ padding: '8px', border: '1px solid #dee2e6', textAlign: 'left' }}>妊娠时间段</th>
                </tr>
              </thead>
              <tbody>
                {previewData.map((row, index) => (
                  <tr key={index}>
                    <td style={{ padding: '8px', border: '1px solid #dee2e6' }}>{row.name}</td>
                    <td style={{ padding: '8px', border: '1px solid #dee2e6' }}>{row.employeeId}</td>
                    <td style={{ padding: '8px', border: '1px solid #dee2e6' }}>{row.department}</td>
                    <td style={{ padding: '8px', border: '1px solid #dee2e6' }}>{row.startDate}</td>
                    <td style={{ padding: '8px', border: '1px solid #dee2e6' }}>{row.employeeBasicSalary}</td>
                    <td style={{ padding: '8px', border: '1px solid #dee2e6' }}>{row.isDifficultBirth ? '是' : '否'}</td>
                    <td style={{ padding: '8px', border: '1px solid #dee2e6' }}>{row.numberOfBabies}</td>
                    <td style={{ padding: '8px', border: '1px solid #dee2e6' }}>{row.pregnancyPeriod}</td>
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

      {/* 处理结果表格 */}
      {results && results.length > 0 && (
        <div style={{ marginBottom: '24px' }}>
          <h4>批量处理结果 ({results.length}条)</h4>
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
              minWidth: '1200px'
            }}>
              <thead style={{ position: 'sticky', top: 0, backgroundColor: '#f8f9fa', zIndex: 1 }}>
                <tr>
                  <th style={{ padding: '12px 8px', border: '1px solid #dee2e6', textAlign: 'left', fontWeight: 'bold' }}>姓名</th>
                  <th style={{ padding: '12px 8px', border: '1px solid #dee2e6', textAlign: 'left', fontWeight: 'bold' }}>工号</th>
                  <th style={{ padding: '12px 8px', border: '1px solid #dee2e6', textAlign: 'left', fontWeight: 'bold' }}>城市</th>
                  <th style={{ padding: '12px 8px', border: '1px solid #dee2e6', textAlign: 'left', fontWeight: 'bold' }}>开始日期</th>
                  <th style={{ padding: '12px 8px', border: '1px solid #dee2e6', textAlign: 'left', fontWeight: 'bold' }}>产假结束日期</th>
                  <th style={{ padding: '12px 8px', border: '1px solid #dee2e6', textAlign: 'right', fontWeight: 'bold' }}>享受生育津贴天数</th>
                  <th style={{ padding: '12px 8px', border: '1px solid #dee2e6', textAlign: 'right', fontWeight: 'bold' }}>政府发放金额</th>
                  <th style={{ padding: '12px 8px', border: '1px solid #dee2e6', textAlign: 'right', fontWeight: 'bold' }}>需补差金额</th>
                  <th style={{ padding: '12px 8px', border: '1px solid #dee2e6', textAlign: 'right', fontWeight: 'bold' }}>个人社保缴费</th>
                </tr>
              </thead>
              <tbody>
                {results.map((result, index) => (
                  <tr key={index} style={{ backgroundColor: index % 2 === 0 ? '#ffffff' : '#f8f9fa' }}>
                    <td style={{ padding: '8px', border: '1px solid #dee2e6' }}>{result.name}</td>
                    <td style={{ padding: '8px', border: '1px solid #dee2e6' }}>{result.employeeId}</td>
                    <td style={{ padding: '8px', border: '1px solid #dee2e6' }}>{result.city}</td>
                    <td style={{ padding: '8px', border: '1px solid #dee2e6' }}>{result.startDate}</td>
                    <td style={{ padding: '8px', border: '1px solid #dee2e6' }}>{result.endDate}</td>
                    <td style={{ padding: '8px', border: '1px solid #dee2e6', textAlign: 'right' }}>{result.totalMaternityDays || result.maternityDays || 0}</td>
                    <td style={{ padding: '8px', border: '1px solid #dee2e6', textAlign: 'right' }}>¥{(result.governmentAllowance || result.maternityAllowance || 0).toLocaleString()}</td>
                    <td style={{ padding: '8px', border: '1px solid #dee2e6', textAlign: 'right', color: (result.supplementAmount || result.companySupplement || 0) > 0 ? '#dc3545' : '#28a745' }}>
                      ¥{(result.supplementAmount || result.companySupplement || 0).toLocaleString()}
                    </td>
                    <td style={{ padding: '8px', border: '1px solid #dee2e6', textAlign: 'right', color: '#dc3545' }}>
                      ¥{(result.personalSocialSecurity || result.totalActualDeduction || 0).toLocaleString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 错误信息 */}
      {errors.length > 0 && (
        <div style={{ marginBottom: '24px' }}>
          <h4 style={{ color: '#dc3545' }}>处理错误 ({errors.length}条)</h4>
          <div style={{ 
            maxHeight: '300px', 
            overflowY: 'auto',
            border: '1px solid #f5c6cb',
            borderRadius: '8px'
          }}>
            {errors.map((error, index) => (
              <div 
                key={index}
                style={{ 
                  padding: '12px', 
                  backgroundColor: index % 2 === 0 ? '#fff5f5' : '#ffffff',
                  borderBottom: index < errors.length - 1 ? '1px solid #f5c6cb' : 'none'
                }}
              >
                <div style={{ fontWeight: 'bold', color: '#721c24', marginBottom: '4px' }}>
                  第{error.row}行 - {error.name} ({error.employeeId})
                </div>
                <div style={{ color: '#721c24', fontSize: '14px' }}>
                  {error.errors.join('；')}
                </div>
              </div>
            ))}
          </div>
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
          <li style={{ marginBottom: '8px' }}>系统会自动预览前5条数据，确认无误后点击"开始批量处理"</li>
          <li style={{ marginBottom: '8px' }}>处理完成后可点击"导出结果"下载包含计算结果的Excel文件</li>
          <li>导出的Excel文件包含：计算结果、错误信息、处理汇总三个工作表</li>
        </ol>
      </div>
    </div>
  );
};

export default BatchProcessor;
