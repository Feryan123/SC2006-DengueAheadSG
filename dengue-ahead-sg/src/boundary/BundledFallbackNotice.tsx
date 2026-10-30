// - Show a warning when the app uses saved backup data.
// - Show the backup date on the map, result and simulation screens.
// - Ticket #58: this file only displays a message. It does not calculate risk.

import type { PublicDataSnapshot } from '../services/ApprovedPublicDataServiceBoundary.ts';

type Props = {
  snapshot?: PublicDataSnapshot | null;
};

export default function BundledFallbackNotice(props: Props) {
  const snapshot = props.snapshot;
  if (!snapshot) return null;
  if (snapshot.isBundledFallback !== true) return null;

  const backupDate = new Date(snapshot.generatedAt).toLocaleString();

  return (
    <p className="notice" role="status" aria-label="Backup data">
      Live data is unavailable. Showing saved backup data from{' '}
      <time dateTime={snapshot.generatedAt}>{backupDate}</time>.
      {' '}This data may be out of date.
    </p>
  );
}
