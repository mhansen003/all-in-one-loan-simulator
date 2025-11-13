import { useState, useEffect, useMemo } from 'react';
import type { CashFlowAnalysis, Transaction, MortgageDetails } from '../types';
import { ComposedChart, Area, Scatter, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import './CashFlowReview.css';
import CashFlowSummaryCards from './CashFlowSummaryCards';
import AIExtractionModal from './AIExtractionModal';

interface CashFlowReviewProps {
  cashFlow: CashFlowAnalysis;
  mortgageDetails?: MortgageDetails; // For minimum cash flow calculation
  onContinue: () => void;
  onBack?: () => void;
  onCashFlowUpdate?: (updatedCashFlow: CashFlowAnalysis) => void;
  hideSummary?: boolean; // Hide duplicate banners and cards when embedded in tabs
}

export default function CashFlowReview({
  cashFlow,
  mortgageDetails: _mortgageDetails, // Kept for future use, currently unused
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
  const [searchFilter, setSearchFilter] = useState('');
  const [showAIModal, setShowAIModal] = useState(false);

  // Cash flow adjustment slider - initialize from cashFlow prop or default to 100%
  const [cashFlowPercentage, setCashFlowPercentage] = useState(
    cashFlow.cashFlowAdjustmentPercentage ?? 100
  );

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

  // Recalculate totals whenever transactions or cash flow percentage changes
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

    // Calculate base net cash flow
    const baseNetCashFlow = totalIncome - totalExpenses;

    // Apply percentage adjustment to net cash flow
    const adjustedNetCashFlow = baseNetCashFlow * (cashFlowPercentage / 100);

    const updatedCashFlow: CashFlowAnalysis = {
      ...cashFlow,
      transactions,
      totalIncome,
      totalExpenses,
      netCashFlow: adjustedNetCashFlow,
      monthlyDeposits: totalIncome,
      monthlyExpenses: totalExpenses,
      monthlyLeftover: adjustedNetCashFlow,
      depositFrequency,
      cashFlowAdjustmentPercentage: cashFlowPercentage
    };

    console.log('[CashFlowReview] Cash flow recalculated:', {
      totalIncome: totalIncome.toFixed(2),
      totalExpenses: totalExpenses.toFixed(2),
      baseNetCashFlow: baseNetCashFlow.toFixed(2),
      cashFlowPercentage: cashFlowPercentage + '%',
      adjustedNetCashFlow: adjustedNetCashFlow.toFixed(2),
      depositFrequency,
      includedTransactionCount: includedTransactions.length,
      excludedTransactionCount: transactions.length - includedTransactions.length
    });
    onCashFlowUpdate?.(updatedCashFlow);
  }, [transactions, depositFrequency, cashFlowPercentage]);

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
    // Reset cash flow percentage to 100% when any transaction is toggled
    setCashFlowPercentage(100);
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

  // Calculate base net cash flow and apply slider percentage
  const baseNetCashFlow = displayTotalIncome - displayTotalExpenses;
  const displayNetCashFlow = baseNetCashFlow * (cashFlowPercentage / 100);

  // Prepare unified chart data - group by MONTH and calculate incoming/outgoing
  const { chartData, oneTimeIncomeData, oneTimeExpenseData, yAxisMax } = useMemo(() => {
    // First, find min and max dates from ALL transactions
    if (transactions.length === 0) {
      return { chartData: [], oneTimeIncomeData: [], oneTimeExpenseData: [], yAxisMax: 0 };
    }

    // Find the date range
    const dates = transactions.map(t => new Date(t.date));
    const minDate = new Date(Math.min(...dates.map(d => d.getTime())));
    const maxDate = new Date(Math.max(...dates.map(d => d.getTime())));

    // Create entries for ALL months in the range (fill gaps)
    const monthlyData: {
      [key: string]: {
        incoming: number;
        outgoing: number;
        oneTimeIncome: Array<{ amount: number; description: string; excluded: boolean; date: string }>;
        oneTimeExpense: Array<{ amount: number; description: string; excluded: boolean; date: string }>;
      }
    } = {};

    // Fill all months between min and max dates
    const currentMonth = new Date(minDate.getFullYear(), minDate.getMonth(), 1);
    const endMonth = new Date(maxDate.getFullYear(), maxDate.getMonth(), 1);

    while (currentMonth <= endMonth) {
      const monthKey = `${currentMonth.getFullYear()}-${String(currentMonth.getMonth() + 1).padStart(2, '0')}`;
      monthlyData[monthKey] = { incoming: 0, outgoing: 0, oneTimeIncome: [], oneTimeExpense: [] };
      currentMonth.setMonth(currentMonth.getMonth() + 1);
    }

    // Process regular transactions (income, expense, recurring) for area charts
    transactions
      .filter(t => t.category !== 'housing' && t.category !== 'one-time')
      .forEach(transaction => {
        const date = new Date(transaction.date);
        const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;

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
        const isIncome = transaction.amount > 0;

        const dataPoint = {
          amount: Math.abs(transaction.amount), // Display amount (always positive)
          originalAmount: transaction.amount,   // Preserve sign for verification
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
          timestamp: date.getTime(), // Add numeric timestamp for scatter positioning
          incoming: Math.round(data.incoming),
          outgoing: Math.round(data.outgoing),
          oneTimeIncome: data.oneTimeIncome,
          oneTimeExpense: data.oneTimeExpense
        };
      })
      .sort((a, b) => a.month.localeCompare(b.month));

    // Flatten one-time data for scatter plots using ACTUAL DATES (not monthly aggregation)
    // Only include scatter points that fall within their respective month's range
    const incomeScatter: any[] = [];
    const expenseScatter: any[] = [];

    chartArray.forEach(monthData => {
      monthData.oneTimeIncome.forEach(item => {
        const txDate = new Date(item.date);
        const txTimestamp = txDate.getTime();

        // Only add if within the month's range (timestamp of month start to end of month)
        const monthStart = monthData.timestamp;
        const monthEnd = new Date(monthStart);
        monthEnd.setMonth(monthEnd.getMonth() + 1);

        if (txTimestamp >= monthStart && txTimestamp < monthEnd.getTime()) {
          incomeScatter.push({
            // Use timestamp for precise positioning on numeric axis
            timestamp: txTimestamp,
            dayLabel: txDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: '2-digit' }),
            amount: item.amount,
            description: item.description,
            excluded: item.excluded,
            date: item.date
          });
        }
      });
      monthData.oneTimeExpense.forEach(item => {
        const txDate = new Date(item.date);
        const txTimestamp = txDate.getTime();

        // Only add if within the month's range
        const monthStart = monthData.timestamp;
        const monthEnd = new Date(monthStart);
        monthEnd.setMonth(monthEnd.getMonth() + 1);

        if (txTimestamp >= monthStart && txTimestamp < monthEnd.getTime()) {
          expenseScatter.push({
            // Use timestamp for precise positioning on numeric axis
            timestamp: txTimestamp,
            dayLabel: txDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: '2-digit' }),
            amount: item.amount,
            description: item.description,
            excluded: item.excluded,
            date: item.date
          });
        }
      });
    });

    // Final filter: Only include scatter points within the actual data range
    // This prevents dots from appearing beyond the last transaction date
    const maxTimestamp = maxDate.getTime();
    const minTimestamp = minDate.getTime();

    const filteredIncomeScatter = incomeScatter.filter(
      point => point.timestamp >= minTimestamp && point.timestamp <= maxTimestamp
    );
    const filteredExpenseScatter = expenseScatter.filter(
      point => point.timestamp >= minTimestamp && point.timestamp <= maxTimestamp
    );

    // Calculate max Y value to ensure all data points (including scatter) fit
    const maxAreaValue = Math.max(
      ...chartArray.map(d => Math.max(d.incoming, d.outgoing)),
      0
    );
    const maxScatterValue = Math.max(
      ...filteredIncomeScatter.map(d => d.amount),
      ...filteredExpenseScatter.map(d => Math.abs(d.amount)),
      0
    );
    const maxYValue = Math.max(maxAreaValue, maxScatterValue);
    // Add 20% padding to ensure points don't touch the top
    const yAxisMax = Math.ceil(maxYValue * 1.2);

    // Debug logging for scatter data
    console.log('Chart data prepared:', {
      months: chartArray.length,
      oneTimeIncome: filteredIncomeScatter.length,
      oneTimeExpense: filteredExpenseScatter.length,
      incomePoints: filteredIncomeScatter.slice(0, 3),
      expensePoints: filteredExpenseScatter.slice(0, 3)
    });

    return {
      chartData: chartArray,
      oneTimeIncomeData: filteredIncomeScatter,
      oneTimeExpenseData: filteredExpenseScatter,
      yAxisMax
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
  // NOTE: Warning banners removed from this page - they now only appear on Simulation Results
  // after actual simulation runs, to avoid false positives

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
    // First get base transactions by category
    let grouped: Record<string, Transaction[]>;
    if (transactionSubTab === 'all') {
      grouped = sortedGroupedTransactions;
    } else {
      const filtered = transactions.filter(t => {
        if (transactionSubTab === 'income') return t.category === 'income';
        if (transactionSubTab === 'expense') return t.category === 'expense' || t.category === 'recurring';
        if (transactionSubTab === 'housing') return t.category === 'housing';
        if (transactionSubTab === 'one-time') return t.category === 'one-time';
        return true;
      });
      grouped = { [transactionSubTab]: filtered };
    }

    // Then if searchFilter has a value, filter by search term
    if (searchFilter.trim()) {
      const searchLower = searchFilter.trim().toLowerCase();
      const filteredGrouped: Record<string, Transaction[]> = {};

      Object.entries(grouped).forEach(([category, categoryTransactions]) => {
        const matchingTransactions = categoryTransactions.filter(t => {
          // Match description (case insensitive)
          const descriptionMatch = t.description.toLowerCase().includes(searchLower);
          // Match amount (convert to string)
          const amountMatch = Math.abs(t.amount).toString().includes(searchFilter.trim());
          return descriptionMatch || amountMatch;
        });

        // Only include categories that have matching transactions
        if (matchingTransactions.length > 0) {
          filteredGrouped[category] = matchingTransactions;
        }
      });

      return filteredGrouped;
    }

    return grouped;
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
            <div className="form-header" style={{ margin: 0, marginBottom: '1.5rem', textAlign: 'left' }}>
              <h2>Cash Flow Analysis Complete</h2>
              <p>Review the AI-generated analysis of your bank statements</p>
            </div>

            {/* Top Navigation with AI Link */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '1rem',
              marginBottom: '1rem'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                {onBack && (
                  <button
                    onClick={onBack}
                    style={{
                      padding: '0.75rem 1.5rem',
                      background: 'white',
                      border: '2px solid #cbd5e0',
                      borderRadius: '8px',
                      color: '#4a5568',
                      fontSize: '0.95rem',
                      fontWeight: '600',
                      cursor: 'pointer',
                      transition: 'all 0.2s',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.5rem'
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.borderColor = '#9bc53d';
                      e.currentTarget.style.color = '#9bc53d';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.borderColor = '#cbd5e0';
                      e.currentTarget.style.color = '#4a5568';
                    }}
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" style={{ width: '20px', height: '20px' }}>
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                    </svg>
                    Back
                  </button>
                )}
                <button
                  onClick={() => setShowAIModal(true)}
                  style={{
                    padding: '0.75rem 1.5rem',
                    background: 'linear-gradient(135deg, #e0f2fe 0%, #bae6fd 100%)',
                    border: '2px solid #3b82f6',
                    borderRadius: '8px',
                    color: '#1e40af',
                    fontSize: '0.9rem',
                    fontWeight: '600',
                    cursor: 'pointer',
                    transition: 'all 0.2s',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem',
                    boxShadow: '0 2px 8px rgba(59, 130, 246, 0.2)'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.transform = 'translateY(-2px)';
                    e.currentTarget.style.boxShadow = '0 4px 12px rgba(59, 130, 246, 0.35)';
                    e.currentTarget.style.background = 'linear-gradient(135deg, #bae6fd 0%, #93c5fd 100%)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.transform = 'translateY(0)';
                    e.currentTarget.style.boxShadow = '0 2px 8px rgba(59, 130, 246, 0.2)';
                    e.currentTarget.style.background = 'linear-gradient(135deg, #e0f2fe 0%, #bae6fd 100%)';
                  }}
                >
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" style={{ width: '20px', height: '20px' }}>
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  How did AI do the data extraction?
                </button>
              </div>
              <button
                onClick={onContinue}
                disabled={displayNetCashFlow <= 300}
                style={{
                  padding: '0.75rem 2rem',
                  background: displayNetCashFlow <= 300 ? '#cbd5e0' : '#9bc53d',
                  border: 'none',
                  borderRadius: '8px',
                  color: 'white',
                  fontSize: '0.95rem',
                  fontWeight: '600',
                  cursor: displayNetCashFlow <= 300 ? 'not-allowed' : 'pointer',
                  transition: 'all 0.2s',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  opacity: displayNetCashFlow <= 300 ? 0.6 : 1
                }}
                onMouseEnter={(e) => {
                  if (displayNetCashFlow > 300) {
                    e.currentTarget.style.background = '#8ab52e';
                  }
                }}
                onMouseLeave={(e) => {
                  if (displayNetCashFlow > 300) {
                    e.currentTarget.style.background = '#9bc53d';
                  }
                }}
              >
                Continue to Simulation
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" style={{ width: '20px', height: '20px' }}>
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </button>
            </div>

          {/* Four Column Layout: Compact Summary Cards */}
          <CashFlowSummaryCards
            cashFlow={cashFlow}
            transactions={transactions}
            actualMonths={actualMonths}
            displayTotalIncome={displayTotalIncome}
            displayTotalExpenses={displayTotalExpenses}
            displayNetCashFlow={displayNetCashFlow}
            confidenceLabel={confidenceLabel}
            confidenceColor={confidenceColor}
            temperatureRating={temperatureRating}
          />

                    {/* Warning Banner Removed: Moved to Simulation Results page for accuracy */}
          {/* We show warnings only AFTER running actual simulation to avoid false positives */}

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
                    dataKey="timestamp"
                    type="number"
                    domain={['dataMin', 'dataMax']}
                    stroke="#718096"
                    style={{ fontSize: '0.75rem' }}
                    tickFormatter={(timestamp) => {
                      const date = new Date(timestamp);
                      return date.toLocaleDateString('en-US', { month: 'short', year: '2-digit' });
                    }}
                    ticks={chartData
                      .filter((_, idx) => idx % Math.max(1, Math.floor(chartData.length / 12)) === 0)
                      .map(d => d.timestamp)}
                    angle={-45}
                    textAnchor="end"
                    height={60}
                  />
                  <YAxis
                    stroke="#718096"
                    style={{ fontSize: '0.75rem' }}
                    tickFormatter={(value) => `$${(value / 1000).toFixed(0)}k`}
                    domain={[0, yAxisMax || 'auto']}
                  />
                  <Tooltip
                    cursor={{ strokeDasharray: '3 3' }}
                    position={{ x: 0, y: 0 }}
                    allowEscapeViewBox={{ x: true, y: true }}
                    content={({ active, payload, coordinate }) => {
                      if (!active || !payload || payload.length === 0) return null;

                      // Check if this is a scatter point (one-time transaction) - hovering directly on a dot
                      const scatterPoint = payload.find(p =>
                        p.dataKey === 'amount' && p.payload?.description
                      );

                      // If hovering directly over a scatter point dot, show detailed single-transaction tooltip
                      if (scatterPoint && scatterPoint.payload) {
                        const data = scatterPoint.payload;
                        const isIncome = scatterPoint.name === 'One-Time Income';

                        const tooltipX = coordinate?.x || 0;
                        const tooltipY = coordinate?.y || 0;

                        return (
                          <div
                            style={{
                              position: 'absolute',
                              left: `${tooltipX + 10}px`,
                              top: `${tooltipY - 10}px`,
                              backgroundColor: 'white',
                              border: '2px solid ' + (isIncome ? '#10b981' : '#ef4444'),
                              borderRadius: '8px',
                              padding: '0.75rem 1rem',
                              boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
                              minWidth: '320px',
                              maxWidth: '450px',
                              pointerEvents: 'none',
                              zIndex: 1000,
                              whiteSpace: 'nowrap'
                            }}
                          >
                            <div style={{
                              fontWeight: '700',
                              color: isIncome ? '#10b981' : '#ef4444',
                              marginBottom: '0.5rem',
                              fontSize: '0.9rem'
                            }}>
                              {isIncome ? '💰 One-Time Income' : '💸 One-Time Expense'}
                            </div>
                            <div style={{ fontSize: '0.875rem', color: '#4a5568', marginBottom: '0.3rem', display: 'flex', gap: '0.5rem' }}>
                              <strong>Date:</strong> <span>{data.dayLabel || new Date(data.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: '2-digit' })}</span>
                            </div>
                            <div style={{ fontSize: '0.875rem', color: '#4a5568', marginBottom: '0.3rem', display: 'flex', gap: '0.5rem', whiteSpace: 'normal', wordBreak: 'break-word' }}>
                              <strong style={{ flexShrink: 0 }}>Description:</strong> <span>{data.description}</span>
                            </div>
                            <div style={{ fontSize: '0.875rem', color: '#4a5568', display: 'flex', gap: '0.5rem' }}>
                              <strong>Amount:</strong> <span style={{ color: isIncome ? '#10b981' : '#ef4444', fontWeight: '600' }}>${Math.abs(data.amount).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
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

                      // Regular monthly tooltip - show ALL data including one-time transactions for the month
                      const monthData = payload[0]?.payload;
                      if (!monthData) return null;

                      // Calculate totals for display
                      const hasOneTimeIncome = monthData.oneTimeIncome && monthData.oneTimeIncome.length > 0;
                      const hasOneTimeExpense = monthData.oneTimeExpense && monthData.oneTimeExpense.length > 0;
                      const hasOneTimeTransactions = hasOneTimeIncome || hasOneTimeExpense;

                      return (
                        <div
                          style={{
                            backgroundColor: 'white',
                            border: '2px solid #4299e1',
                            borderRadius: '10px',
                            padding: '1rem',
                            pointerEvents: 'none',
                            boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
                            maxWidth: '450px',
                            maxHeight: '500px',
                            overflowY: 'auto'
                          }}
                        >
                          {/* Month Header */}
                          <div style={{
                            marginBottom: '0.75rem',
                            fontWeight: '700',
                            color: '#1a202c',
                            fontSize: '1rem',
                            paddingBottom: '0.5rem',
                            borderBottom: '2px solid #e2e8f0'
                          }}>
                            📅 {monthData.monthLabel}
                          </div>

                          {/* Recurring Income */}
                          {monthData.incoming > 0 && (
                            <div style={{
                              fontSize: '0.875rem',
                              color: '#4a5568',
                              marginBottom: '0.5rem',
                              display: 'flex',
                              justifyContent: 'space-between',
                              alignItems: 'center'
                            }}>
                              <div>
                                <span style={{ color: '#60a5fa', fontWeight: '600', fontSize: '1.1em' }}>●</span>{' '}
                                <strong>Recurring Income:</strong>
                              </div>
                              <span style={{ color: '#10b981', fontWeight: '600', marginLeft: '1rem' }}>
                                ${monthData.incoming.toLocaleString()}
                              </span>
                            </div>
                          )}

                          {/* Recurring Expenses */}
                          {monthData.outgoing > 0 && (
                            <div style={{
                              fontSize: '0.875rem',
                              color: '#4a5568',
                              marginBottom: hasOneTimeTransactions ? '0.75rem' : '0',
                              display: 'flex',
                              justifyContent: 'space-between',
                              alignItems: 'center'
                            }}>
                              <div>
                                <span style={{ color: '#fbbf24', fontWeight: '600', fontSize: '1.1em' }}>●</span>{' '}
                                <strong>Recurring Expenses:</strong>
                              </div>
                              <span style={{ color: '#f59e0b', fontWeight: '600', marginLeft: '1rem' }}>
                                ${monthData.outgoing.toLocaleString()}
                              </span>
                            </div>
                          )}

                          {/* One-Time Income Section */}
                          {hasOneTimeIncome && (
                            <div style={{
                              marginTop: '0.75rem',
                              paddingTop: '0.75rem',
                              borderTop: '1px solid #e2e8f0'
                            }}>
                              <div style={{
                                fontSize: '0.875rem',
                                fontWeight: '700',
                                color: '#10b981',
                                marginBottom: '0.5rem',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '0.5rem'
                              }}>
                                💰 One-Time Income ({monthData.oneTimeIncome.length})
                              </div>
                              {monthData.oneTimeIncome.map((item: any, idx: number) => {
                                // Verify categorization using original amount
                                const isActuallyIncome = !item.originalAmount || item.originalAmount > 0;
                                const displayColor = isActuallyIncome ? '#10b981' : '#ef4444';
                                const displayBorder = isActuallyIncome ? '#10b981' : '#ef4444';
                                const displaySign = isActuallyIncome ? '+' : '-';

                                return (
                                  <div
                                    key={`income-${idx}`}
                                    style={{
                                      fontSize: '0.8rem',
                                      color: '#4a5568',
                                      marginBottom: '0.4rem',
                                      marginLeft: '1.5rem',
                                      paddingLeft: '0.5rem',
                                      borderLeft: `2px solid ${displayBorder}`,
                                      opacity: item.excluded ? 0.5 : 1
                                    }}
                                  >
                                    <div style={{ display: 'flex', justifyContent: 'space-between', gap: '1rem' }}>
                                      <span style={{
                                        flex: 1,
                                        whiteSpace: 'nowrap',
                                        overflow: 'hidden',
                                        textOverflow: 'ellipsis'
                                      }}>
                                        {item.description}
                                      </span>
                                      <span style={{
                                        color: displayColor,
                                        fontWeight: '600',
                                        whiteSpace: 'nowrap'
                                      }}>
                                        {displaySign}${item.amount.toLocaleString()}
                                      </span>
                                    </div>
                                    {item.excluded && (
                                      <div style={{
                                        fontSize: '0.7rem',
                                        color: '#dc2626',
                                        fontStyle: 'italic',
                                        marginTop: '0.1rem'
                                      }}>
                                        ⚠️ Excluded
                                      </div>
                                    )}
                                  </div>
                                );
                              })}
                            </div>
                          )}

                          {/* One-Time Withdrawal/Expense Section */}
                          {hasOneTimeExpense && (
                            <div style={{
                              marginTop: '0.75rem',
                              paddingTop: '0.75rem',
                              borderTop: '1px solid #e2e8f0'
                            }}>
                              <div style={{
                                fontSize: '0.875rem',
                                fontWeight: '700',
                                color: '#ef4444',
                                marginBottom: '0.5rem',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '0.5rem'
                              }}>
                                💸 One-Time Withdrawal ({monthData.oneTimeExpense.length})
                              </div>
                              {monthData.oneTimeExpense.map((item: any, idx: number) => {
                                // Verify categorization using original amount
                                const isActuallyExpense = !item.originalAmount || item.originalAmount < 0;
                                const displayColor = isActuallyExpense ? '#ef4444' : '#10b981';
                                const displayBorder = isActuallyExpense ? '#ef4444' : '#10b981';
                                const displaySign = isActuallyExpense ? '-' : '+';

                                return (
                                  <div
                                    key={`expense-${idx}`}
                                    style={{
                                      fontSize: '0.8rem',
                                      color: '#4a5568',
                                      marginBottom: '0.4rem',
                                      marginLeft: '1.5rem',
                                      paddingLeft: '0.5rem',
                                      borderLeft: `2px solid ${displayBorder}`,
                                      opacity: item.excluded ? 0.5 : 1
                                    }}
                                  >
                                    <div style={{ display: 'flex', justifyContent: 'space-between', gap: '1rem' }}>
                                      <span style={{
                                        flex: 1,
                                        whiteSpace: 'nowrap',
                                        overflow: 'hidden',
                                        textOverflow: 'ellipsis'
                                      }}>
                                        {item.description}
                                      </span>
                                      <span style={{
                                        color: displayColor,
                                        fontWeight: '600',
                                        whiteSpace: 'nowrap'
                                      }}>
                                        {displaySign}${item.amount.toLocaleString()}
                                      </span>
                                    </div>
                                    {item.excluded && (
                                      <div style={{
                                        fontSize: '0.7rem',
                                        color: '#dc2626',
                                        fontStyle: 'italic',
                                        marginTop: '0.1rem'
                                      }}>
                                        ⚠️ Excluded
                                      </div>
                                    )}
                                  </div>
                                );
                              })}
                            </div>
                          )}

                          {/* Empty state message */}
                          {!monthData.incoming && !monthData.outgoing && !hasOneTimeTransactions && (
                            <div style={{
                              fontSize: '0.875rem',
                              color: '#718096',
                              fontStyle: 'italic',
                              textAlign: 'center',
                              padding: '0.5rem'
                            }}>
                              No transactions this month
                            </div>
                          )}
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
                    xAxisId={0}
                    stroke="#60a5fa"
                    strokeWidth={2}
                    fillOpacity={1}
                    fill="url(#colorIncoming)"
                    name="Recurring Income"
                  />
                  <Area
                    type="monotone"
                    dataKey="outgoing"
                    xAxisId={0}
                    stroke="#fbbf24"
                    strokeWidth={2}
                    fillOpacity={1}
                    fill="url(#colorOutgoing)"
                    name="Recurring Expenses"
                  />
                  <Scatter
                    data={oneTimeIncomeData}
                    xAxisId={0}
                    dataKey="amount"
                    fill="#10b981"
                    name="One-Time Income"
                    shape="circle"
                    r={6}
                    activeShape={{ r: 8, stroke: '#059669', strokeWidth: 2 }}
                    isAnimationActive={false}
                  />
                  <Scatter
                    data={oneTimeExpenseData}
                    xAxisId={0}
                    dataKey="amount"
                    fill="#ef4444"
                    name="One-Time Expense"
                    shape="circle"
                    r={6}
                    activeShape={{ r: 8, stroke: '#dc2626', strokeWidth: 2 }}
                    isAnimationActive={false}
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
      <div className="transactions-view" style={{ marginBottom: '3rem' }}>
        {/* Deposit Frequency and Add Transaction Row */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '0.75rem',
          marginBottom: '0.5rem',
          padding: '0.5rem 0.75rem',
          background: '#f7fafc',
          border: '1px solid #e2e8f0',
          borderRadius: '8px',
          justifyContent: 'space-between'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flex: 1 }}>
            <svg style={{ width: '16px', height: '16px', color: '#9bc53d', flexShrink: 0 }} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            <label style={{ fontSize: '0.75rem', fontWeight: '600', color: '#2d3748', whiteSpace: 'nowrap' }}>
              Frequency:
            </label>
            <select
              value={depositFrequency}
              onChange={(e) => {
                const newFreq = e.target.value as 'weekly' | 'biweekly' | 'semi-monthly' | 'monthly';
                console.log(`[CashFlowReview] Deposit frequency changed from "${depositFrequency}" to "${newFreq}"`);
                setDepositFrequency(newFreq);
              }}
              style={{
                padding: '0.35rem 1.5rem 0.35rem 0.5rem',
                border: '2px solid #cbd5e0',
                borderRadius: '6px',
                fontSize: '0.75rem',
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
              <option value="weekly">Weekly</option>
              <option value="biweekly">Biweekly</option>
              <option value="semi-monthly">Semi-Monthly</option>
              <option value="monthly">Monthly</option>
            </select>
            <span style={{
              fontSize: '0.65rem',
              color: '#718096',
              fontStyle: 'italic'
            }}>
              ✨ AI: <strong>{aiRecommendedFrequency}</strong>
            </span>
          </div>

          {/* Search Filter */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flex: 1, maxWidth: '300px' }}>
            <svg style={{ width: '16px', height: '16px', color: '#9bc53d', flexShrink: 0 }} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input
              type="text"
              placeholder="Search transactions..."
              value={searchFilter}
              onChange={(e) => setSearchFilter(e.target.value)}
              style={{
                flex: 1,
                padding: '0.35rem 0.5rem',
                border: '1px solid #cbd5e0',
                borderRadius: '6px',
                fontSize: '0.75rem',
                outline: 'none',
                transition: 'border-color 0.2s'
              }}
              onFocus={(e) => e.currentTarget.style.borderColor = '#9bc53d'}
              onBlur={(e) => e.currentTarget.style.borderColor = '#cbd5e0'}
            />
            {searchFilter && (
              <button
                onClick={() => setSearchFilter('')}
                style={{
                  padding: '0.25rem',
                  background: 'transparent',
                  border: 'none',
                  cursor: 'pointer',
                  color: '#718096',
                  display: 'flex',
                  alignItems: 'center'
                }}
                title="Clear search"
              >
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" style={{ width: '16px', height: '16px' }}>
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            )}
          </div>

          {/* Cash Flow Adjustment Slider */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.75rem',
            padding: '0.5rem 1rem',
            background: 'white',
            border: '2px solid #3b82f6',
            borderRadius: '8px',
            minWidth: '300px',
            position: 'relative'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
              <label style={{
                fontSize: '0.7rem',
                fontWeight: '600',
                color: '#3b82f6',
                whiteSpace: 'nowrap',
                textTransform: 'uppercase',
                letterSpacing: '0.5px'
              }}>
                💼 Cash Flow
              </label>
              <div
                style={{
                  width: '16px',
                  height: '16px',
                  borderRadius: '50%',
                  border: '1.5px solid #3b82f6',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '10px',
                  fontWeight: '700',
                  color: '#3b82f6',
                  cursor: 'help',
                  flexShrink: 0
                }}
                title="Adjust what percentage of the calculated net cash flow to use in the AIO loan simulation. Use this to be conservative or account for seasonal variations. Resets to 100% when you toggle transactions."
              >
                i
              </div>
            </div>
            <input
              type="range"
              min="0"
              max="100"
              value={cashFlowPercentage}
              onChange={(e) => setCashFlowPercentage(Number(e.target.value))}
              style={{
                flex: 1,
                height: '6px',
                borderRadius: '3px',
                background: `linear-gradient(to right, #3b82f6 0%, #3b82f6 ${cashFlowPercentage}%, #e2e8f0 ${cashFlowPercentage}%, #e2e8f0 100%)`,
                outline: 'none',
                cursor: 'pointer',
                WebkitAppearance: 'none',
              }}
              title={`Using ${cashFlowPercentage}% of net cash flow`}
            />
            <span style={{
              fontSize: '0.8rem',
              fontWeight: '700',
              color: '#1e40af',
              minWidth: '45px',
              textAlign: 'right'
            }}>
              {cashFlowPercentage}%
            </span>
          </div>

          {/* Add Transaction Button */}
          <button
            onClick={() => setShowAddTransaction(true)}
            style={{
              padding: '0.35rem 0.6rem',
              background: '#10b981',
              border: '2px solid #10b981',
              borderRadius: '8px',
              fontSize: '0.75rem',
              fontWeight: '600',
              color: 'white',
              cursor: 'pointer',
              transition: 'all 0.2s ease',
              display: 'flex',
              alignItems: 'center',
              gap: '0.375rem',
              whiteSpace: 'nowrap',
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

          {/* Scrollable Transaction Container */}
          {true && (
          <div style={{ maxHeight: '600px', overflowY: 'auto', border: '1px solid #e2e8f0', borderRadius: '8px', marginTop: '0.5rem', paddingBottom: '2rem' }}>
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

      {/* AI Extraction Modal */}
      {showAIModal && (
        <AIExtractionModal onClose={() => setShowAIModal(false)} />
      )}
    </div>
  );
}
