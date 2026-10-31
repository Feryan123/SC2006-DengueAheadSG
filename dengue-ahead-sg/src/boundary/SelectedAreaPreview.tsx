// - Show the selected area's existing boundary in a fixed map preview.
// - Disable dragging, zooming and keyboard map controls in this preview.
// - Reuse the fixed area map in the simulation panel.
// - Centre the current score and risk label above the map so they stand out.
// - Keep the calculation explanation and simulation button beside the result.

import { useEffect, useRef } from 'react';
import * as L from 'leaflet';
import type { MapAssessmentSelection } from '../control/RiskMapControl.ts';
import type { PlanningSubzone } from '../entity/PlanningSubzone.ts';
import type { RiskLevel } from '../entity/enums.ts';
import { getRiskLevelStyle } from './riskLevelStyle.ts';
import RiskMethodPopup from './RiskMethodPopup.tsx';

type Props = {
  selection: MapAssessmentSelection | null;
  canSimulate: boolean;
  onSimulate: () => void;
  message?: string;
};

export function SelectedAreaMap({
  zone,
  riskLevel,
}: {
  zone: PlanningSubzone;
  riskLevel: RiskLevel;
}) {
  const element = useRef<HTMLDivElement>(null);
  const area = useRef<L.GeoJSON | null>(null);
  const colour = getRiskLevelStyle(riskLevel).colour;

  useEffect(() => {
    if (!element.current || zone.boundary.type === 'Point') return;
    const map = L.map(element.current, {
      dragging: false,
      scrollWheelZoom: false,
      doubleClickZoom: false,
      touchZoom: false,
      boxZoom: false,
      keyboard: false,
      zoomControl: false,
      minZoom: 10,
      maxZoom: 16,
    });
    L.tileLayer('https://www.onemap.gov.sg/maps/tiles/Default/{z}/{x}/{y}.png', {
      attribution:
        '<a href="https://www.onemap.gov.sg/" target="_blank" rel="noopener noreferrer">OneMap</a> / <a href="https://www.sla.gov.sg/" target="_blank" rel="noopener noreferrer">SLA</a>',
    }).addTo(map);
    area.current = L.geoJSON(zone.boundary, {
      interactive: false,
      style: { color: '#e600a9', weight: 3, fillOpacity: 0.75 },
    }).addTo(map);
    const bounds = area.current.getBounds();
    function fitArea() {
      // A hidden dashboard has no size; keep its previous view until it is visible.
      if (!element.current?.clientWidth || !element.current.clientHeight) return;
      map.invalidateSize({ pan: false });
      if (bounds.isValid())
        map.fitBounds(bounds, { padding: [20, 20], maxZoom: 15, animate: false });
    }
    fitArea();
    window.addEventListener('resize', fitArea);
    return () => {
      window.removeEventListener('resize', fitArea);
      map.remove();
      area.current = null;
    };
  }, [zone]);

  useEffect(() => {
    area.current?.setStyle({ fillColor: colour });
  }, [colour, zone]);

  return (
    <div
      ref={element}
      className="area-preview-map"
      role="img"
      aria-label={`Fixed map preview of ${zone.name}`}
    />
  );
}

function formatTime(value: string) {
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? value
    : new Intl.DateTimeFormat('en-SG', {
        dateStyle: 'medium',
        timeStyle: 'short',
        timeZone: 'Asia/Singapore',
      }).format(date);
}

export default function SelectedAreaPreview({
  selection,
  canSimulate,
  onSimulate,
  message,
}: Props) {
  if (!selection) {
    return (
      <aside className="card area-card empty-area" aria-label="Selected area">
        <h2>Your area</h2>
        <span className="location-symbol" aria-hidden="true">
          ⌖
        </span>
        <p className="muted">Enter a postal code or area name, or select an area on the map.</p>
        {message && (
          <p role="status" className="error-text">
            {message}
          </p>
        )}
      </aside>
    );
  }
  const { subzone, assessment } = selection;
  const shown = assessment;
  const style = getRiskLevelStyle(shown.riskLevel);

  return (
    <aside className="card area-card" aria-label="Selected area">
      <div className="area-title">
        <h2>{subzone.name}</h2>
      </div>
      <p className="muted small">Selected planning subzone</p>
      <div className="area-score area-score-hero" aria-live="polite">
        <h3>Dengue risk index</h3>
        <div className="risk-index-number">
          <strong>{shown.riskIndex.toFixed(1)}</strong>
          <span>/ 100</span>
        </div>
        <span
          className="risk-pill"
          style={{ backgroundColor: style.colour, color: style.textColour }}
        >
          {style.label} risk
        </span>
        <div className="risk-scale" aria-hidden="true">
          <span style={{ left: `${assessment.riskIndex}%` }} />
        </div>
        <div className="risk-scale-labels" aria-hidden="true">
          <span>Low</span>
          <span>Moderate</span>
          <span>High</span>
          <span>Very High</span>
        </div>
      </div>
      <div className="area-method-link">
        <RiskMethodPopup />
      </div>
      <SelectedAreaMap zone={subzone} riskLevel={shown.riskLevel} />
      <button
        id="start-simulation"
        className="primary simulate-button"
        disabled={!canSimulate}
        onClick={onSimulate}
      >
        Simulate risk
      </button>
      {!canSimulate && <p className="small muted">Simulation is unavailable right now.</p>}
      <p className="small confidence-note">
        Data confidence: <strong>{assessment.dataConfidence.toLowerCase()}</strong>
      </p>
      <p className="muted small">
        Confidence describes the availability and freshness of the data.
      </p>
      <p className="muted small data-time">
        Data updated {formatTime(assessment.dataTimeStamp)} SGT
      </p>
    </aside>
  );
}
