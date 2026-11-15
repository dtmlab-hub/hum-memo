import * as Tone from 'tone';
import type { NoteEvent } from '../types/memo';

/**
 * MIDI再生エンジン（独立コンポーネント）。
 * Phase 1はサンプル不要のシンセでピアノ風に鳴らす（外部サンプル取得なし＝オフラインで動く）。
 */
export class MidiPlayer {
  private synth: Tone.PolySynth | null = null;
  private endTimer: number | null = null;

  private getSynth(): Tone.PolySynth {
    if (!this.synth) {
      this.synth = new Tone.PolySynth(Tone.Synth, {
        oscillator: { type: 'triangle' },
        envelope: { attack: 0.005, decay: 0.4, sustain: 0.25, release: 0.6 },
      }).toDestination();
      this.synth.volume.value = -6;
    }
    return this.synth;
  }

  async play(notes: NoteEvent[], onEnded?: () => void): Promise<void> {
    this.stop();
    await Tone.start();
    const synth = this.getSynth();
    const t0 = Tone.now() + 0.05;
    let end = 0;
    for (const n of notes) {
      const freq = Tone.Frequency(n.pitchMidi, 'midi').toFrequency();
      synth.triggerAttackRelease(freq, n.durationSeconds, t0 + n.startSeconds, Math.max(0.2, n.velocity));
      end = Math.max(end, n.startSeconds + n.durationSeconds);
    }
    this.endTimer = window.setTimeout(() => {
      this.endTimer = null;
      onEnded?.();
    }, (end + 0.7) * 1000);
  }

  stop(): void {
    if (this.endTimer !== null) {
      clearTimeout(this.endTimer);
      this.endTimer = null;
    }
    this.synth?.releaseAll();
    // スケジュール済みの未来のノートも止めるため作り直す
    this.synth?.dispose();
    this.synth = null;
  }
}
