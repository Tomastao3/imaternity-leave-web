# 产假计算系统 - 前后端分离架构方案

## 1. 架构概览

### 1.1 技术栈选型

**后端技术栈：**
- **框架**: Node.js + Express.js
- **数据库**: PostgreSQL 15+
- **ORM**: Sequelize
- **API文档**: Swagger/OpenAPI 3.0
- **验证**: Joi
- **日志**: Winston
- **进程管理**: PM2
- **测试**: Jest + Supertest

**前端技术栈（保持现有）：**
- React 18.2.0
- date-fns
- xlsx
- file-saver

### 1.2 系统架构图

```
┌─────────────────────────────────────────────────────────────┐
│                        前端 (React SPA)                      │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐   │
│  │津贴计算  │  │批量处理  │  │数据管理  │  │智能助手  │   │
│  └──────────┘  └──────────┘  └──────────┘  └──────────┘   │
│                          │                                   │
│                    API Client (Axios)                        │
└─────────────────────────┼───────────────────────────────────┘
                          │ HTTP/REST
                          │
┌─────────────────────────▼───────────────────────────────────┐
│                    后端 API 服务 (Express)                   │
│  ┌──────────────────────────────────────────────────────┐  │
│  │                   API 路由层                          │  │
│  │  /api/maternity  /api/allowance  /api/employees      │  │
│  │  /api/holidays   /api/calculations /api/batch        │  │
│  └──────────────────────┬───────────────────────────────┘  │
│                         │                                    │
│  ┌──────────────────────▼───────────────────────────────┐  │
│  │                   业务逻辑层                          │  │
│  │  MaternityService  AllowanceService  EmployeeService │  │
│  │  HolidayService    CalculationService BatchService   │  │
│  └──────────────────────┬───────────────────────────────┘  │
│                         │                                    │
│  ┌──────────────────────▼───────────────────────────────┐  │
│  │                   数据访问层 (DAO)                    │  │
│  │  MaternityDAO  AllowanceDAO  EmployeeDAO  HolidayDAO│  │
│  └──────────────────────┬───────────────────────────────┘  │
│                         │                                    │
│  ┌──────────────────────▼───────────────────────────────┐  │
│  │                 ORM层 (Sequelize)                     │  │
│  └──────────────────────┬───────────────────────────────┘  │
└─────────────────────────┼───────────────────────────────────┘
                          │
┌─────────────────────────▼───────────────────────────────────┐
│                   PostgreSQL 数据库                          │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐     │
│  │产假规则表    │  │津贴规则表    │  │员工信息表    │     │
│  │maternity_    │  │allowance_    │  │employees     │     │
│  │rules         │  │rules         │  │              │     │
│  └──────────────┘  └──────────────┘  └──────────────┘     │
│  ┌──────────────┐  ┌──────────────┐                        │
│  │节假日表      │  │计算历史表    │                        │
│  │holidays      │  │calculations  │                        │
│  └──────────────┘  └──────────────┘                        │
└─────────────────────────────────────────────────────────────┘
```

---

## 2. 数据库设计

### 2.1 数据表结构

#### 2.1.1 产假规则表 (maternity_rules)

```sql
CREATE TABLE maternity_rules (
    id                      SERIAL PRIMARY KEY,
    city                    VARCHAR(50) NOT NULL,
    leave_type              VARCHAR(100) NOT NULL,  -- 法定产假/难产假/多胞胎/晚育假/生育假/奖励假/流产假等
    miscarriage_type        VARCHAR(100),           -- 流产类型（仅流产假需要）
    days                    INTEGER NOT NULL,
    is_extendable           BOOLEAN DEFAULT FALSE,  -- 是否遇法定节假日顺延
    notes                   TEXT,
    created_at              TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at              TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(city, leave_type, miscarriage_type)
);

CREATE INDEX idx_maternity_city ON maternity_rules(city);
CREATE INDEX idx_maternity_leave_type ON maternity_rules(leave_type);
```

#### 2.1.2 津贴规则表 (allowance_rules)

```sql
CREATE TABLE allowance_rules (
    id                          SERIAL PRIMARY KEY,
    city                        VARCHAR(50) NOT NULL UNIQUE,
    social_average_wage         NUMERIC(12,2) NOT NULL,     -- 社平工资
    company_average_wage        NUMERIC(12,2) NOT NULL,     -- 公司平均工资
    company_contribution_wage   NUMERIC(12,2),              -- 公司平均缴费工资
    calculation_base            VARCHAR(50) DEFAULT '平均工资', -- 平均工资/平均缴费工资
    account_type                VARCHAR(20) NOT NULL,       -- 企业/个人
    maternity_policy            TEXT,                       -- 产假政策说明
    allowance_policy            TEXT,                       -- 津贴政策说明
    effective_from              DATE NOT NULL,
    effective_to                DATE,
    created_at                  TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at                  TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_allowance_city ON allowance_rules(city);
```

#### 2.1.3 员工信息表 (employees)

```sql
CREATE TABLE employees (
    id                          SERIAL PRIMARY KEY,
    employee_id                 VARCHAR(50) NOT NULL UNIQUE,  -- 工号
    employee_name               VARCHAR(100) NOT NULL,
    city                        VARCHAR(50) NOT NULL,
    basic_salary                NUMERIC(12,2) NOT NULL,       -- 基本工资
    social_security_base        NUMERIC(12,2) NOT NULL,       -- 社保基数
    department                  VARCHAR(100),
    position                    VARCHAR(100),
    is_difficult_birth          BOOLEAN DEFAULT FALSE,
    number_of_babies            INTEGER DEFAULT 1,
    pregnancy_period            VARCHAR(50),
    created_at                  TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at                  TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_employee_id ON employees(employee_id);
CREATE INDEX idx_employee_city ON employees(city);
CREATE INDEX idx_employee_name ON employees(employee_name);
```

#### 2.1.4 节假日表 (holidays)

```sql
CREATE TABLE holidays (
    id                  SERIAL PRIMARY KEY,
    year                INTEGER NOT NULL,
    holiday_date        DATE NOT NULL,
    holiday_name        VARCHAR(100) NOT NULL,
    is_legal_holiday    BOOLEAN DEFAULT TRUE,   -- 是否法定假日
    is_makeup_workday   BOOLEAN DEFAULT FALSE,  -- 是否调休上班日
    created_at          TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at          TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(year, holiday_date)
);

CREATE INDEX idx_holiday_year ON holidays(year);
CREATE INDEX idx_holiday_date ON holidays(holiday_date);
```

#### 2.1.5 计算历史表 (calculation_history)

```sql
CREATE TABLE calculation_history (
    id                          SERIAL PRIMARY KEY,
    employee_id                 VARCHAR(50),
    employee_name               VARCHAR(100),
    city                        VARCHAR(50) NOT NULL,
    calculation_type            VARCHAR(50) NOT NULL,  -- allowance/batch/deduction
    start_date                  DATE NOT NULL,
    end_date                    DATE,
    total_maternity_days        INTEGER,
    government_paid_amount      NUMERIC(12,2),
    employee_receivable         NUMERIC(12,2),
    company_supplement          NUMERIC(12,2),
    personal_social_security    NUMERIC(12,2),
    calculation_params          JSONB,                 -- 存储完整计算参数
    calculation_result          JSONB,                 -- 存储完整计算结果
    created_by                  VARCHAR(100),
    created_at                  TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_calc_employee ON calculation_history(employee_id);
CREATE INDEX idx_calc_date ON calculation_history(created_at);
CREATE INDEX idx_calc_type ON calculation_history(calculation_type);
```

---

## 3. API 接口设计

### 3.1 RESTful API 规范

**基础URL**: `http://localhost:3001/api`

**通用响应格式**:
```json
{
  "success": true,
  "data": {},
  "message": "操作成功",
  "timestamp": "2025-10-06T22:00:00Z"
}
```

**错误响应格式**:
```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "参数验证失败",
    "details": []
  },
  "timestamp": "2025-10-06T22:00:00Z"
}
```

### 3.2 产假规则 API

#### GET /api/maternity-rules
获取产假规则列表

**Query参数**:
- `city` (可选): 城市名称
- `leaveType` (可选): 产假类型
- `page` (可选): 页码，默认1
- `pageSize` (可选): 每页数量，默认50

**响应**:
```json
{
  "success": true,
  "data": {
    "total": 100,
    "page": 1,
    "pageSize": 50,
    "items": [
      {
        "id": 1,
        "city": "上海",
        "leaveType": "法定产假",
        "miscarriageType": null,
        "days": 98,
        "isExtendable": false,
        "notes": "",
        "createdAt": "2025-01-01T00:00:00Z",
        "updatedAt": "2025-01-01T00:00:00Z"
      }
    ]
  }
}
```

#### POST /api/maternity-rules
创建产假规则

**请求体**:
```json
{
  "city": "绍兴",
  "leaveType": "晚育假/生育假/奖励假-二孩、三孩",
  "miscarriageType": null,
  "days": 90,
  "isExtendable": false,
  "notes": "绍兴市二孩三孩奖励假"
}
```

#### PUT /api/maternity-rules/:id
更新产假规则

#### DELETE /api/maternity-rules/:id
删除产假规则

#### POST /api/maternity-rules/batch
批量导入产假规则

**请求体**:
```json
{
  "rules": [
    {
      "city": "上海",
      "leaveType": "法定产假",
      "days": 98,
      "isExtendable": false
    }
  ],
  "replaceAll": false  // 是否替换全部数据
}
```

### 3.3 津贴规则 API

#### GET /api/allowance-rules
获取津贴规则列表

#### GET /api/allowance-rules/:city
根据城市获取津贴规则

#### POST /api/allowance-rules
创建津贴规则

#### PUT /api/allowance-rules/:id
更新津贴规则

#### DELETE /api/allowance-rules/:id
删除津贴规则

### 3.4 员工信息 API

#### GET /api/employees
获取员工列表

**Query参数**:
- `city` (可选): 城市
- `search` (可选): 搜索关键词（工号或姓名）
- `page` (可选): 页码
- `pageSize` (可选): 每页数量

#### GET /api/employees/:id
获取员工详情

#### POST /api/employees
创建员工

#### PUT /api/employees/:id
更新员工

#### DELETE /api/employees/:id
删除员工

#### POST /api/employees/batch
批量导入员工

### 3.5 节假日 API

#### GET /api/holidays
获取节假日列表

**Query参数**:
- `year` (必填): 年份

#### POST /api/holidays
创建节假日

#### PUT /api/holidays/:id
更新节假日

#### DELETE /api/holidays/:id
删除节假日

#### POST /api/holidays/batch
批量导入节假日

#### POST /api/holidays/copy-year
复制年份节假日

**请求体**:
```json
{
  "fromYear": 2025,
  "toYear": 2026
}
```

### 3.6 计算 API

#### POST /api/calculations/maternity-allowance
计算产假津贴

**请求体**:
```json
{
  "city": "上海",
  "employeeBasicSalary": 20000,
  "startDate": "2025-03-01",
  "isDifficultBirth": false,
  "numberOfBabies": 1,
  "pregnancyPeriod": "7个月以上",
  "paymentMethod": "企业账户",
  "endDate": null,
  "isMiscarriage": false,
  "doctorAdviceDays": null,
  "meetsSupplementalDifficultBirth": false,
  "isSecondThirdChild": false,
  "overrideGovernmentPaidAmount": null,
  "overridePersonalSSMonthly": null,
  "overrideCompanyAvg": null,
  "overrideSocialLimit": null,
  "employeeBaseSalaryCurrent": null,
  "salaryAdjustment": null,
  "socialSecurityAdjustment": null
}
```

**响应**:
```json
{
  "success": true,
  "data": {
    "city": "上海",
    "totalMaternityDays": 158,
    "appliedRules": [
      {
        "type": "法定产假",
        "days": 98
      },
      {
        "type": "晚育假/生育假/奖励假",
        "days": 60
      }
    ],
    "maternityPolicy": "上海市女职工劳动保护实施办法",
    "allowancePolicy": "按上海市规定发放",
    "calculatedPeriod": {
      "startDate": "2025年03月01日",
      "endDate": "2025年08月05日",
      "actualDays": 158,
      "workingDays": 113,
      "period": "2025年03月01日 - 2025年08月05日"
    },
    "governmentPaidAmount": 52666.67,
    "employeeReceivable": 52666.67,
    "companySupplement": 0,
    "personalSocialSecurity": 0,
    "actualCompensation": 0,
    "totalReceived": 0,
    "isSupplementNeeded": false,
    "paymentMethod": "企业账户",
    "startMonthProratedWage": 8000.00,
    "endMonthProratedWage": 6000.00,
    "personalSSMonths": ["2025-03", "2025-04", "2025-05", "2025-06", "2025-07"],
    "personalSSMonthsCount": 5,
    "debugInfo": {}
  }
}
```

#### POST /api/calculations/maternity-days
计算产假天数（简化版）

#### POST /api/calculations/batch
批量计算

**请求体**:
```json
{
  "employees": [
    {
      "employeeId": "EMP001",
      "employeeName": "张三",
      "city": "上海",
      "startDate": "2025-03-01",
      "employeeBasicSalary": 20000,
      "isDifficultBirth": false,
      "numberOfBabies": 1
    }
  ]
}
```

### 3.7 工具 API

#### GET /api/cities
获取所有城市列表

#### GET /api/health
健康检查

---

## 4. 后端项目结构

```
server/
├── src/
│   ├── app.js                      # Express应用入口
│   ├── server.js                   # 服务器启动文件
│   ├── config/
│   │   ├── database.js             # 数据库配置
│   │   ├── app.config.js           # 应用配置
│   │   └── swagger.js              # Swagger配置
│   ├── models/                     # Sequelize模型
│   │   ├── index.js                # 模型索引
│   │   ├── MaternityRule.js
│   │   ├── AllowanceRule.js
│   │   ├── Employee.js
│   │   ├── Holiday.js
│   │   └── CalculationHistory.js
│   ├── routes/                     # 路由定义
│   │   ├── index.js
│   │   ├── maternity.routes.js
│   │   ├── allowance.routes.js
│   │   ├── employee.routes.js
│   │   ├── holiday.routes.js
│   │   └── calculation.routes.js
│   ├── controllers/                # 控制器
│   │   ├── maternity.controller.js
│   │   ├── allowance.controller.js
│   │   ├── employee.controller.js
│   │   ├── holiday.controller.js
│   │   └── calculation.controller.js
│   ├── services/                   # 业务逻辑层
│   │   ├── maternity.service.js
│   │   ├── allowance.service.js
│   │   ├── employee.service.js
│   │   ├── holiday.service.js
│   │   └── calculation.service.js
│   ├── dao/                        # 数据访问层
│   │   ├── maternity.dao.js
│   │   ├── allowance.dao.js
│   │   ├── employee.dao.js
│   │   └── holiday.dao.js
│   ├── utils/                      # 工具函数
│   │   ├── maternityCalculations.js  # 产假计算逻辑（从前端迁移）
│   │   ├── holidayUtils.js           # 节假日工具（从前端迁移）
│   │   ├── dateUtils.js              # 日期工具
│   │   ├── validator.js              # 验证工具
│   │   └── logger.js                 # 日志工具
│   ├── middleware/                 # 中间件
│   │   ├── errorHandler.js         # 错误处理
│   │   ├── validator.js            # 请求验证
│   │   ├── cors.js                 # CORS配置
│   │   └── logger.js               # 日志中间件
│   └── validators/                 # 请求验证规则
│       ├── maternity.validator.js
│       ├── allowance.validator.js
│       ├── employee.validator.js
│       └── calculation.validator.js
├── tests/                          # 测试文件
│   ├── unit/
│   ├── integration/
│   └── e2e/
├── scripts/                        # 脚本文件
│   ├── init-db.js                  # 初始化数据库
│   ├── seed-data.js                # 种子数据
│   └── migrate.js                  # 数据迁移
├── docs/                           # 文档
│   └── api.yaml                    # OpenAPI规范
├── .env.example                    # 环境变量示例
├── .gitignore
├── package.json
├── README.md
└── ecosystem.config.js             # PM2配置
```

---

## 5. 核心业务逻辑迁移

### 5.1 产假计算逻辑 (calculation.service.js)

将 `src/utils/maternityCalculations.js` 中的核心计算逻辑迁移到后端：

```javascript
// server/src/services/calculation.service.js

class CalculationService {
  /**
   * 计算产假津贴
   */
  async calculateMaternityAllowance(params) {
    // 1. 获取城市津贴规则
    const allowanceRule = await this.allowanceService.getRuleByCity(params.city);
    
    // 2. 获取产假规则
    const maternityRules = await this.maternityService.getRulesByCity(params.city);
    
    // 3. 获取节假日数据
    const holidays = await this.holidayService.getHolidaysByYear(params.startYear);
    
    // 4. 计算产假天数
    const maternityDaysResult = this.autoCalculateMaternityDays(
      maternityRules,
      params
    );
    
    // 5. 计算津贴金额
    const allowanceResult = this.calculateAllowanceAmount(
      allowanceRule,
      maternityDaysResult,
      params
    );
    
    // 6. 计算个人社保
    const socialSecurityResult = this.calculatePersonalSocialSecurity(
      params,
      maternityDaysResult,
      holidays
    );
    
    // 7. 保存计算历史
    await this.saveCalculationHistory({
      ...params,
      ...maternityDaysResult,
      ...allowanceResult,
      ...socialSecurityResult
    });
    
    return {
      ...maternityDaysResult,
      ...allowanceResult,
      ...socialSecurityResult
    };
  }
  
  /**
   * 自动计算产假天数
   */
  autoCalculateMaternityDays(maternityRules, params) {
    // 迁移前端 autoCalculateMaternityDays 逻辑
    // ...
  }
  
  /**
   * 批量计算
   */
  async batchCalculate(employees) {
    const results = [];
    const errors = [];
    
    for (const employee of employees) {
      try {
        const result = await this.calculateMaternityAllowance(employee);
        results.push({
          employee,
          result
        });
      } catch (error) {
        errors.push({
          employee,
          error: error.message
        });
      }
    }
    
    return { results, errors };
  }
}
```

### 5.2 节假日工具 (holiday.service.js)

将 `src/utils/holidayUtils.js` 迁移到后端：

```javascript
// server/src/services/holiday.service.js

class HolidayService {
  /**
   * 获取指定年份的节假日
   */
  async getHolidaysByYear(year) {
    return await this.holidayDao.findByYear(year);
  }
  
  /**
   * 获取节假日集合（用于计算）
   */
  async getHolidaySets(year) {
    const holidays = await this.getHolidaysByYear(year);
    
    const holidaySet = new Set();
    const makeupWorkdaySet = new Set();
    
    holidays.forEach(h => {
      const dateStr = format(new Date(h.holidayDate), 'yyyy-MM-dd');
      if (h.isLegalHoliday) {
        holidaySet.add(dateStr);
      }
      if (h.isMakeupWorkday) {
        makeupWorkdaySet.add(dateStr);
      }
    });
    
    return {
      holidays: holidaySet,
      makeupWorkdays: makeupWorkdaySet
    };
  }
  
  /**
   * 计算工作日天数
   */
  countWorkingDays(start, end, holidays, makeupWorkdays) {
    // 迁移前端逻辑
    // ...
  }
}
```

---

## 6. 前端改造方案

### 6.1 API Client 封装

创建统一的 API 客户端：

```javascript
// src/api/apiClient.js

import axios from 'axios';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:3001/api';

const apiClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json'
  }
});

// 请求拦截器
apiClient.interceptors.request.use(
  config => {
    // 可以添加token等
    return config;
  },
  error => {
    return Promise.reject(error);
  }
);

// 响应拦截器
apiClient.interceptors.response.use(
  response => {
    return response.data;
  },
  error => {
    const message = error.response?.data?.error?.message || '请求失败';
    return Promise.reject(new Error(message));
  }
);

export default apiClient;
```

### 6.2 API 服务层

```javascript
// src/api/maternityService.js

import apiClient from './apiClient';

export const maternityService = {
  // 获取产假规则
  getRules: (params) => apiClient.get('/maternity-rules', { params }),
  
  // 创建产假规则
  createRule: (data) => apiClient.post('/maternity-rules', data),
  
  // 更新产假规则
  updateRule: (id, data) => apiClient.put(`/maternity-rules/${id}`, data),
  
  // 删除产假规则
  deleteRule: (id) => apiClient.delete(`/maternity-rules/${id}`),
  
  // 批量导入
  batchImport: (data) => apiClient.post('/maternity-rules/batch', data)
};

// src/api/calculationService.js

export const calculationService = {
  // 计算产假津贴
  calculateAllowance: (data) => apiClient.post('/calculations/maternity-allowance', data),
  
  // 批量计算
  batchCalculate: (data) => apiClient.post('/calculations/batch', data),
  
  // 计算产假天数
  calculateDays: (data) => apiClient.post('/calculations/maternity-days', data)
};
```

### 6.3 组件改造示例

```javascript
// src/components/AllowanceCalculator.js (改造后)

import { calculationService } from '../api/calculationService';

const AllowanceCalculator = () => {
  // ... 状态定义 ...
  
  const calculateAllowance = async () => {
    try {
      setLoading(true);
      
      const params = {
        city: selectedCity,
        employeeBasicSalary: parseFloat(employeeBasicSalary),
        startDate,
        isDifficultBirth,
        numberOfBabies,
        pregnancyPeriod,
        paymentMethod,
        endDate: endDate || null,
        isMiscarriage,
        doctorAdviceDays: doctorAdviceDays ? parseInt(doctorAdviceDays, 10) : null,
        meetsSupplementalDifficultBirth,
        isSecondThirdChild,
        // ... 其他参数 ...
      };
      
      // 调用后端API
      const response = await calculationService.calculateAllowance(params);
      
      setResult({
        ...response.data,
        selectedEmployee,
        employeeDisplayName
      });
      
    } catch (error) {
      alert('计算失败：' + error.message);
    } finally {
      setLoading(false);
    }
  };
  
  // ... 其他代码 ...
};
```

---

## 7. 部署方案

### 7.1 开发环境

```bash
# 后端
cd server
npm install
npm run dev    # 使用nodemon自动重启

# 前端
cd ..
npm start      # React开发服务器
```

### 7.2 生产环境

**使用 PM2 部署后端**:

```javascript
// ecosystem.config.js
module.exports = {
  apps: [{
    name: 'maternity-api',
    script: './src/server.js',
    instances: 2,
    exec_mode: 'cluster',
    env: {
      NODE_ENV: 'production',
      PORT: 3001
    }
  }]
};
```

**Nginx 配置**:

```nginx
server {
    listen 80;
    server_name yourdomain.com;
    
    # 前端静态文件
    location / {
        root /var/www/maternity-app/build;
        try_files $uri /index.html;
    }
    
    # 后端API代理
    location /api {
        proxy_pass http://localhost:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

### 7.3 Docker 部署

```dockerfile
# Dockerfile (后端)
FROM node:18-alpine

WORKDIR /app

COPY package*.json ./
RUN npm ci --only=production

COPY . .

EXPOSE 3001

CMD ["node", "src/server.js"]
```

```yaml
# docker-compose.yml
version: '3.8'

services:
  postgres:
    image: postgres:15-alpine
    environment:
      POSTGRES_DB: maternity_db
      POSTGRES_USER: admin
      POSTGRES_PASSWORD: password
    volumes:
      - postgres_data:/var/lib/postgresql/data
    ports:
      - "5432:5432"
  
  api:
    build: ./server
    ports:
      - "3001:3001"
    environment:
      DATABASE_URL: postgres://admin:password@postgres:5432/maternity_db
      NODE_ENV: production
    depends_on:
      - postgres
  
  nginx:
    image: nginx:alpine
    ports:
      - "80:80"
    volumes:
      - ./build:/usr/share/nginx/html
      - ./nginx.conf:/etc/nginx/conf.d/default.conf
    depends_on:
      - api

volumes:
  postgres_data:
```

---

## 8. 数据迁移方案

### 8.1 从 IndexedDB 迁移到 PostgreSQL

```javascript
// scripts/migrate-from-indexeddb.js

const { idbGet } = require('../src/utils/indexedDb');
const { MaternityRule, AllowanceRule, Employee, Holiday } = require('./models');

async function migrateData() {
  console.log('开始数据迁移...');
  
  // 1. 迁移产假规则
  const maternityRules = await idbGet('maternityRules');
  if (maternityRules && maternityRules.length > 0) {
    await MaternityRule.bulkCreate(maternityRules);
    console.log(`✓ 已迁移 ${maternityRules.length} 条产假规则`);
  }
  
  // 2. 迁移津贴规则
  const allowanceRules = await idbGet('allowanceRules');
  if (allowanceRules && allowanceRules.length > 0) {
    await AllowanceRule.bulkCreate(allowanceRules);
    console.log(`✓ 已迁移 ${allowanceRules.length} 条津贴规则`);
  }
  
  // 3. 迁移员工数据
  const employees = await idbGet('employeeData');
  if (employees && employees.length > 0) {
    await Employee.bulkCreate(employees);
    console.log(`✓ 已迁移 ${employees.length} 条员工数据`);
  }
  
  // 4. 迁移节假日数据
  const holidays = await idbGet('holidays');
  if (holidays) {
    const allHolidays = [];
    Object.keys(holidays).forEach(year => {
      holidays[year].forEach(h => {
        allHolidays.push({ ...h, year: parseInt(year) });
      });
    });
    if (allHolidays.length > 0) {
      await Holiday.bulkCreate(allHolidays);
      console.log(`✓ 已迁移 ${allHolidays.length} 条节假日数据`);
    }
  }
  
  console.log('数据迁移完成！');
}

migrateData().catch(console.error);
```

---

## 9. 实施步骤

### 第一阶段：后端基础搭建（1-2天）

1. ✅ 初始化 Node.js 项目
2. ✅ 配置 Express + Sequelize
3. ✅ 创建数据库表结构
4. ✅ 实现基础 CRUD API
5. ✅ 配置 Swagger 文档

### 第二阶段：核心业务迁移（2-3天）

1. ✅ 迁移产假计算逻辑到后端
2. ✅ 迁移节假日工具到后端
3. ✅ 实现计算 API
4. ✅ 编写单元测试

### 第三阶段：前端改造（2-3天）

1. ✅ 创建 API Client
2. ✅ 改造 AllowanceCalculator 组件
3. ✅ 改造 BatchProcessor 组件
4. ✅ 改造 CityDataManager 组件
5. ✅ 移除 IndexedDB 依赖

### 第四阶段：测试与优化（1-2天）

1. ✅ 集成测试
2. ✅ 性能优化
3. ✅ 错误处理完善
4. ✅ 文档完善

### 第五阶段：部署上线（1天）

1. ✅ 配置生产环境
2. ✅ 数据迁移
3. ✅ 部署测试
4. ✅ 正式上线

---

## 10. 注意事项

### 10.1 兼容性考虑

- 保持前端组件结构不变，仅替换数据源
- API 响应格式与前端现有数据结构保持一致
- 提供数据迁移工具，确保平滑过渡

### 10.2 性能优化

- 使用数据库索引优化查询
- 实现 API 响应缓存
- 批量操作使用事务
- 大数据量导出使用流式处理

### 10.3 安全性

- 实现请求参数验证
- 添加 SQL 注入防护（Sequelize 自带）
- 配置 CORS 白名单
- 实现 API 访问日志

### 10.4 可扩展性

- 使用分层架构，便于维护
- 预留认证授权接口
- 支持多租户扩展
- 支持微服务拆分

---

## 11. 总结

本方案提供了完整的前后端分离架构设计，包括：

✅ **清晰的技术栈选型** - Node.js + Express + PostgreSQL  
✅ **完整的数据库设计** - 5张核心表，支持所有业务场景  
✅ **RESTful API 规范** - 统一的接口设计和响应格式  
✅ **分层架构设计** - 路由、控制器、服务、DAO 四层分离  
✅ **核心逻辑迁移方案** - 保持计算逻辑一致性  
✅ **前端改造方案** - 最小化改动，平滑过渡  
✅ **部署方案** - 支持开发、生产、Docker 多种部署方式  
✅ **数据迁移方案** - 从 IndexedDB 平滑迁移到 PostgreSQL  
✅ **分阶段实施计划** - 8-11天完成全部开发

该方案可以直接用于实施，后续我将为您生成具体的代码实现。
