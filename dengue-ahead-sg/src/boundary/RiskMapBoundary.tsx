// - Show the dashboard map, combined search and highest-risk areas.
// - Select an area directly, without a floating popup covering the map.
// - Use Leaflet for the map and RiskMapControl for its data (UC-2).
// - Show a warning when the map uses saved backup data (Ticket #58).
// - Show the base-map warning only after its images fail to load (Ticket #57).
// - Show Singapore-wide totals and one update time above compact, matching panels.
// - Keep the selected area's recorded clusters inside the main map card.

import { useEffect, useRef, useState, type ReactNode } from 'react';
import * as L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { getRiskLevelStyle, riskLevelStyle } from './riskLevelStyle.ts';
import BundledFallbackNotice from './BundledFallbackNotice.tsx';
import DataFreshnessNotice from './DataFreshnessNotice.tsx';
import DashboardIcon from './DashboardIcon.tsx';
import type { LocationRiskControl } from '../control/LocationRiskControl.ts';
import { DatasetStatus, ValidationStatus } from '../entity/enums.ts';
import { clustersForSubzone } from '../control/clustersForSubzone.ts';
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
  locationControl?: LocationRiskControl;
  children?: ReactNode;
  simulation?: ReactNode;
};

export default function RiskMapBoundary({
  onRequestAssessment,
  control = defaultControl,
  locationControl,
  children,
  simulation,
}: Props) {
  const [result, setResult] = useState<MapResult | null>(null);
  const [selectedId, setSelectedId] = useState('');
  const [search, setSearch] = useState('');
  const [searchMessage, setSearchMessage] = useState('');
  const [searching, setSearching] = useState(false);
  const [showAllRanks, setShowAllRanks] = useState(false);
  const searchRequest = useRef(0);
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
      searchRequest.current += 1;
    };
  }, [control]);

  const data = result?.status === 'OK' ? result.data : null;
  const unavailableStyle = getRiskLevelStyle();
  const topSubzones = data ? control.getTopSubzones(data) : [];
  const simulationVisible = Boolean(simulation);
  const selectedSubzone = data?.subzones.find((zone) => zone.subzoneId === selectedId);
  const clusterDataAvailable = Boolean(data?.snapshot) &&
    data?.snapshot?.datasets?.dengueClusters?.status !== DatasetStatus.Failed;
  const selectedClusters = selectedSubzone && data && clusterDataAvailable
    ? clustersForSubzone(data.dengueClusters, selectedSubzone) : [];
  const selectedCaseCount = selectedClusters.reduce((sum, cluster) => sum + cluster.caseCount, 0);

  useEffect(() => {
    if (!mapElement.current) return;

    const leafletMap = L.map(mapElement.current, {
      maxBounds: [
        [1.144, 103.535],
        [1.494, 104.502],
      ],
    }).setView([1.35, 103.82], 11);

    map.current = leafletMap;
    areaLayers.current = [];
    setMapError('');
    setTilesUnavailable(false);

    const baseTiles = L.tileLayer('https://www.onemap.gov.sg/maps/tiles/Default/{z}/{x}/{y}.png', {
      minZoom: 11,
      maxZoom: 19,
      attribution:
        '<img src="https://www.onemap.gov.sg/web-assets/images/logo/om_logo.png" style="height:20px;width:20px;" alt=""/> <a href="https://www.onemap.gov.sg/" target="_blank" rel="noopener noreferrer">OneMap</a> &copy; contributors | <a href="https://www.sla.gov.sg/" target="_blank" rel="noopener noreferrer">Singapore Land Authority</a>',
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
      loading: () => {
        tilesFailed = false;
      },
      tileerror: () => {
        tilesFailed = true;
        updateTileWarning();
      },
      tileload: () => {
        setTilesUnavailable(false);
      },
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

        layer.on('click', () => selectSubzone(zone.subzoneId));
        layer.addTo(leafletMap);
        areaLayers.current.push({ id: zone.subzoneId, layer });
      }

      const bounds = L.featureGroup(areaLayers.current.map((area) => area.layer)).getBounds();

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
      setMapError('Area boundaries could not be displayed. Please try again later.');
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
    // Refresh the map size when the inline sliders open or close.
    map.current?.invalidateSize({ pan: false });
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
      }
    }
  }, [selectedId, data, control, simulationVisible]);

  function selectSubzone(id: string) {
    searchRequest.current += 1;
    setSearching(false);
    setSearchMessage('');
    const zone = data?.subzones.find((item) => item.subzoneId === id);
    setSelectedId(zone?.subzoneId ?? '');
    const selection = zone && data ? control.getSelectedAssessment(zone.subzoneId, data) : null;
    assessmentAction.current(zone?.subzoneId ?? '', selection ?? undefined);
  }

  async function searchSubzone() {
    if (searching) return;
    const query = search.trim();
    if (!query) {
      setSearchMessage('Enter a subzone name, address or 6-digit Singapore postal code.');
      return;
    }
    const matches =
      data?.subzones.filter((zone) => zone.name.toLowerCase().includes(query.toLowerCase())) ?? [];
    const exact = matches.find((zone) => zone.name.toLowerCase() === query.toLowerCase());
    if (exact || matches.length === 1) {
      selectSubzone((exact ?? matches[0]).subzoneId);
      return;
    }
    if (matches.length > 1) {
      setSearchMessage(
        'Several areas match. Choose a full subzone name from the suggestions or area list.',
      );
      return;
    }
    if (!locationControl) {
      setSearchMessage(
        'No matching area. Postal-code and address search are unavailable right now. Try a subzone name.',
      );
      return;
    }
    const request = ++searchRequest.current;
    setSearching(true);
    setSearchMessage('');
    try {
      const found = await locationControl.assessLocation(query);
      if (request !== searchRequest.current) return;
      if (found.status === 'OK') {
        // Keep the result consistent with the assessment already drawn on the main map.
        const mapped = data ? control.getSelectedAssessment(found.subzone.subzoneId, data) : null;
        setSelectedId(found.subzone.subzoneId);
        assessmentAction.current(found.subzone.subzoneId, mapped ?? found);
      } else if (found.status === 'INVALID_LOCATION') {
        setSearchMessage(
          found.query.validationStatus === ValidationStatus.OutsideSingapore
            ? 'Choose a location in Singapore.'
            : 'No matching location. Check the postal code, address or subzone name.',
        );
      } else {
        setSearchMessage(
          'Location search is unavailable right now. You can still select an area on the map.',
        );
      }
    } catch {
      if (request === searchRequest.current)
        setSearchMessage(
          'Location search is unavailable right now. You can still select an area on the map.',
        );
    } finally {
      if (request === searchRequest.current) setSearching(false);
    }
  }

  async function toggleOverlay(name: OverlayName) {
    setOverlays(await control.updateOverlay(overlays, name));
  }

  return (
    <section aria-label="Dengue risk dashboard">
      <BundledFallbackNotice snapshot={data?.snapshot} />
      {simulationVisible && <DataFreshnessNotice snapshot={data?.snapshot} />}
      <div hidden={simulationVisible}>
        <div className="dashboard-heading">
          <h1>Check dengue risk in your area</h1>
          <form
            className="search-row dashboard-search"
            onSubmit={(event) => {
              event.preventDefault();
              void searchSubzone();
            }}
          >
            <input
              type="search"
              aria-label="Postal code, address or subzone name"
              aria-describedby="search-help"
              placeholder="Postal code or area name"
              list="subzone-suggestions"
              maxLength={200}
              value={search}
              onChange={(event) => setSearch(event.target.value)}
            />
            <datalist id="subzone-suggestions">
              {data?.subzones.map((zone) => (
                <option key={zone.subzoneId} value={zone.name} />
              ))}
            </datalist>
            <button className="primary" disabled={searching || (!data && !locationControl)}>
              {searching ? 'Searching…' : 'Search area'}
            </button>
          </form>
          <p className="sr-only" id="search-help">
            For example: 680123, Aljunied or a Singapore address.
          </p>
          {searchMessage && (
            <p role="status" className="search-message">
              {searchMessage}
            </p>
          )}
        </div>
        <div className="snapshot-overview">
          <div className="snapshot-totals" role="group" aria-label="Singapore-wide data">
            <strong>Across Singapore</strong>
            <span className="snapshot-stat">
              <DashboardIcon name="grid" />
              <strong>{data?.subzones.length ?? '—'}</strong> Subzones
            </span>
            <span className="snapshot-stat">
              <DashboardIcon name="pin" />
              <strong>{data?.snapshot?.datasets?.dengueClusters?.status === DatasetStatus.Failed
                ? 'Unavailable' : data?.dengueClusters.length ?? '—'}</strong> Dengue clusters
            </span>
            <span className="snapshot-stat">
              <DashboardIcon name="mosquito" />
              <strong>{data?.snapshot?.datasets?.highAedesAreas?.status === DatasetStatus.Failed
                ? 'Unavailable' : data?.highAedesAreas.length ?? '—'}</strong> High-Aedes areas
            </span>
          </div>
          <DataFreshnessNotice snapshot={data?.snapshot} compact />
        </div>
        {control === defaultControl && (
          <p className="notice">
            Official outlines are shown. Grey means risk is unavailable; it does not mean low risk.
          </p>
        )}
        <div className={`map-layout${selectedId ? ' has-selection' : ''}`}>
          <div className="map-column">
            <div className="card map-card">
              <div className="map-toolbar">
                <h2>Singapore risk map</h2>
                <div className="map-overlays">
                  <label className="toggle-row">
                    <input
                      type="checkbox"
                      disabled={!data?.dengueClusters.length}
                      checked={overlays.dengueClusters}
                      onChange={() => void toggleOverlay('dengueClusters')}
                    />
                    <span className="overlay-dot cluster-dot" aria-hidden="true" />
                    Confirmed clusters
                  </label>
                  <label className="toggle-row">
                    <input
                      type="checkbox"
                      disabled={!data?.highAedesAreas.length}
                      checked={overlays.highAedesAreas}
                      onChange={() => void toggleOverlay('highAedesAreas')}
                    />
                    <span className="overlay-dot aedes-dot" aria-hidden="true" />
                    High Aedes count areas
                  </label>
                </div>
              </div>
              <div
                ref={mapElement}
                className="risk-map"
                role="region"
                aria-label="Singapore subzone risk map"
              />
              {mapError && (
                <p role="alert" className="error-text">
                  {mapError}
                </p>
              )}
              {tilesUnavailable && (
                <p role="status">
                  The base map is unavailable. Area boundaries can still be viewed.
                </p>
              )}
              <div
                className={`map-cluster-status${selectedClusters.length ? ' has-clusters' : ''}`}
                role="status"
                aria-label="Selected-area cluster information"
              >
                <DashboardIcon name="pin" />
                {!selectedSubzone ? (
                  <span>Select an area for cluster information.</span>
                ) : !clusterDataAvailable ? (
                  <span>Cluster data for this area: <strong>Unavailable</strong></span>
                ) : selectedClusters.length === 0 ? (
                  <span>Clusters linked to this area: <strong>None recorded</strong></span>
                ) : (
                  <span>
                    Clusters linked to this area: <strong>{selectedClusters.length}</strong>
                    {' · '}Cases reported across these clusters: <strong>{selectedCaseCount}</strong>
                  </span>
                )}
              </div>
              <div className="map-legend" aria-label="Risk levels">
                {Object.entries(riskLevelStyle).map(([level, style]) => (
                  <span key={level}>
                    <i style={{ backgroundColor: style.colour }} aria-hidden="true" />
                    {style.label}
                  </span>
                ))}
                <span>
                  <i style={{ backgroundColor: unavailableStyle.colour }} aria-hidden="true" />
                  Risk unavailable
                </span>
                <span><i className="selection-key" aria-hidden="true" />Selected area</span>
              </div>
              <div className="area-picker">
                <label htmlFor="subzone">Area</label>
                <select
                  id="subzone"
                  disabled={!data}
                  value={selectedId}
                  onChange={(event) => selectSubzone(event.target.value)}
                >
                  <option value="">Choose an area</option>
                  {data?.subzones.map((zone) => (
                    <option key={zone.subzoneId} value={zone.subzoneId}>
                      {zone.name}
                    </option>
                  ))}
                </select>
              </div>
              <p className={result?.status === 'OK' && !mapError ? 'sr-only' : 'small muted map-data-status'} role="status">
                {!result
                  ? 'Loading area data…'
                  : result.status !== 'OK'
                    ? result.message
                    : mapError ||
                      `${data?.subzones.length ?? 0} areas · ${data?.dengueClusters.length ?? 0} dengue clusters · ${data?.highAedesAreas.length ?? 0} high-Aedes areas`}
              </p>
            </div>
          </div>
          {children}
        </div>
        <section className="card map-ranking" aria-label="Top 10 subzones">
          <div className="section-title">
            <h2>Highest-risk subzones</h2>
            <button
              className="text-button"
              aria-expanded={showAllRanks}
              onClick={() => setShowAllRanks(!showAllRanks)}
            >
              {showAllRanks ? 'Show fewer' : 'View all 10'}
            </button>
          </div>
          <p className="muted small">Assessed areas ranked by risk index, highest first.</p>
          {topSubzones.length ? (
            <ol className="top-risk-list">
              {(showAllRanks ? topSubzones : topSubzones.slice(0, 3)).map(
                ({ subzone, assessment }, index) => (
                  <li key={subzone.subzoneId}>
                    <button
                      type="button"
                      aria-label={`Show ${subzone.name} on map`}
                      style={{
                        backgroundColor: getRiskLevelStyle(assessment.riskLevel).colour,
                        color: getRiskLevelStyle(assessment.riskLevel).textColour,
                      }}
                      onClick={() => selectSubzone(subzone.subzoneId)}
                    >
                      <strong>
                        {index + 1}. {subzone.name}
                      </strong>
                      <span>
                        {assessment.riskIndex.toFixed(1)} —{' '}
                        {getRiskLevelStyle(assessment.riskLevel).label}
                      </span>
                    </button>
                  </li>
                ),
              )}
            </ol>
          ) : (
            <p className="muted">No assessed areas are available yet.</p>
          )}
        </section>
      </div>
      {simulation}
    </section>
  );
}
