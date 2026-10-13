import { useEffect, useState } from 'react';
import Controls from '../components/Controls';
import { ForecastChart } from '../components/ForecastChart';
import { ForecastOverlayChart } from '../components/ForecastOverlayChart';
import { MetricsCard } from '../components/MetricsCard';
import { usePyodide } from '../hooks/usePyodide';
import { usePyodideWorker } from '../hooks/usePyodideWorker';
import { roundNumber } from '../utils/numberUtils';
import type { DemandProps, ForecastInputs, ForecastProps, ForecastResults, ModelMetrics, ModelType } from '../types';

const DEFAULT_FILE_PATH = 'RSXFSN.csv';
const DEFAULT_FORECAST_STEPS = 12;
const DEFAULT_ALPHA = 0.05;

export default function App() {
  const [inputs, setInputs] = useState<ForecastProps>({filepath: DEFAULT_FILE_PATH, steps: DEFAULT_FORECAST_STEPS, alpha: DEFAULT_ALPHA});
  const [data, setData] = useState<Array<DemandProps> | null>(null);
  const [metrics, setMetrics] = useState<ModelMetrics | null>(null);
  const [isRunning, setIsRunning] = useState(false);
  const [historicalData, setHistoricalData] = useState<Array<DemandProps> | null>();
  const [metricsMap, setMetricsMap] = useState<Record<string, ModelMetrics>>({});
  const [forecastMap, setForecastMap] = useState<ForecastResults>();
  const [selectedModel, setSelectedModel] = useState<ModelType>('ets');

  const { isLoading, fitModels, updateForecasts } = usePyodide();
  // const { isLoading, fitModels, updateForecasts } = usePyodideWorker();

  // Load and fit model on initial mount
  useEffect(() => {
    if (isLoading) return;
    runForecast(inputs);
  }, [isLoading]);

  async function runForecast({filepath, steps, alpha}: ForecastProps): Promise<void> {
    setInputs({filepath, steps, alpha})
    const modelResults = await fitModels(filepath);
    const historical = modelResults !== null ? modelResults.data : null;
    setHistoricalData(historical);

    const modelMetrics = modelResults !== null ? modelResults.metrics : null;    
    if (modelMetrics) {
      setMetricsMap(modelMetrics);
      setMetrics(modelMetrics[selectedModel]);
    }

    const activeForecast = await updateForecastResults({steps, alpha});
    if (historical && activeForecast) {
      setData([...historical, ...activeForecast]);
    }
  }

  // Change active forecast without backend update
  const handleModelChange = (modelType: ModelType) => {
    setSelectedModel(modelType);
    const activeForecast = forecastMap ? forecastMap[modelType] : null;
    setMetrics(metricsMap[modelType]);

    if (historicalData && activeForecast) {
      setData([...historicalData, ...activeForecast]);
    }
  }

  // Update chart input changes moves (No refitting)
  const handleForecastChange = async ({steps, alpha}: ForecastInputs): Promise<void> => {
    setInputs({...inputs, steps, alpha});
    if (!historicalData) return;
    setMetrics(metricsMap[selectedModel]);

    const activeForecast = await updateForecastResults({steps, alpha}); 
    if (activeForecast) {
      setData([...historicalData, ...activeForecast]);
    }
  };

  const updateForecastResults = async({steps, alpha}: ForecastInputs): Promise<Array<DemandProps> | null> => {
    const forecastResults = await updateForecasts({steps, alpha});
    let activeForecast = null
    if (forecastResults) {
      setForecastMap(forecastResults);
      activeForecast = forecastResults[selectedModel];
    }
    
    return activeForecast;
  }

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
        modelType={selectedModel}
        onModelChange={handleModelChange}
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

              {historicalData && forecastMap && (
                <ForecastOverlayChart
                  historicalData={historicalData}
                  forecastMap={forecastMap}
                  pastPeriods={historicalData.length}
                />
              )}
            </>
          )
        }  
    </div>
  );
}