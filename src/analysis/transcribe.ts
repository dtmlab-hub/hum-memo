import type { NoteEvent } from '../types/memo';
import type { WorkerRequest, WorkerResponse } from '../workers/transcription.worker';

/** モデルはpublic/model/に同梱（外部へ音声もモデル要求も出さない） */
const MODEL_URL = new URL(`${import.meta.env.BASE_URL}model/model.json`, location.href).href;

let worker: Worker | null = null;
let workerBroken = false;
let seq = 0;

export type TranscribeResult = { notes: NoteEvent[]; backend: string; ms: number };

/** Workerで解析。Workerが作れない環境（埋め込み表示など）では画面側で解析する */
export async function transcribe(audio22k: Float32Array, onProgress?: (percent: number) => void): Promise<TranscribeResult> {
  if (!workerBroken) {
    try {
      return await transcribeInWorker(audio22k, onProgress);
    } catch (e) {
      if (!(e instanceof WorkerStartError)) throw e;
      workerBroken = true;
    }
  }
  const t0 = performance.now();
  const { runBasicPitch } = await import('./runBasicPitch');
  const { notes, backend } = await runBasicPitch(audio22k, MODEL_URL, onProgress);
  return { notes, backend: `${backend}・画面側`, ms: performance.now() - t0 };
}

class WorkerStartError extends Error {}

function transcribeInWorker(audio22k: Float32Array, onProgress?: (percent: number) => void): Promise<TranscribeResult> {
  try {
    worker ??= new Worker(new URL('../workers/transcription.worker.ts', import.meta.url), { type: 'module' });
  } catch (e) {
    return Promise.reject(new WorkerStartError(String(e)));
  }
  const w = worker;
  const id = ++seq;
  return new Promise((resolve, reject) => {
    let started = false;
    const cleanup = () => {
      w.removeEventListener('message', onMessage);
      w.removeEventListener('error', onError);
    };
    const onMessage = (ev: MessageEvent<WorkerResponse>) => {
      const m = ev.data;
      if (m.id !== id) return;
      started = true;
      if (m.type === 'progress') return onProgress?.(m.percent);
      cleanup();
      if (m.type === 'done') resolve({ notes: m.notes, backend: m.backend, ms: m.ms });
      else reject(new Error(m.message));
    };
    const onError = (ev: ErrorEvent) => {
      cleanup();
      worker?.terminate();
      worker = null;
      const msg = `解析ワーカーの起動に失敗しました: ${ev.message}`;
      reject(started ? new Error(msg) : new WorkerStartError(msg));
    };
    w.addEventListener('message', onMessage);
    w.addEventListener('error', onError);
    const req: WorkerRequest = { id, audio: audio22k, modelUrl: MODEL_URL };
    w.postMessage(req);
  });
}
