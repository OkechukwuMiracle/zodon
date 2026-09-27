/**
 * API client. Only talks to the Zodon backend — no API keys live in the browser.
 */
const BASE = (import.meta.env?.VITE_API_BASE_URL || '/api').replace(/\/+$/, '');
const TIMEOUT_MS = 120000;

export class ApiError extends Error {
  constructor(code, message, status, details) {
    super(message);
    this.name = 'ApiError';
    this.code = code;
    this.status = status;
    this.details = details;
  }
}

async function request(path, { method = 'GET', body, signal } = {}) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort('timeout'), TIMEOUT_MS);
  const onAbort = () => controller.abort('cancelled');
  signal?.addEventListener('abort', onAbort);
  const isForm = typeof FormData !== 'undefined' && body instanceof FormData;
  let res;
  try {
    res = await fetch(`${BASE}${path}`, {
      method,
      headers: body && !isForm ? { 'content-type': 'application/json' } : undefined,
      body: body ? (isForm ? body : JSON.stringify(body)) : undefined,
      signal: controller.signal,
    });
  } catch {
    if (controller.signal.reason === 'cancelled') throw new ApiError('CANCELLED', 'The analysis was cancelled.', 0);
    if (controller.signal.reason === 'timeout') throw new ApiError('NETWORK_TIMEOUT', 'The request timed out. Please try again.', 0);
    throw new ApiError('NETWORK_ERROR', 'Could not reach the Zodon server. Check that the backend is running and reachable.', 0);
  } finally {
    clearTimeout(timer);
    signal?.removeEventListener('abort', onAbort);
  }

  let data = null;
  try {
    data = await res.json();
  } catch {
    // non-JSON response
  }
  if (!res.ok) {
    const err = data?.error;
    throw new ApiError(err?.code || 'HTTP_ERROR', err?.message || `The server responded with HTTP ${res.status}.`, res.status, err?.details);
  }
  if (data === null) throw new ApiError('BAD_RESPONSE', 'The server returned an unreadable response.', res.status);
  return data;
}

export const api = {
  health: (opts) => request('/health', opts),
  samples: (opts) => request('/samples', opts),
  analyzeText: (text, opts) => request('/analyze/text', { method: 'POST', body: { text }, ...opts }),
  analyzeUrl: (url, opts) => request('/analyze/url', { method: 'POST', body: { url }, ...opts }),
  analyzeImage: (file, opts) => {
    const form = new FormData();
    form.append('image', file);
    return request('/analyze/image', { method: 'POST', body: form, ...opts });
  },
  analyzeSample: (sampleId, opts) => request('/analyze/sample', { method: 'POST', body: { sample_id: sampleId }, ...opts }),
};
