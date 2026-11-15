import { defineConfig, type Plugin } from 'vite';
import react from '@vitejs/plugin-react';
import basicSsl from '@vitejs/plugin-basic-ssl';
import { readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { join, relative } from 'node:path';

function walk(dir: string): string[] {
  return readdirSync(dir).flatMap((f) => {
    const p = join(dir, f);
    return statSync(p).isDirectory() ? walk(p) : [p];
  });
}

/** ビルド後に、端末へ先に保存するファイル一覧（precache.json）を作り、sw.jsのバージョンを更新する */
function precache(): Plugin {
  let outDir = 'dist';
  return {
    name: 'hum-memo-precache',
    apply: 'build',
    configResolved(c) {
      outDir = c.build.outDir;
    },
    closeBundle() {
      const files = walk(outDir).map((p) => relative(outDir, p)).filter((f) => f !== 'sw.js' && f !== 'precache.json');
      const hash = createHash('sha1');
      for (const f of files.sort()) hash.update(f).update(readFileSync(join(outDir, f)));
      const version = hash.digest('hex').slice(0, 10);
      const urls = ['./', ...files.map((f) => `./${f}`)];
      writeFileSync(join(outDir, 'precache.json'), JSON.stringify(urls));
      const sw = readFileSync(join(outDir, 'sw.js'), 'utf8').replace('__SW_VERSION__', version);
      writeFileSync(join(outDir, 'sw.js'), sw);
    },
  };
}

// iPhone Safari は HTTPS でないとマイクが使えない。HTTPS=1 で自己署名証明書を付けて起動する
export default defineConfig({
  base: './',
  plugins: [react(), precache(), ...(process.env.HTTPS ? [basicSsl()] : [])],
  worker: { format: 'es' },
  test: { environment: 'node' },
});
