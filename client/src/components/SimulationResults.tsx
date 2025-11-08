import { useState } from 'react';
import type { SimulationResult, MortgageDetails, CashFlowAnalysis } from '../types';
import './SimulationResults.css';

interface SimulationResultsProps {
  simulation: SimulationResult;
  mortgageDetails: MortgageDetails;
  cashFlow?: CashFlowAnalysis;
  onReset: () => void;
  onGenerateReport?: () => void;
  onCreateProposal?: () => void;
  onBackToCFA?: () => void;
}

type TabView = 'results' | 'paydown' | 'charts';
type PaydownView = 'monthly' | 'yearly';

export default function SimulationResults({
  simulation,
  mortgageDetails,
  cashFlow,
  onReset,
  onGenerateReport,
  onCreateProposal,
  onBackToCFA,
}: SimulationResultsProps) {
  const [activeTab, setActiveTab] = useState<TabView>('results');
  const [paydownView, setPaydownView] = useState<PaydownView>('yearly');
  const formatCurrency = (amount: number): string => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const formatDate = (date: Date): string => {
    return new Date(date).toLocaleDateString('en-US', {
      month: 'long',
      year: 'numeric',
    });
  };

  const yearsMonthsFromMonths = (totalMonths: number) => {
    const years = Math.floor(totalMonths / 12);
    const months = totalMonths % 12;
    return `${years} yr${years !== 1 ? 's' : ''} ${months} mo`;
  };

  // Calculate AIO suitability rating based on net cash flow
  const getTemperatureRating = (netCashFlow: number): {
    rating: string;
    color: string;
    icon: string;
  } => {
    if (netCashFlow >= 2000) {
      return { rating: 'EXCELLENT', color: '#10b981', icon: '🔥' };
    } else if (netCashFlow >= 1000) {
      return { rating: 'VERY GOOD', color: '#22c55e', icon: '✨' };
    } else if (netCashFlow >= 500) {
      return { rating: 'GOOD', color: '#84cc16', icon: '👍' };
    } else if (netCashFlow >= 200) {
      return { rating: 'FAIR', color: '#eab308', icon: '⚠️' };
    } else if (netCashFlow >= 0) {
      return { rating: 'MARGINAL', color: '#f59e0b', icon: '⚡' };
    } else {
      return { rating: 'NOT SUITABLE', color: '#ef4444', icon: '❌' };
    }
  };

  const netCashFlow = cashFlow ? cashFlow.netCashFlow : 0;
  const temperatureRating = getTemperatureRating(netCashFlow);
  const confidenceColor = cashFlow && cashFlow.confidence >= 0.8 ? '#48bb78' : cashFlow && cashFlow.confidence >= 0.6 ? '#ed8936' : '#f56565';
  const confidenceLabel = cashFlow && cashFlow.confidence >= 0.8 ? 'High' : cashFlow && cashFlow.confidence >= 0.6 ? 'Medium' : 'Low';

  return (
    <div className="simulation-results">
      <div className="results-header">
        <div className="header-icon">
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>
        <div style={{ flex: 1 }}>
          <h1>Simulation Results</h1>
          <p>Compare traditional mortgage vs All-In-One loan with cash flow offset</p>
        </div>
        <button
          className="btn-secondary"
          onClick={onBackToCFA}
          style={{ marginRight: '1rem' }}
        >
          <svg className="btn-icon" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 17l-5-5m0 0l5-5m-5 5h12" />
          </svg>
          Edit Cash Flow
        </button>
        <button
          className="btn-primary"
          onClick={onCreateProposal}
          style={{
            alignSelf: 'flex-start',
            border: '3px solid #3b82f6',
            boxShadow: '0 0 20px rgba(59, 130, 246, 0.5), 0 0 40px rgba(59, 130, 246, 0.3)',
            animation: 'pulse-glow 2s ease-in-out infinite',
            position: 'relative',
            background: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)',
          }}
        >
          <svg className="btn-icon" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
          Create Proposal
          <style>{`
            @keyframes pulse-glow {
              0%, 100% {
                box-shadow: 0 0 20px rgba(59, 130, 246, 0.5), 0 0 40px rgba(59, 130, 246, 0.3);
              }
              50% {
                box-shadow: 0 0 30px rgba(59, 130, 246, 0.8), 0 0 60px rgba(59, 130, 246, 0.5);
              }
            }
          `}</style>
        </button>
      </div>

      {/* Confidence and Suitability Banners */}
      {cashFlow && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem', marginBottom: '2rem' }}>
          <div className="confidence-banner" style={{ borderColor: confidenceColor, marginBottom: 0 }}>
            <div className="confidence-icon" style={{ background: confidenceColor }}>
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div>
              <strong>Analysis Confidence: {confidenceLabel}</strong>
              <p>AI confidence score: {(cashFlow.confidence * 100).toFixed(0)}%</p>
            </div>
          </div>

          <div className="confidence-banner" style={{ borderColor: temperatureRating.color, marginBottom: 0 }}>
            <div className="confidence-icon" style={{ background: temperatureRating.color }}>
              <span style={{ fontSize: '1.5rem' }}>{temperatureRating.icon}</span>
            </div>
            <div>
              <strong>{temperatureRating.rating}</strong>
              <p>AIO Loan Suitability</p>
            </div>
          </div>
        </div>
      )}

      {/* Summary Metric Cards */}
      {cashFlow && (
        <div className="summary-cards">
          <div className="summary-card income-card">
            <div className="card-icon">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div className="card-content">
              <div className="card-label">Total Monthly Income</div>
              <div className="card-value">{formatCurrency(cashFlow.totalIncome)}</div>
              <div className="card-description">Average across 12 months</div>
            </div>
          </div>

          <div className="summary-card expense-card">
            <div className="card-icon">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
              </svg>
            </div>
            <div className="card-content">
              <div className="card-label">Total Monthly Expenses</div>
              <div className="card-value">{formatCurrency(cashFlow.totalExpenses)}</div>
              <div className="card-description">Recurring expenses only</div>
            </div>
          </div>

          <div className="summary-card cashflow-card">
            <div className="card-icon">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
              </svg>
            </div>
            <div className="card-content">
              <div className="card-label">Net Cash Flow</div>
              <div className="card-value positive">{formatCurrency(cashFlow.netCashFlow)}</div>
              <div className="card-description">Available for loan offset</div>
            </div>
          </div>
        </div>
      )}

      {/* Tab Navigation */}
      {cashFlow && (
        <div className="results-tabs">
          <button
            className={`results-tab ${activeTab === 'results' ? 'active' : ''}`}
            onClick={() => setActiveTab('results')}
          >
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
            Loan Comparison
          </button>
          <button
            className={`results-tab ${activeTab === 'paydown' ? 'active' : ''}`}
            onClick={() => setActiveTab('paydown')}
          >
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
            </svg>
            Rate & Paydown Table
          </button>
          <button
            className={`results-tab ${activeTab === 'charts' ? 'active' : ''}`}
            onClick={() => setActiveTab('charts')}
          >
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 12l3-3 3 3 4-4M8 21l4-4 4 4M3 4h18M4 4h16v12a1 1 0 01-1 1H5a1 1 0 01-1-1V4z" />
            </svg>
            Charts
          </button>
        </div>
      )}

      {/* Tab Content */}
      {activeTab === 'results' && (
        <>
          {/* Savings Highlight */}
      <div className="savings-highlight">
        <div className="highlight-content">
          <div className="highlight-main">
            <div className="highlight-label">Total Interest Savings</div>
            <div className="highlight-value">{formatCurrency(Math.max(0, simulation.comparison.interestSavings))}</div>
          </div>
          <div className="highlight-stats">
            <div className="stat-item">
              <span className="stat-label">Time Saved</span>
              <span className="stat-value">{yearsMonthsFromMonths(Math.max(0, simulation.comparison.timeSavedMonths))}</span>
            </div>
            <div className="stat-divider"></div>
            <div className="stat-item">
              <span className="stat-label">Interest Reduction</span>
              <span className="stat-value">{formatCurrency(Math.max(0, simulation.comparison.interestSavings))}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Comparison Cards */}
      <div className="comparison-section">
        <h2>Side-by-Side Comparison</h2>

        <div className="comparison-cards">
          {/* Traditional Loan Card */}
          <div className="loan-card traditional-card">
            <div className="card-header">
              <h3>Traditional Mortgage</h3>
              <span className="card-badge">Current</span>
            </div>

            <div className="card-body">
              <div className="metric-row">
                <span className="metric-label">Monthly Payment</span>
                <span className="metric-value">{formatCurrency(simulation.traditionalLoan.monthlyPayment)}</span>
              </div>

              <div className="metric-row">
                <span className="metric-label">Total Interest Paid</span>
                <span className="metric-value">{formatCurrency(simulation.traditionalLoan.totalInterestPaid)}</span>
              </div>

              <div className="metric-row">
                <span className="metric-label">Payoff Timeline</span>
                <span className="metric-value">{yearsMonthsFromMonths(simulation.traditionalLoan.payoffMonths)}</span>
              </div>

              <div className="metric-row">
                <span className="metric-label">Payoff Date</span>
                <span className="metric-value">{formatDate(simulation.traditionalLoan.payoffDate)}</span>
              </div>
            </div>
          </div>

          {/* All-In-One Loan Card */}
          <div className="loan-card allinone-card">
            <div className="card-header">
              <h3>All-In-One Loan</h3>
              <span className="card-badge recommended">Recommended</span>
            </div>

            <div className="card-body">
              <div className="metric-row">
                <span className="metric-label">Monthly Payment</span>
                <span className="metric-value">{formatCurrency(simulation.allInOneLoan.monthlyPayment)}</span>
              </div>

              <div className="metric-row highlight">
                <span className="metric-label">Total Interest Paid</span>
                <span className="metric-value savings">
                  {formatCurrency(simulation.allInOneLoan.totalInterestPaid)}
                  <span className="savings-badge">Save {formatCurrency(Math.max(0, simulation.allInOneLoan.interestSavings || 0))}</span>
                </span>
              </div>

              <div className="metric-row highlight">
                <span className="metric-label">Payoff Timeline</span>
                <span className="metric-value savings">
                  {yearsMonthsFromMonths(simulation.allInOneLoan.payoffMonths)}
                  <span className="savings-badge">{yearsMonthsFromMonths(Math.max(0, simulation.allInOneLoan.monthsSaved || 0))} faster</span>
                </span>
              </div>

              <div className="metric-row">
                <span className="metric-label">Payoff Date</span>
                <span className="metric-value">{formatDate(simulation.allInOneLoan.payoffDate)}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Secondary Action Buttons */}
      <div className="results-actions">
        {onGenerateReport && (
          <button className="btn-secondary" onClick={onGenerateReport}>
            <svg className="btn-icon" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            Download Report (Coming Soon)
          </button>
        )}
        <button className="btn-secondary" onClick={onReset}>
          <svg className="btn-icon" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          New Simulation
        </button>
      </div>
        </>
      )}

      {/* Rate & Paydown Table Tab */}
      {activeTab === 'paydown' && (
        <div className="paydown-tab-content" style={{ padding: '2rem', background: 'white', borderRadius: '12px', border: '2px solid #e2e8f0' }}>
          <h2 style={{ textAlign: 'center', marginBottom: '2rem', color: '#1e293b' }}>📊 Rate & Paydown Analysis</h2>

          {/* Rate Comparison Section */}
          <div style={{ marginBottom: '3rem', padding: '2rem', background: '#f8fafc', borderRadius: '8px' }}>
            <h3 style={{ marginBottom: '1.5rem', color: '#334155', fontSize: '1.25rem' }}>Interest Rates</h3>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem' }}>
              <div style={{ padding: '1.5rem', background: 'white', borderRadius: '8px', border: '2px solid #4299e1' }}>
                <div style={{ fontSize: '0.9rem', color: '#718096', marginBottom: '0.5rem' }}>Traditional Mortgage Rate</div>
                <div style={{ fontSize: '2.5rem', fontWeight: '700', color: '#4299e1' }}>
                  {mortgageDetails.interestRate.toFixed(3)}%
                </div>
              </div>
              <div style={{ padding: '1.5rem', background: 'white', borderRadius: '8px', border: '2px solid #9bc53d' }}>
                <div style={{ fontSize: '0.9rem', color: '#718096', marginBottom: '0.5rem' }}>All-In-One Loan Rate</div>
                <div style={{ fontSize: '2.5rem', fontWeight: '700', color: '#9bc53d' }}>
                  {mortgageDetails.aioInterestRate.toFixed(3)}%
                </div>
                <div style={{ fontSize: '0.85rem', color: '#7da62e', marginTop: '0.5rem' }}>
                  +{(mortgageDetails.aioInterestRate - mortgageDetails.interestRate).toFixed(3)}% premium for offset features
                </div>
              </div>
            </div>
          </div>

          {/* Amortization Table */}
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
              <h3 style={{ color: '#334155', fontSize: '1.25rem', margin: 0 }}>Paydown Schedule</h3>
              <div style={{ display: 'flex', gap: '0.5rem', background: '#f1f5f9', padding: '0.25rem', borderRadius: '8px' }}>
                <button
                  onClick={() => setPaydownView('yearly')}
                  style={{
                    padding: '0.5rem 1rem',
                    border: 'none',
                    borderRadius: '6px',
                    background: paydownView === 'yearly' ? '#1e293b' : 'transparent',
                    color: paydownView === 'yearly' ? 'white' : '#64748b',
                    fontWeight: '600',
                    cursor: 'pointer',
                    transition: 'all 0.2s'
                  }}
                >
                  Yearly
                </button>
                <button
                  onClick={() => setPaydownView('monthly')}
                  style={{
                    padding: '0.5rem 1rem',
                    border: 'none',
                    borderRadius: '6px',
                    background: paydownView === 'monthly' ? '#1e293b' : 'transparent',
                    color: paydownView === 'monthly' ? 'white' : '#64748b',
                    fontWeight: '600',
                    cursor: 'pointer',
                    transition: 'all 0.2s'
                  }}
                >
                  Monthly
                </button>
              </div>
            </div>

            <div style={{ overflowX: 'auto', maxHeight: '600px', overflowY: 'auto' }}>
              <table style={{
                width: '100%',
                borderCollapse: 'collapse',
                fontSize: '0.85rem'
              }}>
                <thead style={{ position: 'sticky', top: 0, zIndex: 10 }}>
                  <tr style={{ background: '#1e293b', color: 'white' }}>
                    <th style={{ padding: '1rem', textAlign: 'left', borderBottom: '2px solid #cbd5e1' }}>Year</th>
                    {paydownView === 'monthly' && (
                      <th style={{ padding: '1rem', textAlign: 'left', borderBottom: '2px solid #cbd5e1' }}>Month</th>
                    )}
                    <th style={{ padding: '1rem', textAlign: 'right', borderBottom: '2px solid #cbd5e1' }}>Traditional Balance</th>
                    <th style={{ padding: '1rem', textAlign: 'right', borderBottom: '2px solid #cbd5e1' }}>Principal Paid</th>
                    <th style={{ padding: '1rem', textAlign: 'right', borderBottom: '2px solid #cbd5e1' }}>AIO Balance</th>
                    <th style={{ padding: '1rem', textAlign: 'right', borderBottom: '2px solid #cbd5e1' }}>Principal Paid</th>
                    <th style={{ padding: '1rem', textAlign: 'right', borderBottom: '2px solid #cbd5e1' }}>Savings</th>
                  </tr>
                </thead>
                <tbody>
                  {(() => {
                    const rows = [];
                    const { currentBalance, interestRate, aioInterestRate, monthlyPayment } = mortgageDetails;
                    const monthlyRate = interestRate / 100 / 12;
                    const netCashFlow = cashFlow?.monthlyLeftover || cashFlow?.netCashFlow || 0;

                    // Traditional loan tracking
                    let tradBalance = currentBalance;
                    let tradTotalInterest = 0;
                    let tradTotalPrincipal = 0;

                    // AIO loan tracking
                    let aioBalance = currentBalance;
                    let aioTotalInterest = 0;
                    let aioTotalPrincipal = 0;
                    const aioMonthlyRate = aioInterestRate / 100 / 12;
                    const avgMonthlyBalance = cashFlow?.monthlyDeposits ? (cashFlow.monthlyDeposits + netCashFlow) / 2 : 0;

                    const maxMonths = Math.max(simulation.traditionalLoan.payoffMonths, simulation.allInOneLoan.payoffMonths);

                    if (paydownView === 'yearly') {
                      // Yearly view - show year-end balances and annual totals
                      const maxYears = Math.ceil(maxMonths / 12);

                      for (let year = 1; year <= maxYears; year++) {
                        let yearTradPrincipal = 0;
                        let yearAioPrincipal = 0;

                        // Calculate 12 months for this year
                        for (let m = 1; m <= 12; m++) {
                          const month = (year - 1) * 12 + m;
                          if (month > maxMonths) break;

                          // Traditional calculation
                          if (tradBalance > 0.01) {
                            const tradInterest = tradBalance * monthlyRate;
                            const tradPrincipal = Math.min(monthlyPayment - tradInterest, tradBalance);
                            tradBalance = Math.max(0, tradBalance - tradPrincipal);
                            tradTotalInterest += tradInterest;
                            tradTotalPrincipal += tradPrincipal;
                            yearTradPrincipal += tradPrincipal;
                          }

                          // AIO calculation
                          if (aioBalance > 0.01) {
                            const effectivePrincipal = Math.max(0, aioBalance - avgMonthlyBalance);
                            const aioInterest = effectivePrincipal * aioMonthlyRate;
                            const aioPrincipal = Math.min(netCashFlow, aioBalance);
                            aioBalance = Math.max(0, aioBalance - aioPrincipal);
                            aioTotalInterest += aioInterest;
                            aioTotalPrincipal += aioPrincipal;
                            yearAioPrincipal += aioPrincipal;
                          }
                        }

                        const savings = tradTotalInterest - aioTotalInterest;

                        rows.push(
                          <tr key={year} style={{
                            background: year % 2 === 0 ? '#f8fafc' : 'white',
                            borderBottom: '1px solid #e2e8f0'
                          }}>
                            <td style={{ padding: '0.75rem', fontWeight: '700', color: '#334155' }}>{year}</td>
                            <td style={{ padding: '0.75rem', textAlign: 'right', color: '#4299e1', fontWeight: '600' }}>
                              {formatCurrency(tradBalance)}
                            </td>
                            <td style={{ padding: '0.75rem', textAlign: 'right', color: '#718096' }}>
                              {formatCurrency(yearTradPrincipal)}
                            </td>
                            <td style={{ padding: '0.75rem', textAlign: 'right', color: '#9bc53d', fontWeight: '600' }}>
                              {aioBalance > 0.01 ? formatCurrency(aioBalance) : <span style={{ color: '#10b981', fontWeight: '700' }}>PAID OFF ✓</span>}
                            </td>
                            <td style={{ padding: '0.75rem', textAlign: 'right', color: '#718096' }}>
                              {formatCurrency(yearAioPrincipal)}
                            </td>
                            <td style={{ padding: '0.75rem', textAlign: 'right', fontWeight: '700', color: '#10b981' }}>
                              {formatCurrency(savings)}
                            </td>
                          </tr>
                        );

                        // Stop if both loans are paid off
                        if (tradBalance <= 0.01 && aioBalance <= 0.01) break;
                      }
                    } else {
                      // Monthly view - show each month with yearly subtotals
                      let yearTradPrincipal = 0;
                      let yearAioPrincipal = 0;
                      let yearStartTradInterest = tradTotalInterest;
                      let yearStartAioInterest = aioTotalInterest;

                      for (let month = 1; month <= maxMonths; month++) {
                        const year = Math.ceil(month / 12);
                        const monthInYear = ((month - 1) % 12) + 1;

                        // Traditional calculation
                        let tradPrincipal = 0;
                        if (tradBalance > 0.01) {
                          const tradInterest = tradBalance * monthlyRate;
                          tradPrincipal = Math.min(monthlyPayment - tradInterest, tradBalance);
                          tradBalance = Math.max(0, tradBalance - tradPrincipal);
                          tradTotalInterest += tradInterest;
                          tradTotalPrincipal += tradPrincipal;
                          yearTradPrincipal += tradPrincipal;
                        }

                        // AIO calculation
                        let aioPrincipal = 0;
                        if (aioBalance > 0.01) {
                          const effectivePrincipal = Math.max(0, aioBalance - avgMonthlyBalance);
                          const aioInterest = effectivePrincipal * aioMonthlyRate;
                          aioPrincipal = Math.min(netCashFlow, aioBalance);
                          aioBalance = Math.max(0, aioBalance - aioPrincipal);
                          aioTotalInterest += aioInterest;
                          aioTotalPrincipal += aioPrincipal;
                          yearAioPrincipal += aioPrincipal;
                        }

                        const savings = tradTotalInterest - aioTotalInterest;

                        rows.push(
                          <tr key={`m${month}`} style={{
                            background: 'white',
                            borderBottom: '1px solid #e2e8f0'
                          }}>
                            <td style={{ padding: '0.75rem', color: '#94a3b8' }}>{year}</td>
                            <td style={{ padding: '0.75rem', fontWeight: '600', color: '#334155' }}>{monthInYear}</td>
                            <td style={{ padding: '0.75rem', textAlign: 'right', color: '#4299e1', fontWeight: '600' }}>
                              {formatCurrency(tradBalance)}
                            </td>
                            <td style={{ padding: '0.75rem', textAlign: 'right', color: '#718096' }}>
                              {formatCurrency(tradPrincipal)}
                            </td>
                            <td style={{ padding: '0.75rem', textAlign: 'right', color: '#9bc53d', fontWeight: '600' }}>
                              {aioBalance > 0.01 ? formatCurrency(aioBalance) : <span style={{ color: '#10b981', fontWeight: '700', fontSize: '0.8rem' }}>PAID OFF ✓</span>}
                            </td>
                            <td style={{ padding: '0.75rem', textAlign: 'right', color: '#718096' }}>
                              {formatCurrency(aioPrincipal)}
                            </td>
                            <td style={{ padding: '0.75rem', textAlign: 'right', fontWeight: '700', color: '#10b981' }}>
                              {formatCurrency(savings)}
                            </td>
                          </tr>
                        );

                        // Add year subtotal row at end of each year
                        if (monthInYear === 12 || month === maxMonths || (tradBalance <= 0.01 && aioBalance <= 0.01)) {
                          const yearSavings = (tradTotalInterest - yearStartTradInterest) - (aioTotalInterest - yearStartAioInterest);

                          rows.push(
                            <tr key={`subtotal${year}`} style={{
                              background: '#1e293b',
                              color: 'white',
                              fontWeight: '700',
                              borderBottom: '2px solid #cbd5e1'
                            }}>
                              <td style={{ padding: '0.75rem' }} colSpan={2}>Year {year} Total</td>
                              <td style={{ padding: '0.75rem', textAlign: 'right' }}>—</td>
                              <td style={{ padding: '0.75rem', textAlign: 'right' }}>
                                {formatCurrency(yearTradPrincipal)}
                              </td>
                              <td style={{ padding: '0.75rem', textAlign: 'right' }}>—</td>
                              <td style={{ padding: '0.75rem', textAlign: 'right' }}>
                                {formatCurrency(yearAioPrincipal)}
                              </td>
                              <td style={{ padding: '0.75rem', textAlign: 'right', color: '#10b981' }}>
                                {formatCurrency(yearSavings)}
                              </td>
                            </tr>
                          );

                          // Reset year totals
                          yearTradPrincipal = 0;
                          yearAioPrincipal = 0;
                          yearStartTradInterest = tradTotalInterest;
                          yearStartAioInterest = aioTotalInterest;
                        }

                        // Stop if both loans are paid off
                        if (tradBalance <= 0.01 && aioBalance <= 0.01) break;
                      }
                    }

                    return rows;
                  })()}
                </tbody>
              </table>
            </div>
            <div style={{
              marginTop: '1.5rem',
              padding: '1rem',
              background: '#e8f5e9',
              borderRadius: '8px',
              fontSize: '0.9rem',
              color: '#558b2f',
              textAlign: 'center'
            }}>
              💡 The AIO loan shows higher interest savings over time due to the cash flow offset reducing the daily balance
            </div>
          </div>
        </div>
      )}

      {/* Charts Tab */}
      {activeTab === 'charts' && (
        <div className="charts-tab-content">
          <h2 style={{ textAlign: 'center', marginBottom: '2rem', color: '#1e293b' }}>📈 Visual Analysis</h2>

          {/* Balance Over Time Chart */}
          <div className="chart-section" style={{ marginBottom: '3rem', padding: '2rem', background: 'white', borderRadius: '12px', border: '2px solid #e2e8f0' }}>
            <h3 style={{ marginBottom: '1.5rem', color: '#334155' }}>Loan Balance Over Time</h3>
            <div style={{ padding: '2rem', background: '#f8fafc', borderRadius: '8px', textAlign: 'center', position: 'relative' }}>
              <svg width="800" height="400" style={{ maxWidth: '100%', height: 'auto' }}>
                {(() => {
                  const traditionalMonths = simulation.traditionalLoan.payoffMonths;
                  const aioMonths = simulation.allInOneLoan.payoffMonths;
                  const maxMonths = Math.max(traditionalMonths, aioMonths);
                  const loanAmount = mortgageDetails.currentBalance || 0;

                  const padding = { top: 40, right: 40, bottom: 60, left: 80 };
                  const width = 800;
                  const height = 400;
                  const plotWidth = width - padding.left - padding.right;
                  const plotHeight = height - padding.top - padding.bottom;

                  const xScale = (month: number) => padding.left + (month / maxMonths) * plotWidth;
                  const yScale = (balance: number) => padding.top + plotHeight - (balance / (loanAmount * 1.1)) * plotHeight;

                  // Calculate traditional balance when AIO hits $0
                  const traditionalBalanceAtAIOPayoff = loanAmount * (1 - aioMonths / traditionalMonths);

                  return (
                    <>
                      {/* Grid lines */}
                      {[0, 0.25, 0.5, 0.75, 1].map((fraction) => {
                        const y = yScale((loanAmount * 1.1) * fraction);
                        return (
                          <g key={fraction}>
                            <line x1={padding.left} y1={y} x2={width - padding.right} y2={y} stroke="#e2e8f0" strokeWidth="1" />
                            <text x={padding.left - 10} y={y + 4} textAnchor="end" fontSize="12" fill="#718096">
                              {formatCurrency((loanAmount * 1.1) * fraction)}
                            </text>
                          </g>
                        );
                      })}

                      {/* Traditional loan line */}
                      <path
                        d={`M ${xScale(0)} ${yScale(loanAmount)} L ${xScale(traditionalMonths)} ${yScale(0)}`}
                        stroke="#4299e1"
                        strokeWidth="3"
                        fill="none"
                      />

                      {/* AIO loan line */}
                      <path
                        d={`M ${xScale(0)} ${yScale(loanAmount)} L ${xScale(aioMonths)} ${yScale(0)}`}
                        stroke="#9bc53d"
                        strokeWidth="3"
                        fill="none"
                      />

                      {/* Vertical line showing AIO payoff point */}
                      <line
                        x1={xScale(aioMonths)}
                        y1={padding.top}
                        x2={xScale(aioMonths)}
                        y2={height - padding.bottom}
                        stroke="#9bc53d"
                        strokeWidth="2"
                        strokeDasharray="5,5"
                        opacity="0.6"
                      />

                      {/* Label for AIO payoff - positioned to avoid overlap */}
                      <g transform={`translate(${xScale(aioMonths)}, ${Math.max(yScale(traditionalBalanceAtAIOPayoff) - 40, padding.top + 60)})`}>
                        <rect x="-70" y="-30" width="140" height="28" fill="#fff5e6" stroke="#9bc53d" strokeWidth="2" rx="4" />
                        <text x="0" y="-18" textAnchor="middle" fontSize="11" fontWeight="700" fill="#558b2f">
                          AIO Paid Off!
                        </text>
                        <text x="0" y="-6" textAnchor="middle" fontSize="10" fill="#718096">
                          Traditional: {formatCurrency(traditionalBalanceAtAIOPayoff)}
                        </text>
                      </g>

                      {/* Interactive data points along the lines */}
                      {[0, 0.25, 0.5, 0.75, 1].map((fraction) => {
                        const month = Math.round(maxMonths * fraction);
                        const tradBalance = loanAmount * (1 - (month / traditionalMonths));
                        const aioBalance = month <= aioMonths ? loanAmount * (1 - (month / aioMonths)) : 0;

                        return (
                          <g key={`points-${fraction}`}>
                            {/* Traditional point */}
                            {month <= traditionalMonths && (
                              <circle
                                cx={xScale(month)}
                                cy={yScale(tradBalance)}
                                r="6"
                                fill="#4299e1"
                                stroke="white"
                                strokeWidth="2"
                                style={{ cursor: 'pointer' }}
                              >
                                <title>
                                  Traditional Loan{'\n'}
                                  Month {month}{'\n'}
                                  Balance: {formatCurrency(tradBalance)}
                                </title>
                              </circle>
                            )}

                            {/* AIO point */}
                            {month <= aioMonths && (
                              <circle
                                cx={xScale(month)}
                                cy={yScale(aioBalance)}
                                r="6"
                                fill="#9bc53d"
                                stroke="white"
                                strokeWidth="2"
                                style={{ cursor: 'pointer' }}
                              >
                                <title>
                                  All-In-One Loan{'\n'}
                                  Month {month}{'\n'}
                                  Balance: {formatCurrency(aioBalance)}
                                </title>
                              </circle>
                            )}
                          </g>
                        );
                      })}

                      {/* Legend */}
                      <g transform={`translate(${padding.left}, 20)`}>
                        <line x1="0" y1="0" x2="30" y2="0" stroke="#4299e1" strokeWidth="3" />
                        <text x="35" y="4" fontSize="14" fill="#2d3748">Traditional ({yearsMonthsFromMonths(traditionalMonths)})</text>

                        <line x1="260" y1="0" x2="290" y2="0" stroke="#9bc53d" strokeWidth="3" />
                        <text x="295" y="4" fontSize="14" fill="#2d3748">All-In-One ({yearsMonthsFromMonths(aioMonths)})</text>
                      </g>

                      {/* X-axis labels */}
                      {[0, 0.25, 0.5, 0.75, 1].map((fraction) => {
                        const month = Math.round(maxMonths * fraction);
                        return (
                          <text key={fraction} x={xScale(month)} y={height - 30} textAnchor="middle" fontSize="12" fill="#718096">
                            {month}mo
                          </text>
                        );
                      })}

                      <text x={width / 2} y={height - 5} textAnchor="middle" fontSize="14" fill="#2d3748" fontWeight="600">
                        Time (Months)
                      </text>
                    </>
                  );
                })()}
              </svg>
            </div>
          </div>

          {/* Interest vs Principal Pie Charts */}
          <div className="chart-section" style={{ marginBottom: '3rem', padding: '2rem', background: 'white', borderRadius: '12px', border: '2px solid #e2e8f0' }}>
            <h3 style={{ marginBottom: '1.5rem', color: '#334155' }}>Interest vs Principal Breakdown</h3>
            <div style={{ display: 'flex', gap: '3rem', justifyContent: 'center', alignItems: 'center', padding: '2rem', background: '#f8fafc', borderRadius: '8px', flexWrap: 'wrap' }}>
              {(() => {
                // Calculate principal paid for each loan
                const tradPrincipal = mortgageDetails.currentBalance;
                const tradInterest = simulation.traditionalLoan.totalInterestPaid;
                const tradTotal = tradPrincipal + tradInterest;
                const tradInterestPercent = (tradInterest / tradTotal) * 100;
                const tradPrincipalPercent = (tradPrincipal / tradTotal) * 100;

                const aioPrincipal = mortgageDetails.currentBalance;
                const aioInterest = simulation.allInOneLoan.totalInterestPaid;
                const aioTotal = aioPrincipal + aioInterest;
                const aioInterestPercent = (aioInterest / aioTotal) * 100;
                const aioPrincipalPercent = (aioPrincipal / aioTotal) * 100;

                const createPieChart = (interestPercent: number, principalPercent: number, colors: { interest: string, principal: string }, title: string, interest: number, principal: number) => {
                  const radius = 100;
                  const centerX = 120;
                  const centerY = 120;

                  // Calculate pie slice paths
                  const interestAngle = (interestPercent / 100) * 360;
                  const principalAngle = (principalPercent / 100) * 360;

                  const polarToCartesian = (angle: number) => {
                    const radians = ((angle - 90) * Math.PI) / 180;
                    return {
                      x: centerX + radius * Math.cos(radians),
                      y: centerY + radius * Math.sin(radians)
                    };
                  };

                  const interestStart = polarToCartesian(0);
                  const interestEnd = polarToCartesian(interestAngle);
                  const principalEnd = polarToCartesian(360);

                  const interestLargeArc = interestAngle > 180 ? 1 : 0;
                  const principalLargeArc = principalAngle > 180 ? 1 : 0;

                  const interestPath = `M ${centerX},${centerY} L ${interestStart.x},${interestStart.y} A ${radius},${radius} 0 ${interestLargeArc},1 ${interestEnd.x},${interestEnd.y} Z`;
                  const principalPath = `M ${centerX},${centerY} L ${interestEnd.x},${interestEnd.y} A ${radius},${radius} 0 ${principalLargeArc},1 ${principalEnd.x},${principalEnd.y} Z`;

                  return (
                    <div style={{ flex: '0 0 auto', textAlign: 'center' }}>
                      <h4 style={{ marginBottom: '1rem', color: '#2d3748', fontSize: '1.1rem' }}>{title}</h4>
                      <svg width="240" height="240" style={{ filter: 'drop-shadow(0 4px 6px rgba(0,0,0,0.1))' }}>
                        {/* Interest slice */}
                        <path
                          d={interestPath}
                          fill={colors.interest}
                          stroke="white"
                          strokeWidth="2"
                          style={{ cursor: 'pointer', transition: 'opacity 0.2s' }}
                          opacity="0.9"
                        >
                          <title>Interest: {formatCurrency(interest)} ({interestPercent.toFixed(1)}%)</title>
                        </path>

                        {/* Principal slice */}
                        <path
                          d={principalPath}
                          fill={colors.principal}
                          stroke="white"
                          strokeWidth="2"
                          style={{ cursor: 'pointer', transition: 'opacity 0.2s' }}
                          opacity="0.9"
                        >
                          <title>Principal: {formatCurrency(principal)} ({principalPercent.toFixed(1)}%)</title>
                        </path>

                        {/* Center circle with total */}
                        <circle cx={centerX} cy={centerY} r="50" fill="white" />
                        <text x={centerX} y={centerY - 10} textAnchor="middle" fontSize="12" fill="#718096" fontWeight="600">
                          Total Cost
                        </text>
                        <text x={centerX} y={centerY + 10} textAnchor="middle" fontSize="16" fill="#2d3748" fontWeight="700">
                          {formatCurrency(interest + principal)}
                        </text>
                      </svg>

                      {/* Legend */}
                      <div style={{ marginTop: '1rem', display: 'flex', flexDirection: 'column', gap: '0.5rem', alignItems: 'flex-start', justifyContent: 'center', margin: '1rem auto', maxWidth: '200px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                          <div style={{ width: '16px', height: '16px', background: colors.interest, borderRadius: '3px' }}></div>
                          <span style={{ fontSize: '0.9rem', color: '#2d3748' }}>
                            Interest: {formatCurrency(interest)}
                          </span>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                          <div style={{ width: '16px', height: '16px', background: colors.principal, borderRadius: '3px' }}></div>
                          <span style={{ fontSize: '0.9rem', color: '#2d3748' }}>
                            Principal: {formatCurrency(principal)}
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                };

                return (
                  <>
                    {createPieChart(
                      tradInterestPercent,
                      tradPrincipalPercent,
                      { interest: '#ef4444', principal: '#60a5fa' },
                      'Traditional Mortgage',
                      tradInterest,
                      tradPrincipal
                    )}
                    {/* AIO chart with green aura */}
                    <div style={{ position: 'relative' }}>
                      <div style={{
                        position: 'absolute',
                        top: '50%',
                        left: '50%',
                        transform: 'translate(-50%, -50%)',
                        width: '280px',
                        height: '280px',
                        borderRadius: '50%',
                        background: 'radial-gradient(circle, rgba(155, 197, 61, 0.15) 0%, transparent 70%)',
                        pointerEvents: 'none',
                        zIndex: 0
                      }}></div>
                      {createPieChart(
                        aioInterestPercent,
                        aioPrincipalPercent,
                        { interest: '#ef4444', principal: '#60a5fa' },
                        'All-In-One Loan',
                        aioInterest,
                        aioPrincipal
                      )}
                    </div>
                  </>
                );
              })()}
            </div>

            {simulation.comparison.interestSavings > 0 && (
              <div style={{
                margin: '2rem auto 0',
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
                  {formatCurrency(simulation.comparison.interestSavings)}
                </div>
                <div style={{ fontSize: '0.9rem', color: '#7da62e', marginTop: '0.5rem' }}>
                  The AIO loan pays {((simulation.traditionalLoan.totalInterestPaid - simulation.allInOneLoan.totalInterestPaid) / simulation.traditionalLoan.totalInterestPaid * 100).toFixed(1)}% less interest!
                </div>
              </div>
            )}
          </div>

          {/* Timeline Comparison */}
          <div className="chart-section" style={{ padding: '2rem', background: 'white', borderRadius: '12px', border: '2px solid #e2e8f0' }}>
            <h3 style={{ marginBottom: '1.5rem', color: '#334155' }}>Payoff Timeline</h3>
            <div style={{ padding: '2rem', background: '#f8fafc', borderRadius: '8px', maxWidth: '100%', overflow: 'hidden' }}>
              <div style={{ marginBottom: '2rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', marginBottom: '0.5rem', gap: '1rem' }}>
                  <span style={{ fontWeight: '600', color: '#2d3748', minWidth: '140px', flexShrink: 0 }}>Traditional Loan:</span>
                  <div style={{ flex: 1, position: 'relative', height: '40px' }}>
                    <div style={{
                      width: `${(simulation.traditionalLoan.payoffMonths / Math.max(simulation.traditionalLoan.payoffMonths, simulation.allInOneLoan.payoffMonths)) * 100}%`,
                      height: '40px',
                      background: 'linear-gradient(90deg, #4299e1 0%, #3182ce 100%)',
                      borderRadius: '8px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: 'white',
                      fontWeight: '600',
                      minWidth: '120px',
                    }}>
                      {yearsMonthsFromMonths(simulation.traditionalLoan.payoffMonths)}
                    </div>
                  </div>
                </div>
              </div>

              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '0.5rem' }}>
                  <span style={{ fontWeight: '600', color: '#2d3748', minWidth: '140px', flexShrink: 0 }}>All-In-One Loan:</span>
                  <div style={{ flex: 1, position: 'relative', height: '40px', display: 'flex' }}>
                    {/* AIO payoff time */}
                    <div style={{
                      width: `${(simulation.allInOneLoan.payoffMonths / Math.max(simulation.traditionalLoan.payoffMonths, simulation.allInOneLoan.payoffMonths)) * 100}%`,
                      height: '40px',
                      background: 'linear-gradient(90deg, #9bc53d 0%, #7da62e 100%)',
                      borderRadius: '8px 0 0 8px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: 'white',
                      fontWeight: '600',
                      minWidth: '120px',
                    }}>
                      {yearsMonthsFromMonths(simulation.allInOneLoan.payoffMonths)}
                    </div>
                    {/* Savings extension - fills to match traditional bar */}
                    {simulation.comparison.timeSavedMonths > 0 && (
                      <div style={{
                        width: `${(simulation.comparison.timeSavedMonths / Math.max(simulation.traditionalLoan.payoffMonths, simulation.allInOneLoan.payoffMonths)) * 100}%`,
                        height: '40px',
                        background: 'repeating-linear-gradient(45deg, #e8f5e9, #e8f5e9 10px, #d4edda 10px, #d4edda 20px)',
                        borderRadius: '0 8px 8px 0',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: '#558b2f',
                        fontWeight: '600',
                        fontSize: '0.85rem',
                        border: '2px solid #9bc53d',
                        borderLeft: 'none'
                      }}>
                        ⚡ {yearsMonthsFromMonths(simulation.comparison.timeSavedMonths)} faster
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
