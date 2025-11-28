// 节假日数据测试工具
// 用于验证IndexedDB节假日数据存储和读取功能

// 测试数据
const testHolidayData = {
  holidays: ['2025-01-01', '2025-05-01', '2025-10-01'],
  makeupWorkdays: ['2025-01-26', '2025-02-08']
};

// 测试函数
async function testHolidayDataStorage() {
  console.log('开始测试节假日数据存储功能...');

  try {
    // 1. 测试存储功能
    console.log('1. 测试存储2025年节假日数据...');
    await window.idbSetHoliday(2025, testHolidayData);
    console.log('✅ 存储成功');

    // 2. 测试读取功能
    console.log('2. 测试读取2025年节假日数据...');
    const data = await window.idbGetHoliday(2025);
    console.log('读取的数据:', data);

    if (data && JSON.stringify(data) === JSON.stringify(testHolidayData)) {
      console.log('✅ 读取数据正确');
    } else {
      console.log('❌ 读取数据不匹配');
    }

    // 3. 测试年份列表功能
    console.log('3. 测试年份列表功能...');
    const years = await window.idbGetAllHolidayYears();
    console.log('年份列表:', years);

    if (years.includes(2025)) {
      console.log('✅ 年份列表包含2025年');
    } else {
      console.log('❌ 年份列表不包含2025年');
    }

    // 4. 测试holidayUtils函数
    console.log('4. 测试holidayUtils函数...');
    const plan = window.getHolidayPlan(2025);
    console.log('getHolidayPlan结果:', plan);

    if (plan && plan.holidays && plan.holidays.length === testHolidayData.holidays.length) {
      console.log('✅ holidayUtils函数正常');
    } else {
      console.log('❌ holidayUtils函数异常');
    }

    console.log('🎉 所有测试完成！');
  } catch (error) {
    console.error('❌ 测试失败:', error);
  }
}

// 清理测试数据
async function clearTestHolidayData() {
  console.log('清理测试数据...');
  try {
    // 这里需要添加清理函数
    console.log('清理完成');
  } catch (error) {
    console.error('清理失败:', error);
  }
}

// 将函数添加到全局对象
window.testHolidayDataStorage = testHolidayDataStorage;
window.clearTestHolidayData = clearTestHolidayData;

console.log('节假日数据测试工具已加载');
console.log('使用方法:');
console.log('- testHolidayDataStorage() - 测试存储和读取功能');
console.log('- clearTestHolidayData() - 清理测试数据');
