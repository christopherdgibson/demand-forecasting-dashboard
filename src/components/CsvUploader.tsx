import { ChangeEvent, useEffect, useState } from "react";

import type { CsvLoadInputs } from "../types";

import styles from "./Controls/Controls.module.css";
import chartStyles from "./ForecastChart/ForecastChart.module.css";

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
    <div className={chartStyles.chartCard}>
      <div className={styles.header}>
        <h2 className={styles.title}>Upload Custom Demand Dataset</h2>
        <span className={styles.badge}>Custom Dataset</span>
      </div>
      <input type="file" accept=".csv" onChange={handleFileChange} />

      {columns.length > 0 && (
        <>
          <div className={styles.grid}>
            <div className={styles.fieldGroup}>
              <label className={styles.label}>
                Date Column:
                <span className={styles.hint}>Dates</span>
              </label>
              <select
                className={`${styles.input} ${styles.dropdown}`}
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

            <div className={styles.fieldGroup}>
              <label className={styles.label}>
                Demand / Target Column:
                <span className={styles.hint}>Data Values</span>
              </label>
              <select
                className={`${styles.input} ${styles.dropdown}`}
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
            <div className={styles.fieldGroup}>
              <label className={styles.label}>
                Frequency:
                <span className={styles.hint}>Data Values</span>
              </label>
              <select
                className={`${styles.input} ${styles.dropdown}`}
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
          <div className={styles.actions}>
            <button
              className={styles.primaryButton}
              disabled={isCurrentData}
              onClick={handleSubmit}
            >
              {isCurrentData ? "Updated" : "Update Data"}
            </button>
          </div>
        </>
      )}
    </div>
  );
}
