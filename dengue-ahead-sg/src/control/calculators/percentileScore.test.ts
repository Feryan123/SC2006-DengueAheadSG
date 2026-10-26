import { describe, it, expect } from 'vitest';
import { percentileScore } from './percentileScore.ts';

describe('percentileScore', () => {
    const population = [0, 0, 0, 5, 10];

    it('scores the lowest value as 0', () => {
        expect(percentileScore(0, population)).toBe(0);
    });
    it('The 5 scores 75', () => {
        expect(percentileScore(5, population)).toBe(75);
    });
    it('The 10 scores 100', () => {
        expect(percentileScore(10, population)).toBe(100);
    });
    it('All equal population [4, 4, 4] scores 0', () => {
        expect(percentileScore(4, [4, 4, 4])).toBe(0);
    });
    it('A value above the whole population is capped at 100', () => {
        expect(percentileScore(99, [1, 2])).toBe(100);
    });
    it('NaN value returns null', () => {
        expect(percentileScore(NaN, population)).toBeNull();
    });
    it('Population of 1 returns null', () => {
        expect(percentileScore(1, [1])).toBeNull();
    });
    it('NaN entries are ignored', () => {
        expect(percentileScore(10, [0, NaN, 10])).toBe(100);
    });
});
