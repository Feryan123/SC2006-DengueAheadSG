// @vitest-environment jsdom
// - Check the Prevention page has a single h1, also when the checklist fails to load (#60).

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
  it('has exactly one h1 on the checklist page', async () => {
    await renderBoundary(new PreventionGuidanceControl());
    expect(container.querySelectorAll('h1')).toHaveLength(1);
    expect(container.querySelector('h1')?.textContent).toContain('Prevention');
  });

  it('keeps the h1 when the checklist fails to load', async () => {
    const empty = new PreventionGuidanceControl({ ...BUNDLED_PREVENTION_CHECKLIST, tasks: [] });
    await renderBoundary(empty);
    expect(container.querySelectorAll('h1')).toHaveLength(1);
    expect(container.querySelector('[role="alert"]')).not.toBeNull();
  });
});