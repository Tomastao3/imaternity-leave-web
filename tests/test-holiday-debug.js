// 节假日导入测试工具
// 运行方法：在浏览器控制台中执行此代码

// 创建测试数据
const createTestHolidayData = () => {
  return [
    { '年份': 2025, '日期': '2025-01-01', '类型': '节假日' },
    { '年份': 2025, '日期': '2025-05-01', '类型': '节假日' },
    { '年份': 2025, '日期': '2025-10-01', '类型': '节假日' },
    { '年份': 2025, '日期': '2025-02-08', '类型': '工作日' },
    { '年份': 2025, '日期': '2025-09-26', '类型': '工作日' }
  ];
};

// 导出测试数据到Excel文件
const exportTestHolidayData = () => {
  const testData = createTestHolidayData();

  // 使用现有的Excel导出功能
  const XLSX = window.XLSX;
  if (!XLSX) {
    console.error('XLSX库未找到，请确保xlsx库已加载');
    return;
  }

  const ws = XLSX.utils.json_to_sheet(testData);
  ws['!cols'] = [
    { wch: 8 },  // 年份
    { wch: 12 }, // 日期
    { wch: 10 }  // 类型
  ];

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, '节假日数据');

  const excelBuffer = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
  const data = new Blob([excelBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });

  // 创建下载链接
  const url = URL.createObjectURL(data);
  const link = document.createElement('a');
  link.href = url;
  link.download = '节假日测试数据.xlsx';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);

  console.log('测试文件已下载，请使用该文件进行导入测试');
};

// 验证导入功能
const testHolidayImport = () => {
  console.log('开始测试节假日导入功能...');

  // 检查必要的函数是否存在
  if (typeof window.getHolidayPlan !== 'function') {
    console.error('getHolidayPlan函数未找到，请确保holidayUtils已加载');
    return;
  }

  if (typeof window.getAllHolidayYears !== 'function') {
    console.error('getAllHolidayYears函数未找到，请确保indexedDb已加载');
    return;
  }

  // 检查当前年份数据
  const currentYear = new Date().getFullYear();
  console.log('检查当前年份数据:', currentYear);

  window.getHolidayPlan(currentYear).then(plan => {
    console.log('当前年份节假日数据:', plan);
  });

  // 检查所有年份
  window.getAllHolidayYears().then(years => {
    console.log('所有年份列表:', years);
  });

  console.log('测试完成，请查看控制台输出来验证功能是否正常');
};

// 将函数添加到全局对象
window.createTestHolidayData = createTestHolidayData;
window.exportTestHolidayData = exportTestHolidayData;
window.testHolidayImport = testHolidayImport;

console.log('节假日测试工具已加载');
console.log('使用方法:');
console.log('1. exportTestHolidayData() - 导出测试数据到Excel文件');
console.log('2. testHolidayImport() - 测试导入功能');
