import { getApiBaseUrl } from '../config/storageConfig';

const BASE_URL = getApiBaseUrl('postgres');

function buildUrl(path) {
  if (!path.startsWith('/')) {
    return `${BASE_URL}/${path}`;
  }
  return `${BASE_URL}${path}`;
}

async function handleResponse(response) {
  if (!response.ok) {
    let message = 'Employee API request failed';
    try {
      const payload = await response.json();
      message = payload?.error?.message || message;
    } catch (_) {
      const text = await response.text();
      if (text) {
        message = text;
      }
    }
    const error = new Error(message);
    error.status = response.status;
    error.code = response.statusText;
    throw error;
  }

  const contentType = response.headers.get('content-type') || '';
  if (contentType.includes('application/json')) {
    return response.json();
  }
  return response.text();
}

function normalizeEmployee(employee) {
  if (!employee || typeof employee !== 'object') {
    return employee;
  }
  return {
    ...employee,
    employeeId: employee.employeeId || employee.employeeNo,
    personalSSMonthly: Number(employee.personalSSMonthly ?? 0) || 0,
    basicSalary: Number(employee.basicSalary ?? employee.employeeBasicSalary ?? 0) || 0,
    socialSecurityBase: employee.socialSecurityBase != null
      ? Number(employee.socialSecurityBase)
      : Number(employee.employeeBaseSalaryCurrent ?? employee.employeeBasicSalary ?? 0) || 0,
    isDifficultBirth: employee.isDifficultBirth === true || employee.isDifficultBirth === 'true',
    numberOfBabies: Number(employee.numberOfBabies ?? 1) || 1
  };
}

function extractData(payload) {
  if (!payload) return [];
  if (Array.isArray(payload)) return payload.map(normalizeEmployee);
  if (Array.isArray(payload.data)) return payload.data.map(normalizeEmployee);
  return [];
}

export async function listEmployees({ city } = {}) {
  const params = new URLSearchParams();
  if (city) {
    params.set('city', city);
  }
  const response = await fetch(buildUrl(`/employees${params.size ? `?${params.toString()}` : ''}`), {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json'
    }
  });
  return extractData(await handleResponse(response));
}

export async function createEmployee(employee) {
  const response = await fetch(buildUrl('/employees'), {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(employee)
  });
  const payload = await handleResponse(response);
  const data = payload?.data ?? payload;
  return normalizeEmployee(data);
}

export async function updateEmployee(id, employee) {
  const response = await fetch(buildUrl(`/employees/${encodeURIComponent(id)}`), {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(employee)
  });
  const payload = await handleResponse(response);
  const data = payload?.data ?? payload;
  return normalizeEmployee(data);
}

export async function deleteEmployee(id) {
  const response = await fetch(buildUrl(`/employees/${encodeURIComponent(id)}`), {
    method: 'DELETE',
    headers: {
      'Content-Type': 'application/json'
    }
  });
  const payload = await handleResponse(response);
  return payload?.data ?? payload;
}

export async function importEmployees(employees) {
  const response = await fetch(buildUrl('/employees/import'), {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ employees })
  });
  const payload = await handleResponse(response);
  return payload?.data ?? payload;
}
