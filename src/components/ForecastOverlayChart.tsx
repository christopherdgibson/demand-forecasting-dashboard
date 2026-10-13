import { useState } from 'react';
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

import chartStyles from './ForecastChart/ForecastChart.module.css'
import controlsStyles from './Controls/Controls.module.css'

import type { DemandProps, ForecastResults, OverlayResults } from '../types';

interface OverlayChartData extends OverlayResults {
    ets_ci: (number | null)[] | null;
    sarimax_ci: (number | null)[] | null;
    theta_ci: (number | null)[] | null;
}

interface OverlayChartProps {
    historicalData: DemandProps[];
    forecastMap: ForecastResults;
    pastPeriods: number;
}

function adjustHistory(history: Array<DemandProps>): Array<OverlayChartData> {
    const adjusted =  history.map((item, idx) => {
        if (idx === history.length - 1) {
            const val = item.historical;

            return {
                date: item.date, historical: val,
                forecast_ets: val, ci_lower_ets: val, ci_upper_ets: val,
                forecast_sarimax: val, ci_lower_sarimax: val, ci_upper_sarimax: val,
                forecast_theta: val, ci_lower_theta: val, ci_upper_theta: val,
            };
        }
        return {
            date: item.date, historical: item.historical,
            forecast_ets: null, ci_lower_ets: null, ci_upper_ets: null,
            forecast_sarimax: null, ci_lower_sarimax: null, ci_upper_sarimax: null,
            forecast_theta: null, ci_lower_theta: null, ci_upper_theta: null,
        };
    });

    return formatRechartsData(adjusted) as OverlayChartData[];
}

function reshapeRows(forecastMap: ForecastResults): OverlayChartData[] {
    const etsForecast = forecastMap['ets'] || [];
    const sarimaxForecast = forecastMap['sarimax'] || [];
    const thetaForecast = forecastMap['theta'] || [];
    const overlayRows = etsForecast.map((etsItem, index) => {
        const date = etsItem.date;
        const sarimaxItem = sarimaxForecast[index] || {};
        const thetaItem = thetaForecast[index] || {};

        return {
            date,
            historical: null, // No historical value in forecast horizon

            // ETS
            forecast_ets: etsItem.forecast,
            ci_lower_ets: etsItem.ci_lower,
            ci_upper_ets: etsItem.ci_upper,

            // SARIMAX
            forecast_sarimax: sarimaxItem.forecast ?? null,
            ci_lower_sarimax: sarimaxItem.ci_lower ?? null,
            ci_upper_sarimax: sarimaxItem.ci_upper ?? null,

            // Theta
            forecast_theta: thetaItem.forecast ?? null,
            ci_lower_theta: thetaItem.ci_lower ?? null,
            ci_upper_theta: thetaItem.ci_upper ?? null,
        };
    });

    return formatRechartsData(overlayRows);
}

function formatRechartsData(data: OverlayResults[]): OverlayChartData[] {
    return data.map((item) => ({
        ...item,
        ets_ci: item.ci_lower_ets !== null ? [item.ci_lower_ets, item.ci_upper_ets] : null,
        sarimax_ci: item.ci_lower_sarimax !== null ? [item.ci_lower_sarimax, item.ci_upper_sarimax] : null,
        theta_ci: item.ci_lower_theta !== null ? [item.ci_lower_theta, item.ci_upper_theta] : null,
    }));
}

export function ForecastOverlayChart({ historicalData, forecastMap, pastPeriods = 12 }: OverlayChartProps) {
    if (!forecastMap || forecastMap['ets'].length === 0) return null;

    const [selectedPastPeriods, setSelectedPastPeriods] = useState<number>(pastPeriods);
    const [chartData, setChartData] = useState(() => {
        return initChartData(historicalData, forecastMap, pastPeriods);
    });
    const [forecastData] = useState(() => {
        return reshapeRows(forecastMap);
    });
    const [fullAdjustedHistory] = useState(() => {
        return adjustHistory(historicalData)
    });

    function handlePeriodChange(newPeriods: number) {
        setSelectedPastPeriods(newPeriods);
        const adjustedHistory = fullAdjustedHistory.slice(-(newPeriods + 1))
        const freshData = [...adjustedHistory, ...forecastData];

        setChartData(freshData);
    }

    function initChartData(historicalData: DemandProps[], forecastMap: ForecastResults, periods: number): OverlayChartData[] {
        if (!historicalData || historicalData.length === 0) return [];

        const adjustedHistory = adjustHistory(historicalData).slice(-periods);
        const overlayRows = reshapeRows(forecastMap);

        return [...adjustedHistory, ...overlayRows];
    }

    return (
        <div className={chartStyles.card}>
            <h3 className={chartStyles.title}>Demand Forecast Overlay</h3>
            <div className={controlsStyles.grid}>
                {/* Historical Periods */}
                <div className={controlsStyles.fieldGroup}>
                    <label className={controlsStyles.label}>
                    <span>Historical Periods</span>
                    <span className={controlsStyles.hint}>Data Time Horizon</span>
                    </label>
                    <input
                    type="number"
                    className={controlsStyles.input}
                    min={0}
                    value={selectedPastPeriods}
                    onChange={(e) => handlePeriodChange(Number(e.target.value))}
                    />
                </div>
                {/* Selected Model */}
                <div className={controlsStyles.fieldGroup}>
                    <label className={controlsStyles.label}>
                    <span>Selected Forecast</span>
                    <span className={controlsStyles.hint}>Forecast Model</span>
                    </label>
                    <input
                    type="number"
                    className={controlsStyles.input}
                    min={0}
                    value={selectedPastPeriods}
                    onChange={(e) => handlePeriodChange(Number(e.target.value))}
                    />
                </div>
            </div>
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
                        <Area
                            type="monotone"
                            dataKey="ets_ci"
                            fill="#10b981"
                            fillOpacity={0.1}
                            stroke="none"
                            name="ETS 95% CI"
                        />
                        <Line
                            type="monotone"
                            dataKey="forecast_ets"
                            stroke="#10b981"
                            strokeWidth={2}
                            strokeDasharray="4 4"
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