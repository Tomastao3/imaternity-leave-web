import React, { useState, useEffect, useRef } from 'react';
import {
  getAllowanceRulesApi,
  addAllowanceRuleApi,
  updateAllowanceRuleApi,
  deleteAllowanceRuleApi,
  importAllowanceRulesApi
} from '../api/dataManagementApi';
import {
  ACCOUNT_TYPES,
  generateAllowanceRulesTemplate,
  parseExcelFile,
  exportDataToExcel,
  validateAllowanceRule
} from '../utils/cityDataUtils';

const CALCULATION_BASE_OPTIONS = ['平均工资', '平均缴费工资'];

const AllowanceRulesManager = ({ selectedCity, onDataChange, onSaveAll }) => {
  const [rules, setRules] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingIndex, setEditingIndex] = useState(-1);
  const [inlineEditState, setInlineEditState] = useState({ index: -1, data: null });
  const [hoveredPolicy, setHoveredPolicy] = useState({
    type: '',
    content: '',
    city: '',
    position: { top: 0, left: 0 },
    width: 520,
    placement: 'above'
  });
  const tooltipHideTimer = useRef(null);
  
  const [form, setForm] = useState({
    city: '',
    socialAverageWage: '',
    companyAverageWage: '',
    companyContributionWage: '',
    calculationBase: CALCULATION_BASE_OPTIONS[0],
    accountType: ACCOUNT_TYPES.COMPANY,
    maternityPolicy: '',
    allowancePolicy: ''
  });

  useEffect(() => {
    loadRules();
  }, [selectedCity]);

  const loadRules = async () => {
    setIsLoading(true);
    try {
      const response = await getAllowanceRulesApi({ city: selectedCity });
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
      socialAverageWage: '',
      companyAverageWage: '',
      companyContributionWage: '',
      calculationBase: CALCULATION_BASE_OPTIONS[0],
      accountType: ACCOUNT_TYPES.COMPANY,
      maternityPolicy: '',
      allowancePolicy: ''
    });
    setEditingIndex(-1);
    setShowAddForm(false);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    const formData = {
      ...form,
      socialAverageWage: parseFloat(form.socialAverageWage),
      companyAverageWage: parseFloat(form.companyAverageWage),
      companyContributionWage: parseFloat(form.companyContributionWage) || 0,
      calculationBase: form.calculationBase || CALCULATION_BASE_OPTIONS[0],
      maternityPolicy: form.maternityPolicy?.trim() || '',
      allowancePolicy: form.allowancePolicy?.trim() || ''
    };
    
    const validationErrors = validateAllowanceRule(formData);
    if (validationErrors.length > 0) {
      showMessage('error', validationErrors.join(', '));
      return;
    }

    setIsLoading(true);
    try {
      let response;
      if (editingIndex >= 0) {
        response = await updateAllowanceRuleApi({ index: editingIndex, rule: formData });
      } else {
        response = await addAllowanceRuleApi({ rule: formData });
      }
      
      if (response.ok) {
        await loadRules();
        resetForm();
        if (onDataChange) onDataChange('allowance');
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
      ...rule,
      socialAverageWage: rule.socialAverageWage ?? '',
      companyAverageWage: rule.companyAverageWage ?? '',
      companyContributionWage: rule.companyContributionWage ?? '',
      calculationBase: rule.calculationBase || CALCULATION_BASE_OPTIONS[0],
      maternityPolicy: rule.maternityPolicy ?? '',
      allowancePolicy: rule.allowancePolicy ?? ''
    });
    setEditingIndex(index);
    setShowAddForm(true);
  };

  const handleDelete = async (index) => {
    if (!window.confirm('确定要删除这条数据吗？')) return;

    setIsLoading(true);
    try {
      const response = await deleteAllowanceRuleApi({ index });
      if (response.ok) {
        await loadRules();
        if (onDataChange) onDataChange('allowance');
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
    const rule = rules[index];
    setInlineEditState({
      index,
      data: {
        ...rule,
        calculationBase: rule.calculationBase || CALCULATION_BASE_OPTIONS[0],
        maternityPolicy: rule.maternityPolicy ?? '',
        allowancePolicy: rule.allowancePolicy ?? ''
      }
    });
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

  const truncatePolicyText = (text) => {
    if (!text) return '—';
    return text.length > 8 ? `${text.slice(0, 8)}...` : text;
  };

  const cancelHideTooltip = () => {
    if (tooltipHideTimer.current) {
      clearTimeout(tooltipHideTimer.current);
      tooltipHideTimer.current = null;
    }
  };

  const resetHoveredPolicy = () => {
    setHoveredPolicy({
      type: '',
      content: '',
      city: '',
      position: { top: 0, left: 0 },
      width: 520,
      placement: 'above'
    });
  };

  const showPolicyTooltip = ({ event, type, content, city }) => {
    if (!content) return;
    cancelHideTooltip();
    const rect = event.currentTarget.getBoundingClientRect();
    const margin = 16;
    const viewportWidth = window.innerWidth || document.documentElement.clientWidth || 1024;
    const viewportHeight = window.innerHeight || document.documentElement.clientHeight || 768;
    const maxWidth = 520;
    const width = Math.min(maxWidth, viewportWidth - margin * 2);
    const nativeEvent = event.nativeEvent || event;
    const hasPointer = nativeEvent && typeof nativeEvent.clientX === 'number' && typeof nativeEvent.clientY === 'number';

    const pointerX = hasPointer ? nativeEvent.clientX : rect.left + rect.width / 2;
    const pointerY = hasPointer ? nativeEvent.clientY : rect.bottom;

    const horizontalOffset = 12;
    const verticalOffset = 12;
    let left = pointerX + horizontalOffset;
    if (left + width + margin > viewportWidth) {
      left = pointerX - width - horizontalOffset;
    }
    if (left < margin) left = margin;
    if (left + width + margin > viewportWidth) left = viewportWidth - width - margin;

    const preferredTop = pointerY - verticalOffset;
    const estimatedHeight = Math.min(0.8 * viewportHeight, 560);
    const fitsAbove = pointerY - estimatedHeight - verticalOffset >= margin;
    let top = preferredTop;
    let placement = 'above';

    if (!fitsAbove) {
      const belowTop = pointerY + verticalOffset;
      const overflowBottom = belowTop + estimatedHeight > viewportHeight - margin;
      top = overflowBottom
        ? Math.max(viewportHeight - estimatedHeight - margin, margin)
        : belowTop;
      placement = 'below';
    }

    setHoveredPolicy({ type, content, city, position: { top, left }, width, placement });
  };

  const hidePolicyTooltip = () => {
    cancelHideTooltip();
    tooltipHideTimer.current = setTimeout(() => {
      resetHoveredPolicy();
    }, 120);
  };

  const instantHidePolicyTooltip = () => {
    cancelHideTooltip();
    resetHoveredPolicy();
  };

  const handleInlineSave = async () => {
    if (inlineEditState.index < 0) return;
    
    const updated = {
      ...inlineEditState.data,
      socialAverageWage: parseFloat(inlineEditState.data.socialAverageWage) || 0,
      companyAverageWage: parseFloat(inlineEditState.data.companyAverageWage) || 0,
      companyContributionWage: parseFloat(inlineEditState.data.companyContributionWage) || 0,
      calculationBase: inlineEditState.data.calculationBase || CALCULATION_BASE_OPTIONS[0],
      maternityPolicy: inlineEditState.data.maternityPolicy?.trim() || '',
      allowancePolicy: inlineEditState.data.allowancePolicy?.trim() || ''
    };

    setIsLoading(true);
    try {
      const response = await updateAllowanceRuleApi({ index: inlineEditState.index, rule: updated });
      if (response.ok) {
        await loadRules();
        cancelInlineEdit();
        if (onDataChange) onDataChange('allowance');
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
      const result = await parseExcelFile(file, 'allowance');
      
      if (result.errors && result.errors.length > 0) {
        const firstFew = result.errors.slice(0, 5).map(e => 
          `第${e.row}行: ${Array.isArray(e.errors) ? e.errors.join('; ') : e.errors}`
        ).join(' | ');
        showMessage('error', `导入失败：存在 ${result.errors.length} 行格式错误。示例：${firstFew}${result.errors.length > 5 ? ' ...' : ''}`);
        return;
      }

      const response = await importAllowanceRulesApi({ rules: result.data });
      if (response.ok) {
        await loadRules();
        if (onDataChange) onDataChange('allowance');
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
    const filename = `津贴规则${selectedCity ? `_${selectedCity}` : ''}.xlsx`;
    exportDataToExcel(rules, 'allowance', filename);
  };

  const handleDownloadTemplate = () => {
    generateAllowanceRulesTemplate();
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
            {showAddForm ? '取消添加' : '添加津贴规则'}
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
          <h3>{editingIndex >= 0 ? '编辑津贴规则' : '添加津贴规则'}</h3>
          <form onSubmit={handleSubmit}>
            <div className="form-row">
              <label>
                城市 *
                <input
                  type="text"
                  value={form.city}
                  onChange={(e) => setForm({ ...form, city: e.target.value })}
                  required
                />
              </label>
              <label>
                社平工资 *
                <input
                  type="number"
                  value={form.socialAverageWage}
                  onChange={(e) => setForm({ ...form, socialAverageWage: e.target.value })}
                  required
                  min="0"
                  step="0.01"
                />
              </label>
            </div>
            <div className="form-row">
              <label>
                津贴计算基数 *
                <input
                  type="number"
                  value={form.companyAverageWage}
                  onChange={(e) => setForm({ ...form, companyAverageWage: e.target.value })}
                  required
                  min="0"
                  step="0.01"
                />
              </label>
            </div>
            <div className="form-row">
              <label>
                津贴基数类型
                <select
                  value={form.calculationBase}
                  onChange={(e) => setForm({ ...form, calculationBase: e.target.value })}
                >
                  {CALCULATION_BASE_OPTIONS.map(option => (
                    <option key={option} value={option}>{option}</option>
                  ))}
                </select>
              </label>
              <label>
                津贴发放方式
                <select
                  value={form.accountType}
                  onChange={(e) => setForm({ ...form, accountType: e.target.value })}
                >
                  {Object.values(ACCOUNT_TYPES).map(type => (
                    <option key={type} value={type}>{type}</option>
                  ))}
                </select>
              </label>
            </div>
            <div className="form-row">
              <label>
                产假政策
                <textarea
                  value={form.maternityPolicy}
                  onChange={(e) => setForm({ ...form, maternityPolicy: e.target.value })}
                  placeholder="请输入产假政策概述"
                  rows={3}
                  style={{ height: '96px', resize: 'none' }}
                />
              </label>
              <label>
                津贴政策
                <textarea
                  value={form.allowancePolicy}
                  onChange={(e) => setForm({ ...form, allowancePolicy: e.target.value })}
                  placeholder="请输入津贴政策说明"
                  rows={3}
                  style={{ height: '96px', resize: 'none' }}
                />
              </label>
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
      )}

      {/* Data Table */}
      <div className="data-table">
        <table>
          <thead>
            <tr>
              <th>城市</th>
              <th>社平工资</th>
              <th>津贴计算基数</th>
              <th>津贴基数类型</th>
              <th>津贴发放方式</th>
              <th>产假政策</th>
              <th>津贴政策</th>
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
                    <input
                      type="number"
                      value={inlineEditState.data.socialAverageWage}
                      onChange={(e) => handleInlineFieldChange('socialAverageWage', e.target.value)}
                      style={{ width: '120px' }}
                    />
                  ) : (
                    `¥${rule.socialAverageWage.toLocaleString()}`
                  )}
                </td>
                <td>
                  {inlineEditState.index === index ? (
                    <input
                      type="number"
                      value={inlineEditState.data.companyAverageWage}
                      onChange={(e) => handleInlineFieldChange('companyAverageWage', e.target.value)}
                      style={{ width: '120px' }}
                    />
                  ) : (
                    `¥${rule.companyAverageWage.toLocaleString()}`
                  )}
                </td>
                <td>
                  {inlineEditState.index === index ? (
                    <select
                      value={inlineEditState.data.calculationBase || CALCULATION_BASE_OPTIONS[0]}
                      onChange={(e) => handleInlineFieldChange('calculationBase', e.target.value)}
                    >
                      {CALCULATION_BASE_OPTIONS.map(option => (
                        <option key={option} value={option}>{option}</option>
                      ))}
                    </select>
                  ) : (
                    rule.calculationBase || CALCULATION_BASE_OPTIONS[0]
                  )}
                </td>
                <td>
                  {inlineEditState.index === index ? (
                    <select
                      value={inlineEditState.data.accountType}
                      onChange={(e) => handleInlineFieldChange('accountType', e.target.value)}
                    >
                      {Object.values(ACCOUNT_TYPES).map(type => (
                        <option key={type} value={type}>{type}</option>
                      ))}
                    </select>
                  ) : (
                    rule.accountType
                  )}
                </td>
                <td>
                  {inlineEditState.index === index ? (
                    <textarea
                      value={inlineEditState.data.maternityPolicy || ''}
                      onChange={(e) => handleInlineFieldChange('maternityPolicy', e.target.value)}
                      rows={4}
                      style={{ width: '100%', height: '96px', resize: 'none' }}
                    />
                  ) : (
                    <div style={{ height: '72px', display: 'flex', alignItems: 'center' }}>
                      {rule.maternityPolicy ? (
                        <span
                          style={{
                            color: '#0d6efd',
                            cursor: 'pointer'
                          }}
                          onMouseEnter={(e) => showPolicyTooltip({
                            event: e,
                            type: '产假政策',
                            content: rule.maternityPolicy,
                            city: rule.city || '未指定城市'
                          })}
                          onMouseLeave={hidePolicyTooltip}
                          onFocus={(e) => showPolicyTooltip({
                            event: e,
                            type: '产假政策',
                            content: rule.maternityPolicy,
                            city: rule.city || '未指定城市'
                          })}
                          onBlur={instantHidePolicyTooltip}
                          tabIndex={0}
                        >
                          {truncatePolicyText(rule.maternityPolicy)}
                        </span>
                      ) : (
                        '—'
                      )}
                    </div>
                  )}
                </td>
                <td>
                  {inlineEditState.index === index ? (
                    <textarea
                      value={inlineEditState.data.allowancePolicy || ''}
                      onChange={(e) => handleInlineFieldChange('allowancePolicy', e.target.value)}
                      rows={4}
                      style={{ width: '100%', height: '96px', resize: 'none' }}
                    />
                  ) : (
                    <div style={{ height: '72px', display: 'flex', alignItems: 'center' }}>
                      {rule.allowancePolicy ? (
                        <span
                          style={{
                            color: '#0d6efd',
                            cursor: 'pointer'
                          }}
                          onMouseEnter={(e) => showPolicyTooltip({
                            event: e,
                            type: '津贴政策',
                            content: rule.allowancePolicy,
                            city: rule.city || '未指定城市'
                          })}
                          onMouseLeave={hidePolicyTooltip}
                          onFocus={(e) => showPolicyTooltip({
                            event: e,
                            type: '津贴政策',
                            content: rule.allowancePolicy,
                            city: rule.city || '未指定城市'
                          })}
                          onBlur={instantHidePolicyTooltip}
                          tabIndex={0}
                        >
                          {truncatePolicyText(rule.allowancePolicy)}
                        </span>
                      ) : (
                        '—'
                      )}
                    </div>
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
            <p>暂无数据</p>
          </div>
        )}
      </div>

      {hoveredPolicy.content && (
        <div
          className="policy-tooltip"
          style={{
            position: 'fixed',
            top: hoveredPolicy.position.top,
            left: hoveredPolicy.position.left,
            backgroundColor: '#fff',
            borderRadius: '8px',
            padding: '24px',
            width: hoveredPolicy.width,
            maxWidth: '90vw',
            maxHeight: '80vh',
            boxShadow: '0 12px 32px rgba(0,0,0,0.18)',
            display: 'flex',
            flexDirection: 'column',
            border: '1px solid rgba(0,0,0,0.08)',
            zIndex: 1100,
            transform: hoveredPolicy.placement === 'above'
              ? 'translateY(-100%)'
              : 'translateY(0)'
          }}
          onMouseEnter={cancelHideTooltip}
          onMouseLeave={instantHidePolicyTooltip}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <h3 style={{ margin: 0 }}>
              {hoveredPolicy.type} - {hoveredPolicy.city}
            </h3>
          </div>
          <div style={{ overflowY: 'auto', whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
            {hoveredPolicy.content}
          </div>
        </div>
      )}

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

export default AllowanceRulesManager;
