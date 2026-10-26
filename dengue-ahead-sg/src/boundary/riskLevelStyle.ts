// - Keep the same risk colours on the map and result screen.
// - Darker colours mean higher risk. Labels also show the level.
// - Ticket #20: Explore Risk Map / Assess Location Risk.

import { RiskLevel } from '../entity/enums.ts';

export const riskLevelStyle = {
  [RiskLevel.Low]: { label: 'Low', colour: '#eff3ff', textColour: '#173b55' },
  [RiskLevel.Moderate]: { label: 'Moderate', colour: '#bdd7e7', textColour: '#173b55' },
  [RiskLevel.High]: { label: 'High', colour: '#6baed6', textColour: '#173b55' },
  [RiskLevel.VeryHigh]: { label: 'Very High', colour: '#2171b5', textColour: '#ffffff' },
};

export function getRiskLevelStyle(level?: RiskLevel) {
  const unavailable = { label: 'Risk unavailable', colour: '#d9d9d9', textColour: '#333333' };
  return level ? riskLevelStyle[level] ?? unavailable : unavailable;
}
