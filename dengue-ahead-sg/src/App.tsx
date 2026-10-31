// - Show search, the map, area details and prevention on one dashboard.
// - Keep the original assessment separate from a temporary simulation.
// - Reuse the existing controls and keep keyboard navigation available.

import { useState } from 'react';
import RiskMapBoundary from './boundary/RiskMapBoundary.tsx';
import RiskResultBoundary from './boundary/RiskResultBoundary.tsx';
import SimulationBoundary from './boundary/SimulationBoundary.tsx';
import PreventionGuidanceBoundary from './boundary/PreventionGuidanceBoundary.tsx';
import SelectedAreaPreview from './boundary/SelectedAreaPreview.tsx';
import { RiskMapControl, type MapAssessmentSelection } from './control/RiskMapControl.ts';
import type { LocationRiskControl } from './control/LocationRiskControl.ts';
import type { PreventionGuidanceControl } from './control/PreventionGuidanceControl.ts';
import type { RiskSimulationControl } from './control/RiskSimulationControl.ts';
import { clustersForSubzone } from './control/clustersForSubzone.ts';

export type AppProps = {
  locationControl?: LocationRiskControl;
  mapControl?: RiskMapControl;
  preventionControl?: PreventionGuidanceControl;
  simulationControl?: RiskSimulationControl;
};

const defaultMapControl = new RiskMapControl();

export default function App(props: AppProps = {}) {
  const [selection, setSelection] = useState<MapAssessmentSelection | null>(null);
  const [simulationOpen, setSimulationOpen] = useState(false);
  const [message, setMessage] = useState('');

  function selectArea(id: string, next?: MapAssessmentSelection) {
    setSimulationOpen(false);
    if (!id) {
      setSelection(null);
      setMessage('');
      return;
    }
    if (!next || next.subzone.subzoneId !== id || next.assessment.subzoneId !== id) {
      setSelection(null);
      setMessage('A risk assessment is unavailable for this area. Try another area.');
      return;
    }
    setSelection(next);
    setMessage('');
  }

  function closeSimulation() {
    setSimulationOpen(false);
    requestAnimationFrame(() => document.getElementById('start-simulation')?.focus());
  }

  return (
    <div className="app-shell">
      <a className="skip-link" href="#main-content">
        Skip to main content
      </a>
      <header className="site-header">
        <div className="header-inner">
          <a className="brand" href="#main-content" aria-label="DengueAhead SG dashboard">
            <img className="brand-logo" src="/mosquito-logo.png" alt="" width="48" height="48" />
            DengueAhead SG
          </a>
          <span className="header-description">Singapore dengue risk dashboard</span>
        </div>
      </header>
      <main className="site-main" id="main-content" tabIndex={-1}>
        <RiskMapBoundary
          control={props.mapControl ?? defaultMapControl}
          locationControl={props.locationControl}
          onRequestAssessment={selectArea}
          simulation={
            selection && simulationOpen && props.simulationControl ? (
              <SimulationBoundary
                key={selection.assessment.assessmentId}
                baseline={selection.assessment}
                snapshot={selection.snapshot}
                subzone={selection.subzone}
                simulationControl={props.simulationControl}
                onClose={closeSimulation}
              />
            ) : null
          }
        >
          <SelectedAreaPreview
            selection={selection}
            canSimulate={Boolean(props.simulationControl)}
            onSimulate={() => setSimulationOpen(true)}
            message={message}
          />
        </RiskMapBoundary>

        {!simulationOpen &&
          (selection ? (
            <RiskResultBoundary
              key={selection.assessment.assessmentId}
              embedded
              subzone={selection.subzone}
              assessment={selection.assessment}
              clusters={clustersForSubzone(selection.snapshot.dengueClusters, selection.subzone)}
              preventionControl={props.preventionControl}
            />
          ) : (
            <PreventionGuidanceBoundary control={props.preventionControl} />
          ))}
        {!simulationOpen && selection && (
          <details className="card full-checklist">
            <summary>View the full NEA prevention checklist</summary>
            <PreventionGuidanceBoundary control={props.preventionControl} showAllInitially />
          </details>
        )}
      </main>
      <footer className="site-footer">
        <p>
          Map:{' '}
          <a href="https://www.onemap.gov.sg/" target="_blank" rel="noopener noreferrer">
            OneMap
          </a>{' '}
          (
          <a href="https://www.sla.gov.sg/" target="_blank" rel="noopener noreferrer">
            SLA
          </a>
          ). Data:{' '}
          <a href="https://data.gov.sg/" target="_blank" rel="noopener noreferrer">
            data.gov.sg
          </a>{' '}
          under the{' '}
          <a href="https://data.gov.sg/open-data-licence" target="_blank" rel="noopener noreferrer">
            Singapore Open Data Licence
          </a>
          .
        </p>
        <p>Not an official NEA forecast or medical advice.</p>
      </footer>
    </div>
  );
}
