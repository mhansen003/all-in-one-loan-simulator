import { useState, useEffect } from 'react';
import type { AppStep, MortgageDetails, CashFlowAnalysis, EligibilityResult, SimulationResult } from './types';
import MortgageDetailsForm from './components/MortgageDetailsForm';
import FileUpload from './components/FileUpload';
// REMOVED: Manual entry components (per requirements)
// import DepositsExpensesInput from './components/DepositsExpensesInput';
// import AIOProposalInput from './components/AIOProposalInput';
// import LoanComparisonTabs from './components/LoanComparisonTabs';
import CashFlowReview from './components/CashFlowReview';
import SimulationResults from './components/SimulationResults';
import ProposalBuilder from './components/ProposalBuilder';
import AnalyzingModal from './components/AnalyzingModal';
import FAQSlideout from './components/FAQSlideout';
import PitchGuideModal from './components/PitchGuideModal';
import { analyzeStatements, checkEligibility, simulateLoan } from './api';
import './App.css';

// LocalStorage keys
const STORAGE_KEYS = {
  STEP: 'aio-sim-step',
  MORTGAGE_DETAILS: 'aio-sim-mortgage',
  CASH_FLOW: 'aio-sim-cashflow',
  SIMULATION: 'aio-sim-simulation',
  ELIGIBILITY: 'aio-sim-eligibility'
};

function App() {
  // Initialize state from localStorage if available
  const [step, setStep] = useState<AppStep>(() => {
    const saved = localStorage.getItem(STORAGE_KEYS.STEP);
    return (saved as AppStep) || 'mortgage-details';
  });

  const [mortgageDetails, setMortgageDetails] = useState<Partial<MortgageDetails>>(() => {
    const saved = localStorage.getItem(STORAGE_KEYS.MORTGAGE_DETAILS);
    return saved ? JSON.parse(saved) : {};
  });

  const [bankStatements, setBankStatements] = useState<File[]>([]);

  const [cashFlowAnalysis, setCashFlowAnalysis] = useState<CashFlowAnalysis | null>(() => {
    const saved = localStorage.getItem(STORAGE_KEYS.CASH_FLOW);
    return saved ? JSON.parse(saved) : null;
  });

  // REMOVED: Manual entry state (no longer needed - AI auto-detects deposit frequency from bank statements)
  // const [monthlyDeposits, setMonthlyDeposits] = useState<number>(0);
  // const [monthlyExpenses, setMonthlyExpenses] = useState<number>(0);
  // const [monthlyLeftover, setMonthlyLeftover] = useState<number>(0);
  // const [depositFrequency, setDepositFrequency] = useState<'monthly' | 'biweekly' | 'weekly'>('monthly');
  // const [aioRate, setAIORate] = useState<number>(8.375);
  const [_eligibilityResult, setEligibilityResult] = useState<EligibilityResult | null>(() => {
    const saved = localStorage.getItem(STORAGE_KEYS.ELIGIBILITY);
    return saved ? JSON.parse(saved) : null;
  });

  const [simulationResult, setSimulationResult] = useState<SimulationResult | null>(() => {
    const saved = localStorage.getItem(STORAGE_KEYS.SIMULATION);
    return saved ? JSON.parse(saved) : null;
  });

  const [error, setError] = useState<string | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [batchProgress, setBatchProgress] = useState<{ current: number; total: number; message: string } | null>(null);

  // FAQ and Pitch Guide state
  const [isFAQOpen, setIsFAQOpen] = useState(false);
  const [isPitchGuideOpen, setIsPitchGuideOpen] = useState(false);
  const [isHelpDropdownOpen, setIsHelpDropdownOpen] = useState(false);

  // Save state to localStorage whenever it changes
  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.STEP, step);
  }, [step]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.MORTGAGE_DETAILS, JSON.stringify(mortgageDetails));
  }, [mortgageDetails]);

  useEffect(() => {
    if (cashFlowAnalysis) {
      localStorage.setItem(STORAGE_KEYS.CASH_FLOW, JSON.stringify(cashFlowAnalysis));
    }
  }, [cashFlowAnalysis]);

  useEffect(() => {
    if (_eligibilityResult) {
      localStorage.setItem(STORAGE_KEYS.ELIGIBILITY, JSON.stringify(_eligibilityResult));
    }
  }, [_eligibilityResult]);

  useEffect(() => {
    if (simulationResult) {
      localStorage.setItem(STORAGE_KEYS.SIMULATION, JSON.stringify(simulationResult));
    }
  }, [simulationResult]);

  const handleReset = () => {
    // Clear all state
    setStep('mortgage-details');
    setMortgageDetails({});
    setBankStatements([]);
    setCashFlowAnalysis(null);
    // REMOVED: Manual entry state resets (AI auto-detects deposit frequency from bank statements)
    // setMonthlyDeposits(0);
    // setMonthlyExpenses(0);
    // setMonthlyLeftover(0);
    // setDepositFrequency('monthly');
    // setAIORate(8.375);
    setEligibilityResult(null);
    setSimulationResult(null);
    setError(null);
    setIsAnalyzing(false);

    // Clear localStorage
    Object.values(STORAGE_KEYS).forEach(key => localStorage.removeItem(key));
  };

  const handleMortgageSubmit = (data: MortgageDetails) => {
    setMortgageDetails(data);
    // CHANGED: Go directly to bank statement upload (removed manual entry path)
    setStep('upload-statements');
  };

  // REMOVED: Manual entry handlers (no longer used)
  /*
  const handleCashFlowSubmit = (cashFlowData: {
    monthlyDeposits: number;
    monthlyExpenses: number;
    monthlyLeftover: number;
    depositFrequency: 'monthly' | 'biweekly' | 'weekly';
  }) => {
    setMonthlyDeposits(cashFlowData.monthlyDeposits);
    setMonthlyExpenses(cashFlowData.monthlyExpenses);
    setMonthlyLeftover(cashFlowData.monthlyLeftover);
    setDepositFrequency(cashFlowData.depositFrequency);
    setStep('aio-proposal');
  };

  const handleAIOProposalSubmit = (rate: number) => {
    setAIORate(rate);
    setStep('comparison');
  };
  */

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
    setBatchProgress(null);
    setStep('analyzing');

    try {
      const cashFlow = await analyzeStatements(
        bankStatements,
        mortgageDetails.currentHousingPayment || 0,
        (progress) => {
          // Update batch progress for user feedback
          setBatchProgress(progress);
          console.log(`Progress: ${progress.message} (${progress.current}/${progress.total})`);
        }
      );

      setCashFlowAnalysis(cashFlow);
      setStep('cash-flow-review');
    } catch (error: any) {
      console.error('Error analyzing statements:', error);
      setError(error.response?.data?.message || error.message || 'Failed to analyze bank statements');
      setStep('upload-statements');
    } finally {
      setIsAnalyzing(false);
      setBatchProgress(null);
    }
  };

  const handleAbortAnalysis = () => {
    console.log('Analysis aborted by user');
    setIsAnalyzing(false);
    setBatchProgress(null);
    setStep('upload-statements');
    setError('Analysis cancelled. You can re-upload and try again.');
  };

  const handleContinueToSimulation = async () => {
    if (!cashFlowAnalysis || !mortgageDetails) {
      setError('Missing required data');
      return;
    }

    console.log('[App] Running simulation with cash flow:', {
      monthlyDeposits: cashFlowAnalysis.monthlyDeposits,
      monthlyExpenses: cashFlowAnalysis.monthlyExpenses,
      netCashFlow: cashFlowAnalysis.netCashFlow,
      depositFrequency: cashFlowAnalysis.depositFrequency,
      transactionCount: cashFlowAnalysis.transactions?.length
    });

    setError(null);
    setStep('simulation');

    try {
      // Cash flow analysis already includes AI-detected deposit frequency
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

      console.log('[App] Simulation complete:', {
        traditionalInterest: simulation.traditionalLoan.totalInterestPaid,
        aioInterest: simulation.allInOneLoan.totalInterestPaid,
        savings: simulation.comparison.interestSavings
      });

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
            <h1 className="header-title">All-In-One Look Back Simulator</h1>
          </div>
          <div className="header-right">
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
            <div className="header-divider"></div>
            {/* Tools Dropdown */}
            <div className="help-dropdown-container">
              <button
                className="btn-header-help"
                onClick={() => setIsHelpDropdownOpen(!isHelpDropdownOpen)}
                onBlur={() => setTimeout(() => setIsHelpDropdownOpen(false), 200)}
              >
                <svg className="btn-icon" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
                Tools
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

          {/* REMOVED: Manual entry path per Paul's requirements - "Don't even put the button there"
          {step === 'manual-cash-flow' && (
            <div className="section-card">
              <DepositsExpensesInput
                onSubmit={handleCashFlowSubmit}
                onBack={() => setStep('mortgage-details')}
                mortgageDetails={mortgageDetails}
              />
            </div>
          )}

          {step === 'aio-proposal' && (
            <div className="section-card">
              <AIOProposalInput
                onSubmit={handleAIOProposalSubmit}
                onBack={() => setStep('manual-cash-flow')}
              />
            </div>
          )}

          {step === 'comparison' && (
            <div className="section-card">
              <LoanComparisonTabs
                mortgageDetails={mortgageDetails}
                monthlyDeposits={monthlyDeposits}
                monthlyExpenses={monthlyExpenses}
                monthlyLeftover={monthlyLeftover}
                depositFrequency="monthly"
                aioRate={aioRate}
                onBack={() => setStep('aio-proposal')}
              />
            </div>
          )}
          */}

          {step === 'upload-statements' && (
            <div className="section-card">
              <FileUpload
                files={bankStatements}
                onFilesSelected={handleFilesSelected}
                onSubmit={handleAnalyzeStatements}
                onBack={() => setStep('mortgage-details')}
                isAnalyzing={isAnalyzing}
                existingAnalysis={cashFlowAnalysis}
                onSkipToReview={() => setStep('cash-flow-review')}
              />
            </div>
          )}

          {step === 'analyzing' && (
            <AnalyzingModal
              fileCount={bankStatements.length}
              batchProgress={batchProgress}
              onAbort={handleAbortAnalysis}
            />
          )}

          {step === 'cash-flow-review' && cashFlowAnalysis && (
            <div className="section-card">
              <CashFlowReview
                cashFlow={cashFlowAnalysis}
                mortgageDetails={mortgageDetails as MortgageDetails}
                onContinue={handleContinueToSimulation}
                onBack={() => setStep('upload-statements')}
                onCashFlowUpdate={setCashFlowAnalysis}
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
                cashFlow={cashFlowAnalysis || undefined}
                onReset={handleReset}
                onCreateProposal={() => setStep('proposal-builder')}
                onBackToCFA={() => setStep('cash-flow-review')}
              />
            </div>
          )}

          {step === 'proposal-builder' && simulationResult && (
            <div className="section-card">
              <ProposalBuilder
                simulation={simulationResult}
                mortgageDetails={mortgageDetails as MortgageDetails}
                cashFlow={cashFlowAnalysis || undefined}
                onBack={() => setStep('results')}
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
              All-In-One Look Back Simulator
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
            AI-powered All-In-One Look Back Simulator
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
