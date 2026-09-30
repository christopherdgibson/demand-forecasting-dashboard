export interface DemandProps {
  date: string;
  historical: number | null;
  forecast: number | null;
  ci_lower: number | null;
  ci_upper: number | null;
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
