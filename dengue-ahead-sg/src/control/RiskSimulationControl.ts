
/**
 * Traces to: RiskSimulationControl (<<control>>) in class diagram
 * Related use case(s): UC-4 Simulate Risk Scenario
 *
 * Simulation uses a copy of the public data snapshot and reuses
 * RiskAssessmentControl.generateAssessment() for risk calculation.
 *
 * Provisional adjustment rule (pending team confirmation):
 * DECREASE = -20%, NO_CHANGE = 0%, INCREASE = +20%.
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
      const multiplier = this.getMultiplier(
        adjustment.adjustmentLevel,
      );

      switch (adjustment.factorType) {
        case AdjustableRiskFactorType.Humidity:
          simulatedSnapshot.weather.meanHumidityPct = this.clamp(
            snapshot.weather.meanHumidityPct * multiplier,
            0,
            100,
          );
          break;

        case AdjustableRiskFactorType.LaggedRainfall:
          simulatedSnapshot.weather.rainfallMm = Math.max(
            0,
            snapshot.weather.rainfallMm * multiplier,
          );
          break;

        case AdjustableRiskFactorType.HighAedesArea:
          simulatedSubzone.aedesOverlapRatio = this.clamp(
            targetSubzone.aedesOverlapRatio * multiplier,
            0,
            1,
          );
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

  private getMultiplier(level: AdjustmentLevel): number {
    switch (level) {
      case AdjustmentLevel.Decrease:
        return 0.8;
      case AdjustmentLevel.Increase:
        return 1.2;
      case AdjustmentLevel.NoChange:
        return 1;
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
