import { useState } from 'react';
import type { CashFlowAnalysis, Transaction } from '../types';
import './CashFlowReview.css';

interface CashFlowReviewProps {
  cashFlow: CashFlowAnalysis;
  onContinue: () => void;
  onBack?: () => void;
}

export default function CashFlowReview({ cashFlow, onContinue, onBack }: CashFlowReviewProps) {
  const [activeTab, setActiveTab] = useState<'summary' | 'transactions'>('summary');

  const formatCurrency = (amount: number): string => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const getCategoryColor = (category: Transaction['category']): string => {
    switch (category) {
      case 'income':
        return '#48bb78';
      case 'expense':
        return '#ed8936';
      case 'housing':
        return '#9f7aea';
      case 'one-time':
        return '#f56565';
      case 'recurring':
        return '#4299e1';
      default:
        return '#718096';
    }
  };

  const getCategoryLabel = (category: Transaction['category']): string => {
    switch (category) {
      case 'income':
        return 'Income';
      case 'expense':
        return 'Regular Expense';
      case 'housing':
        return 'Housing (Excluded)';
      case 'one-time':
        return 'One-Time (Excluded)';
      case 'recurring':
        return 'Recurring';
      default:
        return category;
    }
  };

  const groupedTransactions = cashFlow.transactions.reduce((acc, transaction) => {
    const category = transaction.category;
    if (!acc[category]) {
      acc[category] = [];
    }
    acc[category].push(transaction);
    return acc;
  }, {} as Record<string, Transaction[]>);

  const confidenceColor = cashFlow.confidence >= 0.8 ? '#48bb78' : cashFlow.confidence >= 0.6 ? '#ed8936' : '#f56565';
  const confidenceLabel = cashFlow.confidence >= 0.8 ? 'High' : cashFlow.confidence >= 0.6 ? 'Medium' : 'Low';

  return (
    <div className="cash-flow-review">
      <div className="form-header">
        <h2>Cash Flow Analysis Complete</h2>
        <p>Review the AI-generated analysis of your bank statements</p>
      </div>

      <div className="confidence-banner" style={{ borderColor: confidenceColor }}>
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

      <div className="tabs">
        <button
          className={`tab ${activeTab === 'summary' ? 'active' : ''}`}
          onClick={() => setActiveTab('summary')}
        >
          Cash Flow Summary
        </button>
        <button
          className={`tab ${activeTab === 'transactions' ? 'active' : ''}`}
          onClick={() => setActiveTab('transactions')}
        >
          Transactions ({cashFlow.transactions.length})
        </button>
      </div>

      {activeTab === 'summary' && (
        <div className="summary-view">
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

          <div className="info-panel">
            <div className="info-panel-header">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <h3>What this means for the All-In-One loan</h3>
            </div>
            <p>
              Your net monthly cash flow of <strong>{formatCurrency(cashFlow.netCashFlow)}</strong> will be
              used to offset the principal balance of your loan. This means you'll pay interest on a lower
              effective balance, resulting in significant interest savings and a faster payoff timeline.
            </p>
            <div className="exclusions-note">
              <strong>Automatically Excluded:</strong>
              <ul>
                <li>Current housing payments (rent/mortgage)</li>
                <li>One-time large expenses (vacations, major purchases)</li>
              </ul>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'transactions' && (
        <div className="transactions-view">
          <div className="transactions-header">
            <p>Showing {cashFlow.transactions.length} categorized transactions</p>
          </div>

          {Object.entries(groupedTransactions).map(([category, transactions]) => (
            <div key={category} className="transaction-group">
              <div className="group-header">
                <span
                  className="category-badge"
                  style={{ backgroundColor: getCategoryColor(category as Transaction['category']) }}
                >
                  {getCategoryLabel(category as Transaction['category'])}
                </span>
                <span className="group-count">
                  {transactions.length} transaction{transactions.length !== 1 ? 's' : ''}
                </span>
              </div>

              <div className="transaction-list">
                {transactions.slice(0, 10).map((transaction, idx) => (
                  <div key={idx} className="transaction-item">
                    <div className="transaction-date">
                      {new Date(transaction.date).toLocaleDateString()}
                    </div>
                    <div className="transaction-description">{transaction.description}</div>
                    <div className={`transaction-amount ${transaction.category === 'income' ? 'positive' : 'negative'}`}>
                      {transaction.category === 'income' ? '+' : '-'}
                      {formatCurrency(Math.abs(transaction.amount))}
                    </div>
                  </div>
                ))}
                {transactions.length > 10 && (
                  <div className="transaction-item more">
                    <span>... and {transactions.length - 10} more</span>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="form-actions">
        {onBack && (
          <button type="button" className="btn-secondary" onClick={onBack}>
            <svg className="btn-icon" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Back
          </button>
        )}
        <button type="button" className="btn-primary" onClick={onContinue}>
          Continue to Simulation
          <svg className="btn-icon" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </button>
      </div>
    </div>
  );
}
