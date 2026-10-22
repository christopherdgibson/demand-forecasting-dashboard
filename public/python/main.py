import numpy as np
import pandas as pd
import io
from statsmodels.tsa.exponential_smoothing.ets import ETSModel
from statsmodels.tsa.statespace.sarimax import SARIMAX
from statsmodels.tsa.forecasting.theta import ThetaModel
from typing import Any, Tuple

# Global cache for the fitted model instance and last historical data
STATE = {
    "models": {},
    "metrics": {},
    "last_date": None,
    "freq": None
}

def series_to_frontend_records(series: pd.Series) -> list[dict]:
    """
    Converts the pandas Series into the list of dicts for React frontend.
    """
    df = series.reset_index()
    df.columns = ['date', 'historical']
    df['date'] = df['date'].dt.strftime('%Y-%m-%d')
    return df.to_dict(orient='records')

def load_and_prepare_dataset(
    source, 
    is_string: bool = False, 
    date_col: str = 'observation_date', 
    target_col: str = 'RSXFSN', 
    freq: str = 'MS'):
    """
    Unified pipeline for built-in files and user uploads.
    Standardizes columns to 'date' and 'historical', resamples, and returns records.
    """
    # 1. Ingestion (File path vs. uploaded CSV string)
    if is_string:
        df = pd.read_csv(io.StringIO(source))
    else:
        df = pd.read_csv(source)
    
    # 2. Date Parsing & Chronological Sorting (Ensures time-series sequence)
    df[date_col] = pd.to_datetime(df[date_col], errors='coerce')

    df = df.rename(columns={date_col: 'date'})
    df = df.dropna(subset='date')
    df = df.sort_values(by='date')
    df.set_index('date', inplace=True)
    
    # 3. Handle Target Column Mapping
    if target_col != 'historical':
        if target_col in df.columns:
            df = df.rename(columns={target_col: 'historical'})
        elif 'sales' in df.columns:
            df = df.rename(columns={'sales': 'historical'})
        else:
            raise ValueError(f"Target column '{target_col}' not found in dataset.")

    # 4. Numeric Enforcement & NaN Dropping
    df['historical'] = pd.to_numeric(df['historical'], errors='coerce')
    df = df.dropna(subset=['historical'])
    
    # 5. Resampling, Aggregation, & Gap Filling (DatetimeIndex stays active)
    # Uses .sum() for data grouping and .ffill().fillna(0) for missing periods
    # df = df.asfreq(freq)
    df = df[['historical']].resample(freq).sum().ffill().fillna(0)

    # 6. Format back into a clean structure for the frontend
    # result_df = df.reset_index()
    # result_df.columns = ['date', 'historical']
    
    # # Standardize the date output string format (e.g., 'YYYY-MM-DD')
    # result_df['date'] = result_df['date'].dt.strftime('%Y-%m-%d')

    # Convert to standard Python records (list of dicts) for Pyodide to pass back to JS
    # return result_df.to_dict(orient='records')

    return df
    
# Fetch public dataset (e.g., FRED US Retail Sales)
# url = "https://fred.stlouisfed.org/graph/fredgraph.csv?id=RSXFSN"
def fit_models(source, 
    is_string: bool = False, 
    date_col: str = 'observation_date', 
    target_col: str = 'RSXFSN', 
    freq: str = 'MS'):
    """Runs data loading and model fitting (Expensive step — run once)."""
    df = load_and_prepare_dataset(source, is_string, date_col, target_col, freq)

    actuals = df['historical']

    last_value = float(actuals.iloc[-1])
    last_date = str(df.index[-1].date())

    STATE["last_date"] = pd.to_datetime(last_date)
    STATE["freq"] = freq
    sp = get_seasonal_period(freq)

    # 1. Fit ETS Model
    try:
        ets_fit = ETSModel(
            actuals, error='add', trend='add', seasonal='add', seasonal_periods=sp
        ).fit()
        STATE["models"]["ets"] = ets_fit
        ets_resid = actuals - ets_fit.fittedvalues
        STATE["metrics"]["ets"] = {
            "aic": round(float(ets_fit.aic), 2),
            "bic": round(float(ets_fit.bic), 2),
            "mape": round(float(np.mean(np.abs(ets_resid / actuals))), 4),
            "rmse": round(float(np.sqrt(np.mean(ets_resid ** 2))), 2)
        }
    except Exception as e:
        STATE["models"]["ets"] = None

    # 2. Fit SARIMAX Model (Order: p=1, d=1, q=1, Seasonal: P=1, D=1, Q=1, s=12)
    try:
        sarimax_fit = SARIMAX(
            actuals, order=(1, 1, 1), seasonal_order=(1, 1, 1, sp)
        ).fit(disp=False)
        STATE["models"]["sarimax"] = sarimax_fit
        sarimax_resid = actuals - sarimax_fit.fittedvalues
        STATE["metrics"]["sarimax"] = {
            "aic": round(float(sarimax_fit.aic), 2),
            "bic": round(float(sarimax_fit.bic), 2),
            "mape": round(float(np.mean(np.abs(sarimax_resid / actuals))), 4),
            "rmse": round(float(np.sqrt(np.mean(sarimax_resid ** 2))), 2)
        }

    except Exception as e:
        STATE["models"]["sarimax"] = None

    # 3. Fit Theta Model
    try:
        theta_fit = ThetaModel(actuals, period=sp).fit()
        STATE["models"]["theta"] = theta_fit
        
        # Extract metrics or residuals
        theta_rmse = float(np.sqrt(theta_fit.sigma2))
        STATE["metrics"]["theta"] = {
            "aic": "N/A", # Theta model uses alternative error criteria
            "bic": "N/A",
            "mape": "N/A",  # Omit or approximate since fitted values aren't stored
            "rmse": round(theta_rmse, 2)
        }
        
    except Exception as e:
        print('Exception on Theta model:', e)
        STATE["models"]["theta"] = None

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

def generate_forecasts(forecast_steps=12, alpha=0.05):
    """Generates forecasts and 95% confidence intervals (alpha=0.05)."""
    if STATE["models"] is None:
        raise ValueError("Model must be fitted before calling generate_forecasts.")
    
    steps = int(forecast_steps)
    last_date = STATE["last_date"]
    freq = STATE["freq"]

    offset_start, offset_end = get_seasonal_offsets(freq, steps)
    forecast_start = last_date + offset_start
    forecast_end = last_date + offset_end
    
    forecast_maps = {}

    for modelType, model in STATE["models"].items():
        if model is None:
            continue

        # Get prediction results object and 
        #   extract confidence intervals (default alpha=0.05 for 95% CI)
        if modelType == 'ets':
            (mean_series, ci_lower, ci_upper) = get_ets_forecasts(model, forecast_start, forecast_end, alpha)

        elif modelType == 'sarimax':
            (mean_series, ci_lower, ci_upper) = get_sarimax_forecasts(model, forecast_start, forecast_end, alpha)

        elif modelType == 'theta':
            (mean_series, ci_lower, ci_upper) = get_theta_forecasts(model, steps, alpha)

        else:
            continue
            # raise ValueError(f"Unsupported demand model type: '{modelType}'")

        forecast_data = []
        
        # Append forecasted periods
        for i in range(steps):
            date_str = str(mean_series.index[i].date())
            mean_val = float(mean_series.iloc[i])
            lower_val = float(ci_lower.iloc[i])
            upper_val = float(ci_upper.iloc[i])

            forecast_data.append({
                "date": date_str,
                "historical": None,
                "forecast": round(mean_val, 2),
                "ci_lower": round(lower_val, 2),
                "ci_upper": round(upper_val, 2),
            })

        forecast_maps[modelType] = forecast_data
    
    return forecast_maps

# Confidence interval helpers for scope separation

def get_ets_forecasts(model: Any, forecast_start: Any, forecast_end: Any, alpha: float) -> Tuple[Any, Any, Any]:
    pred = model.get_prediction(start=forecast_start, end=forecast_end)
    mean_series = pred.predicted_mean
    pred_ci = pred.pred_int(alpha=alpha)
    # Handle column naming variations in statsmodels pred_int output (e.g. 'lower PI (alpha=0.050000)')
    return mean_series, pred_ci.iloc[:, 0], pred_ci.iloc[:, 1]

def get_sarimax_forecasts(model: Any, forecast_start: Any, forecast_end: Any, alpha: float) -> Tuple[Any, Any, Any]:
    pred = model.get_prediction(start=forecast_start, end=forecast_end)
    mean_series = pred.predicted_mean
    pred_ci = pred.summary_frame(alpha=alpha)
    return mean_series, pred_ci['mean_ci_lower'], pred_ci['mean_ci_upper']

def get_theta_forecasts(model: Any, steps: int, alpha: float) -> Tuple[Any, Any, Any]:
    mean_series = model.forecast(steps=steps)
    pred_ci = model.prediction_intervals(steps=steps, alpha=alpha)
    return mean_series, pred_ci['lower'], pred_ci['upper']

def get_seasonal_period(freq: str) -> int:
    """Returns the appropriate seasonal period based on pandas frequency."""
    freq = freq.upper()
    if freq.startswith('M'):
        return 12
    elif freq.startswith('Q'):
        return 4
    elif freq.startswith('W'):
        return 52
    elif freq.startswith('D'):
        return 7  # 7-day weekly cycle is safest for daily; 365 can break statsmodels
    else:
        return 1  # Default fallback (no seasonality)

def get_seasonal_offsets(freq: str, steps: int) -> Tuple[Any, Any]:
    if freq.startswith('M'):
        return pd.DateOffset(months=1), pd.DateOffset(months=steps)
    elif freq.startswith('Q'):
        return pd.DateOffset(months=3), pd.DateOffset(months=3 * steps)
    elif freq.startswith('W'):
        return pd.DateOffset(weeks=1), pd.DateOffset(weeks=steps)
    elif freq.startswith('D'):
        return pd.DateOffset(days=1), pd.DateOffset(days=steps)