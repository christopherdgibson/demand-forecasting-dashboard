import type { DemandProps, UnifiedChartPoint } from "../types";

export function combineHistoricalAndForecast(
  historical: DemandProps[],
  forecast: DemandProps[]
): UnifiedChartPoint[] {
  if (!historical.length && !forecast.length) return [];

  const merged: UnifiedChartPoint[] = [];

  // 1. Add historical points
  historical.forEach((item) => {
    merged.push({
      date: item.date,
      historical: item.value,
      forecast: null,
    });
  });

  // 2. Overlap: attach the last historical value as the start of the forecast line
  if (historical.length > 0 && forecast.length > 0) {
    const lastHistorical = merged[merged.length - 1];
    lastHistorical.forecast = lastHistorical.historical;
  }

  // 3. Add forecast points
  forecast.forEach((item) => {
    merged.push({
      date: item.date,
      historical: null,
      forecast: item.value,
    });
  });

  return merged;
}