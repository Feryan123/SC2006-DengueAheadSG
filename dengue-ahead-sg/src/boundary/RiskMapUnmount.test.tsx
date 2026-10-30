
 // @vitest-environment jsdom
 // Ticket #59: Stop Leaflet animations before unmounting the risk map.

import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import * as L from 'leaflet';
import { RiskMapControl } from '../control/RiskMapControl.ts';
import { MockPublicDataService } from '../services/mocks/MockPublicDataService.ts';

let RiskMapBoundary: typeof import('./RiskMapBoundary.tsx').default;
let container: HTMLDivElement;
let root: Root;

beforeAll(async () => {
  Object.defineProperty(HTMLElement.prototype, 'clientWidth', {
    configurable: true,
    get: () => 800,
  });

  Object.defineProperty(HTMLElement.prototype, 'clientHeight', {
    configurable: true,
    get: () => 420,
  });

  Object.defineProperty(SVGSVGElement.prototype, 'createSVGRect', {
    configurable: true,
    value: () => ({}),
  });

  Object.defineProperty(globalThis, 'IS_REACT_ACT_ENVIRONMENT', {
    configurable: true,
    value: true,
  });

  RiskMapBoundary = (await import('./RiskMapBoundary.tsx')).default;
});

beforeEach(() => {
  container = document.createElement('div');
  document.body.append(container);
  root = createRoot(container);
});

afterEach(async () => {
  await act(async () => {
    root.unmount();
  });

  container.remove();
  vi.restoreAllMocks();
});

describe('Ticket #59: Leaflet animation cleanup', () => {
  it('stops map animation before removing the map during navigation', async () => {
    const stopSpy = vi.spyOn(L.Map.prototype, 'stop');
    const removeSpy = vi.spyOn(L.Map.prototype, 'remove');
    const zoomSpy = vi.spyOn(L.Map.prototype, 'zoomIn');

    const control = new RiskMapControl(new MockPublicDataService());

    await act(async () => {
      root.render(
        <RiskMapBoundary
          control={control}
          onRequestAssessment={() => {}}
        />,
      );
    });

    const zoomButton = container.querySelector<HTMLAnchorElement>(
      '.leaflet-control-zoom-in',
    );

    expect(zoomButton).not.toBeNull();

    await act(async () => {
      zoomButton!.dispatchEvent(
        new MouseEvent('click', { bubbles: true, cancelable: true }),
      );
    });

    expect(zoomSpy).toHaveBeenCalled();

    // Simulate leaving Risk Map immediately after requesting a zoom.
    await act(async () => {
      root.unmount();
    });

    expect(stopSpy).toHaveBeenCalled();
    expect(removeSpy).toHaveBeenCalled();

    const stopOrder = stopSpy.mock.invocationCallOrder.at(-1)!;
    const removeOrder = removeSpy.mock.invocationCallOrder.at(-1)!;

    expect(stopOrder).toBeLessThan(removeOrder);
    expect(container.querySelector('.leaflet-container')).toBeNull();
  });
});
