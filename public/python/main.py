import numpy as np
import pandas as pd
from statsmodels.tsa.exponential_smoothing.ets import ETSModel
from statsmodels.tsa.statespace.sarimax import SARIMAX
from typing import Any, Tuple

# Global cache for the fitted model instance and last historical data
STATE = {
    "models": {},
    "metrics": {},
    "last_date": None
}

# Fetch public dataset (e.g., FRED US Retail Sales)
# url = "https://fred.stlouisfed.org/graph/fredgraph.csv?id=RSXFSN"
def fit_models(filepath="RSXFSN.csv"):
    """Runs data loading and model fitting (Expensive step — run once)."""
    df = pd.read_csv(filepath)
    df['observation_date'] = pd.to_datetime(df['observation_date'])
    df.set_index('observation_date', inplace=True)
    df = df.rename(columns={'RSXFSN': 'sales'}).dropna()

    # Resample to monthly frequency to satisfy statsmodels requirement
    df = df.asfreq('MS')
    actuals = df['sales']

    last_value = float(actuals.iloc[-1])
    last_date = str(df.index[-1].date())

    STATE["last_date"] = last_date

    # 1. Fit ETS Model
    try:
        ets_fit = ETSModel(
            actuals, error='add', trend='add', seasonal='add', seasonal_periods=12
        ).fit()
        STATE["models"]["ets"] = ets_fit
        ets_resid = actuals - ets_fit.fittedvalues
        STATE["metrics"]["ets"] = {
            "aic": round(float(ets_fit.aic), 2),
            "bic": round(float(ets_fit.bic), 2),
            "mape": round(float(np.mean(np.abs(ets_resid / actuals)) * 100), 2),
            "rmse": round(float(np.sqrt(np.mean(ets_resid ** 2))), 2)
        }
    except Exception as e:
        STATE["models"]["ets"] = None

    # 2. Fit SARIMAX Model (Order: p=1, d=1, q=1, Seasonal: P=1, D=1, Q=1, s=12)
    try:
        sarimax_fit = SARIMAX(
            actuals, order=(1, 1, 1), seasonal_order=(1, 1, 1, 12)
        ).fit(disp=False)
        STATE["models"]["sarimax"] = sarimax_fit
        sarimax_resid = actuals - sarimax_fit.fittedvalues
        STATE["metrics"]["sarimax"] = {
            "aic": round(float(sarimax_fit.aic), 2),
            "bic": round(float(sarimax_fit.bic), 2),
            "mape": round(float(np.mean(np.abs(sarimax_resid / actuals)) * 100), 2),
            "rmse": round(float(np.sqrt(np.mean(sarimax_resid ** 2))), 2)
        }

    except Exception as e:
        STATE["models"]["sarimax"] = None

    # Return historical series for initial render
    historical_data = [
        {
            "date": str(d.date()),
            "historical": float(v),
            "forecast": None,
            "ci_lower": None,
            "ci_upper": None,
        }
        for d, v in zip(df.index, actuals)
    ]

    # Overlap point: anchor lower and upper bounds to last historical value
    historical_data[-1] = {
        "date": last_date,
        "historical": last_value,
        "forecast": last_value,
        "ci_lower": last_value,
        "ci_upper": last_value,
    }

    return {
        "data": historical_data,
        "metrics": STATE["metrics"]
    }

def generate_forecast(modelType='ets', forecast_steps=12, alpha=0.05):
    """Generates forecast and 95% confidence intervals (alpha=0.05)."""
    if STATE["models"] is None:
        raise ValueError("Model must be fitted before calling generate_forecast.")
    
    steps = int(forecast_steps)
    model = STATE["models"][modelType]
    last_date = STATE["last_date"]

    forecast_start = pd.to_datetime(last_date)+pd.DateOffset(months=1)
    forecast_end = pd.to_datetime(last_date)+pd.DateOffset(months=steps)

    # 1. Get prediction results object
    pred = model.get_prediction(start=forecast_start, end=forecast_end)

    # # 2. Extract confidence intervals (default alpha=0.05 for 95% CI)
    if modelType == 'ets':
        (ci_lower, ci_upper) = get_ets_ci(pred, alpha)

    elif modelType == 'sarimax':
        (ci_lower, ci_upper) = get_sarimax_ci(pred, alpha)

    else:
        raise ValueError(f"Unsupported demand model type: '{modelType}'")

    forecast_data = []
    
    # Append forecasted periods
    for i in range(steps):
        date_str = str(pred.predicted_mean.index[i].date())
        mean_val = float(pred.predicted_mean.iloc[i])
        
        # Handle column naming variations in statsmodels conf_int output
        lower_val = float(ci_lower.iloc[i])
        upper_val = float(ci_upper.iloc[i])

        forecast_data.append({
            "date": date_str,
            "historical": None,
            "forecast": round(mean_val, 2),
            "ci_lower": round(lower_val, 2),
            "ci_upper": round(upper_val, 2),
        })
    
    return forecast_data

# Confidence interval helpers for scope separation

def get_ets_ci(prediction: Any, alpha: float) -> Tuple[Any, Any]:
    pred_ci = prediction.pred_int(alpha=alpha)
    return pred_ci.iloc[:, 0], pred_ci.iloc[:, 1]

def get_sarimax_ci(prediction: Any, alpha: float) -> Tuple[Any, Any]:
    pred_ci = prediction.summary_frame(alpha=alpha)
    return pred_ci['mean_ci_lower'], pred_ci['mean_ci_upper']
