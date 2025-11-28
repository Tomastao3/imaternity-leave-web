/**
 * 文件操作辅助工具
 * 提供文件上传、下载、创建等辅助函数
 */

const fs = require('fs');
const path = require('path');
const XLSX = require('xlsx');

/**
 * 上传文件
 * @param {import('@playwright/test').Page} page - Playwright页面对象
 * @param {string} selector - 文件输入框选择器
 * @param {string} filePath - 文件路径
 */
async function uploadFile(page, selector, filePath) {
  const fileInput = page.locator(selector);
  await fileInput.setInputFiles(filePath);
}

/**
 * 等待文件下载
 * @param {import('@playwright/test').Page} page - Playwright页面对象
 * @param {Function} action - 触发下载的操作
 * @returns {Promise<import('@playwright/test').Download>} 下载对象
 */
async function waitForDownload(page, action) {
  const downloadPromise = page.waitForEvent('download');
  await action();
  return await downloadPromise;
}

/**
 * 创建测试用Excel文件
 * @param {Array<Object>} data - 数据数组
 * @param {string} outputPath - 输出文件路径
 * @param {string} sheetName - 工作表名称（默认：'Sheet1'）
 */
function createTestExcel(data, outputPath, sheetName = 'Sheet1') {
  // 确保输出目录存在
  const dir = path.dirname(outputPath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  
  // 创建工作簿
  const workbook = XLSX.utils.book_new();
  
  // 创建工作表
  const worksheet = XLSX.utils.json_to_sheet(data);
  
  // 添加工作表到工作簿
  XLSX.utils.book_append_sheet(workbook, worksheet, sheetName);
  
  // 写入文件
  XLSX.writeFile(workbook, outputPath);
  
  return outputPath;
}

/**
 * 读取Excel文件
 * @param {string} filePath - 文件路径
 * @param {string} sheetName - 工作表名称（可选）
 * @returns {Array<Object>} 数据数组
 */
function readExcelFile(filePath, sheetName = null) {
  const workbook = XLSX.readFile(filePath);
  const sheet = sheetName 
    ? workbook.Sheets[sheetName] 
    : workbook.Sheets[workbook.SheetNames[0]];
  
  return XLSX.utils.sheet_to_json(sheet);
}

/**
 * 删除文件（如果存在）
 * @param {string} filePath - 文件路径
 */
function deleteFileIfExists(filePath) {
  if (fs.existsSync(filePath)) {
    fs.unlinkSync(filePath);
  }
}

/**
 * 确保目录存在
 * @param {string} dirPath - 目录路径
 */
function ensureDirectoryExists(dirPath) {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }
}

/**
 * 保存下载的文件
 * @param {import('@playwright/test').Download} download - 下载对象
 * @param {string} savePath - 保存路径
 */
async function saveDownload(download, savePath) {
  await download.saveAs(savePath);
}

module.exports = {
  uploadFile,
  waitForDownload,
  createTestExcel,
  readExcelFile,
  deleteFileIfExists,
  ensureDirectoryExists,
  saveDownload
};
