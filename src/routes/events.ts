import express from 'express';
import fs from 'fs/promises';
import fsSync from 'fs';
import path from 'path';
import { ensureDir, safeJoin, userRoot, type UserMeta } from '../utils/storage.js';

export interface EventRecord<T = unknown> {
  type: string;
  body: T;
  time: number;
}

type FileSnapshotBody = UserMeta & {
  path: string;
  content: string;
};

type CreateBody = UserMeta & {
  path: string;
  isDirectory?: boolean;
};

type DeleteBody = UserMeta & {
  path: string;
};

type RenameBody = UserMeta & {
  oldPath: string;
  newPath: string;
};

type HeartbeatBody = UserMeta & Record<string, unknown>;

type EventStore = Array<EventRecord>;

const isString = (value: unknown): value is string => typeof value === 'string';

function toMeta(body: UserMeta | undefined): Required<UserMeta> {
  return {
    ownerId: isString(body?.ownerId) && body.ownerId.length > 0 ? body.ownerId : 'unknown',
    workspaceId:
      isString(body?.workspaceId) && body.workspaceId.length > 0 ? body.workspaceId : 'default',
  };
}

async function writeSnapshot(meta: Required<UserMeta>, body: FileSnapshotBody): Promise<void> {
  const root = userRoot(meta);
  await ensureDir(root);
  const abs = safeJoin(root, body.path);
  await ensureDir(path.dirname(abs));
  const buf = Buffer.from(body.content, 'base64');
  await fs.writeFile(abs, buf);
}

async function createEntry(meta: Required<UserMeta>, body: CreateBody): Promise<void> {
  const root = userRoot(meta);
  const abs = safeJoin(root, body.path);
  if (body.isDirectory) {
    await ensureDir(abs);
    return;
  }
  await ensureDir(path.dirname(abs));
  if (!fsSync.existsSync(abs)) {
    await fs.writeFile(abs, Buffer.alloc(0));
  }
}

async function deleteEntry(meta: Required<UserMeta>, body: DeleteBody): Promise<void> {
  const root = userRoot(meta);
  const abs = safeJoin(root, body.path);
  await fs.rm(abs, { recursive: true, force: true });
}

async function renameEntry(meta: Required<UserMeta>, body: RenameBody): Promise<void> {
  const root = userRoot(meta);
  const oldAbs = safeJoin(root, body.oldPath);
  const newAbs = safeJoin(root, body.newPath);
  await ensureDir(path.dirname(newAbs));
  await fs.rename(oldAbs, newAbs);
}

export function createEventRouter(eventsStore: EventStore): express.Router {
  const router = express.Router();

  const recordEvent = <T>(type: string, body: T): void => {
    eventsStore.push({ type, body, time: Date.now() });
  };

  router.post('/fileSnapshot', async (req, res) => {
    const body = req.body as Partial<FileSnapshotBody>;
    try {
      if (!body || !isString(body.path) || !isString(body.content)) {
        return res.status(400).json({ ok: false, error: 'invalid body' });
      }
      const meta = toMeta(body);
      await writeSnapshot(meta, body as FileSnapshotBody);
      recordEvent('fileSnapshot', body);
      return res.json({ ok: true });
    } catch (error) {
      console.error('fileSnapshot error', error);
      return res.status(400).json({ ok: false, error: String(error) });
    }
  });

  router.post('/create', async (req, res) => {
    const body = req.body as Partial<CreateBody>;
    try {
      if (!body || !isString(body.path)) {
        return res.status(400).json({ ok: false, error: 'invalid body' });
      }
      const meta = toMeta(body);
      await createEntry(meta, body as CreateBody);
      recordEvent('create', body);
      return res.json({ ok: true });
    } catch (error) {
      console.error('create error', error);
      return res.status(400).json({ ok: false, error: String(error) });
    }
  });

  router.post('/delete', async (req, res) => {
    const body = req.body as Partial<DeleteBody>;
    try {
      if (!body || !isString(body.path)) {
        return res.status(400).json({ ok: false, error: 'invalid body' });
      }
      const meta = toMeta(body);
      await deleteEntry(meta, body as DeleteBody);
      recordEvent('delete', body);
      return res.json({ ok: true });
    } catch (error) {
      console.error('delete error', error);
      return res.status(400).json({ ok: false, error: String(error) });
    }
  });

  router.post('/rename', async (req, res) => {
    const body = req.body as Partial<RenameBody>;
    try {
      if (!body || !isString(body.oldPath) || !isString(body.newPath)) {
        return res.status(400).json({ ok: false, error: 'invalid body' });
      }
      const meta = toMeta(body);
      await renameEntry(meta, body as RenameBody);
      recordEvent('rename', body);
      return res.json({ ok: true });
    } catch (error) {
      console.error('rename error', error);
      return res.status(400).json({ ok: false, error: String(error) });
    }
  });

  router.post('/heartbeat', async (req, res) => {
    const body = req.body as HeartbeatBody;
    recordEvent('heartbeat', body);
    return res.json({ ok: true });
  });

  return router;
}
