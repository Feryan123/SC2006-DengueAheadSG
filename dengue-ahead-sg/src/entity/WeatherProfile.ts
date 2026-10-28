/** One national monthly weather profile (Option A, #2). Normals are for the same calendar month: humidity 2014–2025, rainfall 1991–2020. */
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
