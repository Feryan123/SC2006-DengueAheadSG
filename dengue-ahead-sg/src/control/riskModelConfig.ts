import { RiskFactorType } from '../entity/enums.ts';

export const SCORING_VERSION = '2.0.0';

export const FACTOR_RANK: Record<RiskFactorType, number> = {
  [RiskFactorType.DengueClusters]: 1,
  [RiskFactorType.HighAedesArea]: 2,
  [RiskFactorType.PopulationDensity]: 3,
  [RiskFactorType.Humidity]: 4,
  [RiskFactorType.LaggedRainfall]: 5,
};

export const CORE_FACTORS: readonly RiskFactorType[] = [RiskFactorType.DengueClusters];

export const MAX_FETCH_AGE_MIN = { clusters: 120, aedes: 120 } as const;
export const MAX_AEDES_DATE_AGE_DAYS = 45;
export const MAX_MONTHLY_LAG_MONTHS = 2;

export const RISK_BANDS = { moderateFrom: 25, highFrom: 50, veryHighFrom: 75 } as const;  // 4 levels
export const CONTRIBUTION_BANDS = { moderateFrom: 34, highFrom: 67 } as const;           // stays 3 levels

export function rankSumWeights(
  rank: Record<RiskFactorType, number>,
): Record<RiskFactorType, number> { 
    const n = Object.keys(rank).length;
    const total = n*(n+1)/2;
    const ranks = Object.values(rank)

    for(let i = 0; i < ranks.length; i++){
        const r = ranks[i];
        if(!Number.isInteger(r) || r < 1 || r > n){
            throw new RangeError(`Rank ${r} must be an integer between 1 and ${n}`);
        }
    }

    if(new Set(ranks).size !== ranks.length){
        throw new Error("Ranks must be unique")
    }

    const weights = {} as Record<RiskFactorType, number>;
    const factors = Object.keys(rank) as RiskFactorType[];
    for(let i = 0; i < factors.length; i++){
        const factor = factors[i];
        weights[factor] = (n - rank[factor] + 1) / total;
    }

    return weights;
}