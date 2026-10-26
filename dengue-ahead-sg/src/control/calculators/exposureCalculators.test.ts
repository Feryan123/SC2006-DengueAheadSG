import { describe, it, expect } from 'vitest';
import { RiskFactorType } from '../../entity/enums.ts';
import type { PlanningSubzone } from '../../entity/PlanningSubzone.ts';
import type { PublicDataSnapshot } from '../../services/ApprovedPublicDataServiceBoundary.ts';
import { DengueClusterCalculator } from './DengueClusterCalculator.ts';
import { HighAedesAreaCalculator } from './HighAedesAreaCalculator.ts';
import { PopulationDensityCalculator } from './PopulationDensityCalculator.ts';

function sz(id: string, cases: number, density: number, aedes: number) {
    return { subzoneId: id, clusterCasesNearby: cases, residentsPerKm2: density, aedesOverlapRatio: aedes } as PlanningSubzone;
}
const [A, B, C, D] = [sz('A', 0, 0, 0), sz('B', 0, 1000, 0.1), sz('C', 4, 5000, 0.5), sz('D', 9, 9000, 0.9)];
const snapshot = { subzones: [A, B, C, D] } as unknown as PublicDataSnapshot;
const noSubzones = {} as unknown as PublicDataSnapshot;

describe('DengueClusterCalculator', () => {
    const calc = new DengueClusterCalculator();

    it('has the DENGUE_CLUSTERS factor type', () => {
        expect(calc.factorType).toBe(RiskFactorType.DengueClusters);
    });
    it('D scores 100, and inputValue is 9', () => {
        const result = calc.calculate(D, snapshot);
        expect(result?.score).toBe(100);
        expect(result?.inputValue).toBe(9);
    });
    it('A and B both score 0', () => {
        expect((calc.calculate(A, snapshot))?.score).toBe(0);
        expect((calc.calculate(B, snapshot))?.score).toBe(0);
    });
    it('C scores 66.67', () => {
        const result = calc.calculate(C, snapshot);
        expect(result?.score).toBeCloseTo(66.67);
    });
    it('Return null when subzones are missing', () => {
        expect((calc.calculate(A, noSubzones))).toBeNull();
    });

});

describe('HighAedesAreaCalculator', () => {
    const calc = new HighAedesAreaCalculator();

    it('has the HIGH_AEDES_AREA factor type', () => {
        expect(calc.factorType).toBe(RiskFactorType.HighAedesArea);
    });
    it('D scores 100', () => {
        const result = calc.calculate(D, snapshot);
        expect(result?.score).toBe(100);
    });
    it('A scores 0', () => {
        expect((calc.calculate(A, snapshot))?.score).toBe(0);
    });
    it('B scores 33.33', () => {
        expect((calc.calculate(B, snapshot))?.score).toBeCloseTo(33.33);
    });
    it('Return null when subzones are missing', () => {
        expect((calc.calculate(A, noSubzones))).toBeNull();
    });
});

describe('PopulationDensityCalculator', () => {
    const calc = new PopulationDensityCalculator();

    it('has the POPULATION_DENSITY factor type', () => {
        expect(calc.factorType).toBe(RiskFactorType.PopulationDensity);
    });   
    it('D scores 100', () => {
        const result = calc.calculate(D, snapshot);
        expect(result?.score).toBe(100);
    });
    it('A scores 0 since it has 0 residents', () => {
        expect((calc.calculate(A, snapshot))?.score).toBe(0);
    });
    it('B scores 0 as the lowest of the residents-only population', () => {
        expect((calc.calculate(B, snapshot))?.score).toBe(0);
    });
    it('C scores 50', () => {
        expect((calc.calculate(C, snapshot))?.score).toBe(50);
    });
    it('Return null when subzones are missing', () => {
        expect((calc.calculate(A, noSubzones))).toBeNull();
    });
});
