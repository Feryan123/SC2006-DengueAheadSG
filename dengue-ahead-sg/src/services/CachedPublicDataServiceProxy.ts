// - Reuse saved public data for one hour before requesting an update.
// - If the update fails, use the last good cache, then the bundled backup.
// - Mark bundled backup data so the screens can show a warning (Ticket #58).
// - Ticket 13: Proxy for ApprovedPublicDataServiceBoundary; no risk calculations.

import { DatasetStatus } from '../entity/enums.ts';
import type { ApprovedPublicDataServiceBoundary, PublicDataSnapshot } from './ApprovedPublicDataServiceBoundary.ts';
import { isPublicDataSnapshot } from './validatePublicDataSnapshot.ts';

export const PUBLIC_DATA_CACHE_KEY = 'dengue-ahead-sg:public-data:v1';
export const CACHE_TTL_MS = 60 * 60 * 1000;

type CacheEntry = { savedAt: number; snapshot: PublicDataSnapshot };

export class CachedPublicDataServiceProxy implements ApprovedPublicDataServiceBoundary {
  private readonly service: ApprovedPublicDataServiceBoundary;
  private readonly bundledFallback: unknown;

  constructor(service: ApprovedPublicDataServiceBoundary, bundledFallback: unknown) {
    this.service = service;
    this.bundledFallback = bundledFallback;
  }

  async retrievePublicData(): Promise<PublicDataSnapshot> {
    const cached = this.readCache();
    if (cached && Date.now() - cached.savedAt < CACHE_TTL_MS) return cached.snapshot;

    try {
      const snapshot = await this.service.retrievePublicData();
      if (!isPublicDataSnapshot(snapshot)) throw new Error('Invalid snapshot.');
      try {
        localStorage.setItem(PUBLIC_DATA_CACHE_KEY, JSON.stringify({ savedAt: Date.now(), snapshot }));
      } catch {
        // Storage may be blocked or full. The downloaded data can still be used.
      }
      return snapshot;
    } catch {
      if (cached) return this.markStale(cached.snapshot);
      if (isPublicDataSnapshot(this.bundledFallback)) {
        const backup = this.markStale(this.bundledFallback);
        backup.isBundledFallback = true;
        return backup;
      }
      throw new Error('Public data and its backup are unavailable. Please try again later.');
    }
  }

  private readCache(): CacheEntry | null {
    try {
      const saved = localStorage.getItem(PUBLIC_DATA_CACHE_KEY);
      if (!saved) return null;
      const entry = JSON.parse(saved);
      if (!entry || typeof entry.savedAt !== 'number' || !Number.isFinite(entry.savedAt)
        || entry.savedAt < 0 || entry.savedAt > Date.now() || !isPublicDataSnapshot(entry.snapshot)) return null;
      return entry;
    } catch {
      // Broken JSON or blocked storage must not stop the network or backup path.
      return null;
    }
  }

  private markStale(snapshot: PublicDataSnapshot): PublicDataSnapshot {
    const datasets: PublicDataSnapshot['datasets'] = {};
    for (const [name, dataset] of Object.entries(snapshot.datasets)) {
      datasets[name] = {
        ...dataset,
        status: dataset.status === DatasetStatus.Failed ? DatasetStatus.Failed : DatasetStatus.Stale,
      };
    }
    // Keep the original dates. A backup is not a newly downloaded snapshot.
    return { ...snapshot, datasets };
  }
}
