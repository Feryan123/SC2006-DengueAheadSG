// - Keep the selected area and assessment while moving between screens.
// - Connect the real boundary components and handle unavailable data.
// - Show the backup warning on result and simulation screens (Ticket #58).
// - Let keyboard users skip navigation and go straight to the page (Ticket #32).
// - Ticket 19: App navigation for UC-1 to UC-5.

import { useState } from 'react';
import HomePageBoundary from './boundary/HomePageBoundary.tsx';
import RiskMapBoundary from './boundary/RiskMapBoundary.tsx';
import RiskResultBoundary from './boundary/RiskResultBoundary.tsx';
import SimulationBoundary from './boundary/SimulationBoundary.tsx';
import PreventionGuidanceBoundary from './boundary/PreventionGuidanceBoundary.tsx';
import DataUnavailableBoundary from './boundary/DataUnavailableBoundary.tsx';
import BundledFallbackNotice from './boundary/BundledFallbackNotice.tsx';
import { RiskMapControl, type MapAssessmentSelection } from './control/RiskMapControl.ts';
import type { LocationRiskControl } from './control/LocationRiskControl.ts';
import type { PreventionGuidanceControl } from './control/PreventionGuidanceControl.ts';
import type { RiskSimulationControl } from './control/RiskSimulationControl.ts';
import type { PlanningSubzone } from './entity/PlanningSubzone.ts';
import type { RiskAssessment } from './entity/RiskAssessment.ts';
import type { DengueCluster } from './entity/DengueCluster.ts';
import type { PublicDataSnapshot } from './services/ApprovedPublicDataServiceBoundary.ts';
import { clustersForSubzone } from './control/clustersForSubzone.ts';

export type Screen = 'home' | 'map' | 'result' | 'simulation' | 'prevention' | 'dataUnavailable';

export type AppProps = {
  locationControl?: LocationRiskControl;
  mapControl?: RiskMapControl;
  preventionControl?: PreventionGuidanceControl;
  simulationControl?: RiskSimulationControl;
};

const defaultMapControl = new RiskMapControl();

export default function App(props: AppProps = {}) {
  let mapControl = props.mapControl;
  if (mapControl === undefined) {
    mapControl = defaultMapControl;
  }

  const [screen, setScreen] = useState<Screen>('home');
  const [subzone, setSubzone] = useState<PlanningSubzone | null>(null);
  const [assessment, setAssessment] = useState<RiskAssessment | null>(null);
  const [snapshot, setSnapshot] = useState<PublicDataSnapshot | null>(null);
  const [resultOrigin, setResultOrigin] = useState<'home' | 'map'>('home');
  const [unavailableTitle, setUnavailableTitle] = useState('Risk assessment unavailable');

  function clearAssessment() {
    setSubzone(null);
    setAssessment(null);
    setSnapshot(null);
  }

  function goHome() {
    clearAssessment();
    setScreen('home');
  }

  function openMap() {
    setScreen('map');
  }

  function openPrevention() {
    setScreen('prevention');
  }

  function returnToAssessment() {
    setScreen('result');
  }

  function showDataUnavailable() {
    clearAssessment();
    setUnavailableTitle('Risk assessment unavailable');
    setScreen('dataUnavailable');
  }

  function showAssessment(
    selectedSubzone: PlanningSubzone,
    selectedAssessment: RiskAssessment,
    originalSnapshot: PublicDataSnapshot | undefined,
    fromScreen: 'home' | 'map',
  ) {
    if (selectedAssessment.subzoneId !== selectedSubzone.subzoneId) {
      showDataUnavailable();
      return;
    }
    setSubzone(selectedSubzone);
    setAssessment(selectedAssessment);

    if (originalSnapshot === undefined) {
      setSnapshot(null);
    } else {
      setSnapshot(originalSnapshot);
    }

    setResultOrigin(fromScreen);
    setScreen('result');
  }

  function showHomeAssessment(selectedSubzone: PlanningSubzone, selectedAssessment: RiskAssessment, snapshot?: PublicDataSnapshot) {
    showAssessment(selectedSubzone, selectedAssessment, snapshot, 'home');
  }

  function showMapAssessment(id: string, selection?: MapAssessmentSelection) {
    if (!selection || selection.subzone.subzoneId !== id) {
      showDataUnavailable();
      return;
    }
    showAssessment(selection.subzone, selection.assessment, selection.snapshot, 'map');
  }

  function openSimulation() {
    if (!assessment || !snapshot || !props.simulationControl) {
      setUnavailableTitle('Simulation unavailable');
      setScreen('dataUnavailable');
      return;
    }
    setScreen('simulation');
  }

  function showScreen() {
    switch (screen) {
      case 'home':
        if (!props.locationControl) {
          return <DataUnavailableBoundary title="Location search unavailable" onOpenMap={openMap} />;
        }
        return (
          <HomePageBoundary
            control={props.locationControl}
            onAssessmentReady={showHomeAssessment}
            onDataUnavailable={showDataUnavailable}
            onOpenMap={openMap}
            onOpenPrevention={openPrevention}
          />
        );

      case 'map':
        return <RiskMapBoundary control={mapControl} onRequestAssessment={showMapAssessment} />;

      case 'result': {
        if (!subzone || !assessment) {
          return <DataUnavailableBoundary title="Risk assessment unavailable" onHome={goHome} />;
        }

        let clusters: DengueCluster[] | undefined;
        if (snapshot) {
          clusters = clustersForSubzone(snapshot.dengueClusters, subzone);
        }

        return (
          <RiskResultBoundary
            subzone={subzone}
            assessment={assessment}
            clusters={clusters}
            onSimulate={openSimulation}
            onBack={() => setScreen(resultOrigin)}
          />
        );
      }

      case 'simulation':
        if (!assessment || !snapshot || !props.simulationControl) {
          return <DataUnavailableBoundary title="Simulation unavailable" onHome={goHome} />;
        }
        return (
          <section>
            <button className="secondary" onClick={returnToAssessment}>Back to assessment</button>
            <SimulationBoundary baseline={assessment} snapshot={snapshot} simulationControl={props.simulationControl} />
          </section>
        );

      case 'prevention':
        if (!props.preventionControl) {
          return <DataUnavailableBoundary title="Prevention guidance unavailable" onHome={goHome} onOpenMap={openMap} />;
        }
        return <PreventionGuidanceBoundary control={props.preventionControl} onBack={goHome} />;

      case 'dataUnavailable':
        if (subzone && assessment) {
          return (
            <DataUnavailableBoundary
              title={unavailableTitle}
              onHome={goHome}
              onOpenMap={openMap}
              onReturnToAssessment={returnToAssessment}
            />
          );
        }
        return (
          <DataUnavailableBoundary
            title={unavailableTitle}
            onHome={goHome}
            onOpenMap={openMap}
          />
        );
    }
  }

  const homeActive = screen !== 'map' && screen !== 'prevention';
  const mapActive = screen === 'map';
  const preventionActive = screen === 'prevention';

  return (
    <div className="app-shell">
      <a className="skip-link" href="#main-content">Skip to main content</a>
      <header className="site-header">
        <div className="header-inner">
          <button className="brand" aria-label="DengueAhead SG home" onClick={goHome}>
            <span className="brand-mark" aria-hidden="true">D</span>
            DengueAhead SG
          </button>
          <nav className="main-nav" aria-label="Main navigation">
            <button
              className={homeActive ? 'active' : ''}
              aria-current={homeActive ? 'page' : undefined}
              onClick={goHome}
            >
              Home
            </button>
            <button
              className={mapActive ? 'active' : ''}
              aria-current={mapActive ? 'page' : undefined}
              onClick={openMap}
            >
              Risk Map
            </button>
            <button
              className={preventionActive ? 'active' : ''}
              aria-current={preventionActive ? 'page' : undefined}
              onClick={openPrevention}
            >
              Prevention Guidance
            </button>
          </nav>
        </div>
      </header>
      <main className="site-main" id="main-content" tabIndex={-1}>
        {screen === 'result' || screen === 'simulation'
          ? <BundledFallbackNotice snapshot={snapshot} />
          : null}
        {showScreen()}
      </main>
      <footer className="site-footer">
        <p>
          Map: <a href="https://www.onemap.gov.sg/" target="_blank" rel="noopener noreferrer">OneMap</a>
          {' '}(<a href="https://www.sla.gov.sg/" target="_blank" rel="noopener noreferrer">SLA</a>).
          {' '}Data: <a href="https://data.gov.sg/" target="_blank" rel="noopener noreferrer">data.gov.sg</a>
          {' '}under the <a href="https://data.gov.sg/open-data-licence" target="_blank" rel="noopener noreferrer">Singapore Open Data Licence</a>.
        </p>
        <p>Not an official NEA forecast or medical advice.</p>
      </footer>
    </div>
  );
}
