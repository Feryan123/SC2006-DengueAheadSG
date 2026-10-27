import { describe, expect, it, vi } from 'vitest';

import { initializeApplication } from './Startup.ts';
import { RiskAssessmentControl } from './control/RiskAssessmentControl.ts';
import { RiskMapControl } from './control/RiskMapControl.ts';
import { RiskSimulationControl } from './control/RiskSimulationControl.ts';
import { LocationRiskControl } from './control/LocationRiskControl.ts';
import { PreventionGuidanceControl } from './control/PreventionGuidanceControl.ts';
import { MockPublicDataService } from './services/mocks/MockPublicDataService.ts';
import type {
  ApprovedPublicDataServiceBoundary,
} from './services/ApprovedPublicDataServiceBoundary.ts';

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

  it('loads the public snapshot from the injected service', async () => {
    const mockService = new MockPublicDataService();
    const expectedSnapshot = await mockService.retrievePublicData();

    const result = await initializeApplication({
      dataService: new MockPublicDataService(expectedSnapshot),
    });

    expect(result.appProps.publicSnapshot).toEqual(expectedSnapshot);
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
    const failingService: ApprovedPublicDataServiceBoundary = {
      retrievePublicData: vi.fn().mockRejectedValue(
        new Error('Network unavailable'),
      ),
    };

    const result = await initializeApplication({
      dataService: failingService,
    });

    expect(result.appProps.publicSnapshot).toBeUndefined();
    expect(result.appProps.mapControl).toBeInstanceOf(RiskMapControl);
    expect(result.appProps.simulationControl).toBeInstanceOf(
      RiskSimulationControl,
    );
  });
});