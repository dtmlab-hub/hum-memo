import { zipSingleFile } from '../utils/zip';

type DownloadsNs = { save(req: { filename: string; data: Blob | Uint8Array }): Promise<unknown> };
type ClaudeHost = { use(name: 'downloads'): Promise<DownloadsNs | null> };

export type ExportResult = 'shared' | 'downloaded' | 'saved-zip' | 'cancelled';

/**
 * iPhoneではOSの共有シート（AirDrop・ファイルに保存）。
 * claude.aiの埋め込み表示では.midを直接保存できないので、.midを入れたzipで保存する。
 */
export async function exportMidiFile(bytes: Uint8Array, fileName: string): Promise<ExportResult> {
  const host = (window as unknown as { claude?: ClaudeHost }).claude;
  if (host?.use) {
    const downloads = await host.use('downloads').catch(() => null);
    if (downloads) {
      try {
        await downloads.save({ filename: fileName.replace(/\.mid$/, '.zip'), data: new Blob([zipSingleFile(fileName, bytes)]) });
        return 'saved-zip';
      } catch (e) {
        if ((e as { code?: string })?.code === 'declined') return 'cancelled';
        throw new Error((e as { message?: string })?.message ?? String(e));
      }
    }
  }

  const blob = new Blob([bytes], { type: 'audio/midi' });
  const file = new File([blob], fileName, { type: 'audio/midi' });
  if (navigator.canShare?.({ files: [file] })) {
    try {
      await navigator.share({ files: [file], title: fileName });
      return 'shared';
    } catch (e) {
      if ((e as DOMException)?.name === 'AbortError') return 'cancelled';
      // 共有に失敗したらダウンロードへ
    }
  }
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 10_000);
  return 'downloaded';
}
