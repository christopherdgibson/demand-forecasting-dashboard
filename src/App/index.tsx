import { useEffect, useState } from 'react';
import { Controls } from '../components/Controls';
import { ForecastChart } from '../components/ForecastChart';
import { ForecastOverlayChart } from '../components/ForecastOverlayChart';
import { Metrics } from '../components/MetricsCard';
import { CsvUploader } from '../components/CsvUploader';
import { usePyodide } from '../hooks/usePyodide';
import { usePyodideWorker } from '../hooks/usePyodideWorker';
import { roundNumber } from '../utils/numberUtils';

import './styles.css'
import chartStyles from '../components/ForecastChart/ForecastChart.module.css';
import controlsStyles from '../components/Controls/Controls.module.css';

import type { CsvLoadInputs, DemandProps, ForecastChartData, ForecastChartInputs, ForecastInputs, ForecastProps, ForecastResults, ModelMetrics, ModelType, OverlayChartData, OverlayResults } from '../types';

type SampleDataKey = 'RSXFSN' | 'RSAFSNA' | 'ECOMPCTNSA';

const DEFAULT_CSV_INPUTS: CsvLoadInputs = {
  source: 'RSXFSN.csv',
  isString: false, 
  dateCol: 'observation_date', 
  targetCol:'RSXFSN', 
  freq: 'MS'
}

const SAMPLE_FREQ_MAP: Record<SampleDataKey, string> = {
  RSXFSN: 'MS', // Advance Retail Sales: Retail Trade (NSA)
  RSAFSNA: 'MS', // Advance Retail Sales: Retail Trade and Food Services (NSA)
  ECOMPCTNSA: 'QS' // E-Commerce Retail Sales as a Percent of Total Sales (NSA)
}

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
  const [activeChartTab, setActiveChartTab] = useState<string | null>('forecast');
  const [activeSourceTab, setActiveSourceTab] = useState<string | null>('sample-data');
  const [isRunning, setIsRunning] = useState(false);
  const [selectedSampleData, setSelectedSampleData] = useState<SampleDataKey>('RSXFSN');
  const [selectedModel, setSelectedModel] = useState<ModelType>('ets');
  const [selectedPastPeriods, setSelectedPastPeriods] = useState<number>(24);
  const [forecastInputs, setForecastInputs] = useState<ForecastProps>({csvInputs: DEFAULT_CSV_INPUTS, steps: DEFAULT_FORECAST_STEPS, alpha: DEFAULT_ALPHA});
  const [chartInputs, setChartInputs] = useState<ForecastChartInputs>({...forecastInputs, history: selectedPastPeriods});
  const [isCurrentData, setIsCurrentData] = useState<boolean>(false);

  // Derived data
  const [fullAdjustedHistory, setFullAdjustedHistory] = useState<Array<OverlayChartData> | null>(null);
  const [forecastData, setForecastData] = useState<Array<OverlayChartData>>();
  const [overlayData, setOverlayData] = useState<Array<OverlayChartData> | null>(null);
  const [chartData, setChartData] = useState<Array<ForecastChartData> | null>(null);
  const [metricsMap, setMetricsMap] = useState<Record<string, ModelMetrics>>({});
  const [metrics, setMetrics] = useState<ModelMetrics | null>(null);  

  const { isLoading, fitModels, updateForecasts } = usePyodide();
  // const { isLoading, fitModels, updateForecasts } = usePyodideWorker();

  // Keeps track of setting sample data as active
  const isSample = (forecastInputs.csvInputs.isString == false);

  // Load and fit model on initial mount
  useEffect(() => {
    if (isLoading) return;
    runForecast(forecastInputs);
  }, [isLoading]);

  useEffect(() => {
    setChartInputs({...forecastInputs, history: selectedPastPeriods});
  }, [forecastInputs]);

  useEffect(() => {
    setIsCurrentData(isSample);
  }, [isSample]);

  async function runForecast({steps, alpha, csvInputs}: ForecastProps): Promise<void> {
    setForecastInputs({csvInputs, steps, alpha})
    const modelResults = await fitModels(csvInputs);
    const adjustedHistory = modelResults !== null ? adjustHistory(modelResults.data) : null;
    setFullAdjustedHistory(adjustedHistory);

    const modelMetrics = modelResults !== null ? modelResults.metrics : null;    
    if (modelMetrics) {
      setMetricsMap(modelMetrics);
      setMetrics(modelMetrics[selectedModel]);
    }

    const forecastResults = await updateForecasts({steps, alpha});
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

    const forecastResults = await updateForecasts({steps, alpha}); 
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

  // TODO: With more datasets will need to convert value into keys for csvInput array map
  const updateSampleData = (
    value: CsvLoadInputs['source']
  ) => {
    setForecastInputs({...forecastInputs, csvInputs: {...forecastInputs.csvInputs, source: value, isString: false}})
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

  const handleDataReady = async ({source, isString = true, dateCol, targetCol, freq = 'MS'}: CsvLoadInputs) => {
    setForecastInputs({...forecastInputs, csvInputs: {source, isString, dateCol, targetCol, freq}})
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
      <div className={`${activeSourceTab}`}>
        {/* Tab Navigation */}
        <div className="nav-tabs">
          <button
            onClick={() => setActiveSourceTab('sample-data')}
            className={`tab-btn ${activeSourceTab === 'sample-data' ? 'active' : ''}`}
          >
            Sample Data
          </button>
          <button
            onClick={() => setActiveSourceTab('custom-data')}
            className={`tab-btn ${activeSourceTab === 'custom-data' ? 'active' : ''}`}
          >
            Upload Data
          </button>
        </div>
        <div className='active-sample-data'>                  
          <h2 className="section-heading">Use Sample Data</h2>
          <div className={chartStyles.chartCard}>
            <div className={controlsStyles.header}>
              <h2 className={controlsStyles.title}>Select Sample Demand Dataset</h2>
              <span className={controlsStyles.badge}>Demand Dataset</span>
            </div>
            <div className={controlsStyles.fieldGroup}>
              <label className={controlsStyles.label}>
                <span>Data Source</span>
                <span className={controlsStyles.hint}>Input Dataset</span>
              </label>
              <select
                className={`${controlsStyles.input} ${controlsStyles.dropdown}`}
                value={controlsStyles.filepath}
                disabled={isRunning || isLoading}
                // disabled={true}
                onChange={(e) => {
                  setSelectedSampleData(e.target.value as SampleDataKey);
                  setIsCurrentData(false);
                }}
              >
                <option value="RSXFSN">FRED Retail Data</option>
                <option value="RSAFSNA">FRED Retail and Food Data</option>
                <option value="ECOMPCTNSA">FRED E-Commerce Data</option>
              </select>
            </div>
            <div className={controlsStyles.actions}>
              <button
                className={controlsStyles.primaryButton}
                disabled={isCurrentData}
                onClick={() => {
                  setForecastInputs({...forecastInputs, csvInputs: {source: `${selectedSampleData}.csv`, isString: false, dateCol: 'observation_date', targetCol: selectedSampleData, freq: SAMPLE_FREQ_MAP[selectedSampleData] }});
                  setIsCurrentData(true);
                }}
              >
                {isCurrentData ? "Updated" : "Update Data"}
              </button>
            </div>
          </div>
        </div>
        <div className='active-custom-data'>                  
          <h2 className="section-heading">Upload Custom Data</h2>
          <CsvUploader isSample={isSample} onDataReady={handleDataReady}/>
        </div>
          <div className={controlsStyles.actions}>
            <button
              className={controlsStyles.primaryButton}
              onClick={handleRun}
              disabled={isRunning || isLoading}
            >
              {isRunning ? 'Running Forecast...' : 'Run Forecast'}
            </button>
          </div>
      </div>
      
      <div className={`${activeChartTab}`}>
        {/* Tab Navigation */}
        <div className="nav-tabs">
          <button
            onClick={() => setActiveChartTab('forecast')}
            className={`tab-btn ${activeChartTab === 'forecast' ? 'active' : ''}`}
          >
            Demand Forecast
          </button>
          <button
            onClick={() => setActiveChartTab('ci-overlay')}
            className={`tab-btn ${activeChartTab === 'ci-overlay' ? 'active' : ''}`}
          >
            Forecast Overlay
          </button>
          <button
            onClick={() => setActiveChartTab('show-all')}
            className={`tab-btn ${activeChartTab === 'show-all' ? 'active' : ''}`}
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
              onForecastChange={handleForecastChange}
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
