// - Show the selected area's risk level and its top three factors.
// - Open the result screen when a risk assessment is available.
// - Ticket #22: Explore Risk Map.

import { RiskFactorType } from '../entity/enums.ts';
import type { RiskAssessment } from '../entity/RiskAssessment.ts';
import type { RiskFactorContribution } from '../entity/RiskFactorContribution.ts';
import type { SubzoneBoundary } from '../services/SubzoneBoundaryService.ts';
import { getRiskLevelStyle } from './riskLevelStyle.ts';

const factorNames = {
  [RiskFactorType.DengueClusters]: 'Dengue clusters',
  [RiskFactorType.HighAedesArea]: 'High-Aedes areas',
  [RiskFactorType.PopulationDensity]: 'Population density',
  [RiskFactorType.Humidity]: 'Humidity',
  [RiskFactorType.LaggedRainfall]: 'Lagged rainfall',
};

export function createSubzonePopup(
  zone: SubzoneBoundary,
  assessment: RiskAssessment | undefined,
  factors: RiskFactorContribution[],
  onRequestAssessment: (subzoneId: string) => void,
) {
  const popup = document.createElement('div');
  popup.className = 'subzone-popup';
  const title = document.createElement('h3');
  title.textContent = zone.name;
  const style = getRiskLevelStyle(assessment?.riskLevel);
  const badge = document.createElement('span');
  badge.className = 'risk-pill';
  badge.textContent = style.label;
  badge.style.backgroundColor = style.colour;
  badge.style.color = style.textColour;
  const index = document.createElement('p');
  index.textContent = assessment ? `Risk index: ${assessment.riskIndex.toFixed(1)}` : 'No risk assessment is available for this area.';
  popup.append(title, badge, index);

  const list = document.createElement('ol');
  for (const factor of factors) {
    const item = document.createElement('li');
    // Plain text keeps names and upstream values from being treated as HTML.
    item.textContent = `${factorNames[factor.factorType] ?? 'Other factor'}: ${factor.contribution.toFixed(1)} points`;
    list.append(item);
  }
  if (factors.length > 0) {
    const heading = document.createElement('strong');
    heading.textContent = 'Main risk factors';
    popup.append(heading, list);
  } else if (assessment) {
    const message = document.createElement('p');
    message.textContent = 'Factor details are unavailable.';
    popup.append(message);
  }

  const resultButton = document.createElement('button');
  resultButton.type = 'button';
  resultButton.className = 'secondary';
  resultButton.textContent = 'View full assessment';
  resultButton.disabled = !assessment;
  resultButton.addEventListener('click', () => {
    if (assessment) onRequestAssessment(zone.subzoneId);
  });
  popup.append(resultButton);
  return popup;
}
