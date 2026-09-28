import styles from './Controls.module.css';
import type { ForecastProps } from '../../types';

interface ControlsProps {
  inputs: ForecastProps;
  onChange: (updatedParams: ForecastProps) => void;
  onRunForecast: () => void;
  isRunning: boolean;
}

export default function Controls({inputs, onChange, onRunForecast, isRunning}: ControlsProps) {
  const handleInputsChange = <F extends keyof ForecastProps> (
    field: F,
    value: ForecastProps[F]
  ) => {
    onChange({
      ...inputs,
        [field]: value,
      });
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
          <input
            type="string"
            className={styles.input}
            min={0}
            value={inputs.file_path}
            disabled={isRunning}
            onChange={(e) => handleInputsChange('file_path', e.target.value)}
          />
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
            value={inputs.forecast_steps}
            disabled={isRunning}
            onChange={(e) => handleInputsChange('forecast_steps', Number(e.target.value))}
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
