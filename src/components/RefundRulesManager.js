import React, { useState, useEffect } from 'react';
import {
  getRefundRulesApi,
  addRefundRuleApi,
  updateRefundRuleApi,
  deleteRefundRuleApi,
  importRefundRulesApi
} from '../api/dataManagementApi';
import {
  generateRefundRulesTemplate,
  parseExcelFile,
  exportDataToExcel,
  validateRefundRule
} from '../utils/cityDataUtils';

const RefundRulesManager = ({ selectedCity, onDataChange, onSaveAll }) => {
  const [rules, setRules] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingIndex, setEditingIndex] = useState(-1);
  const [inlineEditState, setInlineEditState] = useState({ index: -1, data: null });
  const initialForm = {
    city: '通用',
    startMonth: '2000-01',
    endMonth: '2099-12',
    refundDescription: '',
    refundAmount: '',
    directDisplay: true,
    singleMonthOnly: false
  };
  const [form, setForm] = useState(initialForm);

  useEffect(() => {
    loadRules();
  }, [selectedCity]);

  const loadRules = async () => {
    setIsLoading(true);
    try {
      const response = await getRefundRulesApi({ city: selectedCity });
      if (response.ok) {
        setRules(response.data);
      } else {
        showMessage('error', response.error || '加载失败');
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
      city: selectedCity || '通用',
      startMonth: '2000-01',
      endMonth: '2099-12',
      refundDescription: '',
      refundAmount: '',
      directDisplay: true,
      singleMonthOnly: false
    });
    setEditingIndex(-1);
    setShowAddForm(false);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const amountValue = form.refundAmount === '' ? null : Number(form.refundAmount);
    const formData = {
      city: form.city.trim(),
      startMonth: form.startMonth.trim(),
      endMonth: form.endMonth.trim(),
      refundDescription: form.refundDescription.trim(),
      refundAmount: amountValue,
      directDisplay: !!form.directDisplay,
      singleMonthOnly: !!form.singleMonthOnly
    };
    const validationErrors = validateRefundRule(formData);
    if (validationErrors.length > 0) {
      showMessage('error', validationErrors.join(', '));
      return;
    }
    setIsLoading(true);
    try {
      let response;
      if (editingIndex >= 0) {
        response = await updateRefundRuleApi({ index: editingIndex, rule: formData });
      } else {
        response = await addRefundRuleApi({ rule: formData });
      }
      if (response.ok) {
        await loadRules();
        resetForm();
        if (onDataChange) onDataChange('refund');
      } else {
        showMessage('error', response.error || '操作失败');
      }
    } catch (error) {
      showMessage('error', `操作失败: ${error.message}`);
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
      data: { ...prev.data, [field]: value }
    }));
  };

  const normalizeInlinePayload = (raw) => {
    const normalizeBoolean = (value) => {
      if (typeof value === 'boolean') return value;
      if (typeof value === 'string') {
        const normalized = value.trim().toLowerCase();
        if (['true', '1', 'y', 'yes', '是'].includes(normalized)) return true;
        if (['false', '0', 'n', 'no', '否'].includes(normalized)) return false;
      }
      if (value === 1) return true;
      if (value === 0) return false;
      return false;
    };

    const parsedAmount = raw.refundAmount === '' || raw.refundAmount === null || raw.refundAmount === undefined
      ? null
      : Number(raw.refundAmount);

    return {
      city: (raw.city || '').trim(),
      startMonth: (raw.startMonth || '').trim(),
      endMonth: (raw.endMonth || '').trim(),
      refundDescription: (raw.refundDescription || '').trim(),
      refundAmount: Number.isFinite(parsedAmount) ? parsedAmount : null,
      directDisplay: normalizeBoolean(raw.directDisplay),
      singleMonthOnly: normalizeBoolean(raw.singleMonthOnly)
    };
  };

  const handleInlineSave = async () => {
    if (inlineEditState.index < 0) return;

    const normalized = normalizeInlinePayload(inlineEditState.data || {});
    const validationErrors = validateRefundRule(normalized);
    if (validationErrors.length > 0) {
      showMessage('error', validationErrors.join(', '));
      return;
    }

    setIsLoading(true);
    try {
      const response = await updateRefundRuleApi({ index: inlineEditState.index, rule: normalized });
      if (response.ok) {
        await loadRules();
        cancelInlineEdit();
        if (onDataChange) onDataChange('refund');
      } else {
        showMessage('error', response.error || '保存失败');
      }
    } catch (error) {
      showMessage('error', `保存失败: ${error.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async (index) => {
    if (!window.confirm('确定要删除这条返还规则吗？')) return;
    setIsLoading(true);
    try {
      const response = await deleteRefundRuleApi({ index });
      if (response.ok) {
        await loadRules();
        if (onDataChange) onDataChange('refund');
      } else {
        showMessage('error', response.error || '删除失败');
      }
    } catch (error) {
      showMessage('error', `删除失败: ${error.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleFileImport = async (event) => {
    const file = event.target.files[0];
    if (!file) return;
    setIsLoading(true);
    try {
      const result = await parseExcelFile(file, 'refund');
      if (result.errors && result.errors.length > 0) {
        const firstFew = result.errors.slice(0, 5).map(e => `第${e.row}行: ${Array.isArray(e.errors) ? e.errors.join('; ') : e.errors}`).join(' | ');
        showMessage('error', `导入失败：存在 ${result.errors.length} 行格式错误。示例：${firstFew}${result.errors.length > 5 ? ' ...' : ''}`);
        return;
      }
      const response = await importRefundRulesApi({ rules: result.data });
      if (response.ok) {
        await loadRules();
        if (onDataChange) onDataChange('refund');
      } else {
        showMessage('error', response.error || '导入失败');
      }
    } catch (error) {
      showMessage('error', `导入失败: ${error.message}`);
    } finally {
      setIsLoading(false);
      event.target.value = '';
    }
  };

  const handleExport = () => {
    const filename = `返还规则${selectedCity ? `_${selectedCity}` : ''}.xlsx`;
    exportDataToExcel(rules, 'refund', filename);
  };

  const handleDownloadTemplate = () => {
    generateRefundRulesTemplate();
  };

  const toggleForm = () => {
    if (showAddForm) {
      resetForm();
    } else {
      setForm({
        city: selectedCity || '通用',
        startMonth: '2000-01',
        endMonth: '2099-12',
        refundDescription: '',
        refundAmount: '',
        directDisplay: true,
        singleMonthOnly: false
      });
      setShowAddForm(true);
    }
  };

  return (
    <div className="manager-section">
      {message.text && (
        <div className={`message message-${message.type}`}>
          {message.text}
        </div>
      )}

      <div className="toolbar">
        <div className="toolbar-left">
          <button onClick={toggleForm} className="btn-primary">
            {showAddForm ? '取消添加' : '添加返还规则'}
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

      {showAddForm && (
        <div className="form-section">
          <div className="form-container">
            <h3>{editingIndex >= 0 ? '编辑返还规则' : '添加返还规则'}</h3>
            <form onSubmit={handleSubmit}>
              <div className="form-grid form-grid-lg">
                <div className="form-group">
                  <label>城市</label>
                  <input
                    type="text"
                    value={form.city}
                    onChange={(e) => setForm({ ...form, city: e.target.value })}
                    placeholder="请输入城市名称，可为空"
                  />
                </div>
                <div className="form-group">
                  <label>开始月份</label>
                  <input
                    type="month"
                    value={form.startMonth}
                    onChange={(e) => setForm({ ...form, startMonth: e.target.value })}
                  />
                </div>
                <div className="form-group">
                  <label>结束月份</label>
                  <input
                    type="month"
                    value={form.endMonth}
                    onChange={(e) => setForm({ ...form, endMonth: e.target.value })}
                  />
                </div>
              </div>

              <div className="form-grid form-grid-lg">
                <div className="form-group">
                  <label>返还说明</label>
                  <input
                    type="text"
                    value={form.refundDescription}
                    onChange={(e) => setForm({ ...form, refundDescription: e.target.value })}
                    placeholder="请填写返还说明，可为空"
                  />
                </div>
                <div className="form-group">
                  <label>返还金额</label>
                  <input
                    type="number"
                    value={form.refundAmount}
                    onChange={(e) => setForm({ ...form, refundAmount: e.target.value })}
                    step="0.01"
                    placeholder="可填负数或留空"
                  />
                </div>
              </div>

              <div className="form-grid form-grid-lg">
                <div className="form-group">
                  <label>直接显示</label>
                  <select
                    value={form.directDisplay ? 'true' : 'false'}
                    onChange={(e) => setForm({ ...form, directDisplay: e.target.value === 'true' })}
                  >
                    <option value="true">是</option>
                    <option value="false">否</option>
                  </select>
                </div>
                <div className="form-group">
                  <label>仅单月有效</label>
                  <select
                    value={form.singleMonthOnly ? 'true' : 'false'}
                    onChange={(e) => setForm({ ...form, singleMonthOnly: e.target.value === 'true' })}
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

      <div className="data-table">
        <table>
          <thead>
            <tr>
              <th>城市</th>
              <th>开始月份</th>
              <th>结束月份</th>
              <th>返还说明</th>
              <th>返还金额</th>
              <th>直接显示</th>
              <th>仅单月有效</th>
              <th>操作</th>
            </tr>
          </thead>
          <tbody>
            {rules.map((row, idx) => (
              <tr key={idx}>
                <td>
                  {inlineEditState.index === idx ? (
                    <input
                      value={inlineEditState.data.city}
                      onChange={(e) => handleInlineFieldChange('city', e.target.value)}
                    />
                  ) : (
                    row.city
                  )}
                </td>
                <td>
                  {inlineEditState.index === idx ? (
                    <input
                      type="month"
                      value={inlineEditState.data.startMonth}
                      onChange={(e) => handleInlineFieldChange('startMonth', e.target.value)}
                    />
                  ) : (
                    row.startMonth
                  )}
                </td>
                <td>
                  {inlineEditState.index === idx ? (
                    <input
                      type="month"
                      value={inlineEditState.data.endMonth}
                      onChange={(e) => handleInlineFieldChange('endMonth', e.target.value)}
                    />
                  ) : (
                    row.endMonth
                  )}
                </td>
                <td>
                  {inlineEditState.index === idx ? (
                    <input
                      value={inlineEditState.data.refundDescription || ''}
                      onChange={(e) => handleInlineFieldChange('refundDescription', e.target.value)}
                    />
                  ) : (
                    row.refundDescription || '—'
                  )}
                </td>
                <td>
                  {inlineEditState.index === idx ? (
                    <input
                      type="number"
                      value={inlineEditState.data.refundAmount ?? ''}
                      onChange={(e) => handleInlineFieldChange('refundAmount', e.target.value)}
                      style={{ width: '120px' }}
                    />
                  ) : (
                    row.refundAmount !== null && row.refundAmount !== undefined ? row.refundAmount : '—'
                  )}
                </td>
                <td>
                  {inlineEditState.index === idx ? (
                    <select
                      value={inlineEditState.data.directDisplay ? 'true' : 'false'}
                      onChange={(e) => handleInlineFieldChange('directDisplay', e.target.value === 'true')}
                    >
                      <option value="true">是</option>
                      <option value="false">否</option>
                    </select>
                  ) : (
                    row.directDisplay ? '是' : '否'
                  )}
                </td>
                <td>
                  {inlineEditState.index === idx ? (
                    <select
                      value={inlineEditState.data.singleMonthOnly ? 'true' : 'false'}
                      onChange={(e) => handleInlineFieldChange('singleMonthOnly', e.target.value === 'true')}
                    >
                      <option value="true">是</option>
                      <option value="false">否</option>
                    </select>
                  ) : (
                    row.singleMonthOnly ? '是' : '否'
                  )}
                </td>
                <td>
                  {inlineEditState.index === idx ? (
                    <div className="inline-actions">
                      <button className="btn-primary" onClick={handleInlineSave}>保存</button>
                      <button className="btn-secondary" onClick={cancelInlineEdit}>取消</button>
                    </div>
                  ) : (
                    <div className="inline-actions">
                      <button className="btn-edit" onClick={() => beginInlineEdit(idx)}>编辑</button>
                      <button className="btn-delete" onClick={() => handleDelete(idx)}>删除</button>
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

      {isLoading && (
        <div className="loading">
          <div className="loading-spinner"></div>
          <span>处理中...</span>
        </div>
      )}
    </div>
  );
};

export default RefundRulesManager;
