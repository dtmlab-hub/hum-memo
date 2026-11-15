import { getAudioContext } from './decode';

export class AudioPlayer {
  private source: AudioBufferSourceNode | null = null;

  async play(buffer: AudioBuffer, onEnded?: () => void): Promise<void> {
    this.stop();
    const ctx = getAudioContext();
    if (ctx.state === 'suspended') await ctx.resume();
    const src = ctx.createBufferSource();
    src.buffer = buffer;
    src.connect(ctx.destination);
    src.onended = () => {
      if (this.source === src) this.source = null;
      onEnded?.();
    };
    src.start();
    this.source = src;
  }

  stop(): void {
    try {
      this.source?.stop();
    } catch {
      /* 既に停止済み */
    }
    this.source = null;
  }
}
