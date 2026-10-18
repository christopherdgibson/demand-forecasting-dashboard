import {
  ResponsiveContainer,
  Area,
  ComposedChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  TooltipContentProps,
  Legend,
  RenderableText
} from 'recharts';

import type { ValueType, NameType } from 'recharts/types/component/DefaultTooltipContent';
import { formatCurrencyValue } from '../../utils/currencyUtils';

import type { DemandProps, ForecastChartData } from '../../types';
import styles from './ForecastChart.module.css';

interface ForecastChartProps {
  controlPanel?: any;
  chartData: Array<ForecastChartData>;
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
    formatType = "currency", xLabel, yLabel, controlPanel
}: ForecastChartProps) {

  if (chartData.length === 0) return null;

  type SeriesKeys = 'historical' | 'forecast' | 'ci_range';
  const seriesOrder: SeriesKeys[] = ['historical', 'forecast', 'ci_range'];

  const colorMap: Record<SeriesKeys, string> = {
    historical: '#3b82f6',
    forecast: '#10b981',
    'ci_range': "#3b82f6"
  }

  const nameMap: Record<SeriesKeys, string> = {
    historical: 'Historical',
    forecast: 'Forecast',
    'ci_range': "95% Confidence Interval"
  }

  const legendPayload = seriesOrder.map((key: SeriesKeys) => ({
    value: key, // label text
    type: 'line',
    id: key,
    color: colorMap[key],
  }));

  function CustomLegend() {
    return (
      <ul style={{ display: 'flex', gap: '12px', fontSize: '12px', padding: 0, listStyle: 'none', justifyContent: 'center' }}>
        {seriesOrder.map((key) => (
          <li key={key} style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
            <span style={{ width: 10, height: 10, backgroundColor: colorMap[key], display: 'inline-block' }} />
            {nameMap[key]}
          </li>
        ))}
      </ul>
    );
  }

  function CustomTooltip(props: TooltipContentProps<ValueType, NameType>) {
    const { active, payload, label } = props;

    if (!active || !payload?.length) return null;

    const sorted = [...payload].sort(
      (a, b) =>
        seriesOrder.indexOf(a.dataKey as SeriesKeys) -
        seriesOrder.indexOf(b.dataKey as SeriesKeys)
    );

    return (
      <div className={styles.tooltip}>
        <p>{label}</p>
        {sorted.map((entry) => (
          <p key={entry.name} style={{ color: entry.color }}>
            {entry.name}:{' '}
            {Array.isArray(entry.value)
              ? entry.value[0] === undefined
                ? 'N/A'
                : formatType === 'currency'
                  ? `${formatCurrencyValue(entry.value[0])} - ${formatCurrencyValue(entry.value[1])}`
                  : `${entry.value[0]} - ${entry.value[1]}`
              :
                typeof entry.value === 'number'
                ? formatType === 'currency'
                  ? formatCurrencyValue(entry.value)
                  : entry.value
                : ''
            }
          </p>
        ))}
      </div>
    );
  }

  return (
    <div className={styles.chartCard}>
      {controlPanel}
      <h3 className={styles.title}>{title}</h3>
      <div className={styles.chartContainer}>
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={chartData} margin={{ top: 10, right: 30, left: 10, bottom: 20 }}>
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
            <Tooltip content={CustomTooltip} />
            <Legend
              content={<CustomLegend />} 
              wrapperStyle={{ fontSize: '12px', bottom: '0px' }}
            />

            {/* Shaded Confidence Interval Band */}
            <Area
              type="monotone"
              dataKey="ci_range"
              fill="#10b981"
              fillOpacity={0.1}
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