export interface DemandProps {
  date: string;
  historical: number | null;
  forecast: number | null;
}

export interface ForecastProps {
  filepath: string;
  forecast_steps: number;
}

declare global {
  interface Window {
    loadPyodide: (config?: { indexURL?: string }) => Promise<any>;
  }
}
