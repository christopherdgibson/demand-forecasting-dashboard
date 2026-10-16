import { useEffect, useState } from 'react';

import styles from './Controls.module.css';
import type {CardInputs, ControlsBase, ForecastInputs, ForecastProps, ModelType } from '../../types';

type ForecastControlKeys = keyof ForecastInputs;

interface ControlsProps extends ControlsBase {
  inputs: ForecastProps;
  modelType: ModelType;
  onModelChange: (updatedParams: ModelType) => void;
  onDatasetChange?: (updatedParams: ForecastProps) => void;
  onForecastChange: (updatedParams: ForecastProps) => void;
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

export function ControlCard<T extends keyof ForecastProps>({card, inputKey, value, updateConfig, isRunning, isLoading}: ControlCardProps<T>) {
    const [localValue, setLocalValue] = useState<string>(String(value));

    // Sync local state if parent value changes externally
    useEffect(() => {
        setLocalValue(String(value));
    }, [value]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const rawText = e.target.value;
        setLocalValue(rawText);

        const numVal = parseFloat(rawText);
        if (isNaN(numVal)) {
          return;
        }
    };

    const handleBlur = () => {
        const numVal = parseFloat(localValue);
        
        if (isNaN(numVal) || (card.min !== undefined && numVal < card.min) || (card.max !== undefined && numVal > card.max)) {
          // On blur, if out of bounds, snap it back to the last valid value
          setLocalValue(String(value));
        } else {
          updateConfig(inputKey, numVal);
        }
    };

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
                onBlur={handleBlur}
            />
        </>
    );
}

export function Controls({inputs, modelType, onModelChange, onDatasetChange, onForecastChange, onRunForecast, badgeLabel = "Demand Forecast", stepLabel = "Forecast Steps", isRunning, isLoading}: ControlsProps) {
  const inputKeys: ForecastControlKeys[] = ['alpha', 'steps'];
  const stepSize = 0.1;
  const cards: Record<keyof ForecastInputs, CardInputs> = {
    steps: {
      title: "Forecast Horizon",
      hint: "Predicted Periods",
      min: 1,
      step: 1,
    },
    alpha: {
      title: 'Confidence Interval (α)',
      hint: "0.01 - 1.0",
      min: 0.01,
      max: 1,
      step: 0.01,
    }
  };

  const handleInputsChange = <F extends keyof ForecastProps> (
    field: F,
    value: ForecastProps[F],
    minValue?: number
  ) => {
    if (field == "filepath" && onDatasetChange) {
      onDatasetChange({
      ...inputs,
        [field]: value,
      });
    } else {
      if (minValue !== undefined && typeof(value) == 'number' && value < minValue){
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
        { inputs.filepath &&
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
