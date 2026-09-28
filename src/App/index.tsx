import { useState } from 'react';
import Controls from '../components/Controls';
import { ForecastChart } from '../components/ForecastChart';
import { usePyodide } from '../hooks/usePyodide';
import type { DemandProps, ForecastProps, ForecastResults } from '../types';
import styles from './App.module.css';

const DEFAULT_FILE_PATH = 'RSXFSN.csv';
const DEFAULT_FORECAST_STEPS = 12;

export default function App() {
  const [inputs, setInputs] = useState<ForecastProps>({file_path: DEFAULT_FILE_PATH, forecast_steps: DEFAULT_FORECAST_STEPS});
  const [results, setResults] = useState<ForecastResults | null>(null);
  const [isRunning, setIsRunning] = useState(false);
  const { isLoading, runForecast } = usePyodide();

  const handleRun = async () => {
    setIsRunning(true);
    try {
      const output = await runForecast({forecast_steps: inputs.forecast_steps});
      setResults(output);
      // console.log("results?.forecast: ", results?.forecast);
    } catch (err) {
      console.error('Simulation execution failed:', err);
    } finally {
      setIsRunning(false);
    }
  };

  if (isLoading) {
    return (
      <div className={styles.loadingContainer}>
        <h2 className={styles.loadingTitle}>Loading Python Environment...</h2>
        <p className={styles.loadingText}>Downloading Pyodide WASM runtime into browser.</p>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <h1 className={styles.title}>Demand Forecast Dashboard</h1>

      <Controls
        inputs={inputs}
        onChange={setInputs}
        onRunForecast={handleRun}
        isRunning={isRunning}
      />
            
      {results && (
        <>
          <ForecastChart
            historicalData={results.historical}
            forecastData={results.forecast}
            dataKey1={"historical"}
            dataKey2={"forecast"}
            name1={"Historical"}
            name2={"Forecast"}
            formatType={"currency"}
            xLabel={'Date'}
            yLabel={'Demand'}
          />

        </>
      )}
    </div>
  );
}