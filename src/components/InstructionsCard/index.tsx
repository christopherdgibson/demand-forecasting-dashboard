import { useId, useState } from 'react';

import './styles.css';

export function InstructionsCard() {
  const [isExpanded, setIsExpanded] = useState(true);
  const contentId = useId();

  return (
    <section className="guide-container">
      <div className="guide-header">
        <h3 className="guide-title">📊 Demand Forecasting Dashboard Guide</h3>
        <button
          className="guide-button"
          onClick={() => setIsExpanded((prev) => !prev)}
          aria-expanded={isExpanded}
          aria-controls={contentId}
        >
          {isExpanded ? 'Hide guide' : 'Show guide'}
          <svg
            className={isExpanded ? 'dropdown-arrow expanded' : 'dropdown-arrow'}
            viewBox="0 0 12 12"
            aria-hidden="true"
          >
            <path d="M2 4l4 5 4-5" />
          </svg>
        </button>
      </div>

      <div
        id={contentId}
        className={isExpanded ? 'guide-content expanded' : 'guide-content'}
      >
        <div className="guide-inner">
          <p className="guide-intro">
            Welcome to the serverless demand forecasting dashboard! Use this tool to analyze time-series patterns, generate predictions, and experiment with different statistical models entirely in your browser.
          </p>

          <h4 className="guide-subheader">📁 Datasets</h4>
          <ul className="guide-list">
            <li><strong>Sample Datasets:</strong> Quickly load built-in public datasets (such as FRED US Retail Sales and regional benchmarks) to test model behavior.</li>
            <li><strong>Custom CSV Upload:</strong> Upload your own CSV file, then use the interactive header selectors to specify your date column and target demand column.</li>
          </ul>

          <h4 className="guide-subheader">🎛️ Adjustable Controls</h4>
          <ul className="guide-list">
            <li><strong>Model Type:</strong> Switch between <strong>ETS</strong> (Error-Trend-Seasonal), <strong>SARIMAX</strong>, and <strong>Theta</strong> models to compare forecasting trajectories.</li>
            <li><strong>Confidence Level (α):</strong> Adjust the uncertainty bounds (prediction intervals) displayed around the forecast line.</li>
            <li><strong>Historic Horizon:</strong> Limit the number of past periods displayed on the graph for cleaner viewing (note: your entire historical dataset is always utilized under the hood for fitting).</li>
            <li><strong>Prediction Horizon:</strong> Set the number of future steps (months, quarters, weeks, or days) you want the models to forecast.</li>
          </ul>
        </div>
      </div>
    </section>
  );
}
