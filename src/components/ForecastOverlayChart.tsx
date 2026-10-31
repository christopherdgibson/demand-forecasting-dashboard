import { JSX } from 'react';
import {
  ComposedChart,
  Line,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';

import { CustomLegend } from './CustomLegend';
import { CustomTooltip } from './CustomTooltip';

import '../App/styles.css';

import type { ColorEntry, ModelType, OverlayChartData } from '../types';

interface OverlayChartProps {
    controlPanel?: JSX.Element;
    modelType: ModelType;
    chartData: Array<OverlayChartData>;
    nameCI: string;
}

const seriesOrder = ['historical', 'forecast_ets', 'forecast_sarimax', 'forecast_theta'] as const;

type SeriesKeys = typeof seriesOrder[number] | 'ets_ci' | 'sarimax_ci' | 'theta_ci';

const activeForecast: Record<ModelType, SeriesKeys> = {
    ets: "forecast_ets",
    sarimax: "forecast_sarimax",
    theta: "forecast_theta"
}

const activeCI: Record<ModelType, SeriesKeys> = {
    ets: "ets_ci",
    sarimax: "sarimax_ci",
    theta: "theta_ci"
}

const colorMap: Record<SeriesKeys, ColorEntry> = {
    historical: {color: 'var(--brand)', opacity: 1},
    forecast_ets: {color: 'var(--accent)', opacity: 1},
    forecast_sarimax: {color: '#8b5cf6', opacity: 1},
    forecast_theta: {color: '#f59e0b', opacity: 1},
    ets_ci: {color: "var(--accent)", opacity: 0.4},
    sarimax_ci: {color:  '#8b5cf6', opacity: 0.4},
    theta_ci: {color: '#f59e0b', opacity: 0.4}
}

export function ForecastOverlayChart({ controlPanel, modelType, chartData, nameCI }: OverlayChartProps) {
    if (!chartData || chartData.length === 0) return null;
    const seriesOrderActive = [...seriesOrder, activeCI[modelType]];
    const nameMap: Record<SeriesKeys, string> = {
        historical: 'Historical',
        forecast_ets: 'Forecast ETS',
        forecast_sarimax: 'Forecast Sarimax',
        forecast_theta: 'Forecast Theta',
        ets_ci: `ETS ${nameCI}`,
        sarimax_ci: `Sarimax ${nameCI}`,
        theta_ci: `Theta ${nameCI}`
    }

    return (
        <div className={'chart-card'}>
            {controlPanel}          
            <h3 className={'chart-title'}>Demand Forecast Overlay</h3>
            <div className={'chart-container'}>
                <ResponsiveContainer width="100%" height="100%">
                    <ComposedChart data={chartData} margin={{ top: 10, right: 30, left: 10, bottom: 20 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                        <XAxis dataKey="date" tick={{ fontSize: 12, fill: 'var(--text-muted)' }} stroke="var(--border)"
                            label={{ 
                            value: "Date",
                            position: 'insideBottom', 
                            offset: -12, 
                            fill: 'var(--text-body)',
                            fontSize: 12, 
                            fontWeight: 500 
                        }}
                        />
                        <YAxis domain={['auto', 'auto']} tick={{ fontSize: 12, fill: 'var(--text-muted)' }} stroke="var(--border)"
                            label={{ 
                            value: "Demand", 
                            angle: -90, 
                            position: 'insideLeft', 
                            offset: 0, 
                            fill: 'var(--text-body)', 
                            fontSize: 12, 
                            fontWeight: 500 
                        }}/>
                        
                        <Tooltip
                            wrapperStyle={{backgroundColor:'white', fontSize: '12px'}}
                            content={(props) => CustomTooltip({props, seriesOrder: seriesOrderActive, formatType: 'currency'})}
                        />
                        <Legend
                            wrapperStyle={{ fontSize: '12px', bottom: '0px' }}
                            content={
                                <CustomLegend
                                    seriesOrder={seriesOrderActive}
                                    nameMap={nameMap}
                                    colorMap={colorMap}
                                    activeForecast={activeForecast[modelType]}
                                />
                            }
                        />

                        {/* Historical Data */}
                        <Line
                            type="monotone"
                            dataKey="historical"
                            stroke={colorMap['historical'].color}
                            strokeWidth={2}
                            name="Historical Sales"
                            dot={false}
                            connectNulls={false}
                        />

                        {/* ETS Forecast */}
                        {modelType === 'ets' &&
                            <Area
                                type="monotone"
                                dataKey="ets_ci"
                                fill={colorMap['forecast_ets'].color}
                                fillOpacity={0.1}
                                stroke="none"
                                name={nameMap['ets_ci']}
                            />
                        }
                        {modelType === 'sarimax' &&
                            <Area
                                type="monotone"
                                dataKey="sarimax_ci"
                                fill={colorMap['forecast_sarimax'].color}
                                fillOpacity={0.1}
                                stroke="none"
                                name={nameMap['sarimax_ci']}
                            />
                        }
                        {modelType === 'theta' &&
                            <Area
                                type="monotone"
                                dataKey="theta_ci"
                                fill={colorMap['forecast_theta'].color}
                                fillOpacity={0.1}
                                stroke="none"
                                name={nameMap['theta_ci']}
                            />
                        }
                        <Line
                            type="monotone"
                            dataKey="forecast_ets"
                            stroke={colorMap['forecast_ets'].color}
                            strokeWidth={modelType === 'ets' ? 2 : 1}
                            strokeDasharray={modelType === 'ets' ? 0 : 4}
                            name="ETS Forecast"
                            dot={false}
                            connectNulls={false}
                        />

                        {/* SARIMAX Forecast */}
                        <Line
                            type="monotone"
                            dataKey="forecast_sarimax"
                            stroke={colorMap['forecast_sarimax'].color}
                            strokeWidth={modelType === 'sarimax' ? 2 : 1}
                            strokeDasharray={modelType === 'sarimax' ? 0 : 4}
                            name="SARIMAX Forecast"
                            dot={false}
                            connectNulls={false}
                        />

                        {/* Theta Forecast */}
                        <Line
                            type="monotone"
                            dataKey="forecast_theta"
                            stroke={colorMap['forecast_theta'].color}
                            strokeWidth={modelType === 'theta' ? 2 : 1}
                            strokeDasharray={modelType === 'theta' ? 0 : 4}
                            name="Theta Forecast"
                            dot={false}
                            connectNulls={false}
                        />
                    </ComposedChart>
                </ResponsiveContainer>
            </div>
        </div>
    );
}