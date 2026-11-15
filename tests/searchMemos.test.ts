import { describe, it, expect } from 'vitest';
import { filterMemos } from '../src/utils/searchMemos';

const memo = (title: string, createdAt: string, tags: string[] = [], key: string | null = null) =>
  ({ title, createdAt, tags, analysis: { key } }) as never;

describe('filterMemos', () => {
  const list = [memo('サビ案', '2026-10-04T10:00:00Z', ['夜']), memo('Aメロ', '2026-10-03T10:00:00Z', [], 'C')];
  it('タイトル・タグ・Keyで絞る（大文字小文字を区別しない）', () => {
    expect(filterMemos(list, 'サビ', 'new').map((m: { title: string }) => m.title)).toEqual(['サビ案']);
    expect(filterMemos(list, '夜', 'new')).toHaveLength(1);
    expect(filterMemos(list, 'c', 'new')).toHaveLength(1);
  });
  it('空なら全件、古い順にも並べられる', () => {
    expect(filterMemos(list, ' ', 'old').map((m: { title: string }) => m.title)).toEqual(['Aメロ', 'サビ案']);
  });
});
