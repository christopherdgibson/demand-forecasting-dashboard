import { useEffect, useState } from 'react';
import Controls from '../components/Controls';
import { ForecastChart } from '../components/ForecastChart';
import { MetricsCard } from '../components/MetricsCard';
import { usePyodide } from '../hooks/usePyodide';
import { usePyodideWorker } from '../hooks/usePyodideWorker';
import { roundNumber } from '../utils/numberUtils';
import type { DemandProps, ForecastInputs, ForecastProps, ModelMetrics } from '../types';

const DEFAULT_FILE_PATH = 'RSXFSN.csv';
const DEFAULT_FORECAST_STEPS = 12;
const DEFAULT_ALPHA = 0.05;

export default function App() {
  const [inputs, setInputs] = useState<ForecastProps>({filepath: DEFAULT_FILE_PATH, modelType: 'ets', steps: DEFAULT_FORECAST_STEPS, alpha: DEFAULT_ALPHA});
  const [data, setData] = useState<Array<DemandProps> | null>(null);
  const [metrics, setMetrics] = useState<ModelMetrics | null>(null);
  const [isRunning, setIsRunning] = useState(false);
  const [historicalData, setHistoricalData] = useState<Array<DemandProps> | null>();
  const [metricsMap, setMetricsMap] = useState<Record<string, ModelMetrics>>({});
  const [forecastMap, setForecastMap] = useState<Record<string, DemandProps[]>>({}); // For importing forecasts for all models
  const [selectedModel, setSelectedModel] = useState<'ets' | 'sarimax'>('ets'); // For separaing model toggle from forecast update

  const { isLoading, fitModels, updateForecast } = usePyodide();
  // const { isLoading, fitModels, updateForecast } = usePyodideWorker();

  // Load and fit model on initial mount
  useEffect(() => {
    if (isLoading) return;
    runForecast(inputs);
  }, [isLoading]);

  async function runForecast({filepath, modelType, steps, alpha}: ForecastProps): Promise<void> {
    setInputs({filepath, modelType, steps, alpha})
    const modelResults = await fitModels(filepath);
    const historical = modelResults !== null ? modelResults.data : null;
    const modelMetrics = modelResults !== null ? modelResults.metrics : null;
    setHistoricalData(historical);
    
    if (modelMetrics) {
      setMetricsMap(modelMetrics);
      setMetrics(modelMetrics[modelType]);
    }
    const forecast = await updateForecast({modelType, steps, alpha});
    if (historical && forecast) {
      setData([...historical, ...forecast]);
    }
  }

  // Update chart input changes moves (No refitting)
  const handleForecastChange = async ({modelType, steps, alpha}: ForecastInputs): Promise<void> => {
    setInputs({...inputs, modelType, steps, alpha});
    if (!historicalData) return;
    setMetrics(metricsMap[modelType]);
    const forecast = await updateForecast({modelType, steps, alpha});
    if (forecast) {
      setData([...historicalData, ...forecast]);
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

  return (
    <div className={'container'}>
      <h1 className={'title'}>Demand Forecast Dashboard</h1>

      <Controls
        inputs={inputs}
        onDatasetChange={runForecast}
        onForecastChange={handleForecastChange}
        onRunForecast={handleRun}
        isRunning={isRunning}
      />

      {isLoading
          ? ( 
            <div className={'loading-container'}>
              <h2 className={'loading-title'}>Loading Python Environment...</h2>
              <p className={'loading-text'}>Downloading Pyodide WASM runtime into browser.</p>
            </div>
          ) : (
            <>
              {metrics && (
                <MetricsCard metrics={metrics} />
              )}
            
              {data && (
                <ForecastChart
                  chartData={data}
                  dataHistorical={"historical"}
                  dataForecast={"forecast"}
                  name1={"Historical"}
                  name2={"Forecast"}
                  nameCI={`${roundNumber((1-inputs.alpha)*100, 1)}% Confidence Band`}
                  formatType={"currency"}
                  xLabel={'Date'}
                  yLabel={'Demand'}
                />
              )}
            </>
          )
        }  
    </div>
  );
}