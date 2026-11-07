export const MODEL_TYPES = ['ets', 'sarimax', 'theta'] as const;
export const modelNameMap: Record<ModelType, string> = {
  ets: 'ETS',
  sarimax: 'SARIMAX',
  theta: 'Theta'
}

export type ThemePref = 'system' | 'light' | 'dark';

export type ModelType = typeof MODEL_TYPES[number];

export interface CsvLoadInputs {
  source: string;
  isString?: boolean;
  delimiter?: string;
  dateCol: string;
  targetCol: string;
  freq: string;
  trimPartial?: boolean;
}

export interface CsvCustomInputs extends CsvLoadInputs {
  filename: string;
}

export interface DemandProps {
  date: string;
  historical: number | null;
  forecast: number | null;
  ci_lower: number | null;
  ci_upper: number | null;
}

export interface ControlsBase {
  isRunning: boolean;
  isLoading?: boolean;
}

export interface CardInputs {
  title: string;
  latex?: string;
  hint?: string;
  min?: number;
  max?: number;
  step?: number;
}

export interface DataNote {
  code: string;
  message: string;
}

export interface ErrorMessage {
  success: false;
  header: string;
  type: string;
  message: string;
  trace?: string;
}

export interface SuccessResult<T> {
  success: true;
  result: T;
}

export interface ForecastParameters {
  steps?: number;
  alpha: number;
}

export interface ForecastChartInputs extends ForecastParameters {
  history?: number;
}

export interface ForecastProps extends ForecastChartInputs {
  csvInputs: CsvLoadInputs;
}

export interface ColorStyle {
  shape: 'line' | 'area';
  dash?: string;
  color: string;
  opacity: number;
}

export interface ModelMetrics {
  aic: number | null;
  bic: number | null;
  mape: number | null;
  rmse: number | null;
}

export type ForecastResults = Record<ModelType, Array<DemandProps>>;

export interface ForecastResponse {
  forecasts: ForecastResults;
  failures: Partial<Record<ModelType, string>>;
}

export interface ModelResults {
  data: Array<DemandProps>;
  metrics: {
    ets: ModelMetrics;
    sarimax: ModelMetrics;
    theta: ModelMetrics;
  },
  failures: {
    ets: string;
    sarimax: string;
    theta: string;
  },
  notes: Array<DataNote>;
}

export type FailureKind = 'fit' | 'forecast';

interface ModelFailure {
  type: FailureKind;
  message: string;
}

export type ModelFailures = Partial<Record<ModelType, ModelFailure>>;

export type ForecastHorizonKeys = Exclude<keyof ForecastChartInputs, 'alpha' | 'csvInputs'>;

export interface ForecastChartData {
  date: string;
  historical: number | null;
  forecast: number | null;
  ci_lower: number | null;
  ci_upper: number | null;
  ci_range: (number | null)[] | null;
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

export interface OverlayChartData extends OverlayResults {
    ets_ci: (number | null)[] | null;
    sarimax_ci: (number | null)[] | null;
    theta_ci: (number | null)[] | null;
}

declare global {
  interface Window {
    loadPyodide: (config?: { indexURL?: string }) => Promise<any>;
  }
}
