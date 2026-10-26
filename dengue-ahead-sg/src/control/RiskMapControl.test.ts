// - Check that map colours use the supplied assessments, matched by area ID.
// - Check missing data and failed requests without making up risk levels.
// - Ticket #20: Explore Risk Map. No network requests are made.

import { describe, expect, it, vi } from 'vitest';
import { RiskMapControl } from './RiskMapControl.ts';
import { MockPublicDataService } from '../services/mocks/MockPublicDataService.ts';
import { AssessmentType, DataConfidence, RiskLevel } from '../entity/enums.ts';
import type { RiskAssessment } from '../entity/RiskAssessment.ts';

function assessment(subzoneId: string, riskLevel: RiskLevel): RiskAssessment {
  return {
    assessmentId: `test-${subzoneId}`, subzoneId, riskLevel, riskIndex: 50,
    generatedAt: '2026-10-26T00:00:00Z', dataTimeStamp: '2026-10-26T00:00:00Z',
    horizonDays: 14, dataConfidence: DataConfidence.High,
    assessmentType: AssessmentType.Baseline, contributions: [],
  };
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
