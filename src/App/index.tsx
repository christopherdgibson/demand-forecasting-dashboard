import { useEffect, useRef, useState } from 'react';
import { usePyodide } from '../hooks/usePyodide';
import { usePyodideWorker } from '../hooks/usePyodideWorker';
import { useTheme } from '../hooks/useTheme';
import { useHue } from '../hooks/useHue';

import { HuePicker } from '../components/HuePicker';
import { SegmentedControl } from '../components/SegmentedControl';
import { ErrorBoundary } from '../components/ErrorBoundary';
import { ErrorModal } from '../components/ErrorModal';
import { InstructionsCard } from '../components/InstructionsCard';
import { ControlPanel } from '../components/Controls';
import { ForecastChart } from '../components/ForecastChart';
import { ForecastOverlayChart } from '../components/ForecastOverlayChart';
import { Metrics } from '../components/MetricsCard';
import { CsvUploader } from '../components/CsvUploader';

import { roundNumber } from '../utils/numberUtils';
import { adjustHistory, convertChartData, reshapeRows } from '../utils/dataUtils';

import './styles.css'

import type {
  CardInputs,
  CsvLoadInputs,
  ErrorMessage,
  ForecastChartData,
  ForecastChartInputs,
  ForecastHorizonKeys,
  ForecastInputs,
  ForecastProps,
  ForecastResults,
  ModelMetrics,
  ModelType,
  OverlayChartData 
} from '../types';

type SampleDataKey = 'RSXFSN' | 'RSAFSNA' | 'ECOMPCTNSA';

const DEFAULT_CSV_INPUTS: CsvLoadInputs = {
  source: 'RSXFSN.csv',
  isString: false, 
  dateCol: 'observation_date', 
  targetCol: 'RSXFSN', 
  freq: 'MS'
}

const SAMPLE_FREQ_MAP: Record<SampleDataKey, string> = {
  RSXFSN: 'MS', // Advance Retail Sales: Retail Trade (NSA)
  RSAFSNA: 'MS', // Advance Retail Sales: Retail Trade and Food Services (NSA)
  ECOMPCTNSA: 'QS' // E-Commerce Retail Sales as a Percent of Total Sales (NSA)
}

const DEFAULT_FORECAST_STEPS = 12;
const DEFAULT_ALPHA = 0.05;

const modelNameMap: Record<ModelType, string> = {
  ets: 'ETS',
  sarimax: 'SARIMAX',
  theta: 'Theta'
}

export default function App() {
  // UI states
  const hasFetchedRef = useRef(false);
  const [activeChartTab, setActiveChartTab] = useState<string | null>('forecast');
  const [activeSourceTab, setActiveSourceTab] = useState<string | null>('sample-data');
  const [activeErrorModal, setActiveErrorModal] = useState<boolean>(false);
  const [modalError, setModalError] = useState<ErrorMessage | null>(null);
  const [isRunning, setIsRunning] = useState(false);

  // Hooks
  const {activeTheme, setActiveTheme} = useTheme();
  const { hues, setHues, activePreset } = useHue();
  const {isLoading, fitModels, updateForecasts} = usePyodide();
  // const { isLoading, fitModels, updateForecasts } = usePyodideWorker();

  // Input states
  const [selectedSampleData, setSelectedSampleData] = useState<SampleDataKey>(DEFAULT_CSV_INPUTS['targetCol'] as SampleDataKey);
  const [selectedModel, setSelectedModel] = useState<ModelType>('ets');
  const [selectedPastPeriods, setSelectedPastPeriods] = useState<number>(24);
  const [forecastInputs, setForecastInputs] = useState<ForecastProps>({csvInputs: DEFAULT_CSV_INPUTS, steps: DEFAULT_FORECAST_STEPS, alpha: DEFAULT_ALPHA});
  const [chartInputs, setChartInputs] = useState<ForecastChartInputs>({...forecastInputs, history: selectedPastPeriods});
  const [isCurrentData, setIsCurrentData] = useState<boolean>(false);
  const isSample = (forecastInputs.csvInputs.isString == false); // Keeps track of setting sample data as active

  // Derived data
  const [fullAdjustedHistory, setFullAdjustedHistory] = useState<Array<OverlayChartData> | null>(null);
  const [forecastData, setForecastData] = useState<Array<OverlayChartData>>();
  const [overlayData, setOverlayData] = useState<Array<OverlayChartData> | null>(null);
  const [chartData, setChartData] = useState<Array<ForecastChartData> | null>(null);
  const [metricsMap, setMetricsMap] = useState<Record<string, ModelMetrics>>({});
  const [metrics, setMetrics] = useState<ModelMetrics | null>(null);  

  const timeHorizonCards: Record<ForecastHorizonKeys, CardInputs> = {
    history: {
      title: "Historic Horizon",
      hint: "Previous Periods",
      min: 1,
      max: fullAdjustedHistory?.length,
      step: 1,
    },
    steps: {
      title: "Prediction Horizon",
      hint: "Forecast Periods",
      min: 1,
      step: 1,
    }
  };

  // Load and fit model on initial mount
  useEffect(() => {
    if (isLoading || hasFetchedRef.current) return;
    hasFetchedRef.current = true;
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
    const modelResponse = await fitModels(csvInputs);
    if (modelResponse && modelResponse.success === false) {
      handleErrorResponse(modelResponse);
      return;
    }

    const modelResults = modelResponse !== null ? modelResponse.result : null;
    const adjustedHistory = modelResults !== null ? adjustHistory(modelResults.data) : null;
    setFullAdjustedHistory(adjustedHistory);

    const modelMetrics = modelResults !== null ? modelResults.metrics : null;    
    if (modelMetrics) {
      setMetricsMap(modelMetrics);
      setMetrics(modelMetrics[selectedModel]);
    }

    const forecastResponse = await updateForecasts({steps, alpha});
    if (forecastResponse && forecastResponse.success === false) {
      handleErrorResponse(forecastResponse);
      return;
    }

    if (adjustedHistory && forecastResponse) {
      updateChartData(adjustedHistory, forecastResponse.result)
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

    const forecastResponse = await updateForecasts({steps, alpha});
    if (forecastResponse && forecastResponse.success === false) {
      handleErrorResponse(forecastResponse);
      return;
    }
    if (forecastResponse && fullAdjustedHistory) {
      updateChartData(fullAdjustedHistory, forecastResponse.result);
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

  const handleRun = async () => {
    setIsRunning(true);
    try {
      runForecast(forecastInputs);
    } catch (err) {
      const raw = err instanceof Error ? err.message : String(err);
      const header = 'Simulation execution failed';
      const error: ErrorMessage =  {
        success: false,
        header,
        type: 'unknown',
        message: raw,
      };

      handleErrorResponse(error);
      console.error(header, raw);
    } finally {
      setIsRunning(false);
    }
  };

  const handleCustomDataReady = ({source, isString = true, dateCol, targetCol, freq = 'MS'}: CsvLoadInputs) => {
    setForecastInputs({...forecastInputs, csvInputs: {source, isString, dateCol, targetCol, freq}});
    // setIsCurrentData(false); // might change sample state here instead of with useEffect[sample] above?
  };

  function handleErrorResponse(error: ErrorMessage) {
    setModalError(error);
    setActiveErrorModal(true);
  }

  return (
    <ErrorBoundary>
      <div className={'app-container'}>
        <div className={'app-header'}>
          <h1 className={'title'}>Demand Forecast Dashboard</h1>
          <div className="app-header-controls">
            <HuePicker value={hues} activePreset={activePreset} onChange={setHues} />
            <SegmentedControl
              label="Theme"
              value={activeTheme}
              onChange={setActiveTheme}
              options={[
                { value: 'system', label: 'System' },
                { value: 'light',  label: 'Light' },
                { value: 'dark',   label: 'Dark' },
              ]}
            />
          </div>
        </div>

        {isLoading && ( 
          <div className={'loading-container'}>
            <h2 className={'loading-title'}>Loading Python Environment...</h2>
            <p className={'loading-text'}>Downloading Pyodide WASM runtime into browser.</p>
          </div>
        )}

        <InstructionsCard/>

        {activeErrorModal && !isLoading && !isRunning && modalError &&
          <ErrorModal activeModal={activeErrorModal} setActiveModal={setActiveErrorModal} error={modalError}/>
        }

        {/* Source Dataset */}
        <div className={`${activeSourceTab}`}>
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
          <h2 className="section-heading">{activeSourceTab === 'sample-data' ? 'Use Sample Data' : 'Upload Custom Data'}</h2>
          <div className={'chart-card'}>
            <div className='active-sample-data'>                  
            
              <div className={'controls-header'}>
                <h2 className={'controls-title'}>Select Sample Demand Dataset</h2>
                <span className={'badge'}>Demand Dataset</span>
              </div>
              <div className={'input-group'}>
                <div className={'field-group input-left'}>
                  <label className={'label'}>
                    <span>Data Source</span>
                    <span className={'hint'}>Input Dataset</span>
                  </label>
                  <select
                    className={'input dropdown'}
                    value={selectedSampleData}
                    disabled={isRunning || isLoading}
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
                <button
                  className={'secondary-button'}
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
            <div className='active-custom-data'>                  
              <CsvUploader isSample={isSample} onDataReady={handleCustomDataReady}/>
            </div>
            <div className={'actions'}>
              <button
                className={'primary-button'}
                onClick={handleRun}
                disabled={isRunning || isLoading}
              >
                {isRunning ? 'Running Forecast...' : 'Run Forecast'}
              </button>
            </div>
          </div>
        </div>
        
        <Metrics metrics={metrics} />
        
        {/* Active Chart Tab Navigation */}
        <div className={`${activeChartTab}`}>
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
            {chartData && (
              <ForecastChart
                controlPanel={
                  <ControlPanel
                    inputs={chartInputs}
                    timeHorizonCards={timeHorizonCards}
                    modelType={selectedModel}
                    onModelChange={handleModelChange}
                    onHistoryChange={handleHistoryChange}
                    onForecastChange={handleForecastChange}
                    isRunning={isRunning}
                    isLoading={isLoading}
                  />
                }
                title={`Demand Trajectory & 12-Month Forecast (${modelNameMap[selectedModel]} model)`}
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

          {/* Tab 2: Forecast Overlay */}
          <div className='active-ci-overlay'>
            <h2 className="section-heading">Forecast Overlay</h2>             
            {overlayData && (
              <ForecastOverlayChart
                controlPanel={
                  <ControlPanel
                    inputs={chartInputs}
                    timeHorizonCards={timeHorizonCards}
                    modelType={selectedModel}
                    onModelChange={handleModelChange}
                    onHistoryChange={handleHistoryChange}
                    onForecastChange={handleForecastChange}
                    isRunning={isRunning}
                    isLoading={isLoading}
                  />
                }
                modelType={selectedModel}
                chartData={overlayData}
                nameCI={`${roundNumber((1-forecastInputs.alpha)*100, 1)}% CI`}
              />
            )}
          </div>
        </div>
      </div>
    </ErrorBoundary>
  );
}
