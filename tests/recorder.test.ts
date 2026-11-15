import { describe, it, expect } from 'vitest';
import { pickMimeType, MIME_CANDIDATES } from '../src/audio/recorder';

describe('pickMimeType', () => {
  it('最初にサポートされている候補を返す', () => {
    expect(pickMimeType((t) => t === 'audio/webm;codecs=opus')).toBe('audio/webm;codecs=opus');
  });
  it('iOS Safari想定：audio/mp4を優先する', () => {
    expect(pickMimeType(() => true)).toBe(MIME_CANDIDATES[0]);
    expect(MIME_CANDIDATES[0]).toBe('audio/mp4');
  });
  it('どれも非対応ならundefined（ブラウザ既定に任せる）', () => {
    expect(pickMimeType(() => false)).toBeUndefined();
  });
});
