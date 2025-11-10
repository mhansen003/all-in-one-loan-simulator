import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import './PublicProposalView.css';

const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:3001';
const CMG_BRANDING = {
  logo: {
    url: 'https://www.cmgfi.com/wp-content/uploads/2021/12/cmg-financial-logo-2021.png',
    alt: 'CMG Financial',
  },
};

export default function PublicProposalView() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [proposal, setProposal] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchProposal = async () => {
      try {
        setLoading(true);
        const response = await fetch(`${API_BASE}/api/proposals/${id}`);
        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.message || 'Failed to load proposal');
        }

        setProposal(data.proposal);
      } catch (err: any) {
        console.error('Error loading proposal:', err);
        setError(err.message || 'Failed to load proposal');
      } finally {
        setLoading(false);
      }
    };

    if (id) {
      fetchProposal();
    }
  }, [id]);

  const formatCurrency = (amount: number): string => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const yearsMonthsFromMonths = (totalMonths: number) => {
    const years = Math.floor(totalMonths / 12);
    const months = totalMonths % 12;
    if (years > 0) {
      return months > 0
        ? `${years} yr${years > 1 ? 's' : ''} ${months} mo`
        : `${years} yr${years > 1 ? 's' : ''} 0 mo`;
    }
    return `${months} mo`;
  };

  if (loading) {
    return (
      <div className="public-proposal-loading">
        <div className="spinner"></div>
        <p>Loading proposal...</p>
      </div>
    );
  }

  if (error || !proposal) {
    return (
      <div className="public-proposal-error">
        <div className="error-icon">⚠️</div>
        <h2>Proposal Not Found</h2>
        <p>{error || 'This proposal does not exist or has expired.'}</p>
        <button onClick={() => navigate('/')} className="btn-primary">
          Go to Home
        </button>
      </div>
    );
  }

  const { simulation, clientName, aiPitch, components, cashFlow } = proposal;

  return (
    <div className="public-proposal-container">
      {/* Print button (fixed top-right) */}
      <button
        className="print-button"
        onClick={() => window.print()}
        title="Print or save as PDF"
      >
        🖨️ Print
      </button>

      <div className="proposal-content">
        {/* Header with CMG Logo */}
        <div className="preview-header">
          <img
            src={CMG_BRANDING.logo.url}
            alt={CMG_BRANDING.logo.alt}
            style={{ maxWidth: '180px', marginBottom: '1rem' }}
          />
          <h1>All-In-One Loan Proposal</h1>
          {clientName && <h2>Prepared for {clientName}</h2>}
          <p>{new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</p>
        </div>

        {/* AI Pitch */}
        {aiPitch && components?.find((c: any) => c.id === 'ai-pitch')?.enabled && (
          <div className="preview-section pitch-section">
            <h3>Why the All-In-One Loan is Right for You</h3>
            <div className="preview-pitch" style={{ whiteSpace: 'pre-wrap' }}>{aiPitch}</div>
          </div>
        )}

        {/* Savings Highlight */}
        {components?.find((c: any) => c.id === 'savings-highlight')?.enabled && (
          <div className="preview-section savings-section">
            <h3>Total Interest Savings</h3>
            <div className="preview-savings-amount">{formatCurrency(simulation.comparison.interestSavings)}</div>
            <div className="preview-stats">
              <div>
                <strong>Time Saved:</strong> {yearsMonthsFromMonths(simulation.comparison.timeSavedMonths)}
              </div>
              <div>
                <strong>Interest Reduction:</strong> {simulation.comparison.percentageSavings.toFixed(1)}%
              </div>
            </div>
          </div>
        )}

        {/* Comparison Table */}
        {components?.find((c: any) => c.id === 'comparison-cards')?.enabled && (
          <div className="preview-section">
            <h3>Side-by-Side Comparison</h3>
            <table className="preview-table">
              <thead>
                <tr>
                  <th>Metric</th>
                  <th>Traditional Mortgage</th>
                  <th>All-In-One Loan</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td>Monthly Payment</td>
                  <td>{formatCurrency(simulation.traditionalLoan.monthlyPayment)}</td>
                  <td>{formatCurrency(simulation.traditionalLoan.monthlyPayment)}</td>
                </tr>
                <tr>
                  <td>Total Interest</td>
                  <td>{formatCurrency(simulation.traditionalLoan.totalInterestPaid)}</td>
                  <td className="savings-cell">{formatCurrency(simulation.allInOneLoan.totalInterestPaid)}</td>
                </tr>
                <tr>
                  <td>Payoff Timeline</td>
                  <td>{yearsMonthsFromMonths(simulation.traditionalLoan.payoffMonths)}</td>
                  <td className="savings-cell">{yearsMonthsFromMonths(simulation.allInOneLoan.payoffMonths)}</td>
                </tr>
              </tbody>
            </table>
          </div>
        )}

        {/* How It Works */}
        {components?.find((c: any) => c.id === 'how-it-works')?.enabled && (
          <div className="preview-section">
            <h3>How the All-In-One Loan Works</h3>
            <div className="preview-benefits">
              <div className="benefit-item">
                <h4>💰 Cash Flow Offset</h4>
                <p>Your positive cash flow sits in the loan account, reducing the balance used for interest calculations.</p>
              </div>
              <div className="benefit-item">
                <h4>📈 Accelerated Payoff</h4>
                <p>You'll pay off your mortgage {yearsMonthsFromMonths(simulation.comparison.timeSavedMonths)} faster.</p>
              </div>
              <div className="benefit-item">
                <h4>🔓 Full Flexibility</h4>
                <p>Access your funds anytime while they work to reduce your interest.</p>
              </div>
            </div>
          </div>
        )}

        {/* Cash Flow Analysis */}
        {components?.find((c: any) => c.id === 'cash-flow-details')?.enabled && cashFlow && (
          <div className="preview-section">
            <h3>Cash Flow Analysis</h3>
            <table className="preview-table">
              <thead>
                <tr>
                  <th>Item</th>
                  <th style={{textAlign: 'right'}}>Amount</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td>Monthly Income</td>
                  <td style={{textAlign: 'right'}}>{formatCurrency(cashFlow?.totalIncome || 0)}</td>
                </tr>
                <tr>
                  <td>Monthly Expenses</td>
                  <td style={{textAlign: 'right'}}>{formatCurrency(cashFlow?.totalExpenses || 0)}</td>
                </tr>
                <tr className="savings-cell">
                  <td><strong>Net Monthly Cash Flow</strong></td>
                  <td style={{textAlign: 'right'}}><strong>{formatCurrency(cashFlow?.netCashFlow || 0)}</strong></td>
                </tr>
              </tbody>
            </table>
          </div>
        )}

        {/* Payoff Timeline */}
        {components?.find((c: any) => c.id === 'amortization-chart')?.enabled && (
          <div className="preview-section">
            <h3>Payoff Timeline Comparison</h3>
            <div style={{ background: '#f7fafc', padding: '2rem', borderRadius: '8px' }}>
              <div style={{ marginBottom: '2rem' }}>
                <div style={{ overflow: 'hidden' }}>
                  <div style={{ float: 'left', width: '48%', marginRight: '4%' }}>
                    <div style={{
                      background: '#3b82f6',
                      borderRadius: '8px',
                      padding: '2rem 1rem',
                      textAlign: 'center',
                      color: 'white',
                      minHeight: '100px'
                    }}>
                      <div style={{ fontSize: '0.85rem', marginBottom: '0.75rem', opacity: 0.95 }}>Traditional Loan</div>
                      <div style={{ fontSize: '1.5rem', fontWeight: '700', lineHeight: '1.2' }}>
                        {yearsMonthsFromMonths(simulation.traditionalLoan.payoffMonths)}
                      </div>
                    </div>
                  </div>
                  <div style={{ float: 'left', width: '48%' }}>
                    <div style={{
                      background: '#9bc53d',
                      borderRadius: '8px',
                      padding: '2rem 1rem',
                      textAlign: 'center',
                      color: 'white',
                      minHeight: '100px'
                    }}>
                      <div style={{ fontSize: '0.85rem', marginBottom: '0.75rem', opacity: 0.95 }}>All-In-One Loan</div>
                      <div style={{ fontSize: '1.5rem', fontWeight: '700', lineHeight: '1.2' }}>
                        {yearsMonthsFromMonths(simulation.allInOneLoan.payoffMonths)}
                      </div>
                    </div>
                  </div>
                </div>
                <div style={{ clear: 'both' }}></div>
              </div>
              <div style={{
                color: '#16a34a',
                fontWeight: '700',
                fontSize: '1.1rem',
                background: '#f0fdf4',
                padding: '1.25rem',
                borderRadius: '8px',
                border: '2px solid #86efac',
                textAlign: 'center'
              }}>
                💰 Pay off {yearsMonthsFromMonths(simulation.comparison.timeSavedMonths)} faster!
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
