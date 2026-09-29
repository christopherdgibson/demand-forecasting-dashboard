import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  RenderableText,
  ReferenceLine
} from 'recharts';

import { useMemo } from 'react';

import type { DemandProps } from '../../types';
import styles from './ForecastChart.module.css';

import { combineHistoricalAndForecast } from '../../utils/timeseriesUtils';

interface ForecastChartProps {
  chartData: Array<DemandProps>;
  title?: string;
  dataKey1: keyof DemandProps;
  dataKey2: keyof DemandProps;
  name1: string;
  name2: string;
  formatType?: string;
  xLabel: RenderableText;
  yLabel: RenderableText;
}

export function ForecastChart({ title = "Demand Trajectory & 12-Month Forecast",
  chartData, dataKey1, dataKey2, name1, name2, 
    formatType = "currency", xLabel, yLabel 
}: ForecastChartProps) {

  if (chartData.length === 0) return null;

  // console.log('combinedData: ', combinedData);

  return (
    <div className={styles.card}>
      <h3 className={styles.title}>{title}</h3>
      
      <div className={styles.chartContainer}>
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={chartData} margin={{ top: 10, right: 30, left: 10, bottom: 20 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
            <XAxis
              dataKey="date"
              tick={{ fontSize: 12, fill: '#64748b' }}
              label={{ 
                value: xLabel,
                position: 'insideBottom', 
                offset: -12, 
                fill: '#475569', 
                fontSize: 12, 
                fontWeight: 500 
              }}
            />
            <YAxis
              domain={['auto', 'auto']}
              tick={{ fontSize: 12, fill: '#64748b' }}
              label={{ 
                value: yLabel, 
                angle: -90, 
                position: 'insideLeft', 
                offset: 0, 
                fill: '#475569', 
                fontSize: 12, 
                fontWeight: 500 
              }}
            />
            <Tooltip
              wrapperClassName={styles.tooltip}
              formatter={(value) => [
                (typeof value === 'number')
                  ? (formatType === 'currency' ? `€${value.toFixed(2)}` : value)
                  : '',
                ''
              ]}
            />
            <Legend wrapperStyle={{ fontSize: '12px', bottom: '0px' }} />

            <Line
              type="monotone"
              dataKey={dataKey1}
              stroke="#3b82f6"
              strokeWidth={2}
              name={name1}
              dot={false}
            />
            <Line
              type="monotone"
              dataKey={dataKey2}
              stroke="#10b981"
              strokeWidth={2}
              name={name2}
              dot={false}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}