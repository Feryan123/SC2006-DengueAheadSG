// - Check a downloaded or saved snapshot before the app uses it.
// - Reject missing fields, invalid numbers and broken area shapes.
// - Ticket 13: Retrieve / Refresh Public Data. No risk is calculated here.

import { DatasetStatus } from '../entity/enums.ts';
import type { PublicDataSnapshot } from './ApprovedPublicDataServiceBoundary.ts';

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isText(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0;
}

function isDate(value: unknown) {
  return isText(value) && Number.isFinite(Date.parse(value));
}

function isNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value) && value >= 0;
}

function isPosition(value: unknown): value is number[] {
  return Array.isArray(value) && value.length === 2
    && typeof value[0] === 'number' && Number.isFinite(value[0]) && Math.abs(value[0]) <= 180
    && typeof value[1] === 'number' && Number.isFinite(value[1]) && Math.abs(value[1]) <= 90;
}

function isPolygon(value: unknown) {
  if (!Array.isArray(value) || value.length === 0) return false;
  return value.every((ring) => {
    if (!Array.isArray(ring) || ring.length < 4 || !ring.every(isPosition)) return false;
    const first = ring[0];
    const last = ring[ring.length - 1];
    return first[0] === last[0] && first[1] === last[1];
  });
}

function isGeometry(value: unknown) {
  if (!isObject(value)) return false;
  if (value.type === 'Point') return isPosition(value.coordinates);
  if (value.type === 'Polygon') return isPolygon(value.coordinates);
  return value.type === 'MultiPolygon' && Array.isArray(value.coordinates)
    && value.coordinates.length > 0 && value.coordinates.every(isPolygon);
}

function isWeather(value: unknown) {
  if (!isObject(value)) return false;
  const monthPattern = /^\d{4}-(0[1-9]|1[0-2])$/;
  return typeof value.humidityMonth === 'string' && monthPattern.test(value.humidityMonth)
    && typeof value.rainfallMonth === 'string' && monthPattern.test(value.rainfallMonth)
    && isNumber(value.meanHumidityPct) && value.meanHumidityPct <= 100
    && isNumber(value.humidityNormalMean) && value.humidityNormalMean <= 100
    && isNumber(value.humidityNormalSd) && value.humidityNormalSd > 0
    && isNumber(value.rainfallMm) && isNumber(value.rainfallNormalMean)
    && isNumber(value.rainfallNormalSd) && value.rainfallNormalSd > 0;
}

export function isPublicDataSnapshot(value: unknown): value is PublicDataSnapshot {
  if (!isObject(value) || !isDate(value.generatedAt) || !isObject(value.datasets) || !isWeather(value.weather)) return false;
  const datasets = Object.values(value.datasets);
  if (datasets.length === 0 || !datasets.every((item) => isObject(item)
    && isDate(item.retrievedAt) && Object.values(DatasetStatus).includes(item.status as DatasetStatus))) return false;
  if (!Array.isArray(value.subzones) || value.subzones.length === 0
    || !Array.isArray(value.populationProfiles) || !Array.isArray(value.dengueClusters)
    || !Array.isArray(value.highAedesAreas)) return false;

  const subzoneIds = new Set<string>();
  for (const zone of value.subzones) {
    if (!isObject(zone) || !isText(zone.subzoneId) || !isText(zone.name)
      || !isObject(zone.boundary) || (zone.boundary.type !== 'Polygon' && zone.boundary.type !== 'MultiPolygon')
      || !isGeometry(zone.boundary) || !isNumber(zone.clusterCasesNearby) || !Number.isInteger(zone.clusterCasesNearby)
      || !isNumber(zone.residentsPerKm2) || !isNumber(zone.aedesOverlapRatio) || zone.aedesOverlapRatio > 1
      || subzoneIds.has(zone.subzoneId)) return false;
    subzoneIds.add(zone.subzoneId);
  }
  return value.populationProfiles.every((item) => isObject(item) && isText(item.subzoneId) && subzoneIds.has(item.subzoneId)
    && isNumber(item.residentCount) && Number.isInteger(item.residentCount) && isNumber(item.density)
    && typeof item.housingComposition === 'string')
    && value.dengueClusters.every((item) => isObject(item) && isText(item.clusterId) && isText(item.location)
      && isNumber(item.caseCount) && Number.isInteger(item.caseCount) && isGeometry(item.geometry)
      && isDate(item.retrievedAt) && isText(item.subzoneId) && subzoneIds.has(item.subzoneId))
    && value.highAedesAreas.every((item) => isObject(item) && isText(item.areaId) && isGeometry(item.geometry)
      && isDate(item.retrievedAt) && isText(item.subzoneId) && subzoneIds.has(item.subzoneId));
}
