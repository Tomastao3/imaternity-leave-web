import { normalizeHolidayPlan } from './utils';
import { getApiBaseUrl } from '../../config/storageConfig';

const DEFAULT_BASE_URL = getApiBaseUrl();

function buildUrl(path) {
  if (!path.startsWith('/')) {
    return `${DEFAULT_BASE_URL}/${path}`;
  }
  return `${DEFAULT_BASE_URL}${path}`;
}

async function handleResponse(response) {
  if (!response.ok) {
    const message = await response.text();
    throw new Error(message || 'Holiday API request failed');
  }
  return response.json().catch(() => ({}));
}

export default class PostgresHolidayStorage {
  async getYears() {
    const response = await fetch(buildUrl('/holidays/years'), {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json'
      }
    });
    const payload = await handleResponse(response);
    const years = Array.isArray(payload?.data) ? payload.data : payload;
    return (years || []).map(Number).sort((a, b) => a - b);
  }

  async getPlan(year) {
    const response = await fetch(buildUrl(`/holidays?year=${encodeURIComponent(year)}`), {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json'
      }
    });
    const payload = await handleResponse(response);
    const data = payload?.data || payload;
    return normalizeHolidayPlan(data);
  }

  async upsertPlan(year, plan) {
    const body = JSON.stringify({ year, plan });
    const response = await fetch(buildUrl('/holidays/plan'), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body
    });
    await handleResponse(response);
  }

  async addDate({ year, date, type, name = '', isLegalHoliday = false, city }) {
    const body = JSON.stringify({ year, date, type, name, isLegalHoliday, city });
    const response = await fetch(buildUrl('/holidays/date'), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body
    });
    await handleResponse(response);
  }

  async removeDate(year, date) {
    const body = JSON.stringify({ year, date });
    const response = await fetch(buildUrl('/holidays/date'), {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json'
      },
      body
    });
    await handleResponse(response);
  }

  async updateDate({
    sourceYear,
    originalDate,
    targetYear,
    newDate,
    type,
    name = '',
    isLegalHoliday = false,
    city
  }) {
    const body = JSON.stringify({
      sourceYear,
      originalDate,
      targetYear,
      newDate,
      type,
      name,
      isLegalHoliday,
      city
    });
    const response = await fetch(buildUrl('/holidays/date'), {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json'
      },
      body
    });
    await handleResponse(response);
  }

  async importBulk(records) {
    const body = JSON.stringify({ holidays: records });
    const response = await fetch(buildUrl('/holidays/import'), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body
    });
    await handleResponse(response);
  }
}
