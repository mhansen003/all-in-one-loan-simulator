import { useState } from 'react';
import type { AppStep, MortgageDetails, CashFlowAnalysis, EligibilityResult, SimulationResult } from './types';
import MortgageDetailsForm from './components/MortgageDetailsForm';
import FileUpload from './components/FileUpload';
import ManualCashFlowInput from './components/ManualCashFlowInput';
import LoanComparison from './components/LoanComparison';
import CashFlowReview from './components/CashFlowReview';
import SimulationResults from './components/SimulationResults';
import FAQSlideout from './components/FAQSlideout';
import PitchGuideModal from './components/PitchGuideModal';
import { analyzeStatements, checkEligibility, simulateLoan } from './api';
import './App.css';

function App() {
  const [step, setStep] = useState<AppStep>('mortgage-details');
  const [mortgageDetails, setMortgageDetails] = useState<Partial<MortgageDetails>>({});
  const [bankStatements, setBankStatements] = useState<File[]>([]);
  const [cashFlowAnalysis, setCashFlowAnalysis] = useState<CashFlowAnalysis | null>(null);
  const [averageMonthlyCashFlow, setAverageMonthlyCashFlow] = useState<number>(0);
  const [_eligibilityResult, setEligibilityResult] = useState<EligibilityResult | null>(null);
  const [simulationResult, setSimulationResult] = useState<SimulationResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  // FAQ and Pitch Guide state
  const [isFAQOpen, setIsFAQOpen] = useState(false);
  const [isPitchGuideOpen, setIsPitchGuideOpen] = useState(false);
  const [isHelpDropdownOpen, setIsHelpDropdownOpen] = useState(false);

  const handleReset = () => {
    setStep('mortgage-details');
    setMortgageDetails({});
    setBankStatements([]);
    setCashFlowAnalysis(null);
    setAverageMonthlyCashFlow(0);
    setEligibilityResult(null);
    setSimulationResult(null);
    setError(null);
    setIsAnalyzing(false);
  };

  const handleMortgageSubmit = (data: MortgageDetails) => {
    setMortgageDetails(data);
    setStep('manual-cash-flow'); // Go to manual input (placeholder for bank statements)
  };

  const handleCashFlowSubmit = (cashFlow: number) => {
    setAverageMonthlyCashFlow(cashFlow);
    setStep('comparison');
  };

  const handleFilesSelected = (files: File[]) => {
    setBankStatements(files);
  };

  const handleAnalyzeStatements = async () => {
    if (bankStatements.length === 0) {
      setError('Please upload at least one bank statement');
      return;
    }

    setError(null);
    setIsAnalyzing(true);
    setStep('analyzing');

    try {
      const cashFlow = await analyzeStatements(
        bankStatements,
        mortgageDetails.currentHousingPayment || 0
      );

      setCashFlowAnalysis(cashFlow);
      setStep('cash-flow-review');
    } catch (error: any) {
      console.error('Error analyzing statements:', error);
      setError(error.response?.data?.message || error.message || 'Failed to analyze bank statements');
      setStep('upload-statements');
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleContinueToSimulation = async () => {
    if (!cashFlowAnalysis || !mortgageDetails) {
      setError('Missing required data');
      return;
    }

    setError(null);
    setStep('simulation');

    try {
      // Check eligibility
      const eligibility = await checkEligibility(
        mortgageDetails as MortgageDetails,
        cashFlowAnalysis
      );
      setEligibilityResult(eligibility);

      // Run simulation
      const simulation = await simulateLoan(
        mortgageDetails as MortgageDetails,
        cashFlowAnalysis
      );
      setSimulationResult(simulation);

      setStep('results');
    } catch (error: any) {
      console.error('Error running simulation:', error);
      setError(error.response?.data?.message || error.message || 'Failed to run simulation');
      setStep('cash-flow-review');
    }
  };

  return (
    <div className="app">
      <header className="app-header">
        <div className="header-container">
          <div className="header-left">
            <div className="logo">
              <span className="logo-cmg">CMG</span>
              <span className="logo-financial">FINANCIAL</span>
            </div>
            <div className="header-divider"></div>
            <h1 className="header-title">All-In-One Loan Simulator</h1>
          </div>
          <div className="header-right">
            {/* Help Dropdown */}
            <div className="help-dropdown-container">
              <button
                className="btn-header-help"
                onClick={() => setIsHelpDropdownOpen(!isHelpDropdownOpen)}
                onBlur={() => setTimeout(() => setIsHelpDropdownOpen(false), 200)}
              >
                <svg className="btn-icon" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                Help
                <svg
                  className={`dropdown-chevron ${isHelpDropdownOpen ? 'open' : ''}`}
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>
              {isHelpDropdownOpen && (
                <div className="help-dropdown-menu">
                  <button
                    className="help-dropdown-item"
                    onClick={() => {
                      setIsFAQOpen(true);
                      setIsHelpDropdownOpen(false);
                    }}
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
                    </svg>
                    <div>
                      <div className="dropdown-item-title">FAQ</div>
                      <div className="dropdown-item-desc">Common questions</div>
                    </div>
                  </button>
                  <button
                    className="help-dropdown-item"
                    onClick={() => {
                      setIsPitchGuideOpen(true);
                      setIsHelpDropdownOpen(false);
                    }}
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
                    </svg>
                    <div>
                      <div className="dropdown-item-title">Q&A with CMG AI Helper</div>
                      <div className="dropdown-item-desc">Ask questions, get answers</div>
                    </div>
                  </button>
                </div>
              )}
            </div>
            <div className="header-phone-section">
              <svg className="phone-icon-header" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
              </svg>
              <span className="phone-label-header">Need help?</span>
              <a href="tel:+19495233372" className="phone-number-header">
                949-523-3372
              </a>
            </div>
            <div className="header-divider"></div>
            <button className="btn-header" onClick={handleReset}>
              <svg className="btn-icon" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              New Simulation
            </button>
            <button className="btn-header-secondary" onClick={handleReset}>
              <svg className="btn-icon" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              Reset
            </button>
          </div>
        </div>
      </header>

      <main className="app-main">
        {error && (
          <div className="alert alert-error">
            <strong>Error:</strong> {error}
          </div>
        )}

        <div className="main-content">
          {step === 'mortgage-details' && (
            <div className="section-card">
              <MortgageDetailsForm
                initialData={mortgageDetails}
                onSubmit={handleMortgageSubmit}
              />
            </div>
          )}

          {step === 'manual-cash-flow' && (
            <div className="section-card">
              <ManualCashFlowInput
                onSubmit={handleCashFlowSubmit}
                onBack={() => setStep('mortgage-details')}
              />
            </div>
          )}

          {step === 'comparison' && (
            <div className="section-card">
              <LoanComparison
                mortgageDetails={mortgageDetails}
                averageMonthlyCashFlow={averageMonthlyCashFlow}
                onBack={() => setStep('manual-cash-flow')}
                onReset={handleReset}
              />
            </div>
          )}

          {step === 'upload-statements' && (
            <div className="section-card">
              <FileUpload
                files={bankStatements}
                onFilesSelected={handleFilesSelected}
                onSubmit={handleAnalyzeStatements}
                onBack={() => setStep('mortgage-details')}
                isAnalyzing={isAnalyzing}
              />
            </div>
          )}

          {step === 'analyzing' && (
            <div className="section-card">
              <div className="processing-section">
                <div className="spinner"></div>
                <h2>Analyzing Bank Statements...</h2>
                <p>Our AI is reading and categorizing your transactions. This may take a few moments.</p>
              </div>
            </div>
          )}

          {step === 'cash-flow-review' && cashFlowAnalysis && (
            <div className="section-card">
              <CashFlowReview
                cashFlow={cashFlowAnalysis}
                onContinue={handleContinueToSimulation}
                onBack={() => setStep('upload-statements')}
              />
            </div>
          )}

          {step === 'simulation' && (
            <div className="section-card">
              <div className="processing-section">
                <div className="spinner"></div>
                <h2>Running Loan Simulation...</h2>
                <p>Calculating traditional vs All-In-One loan projections.</p>
              </div>
            </div>
          )}

          {step === 'results' && simulationResult && (
            <div className="section-card">
              <SimulationResults
                simulation={simulationResult}
                mortgageDetails={mortgageDetails as MortgageDetails}
                onReset={handleReset}
              />
            </div>
          )}
        </div>
      </main>

      <footer className="app-footer">
        <div className="footer-content">
          <div className="footer-section">
            <div className="footer-logo">
              <span className="logo-cmg">CMG</span>
              <span className="logo-financial">FINANCIAL</span>
            </div>
            <p style={{ fontSize: '0.85rem', lineHeight: '1.6', marginTop: '0.5rem' }}>
              All-In-One Loan Simulator
              <br />
              Powered by AI
            </p>
          </div>

          <div className="footer-section">
            <h4>Resources</h4>
            <ul>
              <li><a href="https://www.cmgfi.com/all-in-one" target="_blank" rel="noopener noreferrer">All-In-One Product</a></li>
              <li><a href="https://www.cmgfi.com" target="_blank" rel="noopener noreferrer">CMG Financial</a></li>
              <li><a href="https://www.cmgfi.com/about" target="_blank" rel="noopener noreferrer">About Us</a></li>
            </ul>
          </div>

          <div className="footer-section">
            <h4>Support</h4>
            <ul>
              <li><a href="#" onClick={(e) => { e.preventDefault(); handleReset(); }}>New Simulation</a></li>
              <li><a href="https://www.cmgfi.com/contact" target="_blank" rel="noopener noreferrer">Contact Us</a></li>
            </ul>
          </div>

          <div className="footer-section">
            <h4>Technology</h4>
            <ul>
              <li><a href="https://openai.com" target="_blank" rel="noopener noreferrer">Powered by OpenAI GPT-4</a></li>
              <li><a href="https://vercel.com" target="_blank" rel="noopener noreferrer">Hosted on Vercel</a></li>
            </ul>
          </div>
        </div>

        <div className="footer-bottom">
          <p>© {new Date().getFullYear()} CMG Financial. All rights reserved. | NMLS# 1820</p>
          <p style={{ marginTop: '0.5rem' }}>
            AI-powered All-In-One Loan Simulation Tool
          </p>
        </div>
      </footer>

      {/* FAQ Slideout */}
      <FAQSlideout isOpen={isFAQOpen} onClose={() => setIsFAQOpen(false)} />

      {/* Pitch Guide Modal */}
      <PitchGuideModal isOpen={isPitchGuideOpen} onClose={() => setIsPitchGuideOpen(false)} />
    </div>
  );
}

export default App;
