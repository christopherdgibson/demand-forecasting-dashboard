import { MODEL_TYPES } from '../types';
import type { DemandProps, ForecastChartData, ForecastResults, ModelType, OverlayChartData, OverlayResults } from '../types';

export function adjustHistory(history: Array<DemandProps>): Array<OverlayChartData> {
  const adjusted =  history.map((item, idx) => {
    if (idx === history.length - 1) {
      const val = item.historical;

      return {
        date: item.date, historical: val,
        forecast_ets: val, ci_lower_ets: val, ci_upper_ets: val,
        forecast_sarimax: val, ci_lower_sarimax: val, ci_upper_sarimax: val,
        forecast_theta: val, ci_lower_theta: val, ci_upper_theta: val,
      };
    }
    return {
      date: item.date, historical: item.historical,
      forecast_ets: null, ci_lower_ets: null, ci_upper_ets: null,
      forecast_sarimax: null, ci_lower_sarimax: null, ci_upper_sarimax: null,
      forecast_theta: null, ci_lower_theta: null, ci_upper_theta: null,
    };
  });

  return formatRechartsData(adjusted) as OverlayChartData[];
}

function emptyRow(date: string): OverlayResults {
  const overlayRow = {
    date,
    historical: null,
    forecast_ets: null,     ci_lower_ets: null,     ci_upper_ets: null,
    forecast_sarimax: null, ci_lower_sarimax: null, ci_upper_sarimax: null,
    forecast_theta: null,   ci_lower_theta: null,   ci_upper_theta: null,
  };

  return overlayRow;
}

export function reshapeRows(forecastMap: Partial<ForecastResults>): OverlayChartData[] {
  const rows = new Map<string, OverlayResults>();

  for (const model of MODEL_TYPES) {
    for (const item of forecastMap[model] ?? []) {
      const row = rows.get(item.date) ?? emptyRow(item.date);
      Object.assign(row, {
        [`forecast_${model}`]: item.forecast,
        [`ci_lower_${model}`]: item.ci_lower,
        [`ci_upper_${model}`]: item.ci_upper,
      });
      rows.set(item.date, row);
    }
  }

  const sorted = [...rows.values()].sort((a, b) => a.date.localeCompare(b.date));
  return formatRechartsData(sorted);
}

function formatRechartsData(data: OverlayResults[]): OverlayChartData[] {
  return data.map((item) => ({
    ...item,
    ets_ci: item.ci_lower_ets !== null ? [item.ci_lower_ets, item.ci_upper_ets] : null,
    sarimax_ci: item.ci_lower_sarimax !== null ? [item.ci_lower_sarimax, item.ci_upper_sarimax] : null,
    theta_ci: item.ci_lower_theta !== null ? [item.ci_lower_theta, item.ci_upper_theta] : null,
  }));
}

export function convertChartData(modelType: ModelType, dataNew: Array<OverlayChartData> | null): Array<ForecastChartData> | null {
  if (!dataNew) return null;

  return dataNew.map((item) => (
    modelType == 'ets' ? {
      date: item.date,
      historical: item.historical,
      forecast: item.forecast_ets,
      ci_lower: item.ci_lower_ets,
      ci_upper: item.ci_upper_ets,
      ci_range: item.ets_ci
    } : (
      modelType == 'sarimax' ? {
        date: item.date,
        historical: item.historical,
        forecast: item.forecast_sarimax,
        ci_lower: item.ci_lower_sarimax,
        ci_upper: item.ci_upper_sarimax,
        ci_range: item.sarimax_ci
      } : {
        date: item.date,
        historical: item.historical,
        forecast: item.forecast_theta,
        ci_lower: item.ci_lower_theta,
        ci_upper: item.ci_upper_theta,
        ci_range: item.theta_ci
      }
    )
  ));
}

export function shallowEqual<T extends object>(a: T | null, b: T | null): boolean {
  if (a === b) return true;
  if (!a || !b) return false;
  const keys = Object.keys(a) as (keyof T)[];
  return keys.length === Object.keys(b).length && keys.every((k) => a[k] === b[k]);
}