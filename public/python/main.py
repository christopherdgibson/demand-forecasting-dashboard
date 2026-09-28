import numpy as np
import pandas as pd
from statsmodels.tsa.holtwinters import ExponentialSmoothing

# 1. Fetch public dataset (e.g., FRED US Retail Sales)
# url = "https://fred.stlouisfed.org/graph/fredgraph.csv?id=RSXFSN"

def run_demand_forecast(file_path: str = "RSXFSN.csv", forecast_steps: int = 12):
    df = pd.read_csv(file_path)
    df['observation_date'] = pd.to_datetime(df['observation_date'])
    df.set_index('observation_date', inplace=True)
    df = df.rename(columns={'RSXFSN': 'sales'}).dropna()

    # Resample to monthly frequency to satisfy statsmodels requirement
    df = df.asfreq('MS')

    # 2. Fit Holt-Winters Exponential Smoothing Model
    model = ExponentialSmoothing(
        df['sales'],
        trend='add',
        seasonal='add',
        seasonal_periods=12
    ).fit()

    # 3. Forecast future periods (e.g., 12 months ahead)
    steps = forecast_steps
    forecast = model.forecast(steps=steps)

    # 4. Format output as JSON for front-end consumption
    results = {
        "historical": [{"date": str(d.date()), "value": float(v)} for d, v in zip(df.index, df['sales'])],
        "forecast": [{"date": str(d.date()), "value": float(v)} for d, v in zip(forecast.index, forecast)]
    }    

    return results
