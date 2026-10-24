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

import { DatasetStatus } from '../../entity/enums.ts';
import type { DengueCluster } from '../../entity/DengueCluster.ts';
import type { HighAedesArea } from '../../entity/HighAedesArea.ts';
import type { PlanningSubzone } from '../../entity/PlanningSubzone.ts';
import type { PopulationProfile } from '../../entity/PopulationProfile.ts';
import type { WeatherProfile } from '../../entity/WeatherProfile.ts';
import type { Geometry } from '../../entity/types.ts';
import type { ApprovedPublicDataServiceBoundary, PublicDataSnapshot } from '../ApprovedPublicDataServiceBoundary.ts';

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

const SUBZONES: PlanningSubzone[] = [
  { subzoneId: 'TAMPINES EAST', name: 'Tampines East', boundary: box(103.955, 1.355, 0.008),
    clusterCasesNearby: 37, residentsPerKm2: 26000, aedesOverlapRatio: 0.3 },
  { subzoneId: 'YISHUN EAST', name: 'Yishun East', boundary: box(103.840, 1.430, 0.007),
    clusterCasesNearby: 44, residentsPerKm2: 22000, aedesOverlapRatio: 0.4 },
  { subzoneId: 'BEDOK NORTH', name: 'Bedok North', boundary: box(103.930, 1.330, 0.007),
    clusterCasesNearby: 9, residentsPerKm2: 20000, aedesOverlapRatio: 0.1 },
  { subzoneId: 'WOODLANDS EAST', name: 'Woodlands East', boundary: box(103.795, 1.440, 0.007),
    clusterCasesNearby: 15, residentsPerKm2: 18000, aedesOverlapRatio: 0.2 },
  { subzoneId: 'ANG MO KIO TOWN CENTRE', name: 'Ang Mo Kio Town Centre', boundary: box(103.848, 1.370, 0.005),
    clusterCasesNearby: 0, residentsPerKm2: 15000, aedesOverlapRatio: 0 },
  { subzoneId: 'COMMONWEALTH', name: 'Commonwealth', boundary: box(103.800, 1.302, 0.005),
    clusterCasesNearby: 3, residentsPerKm2: 24000, aedesOverlapRatio: 0 },
];

const POPULATION_PROFILES: PopulationProfile[] = [
  { subzoneId: 'TAMPINES EAST', residentCount: 52000, density: 26000, housingComposition: 'Mostly HDB 4-5 room flats' },
  { subzoneId: 'YISHUN EAST', residentCount: 41000, density: 22000, housingComposition: 'Mostly HDB 3-4 room flats' },
  { subzoneId: 'BEDOK NORTH', residentCount: 47000, density: 20000, housingComposition: 'Mix of HDB flats and condominiums' },
  { subzoneId: 'WOODLANDS EAST', residentCount: 38000, density: 18000, housingComposition: 'Mostly HDB 4-5 room flats' },
  { subzoneId: 'ANG MO KIO TOWN CENTRE', residentCount: 6000, density: 15000, housingComposition: 'HDB flats around the town centre' },
  { subzoneId: 'COMMONWEALTH', residentCount: 21000, density: 24000, housingComposition: 'Mostly older HDB flats' },
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
    { clusterId: 'MOCK-C1', location: 'Tampines St 81 / Tampines Ave 2', caseCount: 25, geometry: box(103.952, 1.353, 0.002), retrievedAt, subzoneId: 'TAMPINES EAST' },
    { clusterId: 'MOCK-C2', location: 'Tampines St 84', caseCount: 12, geometry: box(103.958, 1.358, 0.0015), retrievedAt, subzoneId: 'TAMPINES EAST' },
    { clusterId: 'MOCK-C3', location: 'Yishun Ring Rd / Yishun Ave 11', caseCount: 44, geometry: box(103.842, 1.431, 0.0025), retrievedAt, subzoneId: 'YISHUN EAST' },
    { clusterId: 'MOCK-C4', location: 'Bedok North Ave 3', caseCount: 9, geometry: box(103.931, 1.331, 0.0015), retrievedAt, subzoneId: 'BEDOK NORTH' },
    { clusterId: 'MOCK-C5', location: 'Woodlands Dr 14', caseCount: 15, geometry: box(103.796, 1.441, 0.002), retrievedAt, subzoneId: 'WOODLANDS EAST' },
    { clusterId: 'MOCK-C6', location: 'Commonwealth Cres', caseCount: 3, geometry: box(103.800, 1.303, 0.001), retrievedAt, subzoneId: 'COMMONWEALTH' },
  ];
  const highAedesAreas: HighAedesArea[] = [
    { areaId: 'MOCK-A1', geometry: box(103.954, 1.356, 0.003), retrievedAt, subzoneId: 'TAMPINES EAST' },
    { areaId: 'MOCK-A2', geometry: box(103.957, 1.351, 0.002), retrievedAt, subzoneId: 'TAMPINES EAST' },
    { areaId: 'MOCK-A3', geometry: box(103.838, 1.428, 0.002), retrievedAt, subzoneId: 'YISHUN EAST' },
    { areaId: 'MOCK-A4', geometry: box(103.843, 1.433, 0.002), retrievedAt, subzoneId: 'YISHUN EAST' },
    { areaId: 'MOCK-A5', geometry: box(103.841, 1.429, 0.0015), retrievedAt, subzoneId: 'YISHUN EAST' },
    { areaId: 'MOCK-A6', geometry: box(103.929, 1.329, 0.002), retrievedAt, subzoneId: 'BEDOK NORTH' },
    { areaId: 'MOCK-A7', geometry: box(103.794, 1.439, 0.002), retrievedAt, subzoneId: 'WOODLANDS EAST' },
    { areaId: 'MOCK-A8', geometry: box(103.797, 1.442, 0.0015), retrievedAt, subzoneId: 'WOODLANDS EAST' },
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
