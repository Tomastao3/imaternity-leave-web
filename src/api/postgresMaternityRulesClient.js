import { getApiBaseUrl } from '../config/storageConfig';

const BASE_URL = getApiBaseUrl('postgres');

function buildUrl(path) {
  if (!path.startsWith('/')) {
    return `${BASE_URL}/${path}`;
  }
  return `${BASE_URL}${path}`;
}

async function handleResponse(response) {
  if (response.ok) {
    const contentType = response.headers.get('content-type') || '';
    if (contentType.includes('application/json')) {
      return response.json();
    }
    return response.text();
  }
  let message = 'Maternity rule API request failed';
  try {
    const errorPayload = await response.json();
    message = errorPayload?.error?.message || message;
  } catch (_) {
    const text = await response.text();
    if (text) message = text;
  }
  const error = new Error(message);
  error.status = response.status;
  error.code = response.statusText;
  throw error;
}

function normalizePayload(payload) {
  if (!payload) return { data: [] };
  if (Array.isArray(payload.data)) return payload;
  if (Array.isArray(payload)) return { data: payload };
  return { data: payload.data ? payload.data : [] };
}

export async function listMaternityRules({ city } = {}) {
  const params = new URLSearchParams();
  if (city) {
    params.append('city', city);
  }
  const query = params.toString();
  const response = await fetch(buildUrl(`/maternity-rules${query ? `?${query}` : ''}`), {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json'
    }
  });
  return normalizePayload(await handleResponse(response)).data;
}

export async function createMaternityRule(rule) {
  const response = await fetch(buildUrl('/maternity-rules'), {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(rule)
  });
  const payload = await handleResponse(response);
  return payload?.data ?? payload;
}

export async function updateMaternityRule(id, rule) {
  const response = await fetch(buildUrl(`/maternity-rules/${encodeURIComponent(id)}`), {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(rule)
  });
  const payload = await handleResponse(response);
  return payload?.data ?? payload;
}

export async function deleteMaternityRule(id) {
  const response = await fetch(buildUrl(`/maternity-rules/${encodeURIComponent(id)}`), {
    method: 'DELETE',
    headers: {
      'Content-Type': 'application/json'
    }
  });
  const payload = await handleResponse(response);
  return payload?.data ?? payload;
}

export async function importMaternityRules(records) {
  const response = await fetch(buildUrl('/maternity-rules/import'), {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ rules: records })
  });
  const payload = await handleResponse(response);
  return payload?.data ?? payload;
}
