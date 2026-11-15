import { describe, it, expect } from 'vitest';
import { MemoryMemoRepository } from '../src/storage/memoryRepository';

describe('MemoryMemoRepository（端末保存が使えない時の代わり）', () => {
  it('IndexedDB版と同じ流れで使える', async () => {
    const repo = new MemoryMemoRepository();
    const m = await repo.createFromRecording(new Blob([new Uint8Array([1])]), 'audio/mp4', 2);
    const u = await repo.updateTranscription(m.id, [{ pitchMidi: 62, startSeconds: 0, durationSeconds: 0.5, velocity: 0.7 }], 'ok');
    expect(u.midi.corrected).toHaveLength(1);
    expect(u.analysis.rangeLow).toBe(62);
    await repo.updateText(m.id, { title: 'x' });
    expect((await repo.list())[0].title).toBe('x');
    await repo.delete(m.id);
    expect(await repo.list()).toEqual([]);
  });
});
