import { existsSync } from 'fs';
import path from 'path';

const DEFAULT_PORT = 8787;
const rawPort = process.env.PORT;
const parsedPort = rawPort ? Number.parseInt(rawPort, 10) : DEFAULT_PORT;

function unique<T>(values: (T | undefined | null)[]): T[] {
  const out: T[] = [];
  for (const value of values) {
    if (value == null) continue;
    if (!out.includes(value)) {
      out.push(value);
    }
  }
  return out;
}

function resolveCandidateRoots(): string[] {
  const rawCandidates = unique([
    process.env.WORKSPACE_LAUNCH_PROJECT_ROOT,
    process.env.INIT_CWD,
    process.env.PWD,
    process.env.npm_config_local_prefix,
    process.cwd(),
  ]);

  return rawCandidates.map((candidate) => path.resolve(candidate));
}

function resolveProjectRoot(): string {
  const candidates = resolveCandidateRoots();

  for (const candidate of candidates) {
    if (candidate.includes('node_modules')) {
      continue;
    }
    const pkg = path.join(candidate, 'package.json');
    if (existsSync(pkg)) {
      return candidate;
    }
  }

  for (const candidate of candidates) {
    if (!candidate.includes('node_modules')) {
      return candidate;
    }
  }

  return candidates[0] ?? path.resolve('.');
}

const PROJECT_ROOT = resolveProjectRoot();
const DATA_ROOT = path.join(PROJECT_ROOT, '.workspace-launch');

function resolveDefaultTemplateRoot(): string {
  const candidate = path.join(DATA_ROOT, 'templates');
  if (existsSync(candidate)) {
    console.log(`Using templates from: ${candidate}`);
    return candidate;
  }

  const fallback = path.resolve(__dirname, '../templates');
  console.log(`Using default templates from: ${fallback}`);
  return fallback;
}

const defaultTemplateRoot = resolveDefaultTemplateRoot();
const defaultStorageRoot = path.join(DATA_ROOT, 'storage');

export const PORT = Number.isNaN(parsedPort) ? DEFAULT_PORT : parsedPort;
export const STORAGE_ROOT = path.resolve(process.env.STORAGE_ROOT ?? defaultStorageRoot);
export const TEMPLATE_ROOT = process.env.TEMPLATE_ROOT
  ? path.resolve(process.env.TEMPLATE_ROOT)
  : defaultTemplateRoot;

export const PROJECT_DATA_ROOT = DATA_ROOT;
