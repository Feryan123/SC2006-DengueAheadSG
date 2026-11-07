// @vitest-environment jsdom
// Ticket #59: Verify Leaflet cleanup when leaving the risk map.
// jsdom does not reproduce Leaflet's real CSS zoom transition or its
// delayed 250 ms callback. This is a cleanup regression test, not proof
// that the browser-only _leaflet_pos error is fixed.
// The actual fix must also be verified manually in a real browser by
// repeatedly navigating away while an animated zoom is in progress.

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
  it('clears the zoom animation flag before removing the map during navigation', async () => {
    // Save the real remove() method before installing the spy.
    // The original method must still run to release Leaflet's resources.
    const originalRemove = L.Map.prototype.remove;

    const stopSpy = vi.spyOn(L.Map.prototype, 'stop');
    const removeSpy = vi.spyOn(L.Map.prototype, 'remove');
    const zoomSpy = vi.spyOn(L.Map.prototype, 'zoomIn');

    let zoomFlagWhenRemoved: boolean | undefined;

    removeSpy.mockImplementation(function (this: L.Map) {
      // Inspect the flag at the moment remove() is called.
      zoomFlagWhenRemoved = (
        this as L.Map & { _animatingZoom?: boolean }
      )._animatingZoom;

      // Preserve Leaflet's actual map cleanup.
      return originalRemove.call(this);
    });

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

    // stop() must happen before remove().
    expect(stopOrder).toBeLessThan(removeOrder);

    // The delayed zoom callback must see this flag as false.
    expect(zoomFlagWhenRemoved).toBe(false);

    // Leaflet's map container should no longer be present.
    expect(container.querySelector('.leaflet-container')).toBeNull();
  });
});
