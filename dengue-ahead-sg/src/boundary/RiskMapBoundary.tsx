
// - Show subzone colours, selected-area details and the top 10 assessed areas.
// - Use Leaflet for the map and RiskMapControl for its data (UC-2).
// - Show a warning when the map uses saved backup data (Ticket #58).
// - Show the base-map warning only after its images fail to load (Ticket #57).

import { useEffect, useRef, useState } from 'react';
import * as L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { getRiskLevelStyle, riskLevelStyle } from './riskLevelStyle.ts';
import { createSubzonePopup } from './SubzonePopup.ts';
import BundledFallbackNotice from './BundledFallbackNotice.tsx';
import {
  RiskMapControl,
  type MapResult,
  type MapAssessmentSelection,
  type OverlayName,
  type OverlayState,
} from '../control/RiskMapControl.ts';

const defaultControl = new RiskMapControl();

type Props = {
  onRequestAssessment: (subzoneId: string, selection?: MapAssessmentSelection) => void;
  control?: RiskMapControl;
};

export default function RiskMapBoundary({ onRequestAssessment, control = defaultControl }: Props) {
  const [result, setResult] = useState<MapResult | null>(null);
  const [selectedId, setSelectedId] = useState('');
  const [search, setSearch] = useState('');
  const [searchMessage, setSearchMessage] = useState('');
  const [mapError, setMapError] = useState('');
  const [tilesUnavailable, setTilesUnavailable] = useState(false);
  const mapElement = useRef<HTMLDivElement>(null);
  const map = useRef<L.Map | null>(null);
  const areaLayers = useRef<{ id: string; layer: L.GeoJSON }[]>([]);
  const clusterLayer = useRef<L.GeoJSON | null>(null);
  const aedesLayer = useRef<L.GeoJSON | null>(null);
  const assessmentAction = useRef(onRequestAssessment);
  const [overlays, setOverlays] = useState<OverlayState>({
    dengueClusters: false,
    highAedesAreas: false,
  });

  // Keep the latest button action without rebuilding the map.
  useEffect(() => {
    assessmentAction.current = onRequestAssessment;
  }, [onRequestAssessment]);

  // Ask the controller for map data when this screen opens.
  useEffect(() => {
    let cancelled = false;
    setResult(null);
    setSelectedId('');

    void control.loadRiskMap().then((loaded) => {
      if (!cancelled) setResult(loaded);
    });

    return () => {
      cancelled = true;
    };
  }, [control]);

  const data = result?.status === 'OK' ? result.data : null;
  const selectedZone = data?.subzones.find((zone) => zone.subzoneId === selectedId);
  const selectedStyle = getRiskLevelStyle(data?.riskLevels[selectedId]);
  const unavailableStyle = getRiskLevelStyle();
  const topSubzones = data ? control.getTopSubzones(data) : [];

  useEffect(() => {
    if (!mapElement.current) return;

    const leafletMap = L.map(mapElement.current, {
      maxBounds: [[1.144, 103.535], [1.494, 104.502]],
    }).setView([1.35, 103.82], 11);

    map.current = leafletMap;
    areaLayers.current = [];
    setMapError('');
    setTilesUnavailable(false);

    const baseTiles = L.tileLayer('https://www.onemap.gov.sg/maps/tiles/Default/{z}/{x}/{y}.png', {
      minZoom: 11,
      maxZoom: 19,
      attribution: '<img src="https://www.onemap.gov.sg/web-assets/images/logo/om_logo.png" style="height:20px;width:20px;" alt=""/> <a href="https://www.onemap.gov.sg/" target="_blank" rel="noopener noreferrer">OneMap</a> &copy; contributors | <a href="https://www.sla.gov.sg/" target="_blank" rel="noopener noreferrer">Singapore Land Authority</a>',
    });

    let tilesFailed = false;

    function updateTileWarning() {
      const tileContainer = baseTiles.getContainer();
      if (!tileContainer) return;

      // One broken image does not mean the whole background map is unavailable.
      const hasLoadedTile = tileContainer.querySelector('.leaflet-tile-loaded') !== null;
      setTilesUnavailable(tilesFailed && !baseTiles.isLoading() && !hasLoadedTile);
    }

    const tileEvents = {
      loading: () => { tilesFailed = false; },
      tileerror: () => { tilesFailed = true; updateTileWarning(); },
      tileload: () => { setTilesUnavailable(false); },
      load: updateTileWarning,
      tileunload: updateTileWarning,
    };
    baseTiles.on(tileEvents).addTo(leafletMap);

    try {
      for (const zone of data?.subzones ?? []) {
        if (zone.boundary.type === 'Point') {
          throw new Error('An area needs a polygon.');
        }

        const style = getRiskLevelStyle(data?.riskLevels[zone.subzoneId]);

        const layer = L.geoJSON(zone.boundary, {
          style: {
            color: '#7c3aed',
            weight: 1.25,
            opacity: 0.8,
            dashArray: '4 4',
            fillColor: style.colour,
            fillOpacity: data?.riskLevels[zone.subzoneId] ? 0.75 : 0.18,
          },
        });

        // Use plain text so an area name cannot insert HTML into the map.
        const tooltip = document.createElement('span');
        tooltip.textContent = `${zone.name} — ${style.label}`;
        layer.bindTooltip(tooltip);

        const assessment = data?.assessments[zone.subzoneId];
        layer.bindPopup(
          createSubzonePopup(
            zone,
            assessment,
            control.getTopFactors(assessment),
            requestAssessment,
          ),
        );

        layer.on('click', () => setSelectedId(zone.subzoneId));
        layer.addTo(leafletMap);
        areaLayers.current.push({ id: zone.subzoneId, layer });
      }

      const bounds = L.featureGroup(
        areaLayers.current.map((area) => area.layer),
      ).getBounds();

      if (bounds.isValid()) {
        leafletMap.fitBounds(bounds, {
          padding: [20, 20],
          maxZoom: 13,
        });
      }
    } catch {
      for (const area of areaLayers.current) {
        area.layer.remove();
      }

      areaLayers.current = [];
      setMapError(
        'Area boundaries could not be displayed. Please try again later.',
      );
    }

    // Overlay layers must not intercept clicks intended for subzones.
    const clusters = L.geoJSON(
      data?.dengueClusters.map((cluster) => ({
        type: 'Feature' as const,
        properties: {
          location: cluster.location,
          caseCount: cluster.caseCount,
        },
        geometry: cluster.geometry,
      })) ?? [],
      {
        interactive: false,
        style: {
          color: '#dc2626',
          weight: 2,
          fillColor: '#ef4444',
          fillOpacity: 0.35,
        },
        pointToLayer: (_feature, latlng) =>
          L.circleMarker(latlng, {
            interactive: false,
            radius: 7,
            color: '#dc2626',
            fillColor: '#ef4444',
            fillOpacity: 0.8,
          }),
      },
    );

    const aedes = L.geoJSON(
      data?.highAedesAreas.map((area) => ({
        type: 'Feature' as const,
        properties: { areaId: area.areaId },
        geometry: area.geometry,
      })) ?? [],
      {
        interactive: false,
        style: {
          color: '#d97706',
          weight: 2,
          fillColor: '#f59e0b',
          fillOpacity: 0.35,
        },
        pointToLayer: (_feature, latlng) =>
          L.circleMarker(latlng, {
            interactive: false,
            radius: 7,
            color: '#d97706',
            fillColor: '#f59e0b',
            fillOpacity: 0.8,
          }),
      },
    );

    clusterLayer.current = clusters;
    aedesLayer.current = aedes;

    // Stop ongoing map animations before removing Leaflet's map and listeners.
    // This also runs when the screen closes or its data or control changes.
    return () => {
      baseTiles.off(tileEvents);
      leafletMap.stop();
      // Leaflet 1.9.4 leaves a delayed zoom callback after map removal.
      // Clear this flag so the callback exits before accessing the removed map.
      (leafletMap as L.Map & { _animatingZoom?: boolean })._animatingZoom = false;
      leafletMap.remove();
      map.current = null;
      areaLayers.current = [];
      clusterLayer.current = null;
      aedesLayer.current = null;
    };
  }, [data, control]);

  // Show or hide overlays without recreating the Leaflet map.
  useEffect(() => {
    const leafletMap = map.current;
    if (!leafletMap) return;

    const layers = [
      { layer: clusterLayer.current, visible: overlays.dengueClusters },
      { layer: aedesLayer.current, visible: overlays.highAedesAreas },
    ];

    for (const { layer, visible } of layers) {
      if (!layer) continue;

      if (visible && !leafletMap.hasLayer(layer)) {
        leafletMap.addLayer(layer);
      } else if (!visible && leafletMap.hasLayer(layer)) {
        leafletMap.removeLayer(layer);
      }
    }
  }, [overlays, data, control]);

  useEffect(() => {
    if (!selectedId) {
      map.current?.closePopup();
    }

    for (const area of areaLayers.current) {
      const selected = area.id === selectedId;

      area.layer.setStyle({
        color: selected ? '#e600a9' : '#7c3aed',
        weight: selected ? 3 : 1.25,
        opacity: selected ? 1 : 0.8,
        dashArray: selected ? '' : '4 4',
      });

      if (area.id === selectedId) {
        area.layer.bringToFront();
        map.current?.fitBounds(area.layer.getBounds(), {
          padding: [30, 30],
          maxZoom: 14,
        });
        area.layer.openPopup();
      }
    }
  }, [selectedId, data, control]);

  async function selectSubzone(id: string) {
    const zone = await control.selectSubzone(id, data?.subzones ?? []);
    setSelectedId(zone?.subzoneId ?? '');

    if (zone?.subzoneId === selectedId) {
      areaLayers.current
        .find((area) => area.id === selectedId)
        ?.layer.openPopup();
    }
  }

  function searchSubzone() {
    const query = search.trim().toLowerCase();

    const match = query
      ? data?.subzones.find((zone) =>
          zone.name.toLowerCase().includes(query))
      : undefined;

    void selectSubzone(match?.subzoneId ?? '');
    setSearchMessage(match ? '' : 'No matching area. Try a subzone name.');
  }

  async function toggleOverlay(name: OverlayName) {
    setOverlays(await control.updateOverlay(overlays, name));
  }

  function requestAssessment(id: string) {
    const selection = data
      ? control.getSelectedAssessment(id, data)
      : null;

    if (data?.riskLevels[id]) {
      assessmentAction.current(id, selection ?? undefined);
    }
  }

  return (
    <section>
      <div className="map-heading">
        <div>
          <h1>Singapore Risk Map</h1>
          <p className="muted">
            Select an area on the map or search its name.
          </p>
        </div>
        <div className="search-row map-search">
          <input
            aria-label="Search Planning Subzone"
            placeholder="Enter a subzone name"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === 'Enter') searchSubzone();
            }}
          />
          <button
            className="primary"
            disabled={!data}
            onClick={searchSubzone}
          >
            Search
          </button>
        </div>
      </div>

      {control === defaultControl && (
        <p className="notice">
          Official subzone outlines are shown. Grey means risk is
          unavailable; it does not mean low risk.
        </p>
      )}

      <BundledFallbackNotice snapshot={data?.snapshot} />

      {searchMessage && <p role="status">{searchMessage}</p>}

      <div className="map-layout">
        <div>
          <div
            ref={mapElement}
            className="risk-map"
            role="region"
            aria-label="Singapore subzone risk map"
          />

          {mapError && (
            <p role="alert" className="error-text">{mapError}</p>
          )}

          {tilesUnavailable && (
            <p role="status">
              The base map is unavailable. Area boundaries can still be viewed.
            </p>
          )}

          <div className="card map-summary">
            <div>
              <strong>
                Planning Subzone: {selectedZone?.name ?? 'Not selected'}
              </strong>
              <p className="muted small">
                Choose a subzone to view its assessment.
              </p>
            </div>

            <span
              className="risk-pill"
              style={{
                backgroundColor: selectedStyle.colour,
                color: selectedStyle.textColour,
              }}
            >
              {selectedStyle.label}
            </span>

            <button
              className="primary"
              disabled={!selectedId || !data?.riskLevels[selectedId]}
              onClick={() => requestAssessment(selectedId)}
            >
              View Assessment
            </button>
          </div>

          <section
            className="card map-ranking"
            aria-label="Top 10 subzones"
          >
            <h2>Top 10 subzones</h2>
            <p className="muted small">
              Assessed areas ranked by risk index, highest first.
            </p>

            {topSubzones.length > 0 ? (
              <ol className="top-risk-list">
                {topSubzones.map(({ subzone, assessment }) => (
                  <li key={subzone.subzoneId}>
                    <button
                      type="button"
                      aria-label={`Show ${subzone.name} on map`}
                      onClick={() =>
                        void selectSubzone(subzone.subzoneId)
                      }
                    >
                      <span>{subzone.name}</span>
                      <span>
                        {assessment.riskIndex.toFixed(1)}
                        {' — '}
                        {getRiskLevelStyle(assessment.riskLevel).label}
                      </span>
                    </button>
                  </li>
                ))}
              </ol>
            ) : (
              <p className="muted">
                No assessed areas are available yet.
              </p>
            )}
          </section>
        </div>

        <aside className="card map-side">
          <h2>Legend</h2>

          <div className="map-legend">
            {Object.entries(riskLevelStyle).map(([level, style]) => (
              <span
                className="risk-pill"
                style={{
                  backgroundColor: style.colour,
                  color: style.textColour,
                }}
                key={level}
              >
                {style.label}
              </span>
            ))}

            <span
              className="risk-pill"
              style={{
                backgroundColor: unavailableStyle.colour,
                color: unavailableStyle.textColour,
              }}
            >
              {unavailableStyle.label}
            </span>
          </div>

          <p className="muted small">
            Darker areas mean higher risk. Select an area to read its level.
          </p>

          <p className="muted small">
            Purple dashed lines mark subzones. A solid bright pink
            outline shows your selection.
          </p>

          <h3>Overlays</h3>

          <label className="toggle-row">
            <span
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
              }}
            >
              <span
                aria-hidden="true"
                style={{
                  display: 'inline-block',
                  width: '14px',
                  height: '14px',
                  flexShrink: 0,
                  backgroundColor: '#ef4444',
                  border: '2px solid #dc2626',
                  borderRadius: '3px',
                }}
              />
              Confirmed clusters
            </span>
            <input
              type="checkbox"
              disabled={!data?.dengueClusters.length}
              checked={overlays.dengueClusters}
              onChange={() => void toggleOverlay('dengueClusters')}
            />
          </label>

          <label className="toggle-row">
            <span
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
              }}
            >
              <span
                aria-hidden="true"
                style={{
                  display: 'inline-block',
                  width: '14px',
                  height: '14px',
                  flexShrink: 0,
                  backgroundColor: '#f59e0b',
                  border: '2px solid #d97706',
                  borderRadius: '3px',
                }}
              />
              High Aedes count areas
            </span>
            <input
              type="checkbox"
              disabled={!data?.highAedesAreas.length}
              checked={overlays.highAedesAreas}
              onChange={() => void toggleOverlay('highAedesAreas')}
            />
          </label>

          <p className="muted small">
            {!data
              ? 'Overlay data is unavailable.'
              : `Available overlays: ${data.dengueClusters.length} dengue clusters and ${data.highAedesAreas.length} high-Aedes areas.`}
          </p>

          <label
            className="dropdown-label"
            htmlFor="subzone"
          >
            Planning Subzone
          </label>

          <select
            id="subzone"
            disabled={!data}
            value={selectedId}
            onChange={(event) =>
              void selectSubzone(event.target.value)
            }
          >
            <option value="">Choose an area</option>
            {data?.subzones.map((zone) => (
              <option
                key={zone.subzoneId}
                value={zone.subzoneId}
              >
                {zone.name}
              </option>
            ))}
          </select>

          <h3>Data status</h3>
          <p className="muted small" role="status">
            {!result
              ? 'Loading...'
              : result.status === 'OK'
                ? (mapError || 'Area boundaries loaded')
                : result.message}
          </p>
        </aside>
      </div>
    </section>
  );
}
