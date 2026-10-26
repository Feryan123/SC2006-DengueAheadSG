// - Check the one-hour cache, updates, old-cache recovery and bundled backup.
// - Check blocked storage and invalid snapshots without using live APIs.
// - Ticket 13: all example numbers below come from the test mock.

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { CachedPublicDataServiceProxy, CACHE_TTL_MS, PUBLIC_DATA_CACHE_KEY } from './CachedPublicDataServiceProxy.ts';
import { SnapshotDataService } from './SnapshotDataService.ts';
import { isPublicDataSnapshot } from './validatePublicDataSnapshot.ts';
import { MockPublicDataService } from './mocks/MockPublicDataService.ts';
import { DatasetStatus } from '../entity/enums.ts';
import type { PublicDataSnapshot } from './ApprovedPublicDataServiceBoundary.ts';

let snapshot: PublicDataSnapshot;
let savedValues: Map<string, string>;
let storage: { getItem: ReturnType<typeof vi.fn>; setItem: ReturnType<typeof vi.fn> };

beforeEach(async () => {
  vi.useFakeTimers();
  vi.setSystemTime(new Date('2026-10-26T10:00:00Z'));
  snapshot = structuredClone(await new MockPublicDataService().retrievePublicData());
  savedValues = new Map();
  storage = {
    getItem: vi.fn((key: string) => savedValues.get(key) ?? null),
    setItem: vi.fn((key: string, value: string) => { savedValues.set(key, value); }),
  };
  vi.stubGlobal('localStorage', storage);
});

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

function saveCache(age: number) {
  savedValues.set(PUBLIC_DATA_CACHE_KEY, JSON.stringify({ savedAt: Date.now() - age, snapshot }));
}

function failedService() {
  return { retrievePublicData: vi.fn().mockRejectedValue(new Error('Private upstream detail')) };
}

describe('Four required cache paths', () => {
  it('uses a cache younger than one hour without fetching or extending its life', async () => {
    saveCache(CACHE_TTL_MS - 1);
    const original = savedValues.get(PUBLIC_DATA_CACHE_KEY);
    const service = failedService();
    const result = await new CachedPublicDataServiceProxy(service, snapshot).retrievePublicData();
    expect(result).toEqual(snapshot);
    expect(service.retrievePublicData).not.toHaveBeenCalled();
    expect(storage.setItem).not.toHaveBeenCalled();
    expect(savedValues.get(PUBLIC_DATA_CACHE_KEY)).toBe(original);
  });

  it('refreshes at exactly one hour and saves the successful update', async () => {
    saveCache(CACHE_TTL_MS);
    const updated = { ...snapshot, generatedAt: '2026-10-26T10:00:01Z' };
    const service = { retrievePublicData: vi.fn().mockResolvedValue(updated) };
    const result = await new CachedPublicDataServiceProxy(service, snapshot).retrievePublicData();
    expect(result).toBe(updated);
    expect(service.retrievePublicData).toHaveBeenCalledOnce();
    expect(JSON.parse(savedValues.get(PUBLIC_DATA_CACHE_KEY)!)).toEqual({ savedAt: Date.now(), snapshot: updated });
  });

  it('uses the old cache before the bundled backup when an update fails', async () => {
    snapshot.datasets.highAedesAreas.status = DatasetStatus.Failed;
    saveCache(CACHE_TTL_MS + 1);
    const original = savedValues.get(PUBLIC_DATA_CACHE_KEY);
    const fallback = { ...snapshot, generatedAt: '2026-10-20T00:00:00Z' };
    const service = failedService();
    const result = await new CachedPublicDataServiceProxy(service, fallback).retrievePublicData();
    expect(service.retrievePublicData).toHaveBeenCalledOnce();
    expect(result.generatedAt).toBe(snapshot.generatedAt);
    expect(result.datasets.dengueClusters).toEqual({
      ...snapshot.datasets.dengueClusters, status: DatasetStatus.Stale,
    });
    expect(result.datasets.highAedesAreas.status).toBe(DatasetStatus.Failed);
    expect(savedValues.get(PUBLIC_DATA_CACHE_KEY)).toBe(original);
  });

  it('uses the bundled snapshot when fetching fails and no valid cache exists', async () => {
    const result = await new CachedPublicDataServiceProxy(failedService(), snapshot).retrievePublicData();
    expect(result.generatedAt).toBe(snapshot.generatedAt);
    expect(result.datasets.dengueClusters.retrievedAt).toBe(snapshot.datasets.dengueClusters.retrievedAt);
    expect(result.datasets.dengueClusters.status).toBe(DatasetStatus.Stale);
    expect(snapshot.datasets.dengueClusters.status).toBe(DatasetStatus.Fresh);
    expect(storage.setItem).not.toHaveBeenCalled();
  });
});

describe('Storage and failure handling', () => {
  it('still returns downloaded data when storage reads and writes are blocked', async () => {
    storage.getItem.mockImplementation(() => { throw new Error('Storage blocked'); });
    storage.setItem.mockImplementation(() => { throw new Error('Storage blocked'); });
    const service = { retrievePublicData: vi.fn().mockResolvedValue(snapshot) };
    expect(await new CachedPublicDataServiceProxy(service, snapshot).retrievePublicData()).toBe(snapshot);
    expect(service.retrievePublicData).toHaveBeenCalledOnce();
  });

  it('still uses the bundled backup when both storage and the network are unavailable', async () => {
    storage.getItem.mockImplementation(() => { throw new Error('Storage blocked'); });
    const result = await new CachedPublicDataServiceProxy(failedService(), snapshot).retrievePublicData();
    expect(result.generatedAt).toBe(snapshot.generatedAt);
    expect(result.datasets.humidity.status).toBe(DatasetStatus.Stale);
  });

  it('does not discard good downloaded data or overwrite the old cache when storage is full', async () => {
    saveCache(CACHE_TTL_MS);
    const original = savedValues.get(PUBLIC_DATA_CACHE_KEY);
    storage.setItem.mockImplementation(() => { throw new Error('Storage full'); });
    const updated = { ...snapshot, generatedAt: '2026-10-26T10:00:01Z' };
    const service = { retrievePublicData: vi.fn().mockResolvedValue(updated) };
    expect(await new CachedPublicDataServiceProxy(service, snapshot).retrievePublicData()).toBe(updated);
    expect(savedValues.get(PUBLIC_DATA_CACHE_KEY)).toBe(original);
  });

  it.each(['broken JSON', 'null', '{}', '{"savedAt":0,"snapshot":{}}'])('ignores corrupt cache: %s', async (saved) => {
    savedValues.set(PUBLIC_DATA_CACHE_KEY, saved);
    const result = await new CachedPublicDataServiceProxy(failedService(), snapshot).retrievePublicData();
    expect(result.generatedAt).toBe(snapshot.generatedAt);
    expect(result.datasets.rainfall.status).toBe(DatasetStatus.Stale);
  });

  it('does not treat a future cache timestamp as a fresh cache', async () => {
    saveCache(-1);
    const service = { retrievePublicData: vi.fn().mockResolvedValue(snapshot) };
    await new CachedPublicDataServiceProxy(service, snapshot).retrievePublicData();
    expect(service.retrievePublicData).toHaveBeenCalledOnce();
  });

  it('does not overwrite the last good cache with an invalid response', async () => {
    saveCache(CACHE_TTL_MS);
    const original = savedValues.get(PUBLIC_DATA_CACHE_KEY);
    const service = { retrievePublicData: vi.fn().mockResolvedValue({ lastUpdated: 'old format' }) };
    const result = await new CachedPublicDataServiceProxy(service, snapshot).retrievePublicData();
    expect(result.generatedAt).toBe(snapshot.generatedAt);
    expect(result.datasets.dengueClusters.status).toBe(DatasetStatus.Stale);
    expect(savedValues.get(PUBLIC_DATA_CACHE_KEY)).toBe(original);
  });

  it('returns a safe error when the network, cache and bundled backup are unusable', async () => {
    const request = new CachedPublicDataServiceProxy(failedService(), null).retrievePublicData();
    await expect(request).rejects.toThrow('Public data and its backup are unavailable. Please try again later.');
    expect(storage.setItem).not.toHaveBeenCalled();
  });
});

describe('Public snapshot reader', () => {
  it('downloads and validates the supplied public URL without a credential header', async () => {
    const fetchSnapshot = vi.fn().mockResolvedValue(new Response(JSON.stringify(snapshot)));
    vi.stubGlobal('fetch', fetchSnapshot);
    expect(await new SnapshotDataService('/snapshot.json').retrievePublicData()).toEqual(snapshot);
    expect(fetchSnapshot).toHaveBeenCalledExactlyOnceWith('/snapshot.json', {
      cache: 'no-store', signal: expect.any(AbortSignal),
    });
  });

  it.each(['http', 'json', 'old format', 'timeout'])('uses the backup after a reader failure: %s', async (failure) => {
    const fetchSnapshot = vi.fn();
    if (failure === 'http') fetchSnapshot.mockResolvedValue(new Response('private body', { status: 503 }));
    if (failure === 'json') fetchSnapshot.mockResolvedValue(new Response('not JSON'));
    if (failure === 'old format') fetchSnapshot.mockResolvedValue(new Response('{"lastUpdated":"2026-10-26"}'));
    if (failure === 'timeout') fetchSnapshot.mockRejectedValue(new DOMException('Private endpoint detail', 'TimeoutError'));
    vi.stubGlobal('fetch', fetchSnapshot);
    const service = new SnapshotDataService('/snapshot.json');
    const result = await new CachedPublicDataServiceProxy(service, snapshot).retrievePublicData();
    expect(result.generatedAt).toBe(snapshot.generatedAt);
    expect(result.datasets.dengueClusters.status).toBe(DatasetStatus.Stale);
  });

  it('does not return private fetch error details to callers', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('Private endpoint detail')));
    await expect(new SnapshotDataService('/snapshot.json').retrievePublicData()).rejects.toThrow(
      'Public data could not be loaded. Please try again later.',
    );
  });
});

describe('Snapshot format checks', () => {
  it('accepts Polygon and MultiPolygon subzones and Point overlay locations', () => {
    const boundary = snapshot.subzones[0].boundary;
    if (boundary.type !== 'Polygon') throw new Error('Expected a polygon test fixture.');
    snapshot.subzones[0].boundary = { type: 'MultiPolygon', coordinates: [boundary.coordinates] };
    snapshot.dengueClusters[0].geometry = { type: 'Point', coordinates: [103.8, 1.3] };
    expect(isPublicDataSnapshot(snapshot)).toBe(true);
  });

  it.each([
    'missing weather', 'bad date', 'bad status', 'duplicate ID', 'bad index input',
    'bad ratio', 'open polygon', 'outside coordinates', 'unknown area', 'point subzone',
  ])('rejects unusable snapshot data: %s', (problem) => {
    if (problem === 'missing weather') return expect(isPublicDataSnapshot({ ...snapshot, weather: null })).toBe(false);
    if (problem === 'bad date') snapshot.generatedAt = 'not a date';
    if (problem === 'bad status') return expect(isPublicDataSnapshot({ ...snapshot, datasets: { clusters: { retrievedAt: snapshot.generatedAt, status: 'UNKNOWN' } } })).toBe(false);
    if (problem === 'duplicate ID') snapshot.subzones.push(snapshot.subzones[0]);
    if (problem === 'bad index input') snapshot.subzones[0].residentsPerKm2 = NaN;
    if (problem === 'bad ratio') snapshot.subzones[0].aedesOverlapRatio = 2;
    if (problem === 'open polygon') snapshot.subzones[0].boundary = { type: 'Polygon', coordinates: [[[103, 1], [104, 1], [104, 2], [103, 2]]] };
    if (problem === 'outside coordinates') snapshot.subzones[0].boundary = { type: 'Polygon', coordinates: [[[103, 91], [104, 91], [104, 92], [103, 91]]] };
    if (problem === 'unknown area') snapshot.populationProfiles[0].subzoneId = 'unknown';
    if (problem === 'point subzone') snapshot.subzones[0].boundary = { type: 'Point', coordinates: [103, 1] };
    expect(isPublicDataSnapshot(snapshot)).toBe(false);
  });
});
