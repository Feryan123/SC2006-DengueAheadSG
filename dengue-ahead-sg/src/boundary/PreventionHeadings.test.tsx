// @vitest-environment jsdom
// - Ticket 60: the Prevention section sits under the dashboard's single h1, so it uses an h2,
//   also when the checklist fails to load. App.test.tsx checks the page has exactly one h1.

import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import PreventionGuidanceBoundary from './PreventionGuidanceBoundary.tsx';
import {
  BUNDLED_PREVENTION_CHECKLIST,
  PreventionGuidanceControl,
} from '../control/PreventionGuidanceControl.ts';

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

async function renderBoundary(control: PreventionGuidanceControl) {
  await act(async () => {
    root.render(<PreventionGuidanceBoundary control={control} />);
  });
}

describe('PreventionGuidanceBoundary headings (#60)', () => {
  it('uses one h2 and no h1 on the checklist', async () => {
    await renderBoundary(new PreventionGuidanceControl());
    expect(container.querySelectorAll('h1')).toHaveLength(0);
    expect(container.querySelectorAll('h2')).toHaveLength(1);
    expect(container.querySelector('h2')?.textContent).toContain('Prevention');
  });

  it('keeps the heading when the checklist fails to load', async () => {
    const empty = new PreventionGuidanceControl({ ...BUNDLED_PREVENTION_CHECKLIST, tasks: [] });
    await renderBoundary(empty);
    expect(container.querySelectorAll('h1')).toHaveLength(0);
    expect(container.querySelectorAll('h2')).toHaveLength(1);
    expect(container.querySelector('[role="alert"]')).not.toBeNull();
  });
});
