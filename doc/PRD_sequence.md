# 生育津贴与产假管理系统｜核心时序图

> 依据实现逻辑绘制（参考 `src/components/*`, `src/utils/*`, `src/api/*`, `server/src/*`）。

---

## 1. 产假津贴计算流程（含双存储模式）

```mermaid
sequenceDiagram
    autonumber
    actor U as 用户(HR/员工)
    participant AC as FE: AllowanceCalculator
    participant CDM as FE: cityDataManager
    participant HU as FE: holidayUtils
    participant PC as FE: Postgres Clients
    participant API as BE: Express /api
    participant SVC as BE: Services
    participant DB as PG: Tables

    U->>AC: 选择城市/员工/生产条件, 点击“计算”
    AC->>CDM: loadData() 获取规则与员工
    alt StorageMode = postgres
        AC->>PC: listMaternityRules/listAllowanceRules/listRefundRules/listEmployees
        PC->>API: GET /maternity-rules?city=... 等
        API->>SVC: 调用对应 service
        SVC->>DB: SELECT ...
        DB-->>SVC: rows
        SVC-->>API: { success, data }
        API-->>PC: 200 JSON
        PC-->>CDM: 规则与员工数据
    else StorageMode = indexeddb
        CDM-->>AC: 从 IndexedDB 读取内存态数据
    end

    AC->>HU: warmUpHolidayPlan(year), getHolidaySets(year)
    HU->>DB: (若 postgres 模式) 通过 BE 读取/预热（由管理动作写入）
    HU-->>AC: { holidays, makeupWorkdays }

    AC->>AC: calculateMaternityAllowance(...) 依据规则+节假日顺延
    AC-->>U: 显示产假天数、起止、政府津贴、应领、补差、返还项
    U->>AC: 导出 PDF/Excel
    AC->>AC: exportAllowancePdf()/exportAllowanceExcel()
```

---

## 2. 节假日管理：新增日期

```mermaid
sequenceDiagram
    autonumber
    actor U as 用户(HR)
    participant HM as FE: HolidayManager
    participant API as BE: /api/holidays/date (POST)
    participant SVC as BE: holidayService.addHolidayDate
    participant DB as PG: t_holidays

    U->>HM: 选择年份与日期, 设定类型(节假日/工作日)
    HM->>API: POST /holidays/date { year, date, type, name, isLegalHoliday }
    API->>SVC: addHolidayDate(...)
    SVC->>DB: SELECT ... FOR UPDATE (校验重复)
    alt 已存在同一日期
        DB-->>SVC: 命中
        SVC-->>API: 409 { code: HOLIDAY_DATE_EXISTS }
        API-->>HM: 错误提示
    else 不存在
        SVC->>DB: INSERT t_holidays
        DB-->>SVC: OK
        SVC-->>API: 返回该年最新计划
        API-->>HM: { holidays, makeupWorkdays }
        HM->>HM: 更新UI并 warmUpHolidayPlan(year)
    end
```

---

## 3. 产假规则导入（Postgres模式，全量覆盖）

```mermaid
sequenceDiagram
    autonumber
    actor U as 用户(HR)
    participant MR as FE: MaternityRulesManager
    participant CDM as FE: cityDataManager
    participant PC as FE: postgresMaternityRulesClient
    participant API as BE: /api/maternity-rules/import
    participant SVC as BE: maternityRuleService.importRules
    participant DB as PG: t_maternity_rules

    U->>MR: 选择Excel文件并导入
    MR->>CDM: setMaternityRules(parsedRules)
    alt StorageMode = postgres
        CDM->>PC: importMaternityRules(rules)
        PC->>API: POST /maternity-rules/import { rules }
        API->>SVC: importRules()
        SVC->>DB: BEGIN; TRUNCATE t_maternity_rules; BULK INSERT; COMMIT
        DB-->>SVC: OK
        SVC-->>API: { count }
        API-->>PC: 200 JSON
        PC-->>CDM: { count }
        CDM->>PC: listMaternityRules()
        PC->>API: GET /maternity-rules
        API->>SVC: findAll order by city/type
        SVC->>DB: SELECT
        DB-->>SVC: rows
        SVC-->>API: { data }
        API-->>PC: 200 JSON
        PC-->>CDM: 规则刷新
        CDM-->>MR: 通知刷新UI
    else StorageMode = indexeddb
        CDM->>CDM: 合并/覆盖内存与IndexedDB
        CDM-->>MR: 通知刷新UI
    end
```

---

## 4. 批量处理：Excel导入并计算

```mermaid
sequenceDiagram
    autonumber
    actor U as 用户(HR)
    participant BP as FE: BatchProcessor
    participant EX as FE: excelUtils
    participant BC as FE: batchCalculations
    participant CDM as FE: cityDataManager
    participant HU as FE: holidayUtils

    U->>BP: 选择Excel并开始“批量处理”
    BP->>EX: readExcelFile(file)
    EX-->>BP: rows[]
    BP->>CDM: loadData() （获取城市规则/员工/返还规则）
    BP->>BC: processBatchData(rows)
    loop for each row
        BC->>HU: warmUpHolidayPlan(year) & 获取节假日集
        BC->>BC: 计算产假日期、津贴、补差、返还项
    end
    BC-->>BP: { results[], errors[] }
    BP-->>U: 展示结果与错误摘要
    U->>BP: 导出结果
    BP->>EX: exportResults(results, errors)
```

---

## 5. 员工登录校验（前端模拟）

```mermaid
sequenceDiagram
    autonumber
    actor E as 员工
    participant APP as FE: App.js(Login)
    participant DMA as FE: dataManagementApi.getEmployeesApi
    participant CDM as FE: cityDataManager

    E->>APP: 输入姓名并选择“员工”登录
    APP->>DMA: getEmployeesApi()
    DMA->>CDM: loadData(); getAllEmployees()
    CDM-->>DMA: employees[]
    DMA-->>APP: { ok: true, data: employees }
    APP->>APP: 过滤匹配姓名, 校验存在
    alt 匹配成功
        APP-->>E: 登录成功, 进入“产假津贴计算”
    else 未匹配
        APP-->>E: 提示“员工信息不存在”
    end
```
