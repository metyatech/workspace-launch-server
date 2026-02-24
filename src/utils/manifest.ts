import fs from 'fs/promises';
import fsSync from 'fs';
import path from 'path';
import { TEMPLATE_ROOT } from '../config.js';
import { sanitize, userRoot, type UserMeta } from './storage.js';

export type ManifestEntry =
  | { path: string; type: 'directory' }
  | { path: string; type: 'file'; contentBase64: string };

export async function encodeDirToManifest(dir: string, base = ''): Promise<ManifestEntry[]> {
  let out: ManifestEntry[] = [];
  const entries = await fs.readdir(dir, { withFileTypes: true });
  for (const entry of entries) {
    const rel = path.posix.join(base, entry.name);
    const abs = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      out.push({ path: `${rel}/`, type: 'directory' });
      out = out.concat(await encodeDirToManifest(abs, rel));
    } else if (entry.isFile()) {
      const buf = await fs.readFile(abs);
      out.push({ path: rel, type: 'file', contentBase64: buf.toString('base64') });
    }
  }
  return out;
}

async function directoryHasContents(candidate: string): Promise<boolean> {
  if (!fsSync.existsSync(candidate)) {
    return false;
  }
  const entries = await fs.readdir(candidate, { withFileTypes: true });
  return entries.length > 0;
}

export async function loadManifestForWorkspaceId(meta: UserMeta = {}): Promise<ManifestEntry[]> {
  const workspaceId = meta.workspaceId ?? 'unknown';
  const storageDir = userRoot({
    ownerId: meta.ownerId ?? 'unknown',
    workspaceId,
  });

  if (await directoryHasContents(storageDir)) {
    const manifest = await encodeDirToManifest(storageDir);
    manifest.unshift({ path: '', type: 'directory' });
    return manifest;
  }

  const templateDir = path.join(TEMPLATE_ROOT, sanitize(workspaceId));
  if (fsSync.existsSync(templateDir)) {
    const manifest = await encodeDirToManifest(templateDir);
    manifest.unshift({ path: '', type: 'directory' });
    return manifest;
  }

  return [
    { path: '', type: 'directory' },
    { path: 'index.html', type: 'file', contentBase64: '' },
    { path: 'index.js', type: 'file', contentBase64: '' },
    { path: 'index.css', type: 'file', contentBase64: '' },
  ];
}
