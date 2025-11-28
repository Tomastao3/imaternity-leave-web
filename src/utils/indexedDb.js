// Lightweight IndexedDB helper without external deps
// DB: mlc-db
// Stores:
// - kv (key: string, value: any) for maternityRules/allowanceRules/employeeData
// - holidays (key: year number, value: { year, plan })

const DB_NAME = 'mlc-db';
const DB_VERSION = 1;
const KV_STORE = 'kv';
const HOLIDAYS_STORE = 'holidays';

function openDB() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = (e) => {
      const db = req.result;
      if (!db.objectStoreNames.contains(KV_STORE)) {
        db.createObjectStore(KV_STORE, { keyPath: 'key' });
      }
      if (!db.objectStoreNames.contains(HOLIDAYS_STORE)) {
        db.createObjectStore(HOLIDAYS_STORE, { keyPath: 'year' });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

function withStore(storeName, mode, fn) {
  return openDB().then(db => new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, mode);
    const store = tx.objectStore(storeName);
    const result = fn(store);
    tx.oncomplete = () => resolve(result);
    tx.onerror = () => reject(tx.error);
  }));
}

export function idbSet(key, value) {
  return withStore(KV_STORE, 'readwrite', store => store.put({ key, value }));
}

export function idbGet(key) {
  // Use explicit request handlers to return the record's value, not the IDBRequest
  return openDB().then(db => new Promise((resolve, reject) => {
    const tx = db.transaction(KV_STORE, 'readonly');
    const store = tx.objectStore(KV_STORE);
    const req = store.get(key);
    req.onsuccess = () => {
      const rec = req.result;
      resolve(rec ? rec.value : undefined);
    };
    req.onerror = () => reject(req.error);
  }));
}

export function idbDelete(key) {
  return withStore(KV_STORE, 'readwrite', store => store.delete(key));
}

export function idbSetHoliday(year, plan) {
  return withStore(HOLIDAYS_STORE, 'readwrite', store => store.put({ year: Number(year), plan }));
}

export function idbGetHoliday(year) {
  console.log('正在从IndexedDB获取年份', year, '的节假日数据...');
  return openDB().then(db => new Promise((resolve, reject) => {
    const tx = db.transaction(HOLIDAYS_STORE, 'readonly');
    const store = tx.objectStore(HOLIDAYS_STORE);
    const req = store.get(Number(year));
    req.onsuccess = () => {
      const rec = req.result;
      const plan = rec ? rec.plan : undefined;
      console.log('从IndexedDB获取的年份', year, '数据:', plan);
      resolve(plan);
    };
    req.onerror = () => {
      console.error('获取年份', year, '数据失败:', req.error);
      reject(req.error);
    };
  }));
}

export function idbGetAllHolidayYears() {
  console.log('正在获取所有节假日年份...');
  return openDB().then(db => new Promise((resolve, reject) => {
    const tx = db.transaction(HOLIDAYS_STORE, 'readonly');
    const store = tx.objectStore(HOLIDAYS_STORE);
    const req = store.getAllKeys();
    req.onsuccess = () => {
      console.log('从IndexedDB获取的年份列表:', req.result);
      resolve(req.result || []);
    };
    req.onerror = () => {
      console.error('获取年份列表失败:', req.error);
      reject(req.error);
    };
  }));
}
