import { ChangeEvent, useEffect, useState } from "react";

import type { CsvLoadInputs } from "../types";

import '../App/styles.css';

interface CsvUploaderProps {
  isSample: boolean;
  onDataReady: ({
    source,
    isString,
    dateCol,
    targetCol,
    freq,
  }: CsvLoadInputs) => void;
}

export function CsvUploader({ isSample, onDataReady }: CsvUploaderProps) {
  const [columns, setColumns] = useState<string[]>([]);
  const [csvContent, setCsvContent] = useState<string>("");
  const [selectedDateCol, setSelectedDateCol] = useState<string>("");
  const [selectedTargetCol, setSelectedTargetCol] = useState<string>("");
  const [selectedFreq, setSelectedFreq] = useState<string>("MS");
  const [isCurrentData, setIsCurrentData] = useState<boolean>(false);
  const [selectedFileName, setSelectedFileName] = useState<string>("");

  useEffect(() => {
    setIsCurrentData(false);
  }, [csvContent, selectedDateCol, selectedTargetCol, selectedFreq]);

  useEffect(() => {
    setIsCurrentData(!isSample);
  }, [isSample]);

  // Read file and extract headers on selection
  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      if (!text) return;

      setCsvContent(text);
      setSelectedFileName(file.name);

      // Extract the first line for headers
      const firstLine = text.split(/\r?\n/)[0];
      const headers = firstLine
        .split(",")
        .map((h) => h.trim().replace(/^["']|["']$/g, ""));

      setColumns(headers);
      if (headers.length > 0) {
        setSelectedDateCol(headers[0]); // Default guess
        setSelectedTargetCol(headers[1] || headers[0]);
      }
    };
    reader.readAsText(file);
  };

  // Submit the final mapping and full text to Pyodide
  const handleSubmit = () => {
    if (!csvContent || !selectedDateCol || !selectedTargetCol || !selectedFreq) {
      return;
    }
    onDataReady({
      source: csvContent,
      isString: true,
      dateCol: selectedDateCol,
      targetCol: selectedTargetCol,
      freq: selectedFreq,
    });

    setIsCurrentData(true);
  };

  return (
    <>
      <div className={'controls-header'}>
        <h2 className={'controls-title'}>Upload Custom Demand Dataset</h2>
        <span className={'badge'}>Custom Dataset</span>
      </div>
      <div className={'csv-inputs'}>
        <div className={'custom-csv-upload'}>
          <label htmlFor="csv-upload" className={'secondary-button'}>Custom Upload</label>
          <input id="csv-upload" type="file" accept=".csv" onChange={handleFileChange} />
          {selectedFileName}
        </div>

        {columns.length > 0 && (
          <>
            <div className={'csv-inputs-grid'}>
              <div className={'field-group'}>
                <label className={'label'}>
                  Date Column:
                  <span className={'hint'}>Dates</span>
                </label>
                <select
                  className={`${'input'} ${'dropdown'}`}
                  value={selectedDateCol}
                  onChange={(e) => setSelectedDateCol(e.target.value)}
                >
                  {columns.map((col) => (
                    <option key={col} value={col}>
                      {col}
                    </option>
                  ))}
                </select>
              </div>

              <div className={'field-group'}>
                <label className={'label'}>
                  Demand / Target Column:
                  <span className={'hint'}>Data Values</span>
                </label>
                <select
                  className={'input dropdown'}
                  value={selectedTargetCol}
                  onChange={(e) => setSelectedTargetCol(e.target.value)}
                >
                  {columns.map((col) => (
                    <option key={col} value={col}>
                      {col}
                    </option>
                  ))}
                </select>
              </div>
              <div className={'field-group'}>
                <label className={'label'}>
                  Frequency:
                  <span className={'hint'}>Data Values</span>
                </label>
                <select
                  className={'input dropdown'}
                  value={selectedFreq}
                  onChange={(e) => setSelectedFreq(e.target.value)}
                >
                  <option key={'Annual'} value={'A'}>Annual</option>
                  <option key={'Quarterly'} value={'QS'}>Quarterly</option>
                  <option key={'Monthly'} value={'MS'}>Monthly</option>
                  <option key={'Weekly'} value={'W'}>Weekly</option>
                  <option key={'Daily'} value={'D'}>Daily</option>
                </select>
              </div>
            </div>
            <div className={'actions'}>
              <button
                className={'secondary-button'}
                disabled={isCurrentData}
                onClick={handleSubmit}
              >
                {isCurrentData ? "Updated" : "Update Data"}
              </button>
            </div>
          </>
        )}
      </div>
    </>
  );
}
