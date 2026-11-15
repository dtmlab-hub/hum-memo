let table: Uint32Array | null = null;

export function crc32(data: Uint8Array): number {
  if (!table) {
    table = new Uint32Array(256);
    for (let i = 0; i < 256; i++) {
      let c = i;
      for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
      table[i] = c >>> 0;
    }
  }
  let crc = 0xffffffff;
  for (const b of data) crc = table[(crc ^ b) & 0xff] ^ (crc >>> 8);
  return (crc ^ 0xffffffff) >>> 0;
}

/** 1ファイルだけ入れた無圧縮zip（保存できる形式が限られる表示環境で.midを渡すため） */
export function zipSingleFile(name: string, data: Uint8Array): Uint8Array {
  const nameBytes = new TextEncoder().encode(name);
  const crc = crc32(data);
  const local = 30 + nameBytes.length;
  const central = 46 + nameBytes.length;
  const out = new Uint8Array(local + data.length + central + 22);
  const dv = new DataView(out.buffer);
  const FLAG_UTF8 = 0x0800;

  dv.setUint32(0, 0x04034b50, true);
  dv.setUint16(4, 20, true);
  dv.setUint16(6, FLAG_UTF8, true);
  dv.setUint32(14, crc, true);
  dv.setUint32(18, data.length, true);
  dv.setUint32(22, data.length, true);
  dv.setUint16(26, nameBytes.length, true);
  out.set(nameBytes, 30);
  out.set(data, local);

  const c = local + data.length;
  dv.setUint32(c, 0x02014b50, true);
  dv.setUint16(c + 4, 20, true);
  dv.setUint16(c + 6, 20, true);
  dv.setUint16(c + 8, FLAG_UTF8, true);
  dv.setUint32(c + 16, crc, true);
  dv.setUint32(c + 20, data.length, true);
  dv.setUint32(c + 24, data.length, true);
  dv.setUint16(c + 28, nameBytes.length, true);
  out.set(nameBytes, c + 46);

  const e = c + central;
  dv.setUint32(e, 0x06054b50, true);
  dv.setUint16(e + 8, 1, true);
  dv.setUint16(e + 10, 1, true);
  dv.setUint32(e + 12, central, true);
  dv.setUint32(e + 16, c, true);
  return out;
}
