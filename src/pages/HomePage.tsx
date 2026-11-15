import { useRef, useState } from 'react';
import type { Memo } from '../types/memo';
import { filterMemos, type SortOrder } from '../utils/searchMemos';
import { rangeLabel } from '../utils/noteName';

type Props = {
  memos: Memo[];
  persistent: boolean;
  canRecord: boolean;
  error: string | null;
  onRecord: () => void;
  onImport: (file: File) => void;
  onOpen: (id: string) => void;
};

export function HomePage({ memos, persistent, canRecord, error, onRecord, onImport, onOpen }: Props) {
  const [query, setQuery] = useState('');
  const [order, setOrder] = useState<SortOrder>('new');
  const fileRef = useRef<HTMLInputElement>(null);
  const shown = filterMemos(memos, query, order);

  return (
    <main className="page">
      <h1 className="app-title">鼻歌メモ</h1>

      <section className="rec-area home">
        {canRecord ? (
          <>
            <button className="big-button rec" onClick={onRecord}>録音</button>
            <p className="hint">タップして録音</p>
          </>
        ) : (
          <p className="hint">この表示ではマイクが使えません。<br />録音ファイルを読み込んで試せます。</p>
        )}
        <button className="link-button" onClick={() => fileRef.current?.click()}>
          録音ファイルを読み込む（ボイスメモなど）
        </button>
        <input
          ref={fileRef}
          type="file"
          accept="audio/*"
          hidden
          onChange={(e) => {
            const f = e.target.files?.[0];
            e.target.value = '';
            if (f) onImport(f);
          }}
        />
      </section>

      {error && <p className="error">{error}</p>}
      {!persistent && <p className="notice">この表示では端末に保存されません（閉じると消えます）。</p>}

      <section className="list">
        <div className="list-head">
          <h2>最近のメモ</h2>
          <select value={order} onChange={(e) => setOrder(e.target.value as SortOrder)} aria-label="並び順">
            <option value="new">新しい順</option>
            <option value="old">古い順</option>
          </select>
        </div>
        {memos.length > 0 && (
          <input
            className="search"
            type="search"
            placeholder="タイトル・タグ・Keyで検索"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        )}
        {memos.length === 0 ? (
          <p className="empty">まだメモはありません。思いついたら録音ボタンを押してください。</p>
        ) : shown.length === 0 ? (
          <p className="empty">見つかりませんでした。</p>
        ) : (
          <ul>
            {shown.map((m) => (
              <li key={m.id}>
                <button onClick={() => onOpen(m.id)}>
                  <span className="date">{shortDate(m.createdAt)}</span>
                  <span className="title">{m.title}</span>
                  <span className="sub">
                    {m.transcription.status === 'failed'
                      ? '解析失敗（音声は保存済み）'
                      : m.transcription.status === 'pending'
                        ? '未解析'
                        : `Key ${m.analysis.key ?? '不明'} ／ ${rangeLabel(m.analysis.rangeLow, m.analysis.rangeHigh)}`}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>
    </main>
  );
}

function shortDate(iso: string): string {
  const d = new Date(iso);
  return `${String(d.getMonth() + 1).padStart(2, '0')}/${String(d.getDate()).padStart(2, '0')}`;
}
