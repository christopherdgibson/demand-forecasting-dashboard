# Demand Forecasting Dashboard

An interactive client-side web application for exploring and forecasting demand patterns in public economic datasets. The application runs time-series models directly in the browser using WebAssembly (Pyodide), delivering real-time predictions and responsive horizon updates through a clean React frontend without requiring a server backend.

## Overview

This project applies classical time-series forecasting methods (such as Holt-Winters Exponential Smoothing via `statsmodels`) to publicly available retail and economic datasets. By bringing Python directly into the browser runtime, the dashboard provides instant, interactive feedback as users tweak forecast horizons and inputs—completely client-side.

## Key Architecture Shift: Serverless In-Browser Python

Unlike traditional full-stack web applications that rely on a Python web framework (like FastAPI or Flask), this project leverages **Pyodide** to run CPython in WebAssembly directly inside the browser.

- **Zero-Latency Reactive Toggles:** Model fitting occurs once on initialization. Adjusting forecast horizons recalculates step projections in sub-millisecond time on the client-side without network roundtrips.
- **Static Hosting:** The entire application can be hosted on static platforms (Vercel, GitHub Pages, Netlify) with zero server infrastructure or maintenance cost.
- **Memory-Conscious WASM Pipeline:** Execution is wrapped with explicit WebAssembly proxy destruction and Python garbage collection (`gc.collect()`) to maintain a minimal browser memory footprint.

## Tech Stack

- **Frontend:** React, TypeScript, Recharts, Vite
- **In-Browser Runtime:** Pyodide (WebAssembly)
- **Modelling:** `statsmodels` (ExponentialSmoothing / Holt-Winters), `pandas`
- **Data:** St. Louis Fed FRED API (US Retail Sales / `RSXFSN`)

## Status

Under active development. Current progress:

- [x] Project scaffolding and repository structure
- [x] Pyodide WASM integration with Vite & React
- [x] In-browser CSV ingestion into Virtual File System (`MEMFS`)
- [x] Model fitting (`statsmodels`) and fast parameter recalculation
- [x] Single-dataset Recharts integration with seamless historical/forecast line overlap
- [x] Reactive horizon slider controls
- [x] Static deployment to GitHub Pages / Vercel
- [ ] Multi-model selection (SARIMAX support)
- [ ] Confidence interval visualisations


## Background

This project sits at the intersection of quantitative economics and modern frontend development. Bringing time-series forecasting out of heavy backend servers and directly into the browser environment demonstrates how WebAssembly can bridge data science tools with rich, responsive user interfaces.

## Architecture

The application strictly decouples initial model fitting from reactive forecasting:

1. **Initialization (`fit_model`):** Downloads and mounts input data (`RSXFSN.csv`) into Pyodide's Virtual File System (`MEMFS`). Fits the time-series model and caches the fitted model state in Python memory.
2. **Reactive Projection (`generate_forecast`):** Runs lightweight model predictions on demand when UI inputs (e.g., forecast horizon sliders) change, avoiding CPU-intensive refitting.
3. **Unified Recharts Adapter:** Transforms historical and projected arrays into a single connected time-series dataset with custom dashed visual treatment for predictions.

## Running Locally

### Prerequisites
- Node.js (v18+)
- npm or yarn

### Installation & Development

1. Clone the repository and navigate to the project root:
```bash
git clone [https://github.com/christopherdgibson/demand-forecasting-dashboard.git](https://github.com/christopherdgibson/demand-forecasting-dashboard.git)
cd demand-forecasting-dashboard
```
2. Install dependencies:
```bash
pip install
```
3. Start the Vite development server:
```bash
npm run dev
```

Open your browser to the local server URL (typically http://localhost:5173). Pyodide will automatically fetch the WebAssembly runtime and initialize the Python environment on load.

## Screenshots
![Demand forecast screenshot] Coming soon!