import { formatNumber, formatPercentage } from '../utils/numberUtils';

import '../App/styles.css';
import type { ModelMetrics } from '../types';

interface MetricsCardProps {
  metrics: ModelMetrics | null;
}

export function Metrics({ metrics }: MetricsCardProps) {
  if (!metrics) return null;

  return (
    <div className={'metrics-container'}>
      <h2 className={'section-heading'}>Model Fit Metrics</h2>
      <MetricsCard metrics={metrics}/>
    </div>
  );
}


function MetricsCard({ metrics }: MetricsCardProps) {
  if (!metrics) return null;
  // if (!metrics) {
  //   metrics = {
  //     aic: null,
  //     bic: null,
  //     mape: null,
  //     rmse: null
  //   }
  // }

  return (
    <div className={'metrics-grid'}>
      <div className={'metrics-card'}>
        <span className={'metrics-label'}>AIC (Model Fit)</span>
        <span className={'metrics-value'}>{formatNumber(metrics.aic) ?? '-'}</span>
      </div>
      <div className={'metrics-card'}>
        <span className={'metrics-label'}>BIC (Complexity)</span>
        <span className={'metrics-value'}>{formatNumber(metrics.bic) ?? '-'}</span>
      </div>
      <div className={'metrics-card'}>
        <span className={'metrics-label'}>MAPE (Error %)</span>
        <span className={'metrics-value'}>{formatPercentage(metrics.mape) ?? '-'}</span>
      </div>
      <div className={'metrics-card'}>
        <span className={'metrics-label'}>RMSE (Root Mean Sq)</span>
        <span className={'metrics-value'}>{formatNumber(metrics.rmse) ?? '-'}</span>
      </div>
    </div>
  );
}
