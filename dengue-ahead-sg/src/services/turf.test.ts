import { test, expect } from 'vitest';
import { processSubzoneSpatialJoin } from './turf';
import type { SubzoneItem } from './turf';

test('calculates clusterCasesNearby using polygon overlap and sums CASE_SIZE', () => {
  const mockSubzones: SubzoneItem[] = [
    {
      subzoneId: 'SZ01',
      name: 'Test Zone',
      planningArea: 'TEST AREA',
      residentCount: 1000,
      areaKm2: 4.0,
      residentsPerKm2: 250,
      boundary: {
        type: 'Polygon',
        coordinates: [[[0, 0], [0, 2], [2, 2], [2, 0], [0, 0]]]
      }
    }
  ];

  const mockClusters = {
    features: [
      {
        type: 'Feature',
        properties: { CASE_SIZE: 15 },
        geometry: {
          type: 'Polygon',
          coordinates: [[[0, 0], [0, 1], [1, 1], [1, 0], [0, 0]]]
        }
      }
    ]
  };

  const mockAedes = { features: [] };

  const results = processSubzoneSpatialJoin(mockSubzones, mockClusters, mockAedes);

  expect(results.length).toBe(1);
  expect(results[0].clusterCasesNearby).toBe(15);
  expect(results[0].aedesOverlapRatio).toBe(0);
});

test('calculates aedesOverlapRatio correctly', () => {
  const mockSubzones: SubzoneItem[] = [
    {
      subzoneId: 'SZ02',
      name: 'Test Zone 2',
      planningArea: 'TEST AREA',
      residentCount: 1000,
      areaKm2: 1.0, // 1 sq km box from [0,0] to [1,1] in approximate degrees/units
      residentsPerKm2: 1000,
      boundary: {
        type: 'Polygon',
        coordinates: [[[0, 0], [0, 1], [1, 1], [1, 0], [0, 0]]]
      }
    }
  ];

  const mockClusters = { features: [] };
  const mockAedes = {
    features: [
      {
        type: 'Feature',
        properties: {},
        geometry: {
          type: 'Polygon',
          coordinates: [[[0, 0], [0, 0.5], [0.5, 0.5], [0.5, 0, 0], [0, 0]]]
        }
      }
    ]
  };

  const results = processSubzoneSpatialJoin(mockSubzones, mockClusters, mockAedes);

  expect(results.length).toBe(1);
  expect(results[0].aedesOverlapRatio).toBeGreaterThan(0);
});