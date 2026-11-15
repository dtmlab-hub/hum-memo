import { describe, it, expect } from 'vitest';
import { crc32, zipSingleFile } from '../src/utils/zip';

describe('zip（.midを1つ入れるだけの無圧縮zip）', () => {
  it('CRC32が規格どおり', () => {
    expect(crc32(new TextEncoder().encode('123456789'))).toBe(0xcbf43926);
  });
  it('ファイル名と中身がそのまま入り、終端レコードで閉じる', () => {
    const data = new Uint8Array([0x4d, 0x54, 0x68, 0x64]);
    const z = zipSingleFile('サビ案.mid', data);
    const dv = new DataView(z.buffer);
    expect(dv.getUint32(0, true)).toBe(0x04034b50);
    expect(dv.getUint16(6, true) & 0x0800).toBe(0x0800); // UTF-8ファイル名
    expect(dv.getUint32(18, true)).toBe(4);
    const nameLen = dv.getUint16(26, true);
    expect(new TextDecoder().decode(z.slice(30, 30 + nameLen))).toBe('サビ案.mid');
    expect([...z.slice(30 + nameLen, 34 + nameLen)]).toEqual([...data]);
    expect(dv.getUint32(z.length - 22, true)).toBe(0x06054b50);
  });
});
