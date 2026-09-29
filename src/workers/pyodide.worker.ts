// import { loadPyodide } from 'pyodide';
// Declare loadPyodide for TypeScript recognition in self scope

let pyodide: any = null;

// Handle messages coming from React main thread
self.onmessage = async (event: MessageEvent) => {
  const { type, payload, id } = event.data;

  try {
    if (type === 'INIT') {
      const { base, csvUrl } = payload;
    //   console.log('window: ', window);

    const { loadPyodide } = await import('https://cdn.jsdelivr.net/pyodide/v0.26.1/full/pyodide.mjs' as any);

      // Load WASM and packages in background thread
      pyodide = await loadPyodide({
        indexURL: 'https://cdn.jsdelivr.net/pyodide/v0.26.1/full/'
      });
      await pyodide.loadPackage(['pandas', 'statsmodels', 'micropip']);

      // Fetch python code and dataset
      const mainSrc = await fetch(`${base}python/main.py`).then((res) => res.text());
      const csvData = await fetch(csvUrl).then((res) => res.text());

      pyodide.FS.writeFile('RSXFSN.csv', csvData);
      await pyodide.runPythonAsync(mainSrc);

      self.postMessage({ id, type: 'INIT_SUCCESS' });
    } 
    
    else if (type === 'CALL_PYTHON') {
      const { fnName, args } = payload;
      
      const pyFn = pyodide.globals.get(fnName);
      const proxy = pyFn(...args);
      const result = proxy.toJs({ dict_converter: Object.fromEntries });

      // Clean up proxy and force garbage collection
      if (proxy?.destroy) proxy.destroy();
      if (pyFn?.destroy) pyFn.destroy();
      pyodide.runPython('import gc; gc.collect()');

      self.postMessage({ id, type: 'CALL_SUCCESS', result });
    }
  } catch (error: any) {
    self.postMessage({ id, type: 'ERROR', error: error.message });
  }
};