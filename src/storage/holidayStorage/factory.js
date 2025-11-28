import { getStorageMode } from '../../config/storageConfig';
import IndexedDbHolidayStorage from './indexedDbHolidayStorage';
import PostgresHolidayStorage from './postgresHolidayStorage';

let cachedInstance = null;

function createInstance() {
  const mode = getStorageMode();
  if (mode === 'postgres') {
    return new PostgresHolidayStorage();
  }
  return new IndexedDbHolidayStorage();
}

export function getHolidayStorage() {
  if (!cachedInstance) {
    cachedInstance = createInstance();
  }
  return cachedInstance;
}

export function resetHolidayStorageCache() {
  cachedInstance = null;
}
