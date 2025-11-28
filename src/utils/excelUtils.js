import * as XLSX from 'xlsx';
import { saveAs } from 'file-saver';
import { setHolidayPlan, getHolidayPlan } from './holidayUtils';

// 生成员工数据导入模板
export const generateEmployeeTemplate = () => {
  const templateRow = {
    '员工姓名': '张三',
    '员工编号': 'EMP001',
    '所在城市': '上海',
    '产假开始日期': '2024-06-01',
    '员工产前12个月的月均工资': 8500,
    '员工基本工资': 9000,
    '月个人部分社保公积金合计': 2000,
    '公司已发产假工资': 436543,
    '政府发放津贴金额': 45343,
    '生产情况': '顺产',
    '流产类型': '7个月以上',
    '胎数': 1
  };

  const worksheet = XLSX.utils.json_to_sheet([templateRow]);
  worksheet['!cols'] = [
    { wch: 12 }, // 员工姓名
    { wch: 12 }, // 员工编号
    { wch: 12 }, // 所在城市
    { wch: 14 }, // 产假开始日期
    { wch: 20 }, // 员工产前12个月的月均工资
    { wch: 16 }, // 员工基本工资
    { wch: 20 }, // 月个人部分社保公积金合计
    { wch: 18 }, // 公司已发产假工资
    { wch: 18 }, // 政府发放津贴金额
    { wch: 12 }, // 生产情况
    { wch: 14 }, // 流产类型
    { wch: 8 }   // 胎数
  ];

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, '批量导入模板');

  const instructionData = [
    { '字段名称': '员工姓名', '是否必填': '是', '数据类型': '文本', '说明': '员工姓名；用于匹配已有员工时建议与城市组合唯一' },
    { '字段名称': '员工编号', '是否必填': '是', '数据类型': '文本', '说明': '员工唯一编号；可与城市数据中员工信息匹配' },
    { '字段名称': '所在城市', '是否必填': '是', '数据类型': '文本', '说明': '需与系统内城市名称保持一致，用于加载城市津贴规则' },
    { '字段名称': '产假开始日期', '是否必填': '是', '数据类型': '日期', '说明': '格式：YYYY-MM-DD；如留空将导致计算失败' },
    { '字段名称': '员工产前12个月的月均工资', '是否必填': '是', '数据类型': '数字', '说明': '员工申报工资（元）；必须为正数' },
    { '字段名称': '员工基本工资', '是否必填': '否', '数据类型': '数字', '说明': '当前基本工资（元）；默认以员工平均工资参与计算' },
    { '字段名称': '月个人部分社保公积金合计', '是否必填': '否', '数据类型': '数字', '说明': '按整月计的个人社保与公积金缴费合计（元）' },
    { '字段名称': '公司已发产假工资', '是否必填': '否', '数据类型': '数字', '说明': '企业账户模式下已发放产假工资（元）' },
    { '字段名称': '政府发放津贴金额', '是否必填': '否', '数据类型': '数字', '说明': '若提供则覆盖系统计算出的政府津贴金额' },
    { '字段名称': '生产情况', '是否必填': '是', '数据类型': '枚举', '说明': '填写"顺产"或"难产"' },
    { '字段名称': '流产类型', '是否必填': '是', '数据类型': '枚举', '说明': '如：7个月以上、4-7个月、4个月以下；需与城市规则匹配' },
    { '字段名称': '胎数', '是否必填': '是', '数据类型': '数字', '说明': '单胎填1，多胎填具体数值' }
  ];

  const instructionSheet = XLSX.utils.json_to_sheet(instructionData);
  instructionSheet['!cols'] = [
    { wch: 18 },
    { wch: 10 },
    { wch: 10 },
    { wch: 60 }
  ];

  XLSX.utils.book_append_sheet(workbook, instructionSheet, '填写说明');

  const outputDescription = [
    { '输出字段': '政府发放金额', '说明': '按城市规则或覆盖值计算的社保津贴金额', '示例': '24567.89' },
    { '输出字段': '员工应领取金额', '说明': '员工应得工资基数按规则计算的总额', '示例': '26800.00' },
    { '输出字段': '公司补差金额', '说明': '员工应领取金额减去政府发放后的差额，若小于0则为0', '示例': '222.11' },
    { '输出字段': '实际补差金额', '说明': '公司补差金额 - 公司已发产假工资 - 减扣合计，最低为0', '示例': '0.00' },
    { '输出字段': '补差计算过程', '说明': '导出结果中展示的计算公式明细', '示例': '员工应领取 ¥26800.00 - 政府发放 ¥24567.89 - 公司已发产假工资 ¥0.00 - 减扣项合计 ¥0.00 = ¥2232.11' },
    { '输出字段': '应用政策摘要', '说明': '组合城市产假规则、奖励假顺延等信息的说明', '示例': '上海 - 法定产假98天 + 难产假15天，共113天' }
  ];

  const outputSheet = XLSX.utils.json_to_sheet(outputDescription);
  outputSheet['!cols'] = [
    { wch: 18 },
    { wch: 50 },
    { wch: 40 }
  ];

  XLSX.utils.book_append_sheet(workbook, outputSheet, '输出字段参考');

  const excelBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
  const data = new Blob([excelBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  saveAs(data, '产假津贴批量导入模板.xlsx');
};

// 通用导出：当前仅用于节假日导出
export const exportDataToExcel = (data, type, filename) => {
  let exportData = [];
  if (type === 'holiday') {
    const rows = [];
    const extractData = (item) => {
      if (typeof item === 'string') return { date: item, name: '', isLegalHoliday: false };
      return {
        date: item.date || '',
        name: item.name || '',
        isLegalHoliday: item.isLegalHoliday === true || item.isLegalHoliday === 'true'
      };
    };
    (data.holidays || []).forEach(d => {
      const { date, name, isLegalHoliday } = extractData(d);
      rows.push({ '日期': date, '类型': '节假日', '节日': name, '是否为法定假日': isLegalHoliday ? '是' : '否' });
    });
    (data.makeupWorkdays || []).forEach(d => {
      const { date, name, isLegalHoliday } = extractData(d);
      rows.push({ '日期': date, '类型': '工作日', '节日': name, '是否为法定假日': isLegalHoliday ? '是' : '否' });
    });
    exportData = rows.sort((a, b) => String(a['日期']).localeCompare(String(b['日期'])));
  } else {
    // 回退：直接序列化为表格
    exportData = Array.isArray(data) ? data : [data];
  }

  const ws = XLSX.utils.json_to_sheet(exportData);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Sheet1');

  const excelBuffer = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
  const fileData = new Blob([excelBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  saveAs(fileData, filename || '导出数据.xlsx');
};

// 生成节假日导入模板（按“日期/类型”行式）
export const generateHolidayTemplate = (year = new Date().getFullYear()) => {
  const templateData = [
    { '年份': year, '日期': `${year}-01-01`, '类型': '节假日', '节日': '元旦', '是否为法定假日': '是' },
    { '年份': year, '日期': `${year}-04-07`, '类型': '工作日', '节日': '', '是否为法定假日': '否' }
  ];

  const ws = XLSX.utils.json_to_sheet(templateData);
  ws['!cols'] = [
    { wch: 8 }, // 年份
    { wch: 12 }, // 日期
    { wch: 10 }, // 类型
    { wch: 12 }, // 节日
    { wch: 16 }  // 是否为法定假日
  ];
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, '节假日模板');

  const instructionData = [
    { '字段名称': '年份', '是否必填': '否', '数据类型': '数字', '说明': '若不填，默认按“日期”的年份归类' },
    { '字段名称': '日期', '是否必填': '是', '数据类型': '日期', '说明': '格式：YYYY-MM-DD' },
    { '字段名称': '类型', '是否必填': '是', '数据类型': '枚举', '说明': '填写“节假日”或“工作日”' },
    { '字段名称': '节日', '是否必填': '否', '数据类型': '文本', '说明': '节日名称，如：元旦、春节、清明节等' },
    { '字段名称': '是否为法定假日', '是否必填': '否', '数据类型': '布尔', '说明': '填写“是”或“否”；留空默认“否”' }
  ];
  const ws2 = XLSX.utils.json_to_sheet(instructionData);
  ws2['!cols'] = [ { wch: 12 }, { wch: 10 }, { wch: 10 }, { wch: 40 }, { wch: 26 } ];
  XLSX.utils.book_append_sheet(wb, ws2, '填写说明');

  const excelBuffer = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
  const data = new Blob([excelBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  saveAs(data, '节假日模板.xlsx');
};

// 生成节假日计划模板
export const generateHolidayPlanTemplate = () => {
  const templateData = [
    { '日期': '2024-01-01', '类型': '节假日', '节日': '元旦', '是否为法定假日': '是' },
    { '日期': '2024-04-07', '类型': '工作日', '节日': '', '是否为法定假日': '否' }
  ];

  const ws = XLSX.utils.json_to_sheet(templateData);
  ws['!cols'] = [
    { wch: 12 }, // 日期
    { wch: 10 }, // 类型
    { wch: 12 }, // 节日
    { wch: 16 }  // 是否为法定假日
  ];
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, '节假日计划模板');

  const instructionData = [
    { '字段名称': '日期', '是否必填': '是', '数据类型': '日期', '说明': '格式：YYYY-MM-DD' },
    { '字段名称': '类型', '是否必填': '是', '数据类型': '枚举', '说明': '填写“节假日”或“工作日”' },
    { '字段名称': '节日', '是否必填': '否', '数据类型': '文本', '说明': '节日名称，如：元旦、春节、清明节等' },
    { '字段名称': '是否为法定假日', '是否必填': '否', '数据类型': '布尔', '说明': '填写“是”或“否”；未填写时默认“否”' }
  ];
  const ws2 = XLSX.utils.json_to_sheet(instructionData);
  ws2['!cols'] = [ { wch: 12 }, { wch: 10 }, { wch: 10 }, { wch: 40 }, { wch: 26 } ];
  XLSX.utils.book_append_sheet(wb, ws2, '填写说明');

  const excelBuffer = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
  const data = new Blob([excelBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  saveAs(data, '节假日计划模板.xlsx');
};

// 读取Excel文件
export const readExcelFile = (file, type) => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target.result);
        const workbook = XLSX.read(data, { type: 'array' });
        
        // 读取第一个工作表
        const firstSheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[firstSheetName];
        
        // 转换为JSON
        const jsonData = XLSX.utils.sheet_to_json(worksheet);

        // 工具：规范化日期为 YYYY-MM-DD，兼容 2025/1/1、2025-1-1、2025.1.1、Excel 序列号和 Date 对象
        const pad2 = (n) => String(n).padStart(2, '0');
        const normalizeDateValue = (v) => {
          if (!v && v !== 0) return '';
          // Date 对象
          if (v instanceof Date && !isNaN(v)) {
            const y = v.getFullYear();
            const m = pad2(v.getMonth() + 1);
            const d = pad2(v.getDate());
            return `${y}-${m}-${d}`;
          }
          // Excel 序列号
          if (typeof v === 'number') {
            try {
              const dc = XLSX.SSF && XLSX.SSF.parse_date_code ? XLSX.SSF.parse_date_code(v) : null;
              if (dc && dc.y && dc.m && dc.d) {
                return `${dc.y}-${pad2(dc.m)}-${pad2(dc.d)}`;
              }
            } catch (_) {}
          }
          // 字符串
          if (typeof v === 'string') {
            const s = v.trim()
              .replace(/[./]/g, '-') // 统一分隔符
              .replace(/年|\//g, '-').replace(/月/g, '-').replace(/日/g, '');
            // 允许 YYYY-M-D
            const m1 = s.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
            if (m1) return `${m1[1]}-${pad2(m1[2])}-${pad2(m1[3])}`;
            // 允许 YYYYMMDD
            const m2 = s.match(/^(\d{4})(\d{2})(\d{2})$/);
            if (m2) return `${m2[1]}-${m2[2]}-${m2[3]}`;
          }
          return '';
        };

        const normalizeType = (t) => {
          const s = String(t || '').trim();
          if (!s) return '';
          // 统一到中文展示值，CityDataManager 中已同时兼容 'holiday'|'节假日' 与 'makeup'|'工作日'
          if (s === 'holiday' || s === '节假日') return '节假日';
          if (s === 'makeup' || s === '工作日' || s === '调休日') return '工作日';
          return s; // 其它值原样保留，后续校验可提示
        };
        
        // 转换字段名为英文（便于后续处理）
        const parseBoolean = (value) => {
          if (value === null || value === undefined) return false;
          const normalized = String(value).trim().toLowerCase();
          return ['是', 'true', '1', 'y', 'yes'].includes(normalized);
        };

        const parseNumber = (value) => {
          if (value === null || value === undefined || value === '') return null;
          const num = typeof value === 'number' ? value : parseFloat(String(value).replace(/[,\s]/g, ''));
          return Number.isFinite(num) ? num : null;
        };

        const convertedData = jsonData.map((row, index) => {
          console.log(`处理第${index + 1}行数据:`, row);
          if (type === 'holiday') {
            const rawDate = row['日期'] ?? row['date'] ?? '';
            const normDate = normalizeDateValue(rawDate);
            const rawYear = row['年份'] ?? row['year'];
            const year = rawYear != null && rawYear !== '' ? parseInt(rawYear, 10) : (normDate ? parseInt(normDate.slice(0, 4), 10) : undefined);
            const isLegalHoliday = parseBoolean(row['是否为法定假日'] ?? row['法定假日'] ?? row['isLegalHoliday']);
            const result = {
              year,
              date: normDate,
              type: normalizeType(row['类型'] ?? row['type']),
              name: String(row['节日'] ?? row['name'] ?? '').trim(),
              isLegalHoliday
            };
            console.log(`转换后的节假日数据:`, result);
            return result;
          }
          const name = row['员工姓名'] || row['name'] || '';
          const employeeId = row['员工编号'] || row['employeeId'] || '';
          const city = row['所在城市'] || row['city'] || '';
          const department = row['部门'] || row['department'] || '';
          const position = row['职位'] || row['position'] || '';

          const startDateRaw = row['产假开始日期'] || row['startDate'] || '';
          const endDateRaw = row['产假结束日期'] || row['endDate'] || '';
          const startDate = normalizeDateValue(startDateRaw);
          const endDateOverride = normalizeDateValue(endDateRaw);

          const paymentMethodRaw = row['津贴发放方式'] || row['paymentMethod'] || '';
          const paymentMethod = paymentMethodRaw ? String(paymentMethodRaw).trim() : '';

          const employeeBasicSalary = parseNumber(row['员工产前12个月的月均工资'] ?? row['employeeBasicSalary']);
          const employeeBaseSalary = parseNumber(row['员工基本工资'] ?? row['employeeBaseSalary']);
          const companyAvgSalaryOverride = parseNumber(row['单位上年度月平均工资'] ?? row['companyAverageSalary']);
          const socialInsuranceLimitOverride = parseNumber(row['社保3倍上限'] ?? row['socialInsuranceLimit']);

          const isDifficultBirth = parseBoolean(row['是否难产'] ?? row['isDifficultBirth']);
          const meetsSupplementalDifficultBirth = parseBoolean(row['是否符合补充难产条件'] ?? row['meetsSupplementalDifficultBirth']);
          const numberOfBabies = parseInt(row['胎数'] ?? row['numberOfBabies'] ?? 1, 10) || 1;
          const pregnancyPeriod = row['怀孕时间段'] || row['pregnancyPeriod'] || '7个月以上';
          const isMiscarriage = parseBoolean(row['是否流产'] ?? row['isMiscarriage']);
          const doctorAdviceDaysRaw = row['流产医嘱天数'] ?? row['doctorAdviceDays'];
          const doctorAdviceDays = doctorAdviceDaysRaw !== undefined && doctorAdviceDaysRaw !== ''
            ? parseInt(doctorAdviceDaysRaw, 10)
            : null;
          const isSecondThirdChild = parseBoolean(row['是否为二孩或三孩'] ?? row['isSecondThirdChild']);

          const companyPaidWage = parseNumber(row['公司已发产假工资'] ?? row['companyPaidWage']);
          const overrideGovernmentPaidAmount = parseNumber(row['政府发放津贴金额'] ?? row['overrideGovernmentPaidAmount']);
          const overridePersonalSSMonthly = parseNumber(row['月个人部分社保公积金合计'] ?? row['overridePersonalSSMonthly']);

          const salaryBefore = parseNumber(row['工资调整前'] ?? row['salaryBeforeAdjustment']);
          const salaryAfter = parseNumber(row['工资调整后'] ?? row['salaryAfterAdjustment']);
          const salaryMonth = row['工资调整年月'] || row['salaryAdjustmentMonth'] || '';
          const salaryAdjustment = salaryBefore != null && salaryAfter != null && salaryMonth
            ? { before: salaryBefore, after: salaryAfter, month: salaryMonth }
            : null;

          const socialBefore = parseNumber(row['社保调整前'] ?? row['socialSecurityBeforeAdjustment']);
          const socialAfter = parseNumber(row['社保调整后'] ?? row['socialSecurityAfterAdjustment']);
          const socialMonth = row['社保调整年月'] || row['socialSecurityAdjustmentMonth'] || '';
          const socialSecurityAdjustment = socialBefore != null && socialAfter != null && socialMonth
            ? { before: socialBefore, after: socialAfter, month: socialMonth }
            : null;

          const deductions = [];
          for (let i = 1; i <= 6; i += 1) {
            const amountKey = i <= 3 ? `减扣${i}金额` : null;
            const noteKey = i <= 3 ? `减扣${i}说明` : null;
            const amountValue = amountKey ? parseNumber(row[amountKey]) : null;
            const noteValue = noteKey ? row[noteKey] : null;
            // 允许负数（发放）和正数（扣减），只过滤null和0
            if (amountValue != null && amountValue !== 0) {
              deductions.push({ amount: amountValue, note: noteValue ? String(noteValue).trim() : '' });
            }
          }

          const remark = row['备注'] || row['remark'] || '';

          return {
            name,
            employeeId,
            city,
            department,
            position,
            startDate,
            endDateOverride,
            paymentMethod,
            employeeBasicSalary,
            employeeBaseSalary,
            companyAvgSalaryOverride,
            socialInsuranceLimitOverride,
            isDifficultBirth,
            meetsSupplementalDifficultBirth,
            numberOfBabies,
            pregnancyPeriod,
            isMiscarriage,
            doctorAdviceDays,
            isSecondThirdChild,
            companyPaidWage,
            overrideGovernmentPaidAmount,
            overridePersonalSSMonthly,
            salaryAdjustment,
            socialSecurityAdjustment,
            deductions,
            remark
          };
        });
        
        resolve(convertedData);
      } catch (error) {
        reject(new Error('Excel文件读取失败: ' + error.message));
      }
    };
    reader.onerror = () => reject(new Error('文件读取失败'));
    reader.readAsArrayBuffer(file);
  });
};

// 导出计算结果到Excel
export const exportResults = (results, errors = [], type) => {
  // 兼容：默认按产假批量结果导出
  if (!type) type = 'maternity';
  const workbook = XLSX.utils.book_new();
  
  // 创建结果工作表
  if (results.length > 0) {
    const resultData = results.map(result => {
      if (type === 'maternity') {
        return {
          '员工姓名': result.name,
          '员工编号': result.employeeId,
          '城市': result.city,
          '产假开始日期': result.startDate,
          '产假结束日期': result.endDate,
          '享受产假天数': result.totalMaternityDays || result.maternityDays,
          '享受产假津贴天数': Number.isFinite(result.totalAllowanceEligibleDays)
            ? result.totalAllowanceEligibleDays
            : (result.totalMaternityDays || result.maternityDays),
          '需补差金额': result.supplementAmount || result.companySupplement
        };
      } else if (type === 'holiday') {
        return {
          '日期': result.date,
          '类型': result.type,
          '节日': result.name || ''
        };
      }
    });
    
    const resultSheet = XLSX.utils.json_to_sheet(resultData);
    
    // 设置列宽
    const colWidths = Array(25).fill({ wch: 15 });
    resultSheet['!cols'] = colWidths;
    
    XLSX.utils.book_append_sheet(workbook, resultSheet, '计算结果');
  }
  
  // 创建错误工作表
  if (errors.length > 0) {
    const errorData = errors.map(error => ({
      '行号': error.row,
      '员工姓名': error.name,
      '员工编号': error.employeeId,
      '错误信息': error.errors.join('; ')
    }));
    
    const errorSheet = XLSX.utils.json_to_sheet(errorData);
    errorSheet['!cols'] = [
      { wch: 8 },  // 行号
      { wch: 12 }, // 员工姓名
      { wch: 12 }, // 员工编号
      { wch: 50 }  // 错误信息
    ];
    
    XLSX.utils.book_append_sheet(workbook, errorSheet, '错误信息');
  }
  
  // 添加汇总工作表
  if (results.length > 0) {
    const summary = {
      '处理总数': results.length + errors.length,
      '成功处理': results.length,
      '失败数量': errors.length,
      '成功率': `${((results.length / (results.length + errors.length)) * 100).toFixed(2)}%`,
      '津贴总额': results.reduce((sum, r) => sum + (r.governmentAllowance || r.maternityAllowance), 0).toFixed(2),
      '补差总额': results.reduce((sum, r) => sum + (r.supplementAmount || r.companySupplement), 0).toFixed(2),
      '扣除总额': results.reduce((sum, r) => sum + r.totalActualDeduction, 0).toFixed(2),
      '处理时间': new Date().toLocaleString('zh-CN')
    };
    
    const summaryData = Object.entries(summary).map(([key, value]) => ({
      '项目': key,
      '数值': value
    }));
    
    const summarySheet = XLSX.utils.json_to_sheet(summaryData);
    summarySheet['!cols'] = [
      { wch: 15 }, // 项目
      { wch: 20 }  // 数值
    ];
    
    XLSX.utils.book_append_sheet(workbook, summarySheet, '处理汇总');
  }
  
  const excelBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
  const data = new Blob([excelBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  const fileName = `产假计算结果_${new Date().toISOString().slice(0, 10)}.xlsx`;
  saveAs(data, fileName);
};

export const exportHistoryData = (historyData) => {
  if (!historyData || historyData.length === 0) {
    alert('没有历史数据可导出');
    return;
  }

  const workbook = XLSX.utils.book_new();

  // 创建历史数据工作表
  const historyExportData = historyData.map(result => {
    // 从breakdown中提取数据
    const breakdown = result.breakdown || {};
    const government = breakdown.government || {};
    const employee = breakdown.employee || {};
    const supplement = breakdown.supplement || {};

    return {
      '员工姓名': result.employeeDisplayName || '',
      '员工编号': result.selectedEmployee?.employeeId || '',
      '所在城市': result.city || '',
      '产假开始日期': result.calculatedPeriod?.startDate || '',
      '产假结束日期': result.calculatedPeriod?.endDate || '',
      '享受产假天数': result.totalMaternityDays || 0,
      '津贴发放方式': result.paymentMethod || '',
      '社保基数': result.socialInsuranceBase || 0,
      '津贴基数': result.maternityAllowanceBase || 0,
      '日津贴': result.dailyAllowance || 0,
      '政府发放金额': government.formatted ? government.formatted.replace('¥', '').replace(',', '') : '0',
      '员工应领取金额': employee.formatted ? employee.formatted.replace('¥', '').replace(',', '') : '0',
      '公司应发工资': result.companyShouldPay || 0,
      '需补差金额': supplement.adjustedAmount || 0,
      '个人社保缴费': result.personalSocialSecurity || 0,
      '实际补差金额': supplement.formattedAdjusted ? supplement.formattedAdjusted.replace('¥', '').replace(',', '') : '0',
      '员工实际可得': result.totalReceived || 0,
      '社保公积金扣除': result.totalActualDeduction || 0,
      '减扣项': supplement.details?.totalDeductions || 0,
      '计算时间': result.calculatedAt ? new Date(result.calculatedAt).toLocaleString('zh-CN') : ''
    };
  });

  const historySheet = XLSX.utils.json_to_sheet(historyExportData);

  // 设置列宽
  historySheet['!cols'] = [
    { wch: 12 }, // 员工姓名
    { wch: 12 }, // 员工编号
    { wch: 12 }, // 所在城市
    { wch: 14 }, // 产假开始日期
    { wch: 14 }, // 产假结束日期
    { wch: 12 }, // 享受产假天数
    { wch: 12 }, // 津贴发放方式
    { wch: 12 }, // 社保基数
    { wch: 12 }, // 津贴基数
    { wch: 12 }, // 日津贴
    { wch: 14 }, // 政府发放金额
    { wch: 14 }, // 员工应领取金额
    { wch: 14 }, // 公司应发工资
    { wch: 12 }, // 需补差金额
    { wch: 12 }, // 个人社保缴费
    { wch: 14 }, // 实际补差金额
    { wch: 14 }, // 员工实际可得
    { wch: 14 }, // 社保公积金扣除
    { wch: 12 }, // 减扣项
    { wch: 18 }  // 计算时间
  ];

  XLSX.utils.book_append_sheet(workbook, historySheet, '历史计算记录');

  // 添加汇总工作表
  const summary = {
    '总记录数': historyData.length,
    '导出时间': new Date().toLocaleString('zh-CN'),
    '数据来源': '产假津贴计算系统历史记录'
  };

  const summaryData = Object.entries(summary).map(([key, value]) => ({
    '项目': key,
    '数值': value
  }));

  const summarySheet = XLSX.utils.json_to_sheet(summaryData);
  summarySheet['!cols'] = [
    { wch: 15 }, // 项目
    { wch: 30 }  // 数值
  ];

  XLSX.utils.book_append_sheet(workbook, summarySheet, '数据汇总');

  const excelBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
  const data = new Blob([excelBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  const fileName = `产假计算历史记录_${new Date().toISOString().slice(0, 10)}.xlsx`;
  saveAs(data, fileName);
};
