/**
 * Ticket #34: failure-mode tests for the data pipeline.
 * Traces to UC-1 Assess Location Risk and UC-2 Explore Risk Map, which consume the public data snapshot,
 * and to the Retrieve / Refresh Public Data function that supplies it.
 *
 * Written as an independent tester of #13 (CachedPublicDataServiceProxy, validatePublicDataSnapshot) and
 * #7 (RiskAssessmentControl): only their public behaviour is exercised and their code is not changed.
 *
 * The single-step proxy failures (cache age, blocked storage, corrupt cache, invalid response, no backup,
 * reader errors) are already tested in CachedPublicDataServiceProxy.test.ts and are not repeated here.
 * This file covers what that file does not:
 *  - the proxy's fallback output fed into the risk engine (Unavailable, Data Confidence)
 *  - recovery after an outage
 *  - snapshots the validator must reject before the engine ever sees them
 *  - reweighting and Data Confidence when a factor's data is missing
 * No live APIs are used.
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { CachedPublicDataServiceProxy, CACHE_TTL_MS, PUBLIC_DATA_CACHE_KEY } from './CachedPublicDataServiceProxy.ts';
import { MockPublicDataService } from './mocks/MockPublicDataService.ts';
import { isPublicDataSnapshot } from './validatePublicDataSnapshot.ts';
import { RiskAssessmentControl } from '../control/RiskAssessmentControl.ts';
import type { RiskFactorCalculator } from '../control/calculators/RiskFactorCalculator.ts';
import { DataConfidence, DatasetStatus, RiskFactorType, RiskLevel } from '../entity/enums.ts';
import type { PublicDataSnapshot } from './ApprovedPublicDataServiceBoundary.ts';

let snapshot: PublicDataSnapshot;
let savedValues: Map<string, string>;
let storage: { getItem: ReturnType<typeof vi.fn>; setItem: ReturnType<typeof vi.fn> };

beforeEach(async () => {
  vi.useFakeTimers();
  vi.setSystemTime(new Date('2026-11-05T10:00:00Z'));
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

// Known scores. With rank-sum weights (5, 4, 3, 2, 1 out of 15) all five give an index of 56.
const SCORES: Record<RiskFactorType, number | null> = {
  [RiskFactorType.DengueClusters]: 80,
  [RiskFactorType.HighAedesArea]: 60,
  [RiskFactorType.PopulationDensity]: 40,
  [RiskFactorType.Humidity]: 30,
  [RiskFactorType.LaggedRainfall]: 20,
};

/**
 * A risk engine whose five calculators return fixed scores (null = that factor's data is missing).
 * A validated snapshot always has usable weather, so real data cannot produce a missing humidity or rainfall
 * factor through the proxy. Fixed scores let these tests check the engine's own reweighting rules.
 */
function engine(overrides: Partial<Record<RiskFactorType, number | null>> = {}): RiskAssessmentControl {
  const scores = { ...SCORES, ...overrides } as Record<RiskFactorType, number | null>;
  const calculators: RiskFactorCalculator[] = Object.values(RiskFactorType).map((factorType) => ({
    factorType,
    calculate: () => {
      const score = scores[factorType];
      return score === null ? null : { inputValue: 1, score };
    },
  }));
  return new RiskAssessmentControl(calculators);
}

const zoneId = () => snapshot.subzones[0].subzoneId;

function saveCache(age: number) {
  savedValues.set(PUBLIC_DATA_CACHE_KEY, JSON.stringify({ savedAt: Date.now() - age, snapshot }));
}

function unreachableService() {
  return { retrievePublicData: vi.fn().mockRejectedValue(new Error('Private upstream detail')) };
}

describe('Failing service → fallback → risk engine (end to end, real calculators)', () => {
  it('FM-E2E-01: service down and nothing cached → the bundled backup still gives an assessment for every subzone, with MEDIUM confidence', async () => {
    const fallback = await new CachedPublicDataServiceProxy(unreachableService(), snapshot).retrievePublicData();
    expect(fallback.isBundledFallback).toBe(true);

    const results = await new RiskAssessmentControl().assessAll(fallback);

    expect(results).toHaveLength(snapshot.subzones.length);
    for (const result of results) {
      expect(result.contributions).toHaveLength(5);
      expect(result.dataConfidence).toBe(DataConfidence.Medium); // all five factors present, every dataset STALE
      // The backup keeps its original date. It is not presented as newly downloaded data.
      expect(result.dataTimeStamp).toBe(snapshot.generatedAt);
    }
  });

  it('FM-E2E-02: service down, cache older than an hour → old cache is used, every dataset is STALE, confidence drops from HIGH to MEDIUM, index unchanged', async () => {
    saveCache(CACHE_TTL_MS + 1);
    const control = new RiskAssessmentControl();
    const fresh = await control.generateAssessment(zoneId(), snapshot);

    const staleSnapshot = await new CachedPublicDataServiceProxy(unreachableService(), null).retrievePublicData();
    const stale = await control.generateAssessment(zoneId(), staleSnapshot);

    for (const dataset of Object.values(staleSnapshot.datasets)) {
      expect(dataset.status).toBe(DatasetStatus.Stale);
    }
    expect(fresh?.dataConfidence).toBe(DataConfidence.High);
    expect(stale?.dataConfidence).toBe(DataConfidence.Medium);
    expect(stale?.contributions).toHaveLength(5);
    expect(stale?.riskIndex).toBe(fresh?.riskIndex);
  });

  it('FM-E2E-03: service down and the cached clusters dataset FAILED → no assessment (Unavailable), and FAILED is not downgraded to STALE', async () => {
    snapshot.datasets.dengueClusters.status = DatasetStatus.Failed;
    saveCache(CACHE_TTL_MS + 1);

    const fallback = await new CachedPublicDataServiceProxy(unreachableService(), null).retrievePublicData();
    const control = new RiskAssessmentControl();

    expect(fallback.datasets.dengueClusters.status).toBe(DatasetStatus.Failed);
    expect(fallback.datasets.highAedesAreas.status).toBe(DatasetStatus.Stale);
    expect(await control.generateAssessment(zoneId(), fallback)).toBeNull();
    expect(await control.assessAll(fallback)).toEqual([]);
  });
});

describe('Recovery after an outage', () => {
  it('FM-REC-01: fallback while the service is down, fresh data once it is back, then the cache is used again', async () => {
    const service = {
      retrievePublicData: vi.fn().mockRejectedValueOnce(new Error('down')).mockResolvedValue(snapshot),
    };
    const proxy = new CachedPublicDataServiceProxy(service, snapshot);

    const during = await proxy.retrievePublicData();
    expect(during.isBundledFallback).toBe(true);
    expect(storage.setItem).not.toHaveBeenCalled(); // a backup is never saved as if it were a download

    const after = await proxy.retrievePublicData();
    expect(after.isBundledFallback).toBeFalsy();
    expect(after.datasets.dengueClusters.status).toBe(DatasetStatus.Fresh);
    expect(storage.setItem).toHaveBeenCalledTimes(1);

    const again = await proxy.retrievePublicData();
    expect(again).toEqual(snapshot);
    expect(service.retrievePublicData).toHaveBeenCalledTimes(2); // the third call came from the cache
  });
});

describe('Snapshots rejected before they reach the risk engine', () => {
  it('FM-VAL-01: a snapshot with an unusable weather baseline (SD 0) is rejected and the backup is used', async () => {
    const badBaseline = { ...snapshot, weather: { ...snapshot.weather, humidityNormalSd: 0 } };
    const service = { retrievePublicData: vi.fn().mockResolvedValue(badBaseline) };

    expect(isPublicDataSnapshot(badBaseline)).toBe(false);
    const result = await new CachedPublicDataServiceProxy(service, snapshot).retrievePublicData();

    expect(result.isBundledFallback).toBe(true);
    expect(storage.setItem).not.toHaveBeenCalled(); // the bad download is not cached
  });

  // OBSERVATION (confirmed by reading sync-data.ts). It writes `location: LOCALITY ?? ''` for every cluster and
  // never runs this validator before writing latest-snapshot.json, but the validator requires a non-empty
  // location. One cluster without a locality makes the whole published snapshot unusable in the browser
  // (users get the backup) even though the sync job succeeded. Not known: whether the NEA data ever omits
  // LOCALITY. If the team decides blank locations should be accepted, change the expectation and log it.
  it('FM-VAL-02 (observation): a snapshot with one blank cluster location is rejected as a whole', async () => {
    const blankLocation = structuredClone(snapshot);
    blankLocation.dengueClusters[0].location = '';
    const service = { retrievePublicData: vi.fn().mockResolvedValue(blankLocation) };

    expect(isPublicDataSnapshot(blankLocation)).toBe(false);
    const result = await new CachedPublicDataServiceProxy(service, snapshot).retrievePublicData();

    expect(result.isBundledFallback).toBe(true);
  });
});

describe('Reweighting and Data Confidence when a factor is missing', () => {
  it('FM-RW-01: all five factors present → index 56, HIGH level, HIGH confidence (reference case)', async () => {
    const result = await engine().generateAssessment(zoneId(), snapshot);

    expect(result?.contributions).toHaveLength(5);
    expect(result?.riskIndex).toBe(56);
    expect(result?.riskLevel).toBe(RiskLevel.High);
    expect(result?.dataConfidence).toBe(DataConfidence.High);
  });

  it('FM-RW-02: humidity missing → the other four weights are rescaled (index 60, not 52), confidence MEDIUM', async () => {
    const result = await engine({ [RiskFactorType.Humidity]: null }).generateAssessment(zoneId(), snapshot);

    expect(result?.contributions).toHaveLength(4);
    expect(result?.contributions.map((c) => c.factorType)).not.toContain(RiskFactorType.Humidity);
    expect(result?.riskIndex).toBe(60);
    expect(result?.riskLevel).toBe(RiskLevel.High);
    expect(result?.dataConfidence).toBe(DataConfidence.Medium);

    // 80 points x weight 5/15, divided by the available weight 13/15
    const clusters = result?.contributions.find((c) => c.factorType === RiskFactorType.DengueClusters);
    expect(clusters?.contribution).toBeCloseTo((80 * 5) / 13, 5);
    const total = result!.contributions.reduce((sum, c) => sum + c.contribution, 0);
    expect(total).toBeCloseTo(result!.riskIndex, 1);
  });

  it('FM-RW-03: humidity and rainfall both missing → index 63.3 from three factors, confidence LOW', async () => {
    const result = await engine({
      [RiskFactorType.Humidity]: null,
      [RiskFactorType.LaggedRainfall]: null,
    }).generateAssessment(zoneId(), snapshot);

    expect(result?.contributions).toHaveLength(3);
    expect(result?.riskIndex).toBe(63.3);
    expect(result?.dataConfidence).toBe(DataConfidence.Low);
  });

  it('FM-RW-04: two factors missing and a dataset STALE → LOW (missing data takes priority over stale)', async () => {
    snapshot.datasets.highAedesAreas.status = DatasetStatus.Stale;
    const result = await engine({
      [RiskFactorType.Humidity]: null,
      [RiskFactorType.LaggedRainfall]: null,
    }).generateAssessment(zoneId(), snapshot);

    expect(result?.dataConfidence).toBe(DataConfidence.Low);
  });

  it('FM-RW-05: the core factor (dengue clusters) missing → no assessment, no invented score', async () => {
    const control = engine({ [RiskFactorType.DengueClusters]: null });

    expect(await control.generateAssessment(zoneId(), snapshot)).toBeNull();
    expect(await control.assessAll(snapshot)).toEqual([]);
  });

  it('FM-RW-06: every factor missing → no assessment', async () => {
    const control = engine({
      [RiskFactorType.DengueClusters]: null,
      [RiskFactorType.HighAedesArea]: null,
      [RiskFactorType.PopulationDensity]: null,
      [RiskFactorType.Humidity]: null,
      [RiskFactorType.LaggedRainfall]: null,
    });

    expect(await control.generateAssessment(zoneId(), snapshot)).toBeNull();
  });

  // OBSERVATION, not a confirmed bug. The calculators never look at dataset status, and
  // determineDataConfidence only looks at STALE datasets. In sync-data.ts a failed download throws and the run
  // exits without publishing, so this snapshot can only be published if DataGovSgAdapter returns without
  // writing the file (not checked): the script then marks the dataset FAILED, uses an empty feature list,
  // and every overlap ratio is 0. The factor is still calculated, contributes 0 points, and confidence stays
  // HIGH. If the team decides FAILED should lower confidence, change the expectation to MEDIUM and log it.
  it('FM-RW-07 (observation): a FAILED high-Aedes dataset with all-zero overlap still gives HIGH confidence', async () => {
    snapshot.datasets.highAedesAreas.status = DatasetStatus.Failed;
    for (const zone of snapshot.subzones) zone.aedesOverlapRatio = 0;

    const result = await new RiskAssessmentControl().generateAssessment(zoneId(), snapshot);

    expect(result?.contributions).toHaveLength(5);
    const aedes = result?.contributions.find((c) => c.factorType === RiskFactorType.HighAedesArea);
    expect(aedes?.contribution).toBe(0);
    expect(result?.dataConfidence).toBe(DataConfidence.High);
  });

  it('FM-RW-08: real calculators, unusable humidity and rainfall baselines (SD 0) → both factors dropped, confidence LOW', async () => {
    // The validator rejects this weather (FM-VAL-01), so it cannot arrive through the proxy.
    // The engine is given it directly to check its own handling.
    snapshot.weather.humidityNormalSd = 0;
    snapshot.weather.rainfallNormalSd = 0;

    const result = await new RiskAssessmentControl().generateAssessment(zoneId(), snapshot);
    const factors = result?.contributions.map((c) => c.factorType);

    expect(factors).toHaveLength(3);
    expect(factors).not.toContain(RiskFactorType.Humidity);
    expect(factors).not.toContain(RiskFactorType.LaggedRainfall);
    expect(result?.dataConfidence).toBe(DataConfidence.Low);
    const total = result!.contributions.reduce((sum, c) => sum + c.contribution, 0);
    expect(total).toBeCloseTo(result!.riskIndex, 1);
  });
});