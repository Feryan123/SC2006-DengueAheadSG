/** One national monthly weather profile (Option A, #2). Normals are 2014–2025 for the same calendar month. */
export interface WeatherProfile {
  /** Latest complete month of humidity data, e.g. '2026-09' */
  humidityMonth: string;
  meanHumidityPct: number;
  humidityNormalMean: number;
  humidityNormalSd: number;
  /** Rainfall month used, 2–3 months back (lag), e.g. '2026-07' */
  rainfallMonth: string;
  rainfallMm: number;
  rainfallNormalMean: number;
  rainfallNormalSd: number;
}
