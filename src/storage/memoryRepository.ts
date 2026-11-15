import type { Memo, NoteEvent, TranscriptionStatus } from '../types/memo';
import { newMemo, sortNewest, withTranscription, type MemoRepository, type TextPatch } from './memoRepository';

/** IndexedDBが使えない表示環境向け。閉じると消える */
export class MemoryMemoRepository implements MemoRepository {
  readonly persistent = false;
  private memos = new Map<string, Memo>();

  private must(id: string): Memo {
    const m = this.memos.get(id);
    if (!m) throw new Error(`メモが見つかりません: ${id}`);
    return m;
  }

  async createFromRecording(blob: Blob, mimeType: string, durationSeconds: number): Promise<Memo> {
    const m = newMemo(blob, mimeType, durationSeconds);
    this.memos.set(m.id, m);
    return m;
  }

  async updateTranscription(id: string, raw: NoteEvent[], status: TranscriptionStatus, error?: string, processingMs?: number) {
    const u = withTranscription(this.must(id), raw, status, error, processingMs);
    this.memos.set(id, u);
    return u;
  }

  async updateText(id: string, patch: TextPatch) {
    const u = { ...this.must(id), ...patch };
    this.memos.set(id, u);
    return u;
  }

  async delete(id: string) {
    this.memos.delete(id);
  }

  async get(id: string) {
    return this.memos.get(id);
  }

  async list() {
    return sortNewest([...this.memos.values()]);
  }
}
