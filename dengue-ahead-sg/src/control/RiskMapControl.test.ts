// - Check that map colours use the supplied assessments, matched by area ID.
// - Check missing data and failed requests without making up risk levels.
// - Ticket #20: Explore Risk Map. No network requests are made.

import { describe, expect, it, vi } from 'vitest';
import { RiskMapControl } from './RiskMapControl.ts';
import { MockPublicDataService } from '../services/mocks/MockPublicDataService.ts';
import { AssessmentType, ContributionLevel, DataConfidence, RiskFactorType, RiskLevel } from '../entity/enums.ts';
import type { RiskAssessment } from '../entity/RiskAssessment.ts';
import type { RiskFactorContribution } from '../entity/RiskFactorContribution.ts';

function assessment(subzoneId: string, riskLevel: RiskLevel): RiskAssessment {
  return {
    assessmentId: `test-${subzoneId}`, subzoneId, riskLevel, riskIndex: 50,
    generatedAt: '2026-10-26T00:00:00Z', dataTimeStamp: '2026-10-26T00:00:00Z',
    horizonDays: 14, dataConfidence: DataConfidence.High,
    assessmentType: AssessmentType.Baseline, contributions: [],
  };
}

function factor(factorType: RiskFactorType, contribution: number): RiskFactorContribution {
  return { factorType, contribution, inputValue: 1, contributionLevel: ContributionLevel.Moderate, explanation: '' };
}

describe('RiskMapControl', () => {
  it('passes one snapshot to assessAll and matches all four levels by area ID', async () => {
    const snapshot = await new MockPublicDataService().retrievePublicData();
    const [low, moderate, high, veryHigh] = snapshot.subzones;
    const dataService = { retrievePublicData: vi.fn().mockResolvedValue(snapshot) };
    const assessAll = vi.fn().mockResolvedValue([
      assessment(veryHigh.subzoneId, RiskLevel.VeryHigh),
      assessment(low.subzoneId, RiskLevel.Low),
      assessment(high.subzoneId, RiskLevel.High),
      assessment(moderate.subzoneId, RiskLevel.Moderate),
    ]);

    const result = await new RiskMapControl(dataService, { assessAll }).loadRiskMap();
    expect(dataService.retrievePublicData).toHaveBeenCalledOnce();
    expect(assessAll).toHaveBeenCalledExactlyOnceWith(snapshot);
    expect(result.status).toBe('OK');
    if (result.status !== 'OK') throw new Error('Expected loaded map data.');
    expect(result.data.subzones).toEqual(snapshot.subzones);
    expect(result.data.riskLevels).toEqual({
      [low.subzoneId]: RiskLevel.Low,
      [moderate.subzoneId]: RiskLevel.Moderate,
      [high.subzoneId]: RiskLevel.High,
      [veryHigh.subzoneId]: RiskLevel.VeryHigh,
    });
    expect(result.data.riskLevels[snapshot.subzones[4].subzoneId]).toBeUndefined();
  });

  it('keeps risk levels empty while the assessment control is unavailable', async () => {
    const result = await new RiskMapControl(new MockPublicDataService()).loadRiskMap();
    expect(result.status).toBe('OK');
    if (result.status === 'OK') {
      expect(result.data.subzones.length).toBeGreaterThan(0);
      expect(result.data.riskLevels).toEqual({});
    }
  });

  it('calls assessAll on its control so the method can use its own state', async () => {
    const snapshot = await new MockPublicDataService().retrievePublicData();
    const zone = snapshot.subzones[0];
    const assessmentControl = {
      assessments: [assessment(zone.subzoneId, RiskLevel.High)],
      async assessAll() { return this.assessments; },
    };
    const result = await new RiskMapControl(new MockPublicDataService(snapshot), assessmentControl).loadRiskMap();
    expect(result.status).toBe('OK');
    if (result.status === 'OK') expect(result.data.riskLevels[zone.subzoneId]).toBe(RiskLevel.High);
  });

  it('does not display an unrecognised risk level as an available assessment', async () => {
    const assessAll = async () => [assessment('TAMPINES EAST', 'UNKNOWN' as RiskLevel)];
    const result = await new RiskMapControl(new MockPublicDataService(), { assessAll }).loadRiskMap();
    expect(result.status).toBe('OK');
    if (result.status === 'OK') expect(result.data.riskLevels).toEqual({});
  });

  it('returns a safe message when data retrieval fails', async () => {
    const service = { retrievePublicData: vi.fn().mockRejectedValue(new Error('Private upstream detail')) };
    const result = await new RiskMapControl(service).loadRiskMap();
    expect(result.status).toBe('DATA_UNAVAILABLE');
    expect(JSON.stringify(result)).not.toContain('Private upstream detail');
  });

  it('returns unavailable when assessAll fails', async () => {
    const assessAll = vi.fn().mockRejectedValue(new Error('Assessment failed'));
    const result = await new RiskMapControl(new MockPublicDataService(), { assessAll }).loadRiskMap();
    expect(result.status).toBe('DATA_UNAVAILABLE');
  });

  it('does not call assessAll when there are no subzones', async () => {
    const snapshot = await new MockPublicDataService().retrievePublicData();
    const assessAll = vi.fn();
    const service = new MockPublicDataService({ ...snapshot, subzones: [] });
    expect((await new RiskMapControl(service, { assessAll }).loadRiskMap()).status).toBe('DATA_UNAVAILABLE');
    expect(assessAll).not.toHaveBeenCalled();
  });

  it('selects by ID and clears an unknown selection', async () => {
    const snapshot = await new MockPublicDataService().retrievePublicData();
    const control = new RiskMapControl();
    const zone = snapshot.subzones[0];
    expect(await control.selectSubzone(zone.subzoneId, snapshot.subzones)).toBe(zone);
    expect(await control.selectSubzone('unknown', snapshot.subzones)).toBeNull();
  });
});

describe('Map popup and ranking (ticket #22)', () => {
  it('shows the three largest contributions without changing the original order', () => {
    const item = assessment('area', RiskLevel.High);
    item.contributions = [
      factor(RiskFactorType.Humidity, 4), factor(RiskFactorType.DengueClusters, 20),
      factor(RiskFactorType.PopulationDensity, 7), factor(RiskFactorType.LaggedRainfall, 12),
      factor(RiskFactorType.HighAedesArea, 15),
    ];
    const original = [...item.contributions];
    const result = new RiskMapControl().getTopFactors(item);
    expect(result.map((factor) => factor.factorType)).toEqual([
      RiskFactorType.DengueClusters, RiskFactorType.HighAedesArea, RiskFactorType.LaggedRainfall,
    ]);
    expect(item.contributions).toEqual(original);
  });

  it('handles missing factors and leaves out invalid contribution values', () => {
    const control = new RiskMapControl();
    expect(control.getTopFactors()).toEqual([]);
    const item = assessment('area', RiskLevel.Low);
    item.contributions = [NaN, -1, Infinity, 0, 3].map((value) => factor(RiskFactorType.Humidity, value));
    expect(control.getTopFactors(item).map((factor) => factor.contribution)).toEqual([3, 0]);
  });

  it('ranks only the ten highest indices, using area ID to order a tie', async () => {
    const snapshot = await new MockPublicDataService().retrievePublicData();
    snapshot.subzones = Array.from({ length: 12 }, (_, index) => ({
      ...snapshot.subzones[0], subzoneId: `area-${String(index).padStart(2, '0')}`, name: `Area ${index}`,
    }));
    const assessments = snapshot.subzones.map((zone, index) => ({
      ...assessment(zone.subzoneId, RiskLevel.High), riskIndex: index * 8,
    }));
    assessments[10].riskIndex = 88;
    const originalIds = assessments.map((item) => item.subzoneId);
    const control = new RiskMapControl(new MockPublicDataService(snapshot), { assessAll: async () => assessments });
    const result = await control.loadRiskMap();
    if (result.status !== 'OK') throw new Error('Expected loaded map data.');
    const ranked = control.getTopSubzones(result.data);
    expect(ranked.map((item) => item.subzone.subzoneId)).toEqual([
      'area-10', 'area-11', 'area-09', 'area-08', 'area-07',
      'area-06', 'area-05', 'area-04', 'area-03', 'area-02',
    ]);
    expect(assessments.map((item) => item.subzoneId)).toEqual(originalIds);
  });

  it('leaves unknown areas and invalid indices out of the map and ranking', async () => {
    const snapshot = await new MockPublicDataService().retrievePublicData();
    const values = [NaN, -1, 101, Infinity, 0, 100];
    const assessments = snapshot.subzones.map((zone, index) => ({
      ...assessment(zone.subzoneId, RiskLevel.Low), riskIndex: values[index],
    }));
    assessments.push(assessment('unknown-area', RiskLevel.High), assessments[4]);
    const control = new RiskMapControl(new MockPublicDataService(snapshot), { assessAll: async () => assessments });
    const result = await control.loadRiskMap();
    if (result.status !== 'OK') throw new Error('Expected loaded map data.');
    expect(Object.keys(result.data.riskLevels)).toHaveLength(2);
    expect(control.getTopSubzones(result.data).map((item) => item.assessment.riskIndex)).toEqual([100, 0]);
    expect(control.getTopSubzones({ ...result.data, assessments: {} })).toEqual([]);
  });
});
