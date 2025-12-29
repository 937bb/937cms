import { http } from './http';

export type DirectoryCheck = {
  path: string;
  writable: boolean;
  error?: string;
};

export type SetupStatus = {
  configured: boolean;
  needsRestart?: boolean;
  version?: string;
  directories?: DirectoryCheck[];
};

let cached: SetupStatus | null = null;
let cachedAt = 0;

export async function getSetupStatusCached(ttlMs = 1000): Promise<SetupStatus> {
  const now = Date.now();
  if (cached && now - cachedAt < ttlMs) return cached;
  try {
    const res = await http.get('/admin/setup/status');
    cached = res.data as SetupStatus;
    cachedAt = now;
    return cached;
  } catch {
    cached = { configured: false };
    cachedAt = now;
    return cached;
  }
}

export function clearSetupStatusCache() {
  cached = null;
  cachedAt = 0;
}
