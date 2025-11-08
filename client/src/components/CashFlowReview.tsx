import { useState, useEffect, useMemo } from 'react';
import type { CashFlowAnalysis, Transaction } from '../types';
import { ComposedChart, Area, Scatter, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import './CashFlowReview.css';

interface CashFlowReviewProps {
  cashFlow: CashFlowAnalysis;
  onContinue: () => void;
  onBack?: () => void;
  onCashFlowUpdate?: (updatedCashFlow: CashFlowAnalysis) => void;
  hideSummary?: boolean; // Hide duplicate banners and cards when embedded in tabs
}

export default function CashFlowReview({
  cashFlow,
  onContinue,
  onBack,
  onCashFlowUpdate,
  hideSummary = false
}: CashFlowReviewProps) {
  // No more tabs - single view
  const [transactionSubTab, setTransactionSubTab] = useState<'all' | 'income' | 'expense' | 'housing' | 'one-time'>('all');
  const [transactions, setTransactions] = useState<Transaction[]>(() => {
    // Auto-exclude housing and one-time transactions on initial load
    return cashFlow.transactions.map(t => ({
      ...t,
      excluded: t.excluded || t.category === 'housing' || t.category === 'one-time'
    }));
  });
  const [editingTransaction, setEditingTransaction] = useState<number | null>(null);
  const [depositFrequency, setDepositFrequency] = useState<'weekly' | 'biweekly' | 'semi-monthly' | 'monthly'>(
    (cashFlow.depositFrequency as 'weekly' | 'biweekly' | 'semi-monthly' | 'monthly') || 'monthly'
  );

  // Calculate actual months from transaction data
  const calculateActualMonths = (transactions: Transaction[]): number => {
    if (transactions.length === 0) return 1;

    const dates = transactions.map(t => new Date(t.date));
    const minDate = new Date(Math.min(...dates.map(d => d.getTime())));
    const maxDate = new Date(Math.max(...dates.map(d => d.getTime())));

    const monthsDiff = (maxDate.getFullYear() - minDate.getFullYear()) * 12 +
                       (maxDate.getMonth() - minDate.getMonth()) + 1;

    return Math.max(1, monthsDiff); // At least 1 month
  };

  // Recalculate totals whenever transactions change
  useEffect(() => {
    const includedTransactions = transactions.filter(t => !t.excluded);
    const actualMonths = calculateActualMonths(includedTransactions);

    const totalIncome = includedTransactions
      .filter(t => t.category === 'income')
      .reduce((sum, t) => sum + t.amount, 0) / actualMonths; // Average monthly

    const totalExpenses = includedTransactions
      .filter(t => t.category !== 'income') // Include all non-income categories (expense, recurring, housing, one-time)
      .reduce((sum, t) => sum + Math.abs(t.amount), 0) / actualMonths; // Average monthly

    const netCashFlow = totalIncome - totalExpenses;

    const updatedCashFlow: CashFlowAnalysis = {
      ...cashFlow,
      transactions,
      totalIncome,
      totalExpenses,
      netCashFlow,
      depositFrequency
    };

    onCashFlowUpdate?.(updatedCashFlow);
  }, [transactions, depositFrequency]);

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
  const actualMonths = calculateActualMonths(includedTransactions);

  const displayTotalIncome = includedTransactions
    .filter(t => t.category === 'income')
    .reduce((sum, t) => sum + t.amount, 0) / actualMonths;

  const displayTotalExpenses = includedTransactions
    .filter(t => t.category !== 'income') // Include all non-income categories (expense, recurring, housing, one-time)
    .reduce((sum, t) => sum + Math.abs(t.amount), 0) / actualMonths;

  const displayNetCashFlow = displayTotalIncome - displayTotalExpenses;

  // Prepare chart data - group by month and calculate incoming/outgoing
  const chartData = useMemo(() => {
    const monthlyData: { [key: string]: { incoming: number; outgoing: number } } = {};

    includedTransactions.forEach(transaction => {
      const date = new Date(transaction.date);
      const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;

      if (!monthlyData[monthKey]) {
        monthlyData[monthKey] = { incoming: 0, outgoing: 0 };
      }

      if (transaction.category === 'income' || transaction.amount > 0) {
        monthlyData[monthKey].incoming += Math.abs(transaction.amount);
      } else {
        monthlyData[monthKey].outgoing += Math.abs(transaction.amount);
      }
    });

    // Convert to array and sort by date
    return Object.entries(monthlyData)
      .map(([month, data]) => ({
        month,
        monthLabel: new Date(month + '-01').toLocaleDateString('en-US', { month: 'short', year: 'numeric' }),
        incoming: Math.round(data.incoming),
        outgoing: Math.round(data.outgoing)
      }))
      .sort((a, b) => a.month.localeCompare(b.month));
  }, [includedTransactions]);

  // Prepare scatter data for one-time items (showing ALL, not just included)
  const oneTimeScatterData = useMemo(() => {
    return transactions
      .filter(t => t.category === 'one-time')
      .map(transaction => {
        const date = new Date(transaction.date);
        const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
        const monthLabel = new Date(monthKey + '-01').toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
        const amount = Math.abs(transaction.amount);
        const isIncome = transaction.amount > 0;

        return {
          month: monthKey,
          monthLabel,
          amount,
          isIncome,
          description: transaction.description,
          excluded: transaction.excluded
        };
      });
  }, [transactions]);

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
        return 'Housing (Auto-Excluded)';
      case 'one-time':
        return 'One-Time (Auto-Excluded)';
      case 'recurring':
        return 'Recurring';
      default:
        return category;
    }
  };

  // Define category order to match tab order
  const categoryOrder = ['income', 'expense', 'recurring', 'housing', 'one-time'];

  // Group transactions by category
  const groupedTransactions = transactions.reduce((acc, transaction) => {
    const category = transaction.category;
    if (!acc[category]) {
      acc[category] = [];
    }
    acc[category].push(transaction);
    return acc;
  }, {} as Record<string, Transaction[]>);

  // Sort grouped transactions by category order
  const sortedGroupedTransactions = Object.fromEntries(
    categoryOrder
      .filter(cat => groupedTransactions[cat])
      .map(cat => [cat, groupedTransactions[cat]])
  );

  // Get temperature rating based on net cash flow
  const getTemperatureRating = (netCashFlow: number): {
    rating: string;
    color: string;
    description: string;
    icon: string;
  } => {
    if (netCashFlow >= 2000) {
      return {
        rating: 'EXCELLENT',
        color: '#10b981',
        description: 'Perfect candidate for AIO loan! Significant interest savings expected.',
        icon: '🔥'
      };
    } else if (netCashFlow >= 1000) {
      return {
        rating: 'VERY GOOD',
        color: '#22c55e',
        description: 'Great candidate! Will see substantial benefits from daily interest calculation.',
        icon: '✨'
      };
    } else if (netCashFlow >= 500) {
      return {
        rating: 'GOOD',
        color: '#84cc16',
        description: 'Good candidate. AIO loan will provide meaningful interest savings.',
        icon: '👍'
      };
    } else if (netCashFlow > 300) {
      return {
        rating: 'FAIR',
        color: '#eab308',
        description: 'Moderate benefits. AIO loan can help, but savings will be modest.',
        icon: '⚠️'
      };
    } else {
      return {
        rating: 'NOT SUITABLE',
        color: '#ef4444',
        description: 'Not recommended. Cash flow of $300 or less per month is insufficient for AIO loan benefits.',
        icon: '❌'
      };
    }
  };

  const temperatureRating = getTemperatureRating(displayNetCashFlow);

  const confidenceColor = cashFlow.confidence >= 0.8 ? '#48bb78' : cashFlow.confidence >= 0.6 ? '#ed8936' : '#f56565';
  const confidenceLabel = cashFlow.confidence >= 0.8 ? 'High' : cashFlow.confidence >= 0.6 ? 'Medium' : 'Low';

  // Filter transactions by active sub-tab
  const getFilteredTransactions = () => {
    if (transactionSubTab === 'all') {
      return sortedGroupedTransactions;
    }
    const filtered = transactions.filter(t => {
      if (transactionSubTab === 'income') return t.category === 'income';
      if (transactionSubTab === 'expense') return t.category === 'expense' || t.category === 'recurring';
      if (transactionSubTab === 'housing') return t.category === 'housing';
      if (transactionSubTab === 'one-time') return t.category === 'one-time';
      return true;
    });
    return { [transactionSubTab]: filtered };
  };

  // Calculate category totals
  const getCategoryTotal = (category: string) => {
    const categoryTransactions = groupedTransactions[category] || [];
    const includedOnly = categoryTransactions.filter(t => !t.excluded);
    const categoryActualMonths = calculateActualMonths(includedOnly);
    return includedOnly.reduce((sum, t) => sum + Math.abs(t.amount), 0) / categoryActualMonths;
  };

  return (
    <div className="cash-flow-review">
      {!hideSummary && (
        <>
          <div className="form-header">
            <h2>Cash Flow Analysis Complete</h2>
            <p>Review the AI-generated analysis of your bank statements</p>
          </div>

          {/* Confidence and Suitability Side-by-Side */}
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

          {/* Always Visible Summary Cards */}
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
                <div className="card-description">
                  Avg from {actualMonths} month{actualMonths !== 1 ? 's' : ''} of statements
                </div>
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
                <div className="card-description">
                  Avg from {actualMonths} month{actualMonths !== 1 ? 's' : ''} of statements
                </div>
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
                <div className={`card-value ${displayNetCashFlow >= 0 ? 'positive' : 'negative'}`}>
                  {formatCurrency(displayNetCashFlow)}
                </div>
                <div className="card-description">
                  {displayNetCashFlow >= 0 ? 'Available for loan offset' : 'Negative - Not suitable for AIO'}
                </div>
              </div>
            </div>
          </div>

          {/* Deposit Frequency Selector */}
          <div className="deposit-frequency-section">
            <div className="frequency-header">
              <svg className="frequency-icon" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              <div>
                <h3>Deposit Frequency</h3>
                <p>AI detected: <strong>{depositFrequency}</strong>. You can change this if needed.</p>
              </div>
            </div>
            <div className="frequency-options">
              <div
                className={`frequency-option ${depositFrequency === 'weekly' ? 'active' : ''}`}
                onClick={() => setDepositFrequency('weekly')}
              >
                <div className="frequency-label">Weekly</div>
                <div className="frequency-description">Every 7 days</div>
              </div>
              <div
                className={`frequency-option ${depositFrequency === 'biweekly' ? 'active' : ''}`}
                onClick={() => setDepositFrequency('biweekly')}
              >
                <div className="frequency-label">Biweekly</div>
                <div className="frequency-description">Every 14 days</div>
              </div>
              <div
                className={`frequency-option ${depositFrequency === 'semi-monthly' ? 'active' : ''}`}
                onClick={() => setDepositFrequency('semi-monthly')}
              >
                <div className="frequency-label">Semi-Monthly</div>
                <div className="frequency-description">Twice per month</div>
              </div>
              <div
                className={`frequency-option ${depositFrequency === 'monthly' ? 'active' : ''}`}
                onClick={() => setDepositFrequency('monthly')}
              >
                <div className="frequency-label">Monthly</div>
                <div className="frequency-description">Once per month</div>
              </div>
            </div>
          </div>

          {/* Cash Flow Chart */}
          {chartData.length > 0 && (
            <div className="cash-flow-chart" style={{
              background: 'white',
              borderRadius: '12px',
              padding: '1.5rem',
              marginBottom: '2rem',
              boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)'
            }}>
              <h3 style={{
                fontSize: '1.125rem',
                fontWeight: '600',
                color: '#1a202c',
                marginBottom: '1rem',
                marginTop: '0'
              }}>
                Cash Flow Over Time
              </h3>
              <p style={{
                fontSize: '0.875rem',
                color: '#718096',
                marginBottom: '1.5rem',
                marginTop: '0'
              }}>
                Showing {chartData.length} month{chartData.length !== 1 ? 's' : ''} of transaction data
              </p>
              <ResponsiveContainer width="100%" height={300}>
                <ComposedChart
                  data={chartData}
                  margin={{ top: 10, right: 30, left: 0, bottom: 0 }}
                >
                  <defs>
                    <linearGradient id="colorIncoming" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#48bb78" stopOpacity={0.8}/>
                      <stop offset="95%" stopColor="#48bb78" stopOpacity={0.1}/>
                    </linearGradient>
                    <linearGradient id="colorOutgoing" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#ed8936" stopOpacity={0.8}/>
                      <stop offset="95%" stopColor="#ed8936" stopOpacity={0.1}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis
                    dataKey="monthLabel"
                    stroke="#718096"
                    style={{ fontSize: '0.75rem' }}
                  />
                  <YAxis
                    stroke="#718096"
                    style={{ fontSize: '0.75rem' }}
                    tickFormatter={(value) => `$${(value / 1000).toFixed(0)}k`}
                  />
                  <Tooltip
                    formatter={(value: any, name: any) => {
                      if (typeof value === 'number') {
                        return [`$${value.toLocaleString()}`, name];
                      }
                      return [value, name];
                    }}
                    contentStyle={{
                      backgroundColor: 'white',
                      border: '1px solid #e2e8f0',
                      borderRadius: '8px',
                      padding: '0.75rem'
                    }}
                  />
                  <Legend
                    wrapperStyle={{ paddingTop: '1rem' }}
                    iconType="square"
                  />
                  <Area
                    type="monotone"
                    dataKey="incoming"
                    stroke="#48bb78"
                    strokeWidth={2}
                    fillOpacity={1}
                    fill="url(#colorIncoming)"
                    name="Incoming Cash"
                  />
                  <Area
                    type="monotone"
                    dataKey="outgoing"
                    stroke="#ed8936"
                    strokeWidth={2}
                    fillOpacity={1}
                    fill="url(#colorOutgoing)"
                    name="Outgoing Cash"
                  />
                  <Scatter
                    data={oneTimeScatterData.filter(d => d.isIncome)}
                    fill="#22c55e"
                    name="One-Time Income"
                    shape="circle"
                  />
                  <Scatter
                    data={oneTimeScatterData.filter(d => !d.isIncome)}
                    fill="#ef4444"
                    name="One-Time Expense"
                    shape="circle"
                  />
                </ComposedChart>
              </ResponsiveContainer>
            </div>
          )}
        </>
      )}

      {/* AI automatically detects deposit frequency from statements - no manual input needed */}

      {/* Transactions Section */}
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

        {/* Transaction Sub-Tabs - Reordered to match display */}
        <div className="transaction-sub-tabs">
          <button
            className={`sub-tab ${transactionSubTab === 'income' ? 'active' : ''}`}
            onClick={() => setTransactionSubTab('income')}
          >
            Income
            <span className="sub-tab-badge">{formatCurrency(getCategoryTotal('income'))}</span>
          </button>
          <button
            className={`sub-tab ${transactionSubTab === 'expense' ? 'active' : ''}`}
            onClick={() => setTransactionSubTab('expense')}
          >
            Expenses
            <span className="sub-tab-badge">{formatCurrency(getCategoryTotal('expense') + getCategoryTotal('recurring'))}</span>
          </button>
          <button
            className={`sub-tab ${transactionSubTab === 'housing' ? 'active' : ''}`}
            onClick={() => setTransactionSubTab('housing')}
            >
              Housing
              <span className="sub-tab-badge">{formatCurrency(getCategoryTotal('housing'))}</span>
            </button>
            <button
              className={`sub-tab ${transactionSubTab === 'one-time' ? 'active' : ''}`}
              onClick={() => setTransactionSubTab('one-time')}
            >
              One-Time
              <span className="sub-tab-badge">{formatCurrency(getCategoryTotal('one-time'))}</span>
            </button>
            <button
              className={`sub-tab ${transactionSubTab === 'all' ? 'active' : ''}`}
              onClick={() => setTransactionSubTab('all')}
            >
              All Categories
            </button>
          </div>

          {/* Scrollable Transaction Container */}
          {true && (
          <div style={{ maxHeight: '600px', overflowY: 'auto', border: '1px solid #e2e8f0', borderRadius: '8px', marginTop: '1rem' }}>
          {Object.entries(getFilteredTransactions()).map(([category, categoryTransactions]) => {
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
                  {categoryTransactions.map((transaction, idx) => {
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
                            className={`transaction-amount editable ${
                              transaction.category === 'one-time'
                                ? (transaction.amount > 0 ? 'positive' : 'negative')
                                : (transaction.category === 'income' ? 'positive' : 'negative')
                            }`}
                            onClick={() => setEditingTransaction(actualIndex)}
                            title="Click to edit amount"
                            style={
                              transaction.category === 'one-time'
                                ? { color: transaction.amount > 0 ? '#22c55e' : '#ef4444', fontWeight: '600' }
                                : undefined
                            }
                          >
                            {(transaction.category === 'income' || transaction.amount > 0) ? '+' : '-'}
                            {formatCurrency(Math.abs(transaction.amount))}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
          </div>
          )}{/* End scrollable container */}
        </div>{/* End transactions-view */}

      {/* Cash Flow Threshold Warning */}
      {displayNetCashFlow <= 300 && (
        <div style={{
          padding: '1.5rem',
          background: '#fef2f2',
          border: '2px solid #ef4444',
          borderRadius: '12px',
          marginBottom: '1.5rem',
          display: 'flex',
          alignItems: 'center',
          gap: '1rem'
        }}>
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" style={{ width: '32px', height: '32px', color: '#ef4444', flexShrink: 0 }}>
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
          <div>
            <strong style={{ color: '#991b1b', display: 'block', marginBottom: '0.5rem', fontSize: '1.1rem' }}>
              Insufficient Cash Flow for AIO Loan
            </strong>
            <p style={{ color: '#7f1d1d', margin: 0, fontSize: '0.95rem', lineHeight: '1.5' }}>
              Your net cash flow of {formatCurrency(displayNetCashFlow)}/month is below the minimum threshold of $300/month required for an All-In-One loan.
              Please review your transactions and exclude any irregular items, or consider improving your cash flow before proceeding.
            </p>
          </div>
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
        <button
          type="button"
          className="btn-primary"
          onClick={onContinue}
          disabled={displayNetCashFlow <= 300}
          style={{
            opacity: displayNetCashFlow <= 300 ? 0.5 : 1,
            cursor: displayNetCashFlow <= 300 ? 'not-allowed' : 'pointer'
          }}
          title={displayNetCashFlow <= 300 ? 'Cash flow must exceed $300/month to continue' : ''}
        >
          Continue to Simulation
          <svg className="btn-icon" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </button>
      </div>
    </div>
  );
}
