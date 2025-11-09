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
  const [transactionSubTab, setTransactionSubTab] = useState<'all' | 'income' | 'expense' | 'housing' | 'one-time'>('income'); // Default to income
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
  const aiRecommendedFrequency = (cashFlow.depositFrequency as 'weekly' | 'biweekly' | 'semi-monthly' | 'monthly') || 'monthly';
  const [chartCollapsed, setChartCollapsed] = useState(false);

  // Manual transaction entry states
  const [showAddTransaction, setShowAddTransaction] = useState(false);
  const [newTransaction, setNewTransaction] = useState({
    date: new Date().toISOString().split('T')[0],
    description: '',
    amount: '',
    category: 'expense' as Transaction['category']
  });

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

    // Calculate income: regular income + positive one-time amounts
    const totalIncome = includedTransactions
      .filter(t => t.category === 'income' || (t.category === 'one-time' && t.amount > 0))
      .reduce((sum, t) => sum + Math.abs(t.amount), 0) / actualMonths;

    // Calculate expenses: all negative amounts (expenses, housing, negative one-time)
    const totalExpenses = includedTransactions
      .filter(t => t.category !== 'income' && (t.category !== 'one-time' || t.amount < 0))
      .reduce((sum, t) => sum + Math.abs(t.amount), 0) / actualMonths;

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

  const handleAddTransaction = () => {
    if (!newTransaction.description || !newTransaction.amount) {
      alert('Please fill in all fields');
      return;
    }

    const amount = parseFloat(newTransaction.amount);
    if (isNaN(amount)) {
      alert('Please enter a valid amount');
      return;
    }

    const transaction: Transaction = {
      date: newTransaction.date,
      description: newTransaction.description,
      amount: newTransaction.category === 'income' ? Math.abs(amount) : -Math.abs(amount),
      category: newTransaction.category,
      excluded: false
    };

    setTransactions([...transactions, transaction]);
    setShowAddTransaction(false);
    setNewTransaction({
      date: new Date().toISOString().split('T')[0],
      description: '',
      amount: '',
      category: 'expense'
    });
  };

  // Recalculate totals for display
  const includedTransactions = transactions.filter(t => !t.excluded);
  const actualMonths = calculateActualMonths(includedTransactions);

  // Calculate income: regular income + positive one-time amounts
  const displayTotalIncome = includedTransactions
    .filter(t => t.category === 'income' || (t.category === 'one-time' && t.amount > 0))
    .reduce((sum, t) => sum + Math.abs(t.amount), 0) / actualMonths;

  // Calculate expenses: all negative amounts (expenses, housing, negative one-time)
  const displayTotalExpenses = includedTransactions
    .filter(t => t.category !== 'income' && (t.category !== 'one-time' || t.amount < 0))
    .reduce((sum, t) => sum + Math.abs(t.amount), 0) / actualMonths;

  const displayNetCashFlow = displayTotalIncome - displayTotalExpenses;

  // Prepare unified chart data - group by DAY and calculate incoming/outgoing
  const { chartData, oneTimeIncomeData, oneTimeExpenseData } = useMemo(() => {
    const dailyData: {
      [key: string]: {
        incoming: number;
        outgoing: number;
        oneTimeIncome: Array<{ amount: number; description: string; excluded: boolean }>;
        oneTimeExpense: Array<{ amount: number; description: string; excluded: boolean }>;
      }
    } = {};

    // First, create day entries from ALL transactions to establish the x-axis range
    transactions.forEach(transaction => {
      const date = new Date(transaction.date);
      const dayKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;

      if (!dailyData[dayKey]) {
        dailyData[dayKey] = { incoming: 0, outgoing: 0, oneTimeIncome: [], oneTimeExpense: [] };
      }
    });

    // Process regular transactions (income, expense, recurring) for area charts
    transactions
      .filter(t => t.category !== 'housing' && t.category !== 'one-time')
      .forEach(transaction => {
        const date = new Date(transaction.date);
        const dayKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;

        if (transaction.category === 'income' || transaction.amount > 0) {
          dailyData[dayKey].incoming += Math.abs(transaction.amount);
        } else {
          dailyData[dayKey].outgoing += Math.abs(transaction.amount);
        }
      });

    // Process one-time transactions for scatter plots
    transactions
      .filter(t => t.category === 'one-time')
      .forEach(transaction => {
        const date = new Date(transaction.date);
        const dayKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
        const amount = Math.abs(transaction.amount);
        const isIncome = transaction.amount > 0;

        const dataPoint = {
          amount,
          description: transaction.description,
          excluded: transaction.excluded || false
        };

        if (isIncome) {
          dailyData[dayKey].oneTimeIncome.push(dataPoint);
        } else {
          dailyData[dayKey].oneTimeExpense.push(dataPoint);
        }
      });

    // Convert to array and sort by date
    const chartArray = Object.entries(dailyData)
      .map(([day, data]) => ({
        day,
        dayLabel: new Date(day).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
        incoming: Math.round(data.incoming),
        outgoing: Math.round(data.outgoing),
        oneTimeIncome: data.oneTimeIncome,
        oneTimeExpense: data.oneTimeExpense
      }))
      .sort((a, b) => a.day.localeCompare(b.day));

    // Flatten one-time data for scatter plots while maintaining dayLabel reference
    const incomeScatter: any[] = [];
    const expenseScatter: any[] = [];

    chartArray.forEach(dayData => {
      dayData.oneTimeIncome.forEach(item => {
        incomeScatter.push({
          dayLabel: dayData.dayLabel,
          day: dayData.day,
          amount: item.amount,
          description: item.description,
          excluded: item.excluded
        });
      });
      dayData.oneTimeExpense.forEach(item => {
        expenseScatter.push({
          dayLabel: dayData.dayLabel,
          day: dayData.day,
          amount: item.amount,
          description: item.description,
          excluded: item.excluded
        });
      });
    });

    return {
      chartData: chartArray,
      oneTimeIncomeData: incomeScatter,
      oneTimeExpenseData: expenseScatter
    };
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
          {/* Header with Continue Button */}
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'flex-start',
            marginBottom: '1.5rem',
            gap: '1rem'
          }}>
            <div className="form-header" style={{ margin: 0, flex: 1 }}>
              <h2 style={{ margin: '0 0 0.5rem 0' }}>Cash Flow Analysis Complete</h2>
              <p style={{ margin: 0 }}>Review the AI-generated analysis of your bank statements</p>
            </div>

            <button
              type="button"
              className="btn-primary"
              onClick={onContinue}
              disabled={displayNetCashFlow <= 300}
              style={{
                opacity: displayNetCashFlow <= 300 ? 0.5 : 1,
                cursor: displayNetCashFlow <= 300 ? 'not-allowed' : 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                padding: '0.75rem 1.5rem',
                fontSize: '1rem',
                fontWeight: '600',
                whiteSpace: 'nowrap',
                flexShrink: 0
              }}
              title={displayNetCashFlow <= 300 ? 'Cash flow must exceed $300/month to continue' : ''}
            >
              Continue to Simulation
              <svg style={{ width: '20px', height: '20px' }} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </button>
          </div>

          {/* Compact Layout: All Cards Equal Width */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(4, 1fr)',
            gap: '1rem',
            marginBottom: '2rem'
          }}>
            {/* Confidence & Suitability Card */}
            <div style={{
              background: 'white',
              border: '2px solid #e2e8f0',
              borderRadius: '12px',
              padding: '1.25rem',
              boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)',
              display: 'flex',
              flexDirection: 'column'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.75rem' }}>
                <div style={{
                  width: '36px',
                  height: '36px',
                  borderRadius: '50%',
                  background: confidenceColor,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0
                }}>
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="white" style={{ width: '20px', height: '20px' }}>
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <div>
                  <div style={{ fontSize: '0.875rem', fontWeight: '600', color: '#1a202c' }}>
                    Analysis Confidence: {confidenceLabel}
                  </div>
                  <div style={{ fontSize: '0.75rem', color: '#718096' }}>
                    AI score: {(cashFlow.confidence * 100).toFixed(0)}%
                  </div>
                </div>
              </div>
              <div style={{ borderTop: '1px solid #e2e8f0', paddingTop: '0.75rem', marginTop: 'auto' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.5rem' }}>
                  <span style={{ fontSize: '1.5rem' }}>{temperatureRating.icon}</span>
                  <div>
                    <div style={{ fontSize: '0.95rem', fontWeight: '700', color: temperatureRating.color }}>
                      {temperatureRating.rating}
                    </div>
                    <div style={{ fontSize: '0.75rem', color: '#718096' }}>
                      AIO Loan Suitability
                    </div>
                  </div>
                </div>
                <div style={{ fontSize: '0.875rem', color: '#1a202c', fontWeight: '600', textAlign: 'center', padding: '0.75rem', background: '#f7fafc', borderRadius: '6px', marginTop: '0.5rem' }}>
                  {formatCurrency(displayNetCashFlow)}/month cash flow
                  <div style={{ fontSize: '0.7rem', color: '#94a3b8', marginTop: '0.25rem', fontWeight: 'normal' }}>
                    ({Math.round((displayNetCashFlow / 3000) * 100)}% of optimal)
                  </div>
                </div>
              </div>
            </div>

            {/* Income Card */}
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

            {/* Expense Card */}
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

            {/* Net Cash Flow Card */}
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
                  {displayNetCashFlow >= 0 ? 'Net Monthly Average Cash Flow' : 'Negative - Not suitable for AIO'}
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
                <p>AI detected: <strong>{aiRecommendedFrequency}</strong>. You can change this if needed.</p>
              </div>
            </div>
            <div className="frequency-options">
              <div
                className={`frequency-option ${depositFrequency === 'weekly' ? 'active' : ''}`}
                onClick={() => setDepositFrequency('weekly')}
                style={{ position: 'relative' }}
              >
                <div className="frequency-label">Weekly</div>
                <div className="frequency-description">Every 7 days</div>
                {aiRecommendedFrequency === 'weekly' && (
                  <span style={{
                    position: 'absolute',
                    top: '8px',
                    right: '8px',
                    background: '#10b981',
                    color: 'white',
                    fontSize: '0.65rem',
                    fontWeight: '600',
                    padding: '2px 8px',
                    borderRadius: '9999px',
                    boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
                  }}>
                    ✨ AI
                  </span>
                )}
              </div>
              <div
                className={`frequency-option ${depositFrequency === 'biweekly' ? 'active' : ''}`}
                onClick={() => setDepositFrequency('biweekly')}
                style={{ position: 'relative' }}
              >
                <div className="frequency-label">Biweekly</div>
                <div className="frequency-description">Every 14 days</div>
                {aiRecommendedFrequency === 'biweekly' && (
                  <span style={{
                    position: 'absolute',
                    top: '8px',
                    right: '8px',
                    background: '#10b981',
                    color: 'white',
                    fontSize: '0.65rem',
                    fontWeight: '600',
                    padding: '2px 8px',
                    borderRadius: '9999px',
                    boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
                  }}>
                    ✨ AI
                  </span>
                )}
              </div>
              <div
                className={`frequency-option ${depositFrequency === 'semi-monthly' ? 'active' : ''}`}
                onClick={() => setDepositFrequency('semi-monthly')}
                style={{ position: 'relative' }}
              >
                <div className="frequency-label">Semi-Monthly</div>
                <div className="frequency-description">Twice per month</div>
                {aiRecommendedFrequency === 'semi-monthly' && (
                  <span style={{
                    position: 'absolute',
                    top: '8px',
                    right: '8px',
                    background: '#10b981',
                    color: 'white',
                    fontSize: '0.65rem',
                    fontWeight: '600',
                    padding: '2px 8px',
                    borderRadius: '9999px',
                    boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
                  }}>
                    ✨ AI
                  </span>
                )}
              </div>
              <div
                className={`frequency-option ${depositFrequency === 'monthly' ? 'active' : ''}`}
                onClick={() => setDepositFrequency('monthly')}
                style={{ position: 'relative' }}
              >
                <div className="frequency-label">Monthly</div>
                <div className="frequency-description">Once per month</div>
                {aiRecommendedFrequency === 'monthly' && (
                  <span style={{
                    position: 'absolute',
                    top: '8px',
                    right: '8px',
                    background: '#10b981',
                    color: 'white',
                    fontSize: '0.65rem',
                    fontWeight: '600',
                    padding: '2px 8px',
                    borderRadius: '9999px',
                    boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
                  }}>
                    ✨ AI
                  </span>
                )}
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
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
                <div>
                  <h3 style={{
                    fontSize: '1.125rem',
                    fontWeight: '600',
                    color: '#1a202c',
                    margin: '0 0 0.25rem 0'
                  }}>
                    Cash Flow Over Time
                  </h3>
                  <p style={{
                    fontSize: '0.875rem',
                    color: '#718096',
                    margin: '0'
                  }}>
                    Showing {chartData.length} month{chartData.length !== 1 ? 's' : ''} of transaction data
                  </p>
                </div>
                <button
                  onClick={() => setChartCollapsed(!chartCollapsed)}
                  style={{
                    background: '#f7fafc',
                    border: '1px solid #e2e8f0',
                    borderRadius: '6px',
                    padding: '0.5rem 1rem',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem',
                    fontSize: '0.875rem',
                    color: '#4a5568',
                    transition: 'all 0.2s'
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.background = '#edf2f7'}
                  onMouseLeave={(e) => e.currentTarget.style.background = '#f7fafc'}
                >
                  {chartCollapsed ? 'Show Chart' : 'Hide Chart'}
                  <svg
                    style={{
                      width: '16px',
                      height: '16px',
                      transform: chartCollapsed ? 'rotate(0deg)' : 'rotate(180deg)',
                      transition: 'transform 0.2s'
                    }}
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>
              </div>
              {!chartCollapsed && (
                <ResponsiveContainer width="100%" height={400}>
                <ComposedChart
                  data={chartData}
                  margin={{ top: 20, right: 30, left: 10, bottom: 60 }}
                >
                  <defs>
                    <linearGradient id="colorIncoming" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#93c5fd" stopOpacity={0.6}/>
                      <stop offset="95%" stopColor="#93c5fd" stopOpacity={0.05}/>
                    </linearGradient>
                    <linearGradient id="colorOutgoing" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#fbbf24" stopOpacity={0.6}/>
                      <stop offset="95%" stopColor="#fbbf24" stopOpacity={0.05}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis
                    dataKey="dayLabel"
                    stroke="#718096"
                    style={{ fontSize: '0.75rem' }}
                    type="category"
                    allowDuplicatedCategory={false}
                    interval={4}
                    angle={-45}
                    textAnchor="end"
                    height={60}
                  />
                  <YAxis
                    stroke="#718096"
                    style={{ fontSize: '0.75rem' }}
                    tickFormatter={(value) => `$${(value / 1000).toFixed(0)}k`}
                    domain={[0, 'auto']}
                  />
                  <Tooltip
                    content={({ active, payload }) => {
                      if (!active || !payload || payload.length === 0) return null;

                      // Check if this is a scatter point (one-time transaction)
                      const scatterPoint = payload.find(p =>
                        p.dataKey === 'amount' && p.payload?.description
                      );

                      if (scatterPoint && scatterPoint.payload) {
                        const data = scatterPoint.payload;
                        return (
                          <div
                            style={{
                              backgroundColor: 'white',
                              border: '2px solid ' + (scatterPoint.name === 'One-Time Income' ? '#10b981' : '#ef4444'),
                              borderRadius: '8px',
                              padding: '0.75rem',
                              boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
                              maxWidth: '250px'
                            }}
                          >
                            <div style={{
                              fontWeight: '700',
                              color: scatterPoint.name === 'One-Time Income' ? '#10b981' : '#ef4444',
                              marginBottom: '0.5rem',
                              fontSize: '0.875rem'
                            }}>
                              {scatterPoint.name}
                            </div>
                            <div style={{ fontSize: '0.85rem', color: '#4a5568', marginBottom: '0.25rem' }}>
                              <strong>Description:</strong> {data.description}
                            </div>
                            <div style={{ fontSize: '0.85rem', color: '#4a5568', marginBottom: '0.25rem' }}>
                              <strong>Amount:</strong> ${Math.abs(data.amount).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </div>
                            {data.excluded && (
                              <div style={{
                                fontSize: '0.75rem',
                                color: '#dc2626',
                                marginTop: '0.5rem',
                                padding: '0.25rem 0.5rem',
                                background: '#fee2e2',
                                borderRadius: '4px',
                                fontWeight: '600'
                              }}>
                                ⚠️ Excluded from calculations
                              </div>
                            )}
                          </div>
                        );
                      }

                      // Regular tooltip for area chart
                      return (
                        <div
                          style={{
                            backgroundColor: 'white',
                            border: '1px solid #e2e8f0',
                            borderRadius: '8px',
                            padding: '0.75rem'
                          }}
                        >
                          <div style={{ marginBottom: '0.5rem', fontWeight: '600', color: '#1a202c' }}>
                            {payload[0]?.payload?.dayLabel}
                          </div>
                          {payload.map((entry: any, index: number) => (
                            <div key={index} style={{ fontSize: '0.875rem', color: '#4a5568', marginBottom: '0.25rem' }}>
                              <span style={{ color: entry.color, fontWeight: '600' }}>●</span>{' '}
                              {entry.name}: ${entry.value?.toLocaleString()}
                            </div>
                          ))}
                        </div>
                      );
                    }}
                  />
                  <Legend
                    wrapperStyle={{ paddingTop: '1rem' }}
                    iconType="square"
                  />
                  <Area
                    type="monotone"
                    dataKey="incoming"
                    stroke="#60a5fa"
                    strokeWidth={2}
                    fillOpacity={1}
                    fill="url(#colorIncoming)"
                    name="Regular Income"
                  />
                  <Area
                    type="monotone"
                    dataKey="outgoing"
                    stroke="#fbbf24"
                    strokeWidth={2}
                    fillOpacity={1}
                    fill="url(#colorOutgoing)"
                    name="Regular Expenses"
                  />
                  <Scatter
                    data={oneTimeIncomeData}
                    dataKey="amount"
                    fill="#10b981"
                    name="One-Time Income"
                    shape="circle"
                    r={3}
                  />
                  <Scatter
                    data={oneTimeExpenseData}
                    dataKey="amount"
                    fill="#ef4444"
                    name="One-Time Expense"
                    shape="circle"
                    r={3}
                  />
                </ComposedChart>
              </ResponsiveContainer>
              )}
            </div>
          )}
        </>
      )}

      {/* AI automatically detects deposit frequency from statements - no manual input needed */}

      {/* Transactions Section */}
      <div className="transactions-view">
        {/* Add Transaction Button */}
        <div style={{ marginBottom: '1rem' }}>
          <button
            onClick={() => setShowAddTransaction(true)}
            style={{
              background: '#10b981',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              padding: '0.75rem 1.5rem',
              fontSize: '0.875rem',
              fontWeight: '600',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              transition: 'all 0.2s'
            }}
            onMouseEnter={(e) => e.currentTarget.style.background = '#059669'}
            onMouseLeave={(e) => e.currentTarget.style.background = '#10b981'}
          >
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" style={{ width: '20px', height: '20px' }}>
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Add Manual Transaction
          </button>
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

          {/* Transaction Header - Count and Instructions */}
          <div className="transactions-header" style={{ marginTop: '1rem' }}>
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

      {/* Add Transaction Modal */}
      {showAddTransaction && (
        <div
          onClick={() => setShowAddTransaction(false)}
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(0, 0, 0, 0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              background: 'white',
              borderRadius: '12px',
              padding: '2rem',
              maxWidth: '500px',
              width: '90%',
              boxShadow: '0 20px 60px rgba(0, 0, 0, 0.3)'
            }}
          >
            <h2 style={{ margin: '0 0 1.5rem 0', fontSize: '1.5rem', color: '#1a202c' }}>
              Add Manual Transaction
            </h2>

            <div style={{ marginBottom: '1rem' }}>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '600', color: '#4a5568' }}>
                Date
              </label>
              <input
                type="date"
                value={newTransaction.date}
                onChange={(e) => setNewTransaction({ ...newTransaction, date: e.target.value })}
                style={{
                  width: '100%',
                  padding: '0.75rem',
                  border: '1px solid #cbd5e0',
                  borderRadius: '8px',
                  fontSize: '0.875rem'
                }}
              />
            </div>

            <div style={{ marginBottom: '1rem' }}>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '600', color: '#4a5568' }}>
                Description
              </label>
              <input
                type="text"
                value={newTransaction.description}
                onChange={(e) => setNewTransaction({ ...newTransaction, description: e.target.value })}
                placeholder="Enter transaction description"
                style={{
                  width: '100%',
                  padding: '0.75rem',
                  border: '1px solid #cbd5e0',
                  borderRadius: '8px',
                  fontSize: '0.875rem'
                }}
              />
            </div>

            <div style={{ marginBottom: '1rem' }}>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '600', color: '#4a5568' }}>
                Amount
              </label>
              <input
                type="number"
                value={newTransaction.amount}
                onChange={(e) => setNewTransaction({ ...newTransaction, amount: e.target.value })}
                placeholder="Enter amount (positive number)"
                step="0.01"
                style={{
                  width: '100%',
                  padding: '0.75rem',
                  border: '1px solid #cbd5e0',
                  borderRadius: '8px',
                  fontSize: '0.875rem'
                }}
              />
            </div>

            <div style={{ marginBottom: '1.5rem' }}>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '600', color: '#4a5568' }}>
                Category
              </label>
              <select
                value={newTransaction.category}
                onChange={(e) => setNewTransaction({ ...newTransaction, category: e.target.value as Transaction['category'] })}
                style={{
                  width: '100%',
                  padding: '0.75rem',
                  border: '1px solid #cbd5e0',
                  borderRadius: '8px',
                  fontSize: '0.875rem',
                  background: 'white'
                }}
              >
                <option value="income">Income</option>
                <option value="expense">Expense</option>
                <option value="recurring">Recurring Expense</option>
                <option value="housing">Housing</option>
                <option value="one-time">One-Time</option>
              </select>
            </div>

            <div style={{ display: 'flex', gap: '1rem', justifyContent: 'flex-end' }}>
              <button
                onClick={() => setShowAddTransaction(false)}
                style={{
                  padding: '0.75rem 1.5rem',
                  border: '1px solid #cbd5e0',
                  borderRadius: '8px',
                  background: 'white',
                  color: '#4a5568',
                  fontSize: '0.875rem',
                  fontWeight: '600',
                  cursor: 'pointer'
                }}
              >
                Cancel
              </button>
              <button
                onClick={handleAddTransaction}
                style={{
                  padding: '0.75rem 1.5rem',
                  border: 'none',
                  borderRadius: '8px',
                  background: '#10b981',
                  color: 'white',
                  fontSize: '0.875rem',
                  fontWeight: '600',
                  cursor: 'pointer'
                }}
              >
                Add Transaction
              </button>
            </div>
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
