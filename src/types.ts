export interface DemandProps {
  date: string;
  historical: number | null;
  forecast: number | null;
  ci_lower: number | null;
  ci_upper: number | null;
}

export interface ModelMetrics {
  aic: number;
  bic: number;
  mape: number;
  rmse: number;
}

export interface ModelResults {
  demand: Array<DemandProps>;
  metrics: ModelMetrics;
}

export interface ForecastInputs {
  steps: number;
  alpha: number;
}

export interface ForecastProps extends ForecastInputs {
  filepath: string;
}

declare global {
  interface Window {
    loadPyodide: (config?: { indexURL?: string }) => Promise<any>;
  }
}
