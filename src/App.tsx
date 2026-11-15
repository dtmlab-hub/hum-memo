import { useCallback, useEffect, useRef, useState } from 'react';
import { MAX_RECORDING_SECONDS, Recorder, RecorderError } from './audio/recorder';
import { decodeBlob, toBasicPitchInput } from './audio/decode';
import { transcribe } from './analysis/transcribe';
import { IndexedDbMemoRepository } from './storage/indexedDbRepository';
import { MemoryMemoRepository } from './storage/memoryRepository';
import type { MemoRepository } from './storage/memoRepository';
import type { Memo } from './types/memo';
import { HomePage } from './pages/HomePage';
import { MemoDetail } from './pages/MemoDetail';

export type DebugInfo = { backend: string; ms: number; decodeMs: number };

type View =
  | { name: 'home' }
  | { name: 'recording' }
  | { name: 'analyzing'; progress: number }
  | { name: 'detail'; id: string };

export function App() {
  const [repo, setRepo] = useState<MemoRepository | null>(null);
  const [memos, setMemos] = useState<Memo[]>([]);
  const [view, setView] = useState<View>({ name: 'home' });
  const [error, setError] = useState<string | null>(null);
  const [elapsed, setElapsed] = useState(0);
  const [debug, setDebug] = useState<Record<string, DebugInfo>>({});
  const recorderRef = useRef<Recorder | null>(null);

  useEffect(() => {
    const idb = new IndexedDbMemoRepository();
    void idb.available().then((ok) => setRepo(ok ? idb : new MemoryMemoRepository()));
  }, []);

  const refresh = useCallback(async () => {
    if (repo) setMemos(await repo.list());
  }, [repo]);
  useEffect(() => void refresh(), [refresh]);

  const analyze = useCallback(async (memo: Memo) => {
    if (!repo) return;
    setView({ name: 'analyzing', progress: 0 });
    setError(null);
    try {
      const d0 = performance.now();
      const input = await toBasicPitchInput(await decodeBlob(memo.audio.blob));
      const decodeMs = performance.now() - d0;
      const res = await transcribe(input, (p) => setView({ name: 'analyzing', progress: p }));
      setDebug((d) => ({ ...d, [memo.id]: { backend: res.backend, ms: res.ms, decodeMs } }));
      await repo.updateTranscription(memo.id, res.notes, 'ok', undefined, res.ms);
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      await repo.updateTranscription(memo.id, [], 'failed', msg).catch(() => undefined);
    }
    await refresh();
    setView({ name: 'detail', id: memo.id });
  }, [repo, refresh]);

  /** 音声を先に保存 → その後に解析（解析が失敗しても音声は残る） */
  const saveAndAnalyze = useCallback(async (blob: Blob, mimeType: string, durationSeconds: number) => {
    if (!repo) return;
    try {
      const memo = await repo.createFromRecording(blob, mimeType, durationSeconds);
      await refresh();
      await analyze(memo);
    } catch (e) {
      setError(`端末への保存に失敗しました（容量不足の可能性）: ${String(e)}`);
      setView({ name: 'home' });
    }
  }, [repo, refresh, analyze]);

  async function startRecording() {
    setError(null);
    const rec = new Recorder();
    try {
      await rec.start();
      recorderRef.current = rec;
      setElapsed(0);
      setView({ name: 'recording' });
    } catch (e) {
      setError(e instanceof RecorderError ? e.message : `録音を開始できませんでした: ${String(e)}`);
    }
  }

  const stopRecording = useCallback(async () => {
    const rec = recorderRef.current;
    if (!rec) return;
    recorderRef.current = null;
    const r = await rec.stop();
    await saveAndAnalyze(r.blob, r.mimeType, r.durationSeconds);
  }, [saveAndAnalyze]);

  useEffect(() => {
    if (view.name !== 'recording') return;
    const t0 = performance.now();
    const id = setInterval(() => {
      const s = (performance.now() - t0) / 1000;
      setElapsed(s);
      if (s >= MAX_RECORDING_SECONDS) void stopRecording();
    }, 200);
    return () => clearInterval(id);
  }, [view.name, stopRecording]);

  async function importFile(file: File) {
    setError(null);
    try {
      const buf = await decodeBlob(file);
      await saveAndAnalyze(file, file.type || 'audio/mp4', buf.duration);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    }
  }

  if (!repo) return <main className="page" />;

  if (view.name === 'recording') {
    return (
      <main className="page">
        <section className="rec-area">
          <p className="rec-indicator">● REC</p>
          <p className="timer">{formatTime(elapsed)}</p>
          <button className="big-button stop" onClick={() => void stopRecording()}>停止</button>
          <p className="hint">最大{MAX_RECORDING_SECONDS}秒</p>
        </section>
      </main>
    );
  }
  if (view.name === 'analyzing') {
    return (
      <main className="page">
        <section className="rec-area">
          <p className="analyzing">MIDI解析中...</p>
          <p className="timer">{Math.round(view.progress * 100)}%</p>
        </section>
      </main>
    );
  }
  if (view.name === 'detail') {
    const memo = memos.find((m) => m.id === view.id);
    if (memo) {
      return (
        <MemoDetail
          memo={memo}
          repo={repo}
          debug={debug[memo.id]}
          onBack={() => setView({ name: 'home' })}
          onChanged={refresh}
          onDeleted={async () => {
            await refresh();
            setView({ name: 'home' });
          }}
          onRetry={() => void analyze(memo)}
        />
      );
    }
  }
  return (
    <HomePage
      memos={memos}
      persistent={repo.persistent}
      canRecord={Recorder.isSupported()}
      error={error}
      onRecord={() => void startRecording()}
      onImport={(f) => void importFile(f)}
      onOpen={(id) => setView({ name: 'detail', id })}
    />
  );
}

function formatTime(s: number): string {
  const sec = Math.floor(s);
  return `${String(Math.floor(sec / 60)).padStart(2, '0')}:${String(sec % 60).padStart(2, '0')}`;
}
