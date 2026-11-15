import { describe, it, expect } from 'vitest';
import { detectKey } from '../src/analysis/detectKey';
import { analyzeContour } from '../src/analysis/analyzeContour';
import { analyzeRhythm } from '../src/analysis/analyzeRhythm';
import type { NoteEvent } from '../src/types/memo';

const seq = (pitches: number[], dur = 0.5, gap = 0): NoteEvent[] =>
  pitches.map((p, i) => ({ pitchMidi: p, startSeconds: i * (dur + gap), durationSeconds: dur, velocity: 0.7 }));

describe('detectKey', () => {
  it('Cメジャーのメロディを判定する', () => {
    const notes = seq([60, 64, 67, 64, 60, 62, 64, 62, 60, 67, 64, 60]);
    expect(detectKey(notes)).toBe('C メジャー');
  });
  it('Aマイナーのメロディを判定する', () => {
    const notes = seq([69, 72, 76, 72, 69, 71, 72, 71, 69, 64, 67, 69]);
    expect(detectKey(notes)).toBe('A マイナー');
  });
  it('音が少なすぎる時は無理に答えない', () => {
    expect(detectKey(seq([60, 62, 64]))).toBeNull();
  });
  it('12音が均等に出る時は答えない', () => {
    expect(detectKey(seq([60, 61, 62, 63, 64, 65, 66, 67, 68, 69, 70, 71]))).toBeNull();
  });
});

describe('analyzeContour', () => {
  it('上昇', () => expect(analyzeContour(seq([60, 62, 64, 65, 67, 69, 71, 72]))).toBe('上昇'));
  it('下降', () => expect(analyzeContour(seq([72, 71, 69, 67, 65, 64, 62, 60]))).toBe('下降'));
  it('上がって下がる', () => expect(analyzeContour(seq([60, 64, 67, 72, 67, 64, 62, 60]))).toBe('上がってから下がる'));
  it('下がって上がる', () => expect(analyzeContour(seq([72, 67, 64, 60, 64, 67, 69, 72]))).toBe('下がってから上がる'));
  it('同音反復', () => expect(analyzeContour(seq([60, 60, 60, 60, 60, 62, 60, 60]))).toBe('同音反復'));
  it('音が少ない時はnull', () => expect(analyzeContour(seq([60, 62]))).toBeNull());
});

describe('analyzeRhythm', () => {
  it('一定間隔に近い', () => expect(analyzeRhythm(seq([60, 62, 64, 65, 67, 69], 0.45, 0.05))).toContain('一定間隔'));
  it('短い音が多い', () => expect(analyzeRhythm(seq([60, 62, 64, 65, 67, 69, 71, 72], 0.15, 0))).toContain('短い音が多い'));
  it('長い音が多い', () => expect(analyzeRhythm(seq([60, 62, 64, 65, 67], 1.2, 0.1))).toContain('長い音が多い'));
  it('不規則', () => {
    const n: NoteEvent[] = [0, 0.3, 1.1, 1.3, 2.6, 2.8].map((s, i) => ({ pitchMidi: 60 + i, startSeconds: s, durationSeconds: 0.25, velocity: 0.7 }));
    expect(analyzeRhythm(n)).toContain('不規則');
  });
  it('音が少ない時はnull', () => expect(analyzeRhythm(seq([60, 62]))).toBeNull());
});
