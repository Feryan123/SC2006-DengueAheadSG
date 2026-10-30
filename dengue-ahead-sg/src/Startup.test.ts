// - Check that startup connects the app's services and controls.
// - Check that saved backup data loads when the network or storage is unavailable.
// - Check that working network data and supplied test services are still used.
// - Tickets #8 and #58: these tests do not call live APIs.

import { afterEach, describe, expect, it, vi } from 'vitest';

import { initializeApplication } from './Startup.ts';
import { RiskAssessmentControl } from './control/RiskAssessmentControl.ts';
import { RiskMapControl } from './control/RiskMapControl.ts';
import { RiskSimulationControl } from './control/RiskSimulationControl.ts';
import { LocationRiskControl } from './control/LocationRiskControl.ts';
import { PreventionGuidanceControl } from './control/PreventionGuidanceControl.ts';
import { MockPublicDataService } from './services/mocks/MockPublicDataService.ts';
import { DatasetStatus } from './entity/enums.ts';
import { isPublicDataSnapshot } from './services/validatePublicDataSnapshot.ts';
import bundledSnapshot from './data/bundled-snapshot.json';
import type {
  ApprovedPublicDataServiceBoundary,
} from './services/ApprovedPublicDataServiceBoundary.ts';

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('Startup dependency wiring (Ticket #8)', () => {
  it('creates the required controls and shared assessment engine', async () => {
    const mockService = new MockPublicDataService();

    const result = await initializeApplication({
      dataService: mockService,
    });

    expect(result.dataService).toBe(mockService);

    expect(result.riskAssessmentControl).toBeInstanceOf(
      RiskAssessmentControl,
    );

    expect(result.appProps.locationControl).toBeInstanceOf(
      LocationRiskControl,
    );

    expect(result.appProps.mapControl).toBeInstanceOf(
      RiskMapControl,
    );

    expect(result.appProps.preventionControl).toBeInstanceOf(
      PreventionGuidanceControl,
    );

    expect(result.appProps.simulationControl).toBeInstanceOf(
      RiskSimulationControl,
    );

    expect(
      result.appProps.simulationControl?.riskAssessmentControl,
    ).toBe(result.riskAssessmentControl);

    expect(result.riskAssessmentControl.calculators).toHaveLength(5);
  });

  it('does not fetch the public snapshot during startup', async () => {
    const retrievePublicData = vi.fn().mockImplementation(
      () => new Promise(() => {}),
    );

    const dataService: ApprovedPublicDataServiceBoundary = {
      retrievePublicData,
    };

    const result = await initializeApplication({ dataService });

    expect(result.dataService).toBe(dataService);
    expect(retrievePublicData).not.toHaveBeenCalled();
  });

  it('uses the injected service for map assessments', async () => {
    const mockService = new MockPublicDataService();

    const result = await initializeApplication({
      dataService: mockService,
    });

    const mapResult = await result.appProps.mapControl!.loadRiskMap();

    expect(mapResult.status).toBe('OK');

    if (mapResult.status === 'OK') {
      expect(mapResult.data.subzones.length).toBeGreaterThan(0);
      expect(Object.keys(mapResult.data.assessments).length).toBeGreaterThan(0);
    }
  });

  it('keeps the app initialised when public data is unavailable', async () => {
    const retrievePublicData = vi.fn().mockRejectedValue(
      new Error('Network unavailable'),
    );

    const failingService: ApprovedPublicDataServiceBoundary = {
      retrievePublicData,
    };

    const result = await initializeApplication({
      dataService: failingService,
    });

    expect(retrievePublicData).not.toHaveBeenCalled();
    expect(result.appProps.mapControl).toBeInstanceOf(RiskMapControl);
    expect(result.appProps.simulationControl).toBeInstanceOf(
      RiskSimulationControl,
    );
  });
});

describe('Bundled fallback startup (Ticket #58)', () => {
  it.each(['empty', 'blocked'])('loads all real subzones offline with %s storage', async (storageState) => {
    const fetchSnapshot = vi.fn().mockRejectedValue(new TypeError('Offline'));
    const storage = {
      getItem: vi.fn(() => {
        if (storageState === 'blocked') throw new Error('Storage blocked');
        return null;
      }),
      setItem: vi.fn(),
    };
    vi.stubGlobal('fetch', fetchSnapshot);
    vi.stubGlobal('localStorage', storage);

    expect(isPublicDataSnapshot(bundledSnapshot)).toBe(true);
    const app = await initializeApplication();
    expect(fetchSnapshot).not.toHaveBeenCalled();

    const result = await app.appProps.mapControl!.loadRiskMap();
    expect(result.status).toBe('OK');
    if (result.status !== 'OK') throw new Error('Expected the bundled map to load');

    expect(result.data.subzones).toHaveLength(332);
    expect(Object.keys(result.data.assessments)).toHaveLength(332);
    expect(result.data.snapshot?.isBundledFallback).toBe(true);
    expect(result.data.snapshot?.generatedAt).toBe(bundledSnapshot.generatedAt);
    expect(result.data.snapshot?.dengueClusters).toEqual(bundledSnapshot.dengueClusters);
    expect(result.data.snapshot?.highAedesAreas).toEqual(bundledSnapshot.highAedesAreas);
    for (const [name, dataset] of Object.entries(result.data.snapshot!.datasets)) {
      expect(dataset.status).toBe(DatasetStatus.Stale);
      expect(dataset.retrievedAt).toBe(bundledSnapshot.datasets[name as keyof typeof bundledSnapshot.datasets].retrievedAt);
    }
    expect(fetchSnapshot).toHaveBeenCalledOnce();
    expect(storage.setItem).not.toHaveBeenCalled();
    expect(Object.values(bundledSnapshot.datasets).every((dataset) => dataset.status === DatasetStatus.Fresh)).toBe(true);
  });

  it('keeps a successful network snapshot ahead of the bundled backup', async () => {
    const liveSnapshot = structuredClone(await new MockPublicDataService().retrievePublicData());
    const storage = { getItem: vi.fn(() => null), setItem: vi.fn() };
    vi.stubGlobal('localStorage', storage);
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, json: async () => liveSnapshot }));

    const app = await initializeApplication();
    const result = await app.dataService.retrievePublicData();

    expect(result).toBe(liveSnapshot);
    expect(result.isBundledFallback).not.toBe(true);
    expect(storage.setItem).toHaveBeenCalledOnce();
  });

  it('preserves an explicitly supplied bundled backup', async () => {
    const customBackup = structuredClone(await new MockPublicDataService().retrievePublicData());
    vi.stubGlobal('localStorage', { getItem: vi.fn(() => null), setItem: vi.fn() });
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new TypeError('Offline')));

    const app = await initializeApplication({ bundledFallback: customBackup });
    const result = await app.dataService.retrievePublicData();

    expect(result.subzones).toEqual(customBackup.subzones);
    expect(result.generatedAt).toBe(customBackup.generatedAt);
    expect(result.isBundledFallback).toBe(true);
    expect(customBackup.datasets.dengueClusters.status).toBe(DatasetStatus.Fresh);
  });
});
