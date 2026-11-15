import type { Memo } from '../types/memo';

export type SortOrder = 'new' | 'old';

/** 検索対象はタイトル・タグ・Keyだけ（仕様7） */
export function filterMemos<T extends Pick<Memo, 'title' | 'createdAt' | 'tags'> & { analysis: Pick<Memo['analysis'], 'key'> }>(
  memos: T[], query: string, order: SortOrder,
): T[] {
  const q = query.trim().toLowerCase();
  const hit = q
    ? memos.filter((m) => [m.title, ...m.tags, m.analysis.key ?? ''].some((s) => s.toLowerCase().includes(q)))
    : memos.slice();
  return hit.sort((a, b) => (order === 'new' ? b.createdAt.localeCompare(a.createdAt) : a.createdAt.localeCompare(b.createdAt)));
}
