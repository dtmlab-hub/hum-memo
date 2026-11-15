/** iOS SafariはMP4(AAC)、Chrome/FirefoxはWebMが通ることが多い。固定せず順に試す */
export const MIME_CANDIDATES = ['audio/mp4', 'audio/webm;codecs=opus', 'audio/webm', 'audio/ogg;codecs=opus'];

export const MAX_RECORDING_SECONDS = 60;

export function pickMimeType(isSupported: (type: string) => boolean): string | undefined {
  return MIME_CANDIDATES.find((t) => {
    try {
      return isSupported(t);
    } catch {
      return false;
    }
  });
}

export type RecorderErrorCode = 'unsupported' | 'permission-denied' | 'no-mic' | 'unknown';

export class RecorderError extends Error {
  constructor(public code: RecorderErrorCode, message: string) {
    super(message);
  }
}

export type RecordingResult = { blob: Blob; mimeType: string; durationSeconds: number };

export class Recorder {
  private mediaRecorder: MediaRecorder | null = null;
  private stream: MediaStream | null = null;
  private chunks: Blob[] = [];
  private startedAt = 0;

  static isSupported(): boolean {
    return typeof window !== 'undefined' && !!navigator.mediaDevices?.getUserMedia && typeof MediaRecorder !== 'undefined';
  }

  async start(): Promise<void> {
    if (!Recorder.isSupported()) throw new RecorderError('unsupported', 'このブラウザは録音に対応していません。');
    try {
      // 鼻歌の音程を崩さないよう、通話向けの加工はOFF
      this.stream = await navigator.mediaDevices.getUserMedia({
        audio: { echoCancellation: false, noiseSuppression: false, autoGainControl: false },
      });
    } catch (e) {
      const name = (e as DOMException)?.name;
      if (name === 'NotAllowedError' || name === 'SecurityError') {
        throw new RecorderError('permission-denied', 'マイクへのアクセスが必要です。iPhoneの設定からマイクを許可してください。');
      }
      if (name === 'NotFoundError') throw new RecorderError('no-mic', 'マイクが見つかりません。');
      throw new RecorderError('unknown', String(e));
    }
    const mimeType = pickMimeType((t) => MediaRecorder.isTypeSupported(t));
    this.mediaRecorder = new MediaRecorder(this.stream, mimeType ? { mimeType } : undefined);
    this.chunks = [];
    this.mediaRecorder.ondataavailable = (ev) => {
      if (ev.data.size > 0) this.chunks.push(ev.data);
    };
    // 1秒ごとにチャンクを確定させ、途中で落ちても部分データが残るようにする
    this.mediaRecorder.start(1000);
    this.startedAt = performance.now();
  }

  stop(): Promise<RecordingResult> {
    const mr = this.mediaRecorder;
    if (!mr) return Promise.reject(new RecorderError('unknown', '録音していません。'));
    return new Promise((resolve) => {
      mr.onstop = () => {
        const mimeType = mr.mimeType || this.chunks[0]?.type || 'audio/mp4';
        const blob = new Blob(this.chunks, { type: mimeType });
        const durationSeconds = (performance.now() - this.startedAt) / 1000;
        this.stream?.getTracks().forEach((t) => t.stop());
        this.mediaRecorder = null;
        this.stream = null;
        resolve({ blob, mimeType, durationSeconds });
      };
      mr.stop();
    });
  }
}
