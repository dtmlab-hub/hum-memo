import type { NoteEvent } from '../types/memo';

/** Basic Pitchの noteFramesToTime() が返す形 */
export type BasicPitchNote = {
  startTimeSeconds: number;
  durationSeconds: number;
  pitchMidi: number;
  amplitude: number;
  pitchBends?: number[];
};

/** 推定パラメータ（Phase 2の精度改善で調整する。各処理に直接書かない） */
export const BASIC_PITCH_PARAMS = {
  onsetThreshold: 0.5,
  frameThreshold: 0.3,
  /** フレーム数（1フレーム≒11.6ms） */
  minNoteLengthFrames: 5,
  inferOnsets: true,
  /** 人の声の範囲に絞る：C2〜C6 */
  minFreqHz: 65,
  maxFreqHz: 1050,
  /** 単旋律の鼻歌なので主旋律優先 */
  melodiaTrick: true,
};

export function toNoteEvents(notes: BasicPitchNote[]): NoteEvent[] {
  return notes
    .filter((n) => n.durationSeconds > 0)
    .map((n) => {
      const ev: NoteEvent = {
        pitchMidi: n.pitchMidi,
        startSeconds: n.startTimeSeconds,
        durationSeconds: n.durationSeconds,
        velocity: Math.min(1, Math.max(0, n.amplitude)),
      };
      if (n.pitchBends && n.pitchBends.length > 0) ev.pitchBends = n.pitchBends;
      return ev;
    })
    .sort((a, b) => a.startSeconds - b.startSeconds || a.pitchMidi - b.pitchMidi);
}
