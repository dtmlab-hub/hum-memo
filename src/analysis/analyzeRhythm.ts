import type { NoteEvent } from '../types/memo';

export const RHYTHM_THRESHOLDS = {
  minNotes: 4,
  shortSeconds: 0.25,
  longSeconds: 0.8,
  /** 音の間隔のばらつき（標準偏差/平均）がこれ以下なら「一定間隔」 */
  steadyVariation: 0.2,
};

const median = (xs: number[]) => {
  const s = [...xs].sort((a, b) => a - b);
  return s[Math.floor(s.length / 2)];
};

/** リズムの特徴（ルールベース） */
export function analyzeRhythm(notes: NoteEvent[]): string | null {
  const t = RHYTHM_THRESHOLDS;
  if (notes.length < t.minNotes) return null;
  const sorted = [...notes].sort((a, b) => a.startSeconds - b.startSeconds);
  const labels: string[] = [];

  const m = median(sorted.map((n) => n.durationSeconds));
  if (m < t.shortSeconds) labels.push('短い音が多い');
  else if (m >= t.longSeconds) labels.push('長い音が多い');

  const iois = sorted.slice(1).map((n, i) => n.startSeconds - sorted[i].startSeconds);
  const avg = iois.reduce((s, x) => s + x, 0) / iois.length;
  const sd = Math.sqrt(iois.reduce((s, x) => s + (x - avg) ** 2, 0) / iois.length);
  labels.push(avg > 0 && sd / avg <= t.steadyVariation ? '一定間隔に近い' : '不規則');
  return labels.join('・');
}
