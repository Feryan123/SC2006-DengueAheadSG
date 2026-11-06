/**
 * Ticket 35: sensitivity analysis of the risk model weights.
 * Runs the real RiskAssessmentControl on one snapshot with each weighting and compares it with the
 * rank-sum baseline: % of subzones whose risk level changes, index shifts, top-10 overlap, rank correlation.
 *
 * Run: npm run sensitivity [-- path/to/snapshot.json]   (default: data/derived/latest-snapshot.json from npm run sync)
 */
import fs from 'fs';
import path from 'path';
import { RiskAssessmentControl } from '../src/control/RiskAssessmentControl.ts';
import { FACTOR_RANK, rankSumWeights } from '../src/control/riskModelConfig.ts';
import { RiskFactorType, RiskLevel } from '../src/entity/enums.ts';
import type { RiskAssessment } from '../src/entity/RiskAssessment.ts';
import type { PublicDataSnapshot } from '../src/services/ApprovedPublicDataServiceBoundary.ts';
import { isPublicDataSnapshot } from '../src/services/validatePublicDataSnapshot.ts';
import { adjustWeight, equalWeights, rankOrderCentroidWeights, rankReciprocalWeights } from './lib/weightSchemes.ts';

type Weights = Record<RiskFactorType, number>;

const LABELS: Record<RiskFactorType, string> = {
  [RiskFactorType.DengueClusters]: 'Clusters',
  [RiskFactorType.HighAedesArea]: 'High-Aedes',
  [RiskFactorType.PopulationDensity]: 'Density',
  [RiskFactorType.Humidity]: 'Humidity',
  [RiskFactorType.LaggedRainfall]: 'Rainfall',
};
const FACTORS = Object.values(RiskFactorType).sort((a, b) => FACTOR_RANK[a] - FACTOR_RANK[b]);
const LEVEL_ORDER = [RiskLevel.Low, RiskLevel.Moderate, RiskLevel.High, RiskLevel.VeryHigh];

/** Top 10 by index, ties by subzone ID (the same order as the map's top-10 list). */
function topTen(assessments: RiskAssessment[]): string[] {
  return [...assessments]
    .sort((a, b) => b.riskIndex - a.riskIndex || a.subzoneId.localeCompare(b.subzoneId))
    .slice(0, 10)
    .map((a) => a.subzoneId);
}

/** Ranks with ties given their average rank. */
function ranks(values: number[]): number[] {
  const order = values.map((v, i) => [v, i] as const).sort((a, b) => a[0] - b[0]);
  const result = new Array<number>(values.length);
  for (let start = 0; start < order.length; ) {
    let end = start;
    while (end + 1 < order.length && order[end + 1][0] === order[start][0]) end++;
    for (let k = start; k <= end; k++) result[order[k][1]] = (start + end) / 2 + 1;
    start = end + 1;
  }
  return result;
}

/** Spearman rank correlation: Pearson correlation of the tie-averaged ranks. */
function spearman(x: number[], y: number[]): number {
  const rx = ranks(x), ry = ranks(y);
  const mean = (v: number[]) => v.reduce((a, b) => a + b, 0) / v.length;
  const mx = mean(rx), my = mean(ry);
  let num = 0, dx = 0, dy = 0;
  for (let i = 0; i < rx.length; i++) {
    num += (rx[i] - mx) * (ry[i] - my);
    dx += (rx[i] - mx) ** 2;
    dy += (ry[i] - my) ** 2;
  }
  return num / Math.sqrt(dx * dy);
}

function compare(baseline: RiskAssessment[], other: RiskAssessment[]) {
  const byId = new Map(other.map((a) => [a.subzoneId, a]));
  let up = 0, down = 0, sumShift = 0, maxShift = 0;
  const x: number[] = [], y: number[] = [];
  for (const b of baseline) {
    const o = byId.get(b.subzoneId);
    if (!o) continue;
    const step = LEVEL_ORDER.indexOf(o.riskLevel) - LEVEL_ORDER.indexOf(b.riskLevel);
    if (step > 0) up++;
    if (step < 0) down++;
    const shift = Math.abs(o.riskIndex - b.riskIndex);
    sumShift += shift;
    maxShift = Math.max(maxShift, shift);
    x.push(b.riskIndex);
    y.push(o.riskIndex);
  }
  const baseTop = new Set(topTen(baseline));
  return {
    changed: up + down, up, down,
    changedPct: (100 * (up + down)) / baseline.length,
    meanShift: sumShift / baseline.length,
    maxShift,
    topTenKept: topTen(other).filter((id) => baseTop.has(id)).length,
    spearman: spearman(x, y),
  };
}

const pct = (v: number) => `${v.toFixed(1)}%`;
const weightCells = (w: Weights) => FACTORS.map((f) => w[f].toFixed(3)).join(' | ');

async function main() {
  const file = path.resolve(process.argv[2] ?? path.join('data', 'derived', 'latest-snapshot.json'));
  const snapshot: unknown = JSON.parse(fs.readFileSync(file, 'utf8'));
  if (!isPublicDataSnapshot(snapshot)) throw new Error(`${file} is not a valid public data snapshot`);
  const data = snapshot as PublicDataSnapshot;

  const base = rankSumWeights(FACTOR_RANK);
  const schemes: { name: string; group: string; weights: Weights }[] = [
    { name: 'Rank-sum (baseline)', group: 'method', weights: base },
    { name: 'Rank order centroid (ROC)', group: 'method', weights: rankOrderCentroidWeights(FACTOR_RANK) },
    { name: 'Rank reciprocal', group: 'method', weights: rankReciprocalWeights(FACTOR_RANK) },
    { name: 'Equal weights', group: 'method', weights: equalWeights(FACTOR_RANK) },
  ];
  for (const f of FACTORS) {
    for (const m of [1.2, 0.8]) {
      schemes.push({ name: `${LABELS[f]} ${m > 1 ? '+' : '−'}20%`, group: 'perturbation', weights: adjustWeight(base, f, m) });
    }
  }

  const baseline = await new RiskAssessmentControl(undefined, base).assessAll(data);
  const counts = LEVEL_ORDER.map((l) => `${l} ${baseline.filter((a) => a.riskLevel === l).length}`).join(', ');

  const out: string[] = [];
  out.push(`Snapshot: ${data.generatedAt} · ${data.subzones.length} subzones · ${baseline.length} assessed`);
  out.push(`Baseline (rank-sum) levels: ${counts}`);
  out.push('');
  out.push(`| Weighting | ${FACTORS.map((f) => LABELS[f]).join(' | ')} |`);
  out.push(`|---|${FACTORS.map(() => '---').join('|')}|`);
  for (const s of schemes) out.push(`| ${s.name} | ${weightCells(s.weights)} |`);

  for (const group of ['method', 'perturbation']) {
    out.push('');
    out.push('| Weighting | Level changed | Up / down | Mean index shift | Max index shift | Top-10 kept | Spearman ρ |');
    out.push('|---|---|---|---|---|---|---|');
    for (const s of schemes.filter((x) => x.group === group && x.weights !== base)) {
      const result = await new RiskAssessmentControl(undefined, s.weights).assessAll(data);
      const c = compare(baseline, result);
      out.push(`| ${s.name} | ${pct(c.changedPct)} (${c.changed}) | ${c.up} / ${c.down} | ${c.meanShift.toFixed(2)} | ${c.maxShift.toFixed(1)} | ${c.topTenKept}/10 | ${c.spearman.toFixed(4)} |`);
    }
  }
  console.log(out.join('\n'));
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
