export interface DemandProps {
  date: string;
  value: number;
  value_historical: number;
}

export interface UnifiedChartPoint {
  date: string;
  historical: number | null;
  forecast: number | null;
}

export interface ForecastProps {
  file_path?: string;
  forecast_steps?: number;
}

export interface ForecastResults {
  historical: Array<DemandProps>
  forecast: Array<DemandProps>;
}

declare global {
  interface Window {
    loadPyodide: (config?: { indexURL?: string }) => Promise<any>;
  }
}
