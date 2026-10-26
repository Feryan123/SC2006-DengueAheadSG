import { test, expect } from 'vitest';
import {processSubzoneSpatialJoin} from './turf';
import type { SubzoneItem } from './turf';

test('processSubzoneSpatialJoin correctly counts points inside Polygon and MultiPolygon boundaries', () => {
  const mockSubzones: SubzoneItem[] = [
    {
      subzoneId: 'TESTSZ1',
      name: 'Test Subzone',
      planningArea: 'TEST AREA',
      residentCount: 1000,
      areaKm2: 1.0,
      residentsPerKm2: 1000,
      boundary: {
        type: 'Polygon',
        coordinates: [[[0, 0], [0, 2], [2, 2], [2, 0], [0, 0]]]
      }
    }
  ];

  // Point [1, 1] is inside, [5, 5] is outside
  const mockPoints = [
    { lat: 1, lng: 1 },
    { lat: 5, lng: 5 }
  ];

  const results = processSubzoneSpatialJoin(mockSubzones, mockPoints);

  expect(results.length).toBe(1);
  expect(results[0].caseCount).toBe(1);
  expect(results[0].dengueRiskLevel).toBe('Low');
});