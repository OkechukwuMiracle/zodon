/**
 * Investigation history in localStorage.
 * Privacy: raw submitted text, screenshot data and AI transcriptions are stripped
 * before saving. Structured findings (which include short evidence excerpts) are kept.
 */
export const HISTORY_KEY = 'zodon.history.v1';
export const SETTINGS_KEY = 'zodon.settings.v1';
export const MAX_RECORDS = 100;
const SEVERITIES = ['critical', 'high', 'medium', 'low', 'inconclusive'];

function getStorage(storage) {
  if (storage) return storage;
  try {
    return typeof window !== 'undefined' ? window.localStorage : null;
  } catch {
    return null;
  }
}

export function isValidRecord(r) {
  return (
    r !== null &&
    typeof r === 'object' &&
    typeof r.id === 'string' &&
    /^ZOD-/.test(r.id) &&
    typeof r.created_at === 'string' &&
    !Number.isNaN(Date.parse(r.created_at)) &&
    typeof r.summary === 'string' &&
    SEVERITIES.includes(r.assessment?.severity) &&
    Array.isArray(r.evidence)
  );
}

/** Remove raw submission content before persisting. */
export function toHistoryRecord(report) {
  const { submission = {}, image, ...rest } = report;
  return {
    ...rest,
    submission: {
      text: null,
      text_length: submission.text ? submission.text.length : null,
      url: submission.url ?? null,
      image: submission.image ? { name: null, size: submission.image.size, mime: submission.image.mime } : null,
      stored: false,
    },
    image: image ? { readability: image.readability, visual_observations: image.visual_observations ?? [], extracted_text: null } : null,
    saved_at: new Date().toISOString(),
  };
}

/** @returns {{records: object[], corrupted: boolean, available: boolean}} */
export function loadHistory(storage) {
  const s = getStorage(storage);
  if (!s) return { records: [], corrupted: false, available: false };
  let raw;
  try {
    raw = s.getItem(HISTORY_KEY);
  } catch {
    return { records: [], corrupted: false, available: false };
  }
  if (!raw) return { records: [], corrupted: false, available: true };
  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) throw new Error('not array');
    const records = parsed.filter(isValidRecord);
    return { records, corrupted: records.length !== parsed.length, available: true };
  } catch {
    return { records: [], corrupted: true, available: true };
  }
}

function write(records, storage) {
  const s = getStorage(storage);
  if (!s) throw new Error('Browser storage is unavailable.');
  try {
    s.setItem(HISTORY_KEY, JSON.stringify(records));
  } catch {
    throw new Error('Could not save to browser storage (it may be full or disabled).');
  }
}

export function saveRecord(report, storage) {
  const { records } = loadHistory(storage);
  const record = toHistoryRecord(report);
  const next = [record, ...records.filter((r) => r.id !== record.id)].slice(0, MAX_RECORDS);
  write(next, storage);
  return next;
}

export function deleteRecord(id, storage) {
  const next = loadHistory(storage).records.filter((r) => r.id !== id);
  write(next, storage);
  return next;
}

export function clearHistory(storage) {
  write([], storage);
  return [];
}

export function computeStats(records) {
  const real = records.filter((r) => r.mode !== 'sample');
  const count = (...levels) => real.filter((r) => levels.includes(r.assessment.severity)).length;
  return {
    total: real.length,
    high: count('critical', 'high'),
    medium: count('medium'),
    low: count('low'),
    inconclusive: count('inconclusive'),
    samples: records.length - real.length,
  };
}

export function filterRecords(records, { severity = 'all', query = '' } = {}) {
  const q = query.trim().toLowerCase();
  return records.filter((r) => {
    if (severity !== 'all') {
      const s = r.assessment.severity;
      if (severity === 'high' ? !['critical', 'high'].includes(s) : s !== severity) return false;
    }
    if (!q) return true;
    return (
      r.id.toLowerCase().includes(q) ||
      r.summary.toLowerCase().includes(q) ||
      (r.classification_label ?? '').toLowerCase().includes(q)
    );
  });
}

export function loadSettings(storage) {
  const s = getStorage(storage);
  try {
    const parsed = JSON.parse(s?.getItem(SETTINGS_KEY) ?? '{}');
    return { autoSave: parsed.autoSave !== false };
  } catch {
    return { autoSave: true };
  }
}

export function saveSettings(settings, storage) {
  try {
    getStorage(storage)?.setItem(SETTINGS_KEY, JSON.stringify(settings));
  } catch {
    // Non-critical.
  }
}
