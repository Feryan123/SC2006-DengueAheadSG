
/**
 * - Create the services and controls shared by the app.
 * - Supply saved backup data when the network and cache cannot provide data.
 * - Allow tests to supply their own data service or backup snapshot.
 * - Tickets #8 and #58: app startup and bundled backup data.
 */

import { LocationRiskControl } from './control/LocationRiskControl.ts';
import { RiskMapControl } from './control/RiskMapControl.ts';
import { RiskAssessmentControl } from './control/RiskAssessmentControl.ts';
import { RiskSimulationControl } from './control/RiskSimulationControl.ts';
import { PreventionGuidanceControl } from './control/PreventionGuidanceControl.ts';

import { SnapshotDataService } from './services/SnapshotDataService.ts';
import { CachedPublicDataServiceProxy } from './services/CachedPublicDataServiceProxy.ts';
import bundledSnapshot from './data/bundled-snapshot.json';

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
      options.bundledFallback ?? bundledSnapshot,
    );

  const riskAssessmentControl = new RiskAssessmentControl();

  const locationControl = new LocationRiskControl(
    dataService,
    riskAssessmentControl,
  );

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
