import rawConfig from './storage.config.json';

const VALID_MODES = new Set(['indexeddb', 'postgres']);
let runtimeMode = null;

const STORAGE_CONFIG = rawConfig || {};

function resolveModeFromConfig() {
  const mode = String(STORAGE_CONFIG.storageMode || '').toLowerCase();
  if (VALID_MODES.has(mode)) {
    return mode;
  }
  if (mode === 'postgresql') {
    return 'postgres';
  }
  return null;
}

/**
 * Allows tests or runtime tooling to override the storage mode on the fly.
 * @param {('indexeddb'|'postgres')} mode
 */
export function setStorageMode(mode) {
  if (typeof mode !== 'string') {
    runtimeMode = null;
    return;
  }
  const normalized = mode.toLowerCase();
  runtimeMode = VALID_MODES.has(normalized) ? normalized : null;
}

/**
 * Resolve the current storage mode using (1) runtime override, (2) env vars, (3) config file, (4) default fallback.
 * Defaults to IndexedDB to preserve existing behaviour.
 * @returns {'indexeddb'|'postgres'}
 */
export function getStorageMode() {
  if (runtimeMode) {
    return runtimeMode;
  }

  const envValue = (process.env.REACT_APP_STORAGE_MODE || '').toLowerCase();
  if (VALID_MODES.has(envValue)) {
    return envValue;
  }
  if (envValue === 'postgresql') {
    return 'postgres';
  }

  const fromConfig = resolveModeFromConfig();
  if (fromConfig) {
    return fromConfig;
  }

  return 'indexeddb';
}

export function getPostgresConfig() {
  return STORAGE_CONFIG.postgres || {};
}

export function getStorageConfig() {
  return STORAGE_CONFIG;
}

export function getApiBaseUrl(mode = getStorageMode()) {
  const envValue = typeof process.env.REACT_APP_API_URL === 'string'
    ? process.env.REACT_APP_API_URL.trim()
    : '';
  if (envValue) {
    return envValue;
  }

  const apiConfig = STORAGE_CONFIG.apiBaseUrl;
  if (typeof apiConfig === 'string') {
    return apiConfig.trim() || '/api';
  }

  if (apiConfig && typeof apiConfig === 'object') {
    const mapped = apiConfig[mode];
    if (typeof mapped === 'string' && mapped.trim()) {
      return mapped.trim();
    }
  }

  return '/api';
}
