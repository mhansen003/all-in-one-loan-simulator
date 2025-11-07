import { useState } from 'react';
import './FileUpload.css'; // Reuse styling

interface AIOProposalInputProps {
  onSubmit: (aioRate: number) => void;
  onBack?: () => void;
}

export default function AIOProposalInput({ onSubmit, onBack }: AIOProposalInputProps) {
  const [aioRate, setAIORate] = useState<string>('8.375');
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = () => {
    const value = parseFloat(aioRate);

    if (isNaN(value) || value <= 0 || value > 20) {
      setError('Please enter a valid interest rate between 0 and 20%');
      return;
    }

    setError(null);
    onSubmit(value);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.replace(/[^0-9.]/g, '');
    setAIORate(value);
    setError(null);
  };

  return (
    <div className="file-upload-container">
      <div className="form-header">
        <h2>✨ All-In-One Loan Proposal</h2>
        <p>
          Enter the proposed All-In-One loan terms to compare against the traditional mortgage.
        </p>
      </div>

      <div className="manual-input-section">
        <div className="input-card">
          <label htmlFor="aioRate" className="input-label">
            <span className="label-text">All-In-One Interest Rate</span>
            <span className="label-hint">Annual interest rate (ARM)</span>
          </label>

          <div className="input-wrapper">
            <input
              type="text"
              id="aioRate"
              value={aioRate}
              onChange={handleInputChange}
              placeholder="8.375"
              className="cash-flow-input"
              style={{ paddingLeft: '1rem' }}
              autoFocus
            />
            <span
              style={{
                position: 'absolute',
                right: '1rem',
                fontSize: '1.25rem',
                fontWeight: 600,
                color: '#4a5568',
                pointerEvents: 'none',
              }}
            >
              %
            </span>
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
            <strong>About the All-In-One Rate</strong>
            <p style={{ marginTop: '0.5rem', lineHeight: '1.6' }}>
              The All-In-One loan typically has a slightly higher interest rate than traditional
              fixed mortgages because it's an adjustable-rate mortgage (ARM). However, the ability to
              offset your principal with your average cash flow balance more than compensates for
              the higher rate.
            </p>
            <ul style={{ marginTop: '0.75rem' }}>
              <li>
                <strong>Typical range:</strong> 7.5% - 9.5% depending on market conditions
              </li>
              <li>
                <strong>Default:</strong> 8.375% (current market average)
              </li>
              <li>The offset benefit typically outweighs the rate difference</li>
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
          disabled={!aioRate || parseFloat(aioRate) <= 0}
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
