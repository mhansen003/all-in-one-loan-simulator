import { useEffect, useState } from 'react';
import './AnalyzingModal.css';

interface AnalyzingModalProps {
  fileCount: number;
  batchProgress?: { current: number; total: number; message: string; phase?: string } | null;
  onAbort?: () => void;
}

type BatchStatus = 'waiting' | 'processing' | 'completed';

export default function AnalyzingModal({ fileCount, batchProgress, onAbort }: AnalyzingModalProps) {
  const [currentStep, setCurrentStep] = useState(0);
  const [currentTip, setCurrentTip] = useState(0);

  // Calculate batch status based on current progress (controlled concurrency: 2 at a time)
  const getBatchStatus = (batchIndex: number): BatchStatus => {
    if (!batchProgress) return 'processing';

    const current = batchProgress.current;
    const batchNumber = batchIndex + 1;

    // Completed batches
    if (batchNumber <= current) {
      return 'completed';
    }

    // Currently processing (2 at a time)
    if (batchNumber <= current + 2) {
      return 'processing';
    }

    // Waiting batches
    return 'waiting';
  };

  const steps = [
    { label: 'Extracting text from documents', duration: 3000 },
    { label: 'Analyzing transactions', duration: 4000 },
    { label: 'Detecting deposit patterns', duration: 2500 },
    { label: 'Calculating monthly averages', duration: 2000 },
    { label: 'Flagging irregular transactions', duration: 2500 },
    { label: 'Finalizing analysis', duration: 2000 },
  ];

  const tips = [
    {
      title: "📄 Extracting Text from PDFs",
      content: "Our AI uses advanced OCR (Optical Character Recognition) to extract text from your bank statements, even from scanned images or complex PDF layouts."
    },
    {
      title: "🔍 Parsing Transaction Data",
      content: "The AI identifies transaction dates, descriptions, amounts, and balances from unstructured text, handling various bank statement formats automatically."
    },
    {
      title: "🧠 Pattern Recognition",
      content: "Machine learning algorithms scan across all months to detect repeating deposits and expenses, identifying your consistent income sources and spending patterns."
    },
    {
      title: "💰 Income Detection",
      content: "The AI looks for payroll deposits, self-employment income, rental income, and investment distributions that appear 2+ times across your statements."
    },
    {
      title: "🏷️ Smart Categorization",
      content: "Each transaction is intelligently categorized as income, expense, or one-time based on description keywords, amounts, and frequency patterns."
    },
    {
      title: "📊 Cash Flow Calculation",
      content: "The system calculates your monthly averages, net cash flow, and deposit frequency to determine your financial suitability for an AIO loan."
    },
    {
      title: "🚨 Fraud Detection",
      content: "Advanced algorithms flag unusual transactions, large one-time deposits, and potential duplicates to ensure accurate cash flow analysis."
    },
    {
      title: "⚡ Batch Processing",
      content: "We process 2 batches simultaneously with automatic retry logic to handle large uploads quickly while staying within API rate limits."
    },
  ];

  useEffect(() => {
    let stepTimeout: NodeJS.Timeout;

    const cycleSteps = () => {
      let currentIndex = 0;

      const nextStep = () => {
        if (currentIndex < steps.length) {
          setCurrentStep(currentIndex);
          currentIndex++;
          stepTimeout = setTimeout(nextStep, steps[currentIndex - 1]?.duration || 2000);
        }
      };

      nextStep();
    };

    cycleSteps();

    return () => {
      clearTimeout(stepTimeout);
    };
  }, []);

  // Rotate through tips every 6 seconds
  useEffect(() => {
    const tipInterval = setInterval(() => {
      setCurrentTip((prev) => (prev + 1) % tips.length);
    }, 6000);

    return () => clearInterval(tipInterval);
  }, []);

  return (
    <div className="analyzing-overlay">
      <div className="analyzing-modal">
        {/* AI Brain Animation */}
        <div className="ai-brain-container">
          <div className="ai-brain">
            <div className="brain-pulse"></div>
            <div className="brain-pulse pulse-2"></div>
            <div className="brain-pulse pulse-3"></div>
            <svg
              className="brain-icon"
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
              />
            </svg>
          </div>
        </div>

        {/* Content */}
        <div className="analyzing-content">
          <h2 className="analyzing-title">🤖 AI Analysis in Progress</h2>
          <p className="analyzing-subtitle">
            Analyzing {fileCount} {fileCount === 1 ? 'document' : 'documents'} with advanced AI
          </p>

          {/* Knight Rider Progress Bar */}
          <div className="progress-container">
            <div className="progress-bar knight-rider">
              <div className="knight-rider-bar"></div>
            </div>
          </div>

          <p className="analyzing-note">
            Sit back, this might take a few minutes...
          </p>

          {/* Current Step or Batch Progress */}
          <div className="current-step">
            {batchProgress ? (
              <div className="batch-progress-container">
                {/* Extraction Phase: Show batch grid (small number of files) */}
                {batchProgress.phase === 'extraction' && (
                  <>
                    <div className="batch-header">
                      Processing Files (2 at a time)
                    </div>
                    <div className="batch-progress-summary">
                      <span className="progress-label">Completed:</span>
                      <span className="progress-count">
                        {batchProgress.current} / {batchProgress.total} files
                      </span>
                    </div>
                    <div className="batch-grid">
                      {Array.from({ length: batchProgress.total }, (_, i) => {
                        const status = getBatchStatus(i);
                        return (
                          <div key={i} className={`batch-item batch-${status}`}>
                            <div className="batch-icon">
                              {status === 'completed' ? '✅' : status === 'processing' ? '📦' : '⏳'}
                            </div>
                            <div className="batch-label">File {i + 1}</div>
                            {status === 'processing' && <div className="batch-spinner"></div>}
                            {status === 'completed' && <div className="batch-checkmark">Done</div>}
                            {status === 'waiting' && <div className="batch-waiting">Queued</div>}
                          </div>
                        );
                      })}
                    </div>
                  </>
                )}

                {/* Categorization Phase: Show simple progress bar (large number of chunks) */}
                {batchProgress.phase === 'categorization' && (
                  <>
                    <div className="batch-header">
                      🏷️ Categorizing Transactions
                    </div>
                    <div className="simple-progress-container">
                      <div className="simple-progress-bar">
                        <div
                          className="simple-progress-fill"
                          style={{ width: `${(batchProgress.current / batchProgress.total) * 100}%` }}
                        ></div>
                      </div>
                      <div className="simple-progress-text">
                        Processing chunk {batchProgress.current} of {batchProgress.total}
                      </div>
                      <div className="simple-progress-percentage">
                        {Math.round((batchProgress.current / batchProgress.total) * 100)}% complete
                      </div>
                    </div>
                  </>
                )}

                {/* Aggregation Phase: Show simple message */}
                {batchProgress.phase === 'aggregation' && (
                  <>
                    <div className="batch-header">
                      📊 Finalizing Analysis
                    </div>
                    <div className="simple-progress-text">
                      Aggregating results and calculating totals...
                    </div>
                  </>
                )}

                {/* Legacy: No phase specified, use old behavior */}
                {!batchProgress.phase && (
                  <>
                    <div className="batch-header">
                      Processing Batches (2 at a time)
                    </div>
                    <div className="batch-progress-summary">
                      <span className="progress-label">Completed:</span>
                      <span className="progress-count">
                        {batchProgress.current} / {batchProgress.total} batches
                      </span>
                    </div>
                  </>
                )}
              </div>
            ) : (
              <div className="step-indicator">
                <span className="step-icon">✨</span>
                <span className="step-text">{steps[currentStep]?.label}</span>
              </div>
            )}
          </div>

          {/* AI Processing Tips Carousel */}
          <div className="tips-carousel">
            <div className="tip-content-wrapper">
              <div className="tip-icon">{tips[currentTip].title.split(' ')[0]}</div>
              <div className="tip-text">
                <h4 className="tip-title">{tips[currentTip].title}</h4>
                <p className="tip-description">{tips[currentTip].content}</p>
              </div>
            </div>
            <div className="tip-dots">
              {tips.map((_, index) => (
                <div
                  key={index}
                  className={`tip-dot ${index === currentTip ? 'active' : ''}`}
                />
              ))}
            </div>
          </div>

          {/* Abort Button */}
          {onAbort && (
            <button
              className="abort-button"
              onClick={onAbort}
              title="Cancel analysis and return to upload"
            >
              ✕ Cancel
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
