import 'fake-indexeddb/auto';
import { describe, it, expect } from 'vitest';
import { IndexedDbMemoRepository } from '../src/storage/indexedDbRepository';

describe('IndexedDbMemoRepository（一覧・補正・編集）', () => {
  it('解析結果で補正版と音域も保存する', async () => {
    const repo = new IndexedDbMemoRepository('test-db-3');
    const m = await repo.createFromRecording(new Blob([new Uint8Array([1])]), 'audio/mp4', 2);
    const raw = [
      { pitchMidi: 60, startSeconds: 0, durationSeconds: 0.5, velocity: 0.7 },
      { pitchMidi: 72, startSeconds: 0.1, durationSeconds: 0.07, velocity: 0.2 },
      { pitchMidi: 64, startSeconds: 0.6, durationSeconds: 0.5, velocity: 0.7 },
    ];
    const u = await repo.updateTranscription(m.id, raw, 'ok');
    expect(u.midi.raw).toHaveLength(3);
    expect(u.midi.corrected.map((x) => x.pitchMidi)).toEqual([60, 64]);
    expect(u.analysis).toMatchObject({ noteCount: 2, rangeLow: 60, rangeHigh: 64 });
  });
  it('タイトルとメモを変更でき、削除できる', async () => {
    const repo = new IndexedDbMemoRepository('test-db-4');
    const m = await repo.createFromRecording(new Blob([new Uint8Array([1])]), 'audio/mp4', 2);
    await repo.updateText(m.id, { title: 'サビ案', userNote: '浮遊感' });
    expect(await repo.get(m.id)).toMatchObject({ title: 'サビ案', userNote: '浮遊感' });
    await repo.delete(m.id);
    expect(await repo.get(m.id)).toBeUndefined();
  });
  it('一覧は新しい順', async () => {
    const repo = new IndexedDbMemoRepository('test-db-5');
    const a = await repo.createFromRecording(new Blob([]), 'audio/mp4', 1);
    await new Promise((r) => setTimeout(r, 5));
    const b = await repo.createFromRecording(new Blob([]), 'audio/mp4', 1);
    expect((await repo.list()).map((x) => x.id)).toEqual([b.id, a.id]);
  });
});

describe('言葉カードの保存', () => {
  it('解析結果にKey・音の動き・リズムが入る', async () => {
    const repo = new IndexedDbMemoRepository('test-db-6');
    const m = await repo.createFromRecording(new Blob([new Uint8Array([1])]), 'audio/mp4', 5);
    const pitches = [60, 64, 67, 64, 60, 62, 64, 62, 60, 67, 64, 60];
    const raw = pitches.map((p, i) => ({ pitchMidi: p, startSeconds: i * 0.5, durationSeconds: 0.45, velocity: 0.7 }));
    const u = await repo.updateTranscription(m.id, raw, 'ok');
    expect(u.analysis.key).toBe('C メジャー');
    expect(u.analysis.contour).not.toBeNull();
    expect(u.analysis.rhythmNote).toContain('一定間隔');
  });
});
