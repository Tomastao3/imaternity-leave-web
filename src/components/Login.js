import React, { useState, useEffect } from 'react';

const Login = ({ onLogin, loginError }) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    console.log('Login组件收到loginError:', loginError);
    if (loginError) {
      setError(loginError);
      console.log('设置error状态为:', loginError);
    }
  }, [loginError]);

  const handleRoleLogin = (selectedRole) => {
    const trimmedUsername = username.trim();
    console.log('点击登录，用户名:', trimmedUsername, '角色:', selectedRole);
    if (!trimmedUsername) {
      setError('请输入用户名');
      return;
    }
    // 不在这里清空错误，让 App.js 的 loginError 控制
    console.log('调用onLogin');
    onLogin({ username: trimmedUsername, role: selectedRole });
  };

  const cardStyle = {
    width: '100%',
    maxWidth: '400px',
    padding: '40px',
    borderRadius: '20px',
    background: 'linear-gradient(135deg, rgba(255, 229, 217, 0.95), rgba(231, 198, 255, 0.9))',
    boxShadow: '0 24px 55px rgba(164, 77, 105, 0.25)',
    border: '1px solid rgba(255, 214, 224, 0.6)',
    display: 'flex',
    flexDirection: 'column',
    gap: '24px'
  };

  const inputStyle = {
    width: '100%',
    padding: '12px 16px',
    borderRadius: '12px',
    border: '1px solid rgba(164, 77, 105, 0.25)',
    fontSize: '16px',
    boxShadow: '0 4px 10px rgba(164, 77, 105, 0.12)',
    outline: 'none',
    backgroundColor: '#fff'
  };

  const labelStyle = {
    fontWeight: 600,
    color: '#5a2d43',
    marginBottom: '8px',
    fontSize: '14px'
  };

  const roleButtonStyle = {
    flex: 1,
    padding: '16px 0',
    borderRadius: '14px',
    border: 'none',
    cursor: 'pointer',
    fontWeight: 700,
    fontSize: '16px',
    transition: 'all 0.3s ease',
    background: 'linear-gradient(135deg, #ff7fa1, #d77bff)',
    color: '#fff',
    boxShadow: '0 12px 25px rgba(164, 77, 105, 0.3)'
  };

  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        background: 'linear-gradient(135deg, rgba(255, 229, 217, 0.4), rgba(231, 198, 255, 0.4))',
        padding: '48px 16px'
      }}
    >
      <div style={cardStyle}>
        {error && (
          <div style={{
            color: '#c33',
            fontSize: '14px',
            textAlign: 'center',
            marginBottom: '16px'
          }}>
            {error}
          </div>
        )}

        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <label htmlFor="username" style={labelStyle}>用户名 *</label>
          <input
            id="username"
            type="text"
            value={username}
            onChange={(e) => {
              setUsername(e.target.value);
              if (error) {
                setError('');
              }
            }}
            placeholder="请输入用户名"
            style={inputStyle}
          />
        </div>

        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <label htmlFor="password" style={labelStyle}>密码</label>
          <input
            id="password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="请输入密码"
            style={inputStyle}
          />
        </div>

        <div style={{ display: 'flex', gap: '16px' }}>
          <button
            onClick={() => handleRoleLogin('employee')}
            style={roleButtonStyle}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = 'translateY(-2px)';
              e.currentTarget.style.boxShadow = '0 16px 32px rgba(164, 77, 105, 0.4)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = 'translateY(0)';
              e.currentTarget.style.boxShadow = '0 12px 25px rgba(164, 77, 105, 0.3)';
            }}
          >
            员工登录
          </button>
          <button
            onClick={() => handleRoleLogin('hr')}
            style={roleButtonStyle}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = 'translateY(-2px)';
              e.currentTarget.style.boxShadow = '0 16px 32px rgba(164, 77, 105, 0.4)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = 'translateY(0)';
              e.currentTarget.style.boxShadow = '0 12px 25px rgba(164, 77, 105, 0.3)';
            }}
          >
            HR登录
          </button>
        </div>
      </div>
    </div>
  );
};

export default Login;
