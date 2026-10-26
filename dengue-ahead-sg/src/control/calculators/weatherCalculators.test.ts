import { describe, it, expect } from 'vitest';
import type { PublicDataSnapshot } from '../../services/ApprovedPublicDataServiceBoundary.ts';
import type { PlanningSubzone } from '../../entity/PlanningSubzone.ts';
import type { WeatherProfile } from '../../entity/WeatherProfile.ts';
import { HumidityCalculator } from './HumidityCalculator.ts';
import { LaggedRainfallCalculator } from './LaggedRainfallCalculator.ts';

const subzone = {} as PlanningSubzone;   // weather is national, so any subzone works

function snapshotWith(weather: Partial<WeatherProfile> | undefined) {
  const base: WeatherProfile = {
    humidityMonth: '2026-09', meanHumidityPct: 80, humidityNormalMean: 80, humidityNormalSd: 4,
    rainfallMonth: '2026-07', rainfallMm: 150, rainfallNormalMean: 150, rainfallNormalSd: 50,
  };
  return { weather: weather === undefined ? undefined : { ...base, ...weather } } as unknown as PublicDataSnapshot;
}

describe('HumidityCalculator', () => {
  const calc = new HumidityCalculator();

  it('scores a normal month as 50 and reports the raw humidity', () => {
    const result = calc.calculate(subzone, snapshotWith({}));
    expect(result?.score).toBe(50);
    expect(result?.inputValue).toBe(80);
  });

  it('scores +1 SD above normal as 75', () => {
    const result = calc.calculate(subzone, snapshotWith({ meanHumidityPct: 84 }));
    expect(result?.score).toBe(75);
    expect(result?.inputValue).toBe(84);
  });

  it('returns null when data is mising', () => {
    expect(calc.calculate(subzone, snapshotWith(undefined))).toBeNull();
  });
  
  it('returns null when normal SD is 0', () => {
    expect(calc.calculate(subzone, snapshotWith({ humidityNormalSd: 0 }))).toBeNull();
  });
});

describe('LaggedRainfallCalculator', () => {
  
  const calc = new LaggedRainfallCalculator();
  
  it('scores +2 SD above normal as 100', () => {
    const result = calc.calculate(subzone, snapshotWith({ rainfallMm: 250 }));
    expect(result?.score).toBe(100);
  });

  it('scores -2 SD below normal as 0', () => {
    const result = calc.calculate(subzone, snapshotWith({ rainfallMm: 50 }));
    expect(result?.score).toBe(0);
  });
  
  it('returns null when data is mising', () => {
    expect(calc.calculate(subzone, snapshotWith(undefined))).toBeNull();
  });
});
