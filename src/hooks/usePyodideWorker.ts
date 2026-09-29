import { useCallback, useEffect, useRef, useState } from 'react';
import type { DemandProps } from '../types';

export function usePyodideWorker() {
  const [isLoading, setIsLoading] = useState(true);
  const workerRef = useRef<Worker | null>(null);
  const pendingRequests = useRef(new Map());

  const base = import.meta.env.BASE_URL;

  useEffect(() => {
    // Vite worker import syntax
    const worker = new Worker(new URL('../workers/pyodide.worker.ts', import.meta.url), {
      type: 'module',
    });

    workerRef.current = worker;

    worker.onmessage = (event) => {
      const { id, type, result, error } = event.data;
      console.log('message type: ', type, 'error: ', error);

      if (type === 'INIT_SUCCESS') {
        setIsLoading(false);
        return;
      }

      // Resolve pending postMessage Promises
      if (pendingRequests.current.has(id)) {
        const { resolve, reject } = pendingRequests.current.get(id)!;
        pendingRequests.current.delete(id);

        if (type === 'ERROR') reject(new Error(error));
        else resolve(result);
      }
    };

    // Trigger background initialization
    const csvUrl = `${window.location.origin}${base}data/inputs/RSXFSN.csv`;
    worker.postMessage({ type: 'INIT', payload: { base, csvUrl } });

    return () => {
      worker.terminate(); // Clean worker destruction on unmount
    };
  }, [base]);

  // Generic messaging helper converting worker posts to JS Promises
  const sendMessage = useCallback((fnName: string, args: any[] = []): Promise<Array<DemandProps> | null> => {
    return new Promise((resolve, reject) => {
      if (!workerRef.current) return reject(new Error('Worker not ready'));

      const id = Math.random().toString(36).substring(2, 9);
      pendingRequests.current.set(id, { resolve, reject });

      workerRef.current.postMessage({
        type: 'CALL_PYTHON',
        id,
        payload: { fnName, args },
      });
    });
  }, []);

  const fitModel = useCallback(
    (filepath: string = 'RSXFSN.csv'): Promise<Array<DemandProps> | null> => {
      return sendMessage('fit_model', [filepath]);
    },
    [sendMessage]
  );

  const updateForecast = useCallback(
    (steps: number): Promise<Array<DemandProps> | null> => {
      return sendMessage('generate_forecast', [steps]);
    },
    [sendMessage]
  );

  return { isLoading, fitModel, updateForecast };
}