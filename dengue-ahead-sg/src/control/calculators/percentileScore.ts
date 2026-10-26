/**
 * Percentile score 0–100: share of the population strictly below `value` (Ticket 5).
 * Lowest = 0, highest = 100; ties share the lower rank. null if value is not finite or population < 2.
 */
export function percentileScore(value: number, population: number[]): number | null {
    const valid = population.filter(Number.isFinite);
    if(!Number.isFinite(value) || valid.length < 2) return null;

    let count = 0;
    for(const p of valid){
        if(p < value) count++;
    }

    const score = 100 * count / (valid.length - 1);
    return Math.min(100, score);
}
