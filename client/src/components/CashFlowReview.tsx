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
  // Main tab for Chart vs Transactions (default to transactions)
  const [mainTab, setMainTab] = useState<'transactions' | 'chart'>('transactions');
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
      monthlyDeposits: totalIncome,
      monthlyExpenses: totalExpenses,
      monthlyLeftover: netCashFlow,
      depositFrequency
    };

    console.log('[CashFlowReview] Cash flow recalculated:', {
      totalIncome: totalIncome.toFixed(2),
      totalExpenses: totalExpenses.toFixed(2),
      netCashFlow: netCashFlow.toFixed(2),
      depositFrequency,
      includedTransactionCount: includedTransactions.length,
      excludedTransactionCount: transactions.length - includedTransactions.length
    });
    onCashFlowUpdate?.(updatedCashFlow);
  }, [transactions, depositFrequency]);

  const toggleTransactionExclusion = (index: number) => {
    const updatedTransactions = [...transactions];
    const transaction = updatedTransactions[index];
    const wasExcluded = transaction.excluded;
    updatedTransactions[index] = {
      ...transaction,
      excluded: !wasExcluded
    };
    console.log(`[CashFlowReview] Transaction toggled: ${transaction.description} ($${Math.abs(transaction.amount)}) - ${wasExcluded ? 'INCLUDED' : 'EXCLUDED'}`);
    setTransactions(updatedTransactions);
  };

  const updateTransactionAmount = (index: number, newAmount: number) => {
    const updatedTransactions = [...transactions];
    const oldAmount = updatedTransactions[index].amount;
    updatedTransactions[index] = {
      ...updatedTransactions[index],
      amount: newAmount
    };
    console.log(`[CashFlowReview] Transaction amount updated: ${updatedTransactions[index].description} - $${Math.abs(oldAmount)} → $${Math.abs(newAmount)}`);
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

  // Prepare unified chart data - group by MONTH and calculate incoming/outgoing
  const { chartData, oneTimeIncomeData, oneTimeExpenseData } = useMemo(() => {
    // First, find min and max dates from ALL transactions
    if (transactions.length === 0) {
      return { chartData: [], oneTimeIncomeData: [], oneTimeExpenseData: [] };
    }

    // Group transactions by MONTH (not day) to create smooth area charts
    const monthlyData: {
      [key: string]: {
        incoming: number;
        outgoing: number;
        oneTimeIncome: Array<{ amount: number; description: string; excluded: boolean; date: string }>;
        oneTimeExpense: Array<{ amount: number; description: string; excluded: boolean; date: string }>;
      }
    } = {};

    // Process regular transactions (income, expense, recurring) for area charts
    transactions
      .filter(t => t.category !== 'housing' && t.category !== 'one-time')
      .forEach(transaction => {
        const date = new Date(transaction.date);
        const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;

        if (!monthlyData[monthKey]) {
          monthlyData[monthKey] = { incoming: 0, outgoing: 0, oneTimeIncome: [], oneTimeExpense: [] };
        }

        if (transaction.category === 'income' || transaction.amount > 0) {
          monthlyData[monthKey].incoming += Math.abs(transaction.amount);
        } else {
          monthlyData[monthKey].outgoing += Math.abs(transaction.amount);
        }
      });

    // Process one-time transactions for scatter plots
    transactions
      .filter(t => t.category === 'one-time')
      .forEach(transaction => {
        const date = new Date(transaction.date);
        const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
        const amount = Math.abs(transaction.amount);
        const isIncome = transaction.amount > 0;

        if (!monthlyData[monthKey]) {
          monthlyData[monthKey] = { incoming: 0, outgoing: 0, oneTimeIncome: [], oneTimeExpense: [] };
        }

        const dataPoint = {
          amount,
          description: transaction.description,
          excluded: transaction.excluded || false,
          date: transaction.date
        };

        if (isIncome) {
          monthlyData[monthKey].oneTimeIncome.push(dataPoint);
        } else {
          monthlyData[monthKey].oneTimeExpense.push(dataPoint);
        }
      });

    // Convert to array and sort by month
    const chartArray = Object.entries(monthlyData)
      .map(([month, data]) => {
        const [year, monthNum] = month.split('-');
        const date = new Date(parseInt(year), parseInt(monthNum) - 1, 1);
        return {
          month,
          monthLabel: date.toLocaleDateString('en-US', { month: 'short', year: '2-digit' }),
          incoming: Math.round(data.incoming),
          outgoing: Math.round(data.outgoing),
          oneTimeIncome: data.oneTimeIncome,
          oneTimeExpense: data.oneTimeExpense
        };
      })
      .sort((a, b) => a.month.localeCompare(b.month));

    // Flatten one-time data for scatter plots while maintaining monthLabel reference
    const incomeScatter: any[] = [];
    const expenseScatter: any[] = [];

    chartArray.forEach(monthData => {
      monthData.oneTimeIncome.forEach(item => {
        incomeScatter.push({
          monthLabel: monthData.monthLabel,
          month: monthData.month,
          amount: item.amount,
          description: item.description,
          excluded: item.excluded,
          date: item.date
        });
      });
      monthData.oneTimeExpense.forEach(item => {
        expenseScatter.push({
          monthLabel: monthData.monthLabel,
          month: monthData.month,
          amount: item.amount,
          description: item.description,
          excluded: item.excluded,
          date: item.date
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

  // Calculate category totals - returns both included and excluded amounts
  const getCategoryTotals = (category: string) => {
    const categoryTransactions = groupedTransactions[category] || [];
    const includedOnly = categoryTransactions.filter(t => !t.excluded);
    const excludedOnly = categoryTransactions.filter(t => t.excluded);

    const includedMonths = calculateActualMonths(includedOnly.length > 0 ? includedOnly : categoryTransactions);
    const excludedMonths = calculateActualMonths(excludedOnly.length > 0 ? excludedOnly : categoryTransactions);

    const includedTotal = includedOnly.reduce((sum, t) => sum + Math.abs(t.amount), 0) / includedMonths;
    const excludedTotal = excludedOnly.reduce((sum, t) => sum + Math.abs(t.amount), 0) / (excludedOnly.length > 0 ? excludedMonths : 1);

    return { included: includedTotal, excluded: excludedTotal };
  };

  return (
    <div className="cash-flow-review">
      {!hideSummary && (
        <>
          {/* Sticky Header Section */}
          <div style={{
            position: 'sticky',
            top: 0,
            backgroundColor: 'white',
            zIndex: 10,
            paddingTop: '1rem',
            paddingBottom: '1rem',
            borderBottom: '2px solid #e2e8f0',
            marginBottom: '1.5rem',
            marginTop: '-1rem'
          }}>
            {/* Header */}
            <div className="form-header" style={{ margin: 0, marginBottom: '1.5rem' }}>
              <h2>Cash Flow Analysis Complete</h2>
              <p>Review the AI-generated analysis of your bank statements</p>
            </div>

          {/* Four Column Layout: Compact Summary Cards */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(4, 1fr)',
            gap: '1rem',
            marginBottom: '1.5rem'
          }}>
            {/* Card 1: Analysis Confidence */}
            <div style={{
              background: 'white',
              border: '1px solid #e2e8f0',
              borderRadius: '12px',
              padding: '1.5rem',
              boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
              display: 'flex',
              flexDirection: 'column',
              gap: '1rem'
            }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: '1rem' }}>
                <div style={{
                  width: '48px',
                  height: '48px',
                  borderRadius: '50%',
                  background: confidenceColor,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0
                }}>
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="white" style={{ width: '24px', height: '24px' }}>
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: '0.875rem', fontWeight: '600', color: '#1a202c', marginBottom: '0.25rem' }}>
                    Analysis Confidence: {confidenceLabel}
                  </div>
                  <div style={{ fontSize: '0.75rem', color: '#94a3b8' }}>
                    AI score: {(cashFlow.confidence * 100).toFixed(0)}%
                  </div>
                </div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', paddingTop: '1rem', borderTop: '1px solid #f1f5f9' }}>
                <span style={{ fontSize: '1.75rem' }}>{temperatureRating.icon}</span>
                <div>
                  <div style={{ fontSize: '1rem', fontWeight: '700', color: temperatureRating.color }}>
                    {temperatureRating.rating}
                  </div>
                  <div style={{ fontSize: '0.75rem', color: '#94a3b8' }}>
                    AIO Loan Suitability
                  </div>
                </div>
              </div>
            </div>

            {/* Card 2: Monthly Income */}
            <div style={{
              background: 'white',
              border: '1px solid #e2e8f0',
              borderRadius: '12px',
              padding: '1.5rem',
              boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
              display: 'flex',
              flexDirection: 'column'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1rem' }}>
                <div style={{
                  width: '48px',
                  height: '48px',
                  borderRadius: '50%',
                  background: '#d1fae5',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0
                }}>
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="#059669" style={{ width: '24px', height: '24px' }}>
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <div>
                  <div style={{ fontSize: '0.75rem', fontWeight: '600', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                    TOTAL MONTHLY
                  </div>
                  <div style={{ fontSize: '0.75rem', fontWeight: '600', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                    INCOME
                  </div>
                </div>
              </div>
              <div style={{ fontSize: '2rem', fontWeight: '700', color: '#059669', marginBottom: '0.5rem' }}>
                {formatCurrency(displayTotalIncome)}
              </div>
              <div style={{ fontSize: '0.75rem', color: '#94a3b8' }}>
                Average across {actualMonths} month{actualMonths !== 1 ? 's' : ''}
              </div>
            </div>

            {/* Card 3: Monthly Expenses */}
            <div style={{
              background: 'white',
              border: '1px solid #e2e8f0',
              borderRadius: '12px',
              padding: '1.5rem',
              boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
              display: 'flex',
              flexDirection: 'column'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1rem' }}>
                <div style={{
                  width: '48px',
                  height: '48px',
                  borderRadius: '50%',
                  background: '#fed7aa',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0
                }}>
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="#ea580c" style={{ width: '24px', height: '24px' }}>
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
                  </svg>
                </div>
                <div>
                  <div style={{ fontSize: '0.75rem', fontWeight: '600', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                    TOTAL MONTHLY
                  </div>
                  <div style={{ fontSize: '0.75rem', fontWeight: '600', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                    EXPENSES
                  </div>
                </div>
              </div>
              <div style={{ fontSize: '2rem', fontWeight: '700', color: '#1a202c', marginBottom: '0.5rem' }}>
                {formatCurrency(displayTotalExpenses)}
              </div>
              <div style={{ fontSize: '0.75rem', color: '#94a3b8' }}>
                Recurring expenses only
              </div>
            </div>

            {/* Card 4: Net Cash Flow */}
            <div style={{
              background: 'white',
              border: '1px solid #e2e8f0',
              borderRadius: '12px',
              padding: '1.5rem',
              boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
              display: 'flex',
              flexDirection: 'column'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1rem' }}>
                <div style={{
                  width: '48px',
                  height: '48px',
                  borderRadius: '50%',
                  background: displayNetCashFlow >= 0 ? '#dbeafe' : '#fee2e2',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0
                }}>
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke={displayNetCashFlow >= 0 ? '#3b82f6' : '#ef4444'} style={{ width: '24px', height: '24px' }}>
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                  </svg>
                </div>
                <div>
                  <div style={{ fontSize: '0.75rem', fontWeight: '600', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                    NET CASH FLOW
                  </div>
                </div>
              </div>
              <div style={{ fontSize: '2rem', fontWeight: '700', color: displayNetCashFlow >= 0 ? '#059669' : '#ef4444', marginBottom: '0.5rem' }}>
                {formatCurrency(displayNetCashFlow)}
              </div>
              <div style={{ fontSize: '0.75rem', color: '#94a3b8' }}>
                {displayNetCashFlow >= 0 ? 'Available for loan offset' : 'Not suitable for AIO'}
              </div>
            </div>
          </div>

          {/* Main Tabs: Chart vs Transactions */}
          <div className="tabs" style={{ marginTop: '1rem' }}>
            <button
              className={`tab ${mainTab === 'transactions' ? 'active' : ''}`}
              onClick={() => setMainTab('transactions')}
            >
              Transactions
            </button>
            <button
              className={`tab ${mainTab === 'chart' ? 'active' : ''}`}
              onClick={() => setMainTab('chart')}
            >
              Cash Flow Chart
            </button>
          </div>

          {/* Transaction Filter Buttons - Only show when on Transactions tab */}
          {mainTab === 'transactions' && (
            <div className="transaction-sub-tabs" style={{ marginTop: '1rem', marginBottom: 0 }}>
              <button
                className={`sub-tab ${transactionSubTab === 'income' ? 'active' : ''}`}
                onClick={() => setTransactionSubTab('income')}
              >
                Income
                <span className="sub-tab-badge">
                  {(() => {
                    const totals = getCategoryTotals('income');
                    return totals.excluded > 0
                      ? `$${formatCurrency(totals.included)} ($${formatCurrency(totals.excluded)} excluded)`
                      : formatCurrency(totals.included);
                  })()}
                </span>
              </button>
              <button
                className={`sub-tab ${transactionSubTab === 'expense' ? 'active' : ''}`}
                onClick={() => setTransactionSubTab('expense')}
              >
                Expenses
                <span className="sub-tab-badge">
                  {(() => {
                    const expenseTotals = getCategoryTotals('expense');
                    const recurringTotals = getCategoryTotals('recurring');
                    const includedTotal = expenseTotals.included + recurringTotals.included;
                    const excludedTotal = expenseTotals.excluded + recurringTotals.excluded;
                    return excludedTotal > 0
                      ? `${formatCurrency(includedTotal)} (${formatCurrency(excludedTotal)} excluded)`
                      : formatCurrency(includedTotal);
                  })()}
                </span>
              </button>
              <button
                className={`sub-tab ${transactionSubTab === 'housing' ? 'active' : ''}`}
                onClick={() => setTransactionSubTab('housing')}
              >
                Housing
                <span className="sub-tab-badge">
                  {(() => {
                    const totals = getCategoryTotals('housing');
                    return totals.excluded > 0
                      ? `${formatCurrency(totals.included)} (${formatCurrency(totals.excluded)} excluded)`
                      : formatCurrency(totals.included);
                  })()}
                </span>
              </button>
              <button
                className={`sub-tab ${transactionSubTab === 'one-time' ? 'active' : ''}`}
                onClick={() => setTransactionSubTab('one-time')}
              >
                One-Time
                <span className="sub-tab-badge">
                  {(() => {
                    const totals = getCategoryTotals('one-time');
                    return totals.excluded > 0
                      ? `${formatCurrency(totals.included)} (${formatCurrency(totals.excluded)} excluded)`
                      : formatCurrency(totals.included);
                  })()}
                </span>
              </button>
              <button
                className={`sub-tab ${transactionSubTab === 'all' ? 'active' : ''}`}
                onClick={() => setTransactionSubTab('all')}
              >
                All Categories
              </button>

              {/* Add Manual Transaction Button */}
              <button
                onClick={() => setShowAddTransaction(true)}
                style={{
                  padding: '0.5rem 0.75rem',
                  background: '#10b981',
                  border: '2px solid #10b981',
                  borderRadius: '8px',
                  fontSize: '0.8rem',
                  fontWeight: '600',
                  color: 'white',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.375rem',
                  whiteSpace: 'nowrap',
                  marginLeft: 'auto',
                  flexShrink: 0
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = '#059669';
                  e.currentTarget.style.borderColor = '#059669';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = '#10b981';
                  e.currentTarget.style.borderColor = '#10b981';
                }}
              >
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" style={{ width: '16px', height: '16px' }}>
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                Add Transaction
              </button>
            </div>
          )}
          </div>
          {/* End Sticky Header Section */}

          {/* Scrollable Content: Charts and Transactions */}
          {/* Cash Flow Chart */}
          {mainTab === 'chart' && chartData.length > 0 && (
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
                    Showing {chartData.length} month{chartData.length !== 1 ? 's' : ''} of aggregated transaction data
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
                    dataKey="monthLabel"
                    stroke="#718096"
                    style={{ fontSize: '0.75rem' }}
                    type="category"
                    allowDuplicatedCategory={false}
                    interval="preserveStartEnd"
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
                            {payload[0]?.payload?.monthLabel}
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
                    name="Recurring Income"
                  />
                  <Area
                    type="monotone"
                    dataKey="outgoing"
                    stroke="#fbbf24"
                    strokeWidth={2}
                    fillOpacity={1}
                    fill="url(#colorOutgoing)"
                    name="Recurring Expenses"
                  />
                  <Scatter
                    data={oneTimeIncomeData}
                    dataKey="amount"
                    fill="#10b981"
                    name="One-Time Income"
                    shape="circle"
                    r={2}
                  />
                  <Scatter
                    data={oneTimeExpenseData}
                    dataKey="amount"
                    fill="#ef4444"
                    name="One-Time Expense"
                    shape="circle"
                    r={2}
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
      {mainTab === 'transactions' && (
      <div className="transactions-view">
        {/* Deposit Frequency Dropdown */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '1rem',
          marginBottom: '1rem',
          padding: '0.75rem 1rem',
          background: '#f7fafc',
          border: '1px solid #e2e8f0',
          borderRadius: '8px'
        }}>
          <svg style={{ width: '20px', height: '20px', color: '#9bc53d', flexShrink: 0 }} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
          <label style={{ fontSize: '0.9rem', fontWeight: '600', color: '#2d3748', whiteSpace: 'nowrap' }}>
            Deposit Frequency:
          </label>
          <select
            value={depositFrequency}
            onChange={(e) => {
              const newFreq = e.target.value as 'weekly' | 'biweekly' | 'semi-monthly' | 'monthly';
              console.log(`[CashFlowReview] Deposit frequency changed from "${depositFrequency}" to "${newFreq}"`);
              setDepositFrequency(newFreq);
            }}
            style={{
              padding: '0.5rem 2rem 0.5rem 0.75rem',
              border: '2px solid #cbd5e0',
              borderRadius: '6px',
              fontSize: '0.875rem',
              fontWeight: '600',
              color: '#2d3748',
              background: 'white',
              cursor: 'pointer',
              outline: 'none',
              transition: 'border-color 0.2s'
            }}
            onFocus={(e) => e.currentTarget.style.borderColor = '#9bc53d'}
            onBlur={(e) => e.currentTarget.style.borderColor = '#cbd5e0'}
          >
            <option value="weekly">Weekly (Every 7 days)</option>
            <option value="biweekly">Biweekly (Every 14 days)</option>
            <option value="semi-monthly">Semi-Monthly (Twice per month)</option>
            <option value="monthly">Monthly (Once per month)</option>
          </select>
          <span style={{
            fontSize: '0.8rem',
            color: '#718096',
            fontStyle: 'italic'
          }}>
            ✨ AI detected: <strong>{aiRecommendedFrequency}</strong>
          </span>
        </div>

          {/* Transaction Header - Count */}
          <div className="transactions-header" style={{ marginTop: '1rem' }}>
            <p>Showing {transactions.length} categorized transactions</p>
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
        </div>
      )}{/* End transactions-view and conditional */}

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

      {/* Sticky Bottom Actions */}
      <div className="form-actions" style={{
        position: 'sticky',
        bottom: 0,
        backgroundColor: 'white',
        padding: '1rem',
        borderTop: '2px solid #e2e8f0',
        marginTop: '2rem',
        zIndex: 10,
        boxShadow: '0 -4px 12px rgba(0, 0, 0, 0.05)'
      }}>
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
