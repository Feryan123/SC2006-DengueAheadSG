/**
 * Ticket #8: System start-up and dependency wiring.
 *
 * Creates the shared services and controls used by the application.
 * The data service can be injected for testing without changing
 * the production dependency structure.
 */

import { LocationRiskControl } from './control/LocationRiskControl.ts';
import { RiskMapControl } from './control/RiskMapControl.ts';
import { RiskAssessmentControl } from './control/RiskAssessmentControl.ts';
import { RiskSimulationControl } from './control/RiskSimulationControl.ts';
import { PreventionGuidanceControl } from './control/PreventionGuidanceControl.ts';

import { SnapshotDataService } from './services/SnapshotDataService.ts';
import { CachedPublicDataServiceProxy } from './services/CachedPublicDataServiceProxy.ts';

import type {
  ApprovedPublicDataServiceBoundary,
  PublicDataSnapshot,
} from './services/ApprovedPublicDataServiceBoundary.ts';

import type { AppProps } from './App.tsx';

export interface StartupOptions {
  dataService?: ApprovedPublicDataServiceBoundary;
  snapshotUrl?: string;
  bundledFallback?: PublicDataSnapshot;
}

export interface StartupResult {
  appProps: AppProps;
  dataService: ApprovedPublicDataServiceBoundary;
  riskAssessmentControl: RiskAssessmentControl;
}

/**
 * Creates and connects the application's shared dependencies.
 *
 * Does not use mock data by default. Production data must come from
 * the published snapshot or a valid cached/bundled fallback.
 */
export async function initializeApplication(
  options: StartupOptions = {},
): Promise<StartupResult> {
  const snapshotUrl = options.snapshotUrl ?? '/latest-snapshot.json';

  const dataService: ApprovedPublicDataServiceBoundary =
    options.dataService ??
    new CachedPublicDataServiceProxy(
      new SnapshotDataService(snapshotUrl),
      options.bundledFallback,
    );

  const riskAssessmentControl = new RiskAssessmentControl();

  const locationControl = new LocationRiskControl();
  const mapControl = new RiskMapControl(
    dataService,
    riskAssessmentControl,
  );
  const preventionControl = new PreventionGuidanceControl();
  const simulationControl = new RiskSimulationControl(
    riskAssessmentControl,
  );

  let publicSnapshot: PublicDataSnapshot | undefined;

  try {
    publicSnapshot = await dataService.retrievePublicData();
  } catch {
    // Keep the application available so its boundaries can show
    // the appropriate unavailable-data state.
  }

  return {
    dataService,
    riskAssessmentControl,
    appProps: {
      locationControl,
      mapControl,
      preventionControl,
      simulationControl,
      publicSnapshot,
    },
  };
}