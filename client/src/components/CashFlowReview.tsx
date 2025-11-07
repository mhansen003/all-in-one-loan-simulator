import { useState, useEffect } from 'react';
import type { CashFlowAnalysis, Transaction } from '../types';
import './CashFlowReview.css';

interface CashFlowReviewProps {
  cashFlow: CashFlowAnalysis;
  onContinue: () => void;
  onBack?: () => void;
  depositFrequency?: 'monthly' | 'biweekly' | 'weekly';
  onDepositFrequencyChange?: (frequency: 'monthly' | 'biweekly' | 'weekly') => void;
  onCashFlowUpdate?: (updatedCashFlow: CashFlowAnalysis) => void;
}

export default function CashFlowReview({
  cashFlow,
  onContinue,
  onBack,
  depositFrequency = 'monthly',
  onDepositFrequencyChange,
  onCashFlowUpdate
}: CashFlowReviewProps) {
  const [activeTab, setActiveTab] = useState<'summary' | 'transactions'>('summary');
  const [transactions, setTransactions] = useState<Transaction[]>(cashFlow.transactions);
  const [editingTransaction, setEditingTransaction] = useState<number | null>(null);

  // Recalculate totals whenever transactions change
  useEffect(() => {
    const includedTransactions = transactions.filter(t => !t.excluded);

    const totalIncome = includedTransactions
      .filter(t => t.category === 'income')
      .reduce((sum, t) => sum + t.amount, 0) / 12; // Average monthly

    const totalExpenses = includedTransactions
      .filter(t => t.category === 'expense' || t.category === 'recurring')
      .reduce((sum, t) => sum + Math.abs(t.amount), 0) / 12; // Average monthly

    const netCashFlow = totalIncome - totalExpenses;

    const updatedCashFlow: CashFlowAnalysis = {
      ...cashFlow,
      transactions,
      totalIncome,
      totalExpenses,
      netCashFlow
    };

    onCashFlowUpdate?.(updatedCashFlow);
  }, [transactions]);

  const toggleTransactionExclusion = (index: number) => {
    const updatedTransactions = [...transactions];
    updatedTransactions[index] = {
      ...updatedTransactions[index],
      excluded: !updatedTransactions[index].excluded
    };
    setTransactions(updatedTransactions);
  };

  const updateTransactionAmount = (index: number, newAmount: number) => {
    const updatedTransactions = [...transactions];
    updatedTransactions[index] = {
      ...updatedTransactions[index],
      amount: newAmount
    };
    setTransactions(updatedTransactions);
    setEditingTransaction(null);
  };

  // Recalculate totals for display
  const includedTransactions = transactions.filter(t => !t.excluded);
  const displayTotalIncome = includedTransactions
    .filter(t => t.category === 'income')
    .reduce((sum, t) => sum + t.amount, 0) / 12;

  const displayTotalExpenses = includedTransactions
    .filter(t => t.category === 'expense' || t.category === 'recurring')
    .reduce((sum, t) => sum + Math.abs(t.amount), 0) / 12;

  const displayNetCashFlow = displayTotalIncome - displayTotalExpenses;

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

  const groupedTransactions = transactions.reduce((acc, transaction) => {
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
                <div className="card-value">{formatCurrency(displayTotalIncome)}</div>
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
                <div className="card-value">{formatCurrency(displayTotalExpenses)}</div>
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
                <div className="card-value positive">{formatCurrency(displayNetCashFlow)}</div>
                <div className="card-description">Available for loan offset</div>
              </div>
            </div>
          </div>

          {/* Deposit Frequency Selector */}
          <div className="deposit-frequency-section">
            <div className="frequency-header">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" className="frequency-icon">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              <div>
                <h3>How often do you receive deposits?</h3>
                <p>Select your typical deposit frequency for more accurate calculations</p>
              </div>
            </div>

            <div className="frequency-options">
              <button
                type="button"
                className={`frequency-option ${depositFrequency === 'weekly' ? 'active' : ''}`}
                onClick={() => onDepositFrequencyChange?.('weekly')}
              >
                <div className="frequency-label">Weekly</div>
                <div className="frequency-description">Every Friday</div>
              </button>

              <button
                type="button"
                className={`frequency-option ${depositFrequency === 'biweekly' ? 'active' : ''}`}
                onClick={() => onDepositFrequencyChange?.('biweekly')}
              >
                <div className="frequency-label">Bi-Weekly</div>
                <div className="frequency-description">1st &amp; 15th of month</div>
              </button>

              <button
                type="button"
                className={`frequency-option ${depositFrequency === 'monthly' ? 'active' : ''}`}
                onClick={() => onDepositFrequencyChange?.('monthly')}
              >
                <div className="frequency-label">Monthly</div>
                <div className="frequency-description">Once per month</div>
              </button>
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
            <p>Showing {transactions.length} categorized transactions</p>
            <div className="transactions-instructions">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span>
                <strong>Check to EXCLUDE</strong> transactions from calculations. Click amounts to edit if OCR errors are detected.
              </span>
            </div>
          </div>

          {Object.entries(groupedTransactions).map(([category, categoryTransactions]) => {
            const actualIndices = categoryTransactions.map(t =>
              transactions.findIndex(tr => tr === t)
            );

            return (
              <div key={category} className="transaction-group">
                <div className="group-header">
                  <span
                    className="category-badge"
                    style={{ backgroundColor: getCategoryColor(category as Transaction['category']) }}
                  >
                    {getCategoryLabel(category as Transaction['category'])}
                  </span>
                  <span className="group-count">
                    {categoryTransactions.length} transaction{categoryTransactions.length !== 1 ? 's' : ''}
                  </span>
                </div>

                <div className="transaction-list">
                  {categoryTransactions.slice(0, 10).map((transaction, idx) => {
                    const actualIndex = actualIndices[idx];
                    return (
                      <div key={actualIndex} className={`transaction-item ${transaction.excluded ? 'excluded' : ''}`}>
                        <div className="transaction-checkbox">
                          <input
                            type="checkbox"
                            checked={transaction.excluded || false}
                            onChange={() => toggleTransactionExclusion(actualIndex)}
                            id={`transaction-${actualIndex}`}
                          />
                          <label htmlFor={`transaction-${actualIndex}`}>Exclude</label>
                        </div>
                        <div className="transaction-date">
                          {new Date(transaction.date).toLocaleDateString()}
                        </div>
                        <div className="transaction-description">{transaction.description}</div>
                        {editingTransaction === actualIndex ? (
                          <input
                            type="number"
                            className="transaction-amount-input"
                            defaultValue={Math.abs(transaction.amount)}
                            onBlur={(e) => {
                              const newAmount = parseFloat(e.target.value);
                              if (!isNaN(newAmount) && newAmount > 0) {
                                updateTransactionAmount(
                                  actualIndex,
                                  transaction.category === 'income' ? newAmount : -newAmount
                                );
                              } else {
                                setEditingTransaction(null);
                              }
                            }}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') {
                                const newAmount = parseFloat(e.currentTarget.value);
                                if (!isNaN(newAmount) && newAmount > 0) {
                                  updateTransactionAmount(
                                    actualIndex,
                                    transaction.category === 'income' ? newAmount : -newAmount
                                  );
                                }
                              } else if (e.key === 'Escape') {
                                setEditingTransaction(null);
                              }
                            }}
                            autoFocus
                          />
                        ) : (
                          <div
                            className={`transaction-amount editable ${transaction.category === 'income' ? 'positive' : 'negative'}`}
                            onClick={() => setEditingTransaction(actualIndex)}
                            title="Click to edit amount"
                          >
                            {transaction.category === 'income' ? '+' : '-'}
                            {formatCurrency(Math.abs(transaction.amount))}
                          </div>
                        )}
                      </div>
                    );
                  })}
                  {categoryTransactions.length > 10 && (
                    <div className="transaction-item more">
                      <span>... and {categoryTransactions.length - 10} more</span>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
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
