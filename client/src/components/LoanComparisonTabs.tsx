import { useMemo, useState } from 'react';
import {
  compareLoanOptions,
  formatMonthsToYears,
  formatCurrency,
  generateWeeklyBreakdown,
  type LoanInputs,
  type WeeklyBreakdownEntry,
} from '../utils/loanCalculations';
import './LoanComparisonTabs.css';

interface LoanComparisonTabsProps {
  mortgageDetails: {
    currentBalance?: number;
    interestRate?: number;
    monthlyPayment?: number;
    currentHousingPayment?: number;
  };
  monthlyDeposits: number;
  monthlyExpenses: number;
  monthlyLeftover: number;
  depositFrequency: 'monthly' | 'biweekly' | 'weekly';
  aioRate: number;
  onBack?: () => void;
}

type TabView = 'results' | 'formulas' | 'breakdown' | 'visualize';

export default function LoanComparisonTabs({
  mortgageDetails,
  monthlyDeposits,
  monthlyExpenses,
  monthlyLeftover,
  depositFrequency,
  aioRate: proposedAIORate,
  onBack,
}: LoanComparisonTabsProps) {
  const [activeTab, setActiveTab] = useState<TabView>('results');

  const { comparison, loanAmount, traditionalRate, aioRate, averageBalance } = useMemo(() => {
    const loanAmt = mortgageDetails.currentBalance || 0;
    const tradRate = (mortgageDetails.interestRate || 6.99) / 100;
    const aRate = proposedAIORate / 100;

    const inputs: LoanInputs = {
      loanAmount: loanAmt,
      traditionalRate: tradRate,
      aioRate: aRate,
      monthlyDeposits,
      monthlyExpenses,
      monthlyLeftover,
      depositFrequency,
      currentHousingPayment: mortgageDetails.currentHousingPayment || 0,
    };

    const comp = compareLoanOptions(inputs);

    // Calculate average balance for display purposes
    const avgBalance = (monthlyDeposits + monthlyLeftover) / 2;
    const frequencyMultiplier = depositFrequency === 'weekly' ? 1.25 : depositFrequency === 'biweekly' ? 1.15 : 1;
    const calculatedAvgBalance = avgBalance * frequencyMultiplier;

    return {
      comparison: comp,
      loanAmount: loanAmt,
      traditionalRate: tradRate,
      aioRate: aRate,
      averageBalance: calculatedAvgBalance,
    };
  }, [mortgageDetails, monthlyDeposits, monthlyExpenses, monthlyLeftover, depositFrequency, proposedAIORate]);

  const weeklyBreakdown = useMemo(() => {
    return generateWeeklyBreakdown(
      loanAmount,
      aioRate,
      averageBalance,
      monthlyLeftover
    );
  }, [loanAmount, aioRate, averageBalance, monthlyLeftover]);

  return (
    <div className="loan-comparison-tabs-container">
      {/* Header */}
      <div className="comparison-header">
        <h1>📊 Your Loan Analysis</h1>
        <p>
          All-In-One loan can pay off your mortgage{' '}
          <strong className="highlight">
            {formatMonthsToYears(comparison.timeSavedMonths)} faster
          </strong>
        </p>
      </div>

      {/* Tab Navigation */}
      <div className="tab-navigation">
        <button
          className={`tab-btn ${activeTab === 'results' ? 'active' : ''}`}
          onClick={() => setActiveTab('results')}
        >
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4"
            />
          </svg>
          Results
        </button>

        <button
          className={`tab-btn ${activeTab === 'formulas' ? 'active' : ''}`}
          onClick={() => setActiveTab('formulas')}
        >
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z"
            />
          </svg>
          Formulas
        </button>

        <button
          className={`tab-btn ${activeTab === 'breakdown' ? 'active' : ''}`}
          onClick={() => setActiveTab('breakdown')}
        >
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M3 10h18M3 14h18m-9-4v8m-7 0h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z"
            />
          </svg>
          Weekly Breakdown
        </button>

        <button
          className={`tab-btn ${activeTab === 'visualize' ? 'active' : ''}`}
          onClick={() => setActiveTab('visualize')}
        >
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
            />
          </svg>
          Visualize
        </button>
      </div>

      {/* Tab Content */}
      <div className="tab-content">
        {activeTab === 'results' && (
          <ResultsTab
            comparison={comparison}
            loanAmount={loanAmount}
            traditionalRate={traditionalRate}
            aioRate={aioRate}
            averageBalance={averageBalance}
            monthlyDeposits={monthlyDeposits}
            monthlyLeftover={monthlyLeftover}
          />
        )}

        {activeTab === 'formulas' && (
          <FormulasTab
            comparison={comparison}
            loanAmount={loanAmount}
            traditionalRate={traditionalRate}
            aioRate={aioRate}
            averageBalance={averageBalance}
            monthlyDeposits={monthlyDeposits}
            monthlyLeftover={monthlyLeftover}
          />
        )}

        {activeTab === 'breakdown' && (
          <BreakdownTab
            comparison={comparison}
            weeklyBreakdown={weeklyBreakdown}
          />
        )}

        {activeTab === 'visualize' && (
          <VisualizeTab
            comparison={comparison}
            weeklyBreakdown={weeklyBreakdown}
            loanAmount={loanAmount}
          />
        )}
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

        <button type="button" className="btn-primary" onClick={() => window.print()}>
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

// Results Tab Component
function ResultsTab({
  comparison,
  loanAmount,
  traditionalRate,
  aioRate,
  averageBalance,
  monthlyDeposits,
  monthlyLeftover,
}: any) {
  return (
    <>
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
              ? `${formatCurrency(Math.abs(comparison.interestSaved))} additional interest, but paid off much faster`
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
              <p className="card-subtitle">{(traditionalRate * 100).toFixed(2)}% Fixed</p>
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
              <p className="card-subtitle">{(aioRate * 100).toFixed(3)}% ARM with Cash Flow Offset</p>
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
                  (Offset by {formatCurrency(averageBalance)} avg balance)
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
                Your {formatCurrency(monthlyDeposits)}/month in deposits creates an average balance of{' '}
                {formatCurrency(averageBalance)}, which offsets the principal and lowers daily interest charges.
              </p>
            </div>
          </div>

          <div className="how-item">
            <div className="how-number">3</div>
            <div className="how-content">
              <h4>Pay Off Faster</h4>
              <p>
                Your {formatCurrency(monthlyLeftover)}/month leftover permanently reduces the principal balance,
                paying off your mortgage years faster than a traditional loan.
              </p>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

// Formulas Tab Component
function FormulasTab({
  comparison,
  loanAmount,
  traditionalRate,
  aioRate,
  averageBalance,
  monthlyDeposits,
  monthlyLeftover,
}: any) {
  return (
    <div className="math-tab">
      <h2>🧮 The Mathematics Behind AIO</h2>

      {/* Formulas */}
      <div className="formula-section">
        <h3>Core Formulas</h3>

        <div className="formula-card">
          <h4>Traditional Fixed-Rate Mortgage</h4>
          <div className="formula">
            <strong>Monthly Payment =</strong> P × [r(1+r)ⁿ] / [(1+r)ⁿ - 1]
          </div>
          <div className="formula-explanation">
            <p>Where:</p>
            <ul>
              <li>P = Principal ({formatCurrency(loanAmount)})</li>
              <li>r = Monthly interest rate ({((traditionalRate / 12) * 100).toFixed(4)}%)</li>
              <li>n = Number of payments (360 for 30-year)</li>
            </ul>
            <p className="result">
              <strong>Result:</strong> {formatCurrency(comparison.traditional.monthlyPayment)}/month
            </p>
          </div>
        </div>

        <div className="formula-card aio-formula">
          <h4>All-In-One Loan (The Secret Sauce)</h4>
          <div className="formula">
            <strong>Effective Principal =</strong> Actual Principal - Average Balance Offset
          </div>
          <div className="formula">
            <strong>Monthly Interest =</strong> Effective Principal × (Annual Rate / 12)
          </div>
          <div className="formula">
            <strong>Principal Reduction =</strong> Monthly Leftover - Monthly Interest
          </div>
          <div className="formula-explanation">
            <p>Key Variables:</p>
            <ul>
              <li>Starting Principal: {formatCurrency(loanAmount)}</li>
              <li>Monthly Deposits: {formatCurrency(monthlyDeposits)}</li>
              <li>Average Balance Offset: {formatCurrency(averageBalance)}</li>
              <li>Monthly Leftover: {formatCurrency(monthlyLeftover)}</li>
              <li>Annual Rate: {(aioRate * 100).toFixed(3)}%</li>
            </ul>
            <p className="result">
              <strong>Result:</strong> Loan paid off in{' '}
              {formatMonthsToYears(comparison.aio.monthsToPayoff)}!
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

// Breakdown Tab Component
function BreakdownTab({ comparison, weeklyBreakdown }: any) {
  const [showFullBreakdown, setShowFullBreakdown] = useState(false);
  const displayedBreakdown = showFullBreakdown ? weeklyBreakdown : weeklyBreakdown.slice(0, 52); // Show first year

  return (
    <div className="math-tab">
      <h2>📅 Week-by-Week Payment Breakdown</h2>

      {/* Weekly Breakdown Table */}
      <div className="breakdown-section">
        <h3>
          AIO Loan Progress
          {!showFullBreakdown && (
            <span className="showing-note"> (Showing first year - {displayedBreakdown.length} weeks)</span>
          )}
        </h3>

        <div className="breakdown-table-container">
          <table className="breakdown-table">
            <thead>
              <tr>
                <th>Week</th>
                <th>Effective Principal</th>
                <th>Interest Charged</th>
                <th>Principal Reduced</th>
                <th>New Balance</th>
              </tr>
            </thead>
            <tbody>
              {displayedBreakdown.map((entry: WeeklyBreakdownEntry, index: number) => (
                <tr key={index} className={index % 4 === 0 ? 'month-marker' : ''}>
                  <td>{entry.week}</td>
                  <td>{formatCurrency(entry.effectivePrincipal)}</td>
                  <td className="interest-col">{formatCurrency(entry.interest)}</td>
                  <td className="principal-col">{formatCurrency(entry.principalReduced)}</td>
                  <td>
                    <strong>{formatCurrency(entry.balance)}</strong>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="breakdown-controls">
          {!showFullBreakdown && weeklyBreakdown.length > 52 && (
            <button
              className="btn-secondary"
              onClick={() => setShowFullBreakdown(true)}
            >
              Show Full Breakdown ({weeklyBreakdown.length} weeks until payoff)
            </button>
          )}
          {showFullBreakdown && (
            <button className="btn-secondary" onClick={() => setShowFullBreakdown(false)}>
              Show First Year Only
            </button>
          )}
        </div>

        <div className="breakdown-summary">
          <div className="summary-stat">
            <div className="stat-label">Total Weeks</div>
            <div className="stat-value">{weeklyBreakdown.length}</div>
          </div>
          <div className="summary-stat">
            <div className="stat-label">Time to Payoff</div>
            <div className="stat-value">{formatMonthsToYears(comparison.aio.monthsToPayoff)}</div>
          </div>
          <div className="summary-stat">
            <div className="stat-label">Total Interest</div>
            <div className="stat-value">{formatCurrency(comparison.aio.totalInterestPaid)}</div>
          </div>
        </div>
      </div>
    </div>
  );
}

// Visualize Tab Component (placeholder for now, will add charts)
function VisualizeTab(_props: any) {
  // Props: comparison, weeklyBreakdown, loanAmount (for future chart implementation)
  return (
    <div className="visualize-tab">
      <h2>📈 Visual Analysis</h2>
      <p style={{ textAlign: 'center', padding: '3rem', color: '#718096' }}>
        Charts coming in next update...
        <br />
        (Pie chart for savings, line chart for balance over time)
      </p>
    </div>
  );
}
