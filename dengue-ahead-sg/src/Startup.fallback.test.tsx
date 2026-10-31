// @vitest-environment jsdom
// - Open the real app in a test browser with an empty cache.
// - Check that the map, result and simulation work when data requests fail.
// - Check that the backup warning appears only when backup data is used.
// - Ticket #58: network replies are simulated. These tests do not call live APIs.

import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { initializeApplication } from './Startup.ts';
import bundledSnapshot from './data/bundled-snapshot.json';

let App: typeof import('./App.tsx').default;
let container: HTMLDivElement;
let root: Root;

beforeAll(async () => {
  // The test browser has no screen size or map drawing support.
  // These settings let the real Leaflet map run during the tests.
  Object.defineProperty(HTMLElement.prototype, 'clientWidth', { configurable: true, get: () => 800 });
  Object.defineProperty(HTMLElement.prototype, 'clientHeight', { configurable: true, get: () => 420 });
  Object.defineProperty(SVGSVGElement.prototype, 'createSVGRect', { configurable: true, value: () => ({}) });
  Object.defineProperty(globalThis, 'IS_REACT_ACT_ENVIRONMENT', { configurable: true, value: true });
  App = (await import('./App.tsx')).default;
});

beforeEach(() => {
  localStorage.clear();
  container = document.createElement('div');
  document.body.append(container);
  root = createRoot(container);
});

afterEach(async () => {
  await act(async () => root.unmount());
  container.remove();
  localStorage.clear();
  vi.unstubAllGlobals();
});

async function click(label: string) {
  const buttons = container.querySelectorAll('button');
  for (const button of buttons) {
    if (button.textContent?.trim() === label) {
      await act(async () => button.click());
      return;
    }
  }
  throw new Error(`Missing button: ${label}`);
}

function expectBackupNotice() {
  const notices = container.querySelectorAll('[aria-label="Backup data"]');
  expect(notices).toHaveLength(1);
  expect(notices[0].getAttribute('role')).toBe('status');
  expect(notices[0].textContent).toContain('Showing saved backup data');
  expect(notices[0].textContent).toContain('This data may be out of date.');
  expect(notices[0].querySelector('time')?.getAttribute('dateTime')).toBe(bundledSnapshot.generatedAt);
}

describe('Offline backup screens (Ticket #58)', () => {
  it('loads the map, result and simulation offline and identifies the backup on each screen', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new TypeError('Offline')));
    const app = await initializeApplication();
    await act(async () => root.render(<App {...app.appProps} />));

    expect(container.querySelectorAll('path.leaflet-interactive')).toHaveLength(332);
    expectBackupNotice();

    const area = container.querySelector('path.leaflet-interactive');
    if (!area) throw new Error('No subzone was drawn on the map');
    await act(async () => area.dispatchEvent(new MouseEvent('click', { bubbles: true })));
    expect(container.querySelector('[aria-label="Selected area"] h2')?.textContent).toBe(bundledSnapshot.subzones[0].name);
    expectBackupNotice();

    await click('Simulate risk');
    expect(container.querySelector('[aria-label="Risk simulation"]')).not.toBeNull();
    expectBackupNotice();

    await click('Back to current risk map');
    expectBackupNotice();
  });

  it('does not show a backup notice when the network snapshot loads', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, json: async () => structuredClone(bundledSnapshot) }));
    const app = await initializeApplication();
    await act(async () => root.render(<App {...app.appProps} />));


    expect(container.querySelectorAll('path.leaflet-interactive')).toHaveLength(332);
    expect(container.querySelector('[aria-label="Backup data"]')).toBeNull();
  });
});
