
/**
 * Traces to: RiskSimulationControl (<<control>>) in class diagram
 * Related use case(s): UC-4 Simulate Risk Scenario
 *
 * Simulation uses a copy of the public data snapshot and reuses
 * RiskAssessmentControl.generateAssessment() for risk calculation.
 *
 * Adjustment rule (one step = one AdjustmentLevel away from NO_CHANGE; up to 2 steps each way):
 * - Humidity and lagged rainfall: 1 normal standard deviation per step.
 * - High-Aedes overlap: provisional 20% per step (Ticket 42).
 */

import {
  AdjustableRiskFactorType,
  AdjustmentLevel,
  AssessmentType,
} from '../entity/enums.ts';
import type { RiskAssessment } from '../entity/RiskAssessment.ts';
import type { ScenarioAdjustment } from '../entity/ScenarioAdjustment.ts';
import type { SimulationScenario } from '../entity/SimulationScenario.ts';
import type { RiskAssessmentControl } from './RiskAssessmentControl.ts';
import type { PublicDataSnapshot } from '../services/ApprovedPublicDataServiceBoundary.ts';

/** Adjustment levels in slider order; a level's step is its index minus 2 (-2..+2). */
export const ADJUSTMENT_STEPS: readonly AdjustmentLevel[] = [
  AdjustmentLevel.LargeDecrease,
  AdjustmentLevel.Decrease,
  AdjustmentLevel.NoChange,
  AdjustmentLevel.Increase,
  AdjustmentLevel.LargeIncrease,
];

export interface SimulationResult {
  scenario: SimulationScenario;
  baseline: RiskAssessment;
  simulated: RiskAssessment;
}

export class RiskSimulationControl {
  readonly riskAssessmentControl: RiskAssessmentControl;

  constructor(riskAssessmentControl: RiskAssessmentControl) {
    this.riskAssessmentControl = riskAssessmentControl;
  }

  async validateAdjustment(
    adjustment: ScenarioAdjustment,
  ): Promise<boolean> {
    if (!adjustment || typeof adjustment !== 'object') {
      return false;
    }

    const validFactors: string[] = Object.values(
      AdjustableRiskFactorType,
    );

    const validLevels: string[] = Object.values(AdjustmentLevel);

    return (
      validFactors.includes(adjustment.factorType) &&
      validLevels.includes(adjustment.adjustmentLevel)
    );
  }

  async recalculateScenario(
    baseline: RiskAssessment,
    adjustments: ScenarioAdjustment[],
    snapshot: PublicDataSnapshot,
  ): Promise<SimulationResult> {
    if (!baseline || !baseline.subzoneId) {
      throw new Error('A valid baseline assessment is required');
    }

    if (!Array.isArray(adjustments)) {
      throw new Error('Adjustments must be an array');
    }

    for (const adjustment of adjustments) {
      if (!(await this.validateAdjustment(adjustment))) {
        throw new Error('Invalid simulation adjustment');
      }
    }

    const seenFactors = new Set<string>();

    for (const adjustment of adjustments) {
      if (seenFactors.has(adjustment.factorType)) {
        throw new Error('Duplicate simulation factor');
      }
      seenFactors.add(adjustment.factorType);
    }

    const targetSubzone = snapshot.subzones?.find(
      (subzone) => subzone.subzoneId === baseline.subzoneId,
    );

    if (!targetSubzone) {
      throw new Error('Baseline subzone not found in snapshot');
    }

    // Copy the objects we may change; never mutate the original snapshot.
    const simulatedSnapshot: PublicDataSnapshot = {
      ...snapshot,
      weather: { ...snapshot.weather },
      subzones: snapshot.subzones.map((subzone) => ({
        ...subzone,
      })),
    };

    const simulatedSubzone = simulatedSnapshot.subzones.find(
      (subzone) => subzone.subzoneId === baseline.subzoneId,
    );

    if (!simulatedSubzone) {
      throw new Error('Simulation subzone not found');
    }

    for (const adjustment of adjustments) {
      const value = this.adjustedValue(
        snapshot,
        baseline.subzoneId,
        adjustment.factorType,
        adjustment.adjustmentLevel,
      );

      switch (adjustment.factorType) {
        case AdjustableRiskFactorType.Humidity:
          simulatedSnapshot.weather.meanHumidityPct = value;
          break;

        case AdjustableRiskFactorType.LaggedRainfall:
          simulatedSnapshot.weather.rainfallMm = value;
          break;

        case AdjustableRiskFactorType.HighAedesArea:
          simulatedSubzone.aedesOverlapRatio = value;
          break;
      }
    }

    // Reuse the existing calculators, weighting, risk index and bands.
    const simulated =
      await this.riskAssessmentControl.generateAssessment(
        baseline.subzoneId,
        simulatedSnapshot,
        { assessmentType: AssessmentType.Simulated },
      );

    if (simulated === null) {
      throw new Error(
        'Simulated risk assessment could not be generated',
      );
    }

    const scenario: SimulationScenario = {
      scenarioId: crypto.randomUUID(),
      createdAt: new Date().toISOString(),
      isHypothetical: true,
      baselineAssessmentId: baseline.assessmentId,
      simulatedAssessmentId: simulated.assessmentId,
      adjustments: adjustments.map((adjustment) => ({
        ...adjustment,
      })),
    };

    return {
      scenario,
      baseline,
      simulated,
    };
  }

  async resetScenario(
    scenario: SimulationScenario,
  ): Promise<SimulationScenario> {
    const {
      simulatedAssessmentId: _discardedSimulatedAssessmentId,
      ...remainingScenario
    } = scenario;

    return {
      ...remainingScenario,
      adjustments: [],
    };
  }

  /**
   * The factor's raw value after this adjustment (humidity %, rainfall mm,
   * Aedes overlap ratio 0-1). NO_CHANGE gives the current value. Also used
   * by SimulationBoundary to label each slider step.
   */
  adjustedValue(
    snapshot: PublicDataSnapshot,
    subzoneId: string,
    factorType: AdjustableRiskFactorType,
    level: AdjustmentLevel,
  ): number {
    const step = ADJUSTMENT_STEPS.indexOf(level) - 2;
    const { weather } = snapshot;

    switch (factorType) {
      case AdjustableRiskFactorType.Humidity:
        return this.clamp(
          weather.meanHumidityPct + step * weather.humidityNormalSd,
          0,
          100,
        );

      case AdjustableRiskFactorType.LaggedRainfall:
        return Math.max(
          0,
          weather.rainfallMm + step * weather.rainfallNormalSd,
        );

      case AdjustableRiskFactorType.HighAedesArea: {
        const ratio =
          snapshot.subzones.find((subzone) => subzone.subzoneId === subzoneId)
            ?.aedesOverlapRatio ?? 0;
        // TODO(Ticket 42): Replace the provisional 20%-per-step rule
        // with the team-approved High-Aedes adjustment rule.
        return this.clamp(ratio * (1 + 0.2 * step), 0, 1);
      }
    }
  }

  private clamp(
    value: number,
    minimum: number,
    maximum: number,
  ): number {
    return Math.min(maximum, Math.max(minimum, value));
  }
}
