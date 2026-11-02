import { ChangeEvent, useState } from "react";

import type { CsvCustomInputs, CsvLoadInputs } from "../types";

import '../App/styles.css';

interface CsvUploaderProps {
  onDataChange: ({
    filename,
    source,
    isString,
    dateCol,
    targetCol,
    freq,
  }: CsvCustomInputs) => void;
}

export function CsvUploader({ onDataChange }: CsvUploaderProps) {
  const [columns, setColumns] = useState<string[]>([]);
  const [customInputs, setCustomInputs] = useState<CsvCustomInputs>({filename: '', source: '', isString: true, dateCol: '', targetCol: '', freq: 'MS'});


  // Read file and extract headers on selection
  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    let inputs: CsvCustomInputs;
    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      if (!text) return;

      inputs = {...inputs, filename: file.name, source: text, isString: true, freq: 'MS'};

      // Extract the first line for headers
      const firstLine = text.split(/\r?\n/)[0];
      const headers = firstLine
        .split(",")
        .map((h) => h.trim().replace(/^["']|["']$/g, ""));

      setColumns(headers);
      if (headers.length > 0) {
        inputs = {...inputs, dateCol: headers[0], targetCol: headers[1] || headers[0]};
      }

      updateInputs(inputs);
    };
    reader.readAsText(file);
  };

  const handleInputChange = <F extends keyof CsvLoadInputs> (
      field: F,
      value: CsvLoadInputs[F]
    ) => {
    const inputs = {...customInputs, [field]: value};
    updateInputs(inputs);
  };

  function updateInputs(inputs: CsvCustomInputs) {
    setCustomInputs(inputs);
    onDataChange(inputs);
  }

  return (
    <>
      <div className={'controls-header'}>
        <h2 className={'controls-title'}>Upload Custom Demand Dataset</h2>
        <span className={'badge'}>Custom Dataset</span>
      </div>
      <div className={'csv-inputs'}>
        <div className={'custom-csv-upload'}>
          <div className={'field-group'}>
          <label className={'label'}>
            <span>Data Source</span>
          </label>
          <label htmlFor="csv-upload" className={'secondary-button'}>Custom Upload</label>
          <input id="csv-upload" type="file" accept=".csv" onChange={handleFileChange} />
          </div>
          <div className={'custom-csv-grid'}>
            <span>{customInputs.filename}</span>
          </div>
        </div>

        {columns.length > 0 && (
          <div className={'csv-inputs-grid'}>
            <div className={'field-group'}>
              <label className={'label'}>
                Date Column:
                <span className={'hint'}>Dates</span>
              </label>
              <select
                className={'input dropdown'}
                value={customInputs.dateCol}
                onChange={(e) => handleInputChange('dateCol', e.target.value)}
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
                value={customInputs.targetCol}
                onChange={(e) => handleInputChange('targetCol', e.target.value)}
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
                <span className={'hint'}>Periodicity</span>
              </label>
              <select
                className={'input dropdown'}
                value={customInputs.freq}
                onChange={(e) => handleInputChange('freq', e.target.value)}
              >
                <option key={'Annual'} value={'YS'}>Annual</option>
                <option key={'Quarterly'} value={'QS'}>Quarterly</option>
                <option key={'Monthly'} value={'MS'}>Monthly</option>
                <option key={'Weekly'} value={'W'}>Weekly</option>
                <option key={'Daily'} value={'D'}>Daily</option>
              </select>
            </div>
          </div>
        )}
      </div>
    </>
  );
}
