import type { NoteEvent } from '../types/memo';

/** Krumhansl-Schmuckler のキープロファイル */
const MAJOR = [6.35, 2.23, 3.48, 2.33, 4.38, 4.09, 2.52, 5.19, 2.39, 3.66, 2.29, 2.88];
const MINOR = [6.33, 2.68, 3.52, 5.38, 2.6, 3.53, 2.54, 4.75, 3.98, 2.69, 3.34, 3.17];
const NAMES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];

/** 誤ったKeyを出さないための基準値 */
export const KEY_THRESHOLDS = { minNotes: 6, minCorrelation: 0.6, minMargin: 0.05 };

function correlation(a: number[], b: number[]): number {
  const ma = a.reduce((s, x) => s + x, 0) / a.length;
  const mb = b.reduce((s, x) => s + x, 0) / b.length;
  let num = 0, da = 0, db = 0;
  for (let i = 0; i < a.length; i++) {
    num += (a[i] - ma) * (b[i] - mb);
    da += (a[i] - ma) ** 2;
    db += (b[i] - mb) ** 2;
  }
  return da === 0 || db === 0 ? 0 : num / Math.sqrt(da * db);
}

/** 音の長さで重みを付けた音名ヒストグラムからKeyを推定。自信が無ければnull（画面では「不明」） */
export function detectKey(notes: NoteEvent[]): string | null {
  if (notes.length < KEY_THRESHOLDS.minNotes) return null;
  const hist = new Array(12).fill(0);
  for (const n of notes) hist[((n.pitchMidi % 12) + 12) % 12] += n.durationSeconds;

  const scores: { name: string; r: number }[] = [];
  for (let tonic = 0; tonic < 12; tonic++) {
    const rotate = (p: number[]) => p.map((_, i) => p[(i - tonic + 12) % 12]);
    scores.push({ name: `${NAMES[tonic]} メジャー`, r: correlation(hist, rotate(MAJOR)) });
    scores.push({ name: `${NAMES[tonic]} マイナー`, r: correlation(hist, rotate(MINOR)) });
  }
  scores.sort((a, b) => b.r - a.r);
  const [best, second] = scores;
  if (best.r < KEY_THRESHOLDS.minCorrelation || best.r - second.r < KEY_THRESHOLDS.minMargin) return null;
  return best.name;
}
