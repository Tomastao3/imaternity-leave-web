/*
 * Reset/prepare config data for integration tests.
 *
 * This script reads Excel workbooks under `configData/` and converts them into
 * JSON fixtures stored in `tests/fixtures/generated/configData.json`. Integration
 * tests can then load the JSON to seed in-memory stores (e.g. mock the
 * cityDataManager) without depending on IndexedDB.
 */

const fs = require('fs');
const path = require('path');
const XLSX = require('xlsx');

const ROOT_DIR = path.resolve(__dirname, '..', '..');
const CONFIG_DIR = path.join(ROOT_DIR, 'configData');
const OUTPUT_DIR = path.join(ROOT_DIR, 'tests', 'fixtures', 'generated');
const OUTPUT_FILE = path.join(OUTPUT_DIR, 'configData.json');

const CONFIG_FILES = [
  { file: '产假规则.xlsx', key: 'maternityRules' },
  { file: '津贴规则.xlsx', key: 'allowanceRules' },
  { file: '节假日_all.xlsx', key: 'holidayCalendars' }
];

const readWorkbook = (filePath) => {
  const workbook = XLSX.readFile(filePath, { cellDates: true });
  const result = {};

  workbook.SheetNames.forEach((sheetName) => {
    const worksheet = workbook.Sheets[sheetName];
    const rows = XLSX.utils.sheet_to_json(worksheet, {
      defval: null,
      raw: false,
      dateNF: 'yyyy-MM-dd'
    });
    result[sheetName] = rows;
  });

  return result;
};

const ensureDir = (dirPath) => {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }
};

try {
  ensureDir(OUTPUT_DIR);

  const payload = {};

  CONFIG_FILES.forEach(({ file, key }) => {
    const fullPath = path.join(CONFIG_DIR, file);
    if (!fs.existsSync(fullPath)) {
      console.warn(`[reset-config] Skipped missing file: ${fullPath}`);
      payload[key] = {};
      return;
    }
    payload[key] = readWorkbook(fullPath);
  });

  fs.writeFileSync(OUTPUT_FILE, JSON.stringify(payload, null, 2), 'utf8');
  console.log(`[reset-config] Generated ${OUTPUT_FILE}`);
} catch (error) {
  console.error('[reset-config] Failed to prepare config data:', error);
  process.exitCode = 1;
}
