//Code handles navigation and the shared page layout. Sample screens are PLACEHOLDERS until the real components are ready.

import { useState } from 'react';
import RiskMapBoundary from './boundary/RiskMapBoundary.tsx';

export default function App() {
  const [screen, setScreen] = useState('home');
  const [selectedId, setSelectedId] = useState('');
  const [query, setQuery] = useState('');

  // Open the result for the selected area.
  function requestAssessment(subzoneId: string) {
    setSelectedId(subzoneId);
    // TODO: Get and save the real assessment and subzone for the Result screen.
    // TODO: Pass the baseline assessment to SimulationBoundary.
    // TODO: Show dataUnavailable if the assessment cannot be loaded.
    setScreen('result');
  }

  // PLACEHOLDER: This only previews the error screens; it does not check addresses.
  function checkLocation() {
    setScreen(query.trim() ? 'dataUnavailable' : 'invalidLocation');
    // TODO: Replace with LocationRiskControl.assessLocation() and handle its result.
  }

  function showScreen() {
    switch (screen) {
      case 'home':
      case 'invalidLocation':
        // PLACEHOLDER: Replace with HomePageBoundary when ready.
        return (
          <>
            <div className="hero-grid">
              <div>
                <h1>Check dengue risk for a<br />Singapore location</h1>
                <p className="muted">Enter a Singapore address or postal code to see its Planning Subzone, Early-Warning Risk Level and contributing factors.</p>
                <div className="search-row">
                  <input aria-label="Singapore address or postal code" placeholder="Enter Singapore address or postal code" value={query} onChange={(event) => setQuery(event.target.value)} />
                  <button className="primary" onClick={checkLocation}>Check Risk</button>
                </div>
                {screen === 'invalidLocation' ? (
                  <p className="error-text">PLACEHOLDER: Enter a valid Singapore address or postal code.</p>
                ) : (
                  <p className="hint">Enter a Singapore address or postal code</p>
                )}
              </div>
              {screen === 'invalidLocation' ? (
                <div className="card hero-card">
                  <p className="eyebrow">Location not recognised</p>
                  <h2 className="error-text">Outside Singapore</h2>
                  <p className="muted">PLACEHOLDER: Location validation has not been connected yet.</p>
                </div>
              ) : (
                <div className="card hero-card">
                  <p className="eyebrow">What you'll receive</p>
                  <h2 className="teal-text">14-day</h2>
                  <p>14-day assessment prediction</p>
                  <p className="muted small">Risk Level • Data Confidence • Assessment time</p>
                </div>
              )}
            </div>
            <h3 className="section-heading">What you can do</h3>
            <div className="feature-grid">
              <div className="card feature-card">
                <h3>Check location risk</h3>
                <p>Enter an address or postal code to see the Risk Level for its Planning Subzone.</p>
              </div>
              <button className="card feature-card card-button" onClick={() => setScreen('map')}>
                <strong>Explore Singapore Risk Map</strong>
                <span>Search Planning Subzones and review risk bands, confirmed clusters and high-Aedes areas.</span>
              </button>
              <button className="card feature-card card-button" onClick={() => setScreen('prevention')}>
                <strong>View prevention guidance</strong>
                <span>Read practical steps for reducing mosquito breeding and protecting yourself.</span>
              </button>
            </div>
          </>
        );

      case 'map':
        return <RiskMapBoundary onRequestAssessment={requestAssessment} />;

      case 'result':
        // PLACEHOLDER: Replace with RiskResultBoundary and pass real assessment data.
        return (
          <>
            <p className="eyebrow teal-text">Design preview • Not a real risk assessment</p>
            <h1>{selectedId || 'Tampines East'}</h1>
            <p className="muted">Planning Subzone • 14-day assessment prediction</p>
            <div className="notice">PLACEHOLDER: Risk data and confidence have not been calculated.</div>
            <div className="result-grid">
              <div className="card result-card">
                <p className="eyebrow">Early-Warning Risk Level</p>
                <h2>—</h2>
                <span className="pill">Confidence unavailable</span>
                <p className="muted">The real Risk Level will appear after the assessment is connected.</p>
              </div>
              <div className="card result-card">
                <h3>Risk Factors and contributions</h3>
                {['Recent rainfall', 'High-Aedes pressure', 'National dengue trend', 'Population exposure'].map((factor) => (
                  <div className="factor-row" key={factor}>
                    <span>{factor}</span><div className="empty-bar" /><small>Pending</small>
                  </div>
                ))}
              </div>
            </div>
            <div className="card cluster-card"><h3>Confirmed dengue cluster context</h3><p className="muted">PLACEHOLDER: Cluster information is not connected yet.</p></div>
            <div className="actions">
              <button className="secondary" onClick={() => setScreen('home')}>Check another location</button>
              <button className="primary" onClick={() => setScreen('map')}>Open Risk Map</button>
            </div>
          </>
        );

      case 'prevention':
        // PLACEHOLDER: Replace with PreventionGuidanceBoundary and official content.
        return (
          <>
            <h1>Prevention Guidance</h1>
            <p className="muted">Read practical dengue-prevention actions for any Singapore household.</p>
            <div className="prevention-grid">
              <div className="card advice"><span className="advice-icon">💧</span><div><h3>Remove stagnant water</h3><p>Empty, scrub and overturn containers that can collect water.</p></div></div>
              <div className="card advice"><span className="advice-icon">◈</span><div><h3>Use mosquito repellent</h3><p>Follow the product label, especially during peak biting times.</p></div></div>
              <div className="card advice"><span className="advice-icon">▦</span><div><h3>Maintain window screens</h3><p>Repair gaps in screens and keep mosquitoes out.</p></div></div>
              <div className="card advice"><span className="advice-icon">♙</span><div><h3>Wear protective clothing</h3><p>Choose long sleeves and long trousers where appropriate.</p></div></div>
              <div className="card advice"><span className="advice-icon">✚</span><div><h3>Seek medical attention</h3><p>Consult a doctor if you develop dengue-like symptoms.</p></div></div>
            </div>
            <div className="card guidance-note"><strong>Public prevention guidance</strong><p className="muted">PLACEHOLDER: Replace sample advice with approved checklist content and source links.</p></div>
          </>
        );

      case 'dataUnavailable':
        // PLACEHOLDER: The real screen will explain which required data failed.
        return (
          <>
            <p className="eyebrow teal-text">Risk assessment</p>
            <h1>Risk Assessment unavailable</h1>
            <p className="muted">The required public data is not available yet.</p>
            <div className="notice">PLACEHOLDER: Required data sources have not been connected.</div>
            <div className="card unavailable-card">
              <h3>We can't generate a current Risk Assessment</h3>
              <p className="muted">No risk level has been produced. You can return Home or open the Risk Map.</p>
              <span className="pill">Confidence: Unavailable</span>
            </div>
            <div className="actions centered">
              <button className="secondary" onClick={() => setScreen('home')}>Return Home</button>
              <button className="primary" onClick={() => setScreen('map')}>Open Risk Map</button>
            </div>
          </>
        );

      case 'simulation':
        // PLACEHOLDER: Import SimulationBoundary and pass the baseline assessment.
        return <div className="card result-card"><h1>Simulation</h1><p className="muted">PLACEHOLDER: Simulation screen is not connected yet.</p></div>;

      default:
        return <p>Page not found.</p>;
    }
  }

  return (
    <div className="app-shell">
      <header className="site-header">
        <div className="header-inner">
          <button className="brand" onClick={() => setScreen('home')}><span className="brand-mark">D</span>DengueAhead SG</button>
          <nav className="main-nav" aria-label="Main navigation">
            <button className={screen === 'home' || screen === 'invalidLocation' || screen === 'dataUnavailable' || screen === 'result' ? 'active' : ''} onClick={() => setScreen('home')}>Home</button>
            <button className={screen === 'map' ? 'active' : ''} onClick={() => setScreen('map')}>Risk Map</button>
            <button className={screen === 'prevention' ? 'active' : ''} onClick={() => setScreen('prevention')}>Prevention Guidance</button>
          </nav>
        </div>
      </header>
      <main className="site-main">{showScreen()}</main>
      <footer className="site-footer">Not an official NEA forecast or medical advice.</footer>
    </div>
  );
}
