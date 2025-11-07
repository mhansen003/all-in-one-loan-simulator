import { useEffect, useState } from 'react';
import './AnalyzingModal.css';

interface AnalyzingModalProps {
  fileCount: number;
}

export default function AnalyzingModal({ fileCount }: AnalyzingModalProps) {
  const [progress, setProgress] = useState(0);
  const [currentStep, setCurrentStep] = useState(0);

  const steps = [
    { label: 'Extracting text from documents', duration: 3000 },
    { label: 'Analyzing transactions', duration: 4000 },
    { label: 'Detecting deposit patterns', duration: 2500 },
    { label: 'Calculating monthly averages', duration: 2000 },
    { label: 'Flagging irregular transactions', duration: 2500 },
    { label: 'Finalizing analysis', duration: 2000 },
  ];

  useEffect(() => {
    let progressInterval: NodeJS.Timeout;
    let stepTimeout: NodeJS.Timeout;

    const startProgress = () => {
      const totalDuration = steps.reduce((sum, step) => sum + step.duration, 0);
      const incrementRate = 100 / totalDuration;

      progressInterval = setInterval(() => {
        setProgress((prev) => {
          const next = prev + incrementRate * 100;
          return next >= 99 ? 99 : next;
        });
      }, 100);
    };

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

    startProgress();
    cycleSteps();

    return () => {
      clearInterval(progressInterval);
      clearTimeout(stepTimeout);
    };
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

          {/* Progress Bar */}
          <div className="progress-container">
            <div className="progress-bar">
              <div
                className="progress-fill"
                style={{ width: `${progress}%` }}
              ></div>
            </div>
            <span className="progress-text">{Math.round(progress)}%</span>
          </div>

          {/* Current Step */}
          <div className="current-step">
            <div className="step-indicator">
              <span className="step-icon">✨</span>
              <span className="step-text">{steps[currentStep]?.label}</span>
            </div>
          </div>

          {/* Features List */}
          <div className="analyzing-features">
            <div className="feature-item">
              <svg className="feature-icon" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span>Extracting all transactions</span>
            </div>
            <div className="feature-item">
              <svg className="feature-icon" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span>Categorizing income & expenses</span>
            </div>
            <div className="feature-item">
              <svg className="feature-icon" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span>Detecting irregular transactions</span>
            </div>
            <div className="feature-item">
              <svg className="feature-icon" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span>Calculating monthly averages</span>
            </div>
          </div>

          <p className="analyzing-note">
            This usually takes 10-20 seconds depending on the number of transactions...
          </p>
        </div>
      </div>
    </div>
  );
}
