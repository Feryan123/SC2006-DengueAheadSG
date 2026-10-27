/**
 * Traces to: ApprovedPublicDataServiceBoundary (<<boundary>>) in class diagram (mock implementation)
 * Related use case(s): UC-1 Assess Location Risk, UC-2 Explore Risk Map
 *
 * Mock implementation returning fake data, to be swapped for the real
 * ApprovedPublicDataServiceBoundary implementation later.
 *
 * The subzones are real URA planning subzones, but every number, cluster and
 * boundary below is FAKE. Boundaries are rough rectangles near the real location.
 * Subzone IDs are the URA subzone names (SUBZONE_N); the real service will
 * supply its own IDs, so nothing should hard-code these.
 *
 * Subzone metrics and the national weather profile are PLACEHOLDERS in the
 * new #4 shape; realistic values come later (#9).
 *
 * Relationships: implements ApprovedPublicDataServiceBoundary
 */

import { centroid } from '@turf/turf';
import { DatasetStatus } from '../../entity/enums.ts';
import type { DengueCluster } from '../../entity/DengueCluster.ts';
import type { HighAedesArea } from '../../entity/HighAedesArea.ts';
import type { PlanningSubzone } from '../../entity/PlanningSubzone.ts';
import type { PopulationProfile } from '../../entity/PopulationProfile.ts';
import type { WeatherProfile } from '../../entity/WeatherProfile.ts';
import type { Geometry } from '../../entity/types.ts';
import type { ApprovedPublicDataServiceBoundary, PublicDataSnapshot } from '../ApprovedPublicDataServiceBoundary.ts';
import rawSubzones from '../../../data/derived/subzones.json';

/** Square polygon centred on [lng, lat] (GeoJSON order). */
function box(lng: number, lat: number, half: number): Geometry {
  return {
    type: 'Polygon',
    coordinates: [[
      [lng - half, lat - half],
      [lng + half, lat - half],
      [lng + half, lat + half],
      [lng - half, lat + half],
      [lng - half, lat - half],
    ]],
  };
}

function findRealSubzone(name: string) {
  const subzone = rawSubzones.find(
    (item) => item.name.toUpperCase() === name.toUpperCase()
  );

  if (!subzone) {
    throw new Error(`Subzone not found in subzones.json: ${name}`);
  }

  return subzone;
}

/** Create a mock square centred on a real subzone's centroid. */
function boxAtSubzoneCentre(name: string, half: number): Geometry {
  const boundary = findRealSubzone(name).boundary as Geometry;
  const [lng, lat] = centroid(boundary).geometry.coordinates;
  return box(lng, lat, half);
}

const SUBZONES: PlanningSubzone[] = [
  { subzoneId: findRealSubzone('TAMPINES EAST').subzoneId, name: 'Tampines East',
    boundary: findRealSubzone('TAMPINES EAST').boundary as Geometry,
    clusterCasesNearby: 37, residentsPerKm2: findRealSubzone('TAMPINES EAST').residentsPerKm2, aedesOverlapRatio: 0.3 },
  { subzoneId: findRealSubzone('YISHUN EAST').subzoneId, name: 'Yishun East',
    boundary: findRealSubzone('YISHUN EAST').boundary as Geometry,
    clusterCasesNearby: 44, residentsPerKm2: findRealSubzone('YISHUN EAST').residentsPerKm2, aedesOverlapRatio: 0.4 },
  { subzoneId: findRealSubzone('BEDOK NORTH').subzoneId, name: 'Bedok North',
    boundary: findRealSubzone('BEDOK NORTH').boundary as Geometry,
    clusterCasesNearby: 9, residentsPerKm2: findRealSubzone('BEDOK NORTH').residentsPerKm2, aedesOverlapRatio: 0.1 },
  { subzoneId: findRealSubzone('WOODLANDS EAST').subzoneId, name: 'Woodlands East',
    boundary: findRealSubzone('WOODLANDS EAST').boundary as Geometry,
    clusterCasesNearby: 15, residentsPerKm2: findRealSubzone('WOODLANDS EAST').residentsPerKm2, aedesOverlapRatio: 0.2 },
  { subzoneId: findRealSubzone('ANG MO KIO TOWN CENTRE').subzoneId, name: 'Ang Mo Kio Town Centre',
    boundary: findRealSubzone('ANG MO KIO TOWN CENTRE').boundary as Geometry,
    clusterCasesNearby: 0, residentsPerKm2: findRealSubzone('ANG MO KIO TOWN CENTRE').residentsPerKm2, aedesOverlapRatio: 0 },
  { subzoneId: findRealSubzone('COMMONWEALTH').subzoneId, name: 'Commonwealth',
    boundary: findRealSubzone('COMMONWEALTH').boundary as Geometry,
    clusterCasesNearby: 3, residentsPerKm2: findRealSubzone('COMMONWEALTH').residentsPerKm2, aedesOverlapRatio: 0 },
];

const POPULATION_PROFILES: PopulationProfile[] = [
  { subzoneId: findRealSubzone('TAMPINES EAST').subzoneId,
    residentCount: findRealSubzone('TAMPINES EAST').residentCount,
    density: findRealSubzone('TAMPINES EAST').residentsPerKm2, housingComposition: 'Mostly HDB 4-5 room flats (mock)' },
  { subzoneId: findRealSubzone('YISHUN EAST').subzoneId,
    residentCount: findRealSubzone('YISHUN EAST').residentCount,
    density: findRealSubzone('YISHUN EAST').residentsPerKm2, housingComposition: 'Mostly HDB 3-4 room flats (mock)' },
  { subzoneId: findRealSubzone('BEDOK NORTH').subzoneId,
    residentCount: findRealSubzone('BEDOK NORTH').residentCount,
    density: findRealSubzone('BEDOK NORTH').residentsPerKm2, housingComposition: 'Mix of HDB flats and condominiums (mock)' },
  { subzoneId: findRealSubzone('WOODLANDS EAST').subzoneId,
    residentCount: findRealSubzone('WOODLANDS EAST').residentCount,
    density: findRealSubzone('WOODLANDS EAST').residentsPerKm2, housingComposition: 'Mostly HDB 4-5 room flats (mock)' },
  { subzoneId: findRealSubzone('ANG MO KIO TOWN CENTRE').subzoneId,
    residentCount: findRealSubzone('ANG MO KIO TOWN CENTRE').residentCount,
    density: findRealSubzone('ANG MO KIO TOWN CENTRE').residentsPerKm2, housingComposition: 'HDB flats around the town centre (mock)' },
  { subzoneId: findRealSubzone('COMMONWEALTH').subzoneId,
    residentCount: findRealSubzone('COMMONWEALTH').residentCount,
    density: findRealSubzone('COMMONWEALTH').residentsPerKm2, housingComposition: 'Mostly older HDB flats (mock)' },
];

/** One national profile (D4). Placeholder numbers. */
const WEATHER: WeatherProfile = {
  humidityMonth: '2026-09',
  meanHumidityPct: 82,
  humidityNormalMean: 80,
  humidityNormalSd: 3,
  rainfallMonth: '2026-07',
  rainfallMm: 180,
  rainfallNormalMean: 160,
  rainfallNormalSd: 50,
};

function buildSnapshot(retrievedAt: string): PublicDataSnapshot {
  const dengueClusters: DengueCluster[] = [
  { clusterId: 'MOCK-C1', location: 'Tampines St 81 / Tampines Ave 2', caseCount: 25,
    geometry: box(103.952, 1.353, 0.002), retrievedAt, subzoneId: findRealSubzone('TAMPINES EAST').subzoneId },
  { clusterId: 'MOCK-C2', location: 'Tampines St 84', caseCount: 12,
    geometry: box(103.958, 1.358, 0.0015), retrievedAt, subzoneId: findRealSubzone('TAMPINES EAST').subzoneId },
  { clusterId: 'MOCK-C3', location: 'Yishun Ring Rd / Yishun Ave 11', caseCount: 44,
    geometry: box(103.842, 1.431, 0.0025), retrievedAt, subzoneId: findRealSubzone('YISHUN EAST').subzoneId },
  { clusterId: 'MOCK-C4', location: 'Bedok North Ave 3', caseCount: 9,
    geometry: box(103.931, 1.331, 0.0015), retrievedAt, subzoneId: findRealSubzone('BEDOK NORTH').subzoneId },
  { clusterId: 'MOCK-C5', location: 'Woodlands Dr 14', caseCount: 15,
    geometry: box(103.796, 1.441, 0.002), retrievedAt, subzoneId: findRealSubzone('WOODLANDS EAST').subzoneId },
  { clusterId: 'MOCK-C6', location: 'Commonwealth Cres', caseCount: 3,
    geometry: box(103.800, 1.303, 0.001), retrievedAt, subzoneId: findRealSubzone('COMMONWEALTH').subzoneId },
];
  const highAedesAreas: HighAedesArea[] = [
  { areaId: 'MOCK-A1', geometry: box(103.954, 1.356, 0.003),
    retrievedAt, subzoneId: findRealSubzone('TAMPINES EAST').subzoneId },
  { areaId: 'MOCK-A2', geometry: box(103.957, 1.351, 0.002),
    retrievedAt, subzoneId: findRealSubzone('TAMPINES EAST').subzoneId },
  { areaId: 'MOCK-A3', geometry: boxAtSubzoneCentre('YISHUN EAST', 0.002),
    retrievedAt, subzoneId: findRealSubzone('YISHUN EAST').subzoneId },
  { areaId: 'MOCK-A4', geometry: box(103.843, 1.433, 0.002),
    retrievedAt, subzoneId: findRealSubzone('YISHUN EAST').subzoneId },
  { areaId: 'MOCK-A5', geometry: box(103.841, 1.429, 0.0015),
    retrievedAt, subzoneId: findRealSubzone('YISHUN EAST').subzoneId },
  { areaId: 'MOCK-A6', geometry: box(103.929, 1.329, 0.002),
    retrievedAt, subzoneId: findRealSubzone('BEDOK NORTH').subzoneId },
  { areaId: 'MOCK-A7', geometry: boxAtSubzoneCentre('WOODLANDS EAST', 0.002),
    retrievedAt, subzoneId: findRealSubzone('WOODLANDS EAST').subzoneId },
  { areaId: 'MOCK-A8', geometry: box(103.797, 1.442, 0.0015),
    retrievedAt, subzoneId: findRealSubzone('WOODLANDS EAST').subzoneId },
];
  return {
    subzones: SUBZONES,
    populationProfiles: POPULATION_PROFILES,
    dengueClusters,
    highAedesAreas,
    weather: WEATHER,
    generatedAt: retrievedAt,
    datasets: {
      dengueClusters: { retrievedAt, status: DatasetStatus.Fresh },
      highAedesAreas: { retrievedAt, status: DatasetStatus.Fresh },
      populationDensity: { retrievedAt, status: DatasetStatus.Fresh },
      humidity: { retrievedAt, status: DatasetStatus.Fresh },
      rainfall: { retrievedAt, status: DatasetStatus.Fresh },
    },
  };
}

export class MockPublicDataService implements ApprovedPublicDataServiceBoundary {
  private readonly snapshot: PublicDataSnapshot | undefined;

  /** Pass a snapshot to override the built-in fake data (useful in tests). */
  constructor(snapshot?: PublicDataSnapshot) {
    this.snapshot = snapshot;
  }

  async retrievePublicData(): Promise<PublicDataSnapshot> {
    return this.snapshot ?? buildSnapshot(new Date().toISOString());
  }
}
