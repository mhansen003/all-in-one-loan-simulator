import { useMemo, useState } from 'react';
import {
  compareLoanOptions,
  formatMonthsToYears,
  formatCurrency,
  generateWeeklyBreakdown,
  type LoanInputs,
  type WeeklyBreakdownEntry,
} from '../utils/loanCalculations';
import html2pdf from 'html2pdf.js';
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


  const handleGeneratePDF = () => {
    const element = document.getElementById('loan-comparison-content');
    if (!element) {
      console.error('Loan comparison content element not found');
      return;
    }

    // Store original styles to restore after PDF generation
    const originalMaxHeight = element.style.maxHeight;
    const originalOverflow = element.style.overflow;
    const originalHeight = element.style.height;

    // Temporarily remove height constraints to capture full content
    element.style.maxHeight = 'none';
    element.style.overflow = 'visible';
    element.style.height = 'auto';

    const options = {
      margin: 0.5,
      filename: `AIO_Loan_Analysis_${new Date().toISOString().split('T')[0]}.pdf`,
      image: { type: 'jpeg' as const, quality: 0.98 },
      html2canvas: {
        scale: 2,
        useCORS: true,
        scrollY: 0,
        scrollX: 0,
        windowHeight: element.scrollHeight,
        height: element.scrollHeight
      },
      jsPDF: { unit: 'in' as const, format: 'letter' as const, orientation: 'portrait' as const }
    };

    // Generate PDF and restore original styles after completion
    html2pdf().set(options).from(element).save().then(() => {
      element.style.maxHeight = originalMaxHeight;
      element.style.overflow = originalOverflow;
      element.style.height = originalHeight;
    }).catch((error: Error) => {
      console.error('PDF generation failed:', error);
      // Restore styles even on error
      element.style.maxHeight = originalMaxHeight;
      element.style.overflow = originalOverflow;
      element.style.height = originalHeight;
    });
  };

  return (
    <div id="loan-comparison-content" className="loan-comparison-tabs-container">
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
            traditionalRate={traditionalRate}
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

        <button type="button" className="btn-primary" onClick={handleGeneratePDF}>
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
          Download Results as PDF
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
  const [showYearlySummary, setShowYearlySummary] = useState(true);
  const displayedBreakdown = showFullBreakdown ? weeklyBreakdown : weeklyBreakdown.slice(0, 52); // Show first year

  // Calculate yearly summaries
  const yearlySummaries = [];
  const weeksPerYear = 52;
  const numYears = Math.ceil(weeklyBreakdown.length / weeksPerYear);

  for (let year = 0; year < numYears; year++) {
    const startWeek = year * weeksPerYear;
    const endWeek = Math.min((year + 1) * weeksPerYear, weeklyBreakdown.length);
    const yearData = weeklyBreakdown.slice(startWeek, endWeek);

    if (yearData.length === 0) continue;

    const totalInterest = yearData.reduce((sum: number, entry: WeeklyBreakdownEntry) => sum + entry.interest, 0);
    const totalPrincipalReduced = yearData.reduce((sum: number, entry: WeeklyBreakdownEntry) => sum + entry.principalReduced, 0);
    const startBalance = startWeek === 0 ? comparison.aio.effectivePrincipal : weeklyBreakdown[startWeek].balance;
    const endBalance = yearData[yearData.length - 1].balance;
    const balanceReduction = startBalance - endBalance;

    yearlySummaries.push({
      year: year + 1,
      weeks: yearData.length,
      startBalance,
      endBalance,
      totalInterest,
      totalPrincipalReduced,
      balanceReduction,
    });
  }

  return (
    <div className="math-tab">
      <h2>📅 Payment Breakdown</h2>

      {/* Toggle between yearly and weekly */}
      <div className="breakdown-toggle" style={{ display: 'flex', gap: '1rem', marginBottom: '2rem', justifyContent: 'center' }}>
        <button
          className={`btn-toggle ${showYearlySummary ? 'active' : ''}`}
          onClick={() => setShowYearlySummary(true)}
          style={{
            padding: '0.75rem 1.5rem',
            borderRadius: '8px',
            border: showYearlySummary ? '2px solid #9bc53d' : '2px solid #e2e8f0',
            background: showYearlySummary ? '#9bc53d' : 'white',
            color: showYearlySummary ? 'white' : '#718096',
            fontWeight: '600',
            cursor: 'pointer',
          }}
        >
          📊 Yearly Summary
        </button>
        <button
          className={`btn-toggle ${!showYearlySummary ? 'active' : ''}`}
          onClick={() => setShowYearlySummary(false)}
          style={{
            padding: '0.75rem 1.5rem',
            borderRadius: '8px',
            border: !showYearlySummary ? '2px solid #9bc53d' : '2px solid #e2e8f0',
            background: !showYearlySummary ? '#9bc53d' : 'white',
            color: !showYearlySummary ? 'white' : '#718096',
            fontWeight: '600',
            cursor: 'pointer',
          }}
        >
          📅 Weekly Details
        </button>
      </div>

      {/* Yearly Summary Table */}
      {showYearlySummary && (
        <div className="breakdown-section">
          <h3>Year-by-Year Summary</h3>
          <div className="breakdown-table-container">
            <table className="breakdown-table yearly-table">
              <thead>
                <tr>
                  <th>Year</th>
                  <th>Starting Balance</th>
                  <th>Ending Balance</th>
                  <th>Total Interest</th>
                  <th>Total Principal Reduced</th>
                  <th>Balance Reduction</th>
                </tr>
              </thead>
              <tbody>
                {yearlySummaries.map((summary) => (
                  <tr key={summary.year}>
                    <td><strong>Year {summary.year}</strong></td>
                    <td>{formatCurrency(summary.startBalance)}</td>
                    <td>{formatCurrency(summary.endBalance)}</td>
                    <td className="interest-col">{formatCurrency(summary.totalInterest)}</td>
                    <td className="principal-col">{formatCurrency(summary.totalPrincipalReduced)}</td>
                    <td><strong>{formatCurrency(summary.balanceReduction)}</strong></td>
                  </tr>
                ))}
                <tr className="total-row" style={{
                  borderTop: '3px solid #9bc53d',
                  background: 'linear-gradient(135deg, rgba(155, 197, 61, 0.1) 0%, white 100%)',
                  fontWeight: '700'
                }}>
                  <td><strong>TOTALS</strong></td>
                  <td>{formatCurrency(comparison.aio.effectivePrincipal || 0)}</td>
                  <td>$0</td>
                  <td className="interest-col">{formatCurrency(comparison.aio.totalInterestPaid)}</td>
                  <td className="principal-col">{formatCurrency(yearlySummaries.reduce((sum, s) => sum + s.totalPrincipalReduced, 0))}</td>
                  <td><strong>{formatCurrency(comparison.aio.effectivePrincipal || 0)}</strong></td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Weekly Breakdown Table */}
      {!showYearlySummary && (
        <div className="breakdown-section">
          <h3>
            AIO Loan Progress (Weekly)
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
      )}

      {/* Overall Summary Stats (shown for both views) */}
      <div className="breakdown-summary" style={{ marginTop: '2rem' }}>
        <div className="summary-stat">
          <div className="stat-label">Total {showYearlySummary ? 'Years' : 'Weeks'}</div>
          <div className="stat-value">{showYearlySummary ? Math.ceil(weeklyBreakdown.length / 52) : weeklyBreakdown.length}</div>
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
  );
}

// Visualize Tab Component
function VisualizeTab({ comparison, weeklyBreakdown, loanAmount, traditionalRate }: any) {
  // Sample balance data every 6 months for traditional, every month for AIO
  const traditionalMonths = comparison.traditional.monthsToPayoff;
  const aioMonths = comparison.aio.monthsToPayoff;
  const maxMonths = Math.max(traditionalMonths, aioMonths);

  // Generate traditional loan balance data (sample every 6 months)
  const traditionalData: { month: number; balance: number }[] = [];
  let tradBalance = loanAmount;

  for (let month = 0; month <= traditionalMonths; month += 6) {
    traditionalData.push({ month, balance: Math.max(0, tradBalance) });
    // Approximate 6 months of payments
    for (let i = 0; i < 6; i++) {
      const interest = tradBalance * (traditionalRate / 12);
      const principal = comparison.traditional.monthlyPayment - interest;
      tradBalance -= principal;
      if (tradBalance < 0) tradBalance = 0;
    }
  }

  // Generate AIO balance data from weekly breakdown (sample monthly)
  const aioData: { month: number; balance: number }[] = [];
  for (let month = 0; month <= aioMonths; month += 1) {
    const weekIndex = Math.floor(month * 4.33); // Approximate week
    if (weekIndex < weeklyBreakdown.length) {
      aioData.push({ month, balance: weeklyBreakdown[weekIndex].balance });
    }
  }

  // Chart dimensions
  const chartWidth = 800;
  const chartHeight = 400;
  const padding = { top: 20, right: 40, bottom: 60, left: 80 };
  const plotWidth = chartWidth - padding.left - padding.right;
  const plotHeight = chartHeight - padding.top - padding.bottom;

  // Scales
  const maxBalance = loanAmount * 1.1;
  const xScale = (month: number) => padding.left + (month / maxMonths) * plotWidth;
  const yScale = (balance: number) => padding.top + plotHeight - (balance / maxBalance) * plotHeight;

  // Generate path for traditional loan
  const tradPath = traditionalData
    .map((d, i) => `${i === 0 ? 'M' : 'L'} ${xScale(d.month)} ${yScale(d.balance)}`)
    .join(' ');

  // Generate path for AIO loan
  const aioPath = aioData
    .map((d, i) => `${i === 0 ? 'M' : 'L'} ${xScale(d.month)} ${yScale(d.balance)}`)
    .join(' ');

  return (
    <div className="visualize-tab">
      <h2>📈 Visual Analysis</h2>

      {/* Balance Over Time Chart */}
      <div className="chart-container">
        <h3>Balance Over Time</h3>
        <svg width={chartWidth} height={chartHeight} style={{ border: '1px solid #e2e8f0', borderRadius: '8px', background: 'white' }}>
          {/* Grid lines */}
          {[0, 0.25, 0.5, 0.75, 1].map((fraction) => {
            const y = yScale(maxBalance * fraction);
            return (
              <g key={fraction}>
                <line
                  x1={padding.left}
                  y1={y}
                  x2={chartWidth - padding.right}
                  y2={y}
                  stroke="#e2e8f0"
                  strokeWidth="1"
                />
                <text
                  x={padding.left - 10}
                  y={y + 4}
                  textAnchor="end"
                  fontSize="12"
                  fill="#718096"
                >
                  {formatCurrency(maxBalance * fraction)}
                </text>
              </g>
            );
          })}

          {/* X-axis labels */}
          {[0, 0.25, 0.5, 0.75, 1].map((fraction) => {
            const month = Math.round(maxMonths * fraction);
            const x = xScale(month);
            return (
              <text
                key={fraction}
                x={x}
                y={chartHeight - padding.bottom + 20}
                textAnchor="middle"
                fontSize="12"
                fill="#718096"
              >
                {month}mo
              </text>
            );
          })}

          {/* Traditional loan line */}
          <path d={tradPath} fill="none" stroke="#4299e1" strokeWidth="3" />

          {/* AIO loan line */}
          <path d={aioPath} fill="none" stroke="#9bc53d" strokeWidth="3" />

          {/* Legend */}
          <g transform={`translate(${padding.left}, ${padding.top - 10})`}>
            <line x1="0" y1="0" x2="30" y2="0" stroke="#4299e1" strokeWidth="3" />
            <text x="35" y="4" fontSize="14" fill="#2d3748">Traditional ({formatMonthsToYears(traditionalMonths)})</text>

            <line x1="260" y1="0" x2="290" y2="0" stroke="#9bc53d" strokeWidth="3" />
            <text x="295" y="4" fontSize="14" fill="#2d3748">All-In-One ({formatMonthsToYears(aioMonths)})</text>
          </g>

          {/* Axis labels */}
          <text
            x={chartWidth / 2}
            y={chartHeight - 10}
            textAnchor="middle"
            fontSize="14"
            fill="#2d3748"
            fontWeight="600"
          >
            Time (Months)
          </text>
          <text
            x={-chartHeight / 2}
            y={20}
            textAnchor="middle"
            fontSize="14"
            fill="#2d3748"
            fontWeight="600"
            transform={`rotate(-90 20 ${chartHeight / 2})`}
          >
            Loan Balance
          </text>
        </svg>
      </div>

      {/* Interest Comparison Bar Chart */}
      <div className="chart-container" style={{ marginTop: '3rem' }}>
        <h3>Total Interest Comparison</h3>
        <div style={{ display: 'flex', gap: '2rem', alignItems: 'flex-end', padding: '2rem' }}>
          {/* Traditional Bar */}
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            <div
              style={{
                width: '100%',
                height: `${(comparison.traditional.totalInterestPaid / Math.max(comparison.traditional.totalInterestPaid, comparison.aio.totalInterestPaid)) * 300}px`,
                background: 'linear-gradient(180deg, #4299e1 0%, #3182ce 100%)',
                borderRadius: '8px 8px 0 0',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'white',
                fontWeight: '700',
                fontSize: '1.25rem',
                minHeight: '60px',
              }}
            >
              {formatCurrency(comparison.traditional.totalInterestPaid)}
            </div>
            <div style={{ marginTop: '1rem', fontWeight: '600', color: '#2d3748' }}>
              Traditional Loan
            </div>
          </div>

          {/* AIO Bar */}
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            <div
              style={{
                width: '100%',
                height: `${(comparison.aio.totalInterestPaid / Math.max(comparison.traditional.totalInterestPaid, comparison.aio.totalInterestPaid)) * 300}px`,
                background: 'linear-gradient(180deg, #9bc53d 0%, #7da62e 100%)',
                borderRadius: '8px 8px 0 0',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'white',
                fontWeight: '700',
                fontSize: '1.25rem',
                minHeight: '60px',
              }}
            >
              {formatCurrency(comparison.aio.totalInterestPaid)}
            </div>
            <div style={{ marginTop: '1rem', fontWeight: '600', color: '#2d3748' }}>
              All-In-One Loan
            </div>
          </div>
        </div>

        {/* Savings Callout */}
        {comparison.interestSaved > 0 && (
          <div style={{
            margin: '2rem auto',
            maxWidth: '600px',
            padding: '1.5rem',
            background: 'linear-gradient(135deg, #e8f5e9 0%, #f1f8e9 100%)',
            border: '2px solid #9bc53d',
            borderRadius: '12px',
            textAlign: 'center',
          }}>
            <div style={{ fontSize: '0.9rem', color: '#558b2f', fontWeight: '600', marginBottom: '0.5rem' }}>
              💰 Total Interest Savings
            </div>
            <div style={{ fontSize: '2rem', fontWeight: '700', color: '#2d3748' }}>
              {formatCurrency(comparison.interestSaved)}
            </div>
            <div style={{ fontSize: '0.9rem', color: '#7da62e', marginTop: '0.5rem' }}>
              Save {formatMonthsToYears(comparison.timeSavedMonths)} by choosing All-In-One!
            </div>
          </div>
        )}
      </div>

      {/* Timeline Visualization */}
      <div className="chart-container" style={{ marginTop: '3rem' }}>
        <h3>Payoff Timeline</h3>
        <div style={{ padding: '2rem' }}>
          {/* Traditional Timeline */}
          <div style={{ marginBottom: '2rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', marginBottom: '0.5rem' }}>
              <span style={{ fontWeight: '600', color: '#2d3748', minWidth: '160px' }}>Traditional Loan:</span>
              <div style={{
                flex: `0 0 ${(traditionalMonths / maxMonths) * 100}%`,
                height: '40px',
                background: 'linear-gradient(90deg, #4299e1 0%, #3182ce 100%)',
                borderRadius: '8px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'white',
                fontWeight: '600',
              }}>
                {formatMonthsToYears(traditionalMonths)}
              </div>
            </div>
          </div>

          {/* AIO Timeline */}
          <div>
            <div style={{ display: 'flex', alignItems: 'center', marginBottom: '0.5rem' }}>
              <span style={{ fontWeight: '600', color: '#2d3748', minWidth: '160px' }}>All-In-One Loan:</span>
              <div style={{
                flex: `0 0 ${(aioMonths / maxMonths) * 100}%`,
                height: '40px',
                background: 'linear-gradient(90deg, #9bc53d 0%, #7da62e 100%)',
                borderRadius: '8px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'white',
                fontWeight: '600',
              }}>
                {formatMonthsToYears(aioMonths)}
              </div>
              {comparison.timeSavedMonths > 0 && (
                <span style={{
                  marginLeft: '1rem',
                  padding: '0.5rem 1rem',
                  background: '#e8f5e9',
                  color: '#558b2f',
                  borderRadius: '6px',
                  fontWeight: '600',
                  fontSize: '0.9rem',
                }}>
                  ⚡ {formatMonthsToYears(comparison.timeSavedMonths)} faster!
                </span>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
