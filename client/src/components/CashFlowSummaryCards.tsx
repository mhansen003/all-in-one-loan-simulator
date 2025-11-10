import FlipCard from './FlipCard';
import type { CashFlowAnalysis, Transaction } from '../types';

interface CashFlowSummaryCardsProps {
  cashFlow: CashFlowAnalysis;
  transactions?: Transaction[];
  actualMonths?: number;
  displayTotalIncome: number;
  displayTotalExpenses: number;
  displayNetCashFlow: number;
  confidenceLabel: string;
  confidenceColor: string;
  temperatureRating: {
    rating: string;
    color: string;
    icon: string;
  };
}

export default function CashFlowSummaryCards({
  cashFlow,
  transactions,
  actualMonths = 1,
  displayTotalIncome,
  displayTotalExpenses,
  displayNetCashFlow,
  confidenceLabel,
  confidenceColor,
  temperatureRating
}: CashFlowSummaryCardsProps) {
  const formatCurrency = (amount: number): string => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  // Get income breakdown by category
  const getIncomeBreakdown = () => {
    if (!transactions) return [];

    const incomeByCategory: Record<string, number> = {};
    transactions
      .filter(t => !t.excluded && (t.category === 'income' || (t.category === 'one-time' && t.amount > 0)))
      .forEach(t => {
        const category = t.category === 'one-time' ? 'One-Time Income' : 'Regular Income';
        incomeByCategory[category] = (incomeByCategory[category] || 0) + Math.abs(t.amount);
      });

    return Object.entries(incomeByCategory).map(([category, total]) => ({
      category,
      total,
      monthly: total / actualMonths
    }));
  };

  // Get expense breakdown by category
  const getExpenseBreakdown = () => {
    if (!transactions) return [];

    const expenseByCategory: Record<string, number> = {};
    transactions
      .filter(t => !t.excluded && t.category !== 'income' && (t.category !== 'one-time' || t.amount < 0))
      .forEach(t => {
        let categoryLabel: string = t.category;
        if (t.category === 'one-time') categoryLabel = 'One-Time Expense';
        else if (t.category === 'housing') categoryLabel = 'Housing';
        else if (t.category === 'expense') categoryLabel = 'General Expense';
        expenseByCategory[categoryLabel] = (expenseByCategory[categoryLabel] || 0) + Math.abs(t.amount);
      });

    return Object.entries(expenseByCategory).map(([category, total]) => ({
      category,
      total,
      monthly: total / actualMonths
    }));
  };

  const incomeBreakdown = getIncomeBreakdown();
  const expenseBreakdown = getExpenseBreakdown();

  return (
    <div style={{
      display: 'grid',
      gridTemplateColumns: 'repeat(4, 1fr)',
      gap: '1rem',
      marginBottom: '1.5rem'
    }}>
      {/* Card 1: Analysis Confidence */}
      <FlipCard
        frontContent={
          <div style={{
            background: 'white',
            border: '1px solid #e2e8f0',
            borderRadius: '12px',
            padding: '1.5rem',
            display: 'flex',
            flexDirection: 'column',
            gap: '1rem',
            height: '100%'
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
        }
        backContent={
          <>
            <h3>Confidence Score Breakdown</h3>
            <div className="detail-section">
              <div className="detail-label">AI Analysis Score</div>
              <div className="detail-value">{(cashFlow.confidence * 100).toFixed(0)}%</div>
              <div className="detail-description">
                Based on transaction patterns, categorization accuracy, and data completeness
              </div>
            </div>
            <div className="detail-section">
              <div className="detail-label">Confidence Level</div>
              <div className="detail-value">{confidenceLabel}</div>
              <div className="detail-description">
                {cashFlow.confidence >= 0.8 ? 'High confidence in transaction categorization' :
                 cashFlow.confidence >= 0.6 ? 'Moderate confidence - review transactions for accuracy' :
                 'Low confidence - please verify transaction categories'}
              </div>
            </div>
            <div className="detail-section">
              <div className="detail-label">AIO Suitability</div>
              <div className="detail-value">{temperatureRating.rating}</div>
              <div className="detail-description">
                {temperatureRating.rating === 'EXCELLENT' ? 'Outstanding cash flow for maximum AIO benefits' :
                 temperatureRating.rating === 'GREAT' ? 'Strong cash flow position for AIO loan' :
                 temperatureRating.rating === 'GOOD' ? 'Solid candidate with meaningful savings potential' :
                 'Review cash flow to optimize AIO benefits'}
              </div>
            </div>
          </>
        }
      />

      {/* Card 2: Monthly Income */}
      <FlipCard
        frontContent={
          <div style={{
            background: 'white',
            border: '1px solid #e2e8f0',
            borderRadius: '12px',
            padding: '1.5rem',
            display: 'flex',
            flexDirection: 'column',
            height: '100%'
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
        }
        backContent={
          <>
            <h3>Income Calculation</h3>
            <div className="detail-section">
              <div className="detail-label">How This Was Calculated</div>
              <div className="detail-description" style={{ marginBottom: '0.75rem' }}>
                Monthly income = Total income ÷ {actualMonths} month{actualMonths !== 1 ? 's' : ''}
              </div>
              <div className="detail-value" style={{ fontSize: '1.25rem' }}>
                {formatCurrency(displayTotalIncome * actualMonths)} ÷ {actualMonths} = {formatCurrency(displayTotalIncome)}
              </div>
            </div>
            {incomeBreakdown.length > 0 ? (
              <>
                <div className="detail-section">
                  <div className="detail-label">Income Sources</div>
                  <ul>
                    {incomeBreakdown.map((item, idx) => {
                      const percentage = ((item.monthly / displayTotalIncome) * 100).toFixed(1);
                      return (
                        <li key={idx}>
                          <div>
                            <div style={{ fontWeight: 600 }}>{item.category}</div>
                            <div style={{ fontSize: '0.85rem', opacity: 0.8 }}>{percentage}% of total</div>
                          </div>
                          <div>
                            <div style={{ fontWeight: 700 }}>{formatCurrency(item.monthly)}/mo</div>
                            <div style={{ fontSize: '0.85rem', opacity: 0.8 }}>{formatCurrency(item.total)} total</div>
                          </div>
                        </li>
                      );
                    })}
                    <li className="total-row">
                      <span>Average Monthly Income</span>
                      <span>{formatCurrency(displayTotalIncome)}</span>
                    </li>
                  </ul>
                </div>
                <div className="detail-section">
                  <div className="detail-label">Analysis Quality</div>
                  <div className="detail-description">
                    Based on {transactions?.filter(t => !t.excluded && (t.category === 'income' || (t.category === 'one-time' && t.amount > 0))).length || 0} income transactions over {actualMonths} month{actualMonths !== 1 ? 's' : ''}
                  </div>
                </div>
              </>
            ) : (
              <div className="detail-section">
                <div className="detail-description">
                  Total income calculated from all positive cash flows and income transactions
                </div>
              </div>
            )}
          </>
        }
      />

      {/* Card 3: Monthly Expenses */}
      <FlipCard
        frontContent={
          <div style={{
            background: 'white',
            border: '1px solid #e2e8f0',
            borderRadius: '12px',
            padding: '1.5rem',
            display: 'flex',
            flexDirection: 'column',
            height: '100%'
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
        }
        backContent={
          <>
            <h3>Expense Calculation</h3>
            <div className="detail-section">
              <div className="detail-label">How This Was Calculated</div>
              <div className="detail-description" style={{ marginBottom: '0.75rem' }}>
                Monthly expenses = Total expenses ÷ {actualMonths} month{actualMonths !== 1 ? 's' : ''}
              </div>
              <div className="detail-value" style={{ fontSize: '1.25rem' }}>
                {formatCurrency(displayTotalExpenses * actualMonths)} ÷ {actualMonths} = {formatCurrency(displayTotalExpenses)}
              </div>
              <div className="detail-description" style={{ marginTop: '0.5rem', fontSize: '0.9rem', opacity: 0.9 }}>
                ⓘ Excludes housing and one-time expenses by default
              </div>
            </div>
            {expenseBreakdown.length > 0 ? (
              <>
                <div className="detail-section">
                  <div className="detail-label">Expense Categories</div>
                  <ul>
                    {expenseBreakdown.map((item, idx) => {
                      const percentage = ((item.monthly / displayTotalExpenses) * 100).toFixed(1);
                      return (
                        <li key={idx}>
                          <div>
                            <div style={{ fontWeight: 600 }}>{item.category}</div>
                            <div style={{ fontSize: '0.85rem', opacity: 0.8 }}>{percentage}% of total</div>
                          </div>
                          <div>
                            <div style={{ fontWeight: 700 }}>{formatCurrency(item.monthly)}/mo</div>
                            <div style={{ fontSize: '0.85rem', opacity: 0.8 }}>{formatCurrency(item.total)} total</div>
                          </div>
                        </li>
                      );
                    })}
                    <li className="total-row">
                      <span>Average Monthly Expenses</span>
                      <span>{formatCurrency(displayTotalExpenses)}</span>
                    </li>
                  </ul>
                </div>
                <div className="detail-section">
                  <div className="detail-label">Analysis Quality</div>
                  <div className="detail-description">
                    Based on {transactions?.filter(t => !t.excluded && t.category !== 'income' && (t.category !== 'one-time' || t.amount < 0)).length || 0} expense transactions over {actualMonths} month{actualMonths !== 1 ? 's' : ''}
                  </div>
                </div>
              </>
            ) : (
              <div className="detail-section">
                <div className="detail-description">
                  Total expenses calculated from all negative cash flows excluding housing
                </div>
              </div>
            )}
          </>
        }
      />

      {/* Card 4: Net Cash Flow */}
      <FlipCard
        frontContent={
          <div style={{
            background: 'white',
            border: '1px solid #e2e8f0',
            borderRadius: '12px',
            padding: '1.5rem',
            display: 'flex',
            flexDirection: 'column',
            height: '100%'
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
        }
        backContent={
          <>
            <h3>Net Cash Flow Calculation</h3>
            <div className="detail-section">
              <div className="detail-label">How This Was Calculated</div>
              <div className="detail-description" style={{ marginBottom: '0.75rem' }}>
                Net Cash Flow = Income - Expenses
              </div>
              <div className="detail-value" style={{ fontSize: '1.25rem' }}>
                {formatCurrency(displayTotalIncome)} - {formatCurrency(displayTotalExpenses)} = {formatCurrency(displayNetCashFlow)}
              </div>
            </div>
            <div className="detail-section">
              <div className="detail-label">Component Breakdown</div>
              <ul>
                <li>
                  <div>
                    <div style={{ fontWeight: 600, color: '#10b981' }}>Monthly Income</div>
                    <div style={{ fontSize: '0.85rem', opacity: 0.8 }}>All income sources</div>
                  </div>
                  <div style={{ fontWeight: 700, color: '#10b981' }}>
                    +{formatCurrency(displayTotalIncome)}
                  </div>
                </li>
                <li>
                  <div>
                    <div style={{ fontWeight: 600, color: '#ef4444' }}>Monthly Expenses</div>
                    <div style={{ fontSize: '0.85rem', opacity: 0.8 }}>Recurring expenses only</div>
                  </div>
                  <div style={{ fontWeight: 700, color: '#ef4444' }}>
                    -{formatCurrency(displayTotalExpenses)}
                  </div>
                </li>
                <li className="total-row">
                  <span style={{ fontWeight: 700 }}>Net Cash Flow</span>
                  <span style={{ fontWeight: 700, color: displayNetCashFlow >= 0 ? '#10b981' : '#ef4444' }}>
                    {formatCurrency(displayNetCashFlow)}
                  </span>
                </li>
              </ul>
            </div>
            <div className="detail-section">
              <div className="detail-label">AIO Impact</div>
              <div className="detail-description" style={{ marginBottom: '0.75rem' }}>
                {displayNetCashFlow >= 0
                  ? 'This positive cash flow reduces your loan balance daily, minimizing interest charges.'
                  : 'Negative cash flow means expenses exceed income. An AIO loan may not provide benefits.'}
              </div>
              <div className="detail-value" style={{ fontSize: '1.25rem' }}>
                Annual: {formatCurrency(displayNetCashFlow * 12)}
              </div>
              <div className="detail-description" style={{ marginTop: '0.5rem', fontSize: '0.9rem', opacity: 0.9 }}>
                {displayNetCashFlow > 0 && `With ${formatCurrency(displayNetCashFlow)}/month, you'll reduce your loan balance by ${formatCurrency(displayNetCashFlow * 12)} annually`}
              </div>
            </div>
          </>
        }
      />
    </div>
  );
}
