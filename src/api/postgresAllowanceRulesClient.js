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
    let message = 'Allowance rule API request failed';
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
  return {
    ...rule,
    socialAverageWage: Number(rule.socialAverageWage ?? rule.social_average_wage ?? 0),
    companyAverageWage: Number(rule.companyAverageWage ?? rule.company_average_wage ?? 0),
    companyContributionWage: Number(rule.companyContributionWage ?? rule.company_contribution_wage ?? 0),
    calculationBase: rule.calculationBase || rule.calculation_base || '平均工资',
    accountType: rule.accountType || rule.payoutMethod || rule.payout_method || '企业账户',
    payoutMethod: rule.payoutMethod || rule.payout_method || rule.accountType || '企业账户',
    maternityPolicy: rule.maternityPolicy ?? rule.maternity_policy ?? '',
    allowancePolicy: rule.allowancePolicy ?? rule.allowance_policy ?? ''
  };
}

function extractData(payload) {
  if (!payload) return [];
  if (Array.isArray(payload)) return payload.map(normalizeRule);
  if (Array.isArray(payload.data)) return payload.data.map(normalizeRule);
  return [];
}

export async function listAllowanceRules({ city } = {}) {
  const params = new URLSearchParams();
  if (city) {
    params.set('city', city);
  }
  const response = await fetch(buildUrl(`/allowance-rules${params.size ? `?${params.toString()}` : ''}`), {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json'
    }
  });
  return extractData(await handleResponse(response));
}

export async function createAllowanceRule(rule) {
  const response = await fetch(buildUrl('/allowance-rules'), {
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

export async function updateAllowanceRule(id, rule) {
  const response = await fetch(buildUrl(`/allowance-rules/${encodeURIComponent(id)}`), {
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

export async function deleteAllowanceRule(id) {
  const response = await fetch(buildUrl(`/allowance-rules/${encodeURIComponent(id)}`), {
    method: 'DELETE',
    headers: {
      'Content-Type': 'application/json'
    }
  });
  const payload = await handleResponse(response);
  return payload?.data ?? payload;
}

export async function importAllowanceRules(rules) {
  const response = await fetch(buildUrl('/allowance-rules/import'), {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ rules })
  });
  const payload = await handleResponse(response);
  return payload?.data ?? payload;
}
