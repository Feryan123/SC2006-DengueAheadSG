// - Download the public JSON snapshot produced by the data pipeline.
// - Check its format before returning it to a control or the cache Proxy.
// - Ticket 13: Retrieve / Refresh Public Data. No API key is used here.

import type { ApprovedPublicDataServiceBoundary, PublicDataSnapshot } from './ApprovedPublicDataServiceBoundary.ts';
import { isPublicDataSnapshot } from './validatePublicDataSnapshot.ts';

export class SnapshotDataService implements ApprovedPublicDataServiceBoundary {
  private readonly snapshotUrl: string;

  constructor(snapshotUrl: string) {
    this.snapshotUrl = snapshotUrl;
  }

  async retrievePublicData(): Promise<PublicDataSnapshot> {
    try {
      const response = await fetch(this.snapshotUrl, {
        cache: 'no-store',
        signal: AbortSignal.timeout(10_000),
      });
      if (!response.ok) throw new Error('Snapshot request failed.');
      const snapshot: unknown = await response.json();
      if (!isPublicDataSnapshot(snapshot)) throw new Error('Invalid snapshot.');
      return snapshot;
    } catch {
      throw new Error('Public data could not be loaded. Please try again later.');
    }
  }
}
