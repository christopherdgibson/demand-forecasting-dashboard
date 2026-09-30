import numpy as np
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
            "forecast": None,
            "ci_lower": None,
            "ci_upper": None,
        }
        for d, v in zip(df.index, df['sales'])
    ]

    return historical_data

def generate_forecast(forecast_steps=12, alpha=0.05):
    """Generates forecast and 95% confidence intervals (alpha=0.05)."""
    if STATE["model"] is None:
        raise ValueError("Model must be fitted before calling generate_forecast.")

    model = STATE["model"]
    steps = int(forecast_steps)

    # 1. Get prediction results object
    forecast = model.forecast(steps=steps)
    # 2. Extract confidence intervals (default alpha=0.05 for 95% CI)
    residuals = model.resid
    sigma_res = np.std(residuals)

    # z_score = 1.96 for 95%, 1.645 for 90%, 1.282 for 80%
    z_score = 1.96

    last_val = STATE["last_historical"]["value"]
    last_date = STATE["last_historical"]["date"]

    # Overlap point: anchor lower and upper bounds to last historical value
    forecast_data = [
        {
            "date": last_date,
            "historical": None,
            "forecast": last_val,
            "ci_lower": last_val,
            "ci_upper": last_val,
        }
    ]

    # 3. Calculate horizon-dependent error bounds
    for i, (date_idx, mean_val) in enumerate(forecast.items(), start=1):
        # Error variance grows with forecast step h
        margin_of_error = z_score * sigma_res * np.sqrt(i)
        
        lower_val = mean_val - margin_of_error
        upper_val = mean_val + margin_of_error

        forecast_data.append({
            "date": str(date_idx.date()),
            "historical": None,
            "forecast": round(float(mean_val), 2),
            "ci_lower": round(float(lower_val), 2),
            "ci_upper": round(float(upper_val), 2),
        })

    return forecast_data