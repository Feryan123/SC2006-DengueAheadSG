/**
 * Traces to: LocationQuery (<<entity>>) in class diagram
 * Related use case(s): UC-1 Assess Location Risk (Validate Location Query), UC-5 Identify Planning Subzone
 *
 * ATTRIBUTES:
 * - queryText : String — raw address / postal code text entered by the visitor
 * - queryType : QueryType — kind of query entered (enum, see enums.ts)
 * - validationStatus : ValidationStatus — result of validating the query (enum, see enums.ts)
 *
 * Relationships:
 * - LocationQuery 0..* —— 0..1 PlanningSubzone (a query resolves to at most one subzone)
 */

import type { QueryType, ValidationStatus } from './enums.ts';

export interface LocationQuery {
  queryText: string;
  queryType: QueryType;
  validationStatus: ValidationStatus;
  /** 0..1 PlanningSubzone — set once the query is resolved */
  subzoneId?: string;
}
