import { useCallback, useEffect, useRef, useState } from 'react';
import type { CsvLoadInputs, ErrorMessage, ForecastParameters, ForecastResponse, ModelResults, SuccessResult } from '../types';

interface PyFunctionProps {
  fnName: string;
  args?: any[];
}
type CallPyFunction = <T,>(props: PyFunctionProps) => Promise<SuccessResult<T> | ErrorMessage>;

export function usePyodide() {
  const [pyodide, setPyodide] = useState<any>(null);
  const [initError, setInitError] = useState<ErrorMessage | null>(null);
  const isLoading = pyodide === null && initError === null; 

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
          fetchText(`${base}python/main.py`),
        ]);

        // Write support modules to the virtual file system
        //py.FS.writeFile('config.py', configSrc);

        // Fetch CSV file and write it to MEMFS
        const [csvRSXFSN, csvRSAFSNA, csvECOMPCTNSA] = await Promise.all([
          fetchText(`${base}data/inputs/RSXFSN.csv`),
          fetchText(`${base}data/inputs/RSAFSNA.csv`),
          fetchText(`${base}data/inputs/ECOMPCTNSA.csv`),
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
        setInitError({
          success: false,
          header: 'Python failed to load',
          type: 'init',
          message: err instanceof Error ? err.message : String(err),
        });
      } 
    }

    initPyodide();
  }, []);

  // 2. Centralized Pyodide Invocation Wrapper
  const callPyFunction = useCallback(
    (async <T,>({ fnName, args = [] }: PyFunctionProps): Promise<SuccessResult<T> | ErrorMessage> => {
      if (!pyodide) {
        console.warn(`Attempted to call ${fnName} before Pyodide finished loading.`);
        return {
          success: false,
          header: 'Python not ready',
          type: 'NotReady',
          message: 'The Python environment is still loading. Try again in a moment.',
        };
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
    async ({source, isString = false, delimiter, dateCol, targetCol, freq, trimPartial = false}: CsvLoadInputs): Promise<SuccessResult<ModelResults> | ErrorMessage> => {
      const historical = await callPyFunction<ModelResults>({
        fnName: 'fit_models',
        args: [source, isString, delimiter, dateCol, targetCol, freq, trimPartial],
      });

      return historical;
    }, [callPyFunction]
  );

  // 4. Public API: Reactive Forecast Horizon Update
  const updateForecasts = useCallback(
    async ({steps, alpha}: ForecastParameters): Promise<SuccessResult<ForecastResponse> | ErrorMessage> => {
      return await callPyFunction<ForecastResponse>({
        fnName: 'generate_forecasts',
        args: [steps, alpha],
      });
    }, [callPyFunction]
  );

  return { isLoading, initError, fitModels, updateForecasts };
}

// Helper functions

async function fetchText(url: string): Promise<string> {
  const res = await fetch(url);
  const type = res.headers.get('content-type') ?? '';
  if (!res.ok || type.includes('text/html')) {
    throw new Error(`Could not load ${url} (status ${res.status})`);
  }
  return res.text();
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
