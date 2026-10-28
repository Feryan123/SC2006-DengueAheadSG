/**
 * Tests for backlog #17: PreventionGuidanceControl.generateTips (basis-path style).
 * Traces to UC-3 View Prevention Guidance.
 *
 * Paths covered: no assessment; each risk level; top-2 contributors only; contribution-level
 * gating; factor tips limited by riskLevels; no duplicates; ordering; local detail filling.
 */
import { describe, expect, it } from 'vitest'
import {
    BUNDLED_PREVENTION_CHECKLIST,
    BUNDLED_PREVENTION_TASKS,
    PreventionGuidanceControl,
} from './PreventionGuidanceControl.ts'
import { ContributionLevel, RiskFactorType, RiskLevel } from '../entity/enums.ts'
import type { PreventionChecklist } from '../entity/PreventionChecklist.ts'
import type { PreventionTask } from '../entity/PreventionTask.ts'
import type { RiskAssessment } from '../entity/RiskAssessment.ts'

// Only the fields generateTips reads; the cast skips the rest of RiskAssessment.
function contribution(
    factorType: RiskFactorType, value: number, level: ContributionLevel, explanation = `${factorType} explanation`,
) {
    return { factorType, inputValue: 1, contribution: value, contributionLevel: level, explanation }
}

function assessment(
    riskLevel: RiskLevel,
    contributions: ReturnType<typeof contribution>[] = [],
    subzoneId = 'SZ1',
): RiskAssessment {
    return { subzoneId, riskLevel, contributions } as unknown as RiskAssessment
}

const control = new PreventionGuidanceControl()
const ids = (tips: PreventionTask[]) => tips.map((tip) => tip.taskId)

const generalIds = BUNDLED_PREVENTION_TASKS
    .filter((task) => task.riskLevels.length === 0 && !task.triggerFactor).map((task) => task.taskId)
const levelIds = (level: RiskLevel) => BUNDLED_PREVENTION_TASKS
    .filter((task) => !task.triggerFactor && task.riskLevels.includes(level)).map((task) => task.taskId)
const factorTipId = (factor: RiskFactorType) =>
    BUNDLED_PREVENTION_TASKS.find((task) => task.triggerFactor === factor)!.taskId

describe('generateTips: no assessment available', () => {
    it('returns only general tips for a null assessment', async () => {
        const tips = await control.generateTips(null)
        expect(ids(tips)).toEqual(generalIds)
    })

    it('returns only general tips for an undefined assessment', async () => {
        expect(ids(await control.generateTips(undefined))).toEqual(generalIds)
    })
})

describe('generateTips: risk-level tips', () => {
    it.each(Object.values(RiskLevel))('%s includes its own level tips and no other level tips', async (level) => {
        const tips = ids(await control.generateTips(assessment(level)))
        for (const id of levelIds(level)) expect(tips).toContain(id)
        for (const other of Object.values(RiskLevel).filter((l) => l !== level)) {
            for (const id of levelIds(other)) expect(tips, `${id} at ${level}`).not.toContain(id)
        }
        for (const id of generalIds) expect(tips).toContain(id)
    })

    it('has at least 2 level tips for every risk level', () => {
        for (const level of Object.values(RiskLevel)) expect(levelIds(level).length).toBeGreaterThanOrEqual(2)
    })
})

describe('generateTips: factor tips', () => {
    it('uses only the top 2 contributors', async () => {
        const tips = ids(await control.generateTips(assessment(RiskLevel.Low, [
            contribution(RiskFactorType.DengueClusters, 40, ContributionLevel.High),
            contribution(RiskFactorType.Humidity, 30, ContributionLevel.Moderate),
            contribution(RiskFactorType.LaggedRainfall, 20, ContributionLevel.High),
        ])))
        expect(tips).toContain(factorTipId(RiskFactorType.DengueClusters))
        expect(tips).toContain(factorTipId(RiskFactorType.Humidity))
        expect(tips).not.toContain(factorTipId(RiskFactorType.LaggedRainfall))
    })

    it('skips a top contributor whose contribution level is below the tip minimum', async () => {
        const tips = ids(await control.generateTips(assessment(RiskLevel.Low, [
            contribution(RiskFactorType.DengueClusters, 50, ContributionLevel.Low),
            contribution(RiskFactorType.HighAedesArea, 30, ContributionLevel.Moderate),
        ])))
        expect(tips).not.toContain(factorTipId(RiskFactorType.DengueClusters))
        expect(tips).toContain(factorTipId(RiskFactorType.HighAedesArea))
    })

    it('adds the contributor explanation to its factor tip', async () => {
        const tips = await control.generateTips(assessment(RiskLevel.Low, [
            contribution(RiskFactorType.DengueClusters, 40, ContributionLevel.High, '3 cluster cases nearby'),
        ]))
        const tip = tips.find((t) => t.taskId === factorTipId(RiskFactorType.DengueClusters))!
        expect(tip.explanation).toContain('Why this tip is relevant: 3 cluster cases nearby')
    })

    it('lists level tips, then factor tips, then general tips', async () => {
        const tips = ids(await control.generateTips(assessment(RiskLevel.High, [
            contribution(RiskFactorType.DengueClusters, 40, ContributionLevel.High),
        ])))
        const lastLevel = Math.max(...levelIds(RiskLevel.High).map((id) => tips.indexOf(id)))
        const factorIndex = tips.indexOf(factorTipId(RiskFactorType.DengueClusters))
        const firstGeneral = Math.min(...generalIds.map((id) => tips.indexOf(id)))
        expect(lastLevel).toBeLessThan(factorIndex)
        expect(factorIndex).toBeLessThan(firstGeneral)
    })

    it('only shows a factor tip at the risk levels it lists', async () => {
        const lowOnly: PreventionTask = {
            taskId: 'factor-low-only', actionText: 'a', explanation: 'b', riskLevels: [RiskLevel.Low],
            triggerFactor: RiskFactorType.Humidity, minContributionLevel: ContributionLevel.Low,
            sourceUrl: 'https://www.nea.gov.sg/x',
        }
        const custom = new PreventionGuidanceControl({ ...BUNDLED_PREVENTION_CHECKLIST, tasks: [lowOnly] })
        const humid = [contribution(RiskFactorType.Humidity, 40, ContributionLevel.High)]
        expect(ids(await custom.generateTips(assessment(RiskLevel.Low, humid)))).toContain('factor-low-only')
        expect(ids(await custom.generateTips(assessment(RiskLevel.High, humid)))).not.toContain('factor-low-only')
    })
})

describe('generateTips: duplicates and order', () => {
    it('never returns the same tip twice', async () => {
        const tips = ids(await control.generateTips(assessment(RiskLevel.VeryHigh, [
            contribution(RiskFactorType.DengueClusters, 40, ContributionLevel.High),
            contribution(RiskFactorType.HighAedesArea, 35, ContributionLevel.High),
        ])))
        expect(new Set(tips).size).toBe(tips.length)
    })

    it('lists level tips, then factor tips, then general tips', async () => {
        const tips = ids(await control.generateTips(assessment(RiskLevel.High, [
            contribution(RiskFactorType.DengueClusters, 40, ContributionLevel.High),
        ])))
        const lastLevel = Math.max(...levelIds(RiskLevel.High).map((id) => tips.indexOf(id)))
        const factorIndex = tips.indexOf(factorTipId(RiskFactorType.DengueClusters))
        const firstGeneral = Math.min(...generalIds.map((id) => tips.indexOf(id)))
        expect(lastLevel).toBeLessThan(factorIndex)
        expect(factorIndex).toBeLessThan(firstGeneral)
    })
})

describe('generateTips: local details', () => {
    const placeholderTip: PreventionTask = {
        taskId: 'general-local', actionText: 'Check around {subzone}', explanation: 'Mosquitoes breed in {subzone}.',
        riskLevels: [], sourceUrl: 'https://www.nea.gov.sg/x',
    }
    const checklist: PreventionChecklist = { ...BUNDLED_PREVENTION_CHECKLIST, tasks: [placeholderTip] }
    const custom = new PreventionGuidanceControl(checklist)

    it('uses a subzone name given as a string', async () => {
        const [tip] = await custom.generateTips(assessment(RiskLevel.Low), 'Bedok North')
        expect(tip.actionText).toBe('Check around Bedok North')
        expect(tip.explanation).toBe('Mosquitoes breed in Bedok North.')
    })

    it('uses a subzone name given as an object', async () => {
        const [tip] = await custom.generateTips(assessment(RiskLevel.Low), { subzoneId: 'BN', name: 'Bedok North' })
        expect(tip.actionText).toBe('Check around Bedok North')
    })

    it('falls back to the assessment subzone id, then to "your area"', async () => {
        const [withId] = await custom.generateTips(assessment(RiskLevel.Low, [], 'BN01'))
        expect(withId.actionText).toBe('Check around BN01')
        const [nothing] = await custom.generateTips(null)
        expect(nothing.actionText).toBe('Check around your area')
    })

        it('fills the area name into bundled tips that use {subzone}', async () => {
        const tips = await control.generateTips(assessment(RiskLevel.VeryHigh), 'Bedok North')
        const tip = tips.find((t) => t.taskId === 'tip_level_very_high_1')!
        expect(tip.actionText).toContain('Bedok North')
    })

    it('leaves no raw placeholder in any generated or loaded tip', async () => {
        for (const level of Object.values(RiskLevel)) {
            for (const tip of await control.generateTips(assessment(level), 'Bedok North')) {
                expect(`${tip.actionText} ${tip.explanation}`, tip.taskId).not.toMatch(/\{\w+\}/)
            }
        }
        for (const tip of (await control.loadChecklist()).tasks) {
            expect(`${tip.actionText} ${tip.explanation}`, tip.taskId).not.toMatch(/\{\w+\}/)
        }
    })
})