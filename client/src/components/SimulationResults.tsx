import { useState } from 'react';
import type { SimulationResult, MortgageDetails, CashFlowAnalysis } from '../types';
import './SimulationResults.css';
import CashFlowSummaryCards from './CashFlowSummaryCards';

interface SimulationResultsProps {
  simulation: SimulationResult;
  mortgageDetails: MortgageDetails;
  cashFlow?: CashFlowAnalysis;
  onReset: () => void;
  onGenerateReport?: () => void;
  onCreateProposal?: () => void;
  onBackToCFA?: () => void;
}

type TabView = 'results' | 'paydown' | 'charts' | 'math';
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
  const [paydownView, setPaydownView] = useState<PaydownView>('monthly');
  const [warningDismissed, setWarningDismissed] = useState(false);
  const [mathSubTab, setMathSubTab] = useState<'aio' | 'traditional'>('aio');

  // Calculate actual months from transaction data
  const calculateActualMonths = (transactions: any[]): number => {
    if (!transactions || transactions.length === 0) return 1;

    const dates = transactions.map(t => new Date(t.date));
    const minDate = new Date(Math.min(...dates.map(d => d.getTime())));
    const maxDate = new Date(Math.max(...dates.map(d => d.getTime())));

    const monthsDiff = (maxDate.getFullYear() - minDate.getFullYear()) * 12 +
                       (maxDate.getMonth() - minDate.getMonth()) + 1;

    return Math.max(1, monthsDiff); // At least 1 month
  };

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

  // Calculate AIO suitability rating based on net cash flow (matching CashFlowReview)
  const getTemperatureRating = (netCashFlow: number): {
    rating: string;
    color: string;
    description: string;
    icon: string;
    glow: string;
  } => {
    if (netCashFlow >= 8000) {
      return {
        rating: 'EXCELLENT',
        color: '#059669',
        description: 'Elite candidate! Maximum AIO benefits with exceptional interest savings.',
        icon: '💎',
        glow: '0 0 20px rgba(5, 150, 105, 0.8), 0 0 40px rgba(5, 150, 105, 0.5), 0 0 60px rgba(5, 150, 105, 0.3)'
      };
    } else if (netCashFlow >= 5500) {
      return {
        rating: 'OUTSTANDING',
        color: '#10b981',
        description: 'Outstanding candidate! Huge interest savings and rapid payoff expected.',
        icon: '🔥',
        glow: '0 0 18px rgba(16, 185, 129, 0.7), 0 0 35px rgba(16, 185, 129, 0.4)'
      };
    } else if (netCashFlow >= 4000) {
      return {
        rating: 'GREAT',
        color: '#22c55e',
        description: 'Great candidate! Substantial AIO benefits with significant savings.',
        icon: '⭐',
        glow: '0 0 15px rgba(34, 197, 94, 0.6), 0 0 30px rgba(34, 197, 94, 0.3)'
      };
    } else if (netCashFlow >= 2500) {
      return {
        rating: 'VERY GOOD',
        color: '#4ade80',
        description: 'Very good candidate! Strong benefits from daily interest calculation.',
        icon: '✨',
        glow: '0 0 12px rgba(74, 222, 128, 0.5), 0 0 24px rgba(74, 222, 128, 0.25)'
      };
    } else if (netCashFlow >= 1500) {
      return {
        rating: 'GOOD',
        color: '#84cc16',
        description: 'Good candidate! Meaningful interest savings with AIO loan.',
        icon: '👍',
        glow: '0 0 10px rgba(132, 204, 22, 0.4), 0 0 20px rgba(132, 204, 22, 0.2)'
      };
    } else if (netCashFlow >= 800) {
      return {
        rating: 'FAIR',
        color: '#eab308',
        description: 'Fair candidate. Moderate benefits, some interest savings possible.',
        icon: '⚡',
        glow: '0 0 8px rgba(234, 179, 8, 0.3), 0 0 15px rgba(234, 179, 8, 0.15)'
      };
    } else if (netCashFlow > 300) {
      return {
        rating: 'POOR',
        color: '#f97316',
        description: 'Limited benefits. Minimal savings expected with AIO loan.',
        icon: '⚠️',
        glow: '0 0 5px rgba(249, 115, 22, 0.2)'
      };
    } else {
      return {
        rating: 'INELIGIBLE',
        color: '#ef4444',
        description: 'Not recommended. Cash flow insufficient for AIO loan benefits.',
        icon: '❌',
        glow: 'none'
      };
    }
  };

  // Variables removed - computed inline in CashFlowSummaryCards component

  return (
    <div className="simulation-results">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '2rem', gap: '1rem' }}>
        <div className="form-header" style={{ margin: 0, flex: 1, textAlign: 'left' }}>
          <h2>Simulation Results</h2>
          <p>Compare traditional mortgage vs All-In-One loan with cash flow offset</p>
        </div>
        <div style={{ display: 'flex', gap: '1rem', alignItems: 'flex-start' }}>
          <button
            className="btn-secondary"
            onClick={onBackToCFA}
            style={{
              border: '2px solid #9bc53d',
              boxShadow: '0 3px 10px rgba(155, 197, 61, 0.25)',
              background: 'linear-gradient(135deg, #ffffff 0%, #f0f9e8 100%)',
              transition: 'all 0.3s ease',
              fontWeight: '600',
              whiteSpace: 'nowrap',
              color: '#2d3748'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.boxShadow = '0 6px 16px rgba(155, 197, 61, 0.35)';
              e.currentTarget.style.transform = 'translateY(-2px)';
              e.currentTarget.style.borderColor = '#8ab82e';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.boxShadow = '0 3px 10px rgba(155, 197, 61, 0.25)';
              e.currentTarget.style.transform = 'translateY(0)';
              e.currentTarget.style.borderColor = '#9bc53d';
            }}
          >
            <svg className="btn-icon" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
            </svg>
            Edit Cash Flow
          </button>
          <button
            className="btn-primary"
            onClick={onCreateProposal}
            style={{
              border: '3px solid #3b82f6',
              boxShadow: '0 0 20px rgba(59, 130, 246, 0.5), 0 0 40px rgba(59, 130, 246, 0.3)',
              animation: 'pulse-glow 2s ease-in-out infinite',
              position: 'relative',
              background: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)',
              whiteSpace: 'nowrap'
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
      </div>

      {/* Compact 4-Column Header: Confidence + Summary Cards */}
      {cashFlow && (
        <div style={{
          position: 'sticky',
          top: 0,
          zIndex: 100,
          background: 'white',
          paddingTop: '1rem',
          paddingBottom: '1rem',
          marginBottom: '2rem',
          boxShadow: '0 2px 10px rgba(0, 0, 0, 0.1)'
        }}>
          <CashFlowSummaryCards
            cashFlow={cashFlow}
            transactions={cashFlow.transactions}
            actualMonths={calculateActualMonths(cashFlow.transactions)}
            displayTotalIncome={cashFlow.totalIncome}
            displayTotalExpenses={cashFlow.totalExpenses}
            displayNetCashFlow={cashFlow.netCashFlow}
            confidenceLabel={(() => {
              const conf = cashFlow.confidence;
              if (conf >= 0.8) return 'High';
              if (conf >= 0.6) return 'Moderate';
              return 'Low';
            })()}
            confidenceColor={(() => {
              const conf = cashFlow.confidence;
              if (conf >= 0.8) return '#10b981';
              if (conf >= 0.6) return '#f59e0b';
              return '#ef4444';
            })()}
            temperatureRating={getTemperatureRating(cashFlow.netCashFlow)}
          />
        </div>
      )}

      {/* Tab Navigation */}
      <div style={{
        display: 'flex',
        gap: '0.5rem',
        marginBottom: '2rem',
        borderBottom: '2px solid #e2e8f0',
        paddingBottom: '0.5rem'
      }}>
        <button
          onClick={() => setActiveTab('results')}
          style={{
            padding: '0.75rem 1.5rem',
            border: 'none',
            borderBottom: activeTab === 'results' ? '3px solid #3b82f6' : '3px solid transparent',
            background: activeTab === 'results' ? '#eff6ff' : 'transparent',
            color: activeTab === 'results' ? '#1e40af' : '#64748b',
            fontWeight: '600',
            cursor: 'pointer',
            transition: 'all 0.2s',
            fontSize: '1rem'
          }}
        >
          📊 Results
        </button>
        <button
          onClick={() => setActiveTab('paydown')}
          style={{
            padding: '0.75rem 1.5rem',
            border: 'none',
            borderBottom: activeTab === 'paydown' ? '3px solid #3b82f6' : '3px solid transparent',
            background: activeTab === 'paydown' ? '#eff6ff' : 'transparent',
            color: activeTab === 'paydown' ? '#1e40af' : '#64748b',
            fontWeight: '600',
            cursor: 'pointer',
            transition: 'all 0.2s',
            fontSize: '1rem'
          }}
        >
          📈 Rate & Paydown
        </button>
        <button
          onClick={() => setActiveTab('charts')}
          style={{
            padding: '0.75rem 1.5rem',
            border: 'none',
            borderBottom: activeTab === 'charts' ? '3px solid #3b82f6' : '3px solid transparent',
            background: activeTab === 'charts' ? '#eff6ff' : 'transparent',
            color: activeTab === 'charts' ? '#1e40af' : '#64748b',
            fontWeight: '600',
            cursor: 'pointer',
            transition: 'all 0.2s',
            fontSize: '1rem'
          }}
        >
          📉 Charts
        </button>
        <button
          onClick={() => setActiveTab('math')}
          style={{
            padding: '0.75rem 1.5rem',
            border: 'none',
            borderBottom: activeTab === 'math' ? '3px solid #3b82f6' : '3px solid transparent',
            background: activeTab === 'math' ? '#eff6ff' : 'transparent',
            color: activeTab === 'math' ? '#1e40af' : '#64748b',
            fontWeight: '600',
            cursor: 'pointer',
            transition: 'all 0.2s',
            fontSize: '1rem'
          }}
        >
          🧮 Math
        </button>
      </div>

      {/* Tab Content */}
      {activeTab === 'results' && (
        <>
          {/* Warning Banner: Low/No Savings */}
          {simulation.comparison.interestSavings <= 0 && !warningDismissed && (
            <div style={{
              background: 'linear-gradient(135deg, #fee2e2 0%, #fecaca 100%)',
              border: '2px solid #ef4444',
              borderRadius: '8px',
              padding: '0.75rem',
              marginBottom: '0.75rem',
              boxShadow: '0 2px 6px rgba(239, 68, 68, 0.15)',
              position: 'relative'
            }}>
              <button
                onClick={() => setWarningDismissed(true)}
                style={{
                  position: 'absolute',
                  top: '0.5rem',
                  right: '0.5rem',
                  background: '#dc2626',
                  color: 'white',
                  border: 'none',
                  borderRadius: '4px',
                  padding: '0.25rem 0.5rem',
                  cursor: 'pointer',
                  fontSize: '0.75rem',
                  fontWeight: '600',
                  transition: 'background 0.2s'
                }}
                onMouseEnter={(e) => e.currentTarget.style.background = '#b91c1c'}
                onMouseLeave={(e) => e.currentTarget.style.background = '#dc2626'}
              >
                Ignore Warning
              </button>
              <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'start', paddingRight: '100px' }}>
                <div style={{
                  width: '32px',
                  height: '32px',
                  borderRadius: '50%',
                  background: '#ef4444',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0
                }}>
                  <span style={{ fontSize: '18px' }}>🚫</span>
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: '1.1rem', fontWeight: '700', color: '#991b1b', marginBottom: '0.25rem' }}>
                    ⚠️ AIO Loan Not Beneficial for This Client
                  </div>
                  <div style={{ fontSize: '0.9rem', color: '#7f1d1d', marginBottom: '0.5rem', lineHeight: '1.4' }}>
                    Based on the current net cash flow of <strong>${Math.round(cashFlow?.netCashFlow || cashFlow?.monthlyLeftover || 0).toLocaleString()}/month</strong>, the All-In-One loan will take LONGER to pay off than the traditional mortgage, resulting in MORE total interest paid instead of savings.
                  </div>
                  <div style={{
                    background: 'white',
                    border: '1px solid #fca5a5',
                    borderRadius: '6px',
                    padding: '0.5rem',
                    marginBottom: '0.5rem'
                  }}>
                    <div style={{ fontSize: '0.8rem', color: '#7f1d1d', marginBottom: '0.25rem' }}>
                      <strong>Why this happens:</strong> When monthly net cash flow barely exceeds the monthly interest on the loan, the principal reduces very slowly. The AIO loan's daily interest calculation provides no benefit in this scenario.
                    </div>
                  </div>
                  <div style={{ fontSize: '0.8rem', color: '#7f1d1d', fontWeight: '600', marginBottom: '0.25rem' }}>
                    💡 Recommendations to improve AIO viability:
                  </div>
                  <ul style={{ margin: 0, paddingLeft: '1.25rem', color: '#7f1d1d', fontSize: '0.8rem', lineHeight: '1.4' }}>
                    <li>Review Cash Flow Analysis to include all income sources</li>
                    <li>Identify expenses that can be reduced or eliminated</li>
                    <li>Consider whether client can make additional monthly principal payments</li>
                    <li>Explore refinancing to a lower interest rate before considering AIO</li>
                  </ul>
                </div>
              </div>
            </div>
          )}

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
        <h2 className="section-header">Side-by-Side Comparison</h2>

        <div className="comparison-cards">
          {/* Traditional Loan Card */}
          <div className="loan-card traditional-card">
            <div className="card-header">
              <h3>{simulation.traditionalLoan.productName || 'Traditional Mortgage'}</h3>
              <span className="card-badge">Current</span>
            </div>

            <div className="card-body">
              <div className="metric-row">
                <span className="metric-label">Starting Balance</span>
                <span className="metric-value">{formatCurrency(mortgageDetails.currentBalance)}</span>
              </div>

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
              <h3>{simulation.allInOneLoan.productName || 'All-In-One Loan'}</h3>
              <span className="card-badge recommended">Recommended</span>
            </div>

            <div className="card-body">
              <div className="metric-row">
                <span className="metric-label">Starting Balance</span>
                <span className="metric-value">{formatCurrency(mortgageDetails.currentBalance)}</span>
              </div>

              <div className="metric-row">
                <span className="metric-label">Monthly Payment</span>
                <span className="metric-value">{formatCurrency(simulation.traditionalLoan.monthlyPayment)}</span>
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
          <h2 className="section-header" style={{ textAlign: 'center' }}>📊 Rate & Paydown Analysis</h2>

          {/* Rate Comparison Section */}
          <div style={{ marginBottom: '2rem', padding: '1rem', background: '#f8fafc', borderRadius: '8px' }}>
            <h3 style={{ marginBottom: '1rem', color: '#334155', fontSize: '1rem' }}>Interest Rates</h3>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
              <div style={{ padding: '0.75rem 1rem', background: 'white', borderRadius: '8px', border: '2px solid #4299e1' }}>
                <div style={{ fontSize: '0.75rem', color: '#718096', marginBottom: '0.25rem' }}>Traditional Mortgage Rate</div>
                <div style={{ fontSize: '1.5rem', fontWeight: '700', color: '#4299e1' }}>
                  {mortgageDetails.interestRate.toFixed(3)}%
                </div>
              </div>
              <div style={{ padding: '0.75rem 1rem', background: 'white', borderRadius: '8px', border: '2px solid #9bc53d' }}>
                <div style={{ fontSize: '0.75rem', color: '#718096', marginBottom: '0.25rem' }}>All-In-One Loan Rate</div>
                <div style={{ fontSize: '1.5rem', fontWeight: '700', color: '#9bc53d' }}>
                  {mortgageDetails.aioInterestRate.toFixed(3)}%
                </div>
                <div style={{ fontSize: '0.75rem', color: '#7da62e', marginTop: '0.25rem' }}>
                  +{(mortgageDetails.aioInterestRate - mortgageDetails.interestRate).toFixed(3)}% premium
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
                fontSize: '0.875rem'
              }}>
                <thead style={{ position: 'sticky', top: 0, zIndex: 10 }}>
                  <tr style={{ background: '#1e293b', color: 'white' }}>
                    <th style={{ padding: '0.75rem', textAlign: 'left', borderBottom: '2px solid #cbd5e1', minWidth: '80px' }}>
                      {paydownView === 'monthly' ? 'Period' : 'Year'}
                    </th>
                    <th style={{ padding: '0.75rem', textAlign: 'right', borderBottom: '2px solid #cbd5e1', minWidth: '110px', background: '#2d3748' }}>
                      Traditional Balance
                    </th>
                    <th style={{ padding: '0.75rem', textAlign: 'right', borderBottom: '2px solid #cbd5e1', minWidth: '110px', background: '#15803d' }}>
                      AIO Balance
                    </th>
                    <th style={{ padding: '0.75rem', textAlign: 'right', borderBottom: '2px solid #cbd5e1', minWidth: '100px', background: '#166534' }}>
                      Δ Balance
                    </th>
                    <th style={{ padding: '0.75rem', textAlign: 'right', borderBottom: '2px solid #cbd5e1', minWidth: '110px', background: '#2d3748' }}>
                      Trad. Principal
                    </th>
                    <th style={{ padding: '0.75rem', textAlign: 'right', borderBottom: '2px solid #cbd5e1', minWidth: '110px', background: '#15803d' }}>
                      AIO Principal
                    </th>
                    <th style={{ padding: '0.75rem', textAlign: 'right', borderBottom: '2px solid #cbd5e1', minWidth: '100px', background: '#166534' }}>
                      Δ Principal
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {(() => {
                    const rows = [];
                    const { currentBalance, interestRate, aioInterestRate, monthlyPayment } = mortgageDetails;
                    const monthlyRate = interestRate / 100 / 12;
                    const netCashFlow = cashFlow?.monthlyLeftover || cashFlow?.netCashFlow || 0;

                    // Add BASE reference row showing starting balances
                    rows.push(
                      <tr key="base" style={{
                        background: '#f1f5f9',
                        borderBottom: '3px solid #cbd5e1',
                        fontWeight: '600'
                      }}>
                        <td style={{ padding: '0.75rem', fontWeight: '700', color: '#0f172a', fontSize: '0.9rem' }}>
                          BASE
                        </td>
                        <td style={{ padding: '0.75rem', textAlign: 'right', fontWeight: '700', color: '#1e40af' }}>
                          {formatCurrency(currentBalance)}
                        </td>
                        <td style={{ padding: '0.75rem', textAlign: 'right', fontWeight: '700', color: '#15803d' }}>
                          {formatCurrency(currentBalance)}
                        </td>
                        <td style={{ padding: '0.75rem', textAlign: 'right', color: '#64748b', fontSize: '0.85rem' }}>
                          —
                        </td>
                        <td style={{ padding: '0.75rem', textAlign: 'right', color: '#64748b', fontSize: '0.85rem' }}>
                          {formatCurrency(0)}
                        </td>
                        <td style={{ padding: '0.75rem', textAlign: 'right', color: '#64748b', fontSize: '0.85rem' }}>
                          {formatCurrency(0)}
                        </td>
                        <td style={{ padding: '0.75rem', textAlign: 'right', color: '#64748b', fontSize: '0.85rem' }}>
                          —
                        </td>
                      </tr>
                    );

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

                        const balanceDelta = tradBalance - aioBalance;
                        const principalDelta = yearAioPrincipal - yearTradPrincipal;

                        rows.push(
                          <tr key={year} style={{
                            background: year % 2 === 0 ? '#f8fafc' : 'white',
                            borderBottom: '1px solid #e2e8f0'
                          }}>
                            {/* Year */}
                            <td style={{ padding: '0.75rem', fontWeight: '700', color: '#334155' }}>{year}</td>

                            {/* Traditional Balance */}
                            <td style={{ padding: '0.75rem', textAlign: 'right', fontWeight: '600', color: '#1e40af' }}>
                              {formatCurrency(tradBalance)}
                            </td>

                            {/* AIO Balance */}
                            <td style={{ padding: '0.75rem', textAlign: 'right', fontWeight: '600', color: '#15803d' }}>
                              {aioBalance > 0.01 ? formatCurrency(aioBalance) : (
                                <span style={{ fontSize: '0.85rem', fontWeight: '700', color: '#10b981' }}>
                                  ✓ PAID OFF
                                </span>
                              )}
                            </td>

                            {/* Balance Delta */}
                            <td style={{ padding: '0.75rem', textAlign: 'right', fontWeight: '700', color: balanceDelta > 0 ? '#10b981' : '#64748b' }}>
                              {balanceDelta > 0 ? `▼ ${formatCurrency(balanceDelta)}` : '-'}
                            </td>

                            {/* Traditional Principal */}
                            <td style={{ padding: '0.75rem', textAlign: 'right', fontWeight: '600', color: '#1e40af' }}>
                              {formatCurrency(yearTradPrincipal)}
                            </td>

                            {/* AIO Principal */}
                            <td style={{ padding: '0.75rem', textAlign: 'right', fontWeight: '600', color: '#15803d' }}>
                              {formatCurrency(yearAioPrincipal)}
                            </td>

                            {/* Principal Delta */}
                            <td style={{ padding: '0.75rem', textAlign: 'right', fontWeight: '700', color: principalDelta > 0 ? '#10b981' : '#64748b' }}>
                              {principalDelta > 0 ? `▲ ${formatCurrency(principalDelta)}` : '-'}
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

                        const balanceDelta = tradBalance - aioBalance;
                        const principalDelta = aioPrincipal - tradPrincipal;

                        rows.push(
                          <tr key={`m${month}`} style={{
                            background: 'white',
                            borderBottom: '1px solid #e2e8f0'
                          }}>
                            {/* Period */}
                            <td style={{ padding: '0.75rem', fontWeight: '600', color: '#334155' }}>
                              Y{year}-M{monthInYear}
                            </td>

                            {/* Traditional Balance */}
                            <td style={{ padding: '0.75rem', textAlign: 'right', fontWeight: '600', color: '#1e40af' }}>
                              {formatCurrency(tradBalance)}
                            </td>

                            {/* AIO Balance */}
                            <td style={{ padding: '0.75rem', textAlign: 'right', fontWeight: '600', color: '#15803d' }}>
                              {aioBalance > 0.01 ? formatCurrency(aioBalance) : (
                                <span style={{ fontSize: '0.85rem', fontWeight: '700', color: '#10b981' }}>
                                  ✓ PAID OFF
                                </span>
                              )}
                            </td>

                            {/* Balance Delta */}
                            <td style={{ padding: '0.75rem', textAlign: 'right', fontWeight: '700', color: balanceDelta > 0 ? '#10b981' : '#64748b' }}>
                              {balanceDelta > 0 ? `▼ ${formatCurrency(balanceDelta)}` : '-'}
                            </td>

                            {/* Traditional Principal */}
                            <td style={{ padding: '0.75rem', textAlign: 'right', fontWeight: '600', color: '#1e40af' }}>
                              {formatCurrency(tradPrincipal)}
                            </td>

                            {/* AIO Principal */}
                            <td style={{ padding: '0.75rem', textAlign: 'right', fontWeight: '600', color: '#15803d' }}>
                              {formatCurrency(aioPrincipal)}
                            </td>

                            {/* Principal Delta */}
                            <td style={{ padding: '0.75rem', textAlign: 'right', fontWeight: '700', color: principalDelta > 0 ? '#10b981' : '#64748b' }}>
                              {principalDelta > 0 ? `▲ ${formatCurrency(principalDelta)}` : '-'}
                            </td>
                          </tr>
                        );

                        // Add year subtotal row at end of each year
                        if (monthInYear === 12 || month === maxMonths || (tradBalance <= 0.01 && aioBalance <= 0.01)) {
                          const yearPrincipalDelta = yearAioPrincipal - yearTradPrincipal;

                          rows.push(
                            <tr key={`subtotal${year}`} style={{
                              background: '#1e293b',
                              color: 'white',
                              fontWeight: '700',
                              borderBottom: '2px solid #cbd5e1'
                            }}>
                              <td style={{ padding: '1rem', fontSize: '0.9rem' }}>
                                Year {year} Total
                              </td>
                              <td colSpan={3} style={{ padding: '1rem', textAlign: 'center', fontSize: '0.85rem' }}>
                                —
                              </td>
                              <td style={{ padding: '1rem', textAlign: 'right', color: '#93c5fd' }}>
                                {formatCurrency(yearTradPrincipal)}
                              </td>
                              <td style={{ padding: '1rem', textAlign: 'right', color: '#6ee7b7' }}>
                                {formatCurrency(yearAioPrincipal)}
                              </td>
                              <td style={{ padding: '1rem', textAlign: 'right' }}>
                                {yearPrincipalDelta > 0 && (
                                  <span style={{
                                    fontSize: '0.85rem',
                                    color: '#10b981',
                                    background: 'rgba(16, 185, 129, 0.2)',
                                    padding: '0.25rem 0.75rem',
                                    borderRadius: '9999px'
                                  }}>
                                    ▲ {formatCurrency(yearPrincipalDelta)}
                                  </span>
                                )}
                              </td>
                            </tr>
                          );

                          // Reset year totals
                          yearTradPrincipal = 0;
                          yearAioPrincipal = 0;
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
          <h2 className="section-header" style={{ textAlign: 'center' }}>📈 Visual Analysis</h2>

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

      {/* Math Tab */}
      {activeTab === 'math' && (
        <div className="math-tab-content" style={{ padding: '2rem', background: 'white', borderRadius: '12px', border: '2px solid #e2e8f0' }}>
          <h2 className="section-header" style={{ textAlign: 'center' }}>🧮 Calculation Details & Formulas</h2>

          {/* Math Sub-Tabs */}
          <div style={{
            display: 'flex',
            gap: '0.5rem',
            marginTop: '1.5rem',
            marginBottom: '2rem',
            justifyContent: 'center',
            borderBottom: '2px solid #e2e8f0',
            paddingBottom: '0.5rem'
          }}>
            <button
              onClick={() => setMathSubTab('aio')}
              style={{
                padding: '0.75rem 2rem',
                border: 'none',
                borderBottom: mathSubTab === 'aio' ? '3px solid #9bc53d' : '3px solid transparent',
                background: mathSubTab === 'aio' ? '#f0fdf4' : 'transparent',
                color: mathSubTab === 'aio' ? '#15803d' : '#64748b',
                fontWeight: '600',
                cursor: 'pointer',
                transition: 'all 0.2s',
                fontSize: '1rem',
                borderRadius: '8px 8px 0 0'
              }}
            >
              ✨ All-In-One Loan
            </button>
            <button
              onClick={() => setMathSubTab('traditional')}
              style={{
                padding: '0.75rem 2rem',
                border: 'none',
                borderBottom: mathSubTab === 'traditional' ? '3px solid #3b82f6' : '3px solid transparent',
                background: mathSubTab === 'traditional' ? '#eff6ff' : 'transparent',
                color: mathSubTab === 'traditional' ? '#1e40af' : '#64748b',
                fontWeight: '600',
                cursor: 'pointer',
                transition: 'all 0.2s',
                fontSize: '1rem',
                borderRadius: '8px 8px 0 0'
              }}
            >
              🏦 Traditional Mortgage
            </button>
          </div>

          {/* Input Values Section */}
          <div style={{ marginBottom: '3rem', padding: '2rem', background: '#f8fafc', borderRadius: '8px' }}>
            <h3 style={{ marginBottom: '1.5rem', color: '#334155', fontSize: '1.25rem' }}>📊 Input Values</h3>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
              <div style={{ padding: '1rem', background: 'white', borderRadius: '6px', border: '1px solid #e2e8f0' }}>
                <div style={{ fontSize: '0.85rem', color: '#64748b', marginBottom: '0.25rem' }}>Loan Amount</div>
                <div style={{ fontSize: '1.25rem', fontWeight: '700', color: '#1e293b' }}>{formatCurrency(mortgageDetails.currentBalance)}</div>
              </div>
              <div style={{ padding: '1rem', background: 'white', borderRadius: '6px', border: '1px solid #e2e8f0' }}>
                <div style={{ fontSize: '0.85rem', color: '#64748b', marginBottom: '0.25rem' }}>Traditional Rate</div>
                <div style={{ fontSize: '1.25rem', fontWeight: '700', color: '#1e293b' }}>{mortgageDetails.interestRate.toFixed(3)}%</div>
              </div>
              <div style={{ padding: '1rem', background: 'white', borderRadius: '6px', border: '1px solid #e2e8f0' }}>
                <div style={{ fontSize: '0.85rem', color: '#64748b', marginBottom: '0.25rem' }}>AIO Rate</div>
                <div style={{ fontSize: '1.25rem', fontWeight: '700', color: '#1e293b' }}>{mortgageDetails.aioInterestRate.toFixed(3)}%</div>
              </div>
              <div style={{ padding: '1rem', background: 'white', borderRadius: '6px', border: '1px solid #e2e8f0' }}>
                <div style={{ fontSize: '0.85rem', color: '#64748b', marginBottom: '0.25rem' }}>Net Cash Flow (Monthly)</div>
                <div style={{ fontSize: '1.25rem', fontWeight: '700', color: '#1e293b' }}>{formatCurrency(cashFlow?.netCashFlow || 0)}</div>
              </div>
            </div>
          </div>

          {/* Traditional Loan Math */}
          {mathSubTab === 'traditional' && (
          <div style={{ marginBottom: '3rem', padding: '2rem', background: 'white', borderRadius: '8px', border: '2px solid #4299e1' }}>
            <h3 style={{ marginBottom: '1.5rem', color: '#2563eb', fontSize: '1.25rem' }}>🏦 Traditional Fixed-Rate Mortgage Math</h3>

            <div style={{ marginBottom: '2rem' }}>
              <h4 style={{ fontSize: '1rem', fontWeight: '600', color: '#334155', marginBottom: '1rem' }}>Monthly Payment Formula</h4>
              <div style={{ padding: '1.5rem', background: '#f8fafc', borderRadius: '8px', fontFamily: 'monospace', fontSize: '1.1rem', color: '#1e293b', textAlign: 'center', marginBottom: '1rem' }}>
                M = P × [r(1+r)ⁿ] / [(1+r)ⁿ - 1]
              </div>
              <div style={{ padding: '1rem', background: '#eff6ff', borderRadius: '6px', fontSize: '0.9rem' }}>
                <strong>Where:</strong>
                <ul style={{ marginTop: '0.5rem', marginLeft: '1.5rem', lineHeight: '1.8' }}>
                  <li><strong>P</strong> = Principal = {formatCurrency(mortgageDetails.currentBalance)}</li>
                  <li><strong>r</strong> = Monthly interest rate = {(mortgageDetails.interestRate / 12).toFixed(6)}% = {(mortgageDetails.interestRate / 1200).toFixed(8)}</li>
                  <li><strong>n</strong> = Number of payments = 360 (30 years × 12 months)</li>
                </ul>
              </div>
            </div>

            <div style={{ marginBottom: '2rem' }}>
              <h4 style={{ fontSize: '1rem', fontWeight: '600', color: '#334155', marginBottom: '1rem' }}>Calculation Steps</h4>
              <div style={{ padding: '1.5rem', background: '#f8fafc', borderRadius: '8px', fontFamily: 'monospace', fontSize: '0.95rem', lineHeight: '2' }}>
                {(() => {
                  const P = mortgageDetails.currentBalance;
                  const r = mortgageDetails.interestRate / 1200;
                  const n = 360;
                  const onePlusR = 1 + r;
                  const onePlusRn = Math.pow(onePlusR, n);
                  const numerator = P * r * onePlusRn;
                  const denominator = onePlusRn - 1;
                  const M = numerator / denominator;

                  return (
                    <>
                      <div>1. (1 + r) = 1 + {r.toFixed(8)} = <strong>{onePlusR.toFixed(8)}</strong></div>
                      <div>2. (1 + r)ⁿ = {onePlusR.toFixed(8)}³⁶⁰ = <strong>{onePlusRn.toFixed(4)}</strong></div>
                      <div>3. Numerator = {formatCurrency(P)} × {r.toFixed(8)} × {onePlusRn.toFixed(4)} = <strong>{formatCurrency(numerator)}</strong></div>
                      <div>4. Denominator = {onePlusRn.toFixed(4)} - 1 = <strong>{denominator.toFixed(4)}</strong></div>
                      <div style={{ marginTop: '1rem', padding: '0.75rem', background: '#dbeafe', borderRadius: '6px', fontSize: '1.1rem' }}>
                        <strong>5. Monthly Payment (M) = {formatCurrency(numerator)} / {denominator.toFixed(4)} = {formatCurrency(M)}</strong>
                      </div>
                    </>
                  );
                })()}
              </div>
            </div>

            <div style={{ padding: '1.5rem', background: '#dbeafe', borderRadius: '8px', border: '2px solid #3b82f6' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div>
                  <div style={{ fontSize: '0.85rem', color: '#1e40af', marginBottom: '0.25rem' }}>Monthly Payment</div>
                  <div style={{ fontSize: '1.5rem', fontWeight: '700', color: '#1e293b' }}>{formatCurrency(simulation.traditionalLoan.monthlyPayment)}</div>
                </div>
                <div>
                  <div style={{ fontSize: '0.85rem', color: '#1e40af', marginBottom: '0.25rem' }}>Total Interest Paid</div>
                  <div style={{ fontSize: '1.5rem', fontWeight: '700', color: '#1e293b' }}>{formatCurrency(simulation.traditionalLoan.totalInterestPaid)}</div>
                </div>
              </div>
            </div>
          </div>
          )}

          {/* AIO Loan Math */}
          {mathSubTab === 'aio' && (
          <div style={{ marginBottom: '3rem', padding: '2rem', background: 'white', borderRadius: '8px', border: '2px solid #9bc53d' }}>
            <h3 style={{ marginBottom: '1.5rem', color: '#7da62e', fontSize: '1.25rem' }}>✨ All-In-One Loan Math (Cash Flow Offset Method)</h3>

            <div style={{ marginBottom: '2rem' }}>
              <h4 style={{ fontSize: '1rem', fontWeight: '600', color: '#334155', marginBottom: '1rem' }}>Key Concept: Effective Principal</h4>
              <div style={{ padding: '1.5rem', background: '#f8fafc', borderRadius: '8px', fontFamily: 'monospace', fontSize: '1.1rem', color: '#1e293b', textAlign: 'center', marginBottom: '1rem' }}>
                Effective Principal = Actual Balance - Average Balance Offset
              </div>
              <div style={{ padding: '1rem', background: '#f0fdf4', borderRadius: '6px', fontSize: '0.9rem' }}>
                <strong>The Secret Sauce:</strong>
                <p style={{ marginTop: '0.5rem', lineHeight: '1.6' }}>
                  Your income deposits create an average balance that <em>offsets</em> the principal. Interest is only calculated on the effective (reduced) principal, not the full loan balance!
                </p>
              </div>
            </div>

            <div style={{ marginBottom: '2rem' }}>
              <h4 style={{ fontSize: '1rem', fontWeight: '600', color: '#334155', marginBottom: '1rem' }}>Average Balance Offset Calculation</h4>
              <div style={{ padding: '1.5rem', background: '#f8fafc', borderRadius: '8px', fontFamily: 'monospace', fontSize: '0.95rem', lineHeight: '2' }}>
                {(() => {
                  const monthlyDeposits = cashFlow?.monthlyDeposits || cashFlow?.totalIncome || 0;
                  const netCashFlow = cashFlow?.netCashFlow || 0;
                  const baseAvg = (monthlyDeposits + netCashFlow) / 2;
                  // Assume monthly frequency for simplicity
                  const avgBalance = baseAvg;

                  return (
                    <>
                      <div>Monthly Deposits = <strong>{formatCurrency(monthlyDeposits)}</strong></div>
                      <div>Net Cash Flow = <strong>{formatCurrency(netCashFlow)}</strong></div>
                      <div style={{ marginTop: '1rem', padding: '0.75rem', background: '#d1fae5', borderRadius: '6px', fontSize: '1.05rem' }}>
                        <strong>Average Balance Offset = ({formatCurrency(monthlyDeposits)} + {formatCurrency(netCashFlow)}) / 2 = {formatCurrency(avgBalance)}</strong>
                      </div>
                    </>
                  );
                })()}
              </div>
            </div>

            <div style={{ marginBottom: '2rem' }}>
              <h4 style={{ fontSize: '1rem', fontWeight: '600', color: '#334155', marginBottom: '1rem' }}>Monthly Interest Calculation</h4>
              <div style={{ padding: '1.5rem', background: '#f8fafc', borderRadius: '8px', fontFamily: 'monospace', fontSize: '1.1rem', color: '#1e293b', textAlign: 'center', marginBottom: '1rem' }}>
                Monthly Interest = Effective Principal × Monthly Rate
              </div>
              <div style={{ padding: '1.5rem', background: '#f8fafc', borderRadius: '8px', fontFamily: 'monospace', fontSize: '0.95rem', lineHeight: '2' }}>
                {(() => {
                  const balance = mortgageDetails.currentBalance;
                  const monthlyDeposits = cashFlow?.monthlyDeposits || cashFlow?.totalIncome || 0;
                  const netCashFlow = cashFlow?.netCashFlow || 0;
                  const avgBalance = (monthlyDeposits + netCashFlow) / 2;
                  const effectivePrincipal = Math.max(0, balance - avgBalance);
                  const monthlyRate = mortgageDetails.aioInterestRate / 1200;
                  const monthlyInterest = effectivePrincipal * monthlyRate;

                  return (
                    <>
                      <div>Actual Balance = <strong>{formatCurrency(balance)}</strong></div>
                      <div>Average Balance Offset = <strong>{formatCurrency(avgBalance)}</strong></div>
                      <div>Effective Principal = {formatCurrency(balance)} - {formatCurrency(avgBalance)} = <strong>{formatCurrency(effectivePrincipal)}</strong></div>
                      <div>Monthly Rate = {mortgageDetails.aioInterestRate.toFixed(3)}% / 12 = <strong>{(monthlyRate * 100).toFixed(6)}%</strong></div>
                      <div style={{ marginTop: '1rem', padding: '0.75rem', background: '#d1fae5', borderRadius: '6px', fontSize: '1.05rem' }}>
                        <strong>Monthly Interest = {formatCurrency(effectivePrincipal)} × {(monthlyRate * 100).toFixed(6)}% = {formatCurrency(monthlyInterest)}</strong>
                      </div>
                    </>
                  );
                })()}
              </div>
            </div>

            <div style={{ marginBottom: '2rem' }}>
              <h4 style={{ fontSize: '1rem', fontWeight: '600', color: '#334155', marginBottom: '1rem' }}>Principal Reduction Per Month</h4>
              <div style={{ padding: '1.5rem', background: '#f8fafc', borderRadius: '8px', fontFamily: 'monospace', fontSize: '0.95rem', lineHeight: '2' }}>
                {(() => {
                  const netCashFlow = cashFlow?.netCashFlow || 0;

                  return (
                    <>
                      <div>Net Cash Flow (Available) = <strong>{formatCurrency(netCashFlow)}</strong></div>
                      <div style={{ marginTop: '1rem', padding: '0.75rem', background: '#d1fae5', borderRadius: '6px', fontSize: '1.05rem' }}>
                        <strong>Principal Reduction = {formatCurrency(netCashFlow)} per month</strong>
                      </div>
                      <div style={{ marginTop: '0.5rem', fontSize: '0.85rem', color: '#15803d', fontStyle: 'italic' }}>
                        This entire amount goes toward reducing the principal balance each month!
                      </div>
                    </>
                  );
                })()}
              </div>
            </div>

            <div style={{ padding: '1.5rem', background: '#d1fae5', borderRadius: '8px', border: '2px solid #9bc53d' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div>
                  <div style={{ fontSize: '0.85rem', color: '#15803d', marginBottom: '0.25rem' }}>Payoff Time</div>
                  <div style={{ fontSize: '1.5rem', fontWeight: '700', color: '#1e293b' }}>{yearsMonthsFromMonths(simulation.allInOneLoan.payoffMonths)}</div>
                </div>
                <div>
                  <div style={{ fontSize: '0.85rem', color: '#15803d', marginBottom: '0.25rem' }}>Total Interest Paid</div>
                  <div style={{ fontSize: '1.5rem', fontWeight: '700', color: '#1e293b' }}>{formatCurrency(simulation.allInOneLoan.totalInterestPaid)}</div>
                </div>
              </div>
            </div>
          </div>
          )}

          {/* Sample Month Calculations */}
          <div style={{ marginBottom: '2rem', padding: '2rem', background: '#fefce8', borderRadius: '8px', border: '2px solid #eab308' }}>
            <h3 style={{ marginBottom: '1.5rem', color: '#92400e', fontSize: '1.25rem' }}>📅 Sample Month 1 Calculation</h3>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem' }}>
              {/* Traditional Loan Month 1 */}
              <div>
                <h4 style={{ fontSize: '1rem', fontWeight: '600', color: '#334155', marginBottom: '1rem' }}>Traditional Loan</h4>
                <div style={{ padding: '1rem', background: 'white', borderRadius: '6px', fontSize: '0.9rem', lineHeight: '1.8' }}>
                  {(() => {
                    const balance = mortgageDetails.currentBalance;
                    const monthlyRate = mortgageDetails.interestRate / 1200;
                    const monthlyPayment = simulation.traditionalLoan.monthlyPayment;
                    const interest = balance * monthlyRate;
                    const principal = monthlyPayment - interest;
                    const newBalance = balance - principal;

                    return (
                      <>
                        <div>Starting Balance: <strong>{formatCurrency(balance)}</strong></div>
                        <div>Interest: {formatCurrency(balance)} × {(monthlyRate * 100).toFixed(6)}% = <strong>{formatCurrency(interest)}</strong></div>
                        <div>Principal: {formatCurrency(monthlyPayment)} - {formatCurrency(interest)} = <strong>{formatCurrency(principal)}</strong></div>
                        <div style={{ marginTop: '0.5rem', paddingTop: '0.5rem', borderTop: '2px solid #e2e8f0' }}>
                          New Balance: <strong>{formatCurrency(newBalance)}</strong>
                        </div>
                      </>
                    );
                  })()}
                </div>
              </div>

              {/* AIO Loan Month 1 */}
              <div>
                <h4 style={{ fontSize: '1rem', fontWeight: '600', color: '#334155', marginBottom: '1rem' }}>All-In-One Loan</h4>
                <div style={{ padding: '1rem', background: 'white', borderRadius: '6px', fontSize: '0.9rem', lineHeight: '1.8' }}>
                  {(() => {
                    const balance = mortgageDetails.currentBalance;
                    const monthlyDeposits = cashFlow?.monthlyDeposits || cashFlow?.totalIncome || 0;
                    const netCashFlow = cashFlow?.netCashFlow || 0;
                    const avgBalance = (monthlyDeposits + netCashFlow) / 2;
                    const effectivePrincipal = Math.max(0, balance - avgBalance);
                    const monthlyRate = mortgageDetails.aioInterestRate / 1200;
                    const interest = effectivePrincipal * monthlyRate;
                    const principal = netCashFlow;
                    const newBalance = balance - principal;

                    return (
                      <>
                        <div>Starting Balance: <strong>{formatCurrency(balance)}</strong></div>
                        <div>Effective Principal: {formatCurrency(balance)} - {formatCurrency(avgBalance)} = <strong>{formatCurrency(effectivePrincipal)}</strong></div>
                        <div>Interest: {formatCurrency(effectivePrincipal)} × {(monthlyRate * 100).toFixed(6)}% = <strong>{formatCurrency(interest)}</strong></div>
                        <div>Principal Reduction: <strong>{formatCurrency(principal)}</strong></div>
                        <div style={{ marginTop: '0.5rem', paddingTop: '0.5rem', borderTop: '2px solid #e2e8f0' }}>
                          New Balance: <strong>{formatCurrency(newBalance)}</strong>
                        </div>
                      </>
                    );
                  })()}
                </div>
              </div>
            </div>
          </div>

          {/* Sample Final Month Calculation */}
          <div style={{ marginBottom: '2rem', padding: '2rem', background: '#fef3c7', borderRadius: '8px', border: '2px solid #f59e0b' }}>
            <h3 style={{ marginBottom: '1.5rem', color: '#92400e', fontSize: '1.25rem' }}>📅 Sample Month {simulation.allInOneLoan.payoffMonths} Calculation (AIO Final Payoff)</h3>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem' }}>
              {/* Traditional Loan at Final AIO Month */}
              <div>
                <h4 style={{ fontSize: '1rem', fontWeight: '600', color: '#334155', marginBottom: '1rem' }}>Traditional Loan (Still Paying)</h4>
                <div style={{ padding: '1rem', background: 'white', borderRadius: '6px', fontSize: '0.9rem', lineHeight: '1.8' }}>
                  {(() => {
                    // Calculate balance after X months for traditional loan
                    const monthlyRate = mortgageDetails.interestRate / 1200;
                    const monthlyPayment = simulation.traditionalLoan.monthlyPayment;
                    let balance = mortgageDetails.currentBalance;

                    // Simulate to month X
                    for (let i = 0; i < simulation.allInOneLoan.payoffMonths; i++) {
                      const interest = balance * monthlyRate;
                      const principal = monthlyPayment - interest;
                      balance = balance - principal;
                    }

                    const interest = balance * monthlyRate;
                    const principal = monthlyPayment - interest;
                    const newBalance = balance - principal;

                    return (
                      <>
                        <div>Remaining Balance: <strong>{formatCurrency(balance)}</strong></div>
                        <div>Interest: {formatCurrency(balance)} × {(monthlyRate * 100).toFixed(6)}% = <strong>{formatCurrency(interest)}</strong></div>
                        <div>Principal: {formatCurrency(monthlyPayment)} - {formatCurrency(interest)} = <strong>{formatCurrency(principal)}</strong></div>
                        <div style={{ marginTop: '0.5rem', paddingTop: '0.5rem', borderTop: '2px solid #e2e8f0' }}>
                          New Balance: <strong>{formatCurrency(newBalance)}</strong>
                        </div>
                        <div style={{ marginTop: '1rem', padding: '0.75rem', background: '#fee2e2', borderRadius: '6px', fontSize: '0.85rem', color: '#991b1b' }}>
                          ⏳ Still <strong>{simulation.traditionalLoan.payoffMonths - simulation.allInOneLoan.payoffMonths} months</strong> left to pay off
                        </div>
                      </>
                    );
                  })()}
                </div>
              </div>

              {/* AIO Loan Final Month */}
              <div>
                <h4 style={{ fontSize: '1rem', fontWeight: '600', color: '#334155', marginBottom: '1rem' }}>All-In-One Loan (Paid Off! 🎉)</h4>
                <div style={{ padding: '1rem', background: 'white', borderRadius: '6px', fontSize: '0.9rem', lineHeight: '1.8' }}>
                  {(() => {
                    const monthlyDeposits = cashFlow?.monthlyDeposits || cashFlow?.totalIncome || 0;
                    const netCashFlow = cashFlow?.netCashFlow || 0;
                    const avgBalance = (monthlyDeposits + netCashFlow) / 2;
                    const monthlyRate = mortgageDetails.aioInterestRate / 1200;

                    // Calculate remaining balance in final month (should be small)
                    let balance = mortgageDetails.currentBalance;
                    for (let i = 0; i < simulation.allInOneLoan.payoffMonths - 1; i++) {
                      const effectivePrincipal = Math.max(0, balance - avgBalance);
                      const interest = effectivePrincipal * monthlyRate;
                      balance = balance + interest - netCashFlow;
                    }

                    const effectivePrincipal = Math.max(0, balance - avgBalance);
                    const interest = effectivePrincipal * monthlyRate;

                    return (
                      <>
                        <div>Final Balance: <strong>{formatCurrency(Math.max(0, balance))}</strong></div>
                        <div>Effective Principal: {formatCurrency(Math.max(0, balance))} - {formatCurrency(avgBalance)} = <strong>{formatCurrency(Math.max(0, effectivePrincipal))}</strong></div>
                        <div>Interest: {formatCurrency(Math.max(0, effectivePrincipal))} × {(monthlyRate * 100).toFixed(6)}% = <strong>{formatCurrency(Math.max(0, interest))}</strong></div>
                        <div>Final Payment: <strong>{formatCurrency(Math.max(0, balance + interest))}</strong></div>
                        <div style={{ marginTop: '0.5rem', paddingTop: '0.5rem', borderTop: '2px solid #e2e8f0' }}>
                          New Balance: <strong>$0.00</strong>
                        </div>
                        <div style={{ marginTop: '1rem', padding: '0.75rem', background: '#d1fae5', borderRadius: '6px', fontSize: '0.85rem', color: '#065f46' }}>
                          ✅ Loan <strong>PAID OFF</strong> in month {simulation.allInOneLoan.payoffMonths}!
                        </div>
                      </>
                    );
                  })()}
                </div>
              </div>
            </div>
          </div>

          {/* Comparison Summary */}
          <div style={{ padding: '2rem', background: 'linear-gradient(135deg, #e8f5e9 0%, #f1f8e9 100%)', borderRadius: '12px', border: '3px solid #9bc53d' }}>
            <h3 style={{ textAlign: 'center', marginBottom: '1.5rem', color: '#1e293b', fontSize: '1.5rem' }}>💰 The Bottom Line</h3>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '1.5rem', textAlign: 'center' }}>
              <div style={{ padding: '1.5rem', background: 'white', borderRadius: '8px' }}>
                <div style={{ fontSize: '0.9rem', color: '#64748b', marginBottom: '0.5rem' }}>Time Saved</div>
                <div style={{ fontSize: '2rem', fontWeight: '700', color: '#7da62e' }}>{yearsMonthsFromMonths(Math.max(0, simulation.comparison.timeSavedMonths))}</div>
              </div>
              <div style={{ padding: '1.5rem', background: 'white', borderRadius: '8px' }}>
                <div style={{ fontSize: '0.9rem', color: '#64748b', marginBottom: '0.5rem' }}>Interest Savings</div>
                <div style={{ fontSize: '2rem', fontWeight: '700', color: '#7da62e' }}>{formatCurrency(Math.max(0, simulation.comparison.interestSavings))}</div>
              </div>
              <div style={{ padding: '1.5rem', background: 'white', borderRadius: '8px' }}>
                <div style={{ fontSize: '0.9rem', color: '#64748b', marginBottom: '0.5rem' }}>Interest Reduction</div>
                <div style={{ fontSize: '2rem', fontWeight: '700', color: '#7da62e' }}>
                  {((Math.max(0, simulation.comparison.interestSavings) / simulation.traditionalLoan.totalInterestPaid) * 100).toFixed(1)}%
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
