import React, { useEffect, useMemo, useState, useCallback, useRef } from 'react';
import AllowanceCalculator from './components/AllowanceCalculator';
import BatchProcessor from './components/BatchProcessor';
import CityDataManager from './components/CityDataManager';
import AIChatDemo from './components/AIChatDemo';
import MaternityCelebrationHeader from './components/MaternityCelebrationHeader';
import Login from './components/Login';
import { getEmployeesApi } from './api/dataManagementApi';

function App() {
  const scrollPositionRef = useRef(0);
  const [activeTab, setActiveTab] = useState('allowance');
  const [session, setSession] = useState(() => {
    try {
      const stored = sessionStorage.getItem('maternity-login-session');
      return stored ? JSON.parse(stored) : null;
    } catch (error) {
      console.warn('读取登录会话失败:', error);
      return null;
    }
  });

  useEffect(() => {
    if (session) {
      sessionStorage.setItem('maternity-login-session', JSON.stringify(session));
    } else {
      sessionStorage.removeItem('maternity-login-session');
    }
  }, [session]);

  const allTabs = useMemo(
    () => [
      { id: 'allowance', label: '产假津贴计算', component: AllowanceCalculator },
      { id: 'batch', label: '批量处理', component: BatchProcessor },
      { id: 'ai', label: '智能助手', component: AIChatDemo },
      { id: 'citydata', label: '基础数据管理', component: CityDataManager }
    ],
    []
  );

  const visibleTabs = useMemo(() => {
    if (!session) return [];
    if (session.role === 'employee') {
      return allTabs.filter(tab => ['allowance', 'ai'].includes(tab.id));
    }
    return allTabs;
  }, [allTabs, session]);

  useEffect(() => {
    if (!session) return;
    if (!visibleTabs.find(tab => tab.id === activeTab)) {
      setActiveTab(visibleTabs[0]?.id || 'allowance');
    }
  }, [session, visibleTabs, activeTab]);

  const [loginError, setLoginError] = useState('');

  const handleLogin = async ({ username, role }) => {
    // 先清空之前的错误
    setLoginError('');
    
    // 如果是员工登录，先验证员工信息
    if (role === 'employee') {
      try {
        const response = await getEmployeesApi();
        console.log('员工数据响应:', response);
        
        if (!response.ok) {
          // 使用 setTimeout 确保状态更新
          setTimeout(() => setLoginError('获取员工信息失败，请稍后重试'), 0);
          return;
        }
        
        if (!response.data || !Array.isArray(response.data)) {
          setTimeout(() => setLoginError('员工数据格式错误，请联系管理员'), 0);
          return;
        }
        
        const matchedEmployees = response.data.filter(emp => emp.employeeName === username);
        console.log('匹配的员工:', matchedEmployees);
        
        if (matchedEmployees.length === 0) {
          setTimeout(() => setLoginError('员工信息不存在，请联系HR'), 0);
          return;
        }
      } catch (error) {
        console.error('验证员工信息失败:', error);
        setTimeout(() => setLoginError('验证员工信息失败，请稍后重试'), 0);
        return;
      }
    }
    
    // 验证通过，设置会话
    const nextSession = { username, role };
    setSession(nextSession);
    setLoginError('');
    setActiveTab(role === 'employee' ? 'allowance' : 'allowance');
  };

  const handleLogout = useCallback(() => {
    setSession(null);
    setLoginError('');
    setActiveTab('allowance');
  }, []);

  if (!session) {
    return <Login onLogin={handleLogin} loginError={loginError} />;
  }

  return (
    <div className="container">
      <div className="header" style={{ marginBottom: '24px' }}>
        <MaternityCelebrationHeader onLogout={handleLogout} />
      </div>

      <div className="tabs">
        {visibleTabs.map(tab => (
          <button
            key={tab.id}
            className={`tab ${activeTab === tab.id ? 'active' : ''}`}
            onClick={(e) => {
              e.preventDefault();
              // Save current scroll position before switching
              scrollPositionRef.current = window.pageYOffset || document.documentElement.scrollTop;
              setActiveTab(tab.id);
              // Restore scroll position after a brief delay
              setTimeout(() => {
                window.scrollTo(0, scrollPositionRef.current);
              }, 0);
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div className="card" style={{ position: 'relative' }}>
        {visibleTabs.map(tab => {
          const TabComponent = tab.component;
          const isActive = activeTab === tab.id;
          const tabProps = {};
          if (tab.id === 'allowance' && session.role === 'employee') {
            tabProps.initialEmployeeName = session.username;
          }
          if (tab.id === 'allowance') {
            tabProps.onLogout = handleLogout;
            tabProps.userRole = session.role;
          }
          if (tab.id === 'citydata') {
            tabProps.userRole = session.role;
          }
          return (
            <div
              key={tab.id}
              style={{ 
                display: isActive ? 'block' : 'none', 
                width: '100%'
              }}
            >
              <TabComponent {...tabProps} />
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default App;
