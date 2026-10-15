
/*
 * This file shows one screen at a time. PLACEHOLDER screens
 * replaced with real components when they are ready.
 */

import { useState } from 'react';
import RiskMapBoundary from './boundary/RiskMapBoundary.tsx';

export default function App() {
  const [screen, setScreen] = useState('home');
  const [selectedId, setSelectedId] = useState('');

  // Open the result screen for the selected area.
  function requestAssessment(subzoneId: string) {
    setSelectedId(subzoneId);

    // TODO: Get and save the risk assessment and subzone.
    // TODO: Pass them to the result screen and later to simulation.
    // TODO: Show the dataUnavailable screen if loading fails.
    setScreen('result');
  }

  // Decide which screen to show.
  function showScreen() {
    switch (screen) {
      case 'home':
        // PLACEHOLDER: Import HomePageBoundary and add its navigation callbacks.
        return <p>Home screen coming soon.</p>;

      case 'map':
        return <RiskMapBoundary onRequestAssessment={requestAssessment} />;

      case 'result':
        // PLACEHOLDER: Import RiskResultBoundary and pass the assessment and subzone.
        return <p>Risk result for {selectedId} coming soon.</p>;

      case 'simulation':
        // PLACEHOLDER: Import SimulationBoundary and pass the baseline assessment.
        return <p>Simulation screen coming soon.</p>;

      case 'prevention':
        // PLACEHOLDER: Import PreventionGuidanceBoundary.
        return <p>Prevention screen coming soon.</p>;

      case 'invalidLocation':
        // PLACEHOLDER: Show the search error and let the visitor try again.
        return <p>Invalid location. Please search again.</p>;

      case 'dataUnavailable':
        // PLACEHOLDER: Show the actual error and a way to retry.
        return <p>Data is unavailable. Please try again later.</p>;

      default:
        return <p>Page not found.</p>;
    }
  }

  return (
    <div className="app-shell">
      <header className="site-header">
        <h1>DengueAhead SG</h1>

        <nav className="main-nav" aria-label="Main navigation">
          <button onClick={() => setScreen('home')}>Home</button>
          <button onClick={() => setScreen('map')}>Risk Map</button>
          <button onClick={() => setScreen('prevention')}>Prevention</button>
        </nav>
      </header>

      <main className="site-main">{showScreen()}</main>

      <footer className="site-footer">
        Not an official NEA forecast or medical advice.
      </footer>
    </div>
  );
}
