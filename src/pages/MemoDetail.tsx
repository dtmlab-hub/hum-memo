import { useEffect, useRef, useState } from 'react';
import { decodeBlob } from '../audio/decode';
import { AudioPlayer } from '../audio/playback';
import { generateMidi, midiFileName } from '../midi/generateMidi';
import { exportMidiFile } from '../midi/exportMidi';
import { MidiPlayer } from '../midi/playMidi';
import type { MemoRepository } from '../storage/memoRepository';
import type { Memo } from '../types/memo';
import { noteName, rangeLabel } from '../utils/noteName';
import type { DebugInfo } from '../App';

const audioPlayer = new AudioPlayer();
const midiPlayer = new MidiPlayer();

type Version = 'corrected' | 'raw';
type Playing = 'none' | 'audio' | 'midi';

type Props = {
  memo: Memo;
  repo: MemoRepository;
  debug?: DebugInfo;
  onBack: () => void;
  onChanged: () => Promise<void>;
  onDeleted: () => Promise<void>;
  onRetry: () => void;
};

export function MemoDetail({ memo, repo, debug, onBack, onChanged, onDeleted, onRetry }: Props) {
  const [title, setTitle] = useState(memo.title);
  const [note, setNote] = useState(memo.userNote);
  const [version, setVersion] = useState<Version>('corrected');
  const [playing, setPlaying] = useState<Playing>('none');
  const [error, setError] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const bufferRef = useRef<AudioBuffer | null>(null);

  useEffect(() => () => stop(), []);

  const notes = memo.midi[version];
  const failed = memo.transcription.status === 'failed';

  function stop() {
    audioPlayer.stop();
    midiPlayer.stop();
    setPlaying('none');
  }

  async function playAudio() {
    if (playing === 'audio') return stop();
    stop();
    try {
      bufferRef.current ??= await decodeBlob(memo.audio.blob);
      setPlaying('audio');
      await audioPlayer.play(bufferRef.current, () => setPlaying('none'));
    } catch (e) {
      setError(String(e));
    }
  }

  async function playMidi() {
    if (playing === 'midi') return stop();
    stop();
    setPlaying('midi');
    await midiPlayer.play(notes, () => setPlaying('none'));
  }

  async function save(patch: Partial<Pick<Memo, 'title' | 'userNote'>>) {
    try {
      await repo.updateText(memo.id, patch);
      await onChanged();
    } catch (e) {
      setError(`保存に失敗しました: ${String(e)}`);
    }
  }

  async function exportMidi() {
    try {
      const suffix = version === 'raw' ? '_raw' : '';
      const r = await exportMidiFile(generateMidi(notes), midiFileName(memo.title + suffix));
      if (r === 'saved-zip') setToast('.midを入れたzipで保存しました。開くと.midが出てきます。');
    } catch (e) {
      setError(`MIDIの書き出しに失敗しました: ${String(e)}`);
    }
  }

  return (
    <main className="page">
      <button className="back" onClick={() => { stop(); onBack(); }}>← 一覧</button>

      <input
        className="title-input"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        onBlur={() => title.trim() && title !== memo.title && void save({ title: title.trim() })}
        aria-label="タイトル"
      />
      <p className="created">{new Date(memo.createdAt).toLocaleString('ja-JP')}</p>

      <section className="result">
        <div className="row">
          <button onClick={() => void playAudio()}>{playing === 'audio' ? '■ 停止' : '▶ 原音再生'}</button>
          <button onClick={() => void playMidi()} disabled={!notes.length}>{playing === 'midi' ? '■ 停止' : '▶ MIDI再生'}</button>
        </div>

        {failed ? (
          <>
            <p className="error">MIDI解析に失敗しました。録音音声は保存されています。</p>
            <button className="wide" onClick={onRetry}>もう一度解析</button>
          </>
        ) : (
          <>
            <div className="segmented" role="radiogroup" aria-label="MIDIの種類">
              <button className={version === 'corrected' ? 'on' : ''} onClick={() => { stop(); setVersion('corrected'); }}>
                補正版（{memo.midi.corrected.length}音）
              </button>
              <button className={version === 'raw' ? 'on' : ''} onClick={() => { stop(); setVersion('raw'); }}>
                Raw（{memo.midi.raw.length}音）
              </button>
            </div>
            <dl className="facts">
              <div><dt>Key</dt><dd>{memo.analysis.key ?? '不明'}</dd></div>
              <div><dt>音域</dt><dd>{rangeLabel(memo.analysis.rangeLow, memo.analysis.rangeHigh).replace('音域 ', '')}</dd></div>
              <div><dt>ノート数</dt><dd>{memo.analysis.noteCount}</dd></div>
              <div><dt>長さ</dt><dd>{memo.audio.durationSeconds.toFixed(1)}秒</dd></div>
              <div className="wide-fact"><dt>音の動き</dt><dd>{memo.analysis.contour ?? '判定できません'}</dd></div>
              <div className="wide-fact"><dt>リズム</dt><dd>{memo.analysis.rhythmNote ?? '判定できません'}</dd></div>
            </dl>
            <button className="wide primary" onClick={() => void exportMidi()} disabled={!notes.length}>
              MIDI書き出し（{version === 'raw' ? 'Raw' : '補正版'}）
            </button>
          </>
        )}
      </section>

      {toast && <p className="notice">{toast}</p>}
      {error && <p className="error">{error}</p>}

      <section className="note">
        <label htmlFor="userNote">メモ</label>
        <textarea
          id="userNote"
          rows={3}
          placeholder="サビっぽい／ベースはあとで など"
          value={note}
          onChange={(e) => setNote(e.target.value)}
          onBlur={() => note !== memo.userNote && void save({ userNote: note })}
        />
      </section>

      <details className="debug">
        <summary>解析結果（デバッグ）</summary>
        <p>
          形式 {memo.audio.mimeType}
          {debug && <> ／ 推論 {Math.round(debug.ms)}ms（{debug.backend}）／ デコード {Math.round(debug.decodeMs)}ms</>}
          {!debug && memo.transcription.processingMs != null && <> ／ 推論 {Math.round(memo.transcription.processingMs)}ms</>}
        </p>
        {memo.transcription.error && <p>エラー：{memo.transcription.error}</p>}
        <table>
          <thead><tr><th>音</th><th>開始</th><th>長さ</th><th>強さ</th><th>ベンド</th></tr></thead>
          <tbody>
            {notes.map((n, i) => (
              <tr key={i}>
                <td>{noteName(n.pitchMidi)}</td>
                <td>{n.startSeconds.toFixed(2)}</td>
                <td>{n.durationSeconds.toFixed(2)}</td>
                <td>{n.velocity.toFixed(2)}</td>
                <td>{n.pitchBends?.length ?? 0}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </details>

      {confirmDelete ? (
        <div className="confirm">
          <p>このメモを削除しますか？</p>
          <div className="row">
            <button onClick={() => setConfirmDelete(false)}>キャンセル</button>
            <button className="danger" onClick={async () => { stop(); await repo.delete(memo.id); await onDeleted(); }}>削除</button>
          </div>
        </div>
      ) : (
        <button className="delete" onClick={() => setConfirmDelete(true)}>削除</button>
      )}
    </main>
  );
}
