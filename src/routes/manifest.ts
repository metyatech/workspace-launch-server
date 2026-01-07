import express from 'express';
import { loadManifestForWorkspaceId } from '../utils/manifest';

function resolveOwnerId(raw: unknown): string {
    if (Array.isArray(raw)) {
        return resolveOwnerId(raw[0]);
    }
    const value = typeof raw === 'string' ? raw : undefined;
    return value && value.length > 0 ? value : 'unknown';
}

function resolveWorkspaceId(raw: unknown): string {
    if (Array.isArray(raw)) {
        return resolveWorkspaceId(raw[0]);
    }
    const value = typeof raw === 'string' ? raw : undefined;
    return value && value.length > 0 ? value : 'unknown';
}

export function createManifestRouter(): express.Router {
    const router = express.Router();

    router.get('/', async (req, res) => {
        const ownerId = resolveOwnerId(req.query.ownerId);
        const workspaceId = resolveWorkspaceId(req.query.workspaceId);
        try {
            const manifest = await loadManifestForWorkspaceId({ ownerId, workspaceId });
            res.json(manifest);
        } catch (error) {
            console.error('manifest error', error);
            res.status(500).json({ ok: false, error: String(error) });
        }
    });

    return router;
}
