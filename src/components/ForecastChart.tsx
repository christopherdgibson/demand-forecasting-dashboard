import {
  ResponsiveContainer,
  Area,
  ComposedChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  RenderableText
} from 'recharts';

import { CustomLegend } from './CustomLegend';
import { CustomTooltip } from './CustomTooltip';

import '../App/styles.css';
import type { DemandProps, ForecastChartData } from '../types';

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

type SeriesKeys = 'historical' | 'forecast' | 'ci_range';

export function ForecastChart({ title = "Demand Trajectory & 12-Month Forecast",
  chartData, dataHistorical, dataForecast, name1, name2, nameCI = "95% Confidence Interval",
    formatType = "currency", xLabel, yLabel, controlPanel
}: ForecastChartProps) {
  if (chartData.length === 0) return null;

  const seriesOrder: SeriesKeys[] = ['historical', 'forecast', 'ci_range'];

  const colorMap: Record<SeriesKeys, string> = {
    historical: '#3b82f6',
    forecast: 'rgb(16, 185, 129)',
    ci_range: "rgba(16, 185, 129, 0.2)"
  }

  const nameMap: Record<SeriesKeys, string> = {
    historical: 'Historical',
    forecast: 'Forecast',
    ci_range: "95% Confidence Interval"
  }

  const legendPayload = seriesOrder.map((key: SeriesKeys) => ({
    value: key, // label text
    type: 'line',
    id: key,
    color: colorMap[key],
  }));

  return (
    <>
      {controlPanel}
      <h3 className={'chart-title'}>{title}</h3>
      <div className={'chart-container'}>
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
            <Tooltip
              wrapperStyle={{backgroundColor:'white', fontSize: '12px'}}
              content={(props) => CustomTooltip({props, seriesOrder, formatType})}
            />
            <Legend
              wrapperStyle={{ fontSize: '12px', bottom: '0px' }}
              content={
                <CustomLegend
                  seriesOrder={seriesOrder}
                  nameMap={nameMap}
                  colorMap={colorMap}
                />
              }
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
    </>
  );
}