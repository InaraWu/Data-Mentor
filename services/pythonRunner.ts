// Worker code as a string to avoid external file build configuration issues
const WORKER_CODE = `
importScripts("https://cdn.jsdelivr.net/pyodide/v0.25.0/full/pyodide.js");

let pyodide = null;

async function loadPyodideAndPackages() {
  try {
    self.pyodide = await loadPyodide();
    // Load micrppip to install packages if needed, but standard loading works for pandas
    await self.pyodide.loadPackage("pandas");
    self.postMessage({ type: 'READY' });
  } catch (err) {
    self.postMessage({ type: 'ERROR', error: err.message });
  }
}

loadPyodideAndPackages();

self.onmessage = async (event) => {
  const { code } = event.data;
  
  if (!self.pyodide) {
    self.postMessage({ type: 'ERROR', error: "Python environment is not ready yet." });
    return;
  }

  try {
    // Redirect stdout to capture print() statements
    self.pyodide.runPython(\`
import sys
import io
sys.stdout = io.StringIO()
    \`);

    // Run the user code
    let result = await self.pyodide.runPythonAsync(code);
    
    // Get stdout content
    let stdout = self.pyodide.runPython("sys.stdout.getvalue()");
    
    // Check if result is a Pandas DataFrame
    let isDataFrame = self.pyodide.runPython(\`
import pandas as pd
isinstance(result, pd.DataFrame) if 'result' in locals() and result is not None else False
    \`);
    
    // Check if the last expression evaluated to a DataFrame (Pyodide returns the last expression)
    // We need to verify if 'result' object in JS is a proxy to a DataFrame
    let tableData = null;
    let tableColumns = null;

    if (result && typeof result.toJs === 'function' && result.type === 'DataFrame') {
        // It's likely a dataframe proxy
        // We can convert it to JSON split orientation to send back
        const jsonStr = result.to_json(undefined, "split");
        const parsed = JSON.parse(jsonStr);
        tableColumns = parsed.columns;
        tableData = parsed.data;
    } else if (self.pyodide.runPython("import pandas as pd; isinstance(last_expr, pd.DataFrame)", { globals: self.pyodide.toPy({ last_expr: result }) })) {
         // Fallback check using python check
         const jsonStr = result.to_json(undefined, "split");
         const parsed = JSON.parse(jsonStr);
         tableColumns = parsed.columns;
         tableData = parsed.data;
    }

    self.postMessage({ 
      type: 'RESULT', 
      output: stdout, 
      result: result ? String(result) : null,
      table: tableData ? { columns: tableColumns, data: tableData } : null
    });

  } catch (err) {
    self.postMessage({ type: 'ERROR', error: err.message });
  }
};
`;

let worker: Worker | null = null;
let isReady = false;
let onOutput: ((data: any) => void) | null = null;
let onReady: (() => void) | null = null;

export const initPythonWorker = (readyCallback: () => void) => {
  if (worker) return; // Already initialized

  const blob = new Blob([WORKER_CODE], { type: "application/javascript" });
  worker = new Worker(URL.createObjectURL(blob));

  worker.onmessage = (e) => {
    const { type, output, error, table } = e.data;
    
    if (type === 'READY') {
      isReady = true;
      console.log("Python Worker Ready");
      if (readyCallback) readyCallback();
      if (onReady) onReady();
    } else if (type === 'RESULT') {
      if (onOutput) onOutput({ success: true, output, table });
    } else if (type === 'ERROR') {
      if (onOutput) onOutput({ success: false, error });
    }
  };
};

export const runPythonCode = (code: string): Promise<any> => {
  return new Promise((resolve, reject) => {
    if (!worker || !isReady) {
      reject("O ambiente Python ainda está carregando... Aguarde alguns segundos.");
      return;
    }

    onOutput = (data) => {
      resolve(data);
    };

    worker.postMessage({ code });
  });
};

export const isPythonReady = () => isReady;
