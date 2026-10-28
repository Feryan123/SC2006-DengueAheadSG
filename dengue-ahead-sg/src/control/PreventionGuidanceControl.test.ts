/**
 * Tests for PreventionGuidanceControl (loadChecklist, showTaskDetails).
 * Traces to UC-3 View Prevention Guidance.
 *
 * ASSUMPTION: PreventionChecklist has a `tasks: PreventionTask[]` array and a `checklistId`.
 * If tsc says otherwise, adjust the two property names below to match the entity.
 */
import { describe, expect, it } from 'vitest'
import { PreventionGuidanceControl } from './PreventionGuidanceControl.ts'

describe('PreventionGuidanceControl.loadChecklist', () => {
    it('returns a checklist with an id and at least one task', async () => {
        const checklist = await new PreventionGuidanceControl().loadChecklist()
        expect(checklist.checklistId.trim()).not.toBe('')
        expect(checklist.tasks.length).toBeGreaterThan(0)
    })

    it('gives every task an id, action text and explanation', async () => {
        const checklist = await new PreventionGuidanceControl().loadChecklist()
        for (const task of checklist.tasks) {
            expect(task.taskId.trim()).not.toBe('')
            expect(task.actionText.trim()).not.toBe('')
            expect(task.explanation.trim()).not.toBe('')
        }
    })
})

describe('PreventionGuidanceControl.showTaskDetails', () => {
    it('returns the task with its source information when the id exists', async () => {
        const control = new PreventionGuidanceControl()
        const checklist = await control.loadChecklist()
        const task = checklist.tasks[0]

        const details = await control.showTaskDetails(task.taskId)

        expect(details).not.toBeNull()
        expect(details?.task.taskId).toBe(task.taskId)
        expect(details?.sourceName.trim()).not.toBe('')
        expect(details?.sourceReference.trim()).not.toBe('')
    })

    it('finds every task in the checklist by its id', async () => {
        const control = new PreventionGuidanceControl()
        const checklist = await control.loadChecklist()
        for (const task of checklist.tasks) {
            expect((await control.showTaskDetails(task.taskId))?.task.taskId).toBe(task.taskId)
        }
    })

    it('returns null when the id does not exist', async () => {
        expect(await new PreventionGuidanceControl().showTaskDetails('no-such-task')).toBeNull()
    })

    it('returns null for an empty id', async () => {
        expect(await new PreventionGuidanceControl().showTaskDetails('')).toBeNull()
    })
})