import { useMemo } from 'react';
import {
  compareLoanOptions,
  formatMonthsToYears,
  formatCurrency,
  type LoanInputs,
} from '../utils/loanCalculations';
import './LoanComparison.css';

interface LoanComparisonProps {
  mortgageDetails: {
    purchasePrice?: number;
    downPayment?: number;
    interestRate?: number;
    currentHousingPayment?: number;
  };
  averageMonthlyCashFlow: number;
  onBack?: () => void;
  onReset?: () => void;
}

export default function LoanComparison({
  mortgageDetails,
  averageMonthlyCashFlow,
  onBack,
  onReset,
}: LoanComparisonProps) {
  const comparison = useMemo(() => {
    const loanAmount =
      (mortgageDetails.purchasePrice || 0) - (mortgageDetails.downPayment || 0);
    const traditionalRate = (mortgageDetails.interestRate || 6.99) / 100;
    const aioRate = 8.375 / 100; // Typical AIO rate

    // For this simpler flow, we approximate the deposits/expenses breakdown
    // Assume 50% of cash flow is leftover (deposits - expenses)
    const estimatedMonthlyLeftover = averageMonthlyCashFlow * 0.5;
    const estimatedMonthlyDeposits = averageMonthlyCashFlow;
    const estimatedMonthlyExpenses = estimatedMonthlyDeposits - estimatedMonthlyLeftover;

    const inputs: LoanInputs = {
      loanAmount,
      traditionalRate,
      aioRate,
      monthlyDeposits: estimatedMonthlyDeposits,
      monthlyExpenses: estimatedMonthlyExpenses,
      monthlyLeftover: estimatedMonthlyLeftover,
      depositFrequency: 'monthly',
      currentHousingPayment: mortgageDetails.currentHousingPayment || 0,
    };

    return compareLoanOptions(inputs);
  }, [mortgageDetails, averageMonthlyCashFlow]);

  const loanAmount =
    (mortgageDetails.purchasePrice || 0) - (mortgageDetails.downPayment || 0);

  return (
    <div className="loan-comparison-container">
      <div className="comparison-header">
        <h1>📊 Your Loan Comparison</h1>
        <p>
          See how the All-In-One loan can help you pay off your mortgage {' '}
          <strong className="highlight">{formatMonthsToYears(comparison.timeSavedMonths)} faster</strong>
        </p>
      </div>

      {/* Key Savings Banner */}
      <div className="savings-banner">
        <div className="savings-icon">⚡</div>
        <div className="savings-content">
          <div className="savings-title">Potential Time Savings</div>
          <div className="savings-value">{formatMonthsToYears(comparison.timeSavedMonths)}</div>
          <div className="savings-subtitle">
            {comparison.interestSaved > 0
              ? `Save ${formatCurrency(comparison.interestSaved)} in interest`
              : comparison.interestSaved < 0
              ? `Note: ${formatCurrency(Math.abs(comparison.interestSaved))} additional interest, but paid off much faster`
              : 'Similar total interest cost'}
          </div>
        </div>
      </div>

      {/* Side by Side Comparison */}
      <div className="comparison-grid">
        {/* Traditional Loan */}
        <div className="loan-card traditional">
          <div className="card-header">
            <div className="card-icon">🏦</div>
            <div>
              <h3>Traditional Fixed-Rate Mortgage</h3>
              <p className="card-subtitle">{(mortgageDetails.interestRate || 6.99)}% Fixed</p>
            </div>
          </div>

          <div className="card-body">
            <div className="metric-row">
              <div className="metric-label">Loan Amount</div>
              <div className="metric-value">{formatCurrency(loanAmount)}</div>
            </div>

            <div className="metric-row">
              <div className="metric-label">Monthly Payment</div>
              <div className="metric-value">
                {formatCurrency(comparison.traditional.monthlyPayment)}
              </div>
            </div>

            <div className="metric-row highlight-row">
              <div className="metric-label">Time to Payoff</div>
              <div className="metric-value-large">
                {formatMonthsToYears(comparison.traditional.monthsToPayoff)}
              </div>
            </div>

            <div className="metric-row">
              <div className="metric-label">Total Interest Paid</div>
              <div className="metric-value">
                {formatCurrency(comparison.traditional.totalInterestPaid)}
              </div>
            </div>
          </div>
        </div>

        {/* AIO Loan */}
        <div className="loan-card aio">
          <div className="card-header">
            <div className="card-icon">✨</div>
            <div>
              <h3>All-In-One Loan</h3>
              <p className="card-subtitle">8.375% ARM with Cash Flow Offset</p>
            </div>
          </div>

          <div className="card-body">
            <div className="metric-row">
              <div className="metric-label">Loan Amount</div>
              <div className="metric-value">{formatCurrency(loanAmount)}</div>
            </div>

            <div className="metric-row">
              <div className="metric-label">Effective Principal</div>
              <div className="metric-value">
                {formatCurrency(comparison.aio.effectivePrincipal || loanAmount)}
                <span className="metric-hint">
                  (Offset by ${averageMonthlyCashFlow.toLocaleString()} avg balance)
                </span>
              </div>
            </div>

            <div className="metric-row highlight-row success">
              <div className="metric-label">Time to Payoff</div>
              <div className="metric-value-large">
                {formatMonthsToYears(comparison.aio.monthsToPayoff)}
              </div>
              <div className="savings-badge">
                Save {formatMonthsToYears(comparison.timeSavedMonths)}!
              </div>
            </div>

            <div className="metric-row">
              <div className="metric-label">Total Interest Paid</div>
              <div className="metric-value">
                {formatCurrency(comparison.aio.totalInterestPaid)}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* How It Works */}
      <div className="how-it-works">
        <h3>💡 How the All-In-One Loan Works</h3>
        <div className="how-it-works-grid">
          <div className="how-item">
            <div className="how-number">1</div>
            <div className="how-content">
              <h4>Your Income Flows In</h4>
              <p>Deposit your paychecks directly into your AIO account, just like a checking account.</p>
            </div>
          </div>

          <div className="how-item">
            <div className="how-number">2</div>
            <div className="how-content">
              <h4>Cash Flow Offsets Principal</h4>
              <p>
                Your average balance of {formatCurrency(averageMonthlyCashFlow)} reduces the effective
                principal, lowering daily interest charges.
              </p>
            </div>
          </div>

          <div className="how-item">
            <div className="how-number">3</div>
            <div className="how-content">
              <h4>Pay Off Faster</h4>
              <p>
                Every dollar sitting in your account works to pay down your mortgage, potentially
                saving you years of payments.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="comparison-actions">
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
            Adjust Cash Flow
          </button>
        )}

        {onReset && (
          <button type="button" className="btn-secondary" onClick={onReset}>
            Start Over
          </button>
        )}

        <button
          type="button"
          className="btn-primary"
          onClick={() => window.print()}
        >
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
              d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z"
            />
          </svg>
          Print / Save Results
        </button>
      </div>
    </div>
  );
}
