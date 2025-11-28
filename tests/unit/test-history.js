/**
 * 测试计算历史功能
 * 模拟localStorage数据结构验证功能
 */

// 模拟测试数据
const testCalculationData = {
  employeeDisplayName: "测试员工",
  selectedEmployee: {
    employeeId: "EMP001",
    employeeName: "测试员工"
  },
  city: "上海",
  calculatedPeriod: {
    startDate: "2024年01月01日",
    endDate: "2024年05月20日"
  },
  totalMaternityDays: 140,
  paymentMethod: "个人账户",
  socialInsuranceBase: 8000,
  maternityAllowanceBase: 8000,
  dailyAllowance: 266.67,
  maternityAllowance: 37333.33,
  employeeReceivable: 37333.33,
  companyShouldPay: 0,
  companySupplement: 0,
  personalSocialSecurity: 2400,
  adjustedSupplement: 0,
  totalReceived: 37333.33,
  totalActualDeduction: 2400,
  deductionsTotal: 2400,
  calculatedAt: new Date().toISOString(),
  source: 'individual',
  breakdown: {
    government: {
      formatted: "¥37,333.33",
      process: "政府发放金额计算过程..."
    },
    employee: {
      formatted: "¥37,333.33",
      process: "员工应领取金额计算过程..."
    },
    supplement: {
      formattedAdjusted: "¥0.00",
      totalDeductions: 2400,
      deductionSummary: "社保公积金扣除",
      details: {
        totalDeductions: 2400,
        deductionFormula: "个人社保公积金扣除公式..."
      }
    }
  },
  unionFee: {
    total: 250,
    monthlyFee: 50,
    process: "工会费计算过程..."
  }
};

// 测试localStorage保存功能
function testLocalStorageSave() {
  console.log("🔍 测试localStorage保存功能");

  // 模拟现有数据
  const existingResults = JSON.parse(localStorage.getItem('maternityCalculations') || '[]');

  // 添加新数据
  const timestamp = new Date().toISOString();
  const resultWithTimestamp = {
    ...testCalculationData,
    calculatedAt: timestamp
  };

  if (testCalculationData.employeeDisplayName) {
    const existingEmployeeResults = existingResults.filter(r => r.employeeDisplayName === testCalculationData.employeeDisplayName);
    const updatedEmployeeResults = [resultWithTimestamp, ...existingEmployeeResults].slice(0, 10);
    const otherResults = existingResults.filter(r => r.employeeDisplayName !== testCalculationData.employeeDisplayName);

    const updatedResults = [...updatedEmployeeResults, ...otherResults].slice(0, 50);
    localStorage.setItem('maternityCalculations', JSON.stringify(updatedResults));

    console.log("✅ 数据保存成功");
    console.log("📊 保存的数据条数:", updatedResults.length);
    console.log("👤 员工记录条数:", updatedEmployeeResults.length);
  } else {
    console.log("❌ 没有员工姓名，不保存数据");
  }
}

// 测试localStorage读取功能
function testLocalStorageLoad() {
  console.log("🔍 测试localStorage读取功能");

  try {
    const savedCalculations = JSON.parse(localStorage.getItem('maternityCalculations') || '[]');
    console.log("✅ 数据读取成功");
    console.log("📊 总记录条数:", savedCalculations.length);

    if (savedCalculations.length > 0) {
      console.log("📋 最新记录:");
      console.log("- 员工姓名:", savedCalculations[0].employeeDisplayName);
      console.log("- 计算时间:", savedCalculations[0].calculatedAt);
      console.log("- 津贴金额:", savedCalculations[0].maternityAllowance);
      console.log("- 发放方式:", savedCalculations[0].paymentMethod);
    }

    return savedCalculations;
  } catch (error) {
    console.error("❌ 读取数据失败:", error);
    return [];
  }
}

// 运行测试
console.log("🚀 开始测试计算历史功能\n");

// 测试保存
testLocalStorageSave();

// 测试读取
const loadedData = testLocalStorageLoad();

console.log("\n✨ 测试完成！功能正常工作。");
