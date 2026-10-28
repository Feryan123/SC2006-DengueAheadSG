
import { describe, expect, it, vi } from 'vitest';
import {
  AdjustableRiskFactorType,
  AdjustmentLevel,
  AssessmentType,
  RiskLevel,
} from '../entity/enums.ts';
import type { RiskAssessment } from '../entity/RiskAssessment.ts';
import type { SimulationScenario } from '../entity/SimulationScenario.ts';
import type { PublicDataSnapshot } from '../services/ApprovedPublicDataServiceBoundary.ts';
import { MockPublicDataService } from '../services/mocks/MockPublicDataService.ts';
import { RiskAssessmentControl } from './RiskAssessmentControl.ts';
import { RiskSimulationControl } from './RiskSimulationControl.ts';

const baseline = {
  assessmentId: 'baseline-1',
  subzoneId: 'SZ-1',
  riskIndex: 40,
  riskLevel: RiskLevel.Moderate,
  assessmentType: AssessmentType.Baseline,
} as RiskAssessment;

const simulatedAssessment = {
  ...baseline,
  assessmentId: 'simulated-1',
  riskIndex: 45,
  assessmentType: AssessmentType.Simulated,
};

function makeSnapshot(): PublicDataSnapshot {
  return {
    generatedAt: '2026-10-27T00:00:00Z',
    datasets: {},
    subzones: [
      {
        subzoneId: 'SZ-1',
        name: 'TEST SUBZONE',
        boundary: { type: 'Polygon', coordinates: [] },
        clusterCasesNearby: 10,
        residentsPerKm2: 1000,
        aedesOverlapRatio: 0.5,
      },
    ],
    populationProfiles: [],
    dengueClusters: [],
    highAedesAreas: [],
    weather: {
      humidityMonth: '2026-09',
      meanHumidityPct: 70,
      humidityNormalMean: 75,
      humidityNormalSd: 5,
      rainfallMonth: '2026-07',
      rainfallMm: 100,
      rainfallNormalMean: 120,
      rainfallNormalSd: 20,
    },
  } as PublicDataSnapshot;
}

function makeControl() {
  const generateAssessment = vi.fn().mockResolvedValue(simulatedAssessment);

  const riskAssessmentControl = {
    generateAssessment,
  } as unknown as RiskAssessmentControl;

  return {
    control: new RiskSimulationControl(riskAssessmentControl),
    generateAssessment,
  };
}

describe('RiskSimulationControl', () => {
  it('accepts valid adjustable factors and adjustment levels', async () => {
    const { control } = makeControl();

    expect(
      await control.validateAdjustment({
        factorType: AdjustableRiskFactorType.Humidity,
        adjustmentLevel: AdjustmentLevel.Increase,
      }),
    ).toBe(true);

    expect(
      await control.validateAdjustment({
        factorType: AdjustableRiskFactorType.LaggedRainfall,
        adjustmentLevel: AdjustmentLevel.Decrease,
      }),
    ).toBe(true);

    expect(
      await control.validateAdjustment({
        factorType: AdjustableRiskFactorType.HighAedesArea,
        adjustmentLevel: AdjustmentLevel.NoChange,
      }),
    ).toBe(true);
  });

  it('rejects non-adjustable factors and invalid levels', async () => {
    const { control } = makeControl();

    expect(
      await control.validateAdjustment({
        factorType: 'POPULATION_DENSITY',
        adjustmentLevel: AdjustmentLevel.Increase,
      } as never),
    ).toBe(false);

    expect(
      await control.validateAdjustment({
        factorType: AdjustableRiskFactorType.Humidity,
        adjustmentLevel: 'INVALID',
      } as never),
    ).toBe(false);
  });

  it('applies standard deviation adjustments and preserves the original snapshot', async () => {
    const { control, generateAssessment } = makeControl();
    const snapshot = makeSnapshot();
    const original = structuredClone(snapshot);

    const result = await control.recalculateScenario(
      baseline,
      [
        {
          factorType: AdjustableRiskFactorType.Humidity,
          adjustmentLevel: AdjustmentLevel.Increase,
        },
        {
          factorType: AdjustableRiskFactorType.LaggedRainfall,
          adjustmentLevel: AdjustmentLevel.Decrease,
        },
        {
          factorType: AdjustableRiskFactorType.HighAedesArea,
          adjustmentLevel: AdjustmentLevel.Increase,
        },
      ],
      snapshot,
    );

    expect(generateAssessment).toHaveBeenCalledOnce();

    const [subzoneId, simulatedSnapshot, options] =
      generateAssessment.mock.calls[0];

    expect(subzoneId).toBe('SZ-1');
    expect(options).toEqual({
      assessmentType: AssessmentType.Simulated,
    });

    // Humidity: 70 + 5 SD = 75.
    expect(simulatedSnapshot.weather.meanHumidityPct).toBe(75);

    // Rainfall: 100 - 20 SD = 80.
    expect(simulatedSnapshot.weather.rainfallMm).toBe(80);

    // High-Aedes remains provisional +/- 20% (Ticket 42).
    expect(simulatedSnapshot.subzones[0].aedesOverlapRatio).toBeCloseTo(0.6);

    expect(snapshot).toEqual(original);
    expect(result.baseline).toBe(baseline);
    expect(result.simulated).toBe(simulatedAssessment);
    expect(result.scenario.isHypothetical).toBe(true);
    expect(result.scenario.baselineAssessmentId).toBe('baseline-1');
    expect(result.scenario.simulatedAssessmentId).toBe('simulated-1');
    expect(result.scenario.adjustments).toHaveLength(3);
  });

  it('does not change factor values for NO_CHANGE', async () => {
    const { control, generateAssessment } = makeControl();
    const snapshot = makeSnapshot();

    await control.recalculateScenario(
      baseline,
      [
        {
          factorType: AdjustableRiskFactorType.Humidity,
          adjustmentLevel: AdjustmentLevel.NoChange,
        },
      ],
      snapshot,
    );

    const simulatedSnapshot = generateAssessment.mock.calls[0][1];

    expect(simulatedSnapshot.weather.meanHumidityPct).toBe(70);
  });

  it('clamps humidity and Aedes overlap to valid ranges', async () => {
    const { control, generateAssessment } = makeControl();
    const snapshot = makeSnapshot();

    snapshot.weather.meanHumidityPct = 98;
    snapshot.subzones[0].aedesOverlapRatio = 0.95;

    await control.recalculateScenario(
      baseline,
      [
        {
          factorType: AdjustableRiskFactorType.Humidity,
          adjustmentLevel: AdjustmentLevel.Increase,
        },
        {
          factorType: AdjustableRiskFactorType.HighAedesArea,
          adjustmentLevel: AdjustmentLevel.Increase,
        },
      ],
      snapshot,
    );

    const simulatedSnapshot = generateAssessment.mock.calls[0][1];

    expect(simulatedSnapshot.weather.meanHumidityPct).toBe(100);
    expect(simulatedSnapshot.subzones[0].aedesOverlapRatio).toBe(1);
  });

  it('rejects duplicate adjustments', async () => {
    const { control } = makeControl();

    await expect(
      control.recalculateScenario(
        baseline,
        [
          {
            factorType: AdjustableRiskFactorType.Humidity,
            adjustmentLevel: AdjustmentLevel.Increase,
          },
          {
            factorType: AdjustableRiskFactorType.Humidity,
            adjustmentLevel: AdjustmentLevel.Decrease,
          },
        ],
        makeSnapshot(),
      ),
    ).rejects.toThrow('Duplicate simulation factor');
  });

  it('rejects an invalid adjustment', async () => {
    const { control } = makeControl();

    await expect(
      control.recalculateScenario(
        baseline,
        [
          {
            factorType: 'POPULATION_DENSITY',
            adjustmentLevel: AdjustmentLevel.Increase,
          } as never,
        ],
        makeSnapshot(),
      ),
    ).rejects.toThrow('Invalid simulation adjustment');
  });

  it('throws when the baseline subzone is unavailable', async () => {
    const { control } = makeControl();
    const snapshot = makeSnapshot();
    snapshot.subzones = [];

    await expect(
      control.recalculateScenario(baseline, [], snapshot),
    ).rejects.toThrow('Baseline subzone not found');
  });

  it('throws when risk assessment cannot be generated', async () => {
    const { control, generateAssessment } = makeControl();
    generateAssessment.mockResolvedValueOnce(null);

    await expect(
      control.recalculateScenario(baseline, [], makeSnapshot()),
    ).rejects.toThrow('Simulated risk assessment could not be generated');
  });

  it('resets adjustments without mutating the original scenario', async () => {
    const { control } = makeControl();

    const scenario: SimulationScenario = {
      scenarioId: 'scenario-1',
      createdAt: '2026-10-27T00:00:00Z',
      isHypothetical: true,
      baselineAssessmentId: 'baseline-1',
      simulatedAssessmentId: 'simulated-1',
      adjustments: [
        {
          factorType: AdjustableRiskFactorType.Humidity,
          adjustmentLevel: AdjustmentLevel.Increase,
        },
      ],
    };

    const reset = await control.resetScenario(scenario);

    expect(reset.adjustments).toEqual([]);
    expect(reset.simulatedAssessmentId).toBeUndefined();
    expect(reset.baselineAssessmentId).toBe('baseline-1');

    expect(scenario.adjustments).toHaveLength(1);
    expect(scenario.simulatedAssessmentId).toBe('simulated-1');
  });

  it('changes real risk index in the correct direction for humidity +/- 1 SD', async () => {
    // Integration test: real data service and real factor calculators.
    // Do not mock generateAssessment().
    const snapshot = await new MockPublicDataService().retrievePublicData();
    const assessmentControl = new RiskAssessmentControl();
    const simulationControl = new RiskSimulationControl(assessmentControl);

    const subzoneId = snapshot.subzones[0].subzoneId;
    const realBaseline = await assessmentControl.generateAssessment(
      subzoneId,
      snapshot,
    );

    expect(realBaseline).not.toBeNull();

    if (!realBaseline) {
      throw new Error('Real baseline assessment could not be generated');
    }

    const increase = await simulationControl.recalculateScenario(
      realBaseline,
      [
        {
          factorType: AdjustableRiskFactorType.Humidity,
          adjustmentLevel: AdjustmentLevel.Increase,
        },
      ],
      snapshot,
    );

    const decrease = await simulationControl.recalculateScenario(
      realBaseline,
      [
        {
          factorType: AdjustableRiskFactorType.Humidity,
          adjustmentLevel: AdjustmentLevel.Decrease,
        },
      ],
      snapshot,
    );

    expect(increase.simulated.assessmentType).toBe(
      AssessmentType.Simulated,
    );
    expect(decrease.simulated.assessmentType).toBe(
      AssessmentType.Simulated,
    );

    expect(increase.simulated.riskIndex).toBeGreaterThan(
      realBaseline.riskIndex,
    );
    expect(decrease.simulated.riskIndex).toBeLessThan(
      realBaseline.riskIndex,
    );
  });
});
