import { useEffect, useState } from 'react';
import { Controls } from '../components/Controls';
import { ForecastChart } from '../components/ForecastChart';
import { ForecastOverlayChart } from '../components/ForecastOverlayChart';
import { Metrics } from '../components/MetricsCard';
import { usePyodide } from '../hooks/usePyodide';
import { usePyodideWorker } from '../hooks/usePyodideWorker';
import { roundNumber } from '../utils/numberUtils';

import './styles.css'
import chartStyles from '../components/ForecastChart/ForecastChart.module.css';

import type { DemandProps, ForecastChartData, ForecastChartInputs, ForecastInputs, ForecastProps, ForecastResults, ModelMetrics, ModelType, OverlayChartData, OverlayResults } from '../types';

const DEFAULT_FILE_PATH = 'RSXFSN.csv';
const DEFAULT_FORECAST_STEPS = 12;
const DEFAULT_ALPHA = 0.05;

function adjustHistory(history: Array<DemandProps>): Array<OverlayChartData> {
  const adjusted =  history.map((item, idx) => {
    if (idx === history.length - 1) {
      const val = item.historical;

      return {
        date: item.date, historical: val,
        forecast_ets: val, ci_lower_ets: val, ci_upper_ets: val,
        forecast_sarimax: val, ci_lower_sarimax: val, ci_upper_sarimax: val,
        forecast_theta: val, ci_lower_theta: val, ci_upper_theta: val,
      };
    }
    return {
      date: item.date, historical: item.historical,
      forecast_ets: null, ci_lower_ets: null, ci_upper_ets: null,
      forecast_sarimax: null, ci_lower_sarimax: null, ci_upper_sarimax: null,
      forecast_theta: null, ci_lower_theta: null, ci_upper_theta: null,
    };
  });

  return formatRechartsData(adjusted) as OverlayChartData[];
}

function reshapeRows(forecastMap: ForecastResults): OverlayChartData[] {
  const etsForecast = forecastMap['ets'] || [];
  const sarimaxForecast = forecastMap['sarimax'] || [];
  const thetaForecast = forecastMap['theta'] || [];
  const overlayRows = etsForecast.map((etsItem, index) => {
    const date = etsItem.date;
    const sarimaxItem = sarimaxForecast[index] || {};
    const thetaItem = thetaForecast[index] || {};

    return {
      date,
      historical: null, // No historical value in forecast horizon

      // ETS
      forecast_ets: etsItem.forecast,
      ci_lower_ets: etsItem.ci_lower,
      ci_upper_ets: etsItem.ci_upper,

      // SARIMAX
      forecast_sarimax: sarimaxItem.forecast ?? null,
      ci_lower_sarimax: sarimaxItem.ci_lower ?? null,
      ci_upper_sarimax: sarimaxItem.ci_upper ?? null,

      // Theta
      forecast_theta: thetaItem.forecast ?? null,
      ci_lower_theta: thetaItem.ci_lower ?? null,
      ci_upper_theta: thetaItem.ci_upper ?? null,
    };
  });

  return formatRechartsData(overlayRows);
}

function formatRechartsData(data: OverlayResults[]): OverlayChartData[] {
  return data.map((item) => ({
    ...item,
    ets_ci: item.ci_lower_ets !== null ? [item.ci_lower_ets, item.ci_upper_ets] : null,
    sarimax_ci: item.ci_lower_sarimax !== null ? [item.ci_lower_sarimax, item.ci_upper_sarimax] : null,
    theta_ci: item.ci_lower_theta !== null ? [item.ci_lower_theta, item.ci_upper_theta] : null,
  }));
}

function convertChartData(modelType: ModelType, dataNew: Array<OverlayChartData> | null): Array<ForecastChartData> | null {
  if (!dataNew) return null;

  return dataNew.map((item) => (
    modelType == 'ets' ? {
      date: item.date,
      historical: item.historical,
      forecast: item.forecast_ets,
      ci_lower: item.ci_lower_ets,
      ci_upper: item.ci_upper_ets,
      ci_range: item.ets_ci
    } : (
      modelType == 'sarimax' ? {
        date: item.date,
        historical: item.historical,
        forecast: item.forecast_sarimax,
        ci_lower: item.ci_lower_sarimax,
        ci_upper: item.ci_upper_sarimax,
        ci_range: item.sarimax_ci
      } : {
        date: item.date,
        historical: item.historical,
        forecast: item.forecast_theta,
        ci_lower: item.ci_lower_theta,
        ci_upper: item.ci_upper_theta,
        ci_range: item.theta_ci
      }
    )
  ));
}

export default function App() {
  const [activeTab, setActiveTab] = useState<string | null>('forecast');
  const [isRunning, setIsRunning] = useState(false);
  const [selectedModel, setSelectedModel] = useState<ModelType>('ets');
  const [selectedPastPeriods, setSelectedPastPeriods] = useState<number>(24);
  const [forecastInputs, setForecastInputs] = useState<ForecastProps>({filepath: DEFAULT_FILE_PATH, steps: DEFAULT_FORECAST_STEPS, alpha: DEFAULT_ALPHA});
  const [chartInputs, setChartInputs] = useState<ForecastChartInputs>({...forecastInputs, history: selectedPastPeriods});

  // Derived data
  const [fullAdjustedHistory, setFullAdjustedHistory] = useState<Array<OverlayChartData> | null>(null);
  const [forecastData, setForecastData] = useState<Array<OverlayChartData>>();
  const [overlayData, setOverlayData] = useState<Array<OverlayChartData> | null>(null);
  const [chartData, setChartData] = useState<Array<ForecastChartData> | null>(null);
  const [metricsMap, setMetricsMap] = useState<Record<string, ModelMetrics>>({});
  const [metrics, setMetrics] = useState<ModelMetrics | null>(null);  

  const { isLoading, fitModels, updateForecasts } = usePyodide();
  // const { isLoading, fitModels, updateForecasts } = usePyodideWorker();

  // Load and fit model on initial mount
  useEffect(() => {
    if (isLoading) return;
    runForecast(forecastInputs);
  }, [isLoading]);

  useEffect(() => {
    setChartInputs({...forecastInputs, history: selectedPastPeriods});
  }, [forecastInputs]);

  async function runForecast({filepath, steps, alpha}: ForecastProps): Promise<void> {
    setForecastInputs({filepath, steps, alpha})
    const modelResults = await fitModels(filepath);
    const adjustedHistory = modelResults !== null ? adjustHistory(modelResults.data) : null;
    setFullAdjustedHistory(adjustedHistory);

    const modelMetrics = modelResults !== null ? modelResults.metrics : null;    
    if (modelMetrics) {
      setMetricsMap(modelMetrics);
      setMetrics(modelMetrics[selectedModel]);
    }

    const forecastResults = await updateForecastResults({steps, alpha});
    if (adjustedHistory && forecastResults) {
      updateChartData(adjustedHistory, forecastResults)
    }
  }

  // Change active forecast without backend update
  const handleModelChange = (modelType: ModelType) => {
    setSelectedModel(modelType);
    setMetrics(metricsMap[modelType]);
    setChartData(convertChartData(modelType, overlayData))
  }

  // Update chart input changes moves (No refitting)
  const handleForecastChange = async ({steps, alpha}: ForecastInputs): Promise<void> => {
    setForecastInputs({...forecastInputs, steps, alpha});
    setMetrics(metricsMap[selectedModel]); // historical metrics should not need updating with forecast changes?

    const forecastResults = await updateForecastResults({steps, alpha}); 
    if (forecastResults && fullAdjustedHistory) {
      updateChartData(fullAdjustedHistory, forecastResults);
    }
  }
  
  function handleHistoryChange(newPeriods: number) {
    setSelectedPastPeriods(newPeriods);
    setChartInputs({...chartInputs, history: newPeriods});

    if (fullAdjustedHistory && forecastData) {
      const truncatedHistory =  fullAdjustedHistory.slice(-(newPeriods + 1));
      const combinedDataset = [...truncatedHistory, ...forecastData];

      setOverlayData(combinedDataset);
      setChartData(convertChartData(selectedModel, combinedDataset));
    }
  }

  const updateChartData = (adjustedHistory: Array<OverlayChartData>, forecastResults: ForecastResults): void => {
    const reshaped = reshapeRows(forecastResults);
    setForecastData(reshaped);
    const truncatedHistory = adjustedHistory.slice(-selectedPastPeriods);

    const combinedDataset = [...truncatedHistory, ...reshaped];
    setOverlayData(combinedDataset);
    setChartData(convertChartData(selectedModel, combinedDataset))
  }

  const updateForecastResults = async({steps, alpha}: ForecastInputs): Promise<ForecastResults | null> => {
    const forecastResults = await updateForecasts({steps, alpha});
    
    return forecastResults;
  }

  const handleRun = async () => {
    setIsRunning(true);
    try {
      runForecast(forecastInputs);
    } catch (err) {
      console.error('Simulation execution failed:', err);
    } finally {
      setIsRunning(false);
    }
  };

  return (
    <div className={'app-container'}>
      <h1 className={'title'}>Demand Forecast Dashboard</h1>

      {isLoading && ( 
        <div className={'loading-container'}>
          <h2 className={'loading-title'}>Loading Python Environment...</h2>
          <p className={'loading-text'}>Downloading Pyodide WASM runtime into browser.</p>
        </div>
      )}
        
      <Metrics metrics={metrics} />
    
      <div className={`${activeTab}`}>
        {/* Tab Navigation */}
        <div className="nav-tabs">
          <button
            onClick={() => setActiveTab('forecast')}
            className={`tab-btn ${activeTab === 'forecast' ? 'active' : ''}`}
          >
              Demand Forecast
          </button>
          <button
            onClick={() => setActiveTab('ci-overlay')}
            className={`tab-btn ${activeTab === 'ci-overlay' ? 'active' : ''}`}
          >
            Forecast Overlay
          </button>
          <button
            onClick={() => setActiveTab('show-all')}
            className={`tab-btn ${activeTab === 'show-all' ? 'active' : ''}`}
          >
            Show All
          </button>
        </div>

        {/* Tab 1: Demand Forecast */}
        <div className='active-forecast'>                  
          <h2 className="section-heading">Demand Forecast</h2>
          <div className={chartStyles.chartCard}>  
            <Controls
              inputs={chartInputs}
              modelType={selectedModel}
              onModelChange={handleModelChange}
              onHistoryChange={handleHistoryChange}
              onDatasetChange={runForecast}
              onForecastChange={handleForecastChange}
              onRunForecast={handleRun}
              isRunning={isRunning}
              isLoading={isLoading}
            />
            {chartData && (
              <ForecastChart
                chartData={chartData}
                dataHistorical={"historical"}
                dataForecast={"forecast"}
                name1={"Historical"}
                name2={"Forecast"}
                nameCI={`${roundNumber((1-forecastInputs.alpha)*100, 1)}% Confidence Band`}
                formatType={"currency"}
                xLabel={'Date'}
                yLabel={'Demand'}
              />
            )}
          </div>
        </div>

        {/* Tab 2: Forecast Overlay */}
        <div className='active-ci-overlay'>
          <h2 className="section-heading">Forecast Overlay</h2>
          {overlayData && (
            <ForecastOverlayChart
              inputs={chartInputs}
              modelType={selectedModel}
              chartData={overlayData}
              onModelChange={handleModelChange}
              onHistoryChange={handleHistoryChange}
              onForecastChange={handleForecastChange}
              isRunning={isRunning}
            />
          )}
        </div>
      </div>
    </div>
  );
}
