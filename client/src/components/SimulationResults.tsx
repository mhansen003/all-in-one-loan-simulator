import { useState } from 'react';
import type { SimulationResult, MortgageDetails, CashFlowAnalysis } from '../types';
import CashFlowReview from './CashFlowReview';
import ProposalBuilder from './ProposalBuilder';
import { SignatureGenerator } from './SignatureGenerator';
import './SimulationResults.css';

interface SimulationResultsProps {
  simulation: SimulationResult;
  mortgageDetails: MortgageDetails;
  cashFlow?: CashFlowAnalysis;
  depositFrequency?: 'monthly' | 'biweekly' | 'weekly';
  onReset: () => void;
  onGenerateReport?: () => void;
  onCreateProposal?: () => void;
  onCashFlowUpdate?: (cashFlow: CashFlowAnalysis) => void;
}

type TabView = 'results' | 'cashflow' | 'charts' | 'proposal' | 'signature';

export default function SimulationResults({
  simulation,
  mortgageDetails,
  cashFlow,
  depositFrequency = 'monthly',
  onReset,
  onGenerateReport,
  onCreateProposal,
  onCashFlowUpdate,
}: SimulationResultsProps) {
  const [activeTab, setActiveTab] = useState<TabView>('results');
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

  return (
    <div className="simulation-results">
      <div className="results-header">
        <div className="header-icon">
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>
        <h1>Simulation Results</h1>
        <p>Compare traditional mortgage vs All-In-One loan with cash flow offset</p>
      </div>

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
            className={`results-tab ${activeTab === 'cashflow' ? 'active' : ''}`}
            onClick={() => setActiveTab('cashflow')}
          >
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            Cash Flow Analysis
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
          <button
            className={`results-tab ${activeTab === 'proposal' ? 'active' : ''}`}
            onClick={() => setActiveTab('proposal')}
          >
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            Create Proposal
          </button>
          <button
            className={`results-tab ${activeTab === 'signature' ? 'active' : ''}`}
            onClick={() => setActiveTab('signature')}
          >
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
            </svg>
            Email Signature
          </button>
        </div>
      )}

      {/* Primary CTA - Create Proposal */}
      {onCreateProposal && (
        <div className="primary-cta-container">
          <button className="btn-primary-cta" onClick={onCreateProposal}>
            <svg className="btn-icon" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            Create Client Proposal
            <svg className="btn-icon" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
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

      {/* Details Section */}
      <div className="details-section">
        <h2>How the All-In-One Loan Works</h2>

        <div className="detail-cards">
          <div className="detail-card">
            <div className="detail-icon">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <h3>Cash Flow Offset</h3>
            <p>
              Your positive cash flow sits in the loan account, reducing the balance
              used for interest calculations. This creates massive savings over time.
            </p>
          </div>

          <div className="detail-card">
            <div className="detail-icon">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
              </svg>
            </div>
            <h3>Accelerated Payoff</h3>
            <p>
              Every dollar that stays in your account works to reduce interest. You'll
              pay off your mortgage {yearsMonthsFromMonths(Math.max(0, simulation.comparison.timeSavedMonths))} faster.
            </p>
          </div>

          <div className="detail-card">
            <div className="detail-icon">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0121 12c0 5.523-4.477 10-10 10S1 17.523 1 12 5.477 2 11 2c1.821 0 3.532.465 5.018 1.284m0 0a9.001 9.001 0 00-5.018-1.284c-4.97 0-9 4.03-9 9s4.03 9 9 9 9-4.03 9-9c0-1.821-.465-3.532-1.284-5.018" />
              </svg>
            </div>
            <h3>Full Flexibility</h3>
            <p>
              Access your funds anytime with checks, debit card, or online transfers.
              Your money works for you while remaining completely accessible.
            </p>
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

      {/* Cash Flow Analysis Tab */}
      {activeTab === 'cashflow' && cashFlow && (
        <div className="cashflow-tab-content">
          <CashFlowReview
            cashFlow={cashFlow}
            depositFrequency={depositFrequency}
            onContinue={() => setActiveTab('results')}
            onBack={() => setActiveTab('results')}
            onCashFlowUpdate={onCashFlowUpdate}
          />
        </div>
      )}

      {/* Charts Tab */}
      {activeTab === 'charts' && (
        <div className="charts-tab-content">
          <h2 style={{ textAlign: 'center', marginBottom: '2rem', color: '#1e293b' }}>📈 Visual Analysis</h2>

          {/* Balance Over Time Chart */}
          <div className="chart-section" style={{ marginBottom: '3rem', padding: '2rem', background: 'white', borderRadius: '12px', border: '2px solid #e2e8f0' }}>
            <h3 style={{ marginBottom: '1.5rem', color: '#334155' }}>Loan Balance Over Time</h3>
            <div style={{ padding: '2rem', background: '#f8fafc', borderRadius: '8px', textAlign: 'center' }}>
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
                      <line x1={xScale(0)} y1={yScale(loanAmount)} x2={xScale(traditionalMonths)} y2={yScale(0)} stroke="#4299e1" strokeWidth="3" />

                      {/* AIO loan line */}
                      <line x1={xScale(0)} y1={yScale(loanAmount)} x2={xScale(aioMonths)} y2={yScale(0)} stroke="#9bc53d" strokeWidth="3" />

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

          {/* Interest Comparison Bar Chart */}
          <div className="chart-section" style={{ marginBottom: '3rem', padding: '2rem', background: 'white', borderRadius: '12px', border: '2px solid #e2e8f0' }}>
            <h3 style={{ marginBottom: '1.5rem', color: '#334155' }}>Total Interest Comparison</h3>
            <div style={{ display: 'flex', gap: '2rem', alignItems: 'flex-end', padding: '2rem', background: '#f8fafc', borderRadius: '8px' }}>
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                <div style={{
                  width: '100%',
                  height: `${(simulation.traditionalLoan.totalInterestPaid / Math.max(simulation.traditionalLoan.totalInterestPaid, simulation.allInOneLoan.totalInterestPaid)) * 300}px`,
                  background: 'linear-gradient(180deg, #4299e1 0%, #3182ce 100%)',
                  borderRadius: '8px 8px 0 0',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: 'white',
                  fontWeight: '700',
                  fontSize: '1.25rem',
                  minHeight: '60px',
                }}>
                  {formatCurrency(simulation.traditionalLoan.totalInterestPaid)}
                </div>
                <div style={{ marginTop: '1rem', fontWeight: '600', color: '#2d3748' }}>Traditional Loan</div>
              </div>

              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                <div style={{
                  width: '100%',
                  height: `${(simulation.allInOneLoan.totalInterestPaid / Math.max(simulation.traditionalLoan.totalInterestPaid, simulation.allInOneLoan.totalInterestPaid)) * 300}px`,
                  background: 'linear-gradient(180deg, #9bc53d 0%, #7da62e 100%)',
                  borderRadius: '8px 8px 0 0',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: 'white',
                  fontWeight: '700',
                  fontSize: '1.25rem',
                  minHeight: '60px',
                }}>
                  {formatCurrency(simulation.allInOneLoan.totalInterestPaid)}
                </div>
                <div style={{ marginTop: '1rem', fontWeight: '600', color: '#2d3748' }}>All-In-One Loan</div>
              </div>
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
                  Save {yearsMonthsFromMonths(simulation.comparison.timeSavedMonths)} by choosing All-In-One!
                </div>
              </div>
            )}
          </div>

          {/* Timeline Comparison */}
          <div className="chart-section" style={{ padding: '2rem', background: 'white', borderRadius: '12px', border: '2px solid #e2e8f0' }}>
            <h3 style={{ marginBottom: '1.5rem', color: '#334155' }}>Payoff Timeline</h3>
            <div style={{ padding: '2rem', background: '#f8fafc', borderRadius: '8px' }}>
              <div style={{ marginBottom: '2rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', marginBottom: '0.5rem' }}>
                  <span style={{ fontWeight: '600', color: '#2d3748', minWidth: '160px' }}>Traditional Loan:</span>
                  <div style={{
                    flex: `0 0 ${(simulation.traditionalLoan.payoffMonths / Math.max(simulation.traditionalLoan.payoffMonths, simulation.allInOneLoan.payoffMonths)) * 100}%`,
                    height: '40px',
                    background: 'linear-gradient(90deg, #4299e1 0%, #3182ce 100%)',
                    borderRadius: '8px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: 'white',
                    fontWeight: '600',
                  }}>
                    {yearsMonthsFromMonths(simulation.traditionalLoan.payoffMonths)}
                  </div>
                </div>
              </div>

              <div>
                <div style={{ display: 'flex', alignItems: 'center', marginBottom: '0.5rem' }}>
                  <span style={{ fontWeight: '600', color: '#2d3748', minWidth: '160px' }}>All-In-One Loan:</span>
                  <div style={{
                    flex: `0 0 ${(simulation.allInOneLoan.payoffMonths / Math.max(simulation.traditionalLoan.payoffMonths, simulation.allInOneLoan.payoffMonths)) * 100}%`,
                    height: '40px',
                    background: 'linear-gradient(90deg, #9bc53d 0%, #7da62e 100%)',
                    borderRadius: '8px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: 'white',
                    fontWeight: '600',
                  }}>
                    {yearsMonthsFromMonths(simulation.allInOneLoan.payoffMonths)}
                  </div>
                  {simulation.comparison.timeSavedMonths > 0 && (
                    <span style={{
                      marginLeft: '1rem',
                      padding: '0.5rem 1rem',
                      background: '#e8f5e9',
                      color: '#558b2f',
                      borderRadius: '6px',
                      fontWeight: '600',
                      fontSize: '0.9rem',
                    }}>
                      ⚡ {yearsMonthsFromMonths(simulation.comparison.timeSavedMonths)} faster!
                    </span>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Proposal Builder Tab */}
      {activeTab === 'proposal' && (
        <div className="proposal-tab-content">
          <ProposalBuilder
            simulation={simulation}
            mortgageDetails={mortgageDetails}
            onBack={() => setActiveTab('results')}
          />
        </div>
      )}

      {/* Email Signature Generator Tab */}
      {activeTab === 'signature' && (
        <div className="signature-tab-content">
          <SignatureGenerator />
        </div>
      )}
    </div>
  );
}
