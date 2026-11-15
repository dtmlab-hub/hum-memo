export const BASIC_PITCH_SAMPLE_RATE = 22050;

let ctx: AudioContext | null = null;
export function getAudioContext(): AudioContext {
  if (!ctx) ctx = new AudioContext();
  return ctx;
}

export async function decodeBlob(blob: Blob): Promise<AudioBuffer> {
  const data = await blob.arrayBuffer();
  try {
    return await getAudioContext().decodeAudioData(data);
  } catch (e) {
    throw new Error(`音声のデコードに失敗しました（${blob.type || '形式不明'}）: ${String(e)}`);
  }
}

/** Basic Pitch入力用：モノラル・22050Hzへ変換 */
export async function toBasicPitchInput(buffer: AudioBuffer): Promise<Float32Array> {
  const length = Math.max(1, Math.ceil(buffer.duration * BASIC_PITCH_SAMPLE_RATE));
  const offline = new OfflineAudioContext(1, length, BASIC_PITCH_SAMPLE_RATE);
  const src = offline.createBufferSource();
  src.buffer = buffer;
  src.connect(offline.destination);
  src.start();
  const rendered = await offline.startRendering();
  return rendered.getChannelData(0).slice();
}
