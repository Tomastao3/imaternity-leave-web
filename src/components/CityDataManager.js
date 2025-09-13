import React, { useState, useEffect } from 'react';
import {
  cityDataManager,
  MATERNITY_LEAVE_TYPES,
  ACCOUNT_TYPES,
  PREGNANCY_PERIODS,
  generateMaternityRulesTemplate,
  generateAllowanceRulesTemplate,
  generateEmployeeTemplate,
  parseExcelFile,
  exportDataToExcel,
  validateMaternityRule,
  validateAllowanceRule,
  validateEmployee
} from '../utils/cityDataUtils';
import { getHolidayPlan, setHolidayPlan, addDateToPlan, removeDateFromPlan } from '../utils/holidayUtils';
import { readExcelFile as readExcelFileGeneric, exportDataToExcel as exportDataToExcelGeneric, generateHolidayTemplate } from '../utils/excelUtils';

const CityDataManager = () => {
  const [activeTab, setActiveTab] = useState('maternity');
  const [selectedCity, setSelectedCity] = useState('');
  const [cities, setCities] = useState([]);
  const [maternityRules, setMaternityRules] = useState([]);
  const [allowanceRules, setAllowanceRules] = useState([]);
  const [employeeData, setEmployeeData] = useState([]);
  // Holiday states
  const currentYear = new Date().getFullYear();
  const [selectedYear, setSelectedYear] = useState(currentYear);
  const [holidayPlan, setHolidayPlanState] = useState({ holidays: [], makeupWorkdays: [] });
  const [holidayNewDate, setHolidayNewDate] = useState('');
  const [holidayNewType, setHolidayNewType] = useState('holiday'); // 'holiday' | 'makeup'
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingIndex, setEditingIndex] = useState(-1);

  // 表单状态
  const [maternityForm, setMaternityForm] = useState({
    city: '',
    leaveType: MATERNITY_LEAVE_TYPES.LEGAL,
    days: '',
    isExtendable: true
  });

  const [allowanceForm, setAllowanceForm] = useState({
    city: '',
    socialAverageWage: '',
    companyAverageWage: '',
    accountType: ACCOUNT_TYPES.COMPANY
  });

  const [employeeForm, setEmployeeForm] = useState({
    employeeId: '',
    employeeName: '',
    basicSalary: '',
    socialSecurityBase: '',
    city: ''
  });

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    if (selectedCity) {
      filterDataByCity();
    } else {
      setMaternityRules(cityDataManager.maternityRules);
      setAllowanceRules(cityDataManager.allowanceRules);
      setEmployeeData(cityDataManager.employeeData);
    }
  }, [selectedCity]);

  // Load holiday plan when year changes or first mount
  useEffect(() => {
    const plan = getHolidayPlan(selectedYear);
    setHolidayPlanState(plan);
  }, [selectedYear]);

  const loadData = () => {
    cityDataManager.loadData();
    setCities(cityDataManager.getCities());
    setMaternityRules(cityDataManager.maternityRules);
    setAllowanceRules(cityDataManager.allowanceRules);
    setEmployeeData(cityDataManager.employeeData);
  };

  const filterDataByCity = () => {
    if (selectedCity) {
      setMaternityRules(cityDataManager.getMaternityRulesByCity(selectedCity));
      const allowanceRule = cityDataManager.getAllowanceRulesByCity(selectedCity);
      setAllowanceRules(allowanceRule ? [allowanceRule] : []);
      setEmployeeData(cityDataManager.getEmployeesByCity(selectedCity));
    }
  };

  const showMessage = (type, text) => {
    setMessage({ type, text });
    setTimeout(() => setMessage({ type: '', text: '' }), 5000);
  };

  const resetForm = (type) => {
    if (type === 'maternity') {
      setMaternityForm({
        city: selectedCity || '',
        leaveType: MATERNITY_LEAVE_TYPES.LEGAL,
        days: '',
        isExtendable: true
      });
    } else if (type === 'allowance') {
      setAllowanceForm({
        city: selectedCity || '',
        socialAverageWage: '',
        companyAverageWage: '',
        accountType: ACCOUNT_TYPES.COMPANY
      });
    } else if (type === 'employee') {
      setEmployeeForm({
        employeeId: '',
        employeeName: '',
        basicSalary: '',
        socialSecurityBase: '',
        city: selectedCity || ''
      });
    }
    setEditingIndex(-1);
    setShowAddForm(false);
  };

  const handleFileImport = async (event, type) => {
    const file = event.target.files[0];
    if (!file) return;

    setIsLoading(true);
    try {
      // For holiday, use excelUtils reader; for others, keep existing
      const result = type === 'holiday'
        ? { data: await readExcelFileGeneric(file, 'holiday'), errors: [] }
        : await parseExcelFile(file, type);
      
      if (result.errors.length > 0) {
        const errorMsg = `导入完成，但有 ${result.errors.length} 行数据存在错误。成功导入 ${result.data.length} 条数据。`;
        showMessage('warning', errorMsg);
        console.log('导入错误详情:', result.errors);
      } else {
        showMessage('success', `成功导入 ${result.data.length} 条数据`);
      }

      // 将数据添加到系统中
      if (type === 'holiday') {
        // result.data: [{ year, date, type: 'holiday'|'makeup' }]
        const grouped = {};
        result.data.forEach(r => {
          const y = r.year || selectedYear;
          if (!grouped[y]) grouped[y] = { holidays: [], makeupWorkdays: [] };
          if (r.type === 'holiday') grouped[y].holidays.push(r.date);
          else if (r.type === 'makeup') grouped[y].makeupWorkdays.push(r.date);
        });
        Object.entries(grouped).forEach(([y, plan]) => {
          const current = getHolidayPlan(Number(y));
          const merged = {
            holidays: Array.from(new Set([...(current.holidays||[]), ...(plan.holidays||[])])),
            makeupWorkdays: Array.from(new Set([...(current.makeupWorkdays||[]), ...(plan.makeupWorkdays||[])]))
          };
          setHolidayPlan(Number(y), merged);
          if (Number(y) === selectedYear) setHolidayPlanState(merged);
        });
      } else {
        result.data.forEach(item => {
          if (type === 'maternity') {
            cityDataManager.addMaternityRule(item);
          } else if (type === 'allowance') {
            cityDataManager.addAllowanceRule(item);
          } else if (type === 'employee') {
            cityDataManager.addEmployee(item);
          }
        });
      }

      loadData();
    } catch (error) {
      showMessage('error', `导入失败: ${error.message}`);
    } finally {
      setIsLoading(false);
      event.target.value = '';
    }
  };

  const handleExport = (type) => {
    let data, filename;
    
    if (type === 'maternity') {
      data = selectedCity ? maternityRules : cityDataManager.maternityRules;
      filename = `产假规则${selectedCity ? `_${selectedCity}` : ''}.xlsx`;
    } else if (type === 'allowance') {
      data = selectedCity ? allowanceRules : cityDataManager.allowanceRules;
      filename = `津贴规则${selectedCity ? `_${selectedCity}` : ''}.xlsx`;
    } else if (type === 'employee') {
      data = selectedCity ? employeeData : cityDataManager.employeeData;
      filename = `员工信息${selectedCity ? `_${selectedCity}` : ''}.xlsx`;
    } else if (type === 'holiday') {
      data = holidayPlan;
      filename = `节假日_${selectedYear}.xlsx`;
      exportDataToExcelGeneric(data, 'holiday', filename);
      showMessage('success', '数据导出成功');
      return;
    }

    exportDataToExcel(data, type, filename);
    showMessage('success', '数据导出成功');
  };

  const handleSubmit = (type) => {
    let formData, validationErrors;
    
    if (type === 'maternity') {
      formData = {
        ...maternityForm,
        days: parseInt(maternityForm.days)
      };
      validationErrors = validateMaternityRule(formData);
    } else if (type === 'allowance') {
      formData = {
        ...allowanceForm,
        socialAverageWage: parseFloat(allowanceForm.socialAverageWage),
        companyAverageWage: parseFloat(allowanceForm.companyAverageWage)
      };
      validationErrors = validateAllowanceRule(formData);
    } else if (type === 'employee') {
      const basic = parseFloat(employeeForm.basicSalary);
      const ssb = employeeForm.socialSecurityBase !== '' && employeeForm.socialSecurityBase !== undefined
        ? parseFloat(employeeForm.socialSecurityBase)
        : basic;
      formData = {
        ...employeeForm,
        basicSalary: basic,
        socialSecurityBase: ssb,
        // 移除难产相关字段，避免保存时校验失败
      };
      validationErrors = validateEmployee(formData);
    }

    if (validationErrors.length > 0) {
      showMessage('error', validationErrors.join(', '));
      return;
    }

    try {
      if (editingIndex >= 0) {
        // 更新现有数据
        if (type === 'maternity') {
          const globalIndex = cityDataManager.maternityRules.findIndex(rule => 
            rule.city === maternityRules[editingIndex].city && 
            rule.leaveType === maternityRules[editingIndex].leaveType
          );
          cityDataManager.updateMaternityRule(globalIndex, formData);
        } else if (type === 'allowance') {
          const globalIndex = cityDataManager.allowanceRules.findIndex(rule => 
            rule.city === allowanceRules[editingIndex].city
          );
          cityDataManager.updateAllowanceRule(globalIndex, formData);
        } else if (type === 'employee') {
          const globalIndex = cityDataManager.employeeData.findIndex(emp => 
            emp.employeeId === employeeData[editingIndex].employeeId
          );
          cityDataManager.updateEmployee(globalIndex, formData);
        }
        showMessage('success', '数据更新成功');
      } else {
        // 添加新数据
        if (type === 'maternity') {
          cityDataManager.addMaternityRule(formData);
        } else if (type === 'allowance') {
          cityDataManager.addAllowanceRule(formData);
        } else if (type === 'employee') {
          cityDataManager.addEmployee(formData);
        }
        showMessage('success', '数据添加成功');
      }

      resetForm(type);
      loadData();
    } catch (error) {
      showMessage('error', `操作失败: ${error.message}`);
    }
  };

  const handleEdit = (index, type) => {
    setEditingIndex(index);
    setShowAddForm(true);
    
    if (type === 'maternity') {
      setMaternityForm(maternityRules[index]);
    } else if (type === 'allowance') {
      setAllowanceForm(allowanceRules[index]);
    } else if (type === 'employee') {
      setEmployeeForm(employeeData[index]);
    }
  };

  const handleDelete = (index, type) => {
    if (!window.confirm('确定要删除这条数据吗？')) return;

    try {
      if (type === 'maternity') {
        const globalIndex = cityDataManager.maternityRules.findIndex(rule => 
          rule.city === maternityRules[index].city && 
          rule.leaveType === maternityRules[index].leaveType
        );
        cityDataManager.deleteMaternityRule(globalIndex);
      } else if (type === 'allowance') {
        const globalIndex = cityDataManager.allowanceRules.findIndex(rule => 
          rule.city === allowanceRules[index].city
        );
        cityDataManager.deleteAllowanceRule(globalIndex);
      } else if (type === 'employee') {
        const globalIndex = cityDataManager.employeeData.findIndex(emp => 
          emp.employeeId === employeeData[index].employeeId
        );
        cityDataManager.deleteEmployee(globalIndex);
      }

      loadData();
      showMessage('success', '数据删除成功');
    } catch (error) {
      showMessage('error', `删除失败: ${error.message}`);
    }
  };

  const tabs = [
    { id: 'maternity', label: '产假规则', icon: '📅' },
    { id: 'allowance', label: '津贴规则', icon: '💰' },
    { id: 'employee', label: '员工信息', icon: '👥' },
    { id: 'holiday', label: '节假日', icon: '🎌' }
  ];

  const renderMaternityRulesTable = () => (
    <div className="data-table">
      <table>
        <thead>
          <tr>
            <th>城市</th>
            <th>产假类型</th>
            <th>产假天数</th>
            <th>是否遇法定节假日顺延</th>
            <th>操作</th>
          </tr>
        </thead>
        <tbody>
          {maternityRules.map((rule, index) => (
            <tr key={index}>
              <td>{rule.city}</td>
              <td>{rule.leaveType}</td>
              <td>{rule.days}天</td>
              <td>{rule.isExtendable ? '是' : '否'}</td>
              <td>
                <button onClick={() => handleEdit(index, 'maternity')} className="btn-edit">编辑</button>
                <button onClick={() => handleDelete(index, 'maternity')} className="btn-delete">删除</button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      {maternityRules.length === 0 && (
        <div className="empty-state">暂无产假规则数据</div>
      )}
    </div>
  );

  const renderAllowanceRulesTable = () => (
    <div className="data-table">
      <table>
        <thead>
          <tr>
            <th>城市</th>
            <th>社平工资</th>
            <th>公司平均工资</th>
            <th>账户类型</th>
            <th>操作</th>
          </tr>
        </thead>
        <tbody>
          {allowanceRules.map((rule, index) => (
            <tr key={index}>
              <td>{rule.city}</td>
              <td>¥{rule.socialAverageWage.toLocaleString()}</td>
              <td>¥{rule.companyAverageWage.toLocaleString()}</td>
              <td>{rule.accountType}</td>
              <td>
                <button onClick={() => handleEdit(index, 'allowance')} className="btn-edit">编辑</button>
                <button onClick={() => handleDelete(index, 'allowance')} className="btn-delete">删除</button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      {allowanceRules.length === 0 && (
        <div className="empty-state">暂无津贴规则数据</div>
      )}
    </div>
  );

  const renderEmployeeTable = () => (
    <div className="data-table">
      <table>
        <thead>
          <tr>
            <th>工号</th>
            <th>姓名</th>
            <th>员工产前12个月的月均工资</th>
            <th>城市</th>
            <th>操作</th>
          </tr>
        </thead>
        <tbody>
          {employeeData.map((emp, index) => (
            <tr key={index}>
              <td>{emp.employeeId}</td>
              <td>{emp.employeeName}</td>
              <td>{emp.basicSalary != null ? '******' : ''}</td>
              <td>{emp.city}</td>
              <td>
                <button onClick={() => handleEdit(index, 'employee')} className="btn-edit">编辑</button>
                <button onClick={() => handleDelete(index, 'employee')} className="btn-delete">删除</button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      {employeeData.length === 0 && (
        <div className="empty-state">暂无员工信息数据</div>
      )}
    </div>
  );

  // 节假日编辑面板
  const renderHolidayControls = () => (
    <div className="form-container">
      <h3>{`编辑节假日（${selectedYear}）`}</h3>
      <div className="form-grid">
        <div className="form-group">
          <label>年份</label>
          <input
            type="number"
            value={selectedYear}
            onChange={(e) => setSelectedYear(parseInt(e.target.value) || currentYear)}
            min="2000"
            step="1"
          />
        </div>
        <div className="form-group">
          <label>日期</label>
          <input type="date" value={holidayNewDate} onChange={e => setHolidayNewDate(e.target.value)} />
        </div>
        <div className="form-group">
          <label>类型</label>
          <select value={holidayNewType} onChange={e => setHolidayNewType(e.target.value)}>
            <option value="holiday">节假日</option>
            <option value="makeup">调休日</option>
          </select>
        </div>
      </div>
      <div className="form-actions">
        <button
          onClick={() => {
            if (!holidayNewDate) { showMessage('error', '请先选择日期'); return; }
            const updated = addDateToPlan(selectedYear, holidayNewDate, holidayNewType);
            setHolidayPlanState(updated);
            setHolidayNewDate('');
            showMessage('success', '已添加');
          }}
          className="btn-primary"
        >添加</button>
        <button
          onClick={() => {
            if (!holidayNewDate) { showMessage('error', '请先选择日期'); return; }
            const updated = removeDateFromPlan(selectedYear, holidayNewDate);
            setHolidayPlanState(updated);
            setHolidayNewDate('');
            showMessage('success', '已移除');
          }}
          className="btn-secondary"
        >移除</button>
      </div>
    </div>
  );

  // 节假日数据表
  const renderHolidayTable = () => (
    <div className="data-table">
      <table>
        <thead>
          <tr>
            <th style={{ width: '160px' }}>日期</th>
            <th style={{ width: '120px' }}>类型</th>
            <th>操作</th>
          </tr>
        </thead>
        <tbody>
          {[...(holidayPlan.holidays||[]).map(d => ({ d, t: '节假日' })), ...(holidayPlan.makeupWorkdays||[]).map(d => ({ d, t: '调休日' }))]
            .sort((a,b) => a.d.localeCompare(b.d))
            .map((row, idx) => (
              <tr key={`${row.t}-${row.d}-${idx}`}>
                <td>{row.d}</td>
                <td>{row.t}</td>
                <td>
                  <button className="btn-delete" onClick={() => {
                    const updated = removeDateFromPlan(selectedYear, row.d);
                    setHolidayPlanState(updated);
                    showMessage('success', '已删除');
                  }}>删除</button>
                </td>
              </tr>
            ))}
        </tbody>
      </table>
      {((holidayPlan.holidays||[]).length + (holidayPlan.makeupWorkdays||[]).length) === 0 && (
        <div className="empty-state">该年份暂无节假日/调休日数据</div>
      )}
    </div>
  );

  const renderMaternityForm = () => (
    <div className="form-container">
      <h3>{editingIndex >= 0 ? '编辑产假规则' : '添加产假规则'}</h3>
      <div className="form-grid">
        <div className="form-group">
          <label>城市</label>
          <input
            type="text"
            value={maternityForm.city}
            onChange={(e) => setMaternityForm({...maternityForm, city: e.target.value})}
            placeholder="请输入城市名称"
          />
        </div>
        <div className="form-group">
          <label>产假类型</label>
          <select
            value={maternityForm.leaveType}
            onChange={(e) => setMaternityForm({...maternityForm, leaveType: e.target.value})}
          >
            {Object.values(MATERNITY_LEAVE_TYPES).map(type => (
              <option key={type} value={type}>{type}</option>
            ))}
          </select>
        </div>
        <div className="form-group">
          <label>产假天数</label>
          <input
            type="number"
            value={maternityForm.days}
            onChange={(e) => setMaternityForm({...maternityForm, days: e.target.value})}
            placeholder="请输入产假天数"
            min="1"
          />
        </div>
        <div className="form-group">
          <label>
            <input
              type="checkbox"
              checked={maternityForm.isExtendable}
              onChange={(e) => setMaternityForm({...maternityForm, isExtendable: e.target.checked})}
            />
            是否遇法定节假日顺延
          </label>
        </div>
      </div>
      <div className="form-actions">
        <button onClick={() => handleSubmit('maternity')} className="btn-primary">
          {editingIndex >= 0 ? '更新' : '添加'}
        </button>
        <button onClick={() => resetForm('maternity')} className="btn-secondary">取消</button>
      </div>
    </div>
  );

  const renderAllowanceForm = () => (
    <div className="form-container">
      <h3>{editingIndex >= 0 ? '编辑津贴规则' : '添加津贴规则'}</h3>
      <div className="form-grid">
        <div className="form-group">
          <label>城市</label>
          <input
            type="text"
            value={allowanceForm.city}
            onChange={(e) => setAllowanceForm({...allowanceForm, city: e.target.value})}
            placeholder="请输入城市名称"
          />
        </div>
        <div className="form-group">
          <label>社平工资</label>
          <input
            type="number"
            value={allowanceForm.socialAverageWage}
            onChange={(e) => setAllowanceForm({...allowanceForm, socialAverageWage: e.target.value})}
            placeholder="请输入社平工资"
            min="0"
            step="0.01"
          />
        </div>
        <div className="form-group">
          <label>公司平均工资</label>
          <input
            type="number"
            value={allowanceForm.companyAverageWage}
            onChange={(e) => setAllowanceForm({...allowanceForm, companyAverageWage: e.target.value})}
            placeholder="请输入公司平均工资"
            min="0"
            step="0.01"
          />
        </div>
        <div className="form-group">
          <label>账户类型</label>
          <select
            value={allowanceForm.accountType}
            onChange={(e) => setAllowanceForm({...allowanceForm, accountType: e.target.value})}
          >
            {Object.values(ACCOUNT_TYPES).map(type => (
              <option key={type} value={type}>{type}</option>
            ))}
          </select>
        </div>
      </div>
      <div className="form-actions">
        <button onClick={() => handleSubmit('allowance')} className="btn-primary">
          {editingIndex >= 0 ? '更新' : '添加'}
        </button>
        <button onClick={() => resetForm('allowance')} className="btn-secondary">取消</button>
      </div>
    </div>
  );

  const renderEmployeeForm = () => (
    <div className="form-container">
      <h3>{editingIndex >= 0 ? '编辑员工信息' : '添加员工信息'}</h3>
      <div className="form-grid">
        <div className="form-group">
          <label>工号</label>
          <input
            type="text"
            value={employeeForm.employeeId}
            onChange={(e) => setEmployeeForm({...employeeForm, employeeId: e.target.value})}
            placeholder="请输入工号"
          />
        </div>
        <div className="form-group">
          <label>员工姓名</label>
          <input
            type="text"
            value={employeeForm.employeeName}
            onChange={(e) => setEmployeeForm({...employeeForm, employeeName: e.target.value})}
            placeholder="请输入员工姓名"
          />
        </div>
        <div className="form-group">
          <label>员工产前12个月的月均工资</label>
          <input
            type="password"
            value={employeeForm.basicSalary}
            onChange={(e) => setEmployeeForm({...employeeForm, basicSalary: e.target.value})}
            placeholder="请输入员工产前12个月的月均工资"
            min="0"
            step="0.01"
          />
        </div>
        <div className="form-group">
          <label>城市</label>
          <input
            type="text"
            value={employeeForm.city}
            onChange={(e) => setEmployeeForm({...employeeForm, city: e.target.value})}
            placeholder="请输入城市"
          />
        </div>
        <div className="form-group">
          {/* 部门/职位字段已删除 */}
        </div>
        
      </div>
      <div className="form-actions">
        <button onClick={() => handleSubmit('employee')} className="btn-primary">
          {editingIndex >= 0 ? '更新' : '添加'}
        </button>
        <button onClick={() => resetForm('employee')} className="btn-secondary">取消</button>
      </div>
    </div>
  );

  return (
    <div className="city-data-manager">
      <div className="header-section">  
        <h2>🏙️ 基础数据管理</h2>
        <p>管理各城市的产假规则、津贴规则和员工信息</p>
        
        {/* 城市筛选 */}
        <div className="city-filter">
          <label>筛选城市：</label>
          <select
            value={selectedCity}
            onChange={(e) => setSelectedCity(e.target.value)}
          >
            <option value="">全部城市</option>
            {cities.map(city => (
              <option key={city} value={city}>{city}</option>
            ))}
          </select>
        </div>
      </div>

      {/* 消息提示 */}
      {message.text && (
        <div className={`message ${message.type}`}>
          {message.text}
        </div>
      )}

      {/* 标签页导航 */}
      <div className="tabs">
        {tabs.map(tab => (
          <button
            key={tab.id}
            className={`tab ${activeTab === tab.id ? 'active' : ''}`}
            onClick={() => {
              setActiveTab(tab.id);
              setShowAddForm(false);
              resetForm(tab.id);
            }}
          >
            <span className="tab-icon">{tab.icon}</span>
            {tab.label}
          </button>
        ))}
      </div>

      {/* 工具栏 */}
      <div className="toolbar">
        <div className="toolbar-left">
          <button
            onClick={() => setShowAddForm(!showAddForm)}
            className="btn-primary"
          >
            {showAddForm ? '取消添加' : `添加${tabs.find(t => t.id === activeTab)?.label}`}
          </button>
        </div>
        
        <div className="toolbar-right">
          {/* 模板下载 */}
          <button
            onClick={() => {
              if (activeTab === 'maternity') generateMaternityRulesTemplate();
              else if (activeTab === 'allowance') generateAllowanceRulesTemplate();
              else if (activeTab === 'employee') generateEmployeeTemplate();
              else if (activeTab === 'holiday') generateHolidayTemplate(selectedYear);
            }}
            className="btn-secondary"
          >
            📥 下载模板
          </button>
          
          {/* 文件导入 */}
          <label className="btn-secondary file-input-label">
            📤 导入数据
            <input
              type="file"
              accept=".xlsx,.xls"
              onChange={(e) => handleFileImport(e, activeTab)}
              style={{ display: 'none' }}
            />
          </label>
          
          {/* 数据导出 */}
          <button
            onClick={() => handleExport(activeTab)}
            className="btn-secondary"
          >
            📊 导出数据
          </button>
        </div>
      </div>

      {/* 加载状态 */}
      {isLoading && (
        <div className="loading">
          <div className="loading-spinner"></div>
          <span>处理中...</span>
        </div>
      )}

      {/* 添加/编辑表单 */}
      {showAddForm && (
        <div className="form-section">
          {activeTab === 'maternity' && renderMaternityForm()}
          {activeTab === 'allowance' && renderAllowanceForm()}
          {activeTab === 'employee' && renderEmployeeForm()}
          {activeTab === 'holiday' && renderHolidayControls()}
        </div>
      )}

      {/* 数据表格 */}
      <div className="content-section">
        {activeTab === 'maternity' && renderMaternityRulesTable()}
        {activeTab === 'allowance' && renderAllowanceRulesTable()}
        {activeTab === 'employee' && renderEmployeeTable()}
        {activeTab === 'holiday' && renderHolidayTable()}
      </div>

      {/* 统计信息 */}
      <div className="stats-section">
        <div className="stats-card">
          <h4>数据统计</h4>
          <div className="stats-grid">
            <div className="stat-item">
              <span className="stat-label">城市数量</span>
              <span className="stat-value">{cities.length}</span>
            </div>
            <div className="stat-item">
              <span className="stat-label">产假规则</span>
              <span className="stat-value">{selectedCity ? maternityRules.length : cityDataManager.maternityRules.length}</span>
            </div>
            <div className="stat-item">
              <span className="stat-label">津贴规则</span>
              <span className="stat-value">{selectedCity ? allowanceRules.length : cityDataManager.allowanceRules.length}</span>
            </div>
            <div className="stat-item">
              <span className="stat-label">员工信息</span>
              <span className="stat-value">{selectedCity ? employeeData.length : cityDataManager.employeeData.length}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CityDataManager;
