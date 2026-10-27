/**
 * Traces to: PreventionGuidanceControl (<<control>>) in class diagram
 * Related use case(s): UC-5 View Prevention Guidance
 *
 * IMPLEMENTED:
 * - loadChecklist() — returns the bundled NEA PreventionChecklist and its tasks
 * - showTaskDetails(taskId) — returns the selected task explanation and NEA source metadata
 *
 * Relationships (dependencies):
 * - Called by PreventionGuidanceBoundary
 * - Reads PreventionChecklist, PreventionTask
 */

import type { PreventionChecklist } from '../entity/PreventionChecklist.ts'
import type { PreventionTask } from '../entity/PreventionTask.ts'
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
const NEA_SAW_URL = 'https://www.nea.gov.sg/dengue-zika/stop-dengue-now';
const NEA_CLUSTERS_URL = 'https://www.nea.gov.sg/dengue-zika/dengue/dengue-clusters';
const NEA_GRAVITRAP_URL = 'https://www.nea.gov.sg/dengue-zika/Aedes';

export const BUNDLED_PREVENTION_TASKS: PreventionTask[] = [
  // GENERAL TIPS (Empty riskLevels = applicable at any level)
  {
    taskId: 'tip_gen_block_1',
    actionText: 'Break up hardened soil & Lift and empty flowerpot plates (B-L-O-C-K)',
    explanation:
      'Break up hardened soil to eliminate hidden pockets of stagnant water. Remove water from flowerpot plates every alternate day and scrub the plates thoroughly to remove Aedes mosquito eggs.',
    riskLevels: [],
    sourceUrl: NEA_PREVENT_URL,
  },
  {
    taskId: 'tip_gen_block_2',
    actionText: 'Overturn pails, Change vase water & Keep roof gutters clear (B-L-O-C-K)',
    explanation:
      'Ensure that containers are dry. Change water in vases every alternate day and wash plant roots under running water. Clear fallen leaves from roof gutters and drains, and place Bti insecticide in roof gutters monthly.',
    riskLevels: [],
    sourceUrl: NEA_PREVENT_URL,
  },

  // RISK-LEVEL TIER TIPS (At least 2 per RiskLevel: LOW, MODERATE, HIGH, VERY_HIGH)
  // LOW RISK (2 tips)
  {
    taskId: 'tip_level_low_1',
    actionText: 'Practice the 5-step Mozzie Wipeout once a week',
    explanation:
      'Even when local risk is Low, Aedes mosquitoes can breed in clean, stagnant water as small as a 20-cent coin. Conduct a routine weekly check of your home to prevent new breeding habitats.',
    riskLevels: [RiskLevel.Low],
    sourceUrl: NEA_PREVENT_URL,
  },
  {
    taskId: 'tip_level_low_2',
    actionText: 'Seal seldom-used gully traps and cover toilet bowls when away',
    explanation:
      'Keep gully traps covered or install anti-mosquito valves, and close toilet bowl lids if you are away from home for an extended period so mosquitoes cannot lay eggs indoors.',
    riskLevels: [RiskLevel.Low],
    sourceUrl: NEA_PREVENT_URL,
  },

  // MODERATE RISK (2 tips)
  {
    taskId: 'tip_level_moderate_1',
    actionText: 'Increase Mozzie Wipeout checks to every alternate day',
    explanation:
      'Because Aedes mosquitoes can complete their breeding cycle in about 7 days, checking and emptying water-bearing containers every alternate day stops larvae from maturing into adult mosquitoes.',
    riskLevels: [RiskLevel.Moderate],
    sourceUrl: NEA_PREVENT_URL,
  },
  {
    taskId: 'tip_level_moderate_2',
    actionText: 'Clear hardened soil on potted plants and dry wet floor traps',
    explanation:
      'Loosen hardened soil in potted plants so water does not puddle on the surface, and scrub bathroom floor traps to remove any mosquito eggs attached to the inner walls.',
    riskLevels: [RiskLevel.Moderate],
    sourceUrl: NEA_PREVENT_URL,
  },

  // HIGH RISK (2 tips)
  {
    taskId: 'tip_level_high_1',
    actionText: 'Take extra precautions: Apply DEET, picaridin, or IR3535 insect repellent (S-A-W)',
    explanation:
      'When in or visiting a High risk area, take extra precautions against mosquito bites by applying NEA-recommended insect repellent (containing DEET, picaridin, or IR3535) regularly to exposed skin.',
    riskLevels: [RiskLevel.High],
    sourceUrl: NEA_SAW_URL,
  },
  {
    taskId: 'tip_level_high_2',
    actionText: 'Take extra precautions: Spray insecticide in dark corners of your home (S-A-W)',
    explanation:
      'Adult Aedes mosquitoes prefer resting in cool, dark, and shaded indoor spaces. Spray aerosol insecticide under beds, behind curtains, and under sofas to eliminate adult mosquitoes.',
    riskLevels: [RiskLevel.High],
    sourceUrl: NEA_SAW_URL,
  },

  // VERY HIGH RISK (2 tips)
  {
    taskId: 'tip_level_very_high_1',
    actionText: 'Take extra precautions daily: Wear long-sleeved tops and long pants (S-A-W)',
    explanation:
      'In Very High risk areas, take extra personal precautions by wearing light-coloured, long-sleeved shirts and long trousers alongside regular repellent application, especially during peak biting hours after dawn and before dusk.',
    riskLevels: [RiskLevel.VeryHigh],
    sourceUrl: NEA_SAW_URL,
  },
  {
    taskId: 'tip_level_very_high_2',
    actionText: 'Take extra precautions: Perform daily stagnant-water checks and indoor spraying',
    explanation:
      'Combine daily B-L-O-C-K stagnant-water removal with S-A-W protective actions (Spray insecticide in dark corners, Apply repellent regularly, Wear covered clothing) and install window screens where possible.',
    riskLevels: [RiskLevel.VeryHigh],
    sourceUrl: NEA_SAW_URL,
  },

  // FACTOR-TRIGGERED TIPS (At least 1 per RiskFactorType across all 5 factors)
  // 1. Dengue Clusters
  {
    taskId: 'tip_factor_clusters',
    actionText: 'Active cluster precaution: Apply repellent and cooperate with NEA inspections',
    explanation:
      'Active dengue clusters indicate ongoing transmission nearby. Take extra precautions with S-A-W (Spray insecticide, Apply repellent, Wear long sleeves/pants) and allow NEA officers to inspect premises and carry out misting.',
    riskLevels: [],
    triggerFactor: RiskFactorType.DengueClusters,
    minContributionLevel: ContributionLevel.Moderate,
    sourceUrl: NEA_CLUSTERS_URL,
  },

  // 2. High-Aedes Area
  {
    taskId: 'tip_factor_aedes',
    actionText: 'High Gravitrap Aedes population: Eliminate indoor resting & breeding spots',
    explanation:
      'NEA Gravitrap surveillance detects a higher female Aedes aegypti mosquito population in this area. Spray aerosol insecticide in dark indoor corners (behind curtains and under furniture) and scrub dish-drying trays and plant plates.',
    riskLevels: [],
    triggerFactor: RiskFactorType.HighAedesArea,
    minContributionLevel: ContributionLevel.Moderate,
    sourceUrl: NEA_GRAVITRAP_URL,
  },

  // 3. Population Density
  {
    taskId: 'tip_factor_density',
    actionText: 'High-density living: Check shared corridors, dish racks, and balcony drains',
    explanation:
      'In densely populated residential areas, mosquitoes can easily fly between neighbouring units. Keep corridor plant pots, bamboo pole holders, and kitchen dish-drying trays completely dry.',
    riskLevels: [],
    triggerFactor: RiskFactorType.PopulationDensity,
    minContributionLevel: ContributionLevel.Moderate,
    sourceUrl: NEA_PREVENT_URL,
  },

  // 4. Humidity
  {
    taskId: 'tip_factor_humidity',
    actionText: 'Humid conditions: Inspect indoor trays and air-conditioner condensate pans',
    explanation:
      'Elevated humidity prolongs adult Aedes mosquito survival and activity. Check air-conditioner trays, refrigerator drip pans, and bathroom receptacles every alternate day to prevent indoor breeding.',
    riskLevels: [],
    triggerFactor: RiskFactorType.Humidity,
    minContributionLevel: ContributionLevel.Moderate,
    sourceUrl: NEA_PREVENT_URL,
  },

  // 5. Lagged Rainfall
  {
    taskId: 'tip_factor_rainfall',
    actionText: 'Post-rainfall check: Clear outdoor containers, canvas sheets, and drains',
    explanation:
      'Recent rainfall creates stagnant puddles in outdoor receptacles, canvas sheets, and clogged drains. Overturn outdoor pails, pull taut any canvas coverings, and clear fallen leaves after rain.',
    riskLevels: [],
    triggerFactor: RiskFactorType.LaggedRainfall,
    minContributionLevel: ContributionLevel.Moderate,
    sourceUrl: NEA_PREVENT_URL,
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

    constructor(checkList: PreventionChecklist = BUNDLED_PREVENTION_CHECKLIST){
        this.checkList = checkList
    }
    //Loads the PreventionChecklist and its tasks
    public async loadChecklist(): Promise<PreventionChecklist> {
        if (!this.checkList || !Array.isArray(this.checkList.tasks) || this.checkList.tasks.length === 0)
            throw new Error('Prevention guidance is currently unavailable')
        return this.checkList
    }

    //Returns the selected task's explanation and source information.
    public async showTaskDetails(taskId: string): Promise<TaskDetails | null> {
        if (!taskId || !this.checkList || !Array.isArray(this.checkList.tasks))
            return null

        const foundTask = this.checkList.tasks.find((task) => task.taskId === taskId)
        if (!foundTask)
            return null

        return {
            task: foundTask,
            sourceName: this.checkList.sourceName,
            sourceVersion: this.checkList.sourceVersion,
            sourceReference: foundTask.sourceUrl || this.checkList.sourceReference
        }
    }
}
