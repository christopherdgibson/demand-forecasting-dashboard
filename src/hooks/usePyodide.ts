import { useCallback, useEffect, useRef, useState } from 'react';
import type { CsvLoadInputs, ErrorMessage, ForecastInputs, ForecastResults, ModelResults, SuccessResult } from '../types';

interface PyFunctionProps {
  fnName: string;
  args?: any[];
}
type CallPyFunction = <T,>(props: PyFunctionProps) => Promise<SuccessResult<T> | ErrorMessage | null>;

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
        const [csvRSXFSN, csvRSAFSNA, csvECOMPCTNSA] = await Promise.all([
          fetch(`${base}data/inputs/RSXFSN.csv`).then((res) => res.text()),
          fetch(`${base}data/inputs/RSAFSNA.csv`).then((res) => res.text()),
          fetch(`${base}data/inputs/ECOMPCTNSA.csv`).then((res) => res.text()),
        ]);

        // Write files into Pyodide's virtual filesystem root as 'fileName.csv'
        py.FS.writeFile('RSXFSN.csv', csvRSXFSN);
        py.FS.writeFile('RSAFSNA.csv', csvRSAFSNA);
        py.FS.writeFile('ECOMPCTNSA.csv', csvECOMPCTNSA);

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
    (async <T,>({ fnName, args = [] }: PyFunctionProps): Promise<SuccessResult<T> | ErrorMessage | null> => {
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

        return {success: true, result: jsResult};
      } catch (err: unknown) {
        const raw = err instanceof Error ? err.message : String(err);
        const { pyType, message } = parsePythonError(raw);
        const header = `Error executing Python function: '${fnName}'`;
        console.error(header, raw);

        // Show clean message for caught errors, generic for rest
        const userFacing = pyType === 'ValueError' ? message : `${pyType}: ${message}`;

        return {
          success: false,
          header,
          type: pyType,
          message: userFacing,
          trace: raw
        };
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
    }) as CallPyFunction, [pyodide]
  );

  // 3. Public API: Initial Model Fit
  const fitModels = useCallback(
    async ({source, isString = false, dateCol, targetCol, freq}: CsvLoadInputs): Promise<SuccessResult<ModelResults> | ErrorMessage | null> => {
      const historical = await callPyFunction<ModelResults>({
        fnName: 'fit_models',
        args: [source, isString, dateCol, targetCol, freq],
      });

      return historical;
    }, [callPyFunction]
  );

  // 4. Public API: Reactive Forecast Horizon Update
  const updateForecasts = useCallback(
    async ({steps, alpha}: ForecastInputs): Promise<SuccessResult<ForecastResults> | ErrorMessage | null> => {
      return await callPyFunction<ForecastResults>({
        fnName: 'generate_forecasts',
        args: [steps, alpha],
      });
    }, [callPyFunction]
  );

  return { isLoading, fitModels, updateForecasts };
}

function parsePythonError(fullTrace: string): { pyType: string; message: string } {
  const lines = fullTrace.trim().split('\n');
  const lastLine = lines[lines.length - 1] ?? '';

  const idx = lastLine.indexOf(':');
  if (idx === -1) {
    return { pyType: lastLine || 'Error', message: 'An unexpected forecasting error occurred.' };
  }

  return {
    pyType: lastLine.slice(0, idx).trim(),
    message: lastLine.slice(idx + 1).trim() || 'An unexpected forecasting error occurred.',
  };
}
