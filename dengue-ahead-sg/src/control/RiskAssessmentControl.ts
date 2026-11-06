/**
 * Traces to: RiskAssessmentControl (<<control>>) in class diagram
 * Related use case(s): UC-1 Assess Location Risk, UC-2 Explore Risk Map, UC-4 Simulate Risk Scenario · Ticket 7
 *
 * Combines the 5 RiskFactorCalculator strategies into one RiskAssessment per subzone.
 * Weights: rank-sum (riskModelConfig.ts); missing factors are dropped and the rest reweighted.
 * Returns null (not an error) when a core factor is unavailable.
 *
 * Relationships (dependencies):
 * - Called by LocationRiskControl, RiskMapControl (assessAll), RiskSimulationControl
 * - Uses RiskFactorCalculator (Strategy) ×5
 * - Creates RiskAssessment and RiskFactorContribution
 */
import { AssessmentType, ContributionLevel, DataConfidence, DatasetStatus, RiskLevel, RiskFactorType } from '../entity/enums.ts';
import type { PlanningSubzone } from '../entity/PlanningSubzone.ts';
import type { RiskAssessment } from '../entity/RiskAssessment.ts';
import type { RiskFactorContribution } from '../entity/RiskFactorContribution.ts';
import type { Decimal } from '../entity/types.ts';
import type { PublicDataSnapshot } from '../services/ApprovedPublicDataServiceBoundary.ts';
import type { MapAssessmentControl } from './RiskMapControl.ts';
import { CONTRIBUTION_BANDS, CORE_FACTORS, FACTOR_RANK, RISK_BANDS, rankSumWeights } from './riskModelConfig.ts';
import type { FactorResult, RiskFactorCalculator } from './calculators/RiskFactorCalculator.ts';
import { DengueClusterCalculator } from './calculators/DengueClusterCalculator.ts';
import { HighAedesAreaCalculator } from './calculators/HighAedesAreaCalculator.ts';
import { PopulationDensityCalculator } from './calculators/PopulationDensityCalculator.ts';
import { HumidityCalculator } from './calculators/HumidityCalculator.ts';
import { LaggedRainfallCalculator } from './calculators/LaggedRainfallCalculator.ts';

export const HORIZON_DAYS = 14;

export interface GenerateAssessmentOptions {
  assessmentType?: AssessmentType;   // defaults to BASELINE
}

export class RiskAssessmentControl implements MapAssessmentControl {
  readonly calculators: RiskFactorCalculator[];
  readonly weights: Record<RiskFactorType, number>;

  /** `weights` defaults to the rank-sum weights; other weights are only used by the sensitivity analysis (Ticket 35). */
  constructor(calculators: RiskFactorCalculator[] = [
    new DengueClusterCalculator(), new HighAedesAreaCalculator(), new PopulationDensityCalculator(),
    new HumidityCalculator(), new LaggedRainfallCalculator(),
  ], weights: Record<RiskFactorType, number> = rankSumWeights(FACTOR_RANK)) {
    this.calculators = calculators;
    this.weights = weights;
  }

  async generateAssessment(
    subzoneId: string,
    snapshot: PublicDataSnapshot,
    options: GenerateAssessmentOptions = {},
  ): Promise<RiskAssessment | null> {
    const subzone = snapshot.subzones?.find(s => s.subzoneId === subzoneId);
    if (!subzone) return null;

    if (snapshot.datasets?.dengueClusters?.status === DatasetStatus.Failed) return null;

    const contributions = this.calculateContributions(subzone, snapshot); 
    if (contributions === null) return null;
    const riskIndex = this.calculateRiskIndex(contributions);
    const riskLevel = this.determineRiskLevel(riskIndex);

    return {
      assessmentId: crypto.randomUUID(),
      generatedAt: new Date().toISOString(),
      dataTimeStamp: snapshot.generatedAt,
      horizonDays: HORIZON_DAYS,
      dataConfidence: this.determineDataConfidence(contributions, snapshot),
      assessmentType: options.assessmentType ?? AssessmentType.Baseline, subzoneId, contributions, riskIndex, riskLevel,
    };
  }

  async assessAll(snapshot: PublicDataSnapshot): Promise<RiskAssessment[]> {
    const subzones = snapshot.subzones ?? [];
    const results = await Promise.all(subzones.map(sz => this.generateAssessment(sz.subzoneId, snapshot)));

    return results.filter((a): a is RiskAssessment => a !== null);
  }

  /** null when a CORE factor is missing. */
  calculateContributions(subzone: PlanningSubzone, snapshot: PublicDataSnapshot): RiskFactorContribution[] | null {
    const results = this.calculators
      .map(calc => ({ factorType: calc.factorType, result: calc.calculate(subzone, snapshot) }))
      .filter((r): r is { factorType: RiskFactorType; result: FactorResult } => r.result !== null);

    const present = new Set(results.map(r => r.factorType));
    if (CORE_FACTORS.some(f => !present.has(f))) return null;

    const availableWeight = results.reduce((sum, r) => sum + this.weights[r.factorType], 0);

    return results.map(({ factorType, result }) => {
      const weight = this.weights[factorType];
      return {
        factorType,
        inputValue: result.inputValue,
        contribution: (result.score * weight) / availableWeight,
        contributionLevel: this.determineContributionLevel(result.score),
        explanation: this.explain(factorType, result),
      };
    });
  }

private explain(factorType: RiskFactorType, { inputValue, score }: FactorResult): string {
  const s = Math.round(score);
  switch(factorType){
    case RiskFactorType.Humidity:
      return `Humidity ${inputValue.toFixed(1)}% scores ${s}/100 against the 2014–2025 normal`;
    case RiskFactorType.LaggedRainfall:
      return `Rainfall of ${Math.round(inputValue)} mm scores ${s}/100 against the 1991–2020 normal`;
    case RiskFactorType.DengueClusters:
      return `${inputValue} cluster cases nearby scores ${s}/100 among subzones`;
    case RiskFactorType.HighAedesArea:
      return `${Math.round(inputValue * 100)}% overlap with high-Aedes areas scores ${s}/100 among subzones`;
    case RiskFactorType.PopulationDensity:
      return `${Math.round(inputValue).toLocaleString('en-SG')} residents/km² scores ${s}/100 among subzones`;
    default:
      return `${factorType} ${inputValue} scores ${s}/100`;
  }
}

  calculateRiskIndex(contributions: RiskFactorContribution[]): Decimal {
    const sum = contributions.reduce((total, c) => total + c.contribution, 0);
    const capped = Math.min(100, Math.max(0, sum));
    return Math.round(capped * 10) / 10;
  }

  determineRiskLevel(riskIndex: Decimal): RiskLevel {
    if(riskIndex < RISK_BANDS.moderateFrom) return RiskLevel.Low;
    if(riskIndex < RISK_BANDS.highFrom) return RiskLevel.Moderate;
    if(riskIndex < RISK_BANDS.veryHighFrom) return RiskLevel.High;
    return RiskLevel.VeryHigh;
  }

  determineContributionLevel(score: number): ContributionLevel {
    if(score < CONTRIBUTION_BANDS.moderateFrom) return ContributionLevel.Low;
    if(score < CONTRIBUTION_BANDS.highFrom) return ContributionLevel.Moderate;
    return ContributionLevel.High;
  }

  determineDataConfidence(contributions: RiskFactorContribution[], snapshot: PublicDataSnapshot): DataConfidence {
    const missing = this.calculators.length - contributions.length;   // missing ;
    const anyStale = Object.values(snapshot.datasets ?? {}).some(d => d?.status === DatasetStatus.Stale);

    if (missing >= 2) return DataConfidence.Low;
    if (missing === 1 || anyStale) return DataConfidence.Medium;
    return DataConfidence.High;
  }
}
