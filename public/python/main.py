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
    delimiter: str = ',',
    date_col: str = 'observation_date', 
    target_col: str = 'RSXFSN', 
    freq: str = 'MS'):
    """
    Unified pipeline for built-in files and user uploads.
    Standardizes columns to 'date' and 'historical', resamples, and returns records.
    """
    # 1. Ingestion (File path vs. uploaded CSV string)
    if is_string:
        df = pd.read_csv(io.StringIO(source), sep=delimiter, engine='python')
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
    delimiter: str = ',',
    date_col: str = 'observation_date', 
    target_col: str = 'RSXFSN', 
    freq: str = 'MS'):
    """Runs data loading and model fitting (Expensive step — run once)."""
    df = load_and_prepare_dataset(source, is_string, delimiter, date_col, target_col, freq)

    actuals = df['historical']

    last_value = float(actuals.iloc[-1])
    last_date = str(df.index[-1].date())

    sp = get_seasonal_period(freq)
    seasonal = sp > 1
    models, metrics, failures = {}, {}, {}

    # 1. Fit ETS Model
    try:
        ets_fit = ETSModel(
            actuals, error='add', trend='add', 
            seasonal='add' if seasonal else None,
            seasonal_periods=sp if seasonal else None).fit()
        models["ets"] = ets_fit
        ets_resid = actuals - ets_fit.fittedvalues
        metrics["ets"] = {
            "aic": round(float(ets_fit.aic), 2),
            "bic": round(float(ets_fit.bic), 2),
            "mape": round(float(np.mean(np.abs(ets_resid / actuals))), 4),
            "rmse": round(float(np.sqrt(np.mean(ets_resid ** 2))), 2)
        }
    except Exception as e:
        failures["ets"] = f"{type(e).__name__}: {e}"

    # 2. Fit SARIMAX Model (Order: p=1, d=1, q=1, Seasonal: P=1, D=1, Q=1, s=sp)
    try:
        sarimax_fit = SARIMAX(
            actuals, order=(1, 1, 1),
            seasonal_order=(1, 1, 1, sp) if seasonal else (0, 0, 0, 0)
        ).fit(disp=False)
        models["sarimax"] = sarimax_fit
        sarimax_resid = actuals - sarimax_fit.fittedvalues
        metrics["sarimax"] = {
            "aic": round(float(sarimax_fit.aic), 2),
            "bic": round(float(sarimax_fit.bic), 2),
            "mape": round(float(np.mean(np.abs(sarimax_resid / actuals))), 4),
            "rmse": round(float(np.sqrt(np.mean(sarimax_resid ** 2))), 2)
        }

    except Exception as e:
        failures["sarimax"] = f"{type(e).__name__}: {e}"

    # 3. Fit Theta Model
    try:
        theta_fit = ThetaModel(actuals, period=sp if seasonal else None, deseasonalize=seasonal).fit()
        models["theta"] = theta_fit
        
        # Extract metrics or residuals
        theta_rmse = float(np.sqrt(theta_fit.sigma2))
        metrics["theta"] = {
            "aic": "N/A", # Theta model uses alternative error criteria
            "bic": "N/A",
            "mape": "N/A",  # Omit or approximate since fitted values aren't stored
            "rmse": round(theta_rmse, 2)
        }
        
    except Exception as e:
        failures["theta"] = f"{type(e).__name__}: {e}"

    if not models:
        raise ValueError("No model could be fitted. " +"; ".join(f"{k}: {v}" for k, v in failures.items()))

    STATE.update(models=models, metrics=metrics, last_date=pd.to_datetime(last_date), freq=freq)

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
        "metrics": metrics,
        "failures": failures
    }

def generate_forecasts(forecast_steps=12, alpha=0.05):
    """Generates forecasts and confidence intervals for every fitted model."""
    if not STATE["models"]:
        raise ValueError("Model must be fitted before calling generate_forecasts.")
    
    steps = int(forecast_steps)
    if steps < 1:
        raise ValueError("Forecast steps must be at least 1.")
    if not 0 < alpha < 1:
        raise ValueError("Alpha must be between 0 and 1.")

    last_date = STATE["last_date"]
    offset_start, offset_end = get_seasonal_offsets(STATE["freq"], steps)
    forecast_start = last_date + offset_start
    forecast_end = last_date + offset_end
    
    forecasts, failures = {}, {}

    for model_type, model in STATE["models"].items():
        try:
            if model_type == 'ets':
                mean_series, ci_lower, ci_upper = get_ets_forecasts(model, forecast_start, forecast_end, alpha)
            elif model_type == 'sarimax':
                mean_series, ci_lower, ci_upper = get_sarimax_forecasts(model, forecast_start, forecast_end, alpha)
            elif model_type == 'theta':
                mean_series, ci_lower, ci_upper = get_theta_forecasts(model, steps, alpha)
            else:
                continue
                # raise ValueError(f"Unsupported demand model type: '{model_type}'")

            forecasts[model_type] = [
                {
                    "date": str(mean_series.index[i].date()),
                    "historical": None,
                    "forecast": round(float(mean_series.iloc[i]), 2),
                    "ci_lower": round(float(ci_lower.iloc[i]), 2),
                    "ci_upper": round(float(ci_upper.iloc[i]), 2),
                }
                for i in range(steps)
            ]
        except Exception as e:
            failures[model_type] = f"{type(e).__name__}: {e}"

    if not forecasts:
        raise ValueError(
            "No forecasts could be generated. "
            + "; ".join(f"{k}: {v}" for k, v in failures.items())
        )

    return {"forecasts": forecasts, "failures": failures}

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
    elif freq.startswith('Y'):
        return 1
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
    elif freq.startswith('Y'):
        return pd.DateOffset(years=1), pd.DateOffset(years=steps)
    elif freq.startswith('Q'):
        return pd.DateOffset(months=3), pd.DateOffset(months=3 * steps)
    elif freq.startswith('W'):
        return pd.DateOffset(weeks=1), pd.DateOffset(weeks=steps)
    elif freq.startswith('D'):
        return pd.DateOffset(days=1), pd.DateOffset(days=steps)
    else:
        raise ValueError(f"Unsupported frequency '{freq}'") from None