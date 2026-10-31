// @vitest-environment jsdom
// - Ticket 31: the prevention page lists the NEA tasks, shows details and links the source.
// - Uses a small fake checklist so the tests do not depend on the bundled tip wording.

import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import PreventionGuidanceBoundary, { type PreventionGuidanceBoundaryProps } from './PreventionGuidanceBoundary.tsx';
import {
  BUNDLED_PREVENTION_TASKS,
  PreventionGuidanceControl,
} from '../control/PreventionGuidanceControl.ts';
import type { PreventionChecklist } from '../entity/PreventionChecklist.ts';
import type { PreventionTask } from '../entity/PreventionTask.ts';

const task1: PreventionTask = {
  taskId: 't1', actionText: 'Do the Mozzie Wipeout every week', explanation: 'Removes stagnant water.',
  riskLevels: [], sourceUrl: 'https://www.nea.gov.sg/dengue-zika/stop-dengue-now',
};
const task2: PreventionTask = {
  taskId: 't2', actionText: 'Cover rarely used gully traps', explanation: 'Stops breeding in drains.',
  riskLevels: [], sourceUrl: 'https://www.nea.gov.sg/dengue-zika/prevent-aedes-mosquito-breeding/other-preventive-measures',
};
const checklist: PreventionChecklist = {
  checklistId: 'test', sourceName: 'NEA', sourceVersion: 'Test guide',
  sourceReference: 'https://www.nea.gov.sg/dengue-zika', tasks: [task1, task2],
};

let container: HTMLDivElement;
let root: Root;

beforeAll(() => {
  Object.defineProperty(globalThis, 'IS_REACT_ACT_ENVIRONMENT', { configurable: true, value: true });
});

beforeEach(() => {
  container = document.createElement('div');
  document.body.append(container);
  root = createRoot(container);
});

afterEach(async () => {
  await act(async () => root.unmount());
  container.remove();
});

async function show(props: PreventionGuidanceBoundaryProps = {}) {
  await act(async () => root.render(<PreventionGuidanceBoundary control={new PreventionGuidanceControl(checklist)} {...props} />));
}

const taskButtons = () => [...container.querySelectorAll('li > button')] as HTMLButtonElement[];

async function clickTask(index: number) {
  await act(async () => taskButtons()[index].click());
}

describe('PreventionGuidanceBoundary (ticket 31)', () => {
  it('lists every task from the checklist, with no placeholder text', async () => {
    await show();
    expect(taskButtons().map((b) => b.textContent)).toEqual([
      '✓ Do the Mozzie Wipeout every week',
      '✓ Cover rarely used gully traps',
    ]);
    expect(container.textContent).not.toContain('Select Task');
    expect(container.textContent).not.toContain('PLACEHOLDER');
  });

  it('hides the decorative check marks from assistive technology', async () => {
    await show();
    const icons = container.querySelectorAll('li > button > span[aria-hidden="true"]');
    expect(icons).toHaveLength(2);
  });

  it('shows the explanation and an NEA source link when a task is selected', async () => {
    await show();
    await clickTask(0);
    const panel = container.querySelector('.task-details-panel')!;
    expect(panel.textContent).toContain('Removes stagnant water.');
    expect(panel.textContent).toContain('NEA');
    const link = panel.querySelector('a')!;
    expect(link.getAttribute('href')).toBe(task1.sourceUrl);
    expect(link.getAttribute('target')).toBe('_blank');
    expect(link.getAttribute('rel')).toBe('noopener noreferrer');
    expect(taskButtons()[0].getAttribute('aria-expanded')).toBe('true');
    expect(taskButtons()[0].getAttribute('aria-controls')).toBe(panel.id);
  });

  it('uses each task\'s own source link', async () => {
    await show();
    await clickTask(1);
    expect(container.querySelector('.task-details-panel a')?.getAttribute('href')).toBe(task2.sourceUrl);
  });

  it('collapses the details when the same task is selected again', async () => {
    await show();
    await clickTask(0);
    await clickTask(0);
    expect(container.querySelector('.task-details-panel')).toBeNull();
    expect(taskButtons()[0].getAttribute('aria-expanded')).toBe('false');
  });

  it('shows one task\'s details at a time', async () => {
    await show();
    await clickTask(0);
    await clickTask(1);
    expect(container.querySelectorAll('.task-details-panel')).toHaveLength(1);
    expect(container.querySelector('.task-details-panel')?.textContent).toContain('Stops breeding in drains.');
  });

  it('shows a message when the details cannot be found', async () => {
    const control = {
      loadChecklist: vi.fn(async () => checklist),
      showTaskDetails: vi.fn(async () => null),
    } as unknown as PreventionGuidanceControl;
    await show({ control });
    await clickTask(0);
    expect(container.querySelector('[role="alert"]')?.textContent).toContain('Details for the selected task are unavailable');
    expect(container.querySelector('.task-details-panel')).toBeNull();
  });

  it('shows a message when loading the details throws', async () => {
    const control = {
      loadChecklist: vi.fn(async () => checklist),
      showTaskDetails: vi.fn(async () => { throw new Error('boom'); }),
    } as unknown as PreventionGuidanceControl;
    await show({ control });
    await clickTask(0);
    expect(container.querySelector('[role="alert"]')).not.toBeNull();
  });

  it('shows an unavailable message, and Back still works, when the checklist cannot load', async () => {
    const control = { loadChecklist: vi.fn(async () => { throw new Error('boom'); }) } as unknown as PreventionGuidanceControl;
    const onBack = vi.fn();
    await show({ control, onBack });
    expect(container.querySelector('[role="alert"]')?.textContent).toContain('currently unavailable');
    expect(container.querySelector('ul')).toBeNull();
    await act(async () => [...container.querySelectorAll('button')].find((b) => b.textContent === 'Back')!.click());
    expect(onBack).toHaveBeenCalledTimes(1);
  });

  it('calls onBack from the normal view', async () => {
    const onBack = vi.fn();
    await show({ onBack });
    await act(async () => [...container.querySelectorAll('button')].find((b) => b.textContent === 'Back')!.click());
    expect(onBack).toHaveBeenCalledTimes(1);
  });

  it('uses the bundled NEA checklist when no control is passed', async () => {
    await act(async () => root.render(<PreventionGuidanceBoundary />));
    expect(taskButtons()).toHaveLength(BUNDLED_PREVENTION_TASKS.length);
  });
});
