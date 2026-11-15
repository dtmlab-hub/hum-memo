import 'fake-indexeddb/auto';
import { describe, it, expect } from 'vitest';
import { IndexedDbMemoRepository } from '../src/storage/indexedDbRepository';

describe('IndexedDbMemoRepository', () => {
  it('録音直後に音声だけで保存でき、後からMIDIを追記しても音声は残る', async () => {
    const repo = new IndexedDbMemoRepository('test-db-1');
    const blob = new Blob([new Uint8Array([1, 2, 3])], { type: 'audio/mp4' });
    const memo = await repo.createFromRecording(blob, 'audio/mp4', 12.3);
    expect(memo.midi.raw).toEqual([]);
    expect(memo.title).toMatch(/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}$/);

    await repo.updateTranscription(memo.id, [{ pitchMidi: 60, startSeconds: 0, durationSeconds: 1, velocity: 1 }], 'ok');
    const loaded = await repo.get(memo.id);
    expect(loaded?.midi.raw.length).toBe(1);
    expect(loaded?.transcription.status).toBe('ok');
    expect(loaded?.audio.durationSeconds).toBe(12.3);
    expect(loaded?.audio.blob.size).toBe(3);
  });
  it('解析失敗を記録しても音声は消えない', async () => {
    const repo = new IndexedDbMemoRepository('test-db-2');
    const memo = await repo.createFromRecording(new Blob([new Uint8Array([9])]), 'audio/webm', 1);
    await repo.updateTranscription(memo.id, [], 'failed', 'boom');
    const loaded = await repo.get(memo.id);
    expect(loaded?.transcription).toMatchObject({ status: 'failed', error: 'boom' });
    expect(loaded?.audio.blob.size).toBe(1);
    expect((await repo.list()).length).toBe(1);
  });
});
