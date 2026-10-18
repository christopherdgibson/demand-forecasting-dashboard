import { useEffect, useState } from 'react';
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

import {ControlCard, Controls} from '../components/Controls';
import { roundNumber } from '../utils/numberUtils';

import chartStyles from './ForecastChart/ForecastChart.module.css'
import controlsStyles from './Controls/Controls.module.css'

import type { CardInputs, DemandProps, ForecastChartInputs, ForecastInputs, ForecastResults, ModelType, OverlayChartData, OverlayResults } from '../types';


interface OverlayChartProps {
    controlPanel?: any;
    inputs: ForecastChartInputs;
    modelType: ModelType;
    chartData: Array<OverlayChartData>;
    onForecastChange: (updatedParams: ForecastChartInputs) => void;
    onModelChange: (updatedParams: ModelType) => void;
    onHistoryChange: (newPeriods: number) => void;
    isRunning: boolean;
}

export function ForecastOverlayChart({ inputs, modelType, chartData, onForecastChange, onModelChange, onHistoryChange, isRunning, controlPanel }: OverlayChartProps) {
    if (!chartData || chartData.length === 0) return null;
    const CILabel = `${roundNumber((1-inputs.alpha)*100, 1)}% CI`;

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
                        <Tooltip />
                        <Legend wrapperStyle={{ fontSize: '12px' }} />

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