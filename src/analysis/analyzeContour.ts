import type { NoteEvent } from '../types/memo';

export const CONTOUR_THRESHOLDS = { minNotes: 4, repeatRatio: 0.8, flatSemitones: 2, bigMoveSemitones: 3 };

const mean = (xs: number[]) => xs.reduce((s, x) => s + x, 0) / xs.length;

/** 音の動き（ルールベース）。前・中・後ろの3区間の平均音高の変化で分類する */
export function analyzeContour(notes: NoteEvent[]): string | null {
  const t = CONTOUR_THRESHOLDS;
  if (notes.length < t.minNotes) return null;
  const p = notes.map((n) => n.pitchMidi);

  const counts = new Map<number, number>();
  p.forEach((x) => counts.set(x, (counts.get(x) ?? 0) + 1));
  if (Math.max(...counts.values()) / p.length >= t.repeatRatio) return '同音反復';

  const k = Math.max(1, Math.floor(p.length / 3));
  const head = mean(p.slice(0, k));
  const mid = mean(p.slice(k, p.length - k).length ? p.slice(k, p.length - k) : p);
  const tail = mean(p.slice(-k));

  if (mid - head >= t.bigMoveSemitones && mid - tail >= t.bigMoveSemitones) return '上がってから下がる';
  if (head - mid >= t.bigMoveSemitones && tail - mid >= t.bigMoveSemitones) return '下がってから上がる';

  const net = tail - head;
  if (net >= t.bigMoveSemitones) return '上昇';
  if (net <= -t.bigMoveSemitones) return '下降';
  return Math.max(...p) - Math.min(...p) <= t.flatSemitones ? '同音反復' : '上下に動く';
}
