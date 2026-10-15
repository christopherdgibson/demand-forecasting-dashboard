import { useEffect, useState } from 'react';
import { roundNumber } from '../../utils/numberUtils';

import styles from './Controls.module.css';
import type {CardInputs, ControlsBase, ForecastProps, ModelType } from '../../types';

interface ControlsProps {
  inputs: ForecastProps;
  modelType: ModelType;
  onModelChange: (updatedParams: ModelType) => void;
  onDatasetChange?: (updatedParams: ForecastProps) => void;
  onForecastChange: (updatedParams: ForecastProps) => void;
  onRunForecast?: () => void;
  badgeLabel?: string;
  stepLabel?: string;
  isRunning: boolean;
}

interface ControlCardProps<T> extends ControlsBase {
  inputKey: T;
  value: number | undefined;
  card: CardInputs;
  updateDemandConfig: (field: T, value: number, minValue?: number, maxValue?: number) => void;
  boundsCallbacks?: {minCallback: (field: T) => boolean, maxCallback: (field: T) => boolean};
  triggerFlag?: () => void;
}

interface BoundsViolationProps<T> {
    card: CardInputs;
    field: T;
    value: number;
    boundsCallbacks?: {minCallback?: (field: T) => boolean, maxCallback?: (field: T) => boolean};
    triggerFlag?: () => void;
}

function checkBoundsViolation<T>({card, field, value, boundsCallbacks, triggerFlag}: BoundsViolationProps<T>): boolean {
    if (card.min !== undefined && roundNumber(value, 1) < roundNumber(card.min, 1)) {
        if (boundsCallbacks && boundsCallbacks.minCallback && boundsCallbacks.minCallback(field) == true&& triggerFlag) {
            triggerFlag();
        }
        return true;
    }

    if (card.max !== undefined && roundNumber(value, 1) > roundNumber(card.max, 1)) {
        if (boundsCallbacks && boundsCallbacks.maxCallback && boundsCallbacks.maxCallback(field) == true && triggerFlag) {
            triggerFlag();
        }
        return true;
    }

    return false;
};

export function ControlCard<T,>({card, inputKey, value, updateDemandConfig, boundsCallbacks, triggerFlag, isRunning}: ControlCardProps<T>) {
    const [localValue, setLocalValue] = useState<string>(String(value));

    // Sync local state if parent value changes externally
    useEffect(() => {
        setLocalValue(String(value));
    }, [value]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const rawText = e.target.value;
        setLocalValue(rawText);

        const numVal = parseFloat(rawText);
        if (isNaN(numVal)) return;

        if (checkBoundsViolation({card, field: inputKey, value: numVal, boundsCallbacks, triggerFlag}) === true) {
            setLocalValue(String(value)); // Revert input display to safe value
        } else {
            updateDemandConfig(inputKey, numVal); // Valid input, update parent state normally
        }
    };

    const handleBlur = () => {
        const numVal = parseFloat(localValue);
        // On blur, if out of bounds, snap it back to the last valid value
        if (isNaN(numVal) || (card.min !== undefined && numVal < card.min) || (card.max !== undefined && numVal > card.max)) {
        setLocalValue(String(value));
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
                disabled={isRunning}
                onChange={handleChange}
                onBlur={handleBlur}
            />
        </>
    );
}

export function Controls({inputs, modelType, onModelChange, onDatasetChange, onForecastChange, onRunForecast, badgeLabel = "Demand Forecast", stepLabel = "Forecast Steps", isRunning}: ControlsProps) {
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
              // disabled={isRunning}
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
            disabled={isRunning}
            onChange={(e) => onModelChange(e.target.value as ModelType)}
          >
            <option value="ets">ETS</option>
            <option value="sarimax">SARIMAX</option>
            <option value="theta">Theta</option>
          </select>
        </div>

        {/* Forecast Steps */}
        { inputs.steps &&
          <div className={styles.fieldGroup}>
            <label className={styles.label}>
              <span>{stepLabel}</span>
              <span className={styles.hint}>Time Horizon</span>
            </label>
            <input
              type="number"
              className={styles.input}
              min={1}
              value={inputs.steps}
              disabled={isRunning}
              onChange={(e) => handleInputsChange('steps', Number(e.target.value), 1)}
            />
          </div>
        }
        {/* Confidence Interval */}
        <div className={styles.fieldGroup}>
          <label className={styles.label}>
            <span>Confidence Interval (&alpha;)</span>
            <span className={styles.hint}>0.001 - 1.0</span>
          </label>
          <input
            type="number"
            className={styles.input}
            min={0.01}
            max={1.0}
            step={0.01}
            value={inputs.alpha}
            disabled={isRunning}
            onChange={(e) => handleInputsChange('alpha', Number(e.target.value), 0)}
          />
        </div>
      </div>

      {inputs.filepath &&

        <div className={styles.actions}>
          <button
            className={styles.primaryButton}
            onClick={onRunForecast}
            disabled={isRunning}
          >
            {isRunning ? 'Running Forecast...' : 'Run Forecast'}
          </button>
        </div>
      }
    {/* </div> */}
    </>
  );
};
