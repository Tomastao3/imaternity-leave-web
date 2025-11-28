import React, { useState, useEffect } from 'react';
import {
  getMaternityRulesApi,
  addMaternityRuleApi,
  updateMaternityRuleApi,
  deleteMaternityRuleApi,
  importMaternityRulesApi
} from '../api/dataManagementApi';
import {
  MATERNITY_LEAVE_TYPES,
  generateMaternityRulesTemplate,
  parseExcelFile,
  exportDataToExcel,
  validateMaternityRule
} from '../utils/cityDataUtils';

const MaternityRulesManager = ({ selectedCity, onDataChange, onSaveAll }) => {
  const [rules, setRules] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingIndex, setEditingIndex] = useState(-1);
  const [inlineEditState, setInlineEditState] = useState({ index: -1, data: null });
  
  const [form, setForm] = useState({
    city: '',
    leaveType: MATERNITY_LEAVE_TYPES.LEGAL,
    miscarriageType: '',
    days: '',
    isExtendable: true,
    hasAllowance: true
  });

  useEffect(() => {
    loadRules();
  }, [selectedCity]);

  const loadRules = async () => {
    setIsLoading(true);
    try {
      const response = await getMaternityRulesApi({ city: selectedCity });
      if (response.ok) {
        setRules(response.data);
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
      city: selectedCity || '',
      leaveType: MATERNITY_LEAVE_TYPES.LEGAL,
      miscarriageType: '',
      days: '',
      isExtendable: true,
      hasAllowance: true
    });
    setEditingIndex(-1);
    setShowAddForm(false);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    const formData = {
      ...form,
      miscarriageType: form.leaveType === MATERNITY_LEAVE_TYPES.MISCARRIAGE ? (form.miscarriageType || '').trim() : '',
      days: parseInt(form.days),
      hasAllowance: form.hasAllowance === true
    };
    
    const validationErrors = validateMaternityRule(formData);
    if (validationErrors.length > 0) {
      showMessage('error', validationErrors.join(', '));
      return;
    }

    setIsLoading(true);
    try {
      let response;
      if (editingIndex >= 0) {
        response = await updateMaternityRuleApi({ index: editingIndex, rule: formData });
      } else {
        response = await addMaternityRuleApi({ rule: formData });
      }
      
      if (response.ok) {
        await loadRules();
        resetForm();
        if (onDataChange) onDataChange('maternity');
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
    const rule = rules[index];
    setForm({
      city: rule.city || '',
      leaveType: rule.leaveType || MATERNITY_LEAVE_TYPES.LEGAL,
      miscarriageType: rule.leaveType === MATERNITY_LEAVE_TYPES.MISCARRIAGE ? (rule.miscarriageType || '') : '',
      days: rule.days ?? '',
      isExtendable: rule.isExtendable !== undefined ? rule.isExtendable : true,
      hasAllowance: rule.hasAllowance !== false
    });
    setEditingIndex(index);
    setShowAddForm(true);
  };

  const handleDelete = async (index) => {
    if (!window.confirm('确定要删除这条数据吗？')) return;

    setIsLoading(true);
    try {
      const rule = rules[index];
      const globalIndex = rule._globalIndex !== undefined ? rule._globalIndex : index;
      const response = await deleteMaternityRuleApi({ index, globalIndex });
      if (response.ok) {
        await loadRules();
        if (onDataChange) onDataChange('maternity');
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
    setInlineEditState({ index, data: { ...rules[index] } });
  };

  const cancelInlineEdit = () => {
    setInlineEditState({ index: -1, data: null });
  };

  const handleInlineFieldChange = (field, value) => {
    setInlineEditState(prev => ({
      ...prev,
      data: (() => {
        const next = { ...prev.data, [field]: value };
        if (field === 'leaveType' && value !== MATERNITY_LEAVE_TYPES.MISCARRIAGE) {
          next.miscarriageType = '';
        }
        return next;
      })()
    }));
  };

  const handleInlineSave = async () => {
    if (inlineEditState.index < 0) return;
    
    const updated = {
      ...inlineEditState.data,
      days: parseInt(inlineEditState.data.days, 10) || 0,
      isExtendable: inlineEditState.data.isExtendable === true || inlineEditState.data.isExtendable === 'true',
      hasAllowance: inlineEditState.data.hasAllowance !== false,
      miscarriageType: inlineEditState.data.leaveType === MATERNITY_LEAVE_TYPES.MISCARRIAGE
        ? (inlineEditState.data.miscarriageType || '').trim()
        : ''
    };

    setIsLoading(true);
    try {
      const response = await updateMaternityRuleApi({ index: inlineEditState.index, rule: updated });
      if (response.ok) {
        await loadRules();
        cancelInlineEdit();
        if (onDataChange) onDataChange('maternity');
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
      const result = await parseExcelFile(file, 'maternity');
      
      if (result.errors && result.errors.length > 0) {
        const firstFew = result.errors.slice(0, 5).map(e => 
          `第${e.row}行: ${Array.isArray(e.errors) ? e.errors.join('; ') : e.errors}`
        ).join(' | ');
        showMessage('error', `导入失败：存在 ${result.errors.length} 行格式错误。示例：${firstFew}${result.errors.length > 5 ? ' ...' : ''}`);
        return;
      }

      const response = await importMaternityRulesApi({ rules: result.data });
      if (response.ok) {
        await loadRules();
        if (onDataChange) onDataChange('maternity');
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
    const filename = `产假规则${selectedCity ? `_${selectedCity}` : ''}.xlsx`;
    exportDataToExcel(rules, 'maternity', filename);
  };

  const handleDownloadTemplate = () => {
    generateMaternityRulesTemplate();
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
            {showAddForm ? '取消添加' : '添加产假规则'}
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
            <h3>{editingIndex >= 0 ? '编辑产假规则' : '添加产假规则'}</h3>
            <form onSubmit={handleSubmit}>
              <div className="form-grid form-grid-lg">
                <div className="form-group">
                  <label>城市 *</label>
                  <input
                    type="text"
                    value={form.city}
                    onChange={(e) => setForm({ ...form, city: e.target.value })}
                    required
                    placeholder="请输入城市名称"
                  />
                </div>
                <div className="form-group">
                  <label>产假类型 *</label>
                  <select
                    value={form.leaveType}
                    onChange={(e) => {
                      const nextType = e.target.value;
                      setForm(prev => ({
                        ...prev,
                        leaveType: nextType,
                        miscarriageType: nextType === MATERNITY_LEAVE_TYPES.MISCARRIAGE ? prev.miscarriageType : ''
                      }));
                    }}
                    required
                  >
                    {Object.values(MATERNITY_LEAVE_TYPES).map(type => (
                      <option key={type} value={type}>{type}</option>
                    ))}
                  </select>
                </div>
                {form.leaveType === MATERNITY_LEAVE_TYPES.MISCARRIAGE && (
                  <div className="form-group">
                    <label>流产类型 *</label>
                    <input
                      type="text"
                      value={form.miscarriageType}
                      onChange={(e) => setForm({ ...form, miscarriageType: e.target.value })}
                      placeholder="例如：妊娠未满4个月"
                      required
                    />
                  </div>
                )}
              </div>

              <div className="form-grid form-grid-lg">
                <div className="form-group">
                  <label>产假天数 *</label>
                  <input
                    type="number"
                    value={form.days}
                    onChange={(e) => setForm({ ...form, days: e.target.value })}
                    required
                    min="0"
                    placeholder="请输入天数"
                  />
                </div>
                <div className="form-group">
                  <label>是否遇法定节假日顺延</label>
                  <select
                    value={form.isExtendable ? 'true' : 'false'}
                    onChange={(e) => setForm({ ...form, isExtendable: e.target.value === 'true' })}
                  >
                    <option value="true">是</option>
                    <option value="false">否</option>
                  </select>
                </div>
                <div className="form-group">
                  <label>是否享受津贴</label>
                  <select
                    value={form.hasAllowance ? 'true' : 'false'}
                    onChange={(e) => setForm({ ...form, hasAllowance: e.target.value === 'true' })}
                  >
                    <option value="true">是</option>
                    <option value="false">否</option>
                  </select>
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
              <th>城市</th>
              <th>产假类型</th>
              <th>流产类型</th>
              <th>产假天数</th>
              <th>是否遇法定节假日顺延</th>
              <th>是否享受津贴</th>
              <th>操作</th>
            </tr>
          </thead>
          <tbody>
            {rules.map((rule, index) => (
              <tr key={index}>
                <td>
                  {inlineEditState.index === index ? (
                    <input
                      value={inlineEditState.data.city}
                      onChange={(e) => handleInlineFieldChange('city', e.target.value)}
                    />
                  ) : (
                    rule.city
                  )}
                </td>
                <td>
                  {inlineEditState.index === index ? (
                    <select
                      value={inlineEditState.data.leaveType}
                      onChange={(e) => handleInlineFieldChange('leaveType', e.target.value)}
                    >
                      {Object.values(MATERNITY_LEAVE_TYPES).map(type => (
                        <option key={type} value={type}>{type}</option>
                      ))}
                    </select>
                  ) : (
                    rule.leaveType
                  )}
                </td>
                <td>
                  {inlineEditState.index === index ? (
                    inlineEditState.data.leaveType === MATERNITY_LEAVE_TYPES.MISCARRIAGE ? (
                      <input
                        value={inlineEditState.data.miscarriageType || ''}
                        onChange={(e) => handleInlineFieldChange('miscarriageType', e.target.value)}
                      />
                    ) : (
                      <span style={{ color: '#6c757d' }}>—</span>
                    )
                  ) : (
                    rule.leaveType === MATERNITY_LEAVE_TYPES.MISCARRIAGE
                      ? (rule.miscarriageType || '')
                      : '—'
                  )}
                </td>
                <td>
                  {inlineEditState.index === index ? (
                    <input
                      type="number"
                      value={inlineEditState.data.days}
                      onChange={(e) => handleInlineFieldChange('days', e.target.value)}
                      style={{ width: '80px' }}
                    />
                  ) : (
                    `${rule.days}天`
                  )}
                </td>
                <td>
                  {inlineEditState.index === index ? (
                    <select
                      value={inlineEditState.data.isExtendable ? 'true' : 'false'}
                      onChange={(e) => handleInlineFieldChange('isExtendable', e.target.value === 'true')}
                    >
                      <option value="true">是</option>
                      <option value="false">否</option>
                    </select>
                  ) : (
                  rule.isExtendable ? '是' : '否'
                )}
              </td>
              <td>
                {inlineEditState.index === index ? (
                  <select
                    value={inlineEditState.data.hasAllowance ? 'true' : 'false'}
                    onChange={(e) => handleInlineFieldChange('hasAllowance', e.target.value === 'true')}
                  >
                    <option value="true">是</option>
                    <option value="false">否</option>
                  </select>
                ) : (
                  rule.hasAllowance === false ? '否' : '是'
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
        {rules.length === 0 && (
          <div className="empty-state">
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

export default MaternityRulesManager;
