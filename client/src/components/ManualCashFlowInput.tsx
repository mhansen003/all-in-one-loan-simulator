import { useState } from 'react';
import type { CashFlowAnalysis } from '../types';
import CashFlowReviewModal from './CashFlowReviewModal';
import { convertPdfToImages } from '../utils/pdfConverter';
import './FileUpload.css';

interface ManualCashFlowInputProps {
  onSubmit: (averageMonthlyCashFlow: number) => void;
  onBack?: () => void;
  mortgageDetails?: {
    currentHousingPayment?: number;
  };
}

export default function ManualCashFlowInput({ onSubmit, onBack, mortgageDetails }: ManualCashFlowInputProps) {
  const [mode, setMode] = useState<'manual' | 'upload'>('manual');
  const [cashFlow, setCashFlow] = useState<string>('');
  const [error, setError] = useState<string | null>(null);

  // File upload state
  const [files, setFiles] = useState<File[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysis, setAnalysis] = useState<CashFlowAnalysis | null>(null);
  const [showReviewModal, setShowReviewModal] = useState(false);

  const handleManualSubmit = () => {
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

  // File upload handlers
  const handleFileSelect = async (selectedFiles: FileList | null) => {
    if (!selectedFiles) return;

    const fileArray = Array.from(selectedFiles);
    const processedFiles: File[] = [];

    setError(null);

    for (const file of fileArray) {
      const ext = file.name.toLowerCase();

      if (ext.endsWith('.pdf')) {
        try {
          // Convert PDF to images client-side
          const images = await convertPdfToImages(file);
          processedFiles.push(...images);
        } catch (err) {
          console.error('Error converting PDF:', err);
          setError(`Failed to convert ${file.name}. Please try another file.`);
        }
      } else if (
        ext.endsWith('.jpg') ||
        ext.endsWith('.jpeg') ||
        ext.endsWith('.png') ||
        ext.endsWith('.csv') ||
        ext.endsWith('.xlsx') ||
        ext.endsWith('.xls')
      ) {
        processedFiles.push(file);
      } else {
        setError(`Unsupported file type: ${file.name}`);
      }
    }

    setFiles((prev) => [...prev, ...processedFiles]);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    handleFileSelect(e.dataTransfer.files);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const removeFile = (index: number) => {
    setFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const handleAnalyzeStatements = async () => {
    if (files.length === 0) {
      setError('Please upload at least one bank statement');
      return;
    }

    setError(null);
    setIsAnalyzing(true);

    try {
      const formData = new FormData();
      files.forEach((file) => {
        formData.append('files', file);
      });
      formData.append('currentHousingPayment', (mortgageDetails?.currentHousingPayment || 0).toString());

      const response = await fetch('/api/analyze-statements', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        throw new Error('Failed to analyze bank statements');
      }

      const result = await response.json();
      setAnalysis(result.cashFlow);
      setShowReviewModal(true);
    } catch (err: any) {
      console.error('Error analyzing statements:', err);
      setError(err.message || 'Failed to analyze bank statements');
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleReviewConfirm = (updatedAnalysis: CashFlowAnalysis) => {
    setShowReviewModal(false);
    // Submit the net cash flow from the analysis
    onSubmit(updatedAnalysis.netCashFlow);
  };

  const handleReviewCancel = () => {
    setShowReviewModal(false);
  };

  return (
    <>
      <div className="file-upload-container">
        <div className="form-header">
          <h2>💰 Determine Your Average Monthly Cash Flow</h2>
          <p>
            Choose how you'd like to calculate your cash flow: manually enter an estimate or upload
            bank statements for AI-powered analysis.
          </p>
        </div>

        {/* Mode Toggle */}
        <div className="mode-toggle">
          <button
            type="button"
            className={`mode-btn ${mode === 'manual' ? 'active' : ''}`}
            onClick={() => setMode('manual')}
          >
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
                d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
              />
            </svg>
            Manual Entry
          </button>
          <button
            type="button"
            className={`mode-btn ${mode === 'upload' ? 'active' : ''}`}
            onClick={() => setMode('upload')}
          >
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
                d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
              />
            </svg>
            Upload Bank Statements
          </button>
        </div>

        {/* Manual Mode */}
        {mode === 'manual' && (
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
                  after all income is deposited and all expenses are paid.
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
        )}

        {/* Upload Mode */}
        {mode === 'upload' && (
          <div className="manual-input-section">
            <div
              className={`upload-area ${isDragging ? 'dragging' : ''} ${files.length > 0 ? 'has-files' : ''}`}
              onDrop={handleDrop}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
            >
              <input
                type="file"
                id="fileInput"
                multiple
                accept=".pdf,.csv,.xlsx,.xls,.jpg,.jpeg,.png"
                onChange={(e) => handleFileSelect(e.target.files)}
                style={{ display: 'none' }}
              />
              <label htmlFor="fileInput" className="upload-label">
                <svg
                  className="upload-icon"
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
                  />
                </svg>
                <span className="upload-text">
                  Drag & drop bank statements here, or <span className="upload-link">browse</span>
                </span>
                <span className="upload-hint">
                  Supports PDF, CSV, Excel, and images • Upload 3-12 months of statements
                </span>
              </label>
            </div>

            {files.length > 0 && (
              <div className="files-list">
                <h3>Uploaded Files ({files.length})</h3>
                {files.map((file, index) => (
                  <div key={index} className="file-item">
                    <svg
                      className="file-icon"
                      xmlns="http://www.w3.org/2000/svg"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                      />
                    </svg>
                    <span className="file-name">{file.name}</span>
                    <span className="file-size">{(file.size / 1024).toFixed(0)} KB</span>
                    <button
                      type="button"
                      className="file-remove"
                      onClick={() => removeFile(index)}
                      aria-label="Remove file"
                    >
                      ×
                    </button>
                  </div>
                ))}
              </div>
            )}

            {error && (
              <div className="alert alert-error">
                <strong>Error:</strong> {error}
              </div>
            )}

            {files.length > 0 && (
              <button
                type="button"
                className="btn-primary"
                onClick={handleAnalyzeStatements}
                disabled={isAnalyzing}
                style={{ width: '100%', marginTop: '1rem' }}
              >
                {isAnalyzing ? (
                  <>
                    <div className="spinner-small"></div>
                    Analyzing Statements...
                  </>
                ) : (
                  <>
                    <svg
                      className="btn-icon"
                      xmlns="http://www.w3.org/2000/svg"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4"
                      />
                    </svg>
                    Analyze with AI
                  </>
                )}
              </button>
            )}

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
                <strong>How it works:</strong>
                <p style={{ marginTop: '0.5rem', lineHeight: '1.6' }}>
                  Our AI will analyze your bank statements to:
                </p>
                <ul style={{ marginTop: '0.75rem' }}>
                  <li>Categorize income and expenses month by month</li>
                  <li>Identify and flag irregular or luxury transactions</li>
                  <li>Calculate your average recurring cash flow</li>
                  <li>Let you review and exclude any anomalies</li>
                </ul>
              </div>
            </div>
          </div>
        )}

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
          {mode === 'manual' && (
            <button
              type="button"
              className="btn-primary"
              onClick={handleManualSubmit}
              disabled={!cashFlow || parseFloat(cashFlow) <= 0}
            >
              Continue to AIO Proposal
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
          )}
        </div>
      </div>

      {/* Review Modal */}
      {showReviewModal && analysis && (
        <CashFlowReviewModal
          analysis={analysis}
          onConfirm={handleReviewConfirm}
          onCancel={handleReviewCancel}
        />
      )}
    </>
  );
}
