
// This file shows the Risk Map and handles user clicks. The empty map area is a PLACEHOLDER until Leaflet and real data are ready.

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
  const [search, setSearch] = useState('');
  const [overlays, setOverlays] = useState<OverlayState>({
    dengueClusters: false,
    highAedesAreas: false,
  });

  // Ask the controller for map data when this screen opens.
  useEffect(() => {
    void control.loadRiskMap().then(setResult);
  }, []);

  const data = result?.status === 'OK' ? result.data : null;
  const selectedZone = data?.subzones.find((zone) => zone.subzoneId === selectedId);

  async function selectSubzone(id: string) {
    const zone = await control.selectSubzone(id, data?.subzones ?? []);
    setSelectedId(zone?.subzoneId ?? '');
    // TODO: Highlight the same area on the Leaflet map.
  }

  async function toggleOverlay(name: OverlayName) {
    setOverlays(await control.updateOverlay(overlays, name));
    // TODO: Show or hide this overlay on the Leaflet map.
  }

  function requestAssessment() {
    if (selectedId) onRequestAssessment(selectedId);
  }

  return (
    <section>
      <div className="map-heading">
        <div>
          <h1>Singapore Risk Map</h1>
          <p className="muted">Select a Planning Subzone or search a postal code.</p>
        </div>
        <div className="search-row map-search">
          <input aria-label="Search Planning Subzone" placeholder="Search Planning Subzone or postal code" value={search} onChange={(event) => setSearch(event.target.value)} />
          {/* PLACEHOLDER: Search currently uses loaded subzone names only. */}
          <button className="primary" disabled={!data} onClick={() => {
            const match = data?.subzones.find((zone) => zone.name.toLowerCase().includes(search.toLowerCase()));
            void selectSubzone(match?.subzoneId ?? '');
          }}>Search</button>
        </div>
      </div>

      <div className="map-layout">
        <div>
          <div className="map-placeholder">
            {/* TODO: Replace the empty area with an interactive Leaflet/GeoJSON map. */}
            {/* GeoJSON coordinates are [lng, lat]; Leaflet coordinates are [lat, lng]. */}
            <span className="map-note">PLACEHOLDER • Map not implemented yet</span>
            <span className="map-empty">Singapore planning-subzone map will appear here.</span>
          </div>
          <div className="card map-summary">
            <div><strong>Planning Subzone: {selectedZone?.name ?? 'Not selected'}</strong><p className="muted small">Choose a subzone to view its assessment.</p></div>
            <span className="pill">Risk not available</span>
            <button className="primary" disabled={!selectedId} onClick={requestAssessment}>View Assessment</button>
          </div>
        </div>

        <aside className="card map-side">
          <h2>Legend</h2>
          <div className="map-legend">
            {Object.values(RiskLevel).map((level) => (
              <span className={`risk-pill risk-${level.toLowerCase()}`} key={level}>{level}</span>
            ))}
          </div>

          <h3>Overlays</h3>
          <label className="toggle-row">
            <span>Confirmed clusters</span>
            <input type="checkbox" disabled={!data} checked={overlays.dengueClusters} onChange={() => void toggleOverlay('dengueClusters')} />
          </label>
          <label className="toggle-row">
            <span>High Aedes count areas</span>
            <input type="checkbox" disabled={!data} checked={overlays.highAedesAreas} onChange={() => void toggleOverlay('highAedesAreas')} />
          </label>

          <label className="dropdown-label" htmlFor="subzone">Planning Subzone</label>
          <select id="subzone" disabled={!data} value={selectedId} onChange={(event) => void selectSubzone(event.target.value)}>
            <option value="">Choose an area</option>
            {data?.subzones.map((zone) => <option key={zone.subzoneId} value={zone.subzoneId}>{zone.name}</option>)}
          </select>

          <h3>Data status</h3>
          <p className="muted small">{!result ? 'Loading...' : result.status === 'OK' ? 'Map data loaded' : 'PLACEHOLDER: Data not connected'}</p>
          {result?.status === 'DATA_UNAVAILABLE' && <p className="error-text small">{result.message}</p>}
        </aside>
      </div>
    </section>
  );
}
