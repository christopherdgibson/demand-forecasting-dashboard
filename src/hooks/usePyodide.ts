import { useCallback, useEffect, useRef, useState } from 'react';
import type { ForecastInputs, ForecastResults, ModelResults } from '../types';

interface PyFunctionProps {
  fnName: string;
  args?: any[];
}

type CallPyFunction = <T,>(props: PyFunctionProps) => Promise<T | null>;

export function usePyodide() {
  const [pyodide, setPyodide] = useState<any>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  const isInitializingRef = useRef(false);
  const base = import.meta.env.BASE_URL;

  // 1. Initialize Pyodide WASM Runtime & Load Data
  useEffect(() => {
    // If already initializing or initialized, do nothing
    if (isInitializingRef.current) return;
    isInitializingRef.current = true;
    
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

  // 2. Centralized Pyodide Invocation Wrapper
  const callPyFunction = useCallback(
    (async <T,>({ fnName, args = [] }: PyFunctionProps): Promise<T | null> => {
      if (!pyodide) {
        console.warn(`Attempted to call ${fnName} before Pyodide finished loading.`);
        return null;
      }

      let pyFunction: any = null;
      let pyProxy: any = null;

      try {
        // Fetch function reference from Python global namespace
        pyFunction = pyodide.globals.get(fnName);

        if (!pyFunction) {
          throw new Error(`Python function '${fnName}' was not found in global scope.`);
        }

        pyProxy = pyFunction(...args);

        // Convert Pyodide Proxy object to native JavaScript Types
        const jsResult = pyProxy.toJs({ dict_converter: Object.fromEntries }) as T;

        return jsResult;
      } catch (error) {
        console.error(`Error executing Python function '${fnName}':`, error);
        throw error;
      } finally {
        // Clean up WASM proxies to prevent memory leaks
        if (pyProxy && typeof pyProxy.destroy === 'function') pyProxy.destroy();
        if (pyFunction && typeof pyFunction.destroy === 'function') pyFunction.destroy();

        // Run Python Garbage Collection
        try {
          pyodide.runPython('import gc; gc.collect()');
        } catch (gcErr) {
          console.warn('Garbage collection trigger failed:', gcErr);
        }
      }
    }) as CallPyFunction,
    [pyodide]
  );

  // 3. Public API: Initial Model Fit
  const fitModels = useCallback(
    async (filepath: string = 'RSXFSN.csv'): Promise<ModelResults | null> => {
      const historical = await callPyFunction<ModelResults>({
        fnName: 'fit_models',
        args: [filepath],
      });

      return historical;
    }, [callPyFunction]
  );

  // 4. Public API: Reactive Forecast Horizon Update
  const updateForecasts = useCallback(
    async ({steps, alpha}: ForecastInputs): Promise<ForecastResults | null> => {
      return await callPyFunction<ForecastResults>({
        fnName: 'generate_forecasts',
        args: [steps, alpha],
      });
    },
    [callPyFunction]
  );

  return { isLoading, fitModels, updateForecasts };
}
