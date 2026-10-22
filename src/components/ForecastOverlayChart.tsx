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

import { Controls} from '../components/Controls';
import { roundNumber } from '../utils/numberUtils';
import { CustomLegend } from './CustomLegend';
import { CustomTooltip } from './CustomTooltip';

import chartStyles from './ForecastChart/ForecastChart.module.css'

import type { ForecastChartInputs, ModelType, OverlayChartData } from '../types';

interface OverlayChartProps {
    inputs: ForecastChartInputs;
    modelType: ModelType;
    chartData: Array<OverlayChartData>;
    onForecastChange: (updatedParams: ForecastChartInputs) => void;
    onModelChange: (updatedParams: ModelType) => void;
    onHistoryChange: (newPeriods: number) => void;
    isRunning: boolean;
}

type SeriesKeys = 'historical' | 'forecast_ets' | 'forecast_sarimax' | 'forecast_theta' | 'ets_ci' | 'sarimax_ci' | 'theta_ci';

const seriesOrder: SeriesKeys[] = ['historical', 'forecast_ets', 'forecast_sarimax', 'forecast_theta'];

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

const colorMap: Record<SeriesKeys, string> = {
    historical: '#3b82f6',
    forecast_ets: '#10b981',
    forecast_sarimax: '#8b5cf6',
    forecast_theta: '#f59e0b',
    ets_ci: "rgba(16, 185, 129, 0.2)",
    sarimax_ci: "rgba(139, 92, 246, 0.3)",
    theta_ci: "rgba(245, 158, 11, 0.3)"
}

const nameMap: Record<SeriesKeys, string> = {
    historical: 'Historical',
    forecast_ets: 'Forecast ETS',
    forecast_sarimax: 'Forecast Sarimax',
    forecast_theta: 'Forecast Theta',
    ets_ci: "ETS 95% CI",
    sarimax_ci: "Sarimax 95% CI",
    theta_ci: "Theta 95% CI"
}

export function ForecastOverlayChart({ inputs, modelType, chartData, onForecastChange, onModelChange, onHistoryChange, isRunning }: OverlayChartProps) {
    if (!chartData || chartData.length === 0) return null;
    const CILabel = `${roundNumber((1-inputs.alpha)*100, 1)}% CI`;
    const seriesOrderActive = [...seriesOrder, activeCI[modelType]];

    return (
        <div className={chartStyles.chartCard}>
            <Controls
                inputs={{alpha: inputs.alpha, steps: inputs.steps, history: inputs.history}}
                modelType={modelType}
                onModelChange={onModelChange}
                onHistoryChange={onHistoryChange}
                onForecastChange={onForecastChange}
                isRunning={isRunning}
            />
          
            <h3 className={chartStyles.title}>Demand Forecast Overlay</h3>
            <div className={chartStyles.chartContainer}>
                <ResponsiveContainer width="100%" height="100%">
                    <ComposedChart data={chartData} margin={{ top: 10, right: 30, left: 10, bottom: 20 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                        <XAxis dataKey="date" tick={{ fontSize: 12, fill: '#64748b' }} />
                        <YAxis domain={['auto', 'auto']} tick={{ fontSize: 12, fill: '#64748b' }} />
                        
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
                            stroke="#3b82f6"
                            strokeWidth={3}
                            name="Historical Sales"
                            dot={false}
                            connectNulls={false}
                        />

                        {/* ETS Forecast */}
                        {modelType === 'ets' &&
                            <Area
                                type="monotone"
                                dataKey="ets_ci"
                                fill="#10b981"
                                fillOpacity={0.1}
                                stroke="none"
                                name={`ETS ${CILabel}`}
                            />
                        }
                        {modelType === 'sarimax' &&
                            <Area
                                type="monotone"
                                dataKey="sarimax_ci"
                                fill="#8b5cf6"
                                fillOpacity={0.1}
                                stroke="none"
                                name={`Sarimax ${CILabel}`}
                            />
                        }
                        {modelType === 'theta' &&
                            <Area
                                type="monotone"
                                dataKey="theta_ci"
                                fill="#f59e0b"
                                fillOpacity={0.1}
                                stroke="none"
                                name={`Theta ${CILabel}`}
                            />
                        }
                        <Line
                            type="monotone"
                            dataKey="forecast_ets"
                            stroke="#10b981"
                            strokeWidth={2}
                            strokeDasharray={modelType === 'ets' ? 0 : 4}
                            name="ETS Forecast"
                            dot={false}
                            connectNulls={false}
                        />

                        {/* SARIMAX Forecast */}
                        <Line
                            type="monotone"
                            dataKey="forecast_sarimax"
                            stroke="#8b5cf6"
                            strokeWidth={2}
                            strokeDasharray={modelType === 'sarimax' ? 0 : 4}
                            name="SARIMAX Forecast"
                            dot={false}
                            connectNulls={false}
                        />

                        {/* Theta Forecast */}
                        <Line
                            type="monotone"
                            dataKey="forecast_theta"
                            stroke="#f59e0b"
                            strokeWidth={2}
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