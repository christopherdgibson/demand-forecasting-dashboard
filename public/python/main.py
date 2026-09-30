import pandas as pd
from statsmodels.tsa.exponential_smoothing.ets import ETSModel

# Global cache for the fitted model instance and last historical data
STATE = {
    "model": None,
    "last_date": None
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

    # Fit ETS Model
    model = ETSModel(
        df['sales'],
        error='add',
        trend='add',
        seasonal='add',
        seasonal_periods=12
    ).fit()

    last_value = float(df['sales'].iloc[-1])
    last_date = str(df.index[-1].date())

    STATE["model"] = model
    STATE["last_date"] = last_date

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

    # Overlap point: anchor lower and upper bounds to last historical value
    historical_data[-1] = {
        "date": last_date,
        "historical": last_value,
        "forecast": last_value,
        "ci_lower": last_value,
        "ci_upper": last_value,
    }

    return historical_data

def generate_forecast(forecast_steps=12, alpha=0.05):
    """Generates forecast and 95% confidence intervals (alpha=0.05)."""
    if STATE["model"] is None:
        raise ValueError("Model must be fitted before calling generate_forecast.")

    
    steps = int(forecast_steps)
    model = STATE["model"]
    last_date = STATE["last_date"]

    forecast_start = pd.to_datetime(last_date)+pd.DateOffset(months=1)
    forecast_end = pd.to_datetime(last_date)+pd.DateOffset(months=steps)

    # 1. Get prediction results object
    pred = model.get_prediction(start=forecast_start, end=forecast_end)
    # 2. Extract confidence intervals (default alpha=0.05 for 95% CI)
    pred_ci = pred.pred_int(alpha=alpha)

    forecast_data = []

    # Append forecasted periods
    for i in range(steps):
        date_str = str(pred.predicted_mean.index[i].date())
        mean_val = float(pred.predicted_mean.iloc[i])
        
        # Handle column naming variations in statsmodels conf_int output
        lower_val = float(pred_ci.iloc[i, 0])
        upper_val = float(pred_ci.iloc[i, 1])

        forecast_data.append({
            "date": date_str,
            "historical": None,
            "forecast": round(mean_val, 2),
            "ci_lower": round(lower_val, 2),
            "ci_upper": round(upper_val, 2),
        })

    return forecast_data
