// - Explain the existing risk index in a small information popup.
// - Read the weights from the same settings used by the calculators.
// - Link to the research recorded in the team's planning notes.
// - Use the browser's dialog for focus handling and Escape-to-close.

import { useRef } from 'react';
import { FACTOR_RANK, rankSumWeights } from '../control/riskModelConfig.ts';
import { RiskFactorType } from '../entity/enums.ts';

const factors = [
  { type: RiskFactorType.DengueClusters, label: 'Dengue clusters nearby' },
  { type: RiskFactorType.HighAedesArea, label: 'High-Aedes area overlap' },
  { type: RiskFactorType.PopulationDensity, label: 'Population density' },
  { type: RiskFactorType.Humidity, label: 'Humidity' },
  { type: RiskFactorType.LaggedRainfall, label: 'Rainfall 2–3 months ago' },
];
const weights = rankSumWeights(FACTOR_RANK);

export default function RiskMethodPopup() {
  const dialog = useRef<HTMLDialogElement>(null);

  return (
    <>
      <button
        type="button"
        className="text-button method-link"
        onClick={() => dialog.current?.showModal()}
      >
        How is this calculated?
      </button>
      <dialog
        ref={dialog}
        className="method-dialog"
        aria-labelledby="method-title"
        onClick={(event) => {
          if (event.target === dialog.current) dialog.current.close();
        }}
      >
        <form method="dialog">
          <button className="dialog-close" aria-label="Close calculation explanation">
            ×
          </button>
          <h2 id="method-title">How is risk calculated?</h2>
          <p>We combine five factor scores into a risk index out of 100.</p>
          <div className="method-weights">
            <h3>
              Default weights <span className="muted small">· all five factors available</span>
            </h3>
            <ul>
              {factors.map((factor) => (
                <li key={factor.type}>
                  <span>{factor.label}</span>
                  <span className="method-track" aria-hidden="true">
                    <span style={{ width: `${weights[factor.type] * 100}%` }} />
                  </span>
                  <strong>{(weights[factor.type] * 100).toFixed(1)}%</strong>
                </li>
              ))}
            </ul>
          </div>
          <div className="method-explanation">
            <p>Each factor is scored from 0–100, then weighted and added.</p>
            <p>
              Local factors are compared with other subzones; weather is compared with historical
              monthly averages.
            </p>
          </div>
          <p className="small muted">
            Missing optional factors adjust the remaining weights. Missing dengue-cluster data
            prevents an assessment.
          </p>
          <h3>About the research</h3>
          <p className="small">
            Research informs the factors and weighting method; it does not validate this exact
            score.
          </p>
          <ul className="research-links">
            <li>
              <a
                href="https://doi.org/10.1016/0030-5073(81)90015-5"
                target="_blank"
                rel="noopener noreferrer"
              >
                Weighting method (1981) ↗
              </a>
            </li>
            <li>
              <a
                href="https://www.nature.com/articles/s43247-024-01639-6"
                target="_blank"
                rel="noopener noreferrer"
              >
                Population &amp; climate ↗
              </a>
            </li>
            <li>
              <a
                href="https://www.mdpi.com/2075-4450/16/5/513"
                target="_blank"
                rel="noopener noreferrer"
              >
                Humidity &amp; mosquitoes ↗
              </a>
            </li>
          </ul>
          <p className="small muted method-note">
            A project risk index, not an infection probability or official NEA forecast.
          </p>
          <div className="dialog-actions">
            <button className="primary">Got it</button>
          </div>
        </form>
      </dialog>
    </>
  );
}
