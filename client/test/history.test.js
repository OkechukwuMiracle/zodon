import { describe, it, expect, beforeEach } from 'vitest';
import {
  HISTORY_KEY, MAX_RECORDS, loadHistory, saveRecord, deleteRecord, clearHistory, computeStats, filterRecords, toHistoryRecord, isValidRecord, loadSettings,
} from '../src/utils/history.js';
import { reportToText } from '../src/utils/reportText.js';
import { validateUrlInput, validateImageFile } from '../src/utils/validation.js';

class MemoryStorage {
  constructor() { this.map = new Map(); }
  getItem(k) { return this.map.has(k) ? this.map.get(k) : null; }
  setItem(k, v) { this.map.set(k, String(v)); }
  removeItem(k) { this.map.delete(k); }
}

let n = 0;
const makeReport = (over = {}) => ({
  id: `ZOD-20260927-AAAA${String(n++).padStart(2, '0')}`,
  created_at: new Date().toISOString(),
  mode: 'live',
  input_type: 'text',
  classification: 'phishing',
  classification_label: 'Phishing',
  summary: 'Bank impersonation message',
  assessment: { severity: 'high', evidence_strength: 'strong', ai_confidence: 0.8, rationale: ['r'], disclaimer: 'd', score: 7, contributing: [] },
  evidence: [{ id: 'e', kind: 'observed', title: 'Urgency', evidence: 'now', explanation: 'x', source_label: 'Rule', strength: 'moderate' }],
  attack_path: { established: false, steps: [], message: 'Not enough evidence to establish a likely attack path.' },
  recommendations: [{ priority: 'immediate', action: 'Do not click.', reason: 'Unverified.' }],
  limitations: ['Not visited.'],
  submission: { text: 'SECRET private message body', url: null, image: null },
  image: null,
  ...over,
});

describe('history storage', () => {
  let s;
  beforeEach(() => { s = new MemoryStorage(); });

  it('starts empty', () => {
    expect(loadHistory(s)).toEqual({ records: [], corrupted: false, available: true });
  });

  it('saves without the raw submission text or screenshot transcription', () => {
    const report = makeReport({ image: { readability: 'clear', extracted_text: 'PRIVATE OCR', visual_observations: [] }, submission: { text: 'SECRET private message body', url: null, image: { name: 'me.png', size: 10, mime: 'image/png' } } });
    saveRecord(report, s);
    const raw = s.getItem(HISTORY_KEY);
    expect(raw).not.toContain('SECRET private message body');
    expect(raw).not.toContain('PRIVATE OCR');
    expect(raw).not.toContain('me.png');
    const [rec] = loadHistory(s).records;
    expect(rec.submission.text_length).toBe(27);
    expect(rec.id).toBe(report.id);
  });

  it('de-duplicates by id and puts newest first', () => {
    const a = makeReport();
    const b = makeReport();
    saveRecord(a, s);
    saveRecord(b, s);
    saveRecord(a, s);
    expect(loadHistory(s).records.map((r) => r.id)).toEqual([a.id, b.id]);
  });

  it('caps the number of records', () => {
    for (let i = 0; i < MAX_RECORDS + 5; i++) saveRecord(makeReport(), s);
    expect(loadHistory(s).records).toHaveLength(MAX_RECORDS);
  });

  it('deletes and clears', () => {
    const a = makeReport();
    saveRecord(a, s);
    saveRecord(makeReport(), s);
    expect(deleteRecord(a.id, s)).toHaveLength(1);
    expect(clearHistory(s)).toEqual([]);
    expect(loadHistory(s).records).toEqual([]);
  });

  it('handles corrupted JSON safely', () => {
    s.setItem(HISTORY_KEY, '{not json');
    expect(loadHistory(s)).toEqual({ records: [], corrupted: true, available: true });
  });

  it('drops invalid entries but keeps valid ones', () => {
    const good = toHistoryRecord(makeReport());
    s.setItem(HISTORY_KEY, JSON.stringify([good, { id: 5 }, null, { ...good, id: 'bad', assessment: { severity: 'extreme' } }]));
    const res = loadHistory(s);
    expect(res.records).toHaveLength(1);
    expect(res.corrupted).toBe(true);
  });

  it('reports unavailable storage and surfaces write failures', () => {
    const broken = { getItem() { throw new Error('denied'); }, setItem() { throw new Error('quota'); } };
    expect(loadHistory(broken).available).toBe(false);
    const full = new MemoryStorage();
    full.setItem = () => { throw new Error('QuotaExceeded'); };
    expect(() => saveRecord(makeReport(), full)).toThrow(/browser storage/);
  });

  it('validates records', () => {
    expect(isValidRecord(toHistoryRecord(makeReport()))).toBe(true);
    expect(isValidRecord({})).toBe(false);
  });

  it('defaults settings to auto-save', () => {
    expect(loadSettings(s)).toEqual({ autoSave: true });
    s.setItem('zodon.settings.v1', '{bad');
    expect(loadSettings(s)).toEqual({ autoSave: true });
  });
});

describe('stats and filters', () => {
  const records = [
    makeReport({ assessment: { severity: 'critical' } }),
    makeReport({ assessment: { severity: 'high' }, summary: 'Delivery fee scam' }),
    makeReport({ assessment: { severity: 'medium' } }),
    makeReport({ assessment: { severity: 'low' } }),
    makeReport({ assessment: { severity: 'inconclusive' } }),
    makeReport({ assessment: { severity: 'high' }, mode: 'sample' }),
  ];
  it('computes stats from real records only, excluding synthetic samples', () => {
    expect(computeStats(records)).toEqual({ total: 5, high: 2, medium: 1, low: 1, inconclusive: 1, samples: 1 });
    expect(computeStats([])).toEqual({ total: 0, high: 0, medium: 0, low: 0, inconclusive: 0, samples: 0 });
  });
  it('filters by severity group and search text', () => {
    expect(filterRecords(records, { severity: 'high' })).toHaveLength(3);
    expect(filterRecords(records, { query: 'delivery' })).toHaveLength(1);
    expect(filterRecords(records, { query: records[0].id.toLowerCase() })).toHaveLength(1);
  });
});

describe('report text export', () => {
  it('includes key sections and labels samples', () => {
    const text = reportToText(makeReport({ mode: 'sample' }));
    expect(text).toMatch(/SYNTHETIC SAMPLE/);
    expect(text).toMatch(/OBSERVED EVIDENCE/);
    expect(text).toMatch(/Not enough evidence/);
    expect(text).toMatch(/\[Now\] Do not click/);
  });
});

describe('client input validation', () => {
  it('validates URLs', () => {
    expect(validateUrlInput('https://example.com')).toBeNull();
    expect(validateUrlInput('example.com/login')).toBeNull();
    expect(validateUrlInput('')).toMatch(/Enter/);
    expect(validateUrlInput('javascript:alert(1)')).toMatch(/http/);
    expect(validateUrlInput('hello world')).toMatch(/spaces/);
    expect(validateUrlInput('localhost')).toMatch(/domain/);
  });
  it('validates image files', () => {
    expect(validateImageFile({ type: 'image/png', size: 1000 }, 5)).toBeNull();
    expect(validateImageFile({ type: 'application/pdf', size: 1000 }, 5)).toMatch(/Unsupported/);
    expect(validateImageFile({ type: 'image/png', size: 6 * 1024 * 1024 }, 5)).toMatch(/exceeds/);
    expect(validateImageFile({ type: 'image/png', size: 0 }, 5)).toMatch(/empty/);
  });
});
