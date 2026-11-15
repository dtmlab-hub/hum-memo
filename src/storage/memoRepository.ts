import type { Memo, NoteEvent, TranscriptionStatus } from '../types/memo';
import { correctNotes } from '../analysis/correctNotes';
import { detectKey } from '../analysis/detectKey';
import { analyzeContour } from '../analysis/analyzeContour';
import { analyzeRhythm } from '../analysis/analyzeRhythm';

/** ストレージ抽象。IndexedDB以外（ネイティブ・書き出し）へ差し替えられるようにする */
export interface MemoRepository {
  /** 端末に残るか（falseなら閉じると消える） */
  readonly persistent: boolean;
  createFromRecording(blob: Blob, mimeType: string, durationSeconds: number): Promise<Memo>;
  updateTranscription(id: string, raw: NoteEvent[], status: TranscriptionStatus, error?: string, processingMs?: number): Promise<Memo>;
  updateText(id: string, patch: TextPatch): Promise<Memo>;
  delete(id: string): Promise<void>;
  get(id: string): Promise<Memo | undefined>;
  list(): Promise<Memo[]>;
}

export type TextPatch = Partial<Pick<Memo, 'title' | 'userNote' | 'tags'>>;

export function defaultTitle(d: Date): string {
  const p = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}`;
}

function newId(): string {
  return globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

export function newMemo(blob: Blob, mimeType: string, durationSeconds: number): Memo {
  const now = new Date();
  return {
    id: newId(),
    createdAt: now.toISOString(),
    title: defaultTitle(now),
    tags: [],
    audio: { blob, mimeType, durationSeconds },
    midi: { raw: [], corrected: [] },
    transcription: { status: 'pending' },
    analysis: { key: null, rangeLow: null, rangeHigh: null, noteCount: 0, contour: null, rhythmNote: null },
    userNote: '',
  };
}

/** 解析結果を反映。音声には触れない。補正版はRawから毎回作り直す */
export function withTranscription(
  memo: Memo, raw: NoteEvent[], status: TranscriptionStatus, error?: string, processingMs?: number,
): Memo {
  const corrected = correctNotes(raw);
  const pitches = corrected.map((n) => n.pitchMidi);
  return {
    ...memo,
    midi: { raw, corrected },
    transcription: { status, ...(error ? { error } : {}), ...(processingMs != null ? { processingMs } : {}) },
    analysis: {
      ...memo.analysis,
      noteCount: corrected.length,
      key: detectKey(corrected),
      contour: analyzeContour(corrected),
      rhythmNote: analyzeRhythm(corrected),
      rangeLow: pitches.length ? Math.min(...pitches) : null,
      rangeHigh: pitches.length ? Math.max(...pitches) : null,
    },
  };
}

export function sortNewest(memos: Memo[]): Memo[] {
  return memos.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}
