import { useState, useEffect } from 'react';
import type { DemandProps } from '../types';

export function usePyodide() {
  const [pyodide, setPyodide] = useState<any>(null);
  const [historicalData, setHistoricalData] = useState<Array<DemandProps> | null>();
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

  // 1. Initial fit call
  const fitModel = async (filepath: string = 'RSXFSN.csv'): Promise<Array<DemandProps> | null> => {
    if (!pyodide) return null;
    if (historicalData === null) return null; // Allow fitting before run

    let pyProxy: any = null;
    let fitFn: any = null;
    
    try{
      // 1. Fetch function reference from Python global scope
      fitFn = pyodide.globals.get('fit_model');

      // 2. Invoke function directly with typed JavaScript parameters
      pyProxy = fitFn(filepath);

      // 3. Convert Pyodide dict/proxy object to native JavaScript object
      const historical = pyProxy.toJs({ dict_converter: Object.fromEntries });

      setHistoricalData(historical);
      return historical;
    } catch (error) {
      console.error('Python execution error:', error);
      throw error;
    } finally {
      // 4. Destroy proxy to prevent WASM memory leaks
      if (pyProxy) pyProxy.destroy();
      if (fitFn) fitFn.destroy();

      // Force Python GC inside Pyodide runtime
      pyodide.runPython(`
        import gc
        gc.collect()
      `);
    }
  };

  // 2. Reactive recalculation call
  const updateForecast = async (steps: number): Promise<Array<DemandProps> | null> => {
    if (!pyodide) return null;

    let pyProxy: any = null;
    let forecastFn: any = null;

    try {
      forecastFn = pyodide.globals.get('generate_forecast');
      pyProxy = forecastFn(steps);
      const forecast = pyProxy.toJs({ dict_converter: Object.fromEntries });

      return forecast;
    } catch (error) {
      console.error('Python execution error:', error);
      throw error;
    } finally {
      if (pyProxy) pyProxy.destroy();
      if (forecastFn) forecastFn.destroy();

      pyodide.runPython(`
        import gc
        gc.collect()
      `);
    }    
  };

  return { isLoading, fitModel, updateForecast, historicalData };
}