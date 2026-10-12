import '../App/styles.css';
import type { ModelMetrics } from '../types';

interface MetricsCardProps {
  metrics: ModelMetrics | null;
}

export function MetricsCard({ metrics }: MetricsCardProps) {
  if (!metrics) return null;

  return (
    <div className={'metrics-grid'}>
      <div className={'metrics-card'}>
        <span className={'metrics-label'}>AIC (Model Fit)</span>
        <span className={'metrics-value'}>{metrics.aic}</span>
      </div>
      <div className={'metrics-card'}>
        <span className={'metrics-label'}>BIC (Complexity)</span>
        <span className={'metrics-value'}>{metrics.bic}</span>
      </div>
      <div className={'metrics-card'}>
        <span className={'metrics-label'}>MAPE (Error %)</span>
        <span className={'metrics-value'}>{metrics.mape}%</span>
      </div>
      <div className={'metrics-card'}>
        <span className={'metrics-label'}>RMSE (Root Mean Sq)</span>
        <span className={'metrics-value'}>{metrics.rmse}</span>
      </div>
    </div>
  );
}
