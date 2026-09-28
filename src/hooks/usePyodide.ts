import { useState, useEffect } from 'react';
import type { ForecastProps, ForecastResults } from '../types';

export function usePyodide() {
  const [pyodide, setPyodide] = useState<any>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const base = import.meta.env.BASE_URL;

  useEffect(() => {
    async function initPyodide() {
      try {
        const py = await window.loadPyodide();
        await py.loadPackage(['pandas', 'statsmodels', 'micropip']);

        // Fetch main.py
        const [mainSrc] = await Promise.all([
          fetch(`${base}python/main.py`).then((res) => res.text()),
        ]);

        // Write support modules to the virtual file system
        //py.FS.writeFile('config.py', configSrc);

        // Fetch CSV file and write it to MEMFS
      const csvResponse = await fetch(`${base}data/inputs/RSXFSN.csv`);
      const csvData = await csvResponse.text();

      // Write file into Pyodide's virtual filesystem root as 'RSXFSN.csv'
      py.FS.writeFile('RSXFSN.csv', csvData);

        // Execute main.py once to load functions into Python's global scope
        await py.runPythonAsync(mainSrc);

        setPyodide(py);
      } catch (err) {
        console.error('Pyodide initialization failed:', err);
      } finally {
        setIsLoading(false);
      }
    }

    initPyodide();
  }, []);

const runForecast = async ({file_path = "RSXFSN.csv", forecast_steps = 12}: ForecastProps): Promise<ForecastResults | null> => {
    if (!pyodide) return null;

    let forecastFn: any = null;
    let pyProxy: any = null;

    try {
      // 1. Fetch function reference from Python global scope
      forecastFn = pyodide.globals.get('run_demand_forecast');

      // 2. Invoke function directly with typed JavaScript parameters
      pyProxy = forecastFn(file_path, forecast_steps);

      // 3. Convert Pyodide dict/proxy object to native JavaScript object
      const jsResult = pyProxy.toJs({ dict_converter: Object.fromEntries }) as ForecastResults;

      return jsResult;
    } catch (error) {
      console.error('Python execution error:', error);
      throw error;
    } finally {
      // 4. Destroy proxy to prevent WASM memory leaks
      if (pyProxy) pyProxy.destroy();
      if (forecastFn) forecastFn.destroy();

      // Force Python GC inside Pyodide runtime
      pyodide.runPython(`
        import gc
        gc.collect()
      `);
    }
  };

  return { isLoading, runForecast };
}