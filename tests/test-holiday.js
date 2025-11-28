import { idbSetHoliday, idbGetHoliday, idbGetAllHolidayYears } from './src/utils/indexedDb.js';
import { setHolidayPlan, getHolidayPlan } from './src/utils/holidayUtils.js';

// 测试节假日数据存储和读取功能
async function testHolidayData() {
  console.log('开始测试节假日数据功能...');

  try {
    // 测试1: 获取所有年份
    console.log('测试1: 获取所有年份');
    const years = await idbGetAllHolidayYears();
    console.log('当前存储的年份:', years);

    // 测试2: 存储测试数据
    console.log('测试2: 存储2025年节假日数据');
    const testData = {
      holidays: ['2025-01-01', '2025-05-01', '2025-10-01'],
      makeupWorkdays: ['2025-01-26', '2025-02-08']
    };

    await idbSetHoliday(2025, testData);
    console.log('已存储2025年数据');

    // 测试3: 再次获取所有年份
    console.log('测试3: 再次获取所有年份');
    const yearsAfter = await idbGetAllHolidayYears();
    console.log('存储后的年份:', yearsAfter);

    // 测试4: 读取2025年数据
    console.log('测试4: 读取2025年数据');
    const data2025 = await idbGetHoliday(2025);
    console.log('2025年数据:', data2025);

    // 测试5: 通过holidayUtils读取数据
    console.log('测试5: 通过holidayUtils读取数据');
    const plan2025 = getHolidayPlan(2025);
    console.log('通过holidayUtils获取的2025年数据:', plan2025);

    console.log('测试完成！');
  } catch (error) {
    console.error('测试失败:', error);
  }
}

// 导出测试函数供浏览器控制台使用
window.testHolidayData = testHolidayData;
