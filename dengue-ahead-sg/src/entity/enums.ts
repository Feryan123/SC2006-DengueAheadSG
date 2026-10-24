/**
 * Traces to: enumeration types referenced by <<entity>> attributes in class diagram
 * Related use case(s): UC-1, UC-3, UC-4 (via the entities below)
 *
 * NOTE: the class diagram names these enums but does not list their values.
 * The values below are the team default; add matching <<enumeration>> boxes to the diagram.
 *
 * ENUMS:
 * - QueryType — kind of location query; used by LocationQuery.queryType
 * - ValidationStatus — validation outcome of a query; used by LocationQuery.validationStatus
 * - DataConfidence — confidence in assessment input data; used by RiskAssessment.dataConfidence
 * - AssessmentType — baseline vs simulated; used by RiskAssessment.assessmentType
 * - RiskFactorType — risk factor category; used by RiskFactorContribution.factorType
 * - ContributionLevel — qualitative contribution level; used by RiskFactorContribution.contributionLevel
 * - AdjustableRiskFactorType — factors the user may adjust; used by ScenarioAdjustment.factorType
 * - AdjustmentLevel — how much a factor is adjusted; used by ScenarioAdjustment.adjustmentLevel
 * - RiskLevel — risk category; used by RiskAssessment.riskLevel (diagram spells it "Risklevel")
 *
 * Non-enum diagram types (Integer, Decimal, DateTime, Geometry) are mapped in types.ts.
 *
 * Relationships: n/a
 */

// `enum` is not allowed with "erasableSyntaxOnly", so each enum is a
// const object + a union type with the same name.
// Values agreed as a team default; mirror them as <<enumeration>> boxes in the class diagram.

export const QueryType = {
  Address: 'ADDRESS',
  PostalCode: 'POSTAL_CODE',
} as const;
export type QueryType = (typeof QueryType)[keyof typeof QueryType];

export const ValidationStatus = {
  Pending: 'PENDING',
  Valid: 'VALID',
  Invalid: 'INVALID',
  OutsideSingapore: 'OUTSIDE_SINGAPORE',
} as const;
export type ValidationStatus = (typeof ValidationStatus)[keyof typeof ValidationStatus];

export const DataConfidence = {
  High: 'HIGH',
  Medium: 'MEDIUM',
  Low: 'LOW',
} as const;
export type DataConfidence = (typeof DataConfidence)[keyof typeof DataConfidence];

export const AssessmentType = {
  Baseline: 'BASELINE',
  Simulated: 'SIMULATED',
} as const;
export type AssessmentType = (typeof AssessmentType)[keyof typeof AssessmentType];

export const RiskFactorType = {
  DengueClusters: 'DENGUE_CLUSTERS',
  HighAedesArea: 'HIGH_AEDES_AREA',
  PopulationDensity: 'POPULATION_DENSITY',
  Humidity: 'HUMIDITY',
  LaggedRainfall: 'LAGGED_RAINFALL',
} as const;
export type RiskFactorType = (typeof RiskFactorType)[keyof typeof RiskFactorType];

export const ContributionLevel = {
  Low: 'LOW',
  Moderate: 'MODERATE',
  High: 'HIGH',
} as const;
export type ContributionLevel = (typeof ContributionLevel)[keyof typeof ContributionLevel];

export const AdjustableRiskFactorType = {
  LaggedRainfall: RiskFactorType.LaggedRainfall,
  Humidity: RiskFactorType.Humidity,
  HighAedesArea: RiskFactorType.HighAedesArea,
} as const;
export type AdjustableRiskFactorType = (typeof AdjustableRiskFactorType)[keyof typeof AdjustableRiskFactorType];

export const AdjustmentLevel = {
  Decrease: 'DECREASE',
  NoChange: 'NO_CHANGE',
  Increase: 'INCREASE',
} as const;
export type AdjustmentLevel = (typeof AdjustmentLevel)[keyof typeof AdjustmentLevel];

export const RiskLevel = {
  Low: 'LOW',
  Moderate: 'MODERATE',
  High: 'HIGH',
  VeryHigh: 'VERY_HIGH',
} as const;
export type RiskLevel = (typeof RiskLevel)[keyof typeof RiskLevel];

export const DatasetStatus = { 
  Fresh: 'FRESH', 
  Stale: 'STALE', 
  Failed: 'FAILED' 
} as const;
export type DatasetStatus = (typeof DatasetStatus)[keyof typeof DatasetStatus];
