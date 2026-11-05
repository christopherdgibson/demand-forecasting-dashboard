import { useEffect, useMemo, useRef, useState } from 'react';
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
import { adjustHistory, convertChartData, reshapeRows, shallowEqual } from '../utils/dataUtils';

import './styles.css'

import { modelNameMap } from '../types';
import type {
  CardInputs,
  CsvCustomInputs,
  CsvLoadInputs,
  ErrorMessage,
  ForecastChartInputs,
  ForecastHorizonKeys,
  ForecastParameters,
  ForecastProps,
  ForecastResults,
  ModelMetrics,
  ModelType,
  OverlayChartData 
} from '../types';

type SampleDataKey = 'RSXFSN' | 'RSAFSNA' | 'ECOMPCTNSA' | 'custom';

const DEFAULT_CSV_INPUTS: CsvLoadInputs = {
  source: 'RSXFSN.csv',
  isString: false, 
  dateCol: 'observation_date', 
  targetCol: 'RSXFSN', 
  freq: 'MS'
}

const SAMPLE_NAME_MAP: Record<SampleDataKey, string> = {
  RSXFSN: 'FRED Retail Data', // Advance Retail Sales: Retail Trade (NSA)
  RSAFSNA: 'FRED Retail and Food Data', // Advance Retail Sales: Retail Trade and Food Services (NSA)
  ECOMPCTNSA: 'FRED E-Commerce Data', // E-Commerce Retail Sales as a Percent of Total Sales (NSA)
  custom: 'Custom Data'
}

const SAMPLE_FREQ_MAP: Record<SampleDataKey, string> = {
  RSXFSN: 'MS',
  RSAFSNA: 'MS',
  ECOMPCTNSA: 'QS',
  custom: 'MS' // Default custom to monthly, consistent with CsvUploader
}

const DEFAULT_FORECAST_STEPS = 12;
const DEFAULT_ALPHA = 0.05;

const nextPaint = () => new Promise<void>((r) => requestAnimationFrame(() => setTimeout(r, 0)));

export default function App() {
  // UI states
  const hasFetchedRef = useRef(false);
  const [activeChartTab, setActiveChartTab] = useState<string | null>('forecast');
  const [activeSourceTab, setActiveSourceTab] = useState<string | null>('sample-data');
  const [activeErrorModal, setActiveErrorModal] = useState<boolean>(false);
  const [modalErrorMessage, setModalErrorMessage] = useState<ErrorMessage | null>(null);
  const [isRunning, setIsRunning] = useState(false);

  // Hooks
  const {activeTheme, setActiveTheme} = useTheme();
  const {hues, setHues, activePreset} = useHue();
  const {isLoading, fitModels, updateForecasts} = usePyodide();
  // const { isLoading, fitModels, updateForecasts } = usePyodideWorker();

  // Input states
  const [selectedSampleData, setSelectedSampleData] = useState<SampleDataKey>(DEFAULT_CSV_INPUTS['targetCol'] as SampleDataKey);
  const [customCsvData, setCustomCsvData] = useState<CsvCustomInputs>({filename: '', source: '', isString: true, delimiter: ',', dateCol: '', targetCol: '', freq: 'MS'});
  const [modelFitInputs, setModelFitInputs] = useState<CsvLoadInputs>(DEFAULT_CSV_INPUTS);
  const [activeModelInputs, setActiveModelInputs] = useState<CsvLoadInputs | null>(null);

  // Display states (reactively affect chart results)
  const [selectedModel, setSelectedModel] = useState<ModelType>('ets');
  const [selectedPastPeriods, setSelectedPastPeriods] = useState<number>(24);
  const [forecastParameters, setForecastParameters] = useState<ForecastParameters>({steps: DEFAULT_FORECAST_STEPS, alpha: DEFAULT_ALPHA});

  // Derived data
  const [fullAdjustedHistory, setFullAdjustedHistory] = useState<Array<OverlayChartData> | null>(null);
  const [forecastData, setForecastData] = useState<Array<OverlayChartData> | null>(null);
  const [metricsMap, setMetricsMap] = useState<Record<string, ModelMetrics>>({});
  const [modelFailures, setModelFailures] = useState<Partial<Record<ModelType, string>>>({});

  const timeHorizonCards: Record<ForecastHorizonKeys, CardInputs> = {
    history: {
      title: "Historic Horizon",
      hint: "Previous Periods",
      min: 0,
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
    handleRun();
  }, [isLoading]);

  const overlayData = useMemo(
    () => fullAdjustedHistory && forecastData
      ? [...fullAdjustedHistory.slice(-(selectedPastPeriods + 1)), ...forecastData]
      : null,
    [fullAdjustedHistory, forecastData, selectedPastPeriods]
  );

  const chartInputs: ForecastChartInputs = useMemo(
    () =>  ({...forecastParameters, history: selectedPastPeriods}),
    [forecastParameters, selectedPastPeriods]
  );

  const activeFileName = useMemo(
    () => selectedSampleData === 'custom' ? customCsvData.filename : `${SAMPLE_NAME_MAP[selectedSampleData]}: ${selectedSampleData}.csv`,
    [activeModelInputs]
  );

  const isForecastCurrent = useMemo(
    () => shallowEqual(modelFitInputs, activeModelInputs),
    [modelFitInputs, activeModelInputs]
  );

  const availableModels =  Object.keys(metricsMap) as ModelType[];
  const activeModel = availableModels.includes(selectedModel)
    ? selectedModel
    : availableModels[0] ?? selectedModel;

  // Derived data use current values
  const chartData = useMemo(
    () => convertChartData(activeModel, overlayData),
    [activeModel, overlayData]
  );

  const metrics = metricsMap[activeModel] ?? null;
  const inputsValid = modelFitInputs.dateCol !== modelFitInputs.targetCol;

  async function runForecast({ csvInputs, steps, alpha }: ForecastProps): Promise<void> {
    const modelResponse = await fitModels(csvInputs);
    if (modelResponse.success === false) {
      handleErrorResponse(modelResponse);
      return;
    }

    const forecastResponse = await updateForecasts({ steps, alpha });
    if (forecastResponse.success === false) {
      handleErrorResponse(forecastResponse);
      return;
    }

    // Both succeeded: commit everything in one render
    setFullAdjustedHistory(adjustHistory(modelResponse.result.data));
    setMetricsMap(modelResponse.result.metrics ?? {});
    setModelFailures(modelResponse.result.failures ?? {});
    updateChartData(forecastResponse.result);
    setActiveModelInputs(csvInputs);
  }

  // Update chart input changes moves (No refitting)
  const handleForecastChange = async ({ steps, alpha }: ForecastParameters) => {
    setForecastParameters({...forecastParameters, steps, alpha});

    const forecastResponse = await updateForecasts({steps, alpha});
    if (forecastResponse.success === false) {
      handleErrorResponse(forecastResponse);
      return;
    }
    
    updateChartData(forecastResponse.result);
  }

  const updateChartData = (forecastResults: ForecastResults): void => {
    const reshaped = reshapeRows(forecastResults);
    setForecastData(reshaped);
  }

  const handleRun = async () => {
    setIsRunning(true);
    await nextPaint(); // lets React commit and the browser paint (unneeded if move to worker?)
    try {
      await runForecast({csvInputs: modelFitInputs, ...forecastParameters});
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

  // Set inputs and store data for recall in data dropdown
  const handleCustomDataChange = ({filename, source, isString = true, delimiter, dateCol, targetCol, freq = 'MS'}: CsvCustomInputs) => {
    setCustomModelInputs({source, isString, delimiter, dateCol, targetCol, freq});
    setCustomCsvData({filename, source, isString, delimiter, dateCol, targetCol, freq});
    setSelectedSampleData('custom');
  };

  // Drops custom name to set model fit inputs
  const setCustomModelInputs = ({source, isString = true, delimiter, dateCol, targetCol, freq = 'MS'}: CsvLoadInputs) => {
    setModelFitInputs({source, isString, delimiter, dateCol, targetCol, freq});
  }

  function handleErrorResponse(error: ErrorMessage) {
    setModalErrorMessage(error);
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

        {activeErrorModal && !isLoading && !isRunning && modalErrorMessage &&
          <ErrorModal activeModal={activeErrorModal} setActiveModal={setActiveErrorModal} error={modalErrorMessage}/>
        }

        {/* Source Dataset */}
        <div className={`${activeSourceTab}`}>
          <div className="nav-tabs">
            <button
              className={`tab-btn ${activeSourceTab === 'sample-data' ? 'active' : ''}`}
              onClick={() => setActiveSourceTab('sample-data')}
              disabled={isRunning || isLoading}
            >
              Sample Data
            </button>
            <button
              className={`tab-btn ${activeSourceTab === 'custom-data' ? 'active' : ''}`}
              onClick={() => {
                if (customCsvData) {
                  setSelectedSampleData('custom');
                  setCustomModelInputs(customCsvData);
                };
                setActiveSourceTab('custom-data')
              }}
              disabled={isRunning || isLoading}              
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
                      const selectedValue = e.target.value as SampleDataKey;
                      setSelectedSampleData(selectedValue);
                      if (selectedValue === 'custom') {
                        if (!customCsvData) return;
                        setCustomModelInputs(customCsvData)
                      } else {
                        setModelFitInputs({source: `${selectedValue}.csv`, isString: false, dateCol: 'observation_date', targetCol: selectedValue, freq: SAMPLE_FREQ_MAP[selectedValue]});
                      }                  
                    }}
                  >
                    <option value='RSXFSN'>{SAMPLE_NAME_MAP['RSXFSN']}</option>
                    <option value='RSAFSNA'>{SAMPLE_NAME_MAP['RSAFSNA']}</option>
                    <option value='ECOMPCTNSA'>{SAMPLE_NAME_MAP['ECOMPCTNSA']}</option>
                    {customCsvData.filename.length > 0 && <option value='custom'>{SAMPLE_NAME_MAP['custom']}: {customCsvData.filename}</option>}
                  </select>
                </div>
              </div>
            </div>
            <div className='active-custom-data'>                  
              <CsvUploader csvInputs={customCsvData} onDataChange={handleCustomDataChange} onError={handleErrorResponse}/>
            </div>
            <div className={'actions'}>
              <div className={'field-group input-left'}>
                  <label className={'label'}>
                    <span>Current Forecast Dataset</span>
                  </label>
                  <div>
                    <span><b>{activeFileName}</b></span>
                  </div>
              </div>
              <button
                className={'primary-button'}
                onClick={handleRun}
                disabled={isForecastCurrent || !inputsValid || isRunning || isLoading}
              >
                {isRunning ? 'Running Forecast...'
                  : isForecastCurrent ? 'Up to date!' : 'Run Forecast'}
              </button>
            </div>
          </div>
        </div>

        <Metrics metrics={metrics} />

        {chartData && (
          <>
            <h2 className={'section-heading'}>Model Parameters</h2>
            <div className={'chart-card'}>
              <ControlPanel
                inputs={chartInputs}
                timeHorizonCards={timeHorizonCards}
                selectedModel={selectedModel}
                activeModel={activeModel}
                modelFailures={modelFailures}
                onModelChange={setSelectedModel}
                onHistoryChange={setSelectedPastPeriods}
                onForecastChange={handleForecastChange}
                isRunning={isRunning}
                isLoading={isLoading}
              />
            </div>
          </>
        )}
        
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
                title={`Demand Trajectory & 12-Month Forecast (${modelNameMap[activeModel]} model)`}
                chartData={chartData}
                dataHistorical={"historical"}
                dataForecast={"forecast"}
                name1={"Historical"}
                name2={"Forecast"}
                nameCI={`${roundNumber((1-forecastParameters.alpha)*100, 1)}% Confidence Band`}
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
                activeModel={activeModel}
                chartData={overlayData}
                nameCI={`${roundNumber((1-forecastParameters.alpha)*100, 1)}% CI`}
              />
            )}
          </div>
        </div>
      </div>
    </ErrorBoundary>
  );
}
