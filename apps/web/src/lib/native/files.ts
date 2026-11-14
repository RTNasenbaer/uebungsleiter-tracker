// SPDX-License-Identifier: AGPL-3.0-or-later
/** Saves a generated file: browser download, or Android share sheet inside the app. */
import { isNative } from './platform';

function toBase64(bytes: Uint8Array): string {
  let s = '';
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) s += String.fromCharCode(...bytes.subarray(i, i + chunk));
  return btoa(s);
}

export async function saveFile(filename: string, data: Uint8Array | string, mime: string): Promise<void> {
  const bytes = typeof data === 'string' ? new TextEncoder().encode(data) : data;
  if (isNative()) {
    const [{ Filesystem, Directory }, { Share }] = await Promise.all([
      import('@capacitor/filesystem'),
      import('@capacitor/share'),
    ]);
    const res = await Filesystem.writeFile({
      path: filename,
      data: toBase64(bytes),
      directory: Directory.Cache,
    });
    await Share.share({ title: filename, files: [res.uri] });
    return;
  }
  const blob = new Blob([bytes as BlobPart], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 10_000);
}
