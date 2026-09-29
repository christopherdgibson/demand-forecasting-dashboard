import pandas as pd
from statsmodels.tsa.holtwinters import ExponentialSmoothing

# Global cache for the fitted model instance and last historical data
STATE = {
    "model": None,
    "last_historical": None
}

# Fetch public dataset (e.g., FRED US Retail Sales)
# url = "https://fred.stlouisfed.org/graph/fredgraph.csv?id=RSXFSN"
def fit_model(filepath="RSXFSN.csv"):
    """Runs data loading and model fitting (Expensive step — run once)."""
    df = pd.read_csv(filepath)
    df['observation_date'] = pd.to_datetime(df['observation_date'])
    df.set_index('observation_date', inplace=True)
    df = df.rename(columns={'RSXFSN': 'sales'}).dropna()

    # Resample to monthly frequency to satisfy statsmodels requirement
    df = df.asfreq('MS')

    # Fit Holt-Winters Exponential Smoothing Model
    model = ExponentialSmoothing(
        df['sales'],
        trend='add',
        seasonal='add',
        seasonal_periods=12
    ).fit()

    STATE["model"] = model
    STATE["last_historical"] = {
        "date": str(df.index[-1].date()),
        "value": float(df['sales'].iloc[-1])
    }

    # Return historical series for initial render
    historical_data = [
        {
            "date": str(d.date()),
            "historical": float(v),
            "forecast": None
        }
        for d, v in zip(df.index, df['sales'])
    ]

    return historical_data

def generate_forecast(forecast_steps=12):
    """Generates future periods from the cached model (Fast step — run on slider change)."""
    if STATE["model"] is None:
        raise ValueError("Model must be fitted before calling generate_forecast.")

    forecast = STATE["model"].forecast(steps=int(forecast_steps))

    # Overlap point (start forecast line from last historical point)
    forecast_data = [
        {
            "date": STATE["last_historical"]["date"],
            "historical": None,
            "forecast": STATE["last_historical"]["value"]
        }
    ]

    # Future forecast points
    forecast_data.extend([
        {
            "date": str(d.date()),
            "historical": None,
            "forecast": float(v)
        }
        for d, v in zip(forecast.index, forecast)
    ])

    return forecast_data
