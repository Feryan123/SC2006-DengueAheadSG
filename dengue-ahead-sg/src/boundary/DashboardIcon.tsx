// - Draw small, colourful icons for the dashboard's factors and prevention actions.
// - Give each of the 15 prevention tasks its own distinct drawing.
// - Give the same action the same icon in recommendations and the full checklist.
// - Use simple SVG shapes; no image downloads or icon library are needed.

import type { ReactNode } from 'react';

const icons: Record<string, { colour: string; background: string; drawing: ReactNode }> = {
  grid: {
    colour: '#2171b5', background: '#e1f2ff',
    drawing: <path d="M5 5h12v12H5Zm18 0h12v12H23ZM5 23h12v12H5Zm18 0h12v12H23Z" fill="#2171b5" />,
  },
  pin: {
    colour: '#dc2626', background: '#fde5e5',
    drawing: <><path d="M20 36S7 23 7 15a13 13 0 0 1 26 0c0 8-13 21-13 21Z" fill="#dc2626" /><circle cx="20" cy="15" r="5" fill="white" stroke="white" /></>,
  },
  soil: {
    colour: '#2d7a46',
    background: '#d9efda',
    drawing: (
      <>
        <path d="m8 5 5-2 9 15-5 3Z" fill="#64a66c" />
        <path d="m17 21 5-3 7 12c-7 3-10-2-12-9Z" fill="#aec5cd" />
        <path d="M5 33c-3-8 7-9 8-2 7-3 10 4 5 5H5Zm23 2c-2-5 6-8 7-2l-2 3Z" fill="#b78450" />
      </>
    ),
  },
  bucket: {
    colour: '#c45b14',
    background: '#ffebcc',
    drawing: (
      <>
        <path d="M13 9h14l5 23H8Z" fill="#f5a442" />
        <path d="M13 10c0 4 14 4 14 0M8 32h24M13 26h14" />
        <path d="M16 16v7" stroke="#fff" />
      </>
    ),
  },
  drain: {
    colour: '#187a80',
    background: '#d2eff0',
    drawing: (
      <>
        <path d="M4 22h23v13H4Z" fill="#74b9bb" />
        <path d="M9 25v7m6-7v7m6-7v7" />
        <path d="M29 9h7v26h-7Z" fill="#d0aa68" />
        <ellipse cx="32.5" cy="9" rx="3.5" ry="2" fill="#b78450" />
      </>
    ),
  },
  spray: {
    colour: '#8251ad',
    background: '#eee0fa',
    drawing: (
      <>
        <path d="M30 5v24l7 6m-7-6-8 6" stroke="#687687" />
        <rect x="6" y="13" width="13" height="23" rx="3" fill="#a276c6" />
        <path d="M10 13V8h6v5m3-4 5-2m-4 7h6m-7 5 5 2" />
      </>
    ),
  },
  shirt: {
    colour: '#2773b1',
    background: '#d9ebfa',
    drawing: (
      <>
        <path d="m14 4-7 4-4 11 6 2 4-8v11h14V13l4 8 6-2-4-11-7-4c-2 4-10 4-12 0Z" fill="#63a6d8" />
        <path d="M14 27h12l3 10h-7l-2-7-2 7h-7Z" fill="#6c8baf" />
      </>
    ),
  },
  calendar: {
    colour: '#b94043',
    background: '#fce0df',
    drawing: (
      <>
        <rect x="6" y="9" width="28" height="25" rx="3" fill="#fff" />
        <path d="M6 16h28M13 5v8m14-8v8m-17 9 2 2 3-4m3 2 2 2 3-4m3 2 2 2 3-4m-19 9 2 2 3-4m3 2 2 2 3-4" />
      </>
    ),
  },
  people: {
    colour: '#3076ae',
    background: '#deebf8',
    drawing: (
      <>
        <circle cx="20" cy="11" r="5" fill="currentColor" />
        <circle cx="8" cy="16" r="4" fill="#70a8d0" />
        <circle cx="32" cy="16" r="4" fill="#70a8d0" />
        <path
          d="M12 34V24c0-8 16-8 16 0v10ZM3 32V25c0-6 7-6 7-3v10m20 0V22c3-3 7-1 7 3v7"
          fill="currentColor"
        />
      </>
    ),
  },
  shield: {
    colour: '#9b6850',
    background: '#f5e2d4',
    drawing: (
      <>
        <path d="m20 4 13 5v11c0 9-13 16-13 16S7 29 7 20V9Z" fill="#e5bb92" />
        <path d="m16 12 3 3 5-6m-8 12 3 3 5-6m-8 12 3 3 5-6" />
      </>
    ),
  },
  gully: {
    colour: '#187a80',
    background: '#d2eff0',
    drawing: (
      <>
        <ellipse cx="20" cy="28" rx="14" ry="8" fill="#517c8b" />
        <ellipse cx="17" cy="17" rx="14" ry="8" transform="rotate(-25 17 17)" fill="#b6d2d6" />
        <path d="m8 19 14-7M10 23l16-8m-2 11 6 3" />
      </>
    ),
  },
  vase: {
    colour: '#8063ae',
    background: '#eee0fa',
    drawing: (
      <>
        <path d="M16 20h8c-5 9 7 9 2 17H14c-5-8 7-8 2-17Z" fill="#fff" />
        <path d="M20 20V9m0 6 6-4" stroke="#39804f" />
        <path d="M20 5c5-6 9 2 4 4 6 5-1 9-4 4-4 5-11 1-5-4-5-3 0-10 5-4Z" fill="#eda476" />
        <path d="M8 22c-5 2-5 9-2 11m-4-2 4 2 2-4m24-9c5 2 5 9 2 11m4-2-4 2-2-4" />
      </>
    ),
  },
  wateringCan: {
    colour: '#2d7a46',
    background: '#d9efda',
    drawing: (
      <g transform="rotate(180 20 20)">
        <path d="M13 12h15v22H13Z" fill="#82b86b" />
        <path d="M13 16H8c-8 0-8 14 0 14h5m15-7 6-8 4 3-8 12" />
        <ellipse cx="36" cy="16" rx="3" ry="5" transform="rotate(30 36 16)" fill="#82b86b" />
        <path d="M17 12V7h9" />
      </g>
    ),
  },
  repellent: {
    colour: '#7a5a9d',
    background: '#f2e1f2',
    drawing: (
      <>
        <rect x="5" y="17" width="13" height="20" rx="3" fill="#98bd77" />
        <path d="M9 17V9h8V6h-8m19-1-6 15 8 4 7-17" />
        <path d="m22 20-2 9c-1 4 4 7 6 3l4-8" fill="#f0c3a5" />
        <path d="M9 24h5m-5 5h5" />
      </>
    ),
  },
  screens: {
    colour: '#3b6d73',
    background: '#dfefda',
    drawing: (
      <>
        <path d="M6 4h28v33H6Z" fill="#c5dde0" />
        <path d="M10 8h20v25H10Z" fill="#fff" />
        <path
          d="M14 8v25m4-25v25m4-25v25m4-25v25M10 13h20m-20 5h20m-20 5h20m-20 5h20"
          strokeWidth="1"
        />
      </>
    ),
  },
  community: {
    colour: '#477896',
    background: '#fce0df',
    drawing: (
      <>
        <path d="m3 15 9-10 9 10m-6-6 6-6 15 12" stroke="#b87a56" />
        <path d="M6 14v8m12-8v8m15-8v8" stroke="#b87a56" />
        <circle cx="10" cy="26" r="4" fill="#7db3d6" />
        <circle cx="21" cy="24" r="4" fill="#79b58a" />
        <circle cx="32" cy="26" r="4" fill="#e9b66b" />
        <path d="M5 38v-4c0-6 10-6 10 0v4m1 0v-6c0-6 10-6 10 0v6m1 0v-4c0-6 10-6 10 0v4" />
      </>
    ),
  },
  plate: {
    colour: '#a36b42',
    background: '#fff0df',
    drawing: (
      <>
        <path d="M9 5h22l-4 17H13Z" fill="#daa275" />
        <ellipse cx="20" cy="5" rx="11" ry="3" fill="#efb990" />
        <ellipse cx="20" cy="33" rx="14" ry="5" fill="#efb990" />
        <path d="M7 25v-7m-3 3 3-3 3 3m23 4v-7m-3 3 3-3 3 3" />
      </>
    ),
  },
  leaves: {
    colour: '#5a7a45',
    background: '#e2efd8',
    drawing: (
      <>
        <path d="m27 4-10 20" stroke="#a87c48" strokeWidth="4" />
        <path d="m11 22 12 6m-10-5-5 9m9-7-4 9m8-7-3 9m-2-12 1 12" />
        <path d="M5 8c9 0 8 9 8 9S4 17 5 8Zm22 24c8-5 11 3 11 3s-8 6-11-3Z" fill="#dca654" />
      </>
    ),
  },
  cloud: {
    colour: '#348ca8',
    background: '#dcf0f5',
    drawing: <path d="M10 30a8 8 0 0 1-2-16 12 12 0 0 1 23-1 9 9 0 0 1-1 17Z" fill="#7dc6df" />,
  },
  rain: {
    colour: '#5077b0',
    background: '#e0e8fa',
    drawing: (
      <>
        <path d="M10 24a7 7 0 0 1-1-14 10 10 0 0 1 20 0 7 7 0 0 1 0 14Z" fill="#9fbbea" />
        <path d="m12 28-2 6m12-6-2 6m12-6-2 6" />
      </>
    ),
  },
  mosquito: {
    colour: '#985b27',
    background: '#f8e7cf',
    drawing: (
      <>
        <ellipse cx="20" cy="24" rx="3" ry="10" fill="currentColor" />
        <path d="M20 14V5m-3 11L8 7c-9 7 0 15 9 12m6-3 9-9c9 7 0 15-9 12M17 24 7 30m16-6 10 6" />
      </>
    ),
  },
};

const taskIcons: Record<string, string> = {
  tip_gen_block_1: 'soil',
  tip_gen_block_2: 'bucket',
  tip_level_low_1: 'calendar',
  tip_level_low_2: 'gully',
  tip_level_moderate_1: 'vase',
  tip_level_moderate_2: 'wateringCan',
  tip_level_high_1: 'repellent',
  tip_level_high_2: 'spray',
  tip_level_very_high_1: 'shirt',
  tip_level_very_high_2: 'screens',
  tip_factor_clusters: 'shield',
  tip_factor_aedes: 'community',
  tip_factor_density: 'drain',
  tip_factor_humidity: 'plate',
  tip_factor_rainfall: 'leaves',
};

export default function DashboardIcon({ name }: { name: string }) {
  const icon = icons[name] ?? icons.shield;
  return (
    <span
      className="dashboard-icon"
      style={{ color: icon.colour, backgroundColor: icon.background }}
      aria-hidden="true"
    >
      <svg
        viewBox="0 0 40 40"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        {icon.drawing}
      </svg>
    </span>
  );
}

export function PreventionIcon({ taskId }: { taskId: string }) {
  return <DashboardIcon name={taskIcons[taskId] ?? 'shield'} />;
}
