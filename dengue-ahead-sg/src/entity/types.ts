/**
 * Traces to: primitive types used by <<entity>> attributes in class diagram
 * (String, Integer, Decimal, Boolean, DateTime, Geometry)
 *
 * String and Boolean map directly to string / boolean.
 */

// Mapping of class-diagram primitive types to TypeScript.
export type Integer = number;
export type Decimal = number;
/** ISO 8601 string, e.g. "2026-10-14T08:00:00+08:00" */
export type DateTime = string;
/** GeoJSON geometry (planning subzone boundaries, clusters, high-Aedes areas) */
export type Geometry =
  | { type: 'Point'; coordinates: [number, number] }
  | { type: 'Polygon'; coordinates: [number, number][][] }
  | { type: 'MultiPolygon'; coordinates: [number, number][][][] };
