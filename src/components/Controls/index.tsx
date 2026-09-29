import styles from './Controls.module.css';
import type { ForecastProps } from '../../types';

interface ControlsProps {
  inputs: ForecastProps;
  onDatasetChange: (updatedParams: ForecastProps) => void;
  onForecastChange: (updatedParams: ForecastProps) => void;
  onRunForecast: () => void;
  isRunning: boolean;
}

export default function Controls({inputs, onDatasetChange, onForecastChange, onRunForecast, isRunning}: ControlsProps) {
  const handleInputsChange = <F extends keyof ForecastProps> (
    field: F,
    value: ForecastProps[F],
    minValue?: number
  ) => {
    if (field == "filepath") {
      onDatasetChange({
      ...inputs,
        [field]: value,
      });
    } else {
      if (minValue && typeof(value) == 'number' && value < minValue){
        return;
      }
      onForecastChange({
        ...inputs,
          [field]: value,
        });
    }
  };

  return (
    <div className={styles.controlsCard}>
      <div className={styles.header}>
        <h2 className={styles.title}>Model Parameters</h2>
        <span className={styles.badge}>Demand Forecast</span>
      </div>
      <h3 className={styles.subTitle}>Forecast Parameters</h3>
      <div className={styles.grid}>
        {/* Data Source*/}
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

        {/* Forecast Steps */}
        <div className={styles.fieldGroup}>
          <label className={styles.label}>
            <span>Forecast Steps</span>
            <span className={styles.hint}>Time Horizon</span>
          </label>
          <input
            type="number"
            className={styles.input}
            min={1}
            value={inputs.forecast_steps}
            disabled={isRunning}
            onChange={(e) => handleInputsChange('forecast_steps', Number(e.target.value), 1)}
          />
        </div>
      </div>

      <div className={styles.actions}>
        <button
          className={styles.primaryButton}
          onClick={onRunForecast}
          disabled={isRunning}
        >
          {isRunning ? 'Running Forecast...' : 'Run Forecast'}
        </button>
      </div>
    </div>
  );
};
