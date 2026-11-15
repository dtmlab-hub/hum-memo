import { describe, it, expect } from 'vitest';
import { toNoteEvents } from '../src/analysis/basicPitch';

describe('toNoteEvents', () => {
  it('Basic Pitchの出力をNoteEventへ変換し、開始時刻順に並べる', () => {
    const out = toNoteEvents([
      { startTimeSeconds: 1.0, durationSeconds: 0.5, pitchMidi: 64, amplitude: 0.5 },
      { startTimeSeconds: 0.2, durationSeconds: 0.3, pitchMidi: 60, amplitude: 1.2, pitchBends: [0, 1] },
    ]);
    expect(out).toEqual([
      { pitchMidi: 60, startSeconds: 0.2, durationSeconds: 0.3, velocity: 1, pitchBends: [0, 1] },
      { pitchMidi: 64, startSeconds: 1.0, durationSeconds: 0.5, velocity: 0.5 },
    ]);
  });
  it('長さ0以下のノートは捨てる（Rawでも壊れたイベントは保持しない）', () => {
    expect(toNoteEvents([{ startTimeSeconds: 0, durationSeconds: 0, pitchMidi: 60, amplitude: 1 }])).toEqual([]);
  });
});
