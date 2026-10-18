import { useEffect, useRef, useState } from 'react';

import styles from './Controls.module.css';
import type {CardInputs, ControlsBase, ForecastChartInputs, ModelType } from '../../types';

type ForecastHorizonKeys = Exclude<keyof ForecastChartInputs, 'alpha' | 'filepath'>;

interface ControlsProps extends ControlsBase {
  inputs: ForecastChartInputs;
  modelType: ModelType;
  onModelChange: (updatedParams: ModelType) => void;
  onHistoryChange: (newPeriods: number) => void;
  onDatasetChange?: (updatedParams: ForecastChartInputs) => void;
  onForecastChange: (updatedParams: ForecastChartInputs) => void;
  onRunForecast?: () => void;
  badgeLabel?: string;
  stepLabel?: string;
}

interface ControlCardProps<T> extends ControlsBase {
  inputKey: T;
  value: number | undefined;
  card: CardInputs;
  updateConfig: (field: T, value: number, minValue?: number, maxValue?: number) => void;
}

export function ControlCard<T extends keyof ForecastChartInputs>({card, inputKey, value, updateConfig, isRunning, isLoading}: ControlCardProps<T>) {
    const timeoutRef = useRef<NodeJS.Timeout | null>(null);
    const [isFocused, setIsFocused] = useState<boolean>(false);
    const [localValue, setLocalValue] = useState<string>(String(value));

    // Clean up timer if component unmounts
    useEffect(() => {
        return () => {
            if (timeoutRef.current) clearTimeout(timeoutRef.current);
        };
    }, []);

    // Sync local state if parent value changes externally
    useEffect(() => {
        setLocalValue(String(value));
    }, [value]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const rawText = e.target.value;
      setLocalValue(rawText);

      const numVal = parseFloat(rawText);

      if (isInvalid(numVal)) {
        // Postpone validate to blur if focused
        if (isFocused) {
          return;
        // Resolve immediately if unfocused (e.g., arrow inputs)
        } else {
          resolveInvalid(numVal);
        return;
        }
      }      
      
      scheduleChange(numVal);
    };

    const handleBlur = () => {
      setIsFocused(false)
      const numVal = parseFloat(localValue);
        
      safeSetValue(numVal);
    };

    const handleFocus = () => {
      setIsFocused(true)
    };

    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === 'Enter') {
        e.currentTarget.blur();
      }
    };

    const scheduleChange = (value: number) => {
      // Clear any existing active timer immediately
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }

      timeoutRef.current = setTimeout(() => {
        safeSetValue(value);
        timeoutRef.current = null;
      }, 400);
    };

    const safeSetValue = (input: number) => {
      if (isInvalid(input)) {

        // On blur, if out of bounds, snap it back to the last valid value
        setLocalValue(String(value));
      } else {
        updateConfig(inputKey, input);
      }
    };

    const isInvalid = (input: number): boolean => {
      return (isNaN(input) || (card.min !== undefined && input < card.min) || (card.max !== undefined && input > card.max))
    }

    const resolveInvalid = (input: number): void => {
      if (isNaN(input)) setLocalValue(String(value));
      
      if (card.min !== undefined && input < card.min) setLocalValue(String(card.min));
      
      if (card.max !== undefined && input > card.max) setLocalValue(String(card.max));
    }

    return (
      <>
        <label className={styles.label}>
          <span>{card.title}</span>
          <span className={styles.hint}>{card.hint}</span>
        </label>
        <input
          type="number"
          className={styles.input}
          step={card.step}
          value={localValue}
          disabled={isRunning || isLoading}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          onBlur={handleBlur}
          onFocus={handleFocus}
        />
      </>
    );
}

export function Controls({inputs, modelType, onModelChange, onHistoryChange, onDatasetChange, onForecastChange, onRunForecast, badgeLabel = "Demand Forecast", stepLabel = "Forecast Steps", isRunning, isLoading}: ControlsProps) {
  const inputKeys: ForecastHorizonKeys[] = ['history', 'steps'];
  const cards: Record<ForecastHorizonKeys, CardInputs> = {
    history: {
      title: "Historic Horizon",
      hint: "Previous Periods",
      min: 1,
      // max: inputs.
      step: 1,
    },
    steps: {
      title: "Prediction Horizon",
      hint: "Forecast Periods",
      min: 1,
      step: 1,
    }
  };

  const alphaCard = {
    title: 'Confidence Interval (α)',
    hint: "0.01 - 1.0",
    min: 0.01,
    max: 1,
    step: 0.01
  }

  const handleInputsChange = <F extends keyof ForecastChartInputs> (
    field: F,
    value: ForecastChartInputs[F],
    minValue?: number
  ) => {
    if (field == "filepath" && onDatasetChange) {
      onDatasetChange({
      ...inputs,
        [field]: value,
      });
    } else if (field == 'history') {
      if (minValue !== undefined && typeof(value) == 'number' && value < minValue) {
        return;
      }
      onHistoryChange(Number(value))
    } else {
      if (minValue !== undefined && typeof(value) == 'number' && value < minValue) {
        return;
      }
      onForecastChange({
        ...inputs,
          [field]: value,
        });
    }
  };

  return (
    // <div className={styles.controlsCard}>
    <>
      <div className={styles.header}>
        <h2 className={styles.title}>Model Parameters</h2>
        <span className={styles.badge}>{badgeLabel}</span>
      </div>
      <h3 className={styles.subTitle}>Forecast Parameters</h3>
      <div className={styles.grid}>
        {/* Data Source*/}
        {inputs.filepath &&
          <div className={styles.fieldGroup}>
            <label className={styles.label}>
              <span>Data Source</span>
              <span className={styles.hint}>Input Dataset</span>
            </label>
            <select
              className={styles.input}
              value={inputs.filepath}
              // disabled={isRunning || isLoading}
              disabled={true}
              onChange={(e) => handleInputsChange('filepath', e.target.value)}
            >
              <option value="RSXFSN.csv">FRED Retail Data</option>
              <option value="option2">Option 2</option>
              <option value="option3">Option 3</option>
            </select>
          </div>
        }

        {/* Forecast Type */}
        <div className={styles.fieldGroup}>
          <label className={styles.label}>
            <span>Demand Model</span>
            <span className={styles.hint}>Forecast Model</span>
          </label>
          <select
            className={styles.input}
            value={modelType}
            disabled={isRunning || isLoading}
            onChange={(e) => onModelChange(e.target.value as ModelType)}
          >
            <option value="ets">ETS</option>
            <option value="sarimax">SARIMAX</option>
            <option value="theta">Theta</option>
          </select>
        </div>

        {/* Confidence Interval */}
        <div className={styles.fieldGroup}>
            <ControlCard
                card={alphaCard}
                inputKey={'alpha'}
                value={inputs.alpha}
                updateConfig={handleInputsChange}
                isRunning={isRunning}
                isLoading={isLoading}
            />
        </div>
      </div>

      <h3 className={styles.subTitle}>Time Horizon Parameters</h3>
      <div className={styles.grid}>
        {inputKeys.map((inputKey) => {
            const card = cards[inputKey];
            const rawValue = inputs[inputKey];

            if (!card || typeof rawValue !== 'number') {
                return null;
            }

            return (
                <div key={String(inputKey)} className={styles.fieldGroup}>
                    <ControlCard
                        card={card}
                        inputKey={inputKey}
                        value={rawValue}
                        updateConfig={handleInputsChange}
                        isRunning={isRunning}
                        isLoading={isLoading}
                    />
                </div>
            );
        })}
      </div>

      {inputs.filepath &&

        <div className={styles.actions}>
          <button
            className={styles.primaryButton}
            onClick={onRunForecast}
            disabled={isRunning || isLoading}
          >
            {isRunning ? 'Running Forecast...' : 'Run Forecast'}
          </button>
        </div>
      }
    {/* </div> */}
    </>
  );
};
