import { describe, it, expect } from 'vitest';
import { Midi } from '@tonejs/midi';
import { generateMidi } from '../src/midi/generateMidi';

describe('generateMidi', () => {
  it('有効な.midバイト列を生成し、音程・時間位置を保つ', () => {
    const bytes = generateMidi([
      { pitchMidi: 60, startSeconds: 0.5, durationSeconds: 0.25, velocity: 0.8 },
      { pitchMidi: 67, startSeconds: 1.0, durationSeconds: 0.5, velocity: 0.4 },
    ]);
    expect(String.fromCharCode(...bytes.slice(0, 4))).toBe('MThd');
    const midi = new Midi(bytes);
    const notes = midi.tracks[0].notes;
    expect(notes.map((n) => n.midi)).toEqual([60, 67]);
    expect(notes[0].time).toBeCloseTo(0.5, 2);
    expect(notes[1].duration).toBeCloseTo(0.5, 2);
    expect(midi.header.tempos[0].bpm).toBeCloseTo(120, 3);
  });
  it('ノート0個でも有効なファイルになる', () => {
    const midi = new Midi(generateMidi([]));
    expect(midi.tracks.length).toBe(1);
  });
});
