import { useEffect, useState } from 'react';
import './AnalyzingModal.css';

interface AnalyzingModalProps {
  fileCount: number;
  batchProgress?: { current: number; total: number; message: string } | null;
}

export default function AnalyzingModal({ fileCount, batchProgress }: AnalyzingModalProps) {
  const [currentStep, setCurrentStep] = useState(0);
  const [currentTip, setCurrentTip] = useState(0);

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
      title: "What is an All-In-One Loan?",
      content: "An All-In-One (AIO) loan combines your mortgage and bank account into one, allowing your income to offset your loan balance daily, reducing interest charges."
    },
    {
      title: "How Does Cash Flow Matter?",
      content: "The more positive cash flow you have each month, the greater your interest savings. Every dollar in your account works to reduce the balance that accrues interest."
    },
    {
      title: "What About Access to My Money?",
      content: "You have complete access to your funds anytime with checks, debit cards, and online transfers. Your money remains fully liquid while saving you interest."
    },
    {
      title: "How Much Can I Save?",
      content: "Most borrowers save 30-50% on total interest and pay off their mortgage 8-12 years faster, depending on their cash flow."
    },
    {
      title: "Is This Right for Everyone?",
      content: "AIO loans work best for borrowers with consistent positive cash flow. Our analysis will show your suitability based on your transaction history."
    },
    {
      title: "What Makes This Different?",
      content: "Unlike traditional mortgages that calculate interest monthly, AIO loans calculate daily. This means every deposit immediately starts reducing your interest."
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

          {/* Current Step or Batch Progress */}
          <div className="current-step">
            {batchProgress ? (
              <div className="batch-progress-info">
                <div className="batch-counter">
                  📦 Batch {batchProgress.current} of {batchProgress.total}
                </div>
                <div className="step-indicator">
                  <span className="step-text">Processing documents in batches to ensure reliability...</span>
                </div>
              </div>
            ) : (
              <div className="step-indicator">
                <span className="step-icon">✨</span>
                <span className="step-text">{steps[currentStep]?.label}</span>
              </div>
            )}
          </div>

          {/* FAQ Tips Carousel */}
          <div className="tips-carousel">
            <div className="tip-content-wrapper">
              <div className="tip-icon">💡</div>
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

          <p className="analyzing-note">
            Sit back, this might take a few minutes...
          </p>
        </div>
      </div>
    </div>
  );
}
