import { useEffect, useState } from 'react';
import Controls from '../components/Controls';
import { ForecastChart } from '../components/ForecastChart';
import { usePyodide } from '../hooks/usePyodide';
import { usePyodideWorker } from '../hooks/usePyodideWorker';
import type { DemandProps, ForecastInputs, ForecastProps } from '../types';
import styles from './App.module.css';

const DEFAULT_FILE_PATH = 'RSXFSN.csv';
const DEFAULT_FORECAST_STEPS = 12;
const DEFAULT_ALPHA = 0.05;

export default function App() {
  const [inputs, setInputs] = useState<ForecastProps>({filepath: DEFAULT_FILE_PATH, steps: DEFAULT_FORECAST_STEPS, alpha: DEFAULT_ALPHA});
  const [results, setResults] = useState<Array<DemandProps> | null>(null);
  const [isRunning, setIsRunning] = useState(false);
  const [historicalData, setHistoricalData] = useState<Array<DemandProps> | null>();

  const { isLoading, fitModel, updateForecast } = usePyodide();
  // const { isLoading, fitModel, updateForecast } = usePyodideWorker();

  // Load and fit model on initial mount
  useEffect(() => {
    if (isLoading) return;
    runForecast(inputs);
  }, [isLoading]);

  async function runForecast({filepath, steps, alpha}: ForecastProps): Promise<void> {
    setInputs({filepath, steps, alpha})
    const historical = await fitModel(filepath);
    setHistoricalData(historical);
    const forecast = await updateForecast({steps, alpha});
    if (historical && forecast) {
      setResults([...historical, ...forecast]);
    }
  }

  // Update chart input changes moves (No refitting)
  const handleForecastChange = async ({steps, alpha}: ForecastInputs): Promise<void> => {
    setInputs({...inputs, steps, alpha});
    if (!historicalData) return;
    const forecast = await updateForecast({steps, alpha});
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
            dataHistorical={"historical"}
            dataForecast={"forecast"}
            name1={"Historical"}
            name2={"Forecast"}
            nameCI={`${Math.round((1-inputs.alpha)*10000)/100}% Confidence Band`}
            formatType={"currency"}
            xLabel={'Date'}
            yLabel={'Demand'}
          />

        </>
      )}
    </div>
  );
}