
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
 * Does not fetch the public snapshot during startup.
 * Screens load data through their own controls when needed.
 */
export async function initializeApplication(
  options: StartupOptions = {},
): Promise<StartupResult> {
  // TODO (#8): Replace this URL once snapshot hosting is confirmed.
  // The hourly sync currently writes to the data branch, not public/.
  const snapshotUrl = options.snapshotUrl ?? '/latest-snapshot.json';

  const dataService: ApprovedPublicDataServiceBoundary =
    options.dataService ??
    new CachedPublicDataServiceProxy(
      new SnapshotDataService(snapshotUrl),
      options.bundledFallback,
    );

  const riskAssessmentControl = new RiskAssessmentControl();

  // TODO (#14): Once Ticket #14 is merged, inject dataService and
  // riskAssessmentControl into LocationRiskControl.
  const locationControl = new LocationRiskControl();

  const mapControl = new RiskMapControl(
    dataService,
    riskAssessmentControl,
  );

  const preventionControl = new PreventionGuidanceControl();

  const simulationControl = new RiskSimulationControl(
    riskAssessmentControl,
  );

  return {
    dataService,
    riskAssessmentControl,
    appProps: {
      locationControl,
      mapControl,
      preventionControl,
      simulationControl,
    },
  };
}
