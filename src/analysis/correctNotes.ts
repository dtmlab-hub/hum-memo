import type { NoteEvent } from '../types/memo';

/** 補正の基準値。実際の鼻歌で検証しながら調整する（各処理に数値を直接書かない） */
export type CorrectionOptions = {
  /** これより短いノートは消す */
  minNoteDurationMs: number;
  /** 同じ音の間がこれ以下なら、つなぐ候補 */
  mergeGapMs: number;
  /** どちらかがこれより短い時だけつなぐ（長い音どうしは同音反復として残す） */
  fragmentMaxMs: number;
  /** 自分の長さのこの割合以上が、より強い音と重なっていれば誤検出（倍音など）とみなす */
  ghostOverlapRatio: number;
};

export const DEFAULT_CORRECTION: CorrectionOptions = {
  minNoteDurationMs: 60,
  mergeGapMs: 50,
  fragmentMaxMs: 150,
  ghostOverlapRatio: 0.5,
};

const end = (n: NoteEvent) => n.startSeconds + n.durationSeconds;
const overlap = (a: NoteEvent, b: NoteEvent) => Math.max(0, Math.min(end(a), end(b)) - Math.max(a.startSeconds, b.startSeconds));

/**
 * Raw → Corrected（基本補正のみ。スケールスナップはしない）。
 * 鼻歌は単旋律なので、重なりは1本の旋律に整理する。Rawは変更しない。
 */
export function correctNotes(raw: NoteEvent[], opts: CorrectionOptions = DEFAULT_CORRECTION): NoteEvent[] {
  let notes: NoteEvent[] = raw
    .map(({ pitchBends: _pb, ...rest }) => ({ ...rest }))
    .sort((a, b) => a.startSeconds - b.startSeconds || b.velocity - a.velocity);

  // ① 強い音に重なった弱い音（倍音の誤検出）を消す
  notes = notes.filter((a) => !notes.some((b) => b !== a && b.velocity > a.velocity && overlap(a, b) >= opts.ghostOverlapRatio * a.durationSeconds));

  // ② 極端に短い音を消す
  notes = notes.filter((n) => n.durationSeconds * 1000 >= opts.minNoteDurationMs);

  // ③ 細かく分かれた同じ音をつなぐ
  const merged: NoteEvent[] = [];
  let lastPiece = 0; // つないだ音の最後の断片の長さ（秒）
  for (const n of notes) {
    const prev = merged[merged.length - 1];
    const isFragment = prev && Math.min(lastPiece, n.durationSeconds) * 1000 < opts.fragmentMaxMs;
    if (prev && isFragment && prev.pitchMidi === n.pitchMidi && n.startSeconds - end(prev) <= opts.mergeGapMs / 1000) {
      prev.durationSeconds = Math.max(end(prev), end(n)) - prev.startSeconds;
      prev.velocity = Math.max(prev.velocity, n.velocity);
    } else {
      merged.push({ ...n });
    }
    lastPiece = n.durationSeconds;
  }

  // ④ 重なりは次の音の頭で切る
  for (let i = 0; i < merged.length - 1; i++) {
    const next = merged[i + 1];
    if (end(merged[i]) > next.startSeconds) merged[i].durationSeconds = next.startSeconds - merged[i].startSeconds;
  }
  return merged.filter((n) => n.durationSeconds > 0);
}
