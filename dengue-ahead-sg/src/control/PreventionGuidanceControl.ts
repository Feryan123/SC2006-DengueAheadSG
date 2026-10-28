/**
 * Traces to: PreventionGuidanceControl (<<control>>) in class diagram
 * Related use case(s): UC-3 View Prevention Guidance
 *
 * IMPLEMENTED:
 * - loadChecklist() — returns the bundled NEA PreventionChecklist and its tasks
 * - showTaskDetails(taskId) — returns the selected task explanation and NEA source metadata
 * - generateTips(assessment, subzone?) — personalised tips by risk level and top 2 contributors; falls back to "your area" when no name is given
 *
 * Relationships (dependencies):
 * - Called by PreventionGuidanceBoundary
 * - Reads PreventionChecklist, PreventionTask, RiskAssessment, PlanningSubzone
 */

import type { PlanningSubzone } from '../entity/PlanningSubzone.ts';
import type { PreventionChecklist } from '../entity/PreventionChecklist.ts'
import type { PreventionTask } from '../entity/PreventionTask.ts'
import type { RiskAssessment } from '../entity/RiskAssessment.ts';
import {
    ContributionLevel,
    RiskFactorType,
    RiskLevel,
} from '../entity/enums.ts';

export interface TaskDetails {
    task: PreventionTask
    sourceName: string
    sourceVersion: string
    sourceReference: string
}

const NEA_PREVENT_URL = 'https://www.nea.gov.sg/dengue-zika/prevent-aedes-mosquito-breeding';
const NEA_OTHER_URL = 'https://www.nea.gov.sg/dengue-zika/prevent-aedes-mosquito-breeding/other-preventive-measures'
const NEA_SAW_URL = 'https://www.nea.gov.sg/dengue-zika/stop-dengue-now';
const NEA_GRAVITRAP_URL = 'https://www.nea.gov.sg/dengue-zika/Aedes';
const NEA_REPELLENT_URL = 'https://www.nea.gov.sg/dengue-zika/stop-dengue-now/use-of-mosquito-repellents'

const CONTRIBUTION_RANK: Record <ContributionLevel, number> = {
  [ContributionLevel.Low]: 1,
  [ContributionLevel.Moderate]: 2,
  [ContributionLevel.High]: 3
}

export const BUNDLED_PREVENTION_TASKS: PreventionTask[] = [
  // GENERAL TIPS (Empty riskLevels = applicable at any level)
  {
    taskId: 'tip_gen_block_1',
    actionText: 'Break up hardened soil & Lift and empty flowerpot plates (B-L-O-C-K)',
    explanation:
      'Break up hardened soil to eliminate hidden pockets of stagnant water. Remove water from flowerpot plates every alternate day and scrub the plates thoroughly to remove Aedes mosquito eggs.',
    riskLevels: [],
    sourceUrl: NEA_OTHER_URL,
  },
  {
    taskId: 'tip_gen_block_2',
    actionText: 'Overturn pails, Change vase water & Keep roof gutters clear (B-L-O-C-K)',
    explanation:
      'Ensure that containers are dry. Change water in vases every alternate day and wash plant roots under running water. Clear fallen leaves from roof gutters and drains, and place Bti insecticide in roof gutters monthly.',
    riskLevels: [],
    sourceUrl: NEA_OTHER_URL,
  },

  // RISK-LEVEL TIER TIPS (At least 2 per RiskLevel: LOW, MODERATE, HIGH, VERY_HIGH)
  // LOW RISK (2 tips)
  {
    taskId: 'tip_level_low_1',
    actionText: 'Practice the 5-step Mozzie Wipeout once a week',
    explanation:
      'Even when local risk in {subzone} is Low, Aedes mosquitoes can breed in clean, stagnant water as small as a 20-cent coin. Conduct a routine weekly check of your home to prevent new breeding habitats.',
    riskLevels: [RiskLevel.Low],
    sourceUrl: NEA_SAW_URL,
  },
  {
    taskId: 'tip_level_low_2',
    actionText: 'Cover rarely used gully traps',
    explanation:
      'NEA\'s checklist says to cover rarely used gully traps or replace them with non-perforated ones fitted with an anti-mosquito valve. Gully traps are among the top breeding habitats NEA finds in public areas.',
    riskLevels: [RiskLevel.Low],
    sourceUrl: NEA_OTHER_URL,
  },

  // MODERATE RISK (2 tips)
  {
    taskId: 'tip_level_moderate_1',
    actionText: 'Remove water from plant pot plates and change vase water every other day and do the full Mozzie Wipeout every week',
    explanation:
      'NEA\'s checklist puts plant pot plates and flower vases on an every-other-day schedule and clearing scupper drains and gardens on a weekly one. NEA\'s life-cycle figures show an egg can become an adult in about a week so regular checks stop mosquitoes from maturing.',
    riskLevels: [RiskLevel.Moderate],
    sourceUrl: NEA_OTHER_URL,
  },
  {
    taskId: 'tip_level_moderate_2',
    actionText: 'Loosen soil in potted plants, and turn pails and watering cans over',
    explanation:
      'NEA\'s checklist says to loosen soil so water does not collect on hardened soil and to turn pails and watering cans over and store them under shelter. Pails are the most common breeding habitat NEA finds in homes.',
    riskLevels: [RiskLevel.Moderate],
    sourceUrl: NEA_OTHER_URL,
  },

  // HIGH RISK (2 tips)
  {
    taskId: 'tip_level_high_1',
    actionText: 'Take extra precautions: Apply an NEA-registered insect repellent (DEET, picaridin, or IR3535 insect repellent) to exposed skin and reapply as the label says (S-A-W)',
    explanation:
      'NEA says repellents with DEET, picaridin or IR3535 are the most effective, and to reapply according to the product label. Look for the NEA registration mark when buying.',
    riskLevels: [RiskLevel.High],
    sourceUrl: NEA_REPELLENT_URL,
  },
  {
    taskId: 'tip_level_high_2',
    actionText: 'Take extra precautions in {subzone}: spray insecticide in dark corners around your home, such as under the bed or sofa and behind curtains (S-A-W)',
    explanation:
      'Spraying dark corners is the first of NEA\'s three protective actions against dengue (Spray, Apply, Wear). Follow the product label; NEA has a video on using aerosol insecticide safely.',
    riskLevels: [RiskLevel.High],
    sourceUrl: NEA_SAW_URL,
  },

  // VERY HIGH RISK (2 tips)
  {
    taskId: 'tip_level_very_high_1',
    actionText: 'Take extra precautions in {subzone}: Wear long-sleeved tops and long pants and keep applying repellent (S-A-W)',
    explanation:
      'Wearing long sleeves and long pants is the third of NEA\'s S-A-W actions. NEA encourages all residents, especially those living in dengue cluster areas, to do all three.',
    riskLevels: [RiskLevel.VeryHigh],
    sourceUrl: NEA_SAW_URL,
  },
  {
    taskId: 'tip_level_very_high_2',
    actionText: 'Take extra precautions: do the B-L-O-C-K steps at least once a week, take all three S-A-W actions, and fit mosquito screens on windows and doors where you can',
    explanation:
      'NEA advises doing the Mozzie Wipeout at least once a week, and lists mosquito screens on windows and doors among its other protective measures against bites.',
    riskLevels: [RiskLevel.VeryHigh],
    sourceUrl: NEA_SAW_URL,
  },

  // FACTOR-TRIGGERED TIPS (At least 1 per RiskFactorType across all 5 factors)
  // 1. Dengue Clusters
  {
    taskId: 'tip_factor_clusters',
    actionText: 'Take the three protective actions against dengue: Spray insecticide in dark corners, Apply repellent regularly, Wear long sleeves and long pants',
    explanation:
      'An active dengue cluster means transmission nearby. NEA encourages all residents, especially those in cluster areas, to do all three, and to cooperate with NEA officers during inspection rounds.',
    riskLevels: [],
    triggerFactor: RiskFactorType.DengueClusters,
    minContributionLevel: ContributionLevel.Moderate,
    sourceUrl: NEA_SAW_URL,
  },

  // 2. High-Aedes Area
  {
    taskId: 'tip_factor_aedes',
    actionText: 'Do the Mozzie Wipeout regularly in {subzone}, and remind family, friends and neighbours to remove stagnant water around their homes',
    explanation:
      'NEA\'s Gravitrap surveillance detects areas with a higher Aedes aegypti population, and NEA urges residents there to practise the Mozzie Wipeout regularly. NEA also reminds that low risk does not mean no risk.',
    riskLevels: [],
    triggerFactor: RiskFactorType.HighAedesArea,
    minContributionLevel: ContributionLevel.Moderate,
    sourceUrl: NEA_GRAVITRAP_URL,
  },

  // 3. Population Density
  {
    taskId: 'tip_factor_density',
    actionText: 'Keep shared-corridor scupper drains clear, and cover bamboo pole holders after use',
    explanation:
      'NEA\'s checklist says not to block the flow of water in scupper drains along common corridors in HDB estates or put pots over them, and to cover bamboo pole holders because rainwater can collect in them. HDB corridor scupper and gully drains were among the top breeding habitats NEA found in public areas in 2025.',
    riskLevels: [],
    triggerFactor: RiskFactorType.PopulationDensity,
    minContributionLevel: ContributionLevel.Moderate,
    sourceUrl: NEA_OTHER_URL,
  },

  // 4. Humidity
  {
    taskId: 'tip_factor_humidity',
    actionText: 'Remove water from plant pot plates and change vase water every other day',
    explanation:
      'NEA\'s checklist puts these two on an every-other-day schedule: scrub the plate or vase thoroughly and wash plant roots, because mosquito eggs stick to them easily.',
    riskLevels: [],
    triggerFactor: RiskFactorType.Humidity,
    minContributionLevel: ContributionLevel.Moderate,
    sourceUrl: NEA_OTHER_URL,
  },

  // 5. Lagged Rainfall
  {
    taskId: 'tip_factor_rainfall',
    actionText: 'Clear fallen leaves and stagnant water from scupper drains and your garden once a week, and turn pails over',
    explanation:
      'NEA\'s weekly checklist includes clearing leaves and water from scupper drains and gardens, because leaves can block drains and cause stagnant water to build up.',
    riskLevels: [],
    triggerFactor: RiskFactorType.LaggedRainfall,
    minContributionLevel: ContributionLevel.Moderate,
    sourceUrl: NEA_OTHER_URL,
  },
];

export const BUNDLED_PREVENTION_CHECKLIST: PreventionChecklist = {
    checklistId: 'nea-mozzie-wipeout-2026',
    sourceName: 'National Environment Agency (NEA) Singapore',
    sourceVersion: 'Mozzie Wipeout (B-L-O-C-K & S-A-W Guidance, 2026)',
    sourceReference: NEA_PREVENT_URL,
    tasks: BUNDLED_PREVENTION_TASKS,
};

export class PreventionGuidanceControl {
  private readonly checkList: PreventionChecklist

  constructor(checkList: PreventionChecklist = BUNDLED_PREVENTION_CHECKLIST) {
    this.checkList = checkList
  }

  /** Load the bundled checklist and fill any supported local placeholders. */
  public async loadChecklist(): Promise<PreventionChecklist> {
    if (!Array.isArray(this.checkList.tasks) || this.checkList.tasks.length === 0)
      throw new Error("Prevention guidance is currently unavailable.")

    return {
      ...this.checkList,
      tasks: this.checkList.tasks.map((task) =>
        this.fillLocalDetails(task, "your area"),
      ),
    }
  }

  /** Return the selected task and its source information, or null if not found. */
  public async showTaskDetails(taskId: string): Promise<TaskDetails | null> {
    if (!taskId || !Array.isArray(this.checkList.tasks))
      return null

    const foundTask = this.checkList.tasks.find((task) => task.taskId === taskId)
    if (!foundTask) {
      return null
    }

    const formattedTask = this.fillLocalDetails(foundTask, "your area")

    return {
      task: formattedTask,
      sourceName: this.checkList.sourceName,
      sourceVersion: this.checkList.sourceVersion,
      sourceReference: foundTask.sourceUrl || this.checkList.sourceReference,
    };
  }

  /**
   * Generate tips for a particular risk assessment.
   * General tips are always included when an assessment is available;
   * Matching risk-level tips come first, then tips for the two strongest contributors,
   * then the general tips that apply at any level.
   */
  public async generateTips(
    assessment: RiskAssessment | null | undefined,
    subzone?: Pick<PlanningSubzone, "subzoneId" | "name"> | string | null,
  ): Promise<PreventionTask[]> {
    const subzoneNameFromArgument =
      typeof subzone === "string"
        ? subzone.trim()
        : subzone != null
          ? subzone.name?.trim()
          : ""
    const resolvedSubzoneName = subzoneNameFromArgument || "your area"

    const generalTips = this.checkList.tasks
      .filter((task) => task.riskLevels.length === 0 && !task.triggerFactor)
      .map((task) => this.fillLocalDetails(task, resolvedSubzoneName))

    if (!assessment)
      return generalTips

    const selectedTips: PreventionTask[] = []
    const seenTaskIds = new Set<string>()

    const addTipIfUnique = (
      task: PreventionTask,
      factorDetail?: string,
    ): void => {
      if (seenTaskIds.has(task.taskId))
        return

      seenTaskIds.add(task.taskId)
      selectedTips.push(
        this.fillLocalDetails(task, resolvedSubzoneName, factorDetail),
      )
    }

    // Add tasks that match the assessed risk level.
    // Factor-specific tasks are handled separately so they can be checked against contributions.
    for (const task of this.checkList.tasks) {
      if (!task.triggerFactor && task.riskLevels.length > 0 &&
        task.riskLevels.includes(assessment.riskLevel)
      )
        addTipIfUnique(task)
    }

    // Pick the two strongest contributors and add eligible factor-specific tips.
    const topTwoContributors = [...(assessment.contributions ?? [])]
      .sort((a, b) => b.contribution - a.contribution)
      .slice(0, 2)

    for (const contributor of topTwoContributors) {
      const contributorRank = CONTRIBUTION_RANK[contributor.contributionLevel] ?? 0

      for (const task of this.checkList.tasks) {
        if (task.triggerFactor !== contributor.factorType)
          continue

        if (task.riskLevels.length > 0 && !task.riskLevels.includes(assessment.riskLevel))
          continue

        const requiredRank = task.minContributionLevel
          ? CONTRIBUTION_RANK[task.minContributionLevel]
          : 1

        if (contributorRank >= requiredRank) 
          addTipIfUnique(task, contributor.explanation)
      }
    }

    // Keep general prevention guidance even when tailored tips are available.
    return [...selectedTips, ...generalTips]
  }

  private fillLocalDetails(
    task: PreventionTask,
    subzoneName: string,
    factorDetails?: string,
  ): PreventionTask {
    const cleanDetail =
      factorDetails?.trim() ||
      `elevated ${task.triggerFactor ?? "risk factor"} score in ${subzoneName}`

    const explanation = task.explanation
      .replaceAll("{subzone}", subzoneName)
      .replaceAll("({factorDetail})", factorDetails ? ` (${cleanDetail})` : '')
      .replaceAll("{factorDetail}", cleanDetail)

    // Bundled task explanations do not all contain a {factorDetail} placeholder.
    // Append the contributor's explanation so it is still shown when available.
    const explanationWithContext = factorDetails?.trim()
      ? `${explanation} Why this tip is relevant: ${cleanDetail}`
      : explanation;

    return {
      ...task,
      actionText: task.actionText.replaceAll("{subzone}", subzoneName),
      explanation: explanationWithContext
    }
  }
}

export default PreventionGuidanceControl;
