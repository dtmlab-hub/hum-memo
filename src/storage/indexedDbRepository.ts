import type { Memo, NoteEvent, TranscriptionStatus } from '../types/memo';
import { newMemo, sortNewest, withTranscription, type MemoRepository, type TextPatch } from './memoRepository';

const STORE = 'memos';

function req<T>(r: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    r.onsuccess = () => resolve(r.result);
    r.onerror = () => reject(r.error);
  });
}

export class IndexedDbMemoRepository implements MemoRepository {
  readonly persistent = true;
  private dbPromise: Promise<IDBDatabase> | null = null;

  constructor(private dbName = 'hum-memo') {}

  /** 開けるか確かめる（埋め込み表示などで使えない時はfalse） */
  async available(): Promise<boolean> {
    try {
      await this.db();
      return true;
    } catch {
      return false;
    }
  }

  private db(): Promise<IDBDatabase> {
    this.dbPromise ??= new Promise((resolve, reject) => {
      const open = indexedDB.open(this.dbName, 1);
      open.onupgradeneeded = () => {
        const store = open.result.createObjectStore(STORE, { keyPath: 'id' });
        store.createIndex('createdAt', 'createdAt');
      };
      open.onsuccess = () => resolve(open.result);
      open.onerror = () => reject(open.error);
    });
    return this.dbPromise;
  }

  private async write(fn: (store: IDBObjectStore) => void): Promise<void> {
    const db = await this.db();
    const tx = db.transaction(STORE, 'readwrite');
    fn(tx.objectStore(STORE));
    await new Promise<void>((resolve, reject) => {
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
      tx.onabort = () => reject(tx.error ?? new Error('保存が中断されました（容量不足の可能性）'));
    });
  }

  private async must(id: string): Promise<Memo> {
    const m = await this.get(id);
    if (!m) throw new Error(`メモが見つかりません: ${id}`);
    return m;
  }

  async createFromRecording(blob: Blob, mimeType: string, durationSeconds: number): Promise<Memo> {
    const memo = newMemo(blob, mimeType, durationSeconds);
    await this.write((s) => s.put(memo));
    return memo;
  }

  async updateTranscription(
    id: string, raw: NoteEvent[], status: TranscriptionStatus, error?: string, processingMs?: number,
  ): Promise<Memo> {
    const updated = withTranscription(await this.must(id), raw, status, error, processingMs);
    await this.write((s) => s.put(updated));
    return updated;
  }

  async updateText(id: string, patch: TextPatch): Promise<Memo> {
    const updated = { ...(await this.must(id)), ...patch };
    await this.write((s) => s.put(updated));
    return updated;
  }

  async delete(id: string): Promise<void> {
    await this.write((s) => s.delete(id));
  }

  async get(id: string): Promise<Memo | undefined> {
    const db = await this.db();
    return req(db.transaction(STORE).objectStore(STORE).get(id));
  }

  async list(): Promise<Memo[]> {
    const db = await this.db();
    return sortNewest(await req(db.transaction(STORE).objectStore(STORE).getAll()));
  }
}
