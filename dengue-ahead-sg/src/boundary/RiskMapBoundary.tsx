/**
 * Traces to: RiskMapBoundary (<<boundary>>) in class diagram
 * Related use case(s): UC-2 Explore Risk Map
 *
 * TO IMPLEMENT:
 * - selectSubzone() — handle the user selecting / searching a planning subzone
 * - toggleOverlay() — handle the user toggling dengue cluster / high-Aedes overlays
 * - requestAssessment() — request a risk assessment for the selected subzone
 *
 * Calls: RiskMapControl
 */


/*
 * This file shows the Risk Map and handles user clicks.
 * The map box is a PLACEHOLDER until Leaflet and real data are added.
 */

import { useEffect, useState } from 'react';
import { RiskLevel } from '../entity/enums.ts';
import {
  RiskMapControl,
  type MapResult,
  type OverlayName,
  type OverlayState,
} from '../control/RiskMapControl.ts';

const control = new RiskMapControl();

type Props = {
  onRequestAssessment: (subzoneId: string) => void;
};

export default function RiskMapBoundary({ onRequestAssessment }: Props) {
  const [result, setResult] = useState<MapResult | null>(null);
  const [selectedId, setSelectedId] = useState('');
  const [overlays, setOverlays] = useState<OverlayState>({
    dengueClusters: false,
    highAedesAreas: false,
  });

  // Get map data when this screen opens.
  useEffect(() => {
    void control.loadRiskMap().then(setResult);
  }, []);

  const data = result?.status === 'OK' ? result.data : null;

  // Remember which area the visitor selected.
  async function selectSubzone(id: string) {
    const zone = await control.selectSubzone(id, data?.subzones ?? []);
    setSelectedId(zone?.subzoneId ?? '');

    // TODO: Highlight the same area on the Leaflet map.
  }

  // Change which overlays are switched on.
  async function toggleOverlay(name: OverlayName) {
    setOverlays(await control.updateOverlay(overlays, name));

    // TODO: Draw or hide the matching layer on the Leaflet map.
  }

  // Ask the main app to open the risk result.
  function requestAssessment() {
    if (selectedId) onRequestAssessment(selectedId);
  }

  return (
    <section className="panel">
      <h2>Singapore Risk Map</h2>

      {!result && <p>Loading map data...</p>}

      {result?.status === 'DATA_UNAVAILABLE' && (
        <p>{result.message}</p>
      )}

      <div className="map-layout">
        <div className="map-placeholder">
          {/* PLACEHOLDER: Replace with a Leaflet map using subzone GeoJSON. */}
          {/* TODO: Install Leaflet and React Leaflet. */}
          {/* TODO: Colour subzones by risk and support clicking them. */}
          {/* TODO: Draw dengue cluster and high-Aedes overlays. */}
          {/* GeoJSON uses [longitude, latitude]; Leaflet uses [latitude, longitude]. */}
          <p>PLACEHOLDER: Singapore map</p>
        </div>

        <div className="map-controls">
          <label htmlFor="subzone">Planning Subzone</label>

          <select
            id="subzone"
            value={selectedId}
            disabled={!data}
            onChange={(event) => void selectSubzone(event.target.value)}
          >
            <option value="">Choose an area</option>

            {data?.subzones.map((zone) => (
              <option key={zone.subzoneId} value={zone.subzoneId}>
                {zone.name}
              </option>
            ))}
          </select>

          <button
            disabled={!selectedId}
            onClick={requestAssessment}
          >
            View Assessment
          </button>

          <fieldset disabled={!data}>
            <legend>Map Overlays</legend>

            <label>
              <input
                type="checkbox"
                checked={overlays.dengueClusters}
                onChange={() => void toggleOverlay('dengueClusters')}
              />
              Dengue Clusters
            </label>

            <label>
              <input
                type="checkbox"
                checked={overlays.highAedesAreas}
                onChange={() => void toggleOverlay('highAedesAreas')}
              />
              High-Aedes Areas
            </label>
          </fieldset>

          <div className="map-legend">
            <strong>Risk Levels</strong>

            {Object.values(RiskLevel).map((level) => (
              <span key={level}>
                <i className={`risk-dot risk-${level.toLowerCase()}`} />
                {level}
              </span>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

