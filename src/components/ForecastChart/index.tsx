import {
  ResponsiveContainer,
  Area,
  ComposedChart,
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
  dataHistorical: keyof DemandProps;
  dataForecast: keyof DemandProps;
  name1: string;
  name2: string;
  nameCI?: string;
  formatType?: string;
  xLabel: RenderableText;
  yLabel: RenderableText;
}

export function ForecastChart({ title = "Demand Trajectory & 12-Month Forecast",
  chartData, dataHistorical, dataForecast, name1, name2, nameCI = "95% Confidence Interval",
    formatType = "currency", xLabel, yLabel 
}: ForecastChartProps) {

  if (chartData.length === 0) return null;

  // console.log('combinedData: ', combinedData);

  const formattedData = chartData.map((item) => ({
        ...item,
        ci_range:
        item.ci_lower !== null && item.ci_upper !== null
        ? [item.ci_lower, item.ci_upper]
        : null,
    }));

  return (
    <div className={styles.card}>
      <h3 className={styles.title}>{title}</h3>
      
      <div className={styles.chartContainer}>
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={formattedData} margin={{ top: 10, right: 30, left: 10, bottom: 20 }}>
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

            {/* Shaded Confidence Interval Band */}
            <Area
              type="monotone"
              dataKey="ci_range"
              fill="#3b82f6"
              fillOpacity={0.5}
              stroke="none"
              name={nameCI}
              connectNulls={false}
            />

            <Line
              type="monotone"
              dataKey={dataHistorical}
              stroke="#3b82f6"
              strokeWidth={2}
              name={name1}
              dot={false}
            />
            <Line
              type="monotone"
              dataKey={dataForecast}
              stroke="#10b981"
              strokeWidth={2}
              name={name2}
              dot={false}
            />
          </ComposedChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}