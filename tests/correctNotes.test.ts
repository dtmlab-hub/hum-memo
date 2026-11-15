import { describe, it, expect } from 'vitest';
import { correctNotes, DEFAULT_CORRECTION } from '../src/analysis/correctNotes';
import type { NoteEvent } from '../src/types/memo';

const n = (pitchMidi: number, startSeconds: number, durationSeconds: number, velocity = 0.7, pitchBends?: number[]): NoteEvent =>
  ({ pitchMidi, startSeconds, durationSeconds, velocity, ...(pitchBends ? { pitchBends } : {}) });

describe('correctNotes', () => {
  it('Rawを書き換えない', () => {
    const raw = [n(60, 0, 0.5, 0.7, [1, 2]), n(60, 0.51, 0.5)];
    const copy = JSON.parse(JSON.stringify(raw));
    correctNotes(raw);
    expect(raw).toEqual(copy);
  });
  it('極端に短いノートを消す（閾値は定数）', () => {
    expect(DEFAULT_CORRECTION.minNoteDurationMs).toBe(60);
    const out = correctNotes([n(60, 0, 0.5), n(62, 0.6, 0.04), n(64, 0.7, 0.5)]);
    expect(out.map((x) => x.pitchMidi)).toEqual([60, 64]);
  });
  it('重なった弱いゴースト（倍音の誤検出）を消し、強い方を残す', () => {
    // 実測：D4 0.42+0.51 v0.72 と D5 0.42+0.07 v0.30
    const out = correctNotes([n(60, 0, 0.43, 0.72), n(62, 0.42, 0.51, 0.72), n(74, 0.42, 0.07, 0.3), n(64, 0.92, 0.49, 0.76)]);
    expect(out.map((x) => x.pitchMidi)).toEqual([60, 62, 64]);
  });
  it('細かく分割された同じ音をつなぐ', () => {
    const out = correctNotes([n(60, 0, 0.3), n(60, 0.31, 0.1), n(60, 0.42, 0.3)]);
    expect(out).toHaveLength(1);
    expect(out[0].startSeconds).toBe(0);
    expect(out[0].durationSeconds).toBeCloseTo(0.72, 5);
  });
  it('隙間なく続けて歌った同じ音（実測：ソ0.49秒＋ソ0.51秒）はつながない', () => {
    expect(correctNotes([n(67, 1.93, 0.49), n(67, 2.42, 0.51)])).toHaveLength(2);
  });
  it('間が空いた同じ音（同音反復）はつながない', () => {
    expect(correctNotes([n(60, 0, 0.3), n(60, 0.5, 0.3)])).toHaveLength(2);
  });
  it('補正版はピッチベンドを持たない（音程の揺れはRawに残す）', () => {
    expect(correctNotes([n(60, 0, 0.5, 0.7, [1, -1])])[0].pitchBends).toBeUndefined();
  });
  it('重なりは次の音の頭で切る（単旋律にする）', () => {
    const out = correctNotes([n(60, 0, 0.6, 0.7), n(62, 0.5, 0.5, 0.7)]);
    expect(out[0].durationSeconds).toBeCloseTo(0.5, 5);
  });
});
