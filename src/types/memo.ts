export type NoteEvent = {
  pitchMidi: number;
  startSeconds: number;
  durationSeconds: number;
  /** 0〜1 */
  velocity: number;
  pitchBends?: number[];
};

export type TranscriptionStatus = 'pending' | 'ok' | 'failed';

export type Memo = {
  id: string;
  createdAt: string;
  title: string;
  tags: string[];
  audio: {
    blob: Blob;
    mimeType: string;
    durationSeconds: number;
  };
  midi: {
    /** Basic Pitchの推定結果。補正で上書きしない */
    raw: NoteEvent[];
    /** Phase 2で実装。Phase 1では空 */
    corrected: NoteEvent[];
  };
  transcription: {
    status: TranscriptionStatus;
    error?: string;
    processingMs?: number;
  };
  analysis: {
    key: string | null;
    rangeLow: number | null;
    rangeHigh: number | null;
    noteCount: number;
    contour: string | null;
    rhythmNote: string | null;
  };
  userNote: string;
};
