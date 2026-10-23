export interface WeatherProfile {
  meanHumidity14Days: number;
  humidityBaselineMean: number;
  humidityBaselineSD: number;
  rainfallLaggedMonth: string;
  rainfallMmLagged: number;
  rainfallBaselineMean: number;
  rainfallBaselineSD: number;
}