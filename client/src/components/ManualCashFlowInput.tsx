import { useState } from 'react';
import './FileUpload.css'; // Reuse the same styling

interface ManualCashFlowInputProps {
  onSubmit: (averageMonthlyCashFlow: number) => void;
  onBack?: () => void;
}

export default function ManualCashFlowInput({ onSubmit, onBack }: ManualCashFlowInputProps) {
  const [cashFlow, setCashFlow] = useState<string>('');
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = () => {
    const value = parseFloat(cashFlow.replace(/[,$]/g, ''));

    if (isNaN(value) || value <= 0) {
      setError('Please enter a valid positive number');
      return;
    }

    if (value < 500) {
      setError('Average monthly cash flow seems too low. Please verify.');
      return;
    }

    setError(null);
    onSubmit(value);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.replace(/[^0-9.]/g, '');
    setCashFlow(value);
    setError(null);
  };

  const formatDisplay = (value: string): string => {
    if (!value) return '';
    const num = parseFloat(value);
    if (isNaN(num)) return value;
    return num.toLocaleString('en-US', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 2,
    });
  };

  return (
    <div className="file-upload-container">
      <div className="form-header">
        <h2>💰 Enter Your Average Monthly Cash Flow</h2>
        <p>
          For now, manually enter your average monthly cash flow. This is the amount that
          "floats" in your account each month after all expenses are paid.
        </p>
        <p style={{ fontSize: '0.875rem', color: '#666', marginTop: '0.5rem' }}>
          <strong>Note:</strong> Once you have your OpenRouter API key, you'll be able to upload
          bank statements for automatic analysis.
        </p>
      </div>

      <div className="manual-input-section">
        <div className="input-card">
          <label htmlFor="cashFlow" className="input-label">
            <span className="label-text">Average Monthly Cash Flow</span>
            <span className="label-hint">Amount available to offset loan principal</span>
          </label>

          <div className="input-wrapper">
            <span className="input-prefix">$</span>
            <input
              type="text"
              id="cashFlow"
              value={formatDisplay(cashFlow)}
              onChange={handleInputChange}
              placeholder="5,000"
              className="cash-flow-input"
              autoFocus
            />
          </div>

          {error && (
            <div className="input-error">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
              {error}
            </div>
          )}
        </div>

        <div className="upload-info-box">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
          <div>
            <strong>What is "Average Monthly Cash Flow"?</strong>
            <p style={{ marginTop: '0.5rem', lineHeight: '1.6' }}>
              This is the average amount of money that sits in your checking account each month
              after all income is deposited and all expenses are paid. With an AIO loan, this
              amount acts as an offset against your principal balance, reducing the interest you
              pay and accelerating your payoff.
            </p>
            <ul style={{ marginTop: '0.75rem' }}>
              <li>
                <strong>Example:</strong> If you typically have $3,000-$7,000 floating in your
                account, your average might be around $5,000
              </li>
              <li>This money is still accessible for your daily expenses</li>
              <li>The higher your average balance, the faster you'll pay off your loan</li>
            </ul>
          </div>
        </div>
      </div>

      <div className="form-actions">
        {onBack && (
          <button type="button" className="btn-secondary" onClick={onBack}>
            <svg
              className="btn-icon"
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Back
          </button>
        )}
        <button
          type="button"
          className="btn-primary"
          onClick={handleSubmit}
          disabled={!cashFlow || parseFloat(cashFlow) <= 0}
        >
          Continue to Comparison
          <svg
            className="btn-icon"
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </button>
      </div>
    </div>
  );
}
