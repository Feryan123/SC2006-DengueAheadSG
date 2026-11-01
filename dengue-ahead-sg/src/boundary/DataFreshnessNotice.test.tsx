// @vitest-environment jsdom
// - Ticket 30: stale-data banner and "Last updated" line.

import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import DataFreshnessNotice from './DataFreshnessNotice.tsx';
import { DatasetStatus } from '../entity/enums.ts';
import type { PublicDataSnapshot } from '../services/ApprovedPublicDataServiceBoundary.ts';

const NOW = Date.parse('2026-10-31T03:00:00.000Z');
const GENERATED = '2026-10-31T02:50:00.000Z';

function makeSnapshot(
  status: DatasetStatus,
  extra: { isBundledFallback?: boolean, generatedAt?: string } = {},
): PublicDataSnapshot {
  return {
    generatedAt: GENERATED,
    datasets: { dengueClusters: { retrievedAt: GENERATED, status } },
    ...extra,
  } as unknown as PublicDataSnapshot;
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

async function show(snapshot: PublicDataSnapshot | null | undefined, compact = false) {
  await act(async () => root.render(<DataFreshnessNotice snapshot={snapshot} now={NOW} compact={compact} />));
}

describe('DataFreshnessNotice (ticket 30)', () => {
  it('shows nothing when there is no snapshot', async () => {
    await show(null);
    expect(container.textContent).toBe('');
    await show(undefined);
    expect(container.textContent).toBe('');
  });

  it('shows only "Last updated" when all data is fresh', async () => {
    await show(makeSnapshot(DatasetStatus.Fresh));
    expect(container.querySelector('.notice')).toBeNull();
    expect(container.textContent).toContain('Last updated:');
    expect(container.querySelector('time')?.getAttribute('datetime')).toBe(GENERATED);
  });

  it('shows the banner and names the dataset when data is stale', async () => {
    await show(makeSnapshot(DatasetStatus.Stale));
    expect(container.querySelector('.notice')?.textContent).toContain('Some data may be out of date');
    expect(container.querySelector('.notice')?.textContent).toContain('Dengue clusters');
    expect(container.textContent).toContain('Last updated:');
  });

  it('shows the banner when a dataset failed', async () => {
    await show(makeSnapshot(DatasetStatus.Failed));
    expect(container.querySelector('.notice')).not.toBeNull();
  });

  it('skips the banner for the bundled backup (its own notice covers it) but keeps "Last updated"', async () => {
    await show(makeSnapshot(DatasetStatus.Stale, { isBundledFallback: true }));
    expect(container.querySelector('.notice')).toBeNull();
    expect(container.textContent).toContain('Last updated:');
  });

  it('leaves out "Last updated" when the snapshot time is invalid', async () => {
    await show(makeSnapshot(DatasetStatus.Fresh, { generatedAt: 'nonsense' }));
    expect(container.textContent).not.toContain('Last updated');
  });

  it('keeps the compact warning visible and its dataset details available on request', async () => {
    await show(makeSnapshot(DatasetStatus.Stale), true);
    const details = container.querySelector('details')!;
    expect(details.open).toBe(false);
    expect(details.querySelector('summary')?.textContent).toContain('Some source data may be out of date');
    expect(details.querySelector('p')?.textContent).toContain('Dengue clusters');
    expect(container.querySelectorAll('time')).toHaveLength(1);
    expect(container.querySelector('.snapshot-updated')?.textContent).toContain('Data updated:');
  });

  it('keeps one compact update time without duplicating the bundled-backup warning', async () => {
    await show(makeSnapshot(DatasetStatus.Stale, { isBundledFallback: true }), true);
    expect(container.querySelector('.notice')).toBeNull();
    expect(container.querySelectorAll('time')).toHaveLength(1);
  });
});
