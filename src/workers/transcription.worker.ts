/// <reference lib="webworker" />
import { runBasicPitch } from '../analysis/runBasicPitch';
import type { NoteEvent } from '../types/memo';

export type WorkerRequest = { id: number; audio: Float32Array; modelUrl: string };
export type WorkerResponse =
  | { id: number; type: 'progress'; percent: number }
  | { id: number; type: 'done'; notes: NoteEvent[]; backend: string; ms: number }
  | { id: number; type: 'error'; message: string };

self.onmessage = async (ev: MessageEvent<WorkerRequest>) => {
  const { id, audio, modelUrl } = ev.data;
  const post = (m: WorkerResponse) => self.postMessage(m);
  const t0 = performance.now();
  try {
    const { notes, backend } = await runBasicPitch(audio, modelUrl, (p) => post({ id, type: 'progress', percent: p }), ['cpu']);
    post({ id, type: 'done', notes, backend, ms: performance.now() - t0 });
  } catch (e) {
    post({ id, type: 'error', message: e instanceof Error ? e.message : String(e) });
  }
};
