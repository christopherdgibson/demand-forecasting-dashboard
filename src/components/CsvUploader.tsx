import { ChangeEvent, useMemo } from "react";

import type { CsvCustomInputs, ErrorMessage } from "../types";

import '../App/styles.css';

interface CsvUploaderProps {
  csvInputs: CsvCustomInputs;
  onDataChange: ({
    filename,
    source,
    isString,
    dateCol,
    targetCol,
    freq,
  }: CsvCustomInputs) => void;
  onError: (error: ErrorMessage) => void;
}

const headersError: ErrorMessage =  {
  success: false,
  header: 'Parse failure: Headers',
  type: 'parse',
  message: 'Could not read header names from uploaded file. Please check contents or try another file.',
};

function parseHeaders(text: string): { headers: string[]; delimiter: string } {
  const firstLine = text.split(/\r?\n/, 1)[0] ?? '';
  if (!firstLine.trim()) return { headers: [], delimiter: ',' };

  const delimiter = [',', ';', '\t'].reduce(
    (best, d) => (firstLine.split(d).length > firstLine.split(best).length ? d : best),
    ','
  );

  const names = firstLine.split(delimiter).map((h, i) => {
    const name = h.trim().replace(/^["']|["']$/g, '');
    return name || `Unnamed: ${i}`;   // matches how pandas names blank headers
  });

  // Rename duplicate headers
  const seen = new Map<string, number>();
  const headers = names.map((name) => {
    const n = seen.get(name) ?? 0;
    seen.set(name, n + 1);
    return n === 0 ? name : `${name}.${n}`;
  });

  return { headers, delimiter };
}

export function CsvUploader({csvInputs,  onDataChange, onError }: CsvUploaderProps) {
  const source = csvInputs?.source ?? '';
  const columns = useMemo(() => parseHeaders(source).headers, [source]);
  const sameColumn = columns.length > 0 && csvInputs.dateCol === csvInputs.targetCol;

  // Read file and extract headers on selection
  const handleFileChange = async (e: ChangeEvent<HTMLInputElement>) => {
    const input = e.target;
    const file = input.files?.[0];
    if (!file) return;

    const text = (await file.text()).replace(/^\uFEFF/, '');   // strip Excel's BOM
    const parseResult = parseHeaders(text);
    const headers = parseResult.headers;
    if (headers.length === 0) {
      onError(headersError);     
      return;
    }

    onDataChange({
      filename: file.name,
      source: text,
      isString: true,
      delimiter: parseResult.delimiter,
      dateCol: headers[0],
      targetCol: headers[1] ?? headers[0],
      freq: 'MS',
    });
    
    input.value = '';   // lets the user re-select the same file after editing it
  };

  const handleInputChange = <F extends keyof CsvCustomInputs> (
    field: F,
    value: CsvCustomInputs[F]
  ) => {
    const inputs = {...csvInputs, [field]: value};
    onDataChange(inputs);
  };

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
            <span>{csvInputs?.filename}</span>
          </div>
        </div>

        {columns.length > 0 && (
          <>
            <div className="field-note warning" role="status">
              {sameColumn && (
                columns.length === 1
                  ? 'Only one column found. A date column and a demand column are needed. Check the file’s delimiter.'
                  : 'The date and demand columns must be different.')
              }
            </div>
            <div className={'csv-inputs-grid'}>
              <div className={'field-group'}>
                <label className={'label'}>
                  Date Column:
                  <span className={'hint'}>Dates</span>
                </label>
                <select
                  className={'input dropdown'}
                  value={csvInputs?.dateCol}
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
                  value={csvInputs?.targetCol}
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
                  value={csvInputs?.freq}
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
          </>
        )}
      </div>
    </>
  );
}
