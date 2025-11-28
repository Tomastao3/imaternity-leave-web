import React, { useState, useEffect } from 'react';
import './CityDataManager.css';
import MaternityRulesManager from './MaternityRulesManager';
import AllowanceRulesManager from './AllowanceRulesManager';
import RefundRulesManager from './RefundRulesManager';
import EmployeeInfoManager from './EmployeeInfoManager';
import HolidayManager from './HolidayManager';
import { getCitiesApi, saveAllDataApi } from '../api/dataManagementApi';
import { cityDataManager } from '../utils/cityDataUtils';
import TabHeader from './TabHeader';

const CityDataManager = ({ userRole }) => {
  const [activeTab, setActiveTab] = useState('maternity');
  const [selectedCity, setSelectedCity] = useState('');
  const [cities, setCities] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });

  useEffect(() => {
    loadCities();
  }, []);

  const loadCities = async () => {
    try {
      const response = await getCitiesApi();
      if (response.ok) {
        const cityList = Array.isArray(response.data) ? response.data : [];
        setCities(cityList);
        if (selectedCity && !cityList.includes(selectedCity)) {
          setSelectedCity('');
        }
      }
    } catch (error) {
      console.error('加载城市列表失败:', error);
    }
  };

  const showMessage = (type, text) => {
    setMessage({ type, text });
    setTimeout(() => setMessage({ type: '', text: '' }), 5000);
  };

  const handleDataChange = async (scope = 'all') => {
    await cityDataManager.loadData({ scope });
    const reloadedCities = cityDataManager.getCities();
    setCities(reloadedCities);
    if (selectedCity && !reloadedCities.includes(selectedCity)) {
      setSelectedCity('');
    }
  };

  const handleSaveAll = async () => {
    setIsLoading(true);
    try {
      const response = await saveAllDataApi();
      if (response.ok) {
        await handleDataChange('all');
      } else {
        showMessage('error', response.error || '保存失败');
      }
    } catch (error) {
      console.error('保存全部数据失败:', error);
      showMessage('error', '保存失败，请检查网络或服务器状态');
    } finally {
      setIsLoading(false);
    }
  };
  const showEmployeeTab = userRole === 'hr';

  useEffect(() => {
    if (!showEmployeeTab && activeTab === 'employee') {
      setActiveTab('maternity');
    }
  }, [showEmployeeTab, activeTab]);

  const tabs = [
    { id: 'maternity', label: '产假规则', icon: '📅' },
    { id: 'allowance', label: '津贴规则', icon: '💰' },
    { id: 'refund', label: '返还规则', icon: '💸' },
    ...(showEmployeeTab ? [{ id: 'employee', label: '员工信息', icon: '👥' }] : []),
    { id: 'holiday', label: '节假日', icon: '🧨' }
  ];

  return (
    <div className="city-data-manager">
      <TabHeader
        icon="🏙️"
        title="基础数据管理"
        subtitle="管理各城市的产假规则、津贴规则、返还规则和员工信息"
      >
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
      </TabHeader>

      {/* 消息提示 */}
      {message.text && (
        <div className={`message ${message.type}`}>
          {message.text}
        </div>
      )}

      {/* 标签页导航 */}
      <div className="tabs sub-tabs">
        {tabs.map(tab => (
          <button
            key={tab.id}
            className={`tab ${activeTab === tab.id ? 'active' : ''}`}
            onClick={() => setActiveTab(tab.id)}
          >
            <span className="tab-icon">{tab.icon}</span>
            {tab.label}
          </button>
        ))}
      </div>

      {/* 数据表格 */}
      <div className="content-section">
        {activeTab === 'maternity' && (
          <MaternityRulesManager
            selectedCity={selectedCity}
            onDataChange={handleDataChange}
            onSaveAll={handleSaveAll}
          />
        )}
        {activeTab === 'allowance' && (
          <AllowanceRulesManager
            selectedCity={selectedCity}
            onDataChange={handleDataChange}
            onSaveAll={handleSaveAll}
          />
        )}
        {activeTab === 'refund' && (
          <RefundRulesManager
            selectedCity={selectedCity}
            onDataChange={handleDataChange}
            onSaveAll={handleSaveAll}
          />
        )}
        {showEmployeeTab && activeTab === 'employee' && (
          <EmployeeInfoManager
            selectedCity={selectedCity}
            onDataChange={handleDataChange}
            onSaveAll={handleSaveAll}
          />
        )}
        {activeTab === 'holiday' && (
          <HolidayManager
            onDataChange={handleDataChange}
            onSaveAll={handleSaveAll}
          />
        )}
      </div>

      {/* 加载状态 */}
      {isLoading && (
        <div className="loading">
          <div className="loading-spinner"></div>
          <span>处理中...</span>
        </div>
      )}
    </div>
  );
};

export default CityDataManager;
