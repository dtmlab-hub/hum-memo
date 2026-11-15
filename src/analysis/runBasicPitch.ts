import * as tf from '@tensorflow/tfjs';
import { BasicPitch, addPitchBendsToNoteEvents, noteFramesToTime, outputToNotesPoly } from '@spotify/basic-pitch';
import { BASIC_PITCH_PARAMS, toNoteEvents } from './basicPitch';
import type { NoteEvent } from '../types/memo';

let basicPitch: BasicPitch | null = null;
let backendReady: Promise<string> | null = null;

/** Worker内ではWebGLを使わない（TensorFlow.jsのWebGL版が window を参照して落ちるため） */
export type BackendPreference = ['webgl', 'cpu'] | ['cpu'];

async function initBackend(prefer: BackendPreference): Promise<string> {
  for (const b of prefer) {
    try {
      if (await tf.setBackend(b)) {
        await tf.ready();
        return b;
      }
    } catch {
      /* 次の候補へ */
    }
  }
  return tf.getBackend();
}

/** Basic Pitch本体。Workerからも画面側（Workerが使えない時）からも呼ぶ */
export async function runBasicPitch(
  audio: Float32Array, modelUrl: string, onProgress?: (p: number) => void, prefer: BackendPreference = ['webgl', 'cpu'],
): Promise<{ notes: NoteEvent[]; backend: string }> {
  backendReady ??= initBackend(prefer);
  const backend = await backendReady;
  basicPitch ??= new BasicPitch(modelUrl);
  const frames: number[][] = [];
  const onsets: number[][] = [];
  const contours: number[][] = [];
  await basicPitch.evaluateModel(
    audio,
    (f, o, c) => {
      frames.push(...f);
      onsets.push(...o);
      contours.push(...c);
    },
    (p) => onProgress?.(p),
  );
  const p = BASIC_PITCH_PARAMS;
  const raw = outputToNotesPoly(
    frames, onsets, p.onsetThreshold, p.frameThreshold, p.minNoteLengthFrames,
    p.inferOnsets, p.maxFreqHz, p.minFreqHz, p.melodiaTrick,
  );
  return { notes: toNoteEvents(noteFramesToTime(addPitchBendsToNoteEvents(contours, raw))), backend };
}
