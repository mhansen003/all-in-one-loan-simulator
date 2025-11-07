import { useState } from 'react';
import type { CashFlowAnalysis, Transaction, MonthlyBreakdown } from '../types';
import './CashFlowReviewModal.css';

interface CashFlowReviewModalProps {
  analysis: CashFlowAnalysis;
  onConfirm: (updatedAnalysis: CashFlowAnalysis) => void;
  onCancel: () => void;
}

export default function CashFlowReviewModal({ analysis, onConfirm, onCancel }: CashFlowReviewModalProps) {
  const [transactions, setTransactions] = useState<Transaction[]>(analysis.transactions);
  const [activeTab, setActiveTab] = useState<'flagged' | 'monthly' | 'all'>('flagged');

  // Calculate updated totals based on excluded transactions
  const calculateUpdatedTotals = (txns: Transaction[]) => {
    const includedTransactions = txns.filter((t) => !t.excluded);
    const income = includedTransactions
      .filter((t) => t.category === 'income')
      .reduce((sum, t) => sum + t.amount, 0);
    const expenses = includedTransactions
      .filter((t) => t.category === 'expense')
      .reduce((sum, t) => sum + Math.abs(t.amount), 0);
    return {
      totalIncome: income,
      totalExpenses: expenses,
      netCashFlow: income - expenses,
    };
  };

  const handleToggleExclude = (index: number) => {
    const updated = [...transactions];
    updated[index].excluded = !updated[index].excluded;
    setTransactions(updated);
  };

  const handleConfirm = () => {
    const updatedTotals = calculateUpdatedTotals(transactions);
    const updatedAnalysis: CashFlowAnalysis = {
      ...analysis,
      transactions,
      ...updatedTotals,
      averageMonthlyBalance: Math.max(0, updatedTotals.netCashFlow),
      flaggedTransactions: transactions.filter((t) => t.flagged && !t.excluded),
    };
    onConfirm(updatedAnalysis);
  };

  const flaggedTransactions = transactions.filter((t) => t.flagged);
  const currentTotals = calculateUpdatedTotals(transactions);
  const excludedCount = transactions.filter((t) => t.excluded).length;

  // Group transactions by month for monthly breakdown
  const monthlyData = analysis.monthlyBreakdown || [];

  return (
    <div className="modal-overlay">
      <div className="modal-container review-modal">
        <div className="modal-header">
          <h2>📊 Review Cash Flow Analysis</h2>
          <p>Review AI-detected transactions and exclude any irregular items before calculating your average cash flow.</p>
        </div>

        {/* Summary Stats */}
        <div className="review-summary">
          <div className="summary-card">
            <div className="summary-label">Average Monthly Income</div>
            <div className="summary-value income">{formatCurrency(currentTotals.totalIncome)}</div>
          </div>
          <div className="summary-card">
            <div className="summary-label">Average Monthly Expenses</div>
            <div className="summary-value expense">{formatCurrency(currentTotals.totalExpenses)}</div>
          </div>
          <div className="summary-card highlighted">
            <div className="summary-label">Net Cash Flow</div>
            <div className="summary-value">{formatCurrency(currentTotals.netCashFlow)}</div>
            <div className="summary-hint">{excludedCount} transaction(s) excluded</div>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="review-tabs">
          <button
            className={`review-tab ${activeTab === 'flagged' ? 'active' : ''}`}
            onClick={() => setActiveTab('flagged')}
          >
            🚩 Flagged Items ({flaggedTransactions.length})
          </button>
          <button
            className={`review-tab ${activeTab === 'monthly' ? 'active' : ''}`}
            onClick={() => setActiveTab('monthly')}
          >
            📅 Monthly Breakdown
          </button>
          <button
            className={`review-tab ${activeTab === 'all' ? 'active' : ''}`}
            onClick={() => setActiveTab('all')}
          >
            📋 All Transactions ({transactions.length})
          </button>
        </div>

        {/* Tab Content */}
        <div className="review-content">
          {/* Flagged Transactions Tab */}
          {activeTab === 'flagged' && (
            <div className="transactions-section">
              {flaggedTransactions.length === 0 ? (
                <div className="empty-state">
                  <div className="empty-icon">✅</div>
                  <p>No irregular transactions detected!</p>
                  <p className="empty-hint">All transactions appear to be regular recurring expenses.</p>
                </div>
              ) : (
                <>
                  <div className="section-header">
                    <h3>Flagged for Review</h3>
                    <p>These transactions were identified as potentially irregular. Review and exclude any that shouldn't be counted in your average monthly cash flow.</p>
                  </div>
                  <div className="transactions-list">
                    {flaggedTransactions.map((transaction, idx) => {
                      const originalIndex = transactions.indexOf(transaction);
                      return (
                        <div key={idx} className={`transaction-item ${transaction.excluded ? 'excluded' : ''}`}>
                          <div className="transaction-checkbox">
                            <input
                              type="checkbox"
                              checked={!transaction.excluded}
                              onChange={() => handleToggleExclude(originalIndex)}
                              id={`txn-${originalIndex}`}
                            />
                          </div>
                          <div className="transaction-details">
                            <div className="transaction-main">
                              <span className="transaction-date">{formatDate(transaction.date)}</span>
                              <span className="transaction-description">{transaction.description}</span>
                              <span className={`transaction-amount ${transaction.amount < 0 ? 'expense' : 'income'}`}>
                                {formatCurrency(Math.abs(transaction.amount))}
                              </span>
                            </div>
                            {transaction.flagReason && (
                              <div className="transaction-flag-reason">
                                <span className="flag-icon">🚩</span>
                                {transaction.flagReason}
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </>
              )}
            </div>
          )}

          {/* Monthly Breakdown Tab */}
          {activeTab === 'monthly' && (
            <div className="monthly-section">
              <div className="section-header">
                <h3>Month-by-Month Analysis</h3>
                <p>See how your cash flow varied across different months.</p>
              </div>
              {monthlyData.length > 0 ? (
                <div className="monthly-table-container">
                  <table className="monthly-table">
                    <thead>
                      <tr>
                        <th>Month</th>
                        <th>Income</th>
                        <th>Expenses</th>
                        <th>Net Cash Flow</th>
                        <th>Transactions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {monthlyData.map((month: MonthlyBreakdown, idx: number) => (
                        <tr key={idx}>
                          <td className="month-cell">{formatMonth(month.month)}</td>
                          <td className="income-cell">{formatCurrency(month.income)}</td>
                          <td className="expense-cell">{formatCurrency(month.expenses)}</td>
                          <td className="cashflow-cell">
                            <strong>{formatCurrency(month.netCashFlow)}</strong>
                          </td>
                          <td className="count-cell">{month.transactionCount}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="empty-state">
                  <p>No monthly breakdown available</p>
                </div>
              )}
            </div>
          )}

          {/* All Transactions Tab */}
          {activeTab === 'all' && (
            <div className="transactions-section">
              <div className="section-header">
                <h3>All Transactions</h3>
                <p>Complete list of categorized transactions from your bank statements.</p>
              </div>
              <div className="transactions-list">
                {transactions.map((transaction, idx) => (
                  <div key={idx} className={`transaction-item ${transaction.excluded ? 'excluded' : ''}`}>
                    <div className="transaction-checkbox">
                      <input
                        type="checkbox"
                        checked={!transaction.excluded}
                        onChange={() => handleToggleExclude(idx)}
                        id={`txn-all-${idx}`}
                      />
                    </div>
                    <div className="transaction-details">
                      <div className="transaction-main">
                        <span className="transaction-date">{formatDate(transaction.date)}</span>
                        <span className="transaction-description">{transaction.description}</span>
                        <span className="transaction-category">{transaction.category}</span>
                        <span className={`transaction-amount ${transaction.amount < 0 ? 'expense' : 'income'}`}>
                          {formatCurrency(Math.abs(transaction.amount))}
                        </span>
                      </div>
                      {transaction.flagReason && (
                        <div className="transaction-flag-reason">
                          <span className="flag-icon">🚩</span>
                          {transaction.flagReason}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Modal Actions */}
        <div className="modal-actions">
          <button type="button" className="btn-secondary" onClick={onCancel}>
            Cancel
          </button>
          <button type="button" className="btn-primary" onClick={handleConfirm}>
            Confirm & Continue
            <svg
              className="btn-icon"
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
}

// Helper functions
function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

function formatDate(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function formatMonth(monthStr: string): string {
  const [year, month] = monthStr.split('-');
  const date = new Date(parseInt(year), parseInt(month) - 1);
  return date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
}
