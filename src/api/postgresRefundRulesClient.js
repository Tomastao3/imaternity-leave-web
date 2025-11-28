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
    let message = 'Refund rule API request failed';
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

function normalizeRule(rule) {
  if (!rule || typeof rule !== 'object') {
    return rule;
  }
  const amountValue = rule.refundAmount ?? rule.amount ?? null;
  const parsedAmount = amountValue === '' || amountValue === null || amountValue === undefined
    ? null
    : Number(amountValue);

  const resolveBoolean = (value, fallback = false) => {
    if (typeof value === 'boolean') {
      return value;
    }
    if (typeof value === 'string') {
      const normalized = value.trim().toLowerCase();
      if (['true', '1', 'y', 'yes', '是'].includes(normalized)) {
        return true;
      }
      if (['false', '0', 'n', 'no', '否'].includes(normalized)) {
        return false;
      }
    }
    if (value === 1) return true;
    if (value === 0) return false;
    return fallback;
  };

  return {
    ...rule,
    city: typeof rule.city === 'string' ? rule.city.trim() : rule.city,
    startMonth: rule.startMonth || rule.start_month || '',
    endMonth: rule.endMonth || rule.end_month || '',
    refundDescription: rule.refundDescription || rule.refund_description || '',
    refundAmount: Number.isFinite(parsedAmount) ? parsedAmount : null,
    directDisplay: resolveBoolean(rule.directDisplay ?? rule.direct_display, false),
    singleMonthOnly: resolveBoolean(rule.singleMonthOnly ?? rule.single_month_only, false)
  };
}

function extractData(payload) {
  if (!payload) return [];
  if (Array.isArray(payload)) return payload.map(normalizeRule);
  if (Array.isArray(payload.data)) return payload.data.map(normalizeRule);
  return [];
}

export async function listRefundRules({ city } = {}) {
  const params = new URLSearchParams();
  if (city) {
    params.set('city', city);
  }
  const response = await fetch(buildUrl(`/refund-rules${params.size ? `?${params.toString()}` : ''}`), {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json'
    }
  });
  return extractData(await handleResponse(response));
}

export async function createRefundRule(rule) {
  const response = await fetch(buildUrl('/refund-rules'), {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(rule)
  });
  const payload = await handleResponse(response);
  const data = payload?.data ?? payload;
  return normalizeRule(data);
}

export async function updateRefundRule(id, rule) {
  const response = await fetch(buildUrl(`/refund-rules/${encodeURIComponent(id)}`), {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(rule)
  });
  const payload = await handleResponse(response);
  const data = payload?.data ?? payload;
  return normalizeRule(data);
}

export async function deleteRefundRule(id) {
  const response = await fetch(buildUrl(`/refund-rules/${encodeURIComponent(id)}`), {
    method: 'DELETE',
    headers: {
      'Content-Type': 'application/json'
    }
  });
  const payload = await handleResponse(response);
  return payload?.data ?? payload;
}

export async function importRefundRules(rules) {
  const response = await fetch(buildUrl('/refund-rules/import'), {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ rules })
  });
  const payload = await handleResponse(response);
  return payload?.data ?? payload;
}
