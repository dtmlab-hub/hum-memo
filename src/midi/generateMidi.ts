import { Midi } from '@tonejs/midi';
import type { NoteEvent } from '../types/memo';

/** テンポ推定はしない。秒の位置を保ったまま仮テンポで書き出す（Logic側で自由に合わせる） */
export const DEFAULT_EXPORT_BPM = 120;

export function generateMidi(notes: NoteEvent[], bpm = DEFAULT_EXPORT_BPM): Uint8Array {
  const midi = new Midi();
  midi.header.setTempo(bpm);
  midi.header.name = 'Hum Memo';
  const track = midi.addTrack();
  track.name = 'Melody';
  track.instrument.number = 0; // Acoustic Grand Piano
  for (const n of notes) {
    track.addNote({ midi: n.pitchMidi, time: n.startSeconds, duration: n.durationSeconds, velocity: n.velocity });
  }
  return midi.toArray();
}

export function midiFileName(title: string): string {
  return `${title.replace(/[\\/:*?"<>|]/g, '-').replace(/\s+/g, '_')}.mid`;
}
