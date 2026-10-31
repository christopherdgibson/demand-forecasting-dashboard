import { useEffect, useRef, useState } from 'react';

import '../App/styles.css';
import type {CardInputs, ControlsBase, ForecastChartInputs, ForecastHorizonKeys, ModelType } from '../types';

interface ControlsProps extends ControlsBase {
  inputs: ForecastChartInputs;
  timeHorizonCards: Record<ForecastHorizonKeys, CardInputs>;
  modelType: ModelType;
  onModelChange: (updatedParams: ModelType) => void;
  onHistoryChange: (newPeriods: number) => void;
  onForecastChange: (updatedParams: ForecastChartInputs) => void;
  badgeLabel?: string;
  stepLabel?: string;
}

interface ControlCardProps<T> extends ControlsBase {
  inputKey: T;
  value: number | undefined;
  card: CardInputs;
  updateConfig: (field: T, value: number, minValue?: number, maxValue?: number) => void;
}

function ControlCard<T extends keyof ForecastChartInputs>({card, inputKey, value, updateConfig, isRunning, isLoading}: ControlCardProps<T>) {
    const timeoutRef = useRef<NodeJS.Timeout | null>(null);
    const [isFocused, setIsFocused] = useState<boolean>(false);
    const [localValue, setLocalValue] = useState<string>(String(value));

    // Clean up timer if component unmounts
    useEffect(() => {
      return () => {
        tryClearTimer();
      };
    }, []);

    // Sync local state if parent value changes externally
    useEffect(() => {
      setLocalValue(String(value));
    }, [value]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => { //TODO: Updated data should truncate max automatically if applicable
      const rawText = e.target.value;
      setLocalValue(rawText);

      const numVal = parseFloat(rawText);

      if (isInvalid(numVal)) {
        tryClearTimer();
        // Postpone validate to blur if focused
        if (isFocused) {
          return;
        // Resolve immediately if unfocused (e.g., arrow inputs)
        } else {
          safeSetValue(numVal);
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

    const isInvalid = (input: number): boolean => {
      return (isNaN(input) || (card.min !== undefined && input < card.min) || (card.max !== undefined && input > card.max))
    }

    const safeSetValue = (input: number): void => {
      if (isNaN(input)) {
        setLocalValue(String(value));
        return;
      }
      
      let validVal = input;
      if (card.min !== undefined && input < card.min) {
        validVal = card.min;
      } else if (card.max !== undefined && input > card.max) {
         validVal = card.max;
      }

      setLocalValue(String(validVal));
      updateConfig(inputKey, validVal);
    };

    const tryClearTimer = () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    }

    return (
      <>
        <label className={'label'}>
          <span>{card.title}</span>
          <span className={'hint'}>{card.hint}</span>
        </label>
        <input
          type="number"
          className={'input'}
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

export function ControlPanel({inputs, timeHorizonCards, modelType, onModelChange, onHistoryChange, onForecastChange, badgeLabel = "Demand Forecast", stepLabel = "Forecast Steps", isRunning, isLoading}: ControlsProps) {
  const inputKeys: ForecastHorizonKeys[] = ['history', 'steps'];

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
    if (field == 'history') {
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
    <>
      <div className={'controls-header'}>
        <h2 className={'controls-title'}>Model Parameters</h2>
        <span className={'badge'}>{badgeLabel}</span>
      </div>
      <h3 className={'controls-subTitle'}>Forecast Parameters</h3>
      <div className={'controls-grid'}>

        {/* Forecast Type */}
        <div className={'field-group'}>
          <label className={'label'}>
            <span>Demand Model</span>
            <span className={'hint'}>Forecast Model</span>
          </label>
          <select
            className={'input dropdown'}
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
        <div className={'field-group'}>
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

      <h3 className={'controls-subTitle'}>Time Horizon Parameters</h3>
      <div className={'controls-grid'}>
        {inputKeys.map((inputKey) => {
            const card = timeHorizonCards[inputKey];
            const rawValue = inputs[inputKey];

            if (!card || typeof rawValue !== 'number') {
                return null;
            }

            return (
                <div key={String(inputKey)} className={'field-group'}>
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
    </>
  );
};
