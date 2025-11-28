import React, { useState, useEffect } from 'react';
import {
  getEmployeesApi,
  addEmployeeApi,
  updateEmployeeApi,
  deleteEmployeeApi,
  importEmployeesApi
} from '../api/dataManagementApi';
import {
  generateEmployeeTemplate,
  parseExcelFile,
  exportDataToExcel,
  validateEmployee
} from '../utils/cityDataUtils';

const EmployeeInfoManager = ({ selectedCity, onDataChange, onSaveAll }) => {
  const [employees, setEmployees] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingIndex, setEditingIndex] = useState(-1);
  const [inlineEditState, setInlineEditState] = useState({ index: -1, data: null });
  
  const [form, setForm] = useState({
    employeeId: '',
    employeeName: '',
    personalSSMonthly: '0',
    basicSalary: '0',
    socialSecurityBase: '0',
    city: ''
  });

  useEffect(() => {
    loadEmployees();
  }, [selectedCity]);

  const loadEmployees = async () => {
    setIsLoading(true);
    try {
      const response = await getEmployeesApi({ city: selectedCity });
      if (response.ok) {
        setEmployees(response.data);
      } else {
        showMessage('error', response.error);
      }
    } catch (error) {
      showMessage('error', `加载失败: ${error.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  const showMessage = (type, text) => {
    setMessage({ type, text });
    setTimeout(() => setMessage({ type: '', text: '' }), 5000);
  };

  const resetForm = () => {
    setForm({
      employeeId: '',
      employeeName: '',
      personalSSMonthly: '0',
      basicSalary: '0',
      socialSecurityBase: '0',
      city: selectedCity || ''
    });
    setEditingIndex(-1);
    setShowAddForm(false);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    const personalSS = form.personalSSMonthly !== '' && form.personalSSMonthly !== undefined
      ? parseFloat(form.personalSSMonthly)
      : 0;
    const basic = form.basicSalary !== '' && form.basicSalary !== undefined
      ? parseFloat(form.basicSalary)
      : 0;
    const ssb = form.socialSecurityBase !== '' && form.socialSecurityBase !== undefined
      ? parseFloat(form.socialSecurityBase)
      : 0;
    
    const formData = {
      ...form,
      personalSSMonthly: personalSS,
      basicSalary: basic,
      socialSecurityBase: ssb
    };
    
    const validationErrors = validateEmployee(formData);
    if (validationErrors.length > 0) {
      showMessage('error', validationErrors.join(', '));
      return;
    }

    setIsLoading(true);
    try {
      let response;
      if (editingIndex >= 0) {
        response = await updateEmployeeApi({ index: editingIndex, employee: formData });
        showMessage('success', '更新成功');
      } else {
        response = await addEmployeeApi({ employee: formData });
        showMessage('success', '添加成功');
      }
      
      if (response.ok) {
        await loadEmployees();
        resetForm();
        if (onDataChange) onDataChange();
      } else {
        showMessage('error', response.error);
      }
    } catch (error) {
      showMessage('error', `操作失败: ${error.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleEdit = (index) => {
    setForm({ ...employees[index] });
    setEditingIndex(index);
    setShowAddForm(true);
  };

  const handleDelete = async (index) => {
    if (!window.confirm('确定要删除这条数据吗？')) return;

    setIsLoading(true);
    try {
      const response = await deleteEmployeeApi({ index });
      if (response.ok) {
        await loadEmployees();
        showMessage('success', '删除成功');
        if (onDataChange) onDataChange();
      } else {
        showMessage('error', response.error);
      }
    } catch (error) {
      showMessage('error', `删除失败: ${error.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  const beginInlineEdit = (index) => {
    setInlineEditState({ index, data: { ...employees[index] } });
  };

  const cancelInlineEdit = () => {
    setInlineEditState({ index: -1, data: null });
  };

  const handleInlineFieldChange = (field, value) => {
    setInlineEditState(prev => ({
      ...prev,
      data: {
        ...prev.data,
        [field]: value
      }
    }));
  };

  const handleInlineSave = async () => {
    if (inlineEditState.index < 0) return;
    
    const updated = {
      ...inlineEditState.data,
      personalSSMonthly: parseFloat(inlineEditState.data.personalSSMonthly) || 0,
      basicSalary: parseFloat(inlineEditState.data.basicSalary) || 0,
      socialSecurityBase: parseFloat(inlineEditState.data.socialSecurityBase) || 0
    };

    setIsLoading(true);
    try {
      const response = await updateEmployeeApi({ index: inlineEditState.index, employee: updated });
      if (response.ok) {
        await loadEmployees();
        cancelInlineEdit();
        showMessage('success', '更新成功');
        if (onDataChange) onDataChange();
      } else {
        showMessage('error', response.error);
      }
    } catch (error) {
      showMessage('error', `保存失败: ${error.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleFileImport = async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    setIsLoading(true);
    try {
      const result = await parseExcelFile(file, 'employee');
      
      if (result.errors && result.errors.length > 0) {
        const firstFew = result.errors.slice(0, 5).map(e => 
          `第${e.row}行: ${Array.isArray(e.errors) ? e.errors.join('; ') : e.errors}`
        ).join(' | ');
        showMessage('error', `导入失败：存在 ${result.errors.length} 行格式错误。示例：${firstFew}${result.errors.length > 5 ? ' ...' : ''}`);
        return;
      }

      const response = await importEmployeesApi({ employees: result.data });
      if (response.ok) {
        await loadEmployees();
        if (onDataChange) onDataChange();
      } else {
        showMessage('error', response.error);
      }
    } catch (error) {
      showMessage('error', `导入失败: ${error.message}`);
    } finally {
      setIsLoading(false);
      event.target.value = '';
    }
  };

  const handleExport = () => {
    const filename = `员工信息${selectedCity ? `_${selectedCity}` : ''}.xlsx`;
    exportDataToExcel(employees, 'employee', filename);
    showMessage('success', '导出成功');
  };

  const handleDownloadTemplate = () => {
    generateEmployeeTemplate();
    showMessage('success', '模板下载成功');
  };

  return (
    <div className="manager-section">
      {/* Message Display */}
      {message.text && (
        <div className={`message message-${message.type}`}>
          {message.text}
        </div>
      )}

      {/* 工具栏 */}
      <div className="toolbar">
        <div className="toolbar-left">
          <button onClick={() => setShowAddForm(!showAddForm)} className="btn-primary">
            {showAddForm ? '取消添加' : '添加员工信息'}
          </button>
        </div>
        
        <div className="toolbar-right">
          <button onClick={handleDownloadTemplate} className="btn-secondary">
            📥 下载模板
          </button>
          
          <label className="btn-secondary file-input-label">
            📤 导入数据
            <input
              type="file"
              accept=".xlsx,.xls"
              onChange={handleFileImport}
              style={{ display: 'none' }}
            />
          </label>
          
          <button onClick={handleExport} className="btn-secondary">
            📊 导出数据
          </button>

        </div>
      </div>

      {/* Add/Edit Form */}
      {showAddForm && (
        <div className="form-section">
          <div className="form-container">
            <h3>{editingIndex >= 0 ? '编辑员工信息' : '添加员工信息'}</h3>
            <form onSubmit={handleSubmit}>
              <div className="form-grid form-grid-lg">
                <div className="form-group">
                  <label>编号 *</label>
                  <input
                    type="text"
                    value={form.employeeId}
                    onChange={(e) => setForm({ ...form, employeeId: e.target.value })}
                    required
                    placeholder="请输入员工编号"
                  />
                </div>
                <div className="form-group">
                  <label>员工姓名 *</label>
                  <input
                    type="text"
                    value={form.employeeName}
                    onChange={(e) => setForm({ ...form, employeeName: e.target.value })}
                    required
                    placeholder="请输入员工姓名"
                  />
                </div>
              </div>

              <div className="form-grid form-grid-lg">
                <div className="form-group">
                  <label>个人部分社保公积金合计</label>
                  <input
                    type="number"
                    value={form.personalSSMonthly}
                    onChange={(e) => setForm({ ...form, personalSSMonthly: e.target.value })}
                    min="0"
                    step="0.01"
                    placeholder="默认为0"
                  />
                </div>
                <div className="form-group">
                  <label>产前12月平均工资</label>
                  <input
                    type="number"
                    value={form.basicSalary}
                    onChange={(e) => setForm({ ...form, basicSalary: e.target.value })}
                    min="0"
                    step="0.01"
                    placeholder="默认为0"
                  />
                </div>
              </div>

              <div className="form-grid form-grid-lg">
                <div className="form-group">
                  <label>基本工资</label>
                  <input
                    type="number"
                    value={form.socialSecurityBase}
                    onChange={(e) => setForm({ ...form, socialSecurityBase: e.target.value })}
                    min="0"
                    step="0.01"
                    placeholder="默认为0"
                  />
                </div>
                <div className="form-group">
                  <label>城市 *</label>
                  <input
                    type="text"
                    value={form.city}
                    onChange={(e) => setForm({ ...form, city: e.target.value })}
                    required
                    placeholder="请输入城市"
                  />
                </div>
              </div>

              <div className="form-actions">
                <button type="submit" className="btn-primary" disabled={isLoading}>
                  {editingIndex >= 0 ? '更新' : '添加'}
                </button>
                <button type="button" onClick={resetForm} className="btn-secondary">
                  取消
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Data Table */}
      <div className="data-table">
        <table>
          <thead>
            <tr>
              <th>编号</th>
              <th>员工姓名</th>
              <th>产前12月平均工资</th>
              <th>基本工资</th>
              <th>个人部分社保公积金合计</th>
              <th>城市</th>
              <th>操作</th>
            </tr>
          </thead>
          <tbody>
            {employees.map((emp, index) => (
              <tr key={index}>
                <td>
                  {inlineEditState.index === index ? (
                    <input
                      value={inlineEditState.data.employeeId}
                      onChange={(e) => handleInlineFieldChange('employeeId', e.target.value)}
                    />
                  ) : (
                    emp.employeeId
                  )}
                </td>
                <td>
                  {inlineEditState.index === index ? (
                    <input
                      value={inlineEditState.data.employeeName}
                      onChange={(e) => handleInlineFieldChange('employeeName', e.target.value)}
                    />
                  ) : (
                    emp.employeeName
                  )}
                </td>
                <td>
                  {inlineEditState.index === index ? (
                    <input
                      type="number"
                      value={inlineEditState.data.basicSalary}
                      onChange={(e) => handleInlineFieldChange('basicSalary', e.target.value)}
                      style={{ width: '100px' }}
                    />
                  ) : (
                    `¥${(emp.basicSalary || 0).toLocaleString()}`
                  )}
                </td>
                <td>
                  {inlineEditState.index === index ? (
                    <input
                      type="number"
                      value={inlineEditState.data.socialSecurityBase}
                      onChange={(e) => handleInlineFieldChange('socialSecurityBase', e.target.value)}
                      style={{ width: '100px' }}
                    />
                  ) : (
                    `¥${(emp.socialSecurityBase || 0).toLocaleString()}`
                  )}
                </td>
                <td>
                  {inlineEditState.index === index ? (
                    <input
                      type="number"
                      value={inlineEditState.data.personalSSMonthly}
                      onChange={(e) => handleInlineFieldChange('personalSSMonthly', e.target.value)}
                      style={{ width: '100px' }}
                    />
                  ) : (
                    `¥${(emp.personalSSMonthly || 0).toLocaleString()}`
                  )}
                </td>
                <td>
                  {inlineEditState.index === index ? (
                    <input
                      value={inlineEditState.data.city}
                      onChange={(e) => handleInlineFieldChange('city', e.target.value)}
                    />
                  ) : (
                    emp.city
                  )}
                </td>
                <td>
                  {inlineEditState.index === index ? (
                    <div className="inline-actions">
                      <button className="btn-primary" onClick={handleInlineSave}>保存</button>
                      <button className="btn-secondary" onClick={cancelInlineEdit}>取消</button>
                    </div>
                  ) : (
                    <div className="inline-actions">
                      <button onClick={() => beginInlineEdit(index)} className="btn-edit">编辑</button>
                      <button onClick={() => handleDelete(index)} className="btn-delete">删除</button>
                    </div>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {employees.length === 0 && (
          <div className="empty-state">
            <p>暂无数据</p>
          </div>
        )}
      </div>

      {/* Loading Overlay */}
      {isLoading && (
        <div className="loading">
          <div className="loading-spinner"></div>
          <span>处理中...</span>
        </div>
      )}
    </div>
  );
};

export default EmployeeInfoManager;
