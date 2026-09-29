import { useEffect, useState } from 'react';
import Controls from '../components/Controls';
import { ForecastChart } from '../components/ForecastChart';
import { usePyodide } from '../hooks/usePyodide';
import type { DemandProps, ForecastProps } from '../types';
import styles from './App.module.css';

const DEFAULT_FILE_PATH = 'RSXFSN.csv';
const DEFAULT_FORECAST_STEPS = 12;

export default function App() {
  const [inputs, setInputs] = useState<ForecastProps>({filepath: DEFAULT_FILE_PATH, forecast_steps: DEFAULT_FORECAST_STEPS});
  const [results, setResults] = useState<Array<DemandProps> | null>(null);
  const [isRunning, setIsRunning] = useState(false);
  const { isLoading, fitModel, updateForecast, historicalData } = usePyodide();

  // Load and fit model on initial mount
  useEffect(() => {
    console.log('useEffect');
    runForecast(inputs);
  }, []);

  async function runForecast({filepath, forecast_steps}: ForecastProps): Promise<void> {
    setInputs({filepath, forecast_steps})
    const historical = await fitModel(filepath);
    const forecast = await updateForecast(forecast_steps);
    if (historical && forecast) {
      setResults([...historical, ...forecast]);
    }
  }

  // Update chart input changes moves (No refitting)
  const handleForecastChange = async ({filepath, forecast_steps}: ForecastProps): Promise<void> => {
    setInputs({...inputs, forecast_steps});
    if (!historicalData) return;
    const forecast = await updateForecast(forecast_steps);
    if (forecast) {
      setResults([...historicalData, ...forecast]);
    }
  };

  const handleRun = async () => {
    setIsRunning(true);
    try {
      runForecast(inputs);
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
        onDatasetChange={runForecast}
        onForecastChange={handleForecastChange}
        onRunForecast={handleRun}
        isRunning={isRunning}
      />
            
      {results && (
        <>
          <ForecastChart
            chartData={results}
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