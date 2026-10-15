export type ModelType = 'ets' | 'sarimax' | 'theta';

export interface DemandProps {
  date: string;
  historical: number | null;
  forecast: number | null;
  ci_lower: number | null;
  ci_upper: number | null;
}

export interface ControlsBase {
  isRunning: boolean;
  isLoading: boolean;
}

export interface CardInputs {
  title: string;
  latex?: string;
  hint?: string;
  min?: number;
  max?: number;
  step?: number;
}

export interface ForecastInputs {
  steps?: number;
  alpha: number;
}

export interface ForecastProps extends ForecastInputs {
  filepath?: string;
}

export interface ModelMetrics {
  aic: number | null;
  bic: number | null;
  mape: number | null;
  rmse: number | null;
}

export interface ForecastResults {
  ets: Array<DemandProps>;
  sarimax: Array<DemandProps>;
  theta: Array<DemandProps>;
}

export interface ModelResults {
  data: Array<DemandProps>;
  metrics: {
    ets: ModelMetrics;
    sarimax: ModelMetrics;
    theta: ModelMetrics;
  }
}

export interface OverlayResults {
  date: string;
  historical: number | null;
  forecast_ets: number | null;
  ci_lower_ets: number | null;
  ci_upper_ets: number | null;
  forecast_sarimax: number | null;
  ci_lower_sarimax: number | null;
  ci_upper_sarimax: number | null;
  forecast_theta: number | null;
  ci_lower_theta: number | null;
  ci_upper_theta: number | null;
}

declare global {
  interface Window {
    loadPyodide: (config?: { indexURL?: string }) => Promise<any>;
  }
}
