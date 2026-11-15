const NAMES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
/** MIDI 60 = C4（国際式）。Logic Proの画面では同じ音が C3 と表示される */
export function noteName(midi: number): string {
  return `${NAMES[((midi % 12) + 12) % 12]}${Math.floor(midi / 12) - 1}`;
}

export function rangeLabel(low: number | null, high: number | null): string {
  return low === null || high === null ? '音域 —' : `音域 ${noteName(low)}〜${noteName(high)}`;
}
