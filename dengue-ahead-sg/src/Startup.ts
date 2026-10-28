
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
  // Deployed: api/snapshot.ts serves the data-branch snapshot (#27).
  // `npm run dev` cannot run that function, so it reads a local copy in public/ instead.
  const snapshotUrl =
    options.snapshotUrl ??
    (import.meta.env.DEV ? '/latest-snapshot.json' : '/api/snapshot');

  const dataService: ApprovedPublicDataServiceBoundary =
    options.dataService ??
    new CachedPublicDataServiceProxy(
      new SnapshotDataService(snapshotUrl),
      options.bundledFallback,
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
