import { createHash } from 'crypto';
import { promises as fs } from 'fs';
import path from 'path';

export interface SnapshotStore {
  put(key: string, payload: Record<string, unknown>): Promise<{ storageKey: string; payloadHash: string }>;
  get(key: string): Promise<Record<string, unknown> | null>;
}

export class LocalSnapshotStore implements SnapshotStore {
  private readonly storePath: string;

  constructor(storePath?: string) {
    // Default to a snapshots directory in the root if not provided
    this.storePath = storePath || path.join(process.cwd(), 'snapshots');
  }

  private async ensureDir(dir: string): Promise<void> {
    try {
      await fs.access(dir);
    } catch {
      await fs.mkdir(dir, { recursive: true });
    }
  }

  async put(key: string, payload: Record<string, unknown>): Promise<{ storageKey: string; payloadHash: string }> {
    const payloadStr = JSON.stringify(payload);
    const payloadHash = createHash('sha256').update(payloadStr).digest('hex');
    
    // Store key format: {platform}_{handle}/{timestamp}_{hash}.json
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const storageKey = `${key}/${timestamp}_${payloadHash.slice(0, 8)}.json`;
    
    const fullPath = path.join(this.storePath, storageKey);
    await this.ensureDir(path.dirname(fullPath));
    
    await fs.writeFile(fullPath, payloadStr, 'utf-8');
    
    return { storageKey, payloadHash };
  }

  async get(storageKey: string): Promise<Record<string, unknown> | null> {
    try {
      const fullPath = path.join(this.storePath, storageKey);
      const data = await fs.readFile(fullPath, 'utf-8');
      return JSON.parse(data);
    } catch {
      return null;
    }
  }
}

export const snapshotStore = new LocalSnapshotStore(process.env.SNAPSHOT_STORE_PATH);
