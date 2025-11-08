import { useState } from 'react';
import type { CashFlowAnalysis } from '../types';
import CashFlowReviewModal from './CashFlowReviewModal';
import AnalyzingModal from './AnalyzingModal';
import './FileUpload.css';

interface DepositsExpensesInputProps {
  onSubmit: (cashFlowData: {
    monthlyDeposits: number;
    monthlyExpenses: number;
    monthlyLeftover: number;
    depositFrequency: 'monthly' | 'biweekly' | 'weekly';
  }) => void;
  onBack?: () => void;
  mortgageDetails?: {
    currentHousingPayment?: number;
    monthlyPayment?: number;
  };
}

export default function DepositsExpensesInput({ onSubmit, onBack, mortgageDetails }: DepositsExpensesInputProps) {
  const [mode, setMode] = useState<'manual' | 'upload'>('upload');

  // Manual mode state
  const [monthlyDeposits, setMonthlyDeposits] = useState<string>('');
  const [expenseMode, setExpenseMode] = useState<'percentage' | 'itemized'>('percentage');
  const [percentageLeftover, setPercentageLeftover] = useState<string>('40');

  // Itemized expenses
  const [loanPayment, setLoanPayment] = useState<string>(
    mortgageDetails?.monthlyPayment?.toString() || mortgageDetails?.currentHousingPayment?.toString() || ''
  );
  const [taxesInsurance, setTaxesInsurance] = useState<string>('');
  const [otherExpenses, setOtherExpenses] = useState<string>('');

  const [error, setError] = useState<string | null>(null);

  // File upload state
  const [files, setFiles] = useState<File[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysis, setAnalysis] = useState<CashFlowAnalysis | null>(null);
  const [showReviewModal, setShowReviewModal] = useState(false);

  // Calculate monthly leftover based on mode
  const calculateMonthlyLeftover = () => {
    const deposits = parseFloat(monthlyDeposits.replace(/[,$]/g, ''));

    if (isNaN(deposits) || deposits <= 0) return 0;

    if (expenseMode === 'percentage') {
      const percentage = parseFloat(percentageLeftover) / 100;
      return deposits * percentage;
    } else {
      const loan = parseFloat(loanPayment.replace(/[,$]/g, '')) || 0;
      const taxes = parseFloat(taxesInsurance.replace(/[,$]/g, '')) || 0;
      const other = parseFloat(otherExpenses.replace(/[,$]/g, '')) || 0;
      const totalExpenses = loan + taxes + other;
      return deposits - totalExpenses;
    }
  };

  const calculateMonthlyExpenses = () => {
    const deposits = parseFloat(monthlyDeposits.replace(/[,$]/g, ''));

    if (isNaN(deposits) || deposits <= 0) return 0;

    if (expenseMode === 'percentage') {
      const percentage = parseFloat(percentageLeftover) / 100;
      return deposits * (1 - percentage);
    } else {
      const loan = parseFloat(loanPayment.replace(/[,$]/g, '')) || 0;
      const taxes = parseFloat(taxesInsurance.replace(/[,$]/g, '')) || 0;
      const other = parseFloat(otherExpenses.replace(/[,$]/g, '')) || 0;
      return loan + taxes + other;
    }
  };

  const monthlyLeftoverAmount = calculateMonthlyLeftover();
  const monthlyExpensesAmount = calculateMonthlyExpenses();

  const handleManualSubmit = () => {
    const deposits = parseFloat(monthlyDeposits.replace(/[,$]/g, ''));

    if (isNaN(deposits) || deposits <= 0) {
      setError('Please enter valid monthly deposits');
      return;
    }

    if (monthlyLeftoverAmount <= 0) {
      setError('Monthly leftover must be positive. Adjust your expenses or deposits.');
      return;
    }

    if (monthlyLeftoverAmount < 500) {
      setError('Monthly leftover seems too low for AIO loan effectiveness.');
      return;
    }

    setError(null);
    onSubmit({
      monthlyDeposits: deposits,
      monthlyExpenses: monthlyExpensesAmount,
      monthlyLeftover: monthlyLeftoverAmount,
      depositFrequency: 'monthly', // Default for manual entry; AI will detect actual frequency from statements
    });
  };

  const formatCurrency = (value: string): string => {
    if (!value) return '';
    const num = parseFloat(value);
    if (isNaN(num)) return value;
    return num.toLocaleString('en-US', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 2,
    });
  };

  // File upload handlers (same as before)
  const handleFileSelect = async (selectedFiles: FileList | null) => {
    if (!selectedFiles) return;

    const fileArray = Array.from(selectedFiles);
    const processedFiles: File[] = [];

    setError(null);

    for (const file of fileArray) {
      const ext = file.name.toLowerCase();

      if (
        ext.endsWith('.pdf') ||
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

      // Set a timeout for the fetch request (2 minutes)
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 120000);

      const response = await fetch('/api/analyze-statements', {
        method: 'POST',
        body: formData,
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || 'Failed to analyze bank statements');
      }

      const result = await response.json();

      if (!result.cashFlow) {
        throw new Error('Invalid response from server');
      }

      setAnalysis(result.cashFlow);
      setShowReviewModal(true);
    } catch (err: any) {
      console.error('Error analyzing statements:', err);

      let errorMessage = 'Failed to analyze bank statements';
      if (err.name === 'AbortError') {
        errorMessage = 'Analysis timed out. Please try with fewer files or contact support.';
      } else if (err.message) {
        errorMessage = err.message;
      }

      setError(errorMessage);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleReviewConfirm = (updatedAnalysis: CashFlowAnalysis) => {
    setShowReviewModal(false);
    // Submit with detailed breakdown from AI
    onSubmit({
      monthlyDeposits: updatedAnalysis.monthlyDeposits || updatedAnalysis.totalIncome,
      monthlyExpenses: updatedAnalysis.monthlyExpenses || updatedAnalysis.totalExpenses,
      monthlyLeftover: updatedAnalysis.netCashFlow,
      depositFrequency: updatedAnalysis.depositFrequency || 'monthly',
    });
  };

  const handleReviewCancel = () => {
    setShowReviewModal(false);
  };

  return (
    <>
      <div className="file-upload-container">
        <div className="form-header">
          <h2>💰 Income & Expenses Breakdown</h2>
          <p>
            Tell us about your monthly deposits and expenses. We'll calculate how much leftover cash flow you have to accelerate your loan payoff.
          </p>
        </div>

        {/* Mode Toggle */}
        <div className="mode-toggle">
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
        </div>

        {/* Manual Mode */}
        {mode === 'manual' && (
          <div className="manual-input-section">
            {/* Step 1: Monthly Deposits */}
            <div className="input-card">
              <label htmlFor="monthlyDeposits" className="input-label">
                <span className="label-text">Monthly Deposits (Income)</span>
                <span className="label-hint">Total amount deposited into your account each month</span>
              </label>

              <div className="input-wrapper">
                <span className="input-prefix">$</span>
                <input
                  type="text"
                  id="monthlyDeposits"
                  value={formatCurrency(monthlyDeposits)}
                  onChange={(e) => {
                    const value = e.target.value.replace(/[^0-9.]/g, '');
                    setMonthlyDeposits(value);
                    setError(null);
                  }}
                  placeholder="12,000"
                  className="cash-flow-input"
                  autoFocus
                />
              </div>
            </div>

            {/* Step 2: Expenses Mode Selection */}
            <div className="input-card">
              <label className="input-label">
                <span className="label-text">How would you like to enter expenses?</span>
              </label>

              <div className="expense-mode-toggle">
                <button
                  type="button"
                  className={`expense-mode-btn ${expenseMode === 'percentage' ? 'active' : ''}`}
                  onClick={() => setExpenseMode('percentage')}
                >
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 12l3-3 3 3 4-4M8 21l4-4 4 4M3 4h18M4 4h16v12a1 1 0 01-1 1H5a1 1 0 01-1-1V4z" />
                  </svg>
                  Percentage Leftover
                </button>
                <button
                  type="button"
                  className={`expense-mode-btn ${expenseMode === 'itemized' ? 'active' : ''}`}
                  onClick={() => setExpenseMode('itemized')}
                >
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
                  </svg>
                  Itemized Detail
                </button>
              </div>
            </div>

            {/* Step 3a: Percentage Mode */}
            {expenseMode === 'percentage' && (
              <div className="input-card">
                <label htmlFor="percentageLeftover" className="input-label">
                  <span className="label-text">Percentage Leftover After Expenses</span>
                  <span className="label-hint">What % of deposits remains after all expenses?</span>
                </label>

                <div className="input-wrapper">
                  <input
                    type="number"
                    id="percentageLeftover"
                    value={percentageLeftover}
                    onChange={(e) => {
                      setPercentageLeftover(e.target.value);
                      setError(null);
                    }}
                    placeholder="40"
                    className="cash-flow-input"
                    min="0"
                    max="100"
                    style={{ paddingLeft: '1rem' }}
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
              </div>
            )}

            {/* Step 3b: Itemized Mode */}
            {expenseMode === 'itemized' && (
              <>
                <div className="input-card">
                  <label htmlFor="loanPayment" className="input-label">
                    <span className="label-text">Comparison Loan Payment</span>
                    <span className="label-hint">Your current/comparison mortgage payment</span>
                  </label>

                  <div className="input-wrapper">
                    <span className="input-prefix">$</span>
                    <input
                      type="text"
                      id="loanPayment"
                      value={formatCurrency(loanPayment)}
                      onChange={(e) => {
                        const value = e.target.value.replace(/[^0-9.]/g, '');
                        setLoanPayment(value);
                        setError(null);
                      }}
                      placeholder="4,167"
                      className="cash-flow-input"
                    />
                  </div>
                </div>

                <div className="input-card">
                  <label htmlFor="taxesInsurance" className="input-label">
                    <span className="label-text">Taxes & Insurance</span>
                    <span className="label-hint">Monthly property tax and insurance costs</span>
                  </label>

                  <div className="input-wrapper">
                    <span className="input-prefix">$</span>
                    <input
                      type="text"
                      id="taxesInsurance"
                      value={formatCurrency(taxesInsurance)}
                      onChange={(e) => {
                        const value = e.target.value.replace(/[^0-9.]/g, '');
                        setTaxesInsurance(value);
                        setError(null);
                      }}
                      placeholder="1,025"
                      className="cash-flow-input"
                    />
                  </div>
                </div>

                <div className="input-card">
                  <label htmlFor="otherExpenses" className="input-label">
                    <span className="label-text">Other Monthly Expenses</span>
                    <span className="label-hint">All other recurring expenses (utilities, groceries, etc.)</span>
                  </label>

                  <div className="input-wrapper">
                    <span className="input-prefix">$</span>
                    <input
                      type="text"
                      id="otherExpenses"
                      value={formatCurrency(otherExpenses)}
                      onChange={(e) => {
                        const value = e.target.value.replace(/[^0-9.]/g, '');
                        setOtherExpenses(value);
                        setError(null);
                      }}
                      placeholder="2,008"
                      className="cash-flow-input"
                    />
                  </div>
                </div>
              </>
            )}

            {/* Calculated Summary */}
            {monthlyDeposits && (
              <div className="calculated-summary">
                <h3>💡 Calculated Monthly Cash Flow</h3>
                <div className="summary-grid">
                  <div className="summary-item">
                    <span className="summary-label">Monthly Deposits:</span>
                    <span className="summary-value">${formatCurrency(monthlyDeposits)}</span>
                  </div>
                  <div className="summary-item">
                    <span className="summary-label">Monthly Expenses:</span>
                    <span className="summary-value expense">${formatCurrency(monthlyExpensesAmount.toString())}</span>
                  </div>
                  <div className="summary-item highlight">
                    <span className="summary-label">Monthly Leftover:</span>
                    <span className="summary-value income">${formatCurrency(monthlyLeftoverAmount.toString())}</span>
                  </div>
                </div>
                <p className="summary-hint">
                  This leftover amount will be applied to your loan principal each month, accelerating payoff!
                </p>
              </div>
            )}

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
                <strong>How the AIO Loan Works:</strong>
                <p style={{ marginTop: '0.5rem', lineHeight: '1.6' }}>
                  Your monthly deposits immediately offset your loan principal, dramatically reducing the interest you pay. Your monthly leftover permanently reduces the principal balance each month.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Upload Mode - Keep existing implementation */}
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
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                  <h3 style={{ margin: 0 }}>Uploaded Files ({files.length})</h3>

                  {/* Analyze Button - Top Position */}
                  <button
                    type="button"
                    onClick={handleAnalyzeStatements}
                    disabled={isAnalyzing}
                    style={{
                      background: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)',
                      color: 'white',
                      border: 'none',
                      borderRadius: '12px',
                      padding: '0.75rem 1.5rem',
                      fontSize: '1rem',
                      fontWeight: 600,
                      cursor: isAnalyzing ? 'not-allowed' : 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.5rem',
                      boxShadow: '0 4px 6px -1px rgba(59, 130, 246, 0.3), 0 2px 4px -2px rgba(59, 130, 246, 0.2)',
                      transition: 'all 0.2s ease',
                      opacity: isAnalyzing ? 0.6 : 1,
                    }}
                    onMouseEnter={(e) => {
                      if (!isAnalyzing) {
                        e.currentTarget.style.transform = 'translateY(-2px)';
                        e.currentTarget.style.boxShadow = '0 10px 15px -3px rgba(59, 130, 246, 0.4), 0 4px 6px -4px rgba(59, 130, 246, 0.3)';
                      }
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.transform = 'translateY(0)';
                      e.currentTarget.style.boxShadow = '0 4px 6px -1px rgba(59, 130, 246, 0.3), 0 2px 4px -2px rgba(59, 130, 246, 0.2)';
                    }}
                  >
                    <svg
                      style={{ width: '20px', height: '20px' }}
                      xmlns="http://www.w3.org/2000/svg"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"
                      />
                    </svg>
                    Analyze {files.length} {files.length === 1 ? 'Page' : 'Pages'} with AI
                  </button>
                </div>

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
              <div className="alert alert-error" style={{
                padding: '1rem',
                background: '#fef2f2',
                border: '2px solid #fecaca',
                borderRadius: '12px',
                marginBottom: '1rem',
                animation: 'fadeIn 0.3s ease'
              }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.75rem' }}>
                  <svg
                    style={{ width: '24px', height: '24px', color: '#dc2626', flexShrink: 0 }}
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                    />
                  </svg>
                  <div>
                    <strong style={{ color: '#dc2626', display: 'block', marginBottom: '0.25rem' }}>
                      Analysis Error
                    </strong>
                    <span style={{ color: '#991b1b' }}>{error}</span>
                  </div>
                </div>
              </div>
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
                  Our AI will analyze your bank statements to automatically calculate your deposits vs expenses.
                </p>
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
              disabled={!monthlyDeposits || monthlyLeftoverAmount <= 0}
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

      {/* Analyzing Modal */}
      {isAnalyzing && <AnalyzingModal fileCount={files.length} />}

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
