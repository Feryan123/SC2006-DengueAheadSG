import { describe, it, expect } from 'vitest';
import { RiskAssessmentControl, HORIZON_DAYS } from './RiskAssessmentControl.ts';
import type { RiskFactorCalculator } from './calculators/RiskFactorCalculator.ts';
import {
  AssessmentType, ContributionLevel, DataConfidence, DatasetStatus, RiskFactorType, RiskLevel,
} from '../entity/enums.ts';
import type { Geometry } from '../entity/types.ts';
import type { PublicDataSnapshot } from '../services/ApprovedPublicDataServiceBoundary.ts';
import { MockPublicDataService } from '../services/mocks/MockPublicDataService.ts';

/** A calculator that always returns this score (or null = data missing). */
function fake(factorType: RiskFactorType, score: number | null): RiskFactorCalculator {
    return { factorType, calculate: () => (score === null ? null : { inputValue: 1, score }) };
}

/** All 5 factors at `score`, with optional per-factor overrides. */
function fakes(
    score: number,
    overrides: Partial<Record<RiskFactorType, number | null>> = {},
): RiskFactorCalculator[] {
    return Object.values(RiskFactorType).map(f => fake(f, f in overrides ? overrides[f]! : score));
}
// Careful: `overrides[f]!` turns an explicit null into... still null. `!` only drops undefined from the type.

/** Two subzones (A, B); calculators are faked, so the values here don't matter. */
function makeSnapshot(clusterStatus: DatasetStatus = DatasetStatus.Fresh, otherStatus: DatasetStatus = DatasetStatus.Fresh): PublicDataSnapshot {
    const retrievedAt = '2026-10-26T00:00:00.000Z';
    const subzone = (id: string) => ({
        subzoneId: id, name: id, boundary: null as unknown as Geometry,
        clusterCasesNearby: 0, residentsPerKm2: 0, aedesOverlapRatio: 0,
    });
    return {
        generatedAt: retrievedAt,
        datasets: {
        dengueClusters: { retrievedAt, status: clusterStatus },
        highAedesAreas: { retrievedAt, status: otherStatus },
        },
        subzones: [subzone('A'), subzone('B')],
        populationProfiles: [],
        dengueClusters: [],
        highAedesAreas: [],
        weather: {
        humidityMonth: '2026-09', meanHumidityPct: 80, humidityNormalMean: 80, humidityNormalSd: 2,
        rainfallMonth: '2026-07', rainfallMm: 150, rainfallNormalMean: 150, rainfallNormalSd: 50,
        },
    };
}

describe('determineRiskLevel (bands 25 / 50 / 75)', () => {
    const control = new RiskAssessmentControl();

    it.each([
        [-1, RiskLevel.Low],
        [0, RiskLevel.Low],
        [10, RiskLevel.Low],
        [24.9, RiskLevel.Low],
        [25, RiskLevel.Moderate],
        [35, RiskLevel.Moderate],
        [49.9, RiskLevel.Moderate],
        [50, RiskLevel.High],
        [74.9, RiskLevel.High],
        [75, RiskLevel.VeryHigh],
        [85, RiskLevel.VeryHigh],
        [100, RiskLevel.VeryHigh],
        [101, RiskLevel.VeryHigh]
    ])('%s → %s', (index, level) => {
        expect(control.determineRiskLevel(index)).toBe(level);
    });
});

describe('determineContributionLevel (bands 34 / 67)', () => {
    const control = new RiskAssessmentControl();

    it.each([
        [0, ContributionLevel.Low],
        [33.33, ContributionLevel.Low],
        [33.9, ContributionLevel.Low],
        [33.99, ContributionLevel.Low],
        [34, ContributionLevel.Moderate],
        [66.67, ContributionLevel.Moderate],
        [66.99, ContributionLevel.Moderate],
        [66.9, ContributionLevel.Moderate],
        [67, ContributionLevel.High],
        [100, ContributionLevel.High]
    
    ])('%s → %s', (index, level) => {
        expect(control.determineContributionLevel(index)).toBe(level);
    });
});

describe('generateAssessment', () => {
    it('all 5 factors at 60 → index 60, HIGH level, HIGH confidence', async () => {
        const control = new RiskAssessmentControl(fakes(60));
        const result = await control.generateAssessment('A', makeSnapshot());

        expect(result?.riskIndex).toBe(60);
        expect(result?.riskLevel).toBe(RiskLevel.High);
        expect(result?.contributions).toHaveLength(5);
        expect(result?.dataConfidence).toBe(DataConfidence.High);
    });


    it('contributions sum to the risk index', async () => {
        const control = new RiskAssessmentControl(fakes(50, { [RiskFactorType.DengueClusters]: 90 }));
        const result = await control.generateAssessment('A', makeSnapshot());

        const sum = result!.contributions.reduce((total, c) => total + c.contribution, 0);
        expect(sum).toBeCloseTo(result!.riskIndex, 1);
    });

    it('clamps the risk index to 100', async () => {
        const control = new RiskAssessmentControl(fakes(150));
        const result = await control.generateAssessment('A', makeSnapshot());
        expect(result?.riskIndex).toBe(100);
    });

    it('fills in the assessment fields', async () => {
        const control = new RiskAssessmentControl(fakes(60));
        const snapshot = makeSnapshot();
        const result = await control.generateAssessment('A', snapshot);

        expect(result?.subzoneId).toBe('A');
        expect(result?.horizonDays).toBe(HORIZON_DAYS);
        expect(result?.dataTimeStamp).toBe(snapshot.generatedAt);
        expect(result?.assessmentType).toBe(AssessmentType.Baseline);
    });

    it('uses assessmentType from options', async () => {
        const control = new RiskAssessmentControl(fakes(60));
        const result = await control.generateAssessment('A', makeSnapshot(), {
        assessmentType: AssessmentType.Simulated,
        });

        expect(result?.assessmentType).toBe(AssessmentType.Simulated);
    });

    it('reweights when a non-core factor is missing', async () => {
        const control = new RiskAssessmentControl(fakes(60, { [RiskFactorType.Humidity]: null }));
        const result = await control.generateAssessment('A', makeSnapshot());

        expect(result?.contributions).toHaveLength(4);
        expect(result?.contributions.map(c => c.factorType)).not.toContain(RiskFactorType.Humidity);
        expect(result?.riskIndex).toBe(60);
        expect(result?.dataConfidence).toBe(DataConfidence.Medium);
    });

    it('LOW confidence when 2 factors are missing', async () => {
        const control = new RiskAssessmentControl(fakes(60, {
            [RiskFactorType.Humidity]: null,
            [RiskFactorType.LaggedRainfall]: null,
        }));
        const result = await control.generateAssessment('A', makeSnapshot());

        expect(result?.contributions).toHaveLength(3);
        expect(result?.dataConfidence).toBe(DataConfidence.Low);
    });

    it('MEDIUM confidence when a dataset is STALE', async () => {
        const control = new RiskAssessmentControl(fakes(60));
        const result = await control.generateAssessment('A', makeSnapshot(DatasetStatus.Fresh, DatasetStatus.Stale));

        expect(result?.contributions).toHaveLength(5);
        expect(result?.dataConfidence).toBe(DataConfidence.Medium);
    });

    it('null when the core factor (clusters) is missing', async () => {
        const control = new RiskAssessmentControl(fakes(60, { [RiskFactorType.DengueClusters]: null }));
        expect(await control.generateAssessment('A', makeSnapshot())).toBeNull();
    });

    it('null when the dengueClusters dataset FAILED', async () => {
        const control = new RiskAssessmentControl(fakes(60));
        expect(await control.generateAssessment('A', makeSnapshot(DatasetStatus.Failed))).toBeNull();
    });

    it('null for an unknown subzone', async () => {
        const control = new RiskAssessmentControl(fakes(60));
        expect(await control.generateAssessment('NOPE', makeSnapshot())).toBeNull();
    });

    it('rounds raw humidity and rainfall values in explanations', async () => {
        const calculators = fakes(60).map(c =>
            c.factorType === RiskFactorType.Humidity ? { ...c, calculate: () => ({ inputValue: 83.47291, score: 60 }) }
            : c.factorType === RiskFactorType.LaggedRainfall ? { ...c, calculate: () => ({ inputValue: 212.638, score: 60 }) }
            : c);
        const result = await new RiskAssessmentControl(calculators).generateAssessment('A', makeSnapshot());
        const explanation = (f: RiskFactorType) => result?.contributions.find(c => c.factorType === f)?.explanation;

        expect(explanation(RiskFactorType.Humidity)).toContain('Humidity 83.5%');
        expect(explanation(RiskFactorType.LaggedRainfall)).toContain('Rainfall of 213 mm');
    });
});

describe('assessAll', () => {
    it('assesses every subzone in the mock snapshot with real calculators', async () => {
        const snapshot = await new MockPublicDataService().retrievePublicData();
        const control = new RiskAssessmentControl();
        const results = await control.assessAll(snapshot);

        expect(results).toHaveLength(snapshot.subzones.length);

        for (const r of results) {
            expect(r.riskIndex).toBeGreaterThanOrEqual(0);
            expect(r.riskIndex).toBeLessThanOrEqual(100);
        }

        const ids = results.map(r => r.subzoneId);
        expect(new Set(ids).size).toBe(ids.length);
        expect(new Set(ids)).toEqual(new Set(snapshot.subzones.map(s => s.subzoneId)));
    });

    it('returns [] when clusters FAILED', async () => {
        const control = new RiskAssessmentControl(fakes(60));
        expect(await control.assessAll(makeSnapshot(DatasetStatus.Failed))).toEqual([]);
    });
});
