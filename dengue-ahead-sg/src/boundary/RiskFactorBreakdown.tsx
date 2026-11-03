// - Show the selected area's factor readings and points together.
// - Keep short explanations visible, without extra dropdowns or factor scores.
// - Reuse the existing icons and calculation popup.
// - Display the assessment's existing values; do not recalculate risk.

import type { RiskFactorContribution } from '../entity/RiskFactorContribution.ts';
import { RiskFactorType } from '../entity/enums.ts';
import DashboardIcon from './DashboardIcon.tsx';
import RiskMethodPopup from './RiskMethodPopup.tsx';

const factors = {
  [RiskFactorType.DengueClusters]: { label: 'Nearby clusters', icon: 'shield' },
  [RiskFactorType.HighAedesArea]: { label: 'High-Aedes overlap', icon: 'mosquito' },
  [RiskFactorType.PopulationDensity]: { label: 'Population density', icon: 'people' },
  [RiskFactorType.Humidity]: { label: 'Humidity', icon: 'cloud' },
  [RiskFactorType.LaggedRainfall]: { label: 'Rainfall', icon: 'rain' },
};

function explainReading(item: RiskFactorContribution) {
  const value = item.inputValue;
  switch (item.factorType) {
    case RiskFactorType.Humidity:
      return `${value.toFixed(1)}% humidity · historical comparison.`;
    case RiskFactorType.LaggedRainfall:
      return `${Math.round(value)} mm of rain from 2–3 months ago.`;
    case RiskFactorType.PopulationDensity:
      return `${Math.round(value).toLocaleString('en-SG')} residents/km², compared with other areas.`;
    case RiskFactorType.DengueClusters:
      return `${value} cluster cases nearby.`;
    case RiskFactorType.HighAedesArea:
      return `${Math.round(value * 100)}% of this area overlaps high-Aedes zones.`;
    default:
      return item.explanation;
  }
}

export default function RiskFactorBreakdown({
  contributions = [],
}: {
  contributions?: RiskFactorContribution[];
}) {
  const sorted = [...contributions].sort((a, b) => b.contribution - a.contribution);

  return (
    <section className="score-breakdown" aria-labelledby="factors-heading">
      <div className="breakdown-title">
        <h3 id="factors-heading">Score breakdown</h3>
        <RiskMethodPopup />
      </div>
      {sorted.length === 0 ? (
        <p className="small">Factor details are not available for this assessment.</p>
      ) : (
        <ol aria-label="Risk factor contributions" className="factor-list">
          {sorted.map((item) => (
            <li key={item.factorType}>
              <DashboardIcon name={factors[item.factorType].icon} />
              <div className="factor-title">
                <strong>{factors[item.factorType].label}</strong>
                <span>Adds {item.contribution.toFixed(1)} points</span>
              </div>
              <p>{explainReading(item)}</p>
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}
