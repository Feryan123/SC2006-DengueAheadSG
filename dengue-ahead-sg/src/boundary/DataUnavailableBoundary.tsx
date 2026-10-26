// - Explain when a requested feature or its data cannot be loaded.
// - Let the visitor return home, open the map or return to their assessment.
// - Ticket 19: unavailable-data screen in the app's navigation.

type Props = {
  title: string;
  onHome?: () => void;
  onOpenMap?: () => void;
  onReturnToAssessment?: () => void;
};

export default function DataUnavailableBoundary({
  title, onHome, onOpenMap, onReturnToAssessment,
}: Props) {
  return (
    <section className="card unavailable-card" aria-label={title}>
      <h1>{title}</h1>
      <p role="status">This feature or its required data is unavailable right now. Please try again later.</p>
      <div className="actions">
        {onReturnToAssessment && (
          <button className="secondary" onClick={onReturnToAssessment}>Back to assessment</button>
        )}
        {onHome && (
          <button className="secondary" onClick={onHome}>Return Home</button>
        )}
        {onOpenMap && (
          <button className="primary" onClick={onOpenMap}>Open Risk Map</button>
        )}
      </div>
    </section>
  );
}
