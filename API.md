# REST API Reference

Base URL: `http://localhost:3001/api`

## Health
- **GET** `/health`
  - **Description**: Service health check.
  - **Response**
    ```json
    {
      "success": true,
      "data": {
        "status": "ok",
        "timestamp": "2025-10-12T06:00:00.000Z"
      }
    }
    ```

## Holidays (`server/src/routes/holidays.js`)
- **GET** `/holidays?year=YYYY`
  - **Description**: Fetch the holiday plan for a specific year.
  - **Query Parameters**
    - `year` (number, required)
  - **Response**
    ```json
    {
      "success": true,
      "data": {
        "holidays": [
          { "date": "2025-02-10", "name": "春节", "isLegalHoliday": true }
        ],
        "makeupWorkdays": [
          { "date": "2025-02-08", "name": "调休", "isLegalHoliday": false }
        ],
        "years": [2024, 2025, 2026]
      }
    }
    ```

- **GET** `/holidays/years`
  - **Description**: List all years that currently have holiday data.
  - **Response**
    ```json
    { "success": true, "data": [2024, 2025, 2026] }
    ```

- **POST** `/holidays/plan`
  - **Description**: Replace the entire holiday plan for a year.
  - **Body**
    ```json
    {
      "year": 2025,
      "plan": {
        "holidays": [
          { "date": "2025-02-10", "name": "春节", "isLegalHoliday": true }
        ],
        "makeupWorkdays": [
          { "date": "2025-02-08", "name": "调休", "isLegalHoliday": false }
        ]
      }
    }
    ```
  - **Response**
    ```json
    { "success": true, "data": { "count": 2 } }
    ```

- **POST** `/holidays/date`
  - **Description**: Add or overwrite a single holiday date.
  - **Body**
    ```json
    {
      "year": 2025,
      "date": "2025-02-10",
      "type": "holiday",
      "name": "春节",
      "isLegalHoliday": true
    }
    ```
  - **Response**
    ```json
    { "success": true, "data": { /* updated plan */ } }
    ```

- **PATCH** `/holidays/date`
  - **Description**: Update an existing holiday entry, optionally moving it to a new date/year.
  - **Body**
    ```json
    {
      "sourceYear": 2025,
      "originalDate": "2025-02-10",
      "targetYear": 2025,
      "newDate": "2025-02-11",
      "type": "holiday",
      "name": "春节调休",
      "isLegalHoliday": true
    }
    ```
  - **Response**
    ```json
    { "success": true, "data": { /* updated plan */ } }
    ```

- **DELETE** `/holidays/date`
  - **Description**: Remove a specific holiday date from a year.
  - **Body**
    ```json
    {
      "year": 2025,
      "date": "2025-02-11"
    }
    ```
  - **Response**
    ```json
    { "success": true, "data": { /* updated plan */ } }
    ```

- **POST** `/holidays/import`
  - **Description**: Bulk import holiday data grouped by year.
  - **Body**
    ```json
    {
      "holidays": [
        { "year": 2025, "date": "2025-01-01", "type": "holiday", "name": "元旦", "isLegalHoliday": true },
        { "year": 2025, "date": "2025-01-02", "type": "makeup", "name": "调休" }
      ]
    }
    ```
  - **Response**
    ```json
    { "success": true, "data": { "count": 2 } }
    ```

## Maternity Rules (`server/src/routes/maternityRules.js`)
- **GET** `/maternity-rules?city=城市`
  - **Description**: Retrieve maternity leave rules, optionally filtered by city.
  - **Response**
    ```json
    { "success": true, "data": [ /* rules */ ] }
    ```

- **POST** `/maternity-rules`
  - **Description**: Create a new maternity leave rule.
  - **Body**
    ```json
    {
      "city": "上海",
      "leaveType": "法定产假",
      "miscarriageType": "",
      "leaveDays": 98,
      "isExtendable": false,
      "hasAllowance": true
    }
    ```

- **PATCH** `/maternity-rules/:id`
  - **Description**: Update fields on an existing maternity leave rule.
  - **Body** 同 POST（需要更新的字段）

- **DELETE** `/maternity-rules/:id`
  - **Description**: Delete a maternity leave rule by ID.
  - **Response**
    ```json
    { "success": true, "data": { "deleted": true } }
    ```

- **POST** `/maternity-rules/import`
  - **Description**: Replace the rule set with a batch import.
  - **Body**
    ```json
    {
      "rules": [
        { "city": "上海", "leaveType": "奖励假", "leaveDays": 30, "isExtendable": true, "hasAllowance": true }
      ]
    }
    ```

## Allowance Rules (`server/src/routes/allowanceRules.js`)
- **GET** `/allowance-rules?city=城市`
  - **Description**: Retrieve maternity allowance rules, optionally filtered by city.
  - **Response**
    ```json
    { "success": true, "data": [ /* allowance rules */ ] }
    ```

- **POST** `/allowance-rules`
  - **Description**: Create a new allowance rule entry.
  - **Body**
    ```json
    {
      "city": "上海",
      "socialAverageWage": 12307.00,
      "companyAverageWage": 49000.00,
      "companyContributionWage": 30000.00,
      "calculationBase": "平均工资",
      "payoutMethod": "个人",
      "maternityPolicy": "说明",
      "allowancePolicy": "说明"
    }
    ```

- **PATCH** `/allowance-rules/:id`
  - **Description**: Update an existing allowance rule by ID.
  - **Body** 同 POST（需要更新的字段）

- **DELETE** `/allowance-rules/:id`
  - **Description**: Delete an allowance rule by ID.
  - **Response**
    ```json
    { "success": true, "data": { "deleted": true } }
    ```

- **POST** `/allowance-rules/import`
  - **Description**: Bulk import allowance rules, replacing existing data.
  - **Body**
    ```json
    {
      "rules": [
        {
          "city": "北京",
          "socialAverageWage": 12297.00,
          "companyAverageWage": 35000.00,
          "companyContributionWage": 30000.00,
          "calculationBase": "平均缴费工资",
          "payoutMethod": "企业"
        }
      ]
    }
    ```

## Employees (`server/src/routes/employees.js`)
- **GET** `/employees?city=城市`
  - **Description**: Retrieve employee records, optionally filtered by city.
  - **Response**
    ```json
    { "success": true, "data": [ /* employees */ ] }
    ```

- **POST** `/employees`
  - **Description**: Create a new employee record.
  - **Body**
    ```json
    {
      "employeeNo": "E001",
      "employeeName": "张三",
      "city": "上海",
      "employeeBasicSalary": 20000.00,
      "employeeBaseSalaryCurrent": 18000.00,
      "paymentMethod": "企业账户",
      "isDifficultBirth": false,
      "numberOfBabies": 1,
      "pregnancyPeriod": "单胎"
    }
    ```

- **PATCH** `/employees/:id`
  - **Description**: Update an existing employee record by ID.
  - **Body** 同 POST（需要更新的字段）

- **DELETE** `/employees/:id`
  - **Description**: Delete an employee record by ID.
  - **Response**
    ```json
    { "success": true, "data": { "deleted": true } }
    ```

- **POST** `/employees/import`
  - **Description**: Bulk import employee data, replacing the current dataset.
  - **Body**
    ```json
    {
      "employees": [
        {
          "employeeNo": "E002",
          "employeeName": "李四",
          "city": "深圳",
          "employeeBasicSalary": 18000.00,
          "paymentMethod": "个人账户"
        }
      ]
    }
    ```

```}
