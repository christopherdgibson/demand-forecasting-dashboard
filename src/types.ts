export type ModelType = 'ets' | 'sarimax';

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
  data: Array<DemandProps>;
  metrics: {
    ets: ModelMetrics;
    sarimax: ModelMetrics;
  }
}

export interface ForecastInputs {
  modelType: ModelType;
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
