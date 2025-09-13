import * as XLSX from 'xlsx';
import { saveAs } from 'file-saver';
import { setHolidayPlan, getHolidayPlan } from './holidayUtils';

// 生成员工数据导入模板
export const generateEmployeeTemplate = () => {
  const templateData = [
    {
      '员工姓名': '张三',
      '员工编号': 'EMP001',
      '部门': '人事部',
      '职位': '人事专员',
      '产假开始日期': '2024-01-15',
      '员工产前12个月的月均工资': 8000,
      '是否难产': '否',
      '胎数': 1,
      '妊娠时间段': '7个月以上',
      '备注': '示例数据'
    },
    {
      '员工姓名': '李四',
      '员工编号': 'EMP002',
      '部门': '财务部',
      '职位': '会计',
      '产假开始日期': '2024-02-01',
      '员工产前12个月的月均工资': 9500,
      '是否难产': '是',
      '胎数': 1,
      '妊娠时间段': '7个月以上',
      '备注': '难产情况'
    },
    {
      '员工姓名': '王五',
      '员工编号': 'EMP003',
      '部门': '技术部',
      '职位': '工程师',
      '产假开始日期': '2024-03-01',
      '员工产前12个月的月均工资': 12000,
      '是否难产': '否',
      '胎数': 2,
      '妊娠时间段': '7个月以上',
      '备注': '双胞胎'
    }
  ];

  const worksheet = XLSX.utils.json_to_sheet(templateData);
  
  // 设置列宽
  const colWidths = [
    { wch: 12 }, // 员工姓名
    { wch: 12 }, // 员工编号
    { wch: 12 }, // 部门
    { wch: 12 }, // 职位
    { wch: 15 }, // 产假开始日期
    { wch: 20 }, // 员工产前12个月的月均工资
    { wch: 10 }, // 是否难产
    { wch: 8 },  // 胎数
    { wch: 12 }, // 妊娠时间段
    { wch: 20 }  // 备注
  ];
  worksheet['!cols'] = colWidths;

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, '员工数据模板');
  
  // 添加说明sheet
  const instructionData = [
    { '字段名称': '员工姓名', '是否必填': '是', '数据类型': '文本', '说明': '员工的真实姓名' },
    { '字段名称': '员工编号', '是否必填': '是', '数据类型': '文本', '说明': '员工的唯一编号' },
    { '字段名称': '部门', '是否必填': '否', '数据类型': '文本', '说明': '员工所在部门' },
    { '字段名称': '职位', '是否必填': '否', '数据类型': '文本', '说明': '员工职位' },
    { '字段名称': '产假开始日期', '是否必填': '是', '数据类型': '日期', '说明': '格式：YYYY-MM-DD，如2024-01-15' },
    { '字段名称': '员工产前12个月的月均工资', '是否必填': '是', '数据类型': '数字', '说明': '员工产前12个月的月平均工资（元）' },
    { '字段名称': '是否难产', '是否必填': '是', '数据类型': '文本', '说明': '填写"是"或"否"' },
    { '字段名称': '胎数', '是否必填': '是', '数据类型': '数字', '说明': '胎儿数量，如1、2等' },
    { '字段名称': '妊娠时间段', '是否必填': '是', '数据类型': '文本', '说明': '填写"4个月以下"、"4-7个月"或"7个月以上"' },
    { '字段名称': '备注', '是否必填': '否', '数据类型': '文本', '说明': '其他说明信息' }
  ];
  
  const instructionSheet = XLSX.utils.json_to_sheet(instructionData);
  instructionSheet['!cols'] = [
    { wch: 15 }, // 字段名称
    { wch: 10 }, // 是否必填
    { wch: 10 }, // 数据类型
    { wch: 40 }  // 说明
  ];
  
  XLSX.utils.book_append_sheet(workbook, instructionSheet, '填写说明');
  
  const excelBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
  const data = new Blob([excelBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  saveAs(data, '员工产假数据导入模板.xlsx');
};

// 通用导出：当前仅用于节假日导出
export const exportDataToExcel = (data, type, filename) => {
  let exportData = [];
  if (type === 'holiday') {
    const rows = [];
    (data.holidays || []).forEach(d => rows.push({ '日期': d, '类型': '节假日' }));
    (data.makeupWorkdays || []).forEach(d => rows.push({ '日期': d, '类型': '调休日' }));
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
    { '年份': year, '日期': `${year}-01-01`, '类型': '节假日' },
    { '年份': year, '日期': `${year}-04-07`, '类型': '调休日' }
  ];

  const ws = XLSX.utils.json_to_sheet(templateData);
  ws['!cols'] = [
    { wch: 8 }, // 年份
    { wch: 12 }, // 日期
    { wch: 10 }  // 类型
  ];
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, '节假日模板');

  const instructionData = [
    { '字段名称': '年份', '是否必填': '否', '数据类型': '数字', '说明': '若不填，默认按“日期”的年份归类' },
    { '字段名称': '日期', '是否必填': '是', '数据类型': '日期', '说明': '格式：YYYY-MM-DD' },
    { '字段名称': '类型', '是否必填': '是', '数据类型': '枚举', '说明': '填写“节假日”或“调休日”' }
  ];
  const ws2 = XLSX.utils.json_to_sheet(instructionData);
  ws2['!cols'] = [ { wch: 12 }, { wch: 10 }, { wch: 10 }, { wch: 40 } ];
  XLSX.utils.book_append_sheet(wb, ws2, '填写说明');

  const excelBuffer = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
  const data = new Blob([excelBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  saveAs(data, '节假日模板.xlsx');
};

// 生成节假日计划模板
export const generateHolidayPlanTemplate = () => {
  const templateData = [
    { '日期': '2024-01-01', '类型': '节假日' },
    { '日期': '2024-04-07', '类型': '调休日' }
  ];

  const ws = XLSX.utils.json_to_sheet(templateData);
  ws['!cols'] = [
    { wch: 12 }, // 日期
    { wch: 10 }  // 类型
  ];
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, '节假日计划模板');

  const instructionData = [
    { '字段名称': '日期', '是否必填': '是', '数据类型': '日期', '说明': '格式：YYYY-MM-DD' },
    { '字段名称': '类型', '是否必填': '是', '数据类型': '枚举', '说明': '填写“节假日”或“调休日”' }
  ];
  const ws2 = XLSX.utils.json_to_sheet(instructionData);
  ws2['!cols'] = [ { wch: 12 }, { wch: 10 }, { wch: 10 }, { wch: 40 } ];
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
        
        // 转换字段名为英文（便于后续处理）
        const convertedData = jsonData.map(row => {
          if (type === 'holiday') {
            return {
              date: row['日期'] || row['date'] || '',
              type: row['类型'] || row['type'] || ''
            };
          }
          // 默认：批量员工模板格式（兼容旧逻辑，BatchProcessor 依赖）
          return {
            name: row['员工姓名'] || row['name'] || '',
            employeeId: row['员工编号'] || row['employeeId'] || '',
            department: row['部门'] || row['department'] || '',
            position: row['职位'] || row['position'] || '',
            startDate: row['产假开始日期'] || row['startDate'] || '',
            employeeBasicSalary: row['员工产前12个月的月均工资'] || row['employeeBasicSalary'] || '',
            isDifficultBirth: row['是否难产'] === '是' || row['isDifficultBirth'] === true,
            numberOfBabies: row['胎数'] || row['numberOfBabies'] || 1,
            pregnancyPeriod: row['妊娠时间段'] || row['pregnancyPeriod'] || '7个月以上',
            remark: row['备注'] || row['remark'] || ''
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
          '部门': result.department,
          '职位': result.position,
          '城市': result.city,
          '产假开始日期': result.startDate,
          '产假结束日期': result.endDate,
          '享受生育津贴天数': result.totalMaternityDays || result.maternityDays,
          '是否难产': result.isDifficultBirth ? '是' : '否',
          '胎数': result.numberOfBabies,
          '妊娠时间段': result.pregnancyPeriod,
          '社保缴费基数': result.socialInsuranceBase,
          '日津贴标准': result.dailyAllowance,
          '政府发放金额': result.governmentAllowance || result.maternityAllowance,
          '需补差金额': result.supplementAmount || result.companySupplement,
          '月度养老保险扣除': result.monthlyPensionDeduction,
          '月度医疗保险扣除': result.monthlyMedicalDeduction,
          '月度失业保险扣除': result.monthlyUnemploymentDeduction,
          '月度住房公积金扣除': result.monthlyHousingDeduction,
          '月度扣除合计': result.totalMonthlyDeduction,
          '实际养老保险扣除': result.actualPensionDeduction,
          '实际医疗保险扣除': result.actualMedicalDeduction,
          '实际失业保险扣除': result.actualUnemploymentDeduction,
          '实际住房公积金扣除': result.actualHousingDeduction,
          '实际扣除合计': result.totalActualDeduction
        };
      } else if (type === 'holiday') {
        return {
          '日期': result.date,
          '类型': result.type
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
