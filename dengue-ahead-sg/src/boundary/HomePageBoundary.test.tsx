// @vitest-environment jsdom
// - Ticket 15: HomePageBoundary calls LocationRiskControl and shows each result state.
// - Uses a fake control, so no network or real data is involved.

import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import HomePageBoundary, { type HomePageBoundaryProps } from './HomePageBoundary.tsx';
import type { AssessLocationResult, LocationRiskControl } from '../control/LocationRiskControl.ts';
import type { LocationQuery } from '../entity/LocationQuery.ts';
import type { PlanningSubzone } from '../entity/PlanningSubzone.ts';
import type { RiskAssessment } from '../entity/RiskAssessment.ts';
import type { PublicDataSnapshot } from '../services/ApprovedPublicDataServiceBoundary.ts';
import { QueryType, ValidationStatus } from '../entity/enums.ts';

const subzone = { subzoneId: 'A', name: 'Test Subzone' } as unknown as PlanningSubzone;
const assessment = { assessmentId: 'a1', subzoneId: 'A' } as unknown as RiskAssessment;
const snapshot = { subzones: [subzone] } as unknown as PublicDataSnapshot;

function invalidResult(status: LocationQuery['validationStatus']): AssessLocationResult {
  return {
    status: 'INVALID_LOCATION',
    query: { queryText: 'x', queryType: QueryType.Address, validationStatus: status },
  };
}

function controlReturning(result: AssessLocationResult) {
  const assessLocation = vi.fn(async () => result);
  return { control: { assessLocation } as unknown as LocationRiskControl, assessLocation };
}

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

async function renderHome(props: HomePageBoundaryProps) {
  await act(async () => root.render(<HomePageBoundary {...props} />));
}

function button(label: string) {
  const found = [...container.querySelectorAll('button')].find((item) => item.textContent === label);
  if (!found) 
    throw new Error(`Missing button: ${label}`);
  return found;
}

async function type(value: string) {
  const input = container.querySelector('input')!;
  const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')!.set!;
  await act(async () => {
    setter.call(input, value);
    input.dispatchEvent(new Event('input', { bubbles: true }));
  });
}

async function submit() {
  await act(async () => button('Check risk').click());
}

describe('HomePageBoundary (ticket 15)', () => {
  it('shows a labelled input and submit button with no placeholder text', async () => {
    await renderHome({});
    expect(container.querySelector('label[for="location-query"]')?.textContent).toBe('Address or postal code');
    expect(container.querySelector('input')).not.toBeNull();
    expect(container.textContent).not.toContain('PLACEHOLDER');
    expect(container.textContent).not.toContain('Submit Location Query');
  });

  it('asks for input without calling the control when the field is empty', async () => {
    const { control, assessLocation } = controlReturning({ status: 'DATA_UNAVAILABLE', reason: 'x' });
    await renderHome({ control });
    await type('   ');
    await submit();
    expect(assessLocation).not.toHaveBeenCalled();
    expect(container.querySelector('[role="alert"]')?.textContent).toContain('Enter an address');
  });

  it('sends the trimmed text and passes subzone, assessment and snapshot on OK', async () => {
    const { control, assessLocation } = controlReturning({
      status: 'OK',
      query: { queryText: '680123', queryType: QueryType.PostalCode, validationStatus: ValidationStatus.Valid, subzoneId: 'A' },
      subzone, assessment, snapshot,
    });
    const onAssessmentReady = vi.fn();
    await renderHome({ control, onAssessmentReady });
    await type('  680123  ');
    await submit();
    expect(assessLocation).toHaveBeenCalledWith('680123');
    expect(onAssessmentReady).toHaveBeenCalledWith(subzone, assessment, snapshot);
    expect(container.querySelector('[role="alert"]')).toBeNull();
  });

  it('shows a not-found message for INVALID_LOCATION and does not leave the screen', async () => {
    const { control } = controlReturning(invalidResult(ValidationStatus.Invalid));
    const onAssessmentReady = vi.fn();
    const onDataUnavailable = vi.fn();
    await renderHome({ control, onAssessmentReady, onDataUnavailable });
    await type('zzzz');
    await submit();
    expect(container.querySelector('[role="alert"]')?.textContent).toContain("couldn't find");
    expect(container.querySelector('input')?.getAttribute('aria-invalid')).toBe('true');
    expect(onAssessmentReady).not.toHaveBeenCalled();
    expect(onDataUnavailable).not.toHaveBeenCalled();
  });

  it('shows a different message when the location is outside Singapore', async () => {
    const { control } = controlReturning(invalidResult(ValidationStatus.OutsideSingapore));
    await renderHome({ control });
    await type('Kuala Lumpur');
    await submit();
    expect(container.querySelector('[role="alert"]')?.textContent).toContain('in Singapore');
    expect(container.querySelector('[role="alert"]')?.textContent).not.toContain("couldn't find");
  });

  it('reports DATA_UNAVAILABLE as a service problem, not an invalid address', async () => {
    const { control } = controlReturning({ status: 'DATA_UNAVAILABLE', reason: 'down' });
    const onDataUnavailable = vi.fn();
    await renderHome({ control, onDataUnavailable });
    await type('680123');
    await submit();
    expect(onDataUnavailable).toHaveBeenCalledWith('down');
    expect(container.querySelector('[role="alert"]')).toBeNull();
  });

  it('shows an unavailable message itself when no handler is supplied', async () => {
    const { control } = controlReturning({ status: 'DATA_UNAVAILABLE', reason: 'down' });
    await renderHome({ control });
    await type('680123');
    await submit();
    expect(container.querySelector('[role="alert"]')?.textContent).toContain('unavailable');
    expect(container.querySelector('[role="alert"]')?.textContent).not.toContain("couldn't find");
  });

  it('treats a thrown error as unavailable and re-enables the button', async () => {
    const control = { assessLocation: vi.fn(async () => { throw new Error('boom'); }) } as unknown as LocationRiskControl;
    const onDataUnavailable = vi.fn();
    await renderHome({ control, onDataUnavailable });
    await type('680123');
    await submit();
    expect(onDataUnavailable).toHaveBeenCalledTimes(1);
    expect(button('Check risk').disabled).toBe(false);
  });

  it('reports unavailable when no control is supplied', async () => {
    const onDataUnavailable = vi.fn();
    await renderHome({ onDataUnavailable });
    await type('680123');
    await submit();
    expect(onDataUnavailable).toHaveBeenCalledTimes(1);
  });

  it('disables the button while searching and ignores a second submit', async () => {
    let release!: (result: AssessLocationResult) => void;
    const pending = new Promise<AssessLocationResult>((resolve) => { release = resolve; });
    const assessLocation = vi.fn(() => pending);
    const control = { assessLocation } as unknown as LocationRiskControl;
    await renderHome({ control });
    await type('680123');
    await submit();
    expect(button('Searching…').disabled).toBe(true);
    await act(async () => {
      container.querySelector('form')!.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
    });
    expect(assessLocation).toHaveBeenCalledTimes(1);
    await act(async () => release({ status: 'DATA_UNAVAILABLE', reason: 'done' }));
    expect(button('Check risk').disabled).toBe(false);
  });

  it('opens the map and prevention guidance', async () => {
    const onOpenMap = vi.fn();
    const onOpenPrevention = vi.fn();
    await renderHome({ onOpenMap, onOpenPrevention });
    await act(async () => button('View risk map').click());
    await act(async () => button('Prevention guidance').click());
    expect(onOpenMap).toHaveBeenCalledTimes(1);
    expect(onOpenPrevention).toHaveBeenCalledTimes(1);
  });
});
