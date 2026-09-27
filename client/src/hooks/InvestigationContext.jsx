/* eslint-disable react-refresh/only-export-components */
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { api, ApiError } from '../services/api.js';
import * as history from '../utils/history.js';

const Ctx = createContext(null);

/**
 * Holds the in-session investigation (including the original submission for display),
 * server health, and locally stored history. The raw submission and image preview live
 * only in memory for this session and are never persisted.
 */
export function InvestigationProvider({ children }) {
  const [health, setHealth] = useState({ status: 'loading', data: null });
  const [run, setRun] = useState({ status: 'idle', inputType: null, error: null, partialReport: null });
  const [current, setCurrent] = useState(null); // { report, preview: {text?, url?, imageUrl?} }
  const [records, setRecords] = useState([]);
  const [historyState, setHistoryState] = useState({ corrupted: false, available: true, error: null });
  const [settings, setSettings] = useState(() => history.loadSettings());
  const abortRef = useRef(null);
  const previewUrlRef = useRef(null);

  const refreshHealth = useCallback(async () => {
    setHealth((h) => ({ ...h, status: 'loading' }));
    try {
      const data = await api.health();
      setHealth({ status: 'ok', data });
    } catch (err) {
      setHealth({ status: 'error', data: null, error: err });
    }
  }, []);

  useEffect(() => {
    // Initial load: server status and locally stored history.
    refreshHealth();
    const loaded = history.loadHistory();
    setRecords(loaded.records);
    setHistoryState({ corrupted: loaded.corrupted, available: loaded.available, error: null });
  }, [refreshHealth]);

  useEffect(() => () => previewUrlRef.current && URL.revokeObjectURL(previewUrlRef.current), []);

  const persist = useCallback((fn, ...args) => {
    try {
      const next = fn(...args);
      setRecords(next);
      setHistoryState((s) => ({ ...s, error: null, corrupted: false }));
      return true;
    } catch (err) {
      setHistoryState((s) => ({ ...s, error: err.message }));
      return false;
    }
  }, []);

  const saveToHistory = useCallback((report) => persist(history.saveRecord, report), [persist]);
  const deleteFromHistory = useCallback((id) => persist(history.deleteRecord, id), [persist]);
  const clearAllHistory = useCallback(() => persist(history.clearHistory), [persist]);
  const updateSettings = useCallback((next) => {
    setSettings(next);
    history.saveSettings(next);
  }, []);

  const setPreview = (preview) => {
    if (previewUrlRef.current && previewUrlRef.current !== preview?.imageUrl) URL.revokeObjectURL(previewUrlRef.current);
    previewUrlRef.current = preview?.imageUrl ?? null;
  };

  /**
   * @param {{type:'text'|'url'|'image'|'sample', text?:string, url?:string, file?:File, sampleId?:string}} input
   * @returns {Promise<object|null>} the report on success
   */
  const investigate = useCallback(
    async (input) => {
      abortRef.current?.abort();
      const controller = new AbortController();
      abortRef.current = controller;
      setRun({ status: 'running', inputType: input.type === 'sample' ? 'sample' : input.type, error: null, partialReport: null });
      try {
        let res;
        if (input.type === 'text') res = await api.analyzeText(input.text, { signal: controller.signal });
        else if (input.type === 'url') res = await api.analyzeUrl(input.url, { signal: controller.signal });
        else if (input.type === 'image') res = await api.analyzeImage(input.file, { signal: controller.signal });
        else res = await api.analyzeSample(input.sampleId, { signal: controller.signal });

        const report = res.report;
        const preview = {
          text: report.submission?.text ?? null,
          url: report.submission?.url ?? null,
          imageUrl: input.type === 'image' ? URL.createObjectURL(input.file) : null,
        };
        setPreview(preview);
        setCurrent({ report, preview });
        if (settings.autoSave && report.mode === 'live') saveToHistory(report);
        setRun({ status: 'idle', inputType: null, error: null, partialReport: null });
        return report;
      } catch (err) {
        const error = err instanceof ApiError ? err : new ApiError('UNKNOWN', 'Unexpected error.', 0);
        if (error.code === 'CANCELLED') {
          setRun({ status: 'idle', inputType: null, error: null, partialReport: null });
          return null;
        }
        const partial = error.details?.rules_only_report ?? null;
        setRun({ status: 'error', inputType: input.type, error, partialReport: partial ? { report: partial, text: input.text ?? null } : null });
        return null;
      } finally {
        if (abortRef.current === controller) abortRef.current = null;
      }
    },
    [settings.autoSave, saveToHistory],
  );

  const cancel = useCallback(() => abortRef.current?.abort(), []);
  const resetRun = useCallback(() => setRun({ status: 'idle', inputType: null, error: null, partialReport: null }), []);

  /** Show the rule-only partial report that came with an AI error. */
  const openPartialReport = useCallback(() => {
    if (!run.partialReport) return null;
    const { report, text } = run.partialReport;
    setPreview(null);
    setCurrent({ report, preview: { text: report.submission?.text ?? text, url: report.submission?.url ?? null, imageUrl: null } });
    return report;
  }, [run.partialReport]);

  const findReport = useCallback(
    (id) => {
      if (current?.report.id === id) return { report: current.report, preview: current.preview, source: 'session' };
      const rec = records.find((r) => r.id === id);
      return rec ? { report: rec, preview: null, source: 'history' } : null;
    },
    [current, records],
  );

  const value = useMemo(
    () => ({
      health,
      refreshHealth,
      run,
      investigate,
      cancel,
      resetRun,
      openPartialReport,
      current,
      findReport,
      records,
      historyState,
      saveToHistory,
      deleteFromHistory,
      clearAllHistory,
      settings,
      updateSettings,
      isSaved: (id) => records.some((r) => r.id === id),
    }),
    [health, refreshHealth, run, investigate, cancel, resetRun, openPartialReport, current, findReport, records, historyState, saveToHistory, deleteFromHistory, clearAllHistory, settings, updateSettings],
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useInvestigation() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error('useInvestigation must be used inside InvestigationProvider');
  return ctx;
}
