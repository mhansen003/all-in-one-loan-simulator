import type { MortgageDetails, CashFlowAnalysis, SimulationResult, LoanProjection } from '../types.js';

/**
 * All-In-One Loan Calculator
 *
 * Based on CMG Financial's All-In-One loan product specifications:
 * - It's a 30-year HELOC (Home Equity Line of Credit)
 * - Interest calculated DAILY on: (Loan Balance - Cash in Account)
 * - Deposits pay down principal but remain accessible
 * - Functions as checking account with full banking features
 *
 * Key Formula:
 * Daily Interest = (Loan Balance - Available Cash) × (Annual Rate / 365)
 *
 * This daily calculation creates significant interest savings compared to
 * traditional mortgages where interest is calculated monthly on full balance.
 *
 * ⚠️ IMPORTANT - CALCULATION VALIDATION REQUIRED ⚠️
 * ====================================================
 * These calculations MUST match the existing CMG All-In-One simulator EXACTLY.
 *
 * TODO: Obtain C# source code from existing production simulator to ensure:
 * 1. Traditional loan amortization formula matches exactly
 * 2. All-In-One daily interest calculation matches exactly
 * 3. Cash flow offset logic matches exactly
 * 4. Payoff projections match exactly
 * 5. Interest savings calculations match exactly
 *
 * Per Paul's requirement: "What I don't wanna have happen Mark, is that on the
 * simulator you get a different response than in here, so it needs to be the
 * exact calculation."
 *
 * Contact: Paul Akinmade or CMG Dev Team for C# source code
 * ====================================================
 */

interface DailyBalance {
  date: Date;
  loanBalance: number;
  cashAvailable: number;
  effectiveBalance: number;
  dailyInterest: number;
}

interface MonthlySnapshot {
  month: number;
  loanBalance: number;
  totalInterestPaid: number;
  principalPaid: number;
  cashFlowOffset: number;
}

/**
 * Calculate traditional fixed-rate mortgage with standard amortization
 */
function calculateTraditionalLoan(mortgage: MortgageDetails): LoanProjection {
  const { currentBalance, interestRate, monthlyPayment } = mortgage;

  const monthlyRate = interestRate / 100 / 12;
  let balance = currentBalance;
  let totalInterest = 0;
  let monthsToPayoff = 0;

  const maxMonths = 360; // 30 years maximum

  while (balance > 0.01 && monthsToPayoff < maxMonths) {
    const interestPayment = balance * monthlyRate;
    const principalPayment = monthlyPayment - interestPayment;

    if (principalPayment <= 0) {
      // Payment doesn't cover interest - loan would never pay off
      throw new Error('Monthly payment is too low to cover interest charges');
    }

    totalInterest += interestPayment;
    balance -= principalPayment;
    monthsToPayoff++;
  }

  const payoffDate = new Date();
  payoffDate.setMonth(payoffDate.getMonth() + monthsToPayoff);

  return {
    type: 'traditional',
    monthlyPayment,
    totalInterestPaid: totalInterest,
    payoffDate,
    payoffMonths: monthsToPayoff,
  };
}

/**
 * Simulate one month of daily balance calculations for All-In-One loan
 *
 * Models realistic cash flow patterns:
 * - Deposits at beginning of month (income)
 * - Withdrawals throughout month (expenses)
 * - Cash sits in account reducing effective balance
 */
function simulateMonthlyDailyBalances(
  startingBalance: number,
  monthlyPayment: number,
  monthlyIncome: number,
  monthlyExpenses: number,
  annualRate: number,
  daysInMonth: number,
  monthNumber: number = 0,
  debugMode: boolean = false
): { totalInterest: number; endBalance: number; avgCashOffset: number } {
  const dailyRate = annualRate / 100 / 365;

  let loanBalance = startingBalance;
  let totalInterest = 0;
  let totalCashOffset = 0;

  if (debugMode && monthNumber <= 3) {
    console.log(`\n  📅 Month ${monthNumber} Daily Simulation:`);
    console.log(`     Starting Balance: $${startingBalance.toFixed(2)}`);
    console.log(`     Monthly Income: $${monthlyIncome.toFixed(2)}`);
    console.log(`     Monthly Expenses: $${monthlyExpenses.toFixed(2)}`);
    console.log(`     Monthly Payment: $${monthlyPayment.toFixed(2)}`);
    console.log(`     Annual Rate: ${annualRate.toFixed(3)}%`);
    console.log(`     Daily Rate: ${(dailyRate * 100).toFixed(6)}%`);
  }

  // Simulate cash flow pattern:
  // - Income deposits at start of month
  // - Expenses withdrawn gradually throughout month
  // - Monthly payment applied at end of month

  for (let day = 1; day <= daysInMonth; day++) {
    // Calculate cash available in account (deposits - expenses so far)
    const dayProgress = day / daysInMonth;
    const expensesToDate = monthlyExpenses * dayProgress;
    let cashAvailable = monthlyIncome - expensesToDate;

    // Cash cannot exceed loan balance (can't have more cash than loan)
    cashAvailable = Math.max(0, Math.min(cashAvailable, loanBalance));

    // Effective balance for interest calculation
    const effectiveBalance = Math.max(0, loanBalance - cashAvailable);

    // Daily interest on effective balance
    const dailyInterest = effectiveBalance * dailyRate;

    totalInterest += dailyInterest;
    totalCashOffset += cashAvailable;

    // Debug logging for first few days of first month
    if (debugMode && monthNumber === 1 && day <= 5) {
      console.log(`     Day ${day}: Cash=$${cashAvailable.toFixed(2)}, Effective=$${effectiveBalance.toFixed(2)}, Interest=$${dailyInterest.toFixed(2)}`);
    }
  }

  // At month end: Apply monthly payment
  const interestCharged = totalInterest;
  const principalReduction = monthlyPayment - interestCharged;

  const endBalance = Math.max(0, loanBalance - principalReduction);
  const avgCashOffset = totalCashOffset / daysInMonth;

  if (debugMode && monthNumber <= 3) {
    console.log(`     Total Interest This Month: $${interestCharged.toFixed(2)}`);
    console.log(`     Principal Reduction: $${principalReduction.toFixed(2)}`);
    console.log(`     Ending Balance: $${endBalance.toFixed(2)}`);
    console.log(`     Avg Cash Offset: $${avgCashOffset.toFixed(2)}`);
  }

  return {
    totalInterest: interestCharged,
    endBalance,
    avgCashOffset,
  };
}

/**
 * Calculate All-In-One loan with daily balance offset
 *
 * Key differences from traditional:
 * 1. Interest calculated DAILY, not monthly
 * 2. Available cash offsets the balance for interest calculation
 * 3. More accurate modeling of real-world cash flow patterns
 */
function calculateAllInOneLoan(
  mortgage: MortgageDetails,
  cashFlow: CashFlowAnalysis
): LoanProjection {
  const { currentBalance, interestRate, monthlyPayment } = mortgage;
  const { totalIncome, totalExpenses, netCashFlow, monthlyBreakdown } = cashFlow;

  // ⚠️ CRITICAL FIX: Calculate MONTHLY averages from totals
  // The cashFlow object has TOTALS across all months of data
  // We need MONTHLY averages for the simulation
  const monthsOfData = monthlyBreakdown?.length || 1;
  const monthlyIncome = totalIncome / monthsOfData;
  const monthlyExpenses = totalExpenses / monthsOfData;

  console.log(`\n🧮 [AIO CALC] Cash Flow Analysis:`);
  console.log(`   Total Income (${monthsOfData} months): $${totalIncome.toFixed(2)}`);
  console.log(`   Total Expenses (${monthsOfData} months): $${totalExpenses.toFixed(2)}`);
  console.log(`   MONTHLY Income: $${monthlyIncome.toFixed(2)}`);
  console.log(`   MONTHLY Expenses: $${monthlyExpenses.toFixed(2)}`);
  console.log(`   MONTHLY Net Cash Flow: $${(monthlyIncome - monthlyExpenses).toFixed(2)}`);

  let balance = currentBalance;
  let totalInterest = 0;
  let monthsToPayoff = 0;
  const maxMonths = 360; // 30 years

  // Average days per month
  const avgDaysPerMonth = 30.42;

  // Enable debug mode for first 3 months
  const debugMode = true;

  console.log(`\n🔄 [AIO CALC] Starting Monthly Simulation...`);

  while (balance > 0.01 && monthsToPayoff < maxMonths) {
    // Simulate this month with daily calculations
    const monthResult = simulateMonthlyDailyBalances(
      balance,
      monthlyPayment,
      monthlyIncome,    // FIXED: Using monthly average, not total
      monthlyExpenses,  // FIXED: Using monthly average, not total
      interestRate,
      avgDaysPerMonth,
      monthsToPayoff + 1,
      debugMode
    );

    totalInterest += monthResult.totalInterest;
    balance = monthResult.endBalance;
    monthsToPayoff++;

    // Safety check
    if (monthResult.totalInterest > monthlyPayment * 0.99) {
      // Payment barely covers interest - would take too long
      if (monthsToPayoff > 180) {
        // After 15 years, if still not making progress, cap it
        console.log(`   ⚠️  Stopping at month ${monthsToPayoff}: Payment barely covers interest`);
        break;
      }
    }
  }

  console.log(`\n✅ [AIO CALC] Simulation Complete:`);
  console.log(`   Months to Payoff: ${monthsToPayoff}`);
  console.log(`   Total Interest Paid: $${totalInterest.toFixed(2)}`);
  console.log(`   Final Balance: $${balance.toFixed(2)}`);

  const payoffDate = new Date();
  payoffDate.setMonth(payoffDate.getMonth() + monthsToPayoff);

  return {
    type: 'all-in-one',
    monthlyPayment,
    totalInterestPaid: totalInterest,
    payoffDate,
    payoffMonths: monthsToPayoff,
  };
}

/**
 * Main simulation function: Compare traditional vs All-In-One
 */
export function simulateLoan(
  mortgage: MortgageDetails,
  cashFlow: CashFlowAnalysis
): SimulationResult {
  // Validate inputs
  if (mortgage.monthlyPayment <= 0) {
    throw new Error('Monthly payment must be greater than zero');
  }

  if (mortgage.interestRate <= 0 || mortgage.interestRate > 20) {
    throw new Error('Interest rate must be between 0 and 20%');
  }

  if (mortgage.currentBalance <= 0) {
    throw new Error('Loan balance must be greater than zero');
  }

  // Debug logging for inputs
  console.log('💰 [LOAN CALC] Simulation Inputs:');
  console.log(`  Loan Balance: $${mortgage.currentBalance.toFixed(2)}`);
  console.log(`  Interest Rate: ${mortgage.interestRate.toFixed(3)}%`);
  console.log(`  Monthly Payment: $${mortgage.monthlyPayment.toFixed(2)}`);
  console.log(`  Total Income: $${cashFlow.totalIncome.toFixed(2)}`);
  console.log(`  Total Expenses: $${cashFlow.totalExpenses.toFixed(2)}`);
  console.log(`  Net Cash Flow: $${cashFlow.netCashFlow.toFixed(2)}`);
  console.log(`  Avg Monthly Balance: $${cashFlow.averageMonthlyBalance.toFixed(2)}`);

  // Calculate both scenarios
  const traditionalLoan = calculateTraditionalLoan(mortgage);
  console.log('📊 [LOAN CALC] Traditional Loan Results:');
  console.log(`  Payoff Months: ${traditionalLoan.payoffMonths}`);
  console.log(`  Total Interest: $${traditionalLoan.totalInterestPaid.toFixed(2)}`);

  const allInOneLoan = calculateAllInOneLoan(mortgage, cashFlow);
  console.log('📊 [LOAN CALC] All-In-One Loan Results:');
  console.log(`  Payoff Months: ${allInOneLoan.payoffMonths}`);
  console.log(`  Total Interest: $${allInOneLoan.totalInterestPaid.toFixed(2)}`);

  // Calculate savings
  const interestSavings = traditionalLoan.totalInterestPaid - allInOneLoan.totalInterestPaid;
  const timeSavedMonths = traditionalLoan.payoffMonths - allInOneLoan.payoffMonths;
  const percentageSavings = (interestSavings / traditionalLoan.totalInterestPaid) * 100;

  console.log('💡 [LOAN CALC] Comparison Results:');
  console.log(`  Interest Savings: $${interestSavings.toFixed(2)}`);
  console.log(`  Time Saved: ${timeSavedMonths} months`);
  console.log(`  Percentage Savings: ${percentageSavings.toFixed(2)}%`);

  // Add savings data to All-In-One projection
  allInOneLoan.interestSavings = interestSavings;
  allInOneLoan.monthsSaved = timeSavedMonths;

  return {
    traditionalLoan,
    allInOneLoan,
    comparison: {
      interestSavings,
      timeSavedMonths,
      percentageSavings,
    },
  };
}

/**
 * Detailed month-by-month breakdown (for future reporting features)
 */
export function getDetailedAmortization(
  mortgage: MortgageDetails,
  cashFlow: CashFlowAnalysis,
  months: number = 12
): MonthlySnapshot[] {
  const { currentBalance, interestRate, monthlyPayment } = mortgage;
  const { totalIncome, totalExpenses, monthlyBreakdown } = cashFlow;

  // Calculate monthly averages
  const monthsOfData = monthlyBreakdown?.length || 1;
  const monthlyIncome = totalIncome / monthsOfData;
  const monthlyExpenses = totalExpenses / monthsOfData;

  const snapshots: MonthlySnapshot[] = [];
  let balance = currentBalance;
  let cumulativeInterest = 0;
  const avgDaysPerMonth = 30.42;

  for (let month = 1; month <= Math.min(months, 360); month++) {
    const monthResult = simulateMonthlyDailyBalances(
      balance,
      monthlyPayment,
      monthlyIncome,    // FIXED: Using monthly average
      monthlyExpenses,  // FIXED: Using monthly average
      interestRate,
      avgDaysPerMonth,
      month,
      false  // No debug for amortization table
    );

    cumulativeInterest += monthResult.totalInterest;
    const principalPaid = monthlyPayment - monthResult.totalInterest;
    balance = monthResult.endBalance;

    snapshots.push({
      month,
      loanBalance: balance,
      totalInterestPaid: cumulativeInterest,
      principalPaid,
      cashFlowOffset: monthResult.avgCashOffset,
    });

    if (balance <= 0) break;
  }

  return snapshots;
}

/**
 * Calculate monthly payment from loan parameters (helper utility)
 */
export function calculateMonthlyPayment(
  principal: number,
  annualRate: number,
  termMonths: number
): number {
  if (annualRate === 0) {
    return principal / termMonths;
  }

  const monthlyRate = annualRate / 100 / 12;
  const numerator = monthlyRate * Math.pow(1 + monthlyRate, termMonths);
  const denominator = Math.pow(1 + monthlyRate, termMonths) - 1;

  return principal * (numerator / denominator);
}

/**
 * Estimate savings potential without full simulation (quick preview)
 */
export function estimateSavingsPotential(
  loanBalance: number,
  interestRate: number,
  avgMonthlyCashFlow: number,
  remainingMonths: number
): {
  estimatedInterestSavings: number;
  estimatedMonthsSaved: number;
} {
  // Simple estimation based on average offset
  const monthlyRate = interestRate / 100 / 12;
  const avgMonthlyInterestSavings = (avgMonthlyCashFlow * monthlyRate);

  // Rough estimate: savings compound over time
  const estimatedInterestSavings = avgMonthlyInterestSavings * remainingMonths * 0.7; // Factor for declining balance

  // Estimate time saved based on additional principal reduction
  const estimatedMonthsSaved = Math.floor(estimatedInterestSavings / (loanBalance / remainingMonths));

  return {
    estimatedInterestSavings: Math.max(0, estimatedInterestSavings),
    estimatedMonthsSaved: Math.max(0, estimatedMonthsSaved),
  };
}
