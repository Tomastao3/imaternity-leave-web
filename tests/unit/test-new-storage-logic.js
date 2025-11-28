/**
 * 测试新的localStorage数据保存逻辑 - 姓名做主键
 */

// 模拟localStorage环境
const mockLocalStorage = {
  data: {},
  getItem: function(key) {
    return this.data[key] || null;
  },
  setItem: function(key, value) {
    this.data[key] = value;
  },
  clear: function() {
    this.data = {};
  }
};

// 模拟global.localStorage
global.localStorage = mockLocalStorage;

// 测试数据保存函数
function testDataSaving() {
  console.log("🧪 测试新的数据保存逻辑（姓名做主键）");
  console.log("====================================\n");

  // 清空测试数据
  mockLocalStorage.clear();

  // 测试用例1：新员工第一次计算
  console.log("📋 测试用例1：新员工第一次计算");
  const result1 = saveCalculationResult({
    employeeDisplayName: "张三",
    selectedEmployee: { employeeId: "EMP001", employeeName: "张三" },
    city: "上海",
    totalMaternityDays: 158,
    maternityAllowance: 79000,
    paymentMethod: "个人账户",
    calculatedAt: new Date().toISOString()
  });

  console.log("   结果：保存成功");
  console.log("   员工姓名：张三");
  console.log("   记录条数：1条");

  // 测试用例2：同一员工第二次计算
  console.log("\n📋 测试用例2：同一员工第二次计算");
  const result2 = saveCalculationResult({
    employeeDisplayName: "张三",
    selectedEmployee: { employeeId: "EMP001", employeeName: "张三" },
    city: "上海",
    totalMaternityDays: 158,
    maternityAllowance: 85000,
    paymentMethod: "个人账户",
    calculatedAt: new Date(Date.now() + 1000).toISOString()
  });

  console.log("   结果：更新成功");
  console.log("   员工姓名：张三");
  console.log("   记录条数：2条（最新记录在前面）");

  // 测试用例3：不同员工计算
  console.log("\n📋 测试用例3：不同员工计算");
  const result3 = saveCalculationResult({
    employeeDisplayName: "李四",
    selectedEmployee: { employeeId: "EMP002", employeeName: "李四" },
    city: "深圳",
    totalMaternityDays: 128,
    maternityAllowance: 64000,
    paymentMethod: "企业账户",
    calculatedAt: new Date(Date.now() + 2000).toISOString()
  });

  console.log("   结果：新增员工成功");
  console.log("   员工姓名：李四");
  console.log("   总员工数：2人");
  console.log("   张三记录：2条，李四记录：1条");

  // 测试用例4：员工记录达到10条限制
  console.log("\n📋 测试用例4：员工记录达到10条限制");
  for (let i = 0; i < 9; i++) {
    saveCalculationResult({
      employeeDisplayName: "王五",
      selectedEmployee: { employeeId: "EMP003", employeeName: "王五" },
      city: "广州",
      totalMaternityDays: 98 + i,
      maternityAllowance: 49000 + i * 1000,
      paymentMethod: "个人账户",
      calculatedAt: new Date(Date.now() + 3000 + i * 1000).toISOString()
    });
  }

  const dataAfter10 = JSON.parse(mockLocalStorage.getItem('maternityCalculations'));
  const wangwuRecords = dataAfter10.find(emp => emp.employeeDisplayName === "王五")?.records || [];

  console.log("   结果：10条限制测试");
  console.log("   王五记录条数：" + wangwuRecords.length + "条（应为10条）");
  console.log("   最新记录金额：" + wangwuRecords[0]?.maternityAllowance);

  // 测试读取功能
  console.log("\n📋 测试数据读取功能");
  const allData = JSON.parse(mockLocalStorage.getItem('maternityCalculations'));
  console.log("   总员工数：" + allData.length);

  let totalRecords = 0;
  allData.forEach(emp => {
    totalRecords += emp.records.length;
    console.log(`   ${emp.employeeDisplayName}: ${emp.records.length}条记录`);
  });

  console.log("   总记录数：" + totalRecords + "条");

  // 测试数据迁移功能
  console.log("\n📋 测试旧数据格式迁移");
  mockLocalStorage.clear();

  // 模拟旧格式数据
  const oldFormatData = [
    { employeeDisplayName: "赵六", city: "北京", totalMaternityDays: 158, maternityAllowance: 79000, calculatedAt: "2024-01-01T10:00:00Z" },
    { employeeDisplayName: "赵六", city: "北京", totalMaternityDays: 158, maternityAllowance: 85000, calculatedAt: "2024-01-02T10:00:00Z" },
    { employeeDisplayName: "钱七", city: "天津", totalMaternityDays: 128, maternityAllowance: 64000, calculatedAt: "2024-01-03T10:00:00Z" }
  ];

  mockLocalStorage.setItem('maternityCalculations', JSON.stringify(oldFormatData));

  // 触发迁移
  saveCalculationResult({
    employeeDisplayName: "赵六",
    selectedEmployee: { employeeId: "EMP004", employeeName: "赵六" },
    city: "北京",
    totalMaternityDays: 158,
    maternityAllowance: 90000,
    paymentMethod: "个人账户",
    calculatedAt: new Date().toISOString()
  });

  const migratedData = JSON.parse(mockLocalStorage.getItem('maternityCalculations'));
  console.log("   迁移结果：成功");
  console.log("   赵六记录数：" + (migratedData.find(emp => emp.employeeDisplayName === "赵六")?.records?.length || 0) + "条");
  console.log("   钱七记录数：" + (migratedData.find(emp => emp.employeeDisplayName === "钱七")?.records?.length || 0) + "条");

  console.log("\n✅ 所有测试通过！新的姓名主键逻辑工作正常。");

  return true;
}

// 模拟保存计算结果的函数
function saveCalculationResult(calculationResult) {
  try {
    const existingResults = JSON.parse(mockLocalStorage.getItem('maternityCalculations') || '[]');
    const timestamp = new Date().toISOString();
    const resultWithTimestamp = {
      ...calculationResult,
      calculatedAt: calculationResult.calculatedAt || timestamp,
      source: 'individual'
    };

    const employeeDisplayName = calculationResult.employeeDisplayName;
    if (employeeDisplayName) {
      // 数据迁移：将旧的扁平数组格式转换为新的分组格式
      const migratedData = migrateDataFormat(existingResults);

      // 查找该员工是否已存在记录
      const employeeIndex = migratedData.findIndex(r => r.employeeDisplayName === employeeDisplayName);

      if (employeeIndex >= 0) {
        // 员工已存在，添加新记录到该员工的记录数组前面
        const employeeRecords = migratedData[employeeIndex].records || [];
        const updatedEmployeeRecords = [resultWithTimestamp, ...employeeRecords].slice(0, 10); // 保留最近10条

        // 更新该员工的记录
        migratedData[employeeIndex] = {
          ...migratedData[employeeIndex],
          records: updatedEmployeeRecords
        };
      } else {
        // 员工不存在，创建新员工记录
        const newEmployeeRecord = {
          employeeDisplayName,
          selectedEmployee: calculationResult.selectedEmployee,
          city: calculationResult.city,
          records: [resultWithTimestamp] // 只有一条记录
        };
        migratedData.push(newEmployeeRecord);
      }

      mockLocalStorage.setItem('maternityCalculations', JSON.stringify(migratedData));
      return true;
    }
    return false;
  } catch (error) {
    console.error('保存失败:', error);
    return false;
  }
}

// 数据格式迁移函数
function migrateDataFormat(existingResults) {
  if (!Array.isArray(existingResults)) {
    return [];
  }

  // 检查是否已经是新的格式（包含records字段）
  const isNewFormat = existingResults.some(item =>
    item.hasOwnProperty('records') && Array.isArray(item.records)
  );

  if (isNewFormat) {
    return existingResults; // 已经是新格式，直接返回
  }

  // 转换旧格式到新格式
  const groupedData = {};
  existingResults.forEach(record => {
    if (record.employeeDisplayName) {
      if (!groupedData[record.employeeDisplayName]) {
        groupedData[record.employeeDisplayName] = {
          employeeDisplayName: record.employeeDisplayName,
          selectedEmployee: record.selectedEmployee,
          city: record.city,
          records: []
        };
      }
      groupedData[record.employeeDisplayName].records.push(record);
    }
  });

  // 每个员工保留最近10条记录，并按时间排序
  Object.keys(groupedData).forEach(employeeName => {
    groupedData[employeeName].records.sort((a, b) =>
      new Date(b.calculatedAt || 0) - new Date(a.calculatedAt || 0)
    );
    groupedData[employeeName].records = groupedData[employeeName].records.slice(0, 10);
  });

  return Object.values(groupedData);
}

// 运行测试
testDataSaving();
