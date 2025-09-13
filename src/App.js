import React, { useEffect, useState } from 'react';
import AllowanceCalculator from './components/AllowanceCalculator';
import BatchProcessor from './components/BatchProcessor';
import CityDataManager from './components/CityDataManager';
import AIChatDemo from './components/AIChatDemo';

function App() {
  const showManagement = (() => {
    if (typeof window === 'undefined' || !window.location) return false;
    const { pathname, search, hash } = window.location;
    // 兼容三种方式：
    // 1) 传统路径 /management
    // 2) 查询参数 ?management=1（适用于 file:// 打开）
    // 3) hash 包含 #management（适用于 file:// 打开）
    if (/\/management\/?$/.test(pathname)) return true;
    if (/[?&]management=1\b/.test(search)) return true;
    if (/#.*\bmanagement\b/.test(hash)) return true;
    return false;
  })();
  const [activeTab, setActiveTab] = useState(showManagement ? 'citydata' : 'allowance');

  const tabs = [
    { id: 'allowance', label: '产假津贴计算', component: AllowanceCalculator },
    { id: 'batch', label: '批量处理', component: BatchProcessor },
    { id: 'ai', label: '智能助手', component: AIChatDemo },
    ...(showManagement ? [{ id: 'citydata', label: '基础数据管理', component: CityDataManager }] : [])
  ];

  // If user navigates away from /management and current tab is hidden, fallback to allowance
  useEffect(() => {
    if (!showManagement && activeTab === 'citydata') {
      setActiveTab('allowance');
    }
  }, [showManagement, activeTab]);

  const ActiveComponent = tabs.find(tab => tab.id === activeTab)?.component;

  return (
    <div className="container">
      <div className="header">
        <h1>产假计算系统</h1>
        <p>为您提供准确的产假周期和津贴计算</p>
      </div>

      <div className="tabs">
        {tabs.map(tab => (
          <button
            key={tab.id}
            className={`tab ${activeTab === tab.id ? 'active' : ''}`}
            onClick={() => setActiveTab(tab.id)}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div className="card">
        {ActiveComponent && <ActiveComponent />}
      </div>
    </div>
  );
}

export default App;
