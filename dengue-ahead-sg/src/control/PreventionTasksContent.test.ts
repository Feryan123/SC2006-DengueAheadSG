/**
 * Tests for backlog #16: bundled prevention tip content meets the acceptance criteria.
 * Traces to UC-3 View Prevention Guidance.
 */
import { describe, expect, it } from 'vitest'
import { BUNDLED_PREVENTION_TASKS } from './PreventionGuidanceControl.ts'
import { ContributionLevel, RiskFactorType, RiskLevel } from '../entity/enums.ts'

const AVOIDANCE_WORDING = /avoid|stay away|stay out|keep away|not (go|visit|enter)/i
const levels = Object.values(RiskLevel)
const factors = Object.values(RiskFactorType)

describe('bundled prevention tip content (#16)', () => {
    it('gives every tip an id, action text, explanation and an https .gov.sg source link', () => {
        for (const task of BUNDLED_PREVENTION_TASKS) {
            expect(task.taskId.trim()).not.toBe('')
            expect(task.actionText.trim()).not.toBe('')
            expect(task.explanation.trim()).not.toBe('')
            const url = new URL(task.sourceUrl)
            expect(url.protocol).toBe('https:')
            expect(url.hostname === 'gov.sg' || url.hostname.endsWith('.gov.sg'), task.taskId).toBe(true)
        }
    })

    it('uses unique task ids', () => {
        const ids = BUNDLED_PREVENTION_TASKS.map((task) => task.taskId)
        expect(new Set(ids).size).toBe(ids.length)
    })

    it('has at least 2 tips for each risk level', () => {
        for (const level of levels) {
            const count = BUNDLED_PREVENTION_TASKS.filter((task) => task.riskLevels.includes(level)).length
            expect(count, `tips for ${level}`).toBeGreaterThanOrEqual(2)
        }
    })

    it('has at least 1 tip for each risk factor', () => {
        for (const factor of factors) {
            const count = BUNDLED_PREVENTION_TASKS.filter((task) => task.triggerFactor === factor).length
            expect(count, `tips for ${factor}`).toBeGreaterThanOrEqual(1)
        }
    })

    it('uses only valid risk levels, factors and contribution levels', () => {
        for (const task of BUNDLED_PREVENTION_TASKS) {
            for (const level of task.riskLevels) expect(levels).toContain(level)
            if (task.triggerFactor) 
                expect(factors).toContain(task.triggerFactor)
            if (task.minContributionLevel) 
                expect(Object.values(ContributionLevel)).toContain(task.minContributionLevel)
        }
    })

    it('gives every factor tip a minimum contribution level and no other tip one', () => {
        for (const task of BUNDLED_PREVENTION_TASKS) {
            if (task.triggerFactor) 
                expect(task.minContributionLevel, task.taskId).toBeDefined()
            else expect(task.minContributionLevel, task.taskId).toBeUndefined()
        }
    })

    it('never tells visitors to avoid an area in tips shown at HIGH or VERY_HIGH', () => {
        const shownAtHigh = BUNDLED_PREVENTION_TASKS.filter((task) =>
            task.riskLevels.length === 0 ||
            task.riskLevels.includes(RiskLevel.High) ||
            task.riskLevels.includes(RiskLevel.VeryHigh))
        expect(shownAtHigh.length).toBeGreaterThan(0)
        for (const task of shownAtHigh) {
            expect(`${task.actionText} ${task.explanation}`, task.taskId).not.toMatch(AVOIDANCE_WORDING)
        }
    })
})