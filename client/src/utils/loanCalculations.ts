/**
 * Loan calculation utilities for Traditional vs AIO loan comparison
 */

export interface LoanInputs {
  loanAmount: number;
  traditionalRate: number; // Annual rate as decimal (e.g., 0.0699 for 6.99%)
  aioRate: number; // Annual rate as decimal
  averageMonthlyBalance: number; // Cash flow that offsets principal
  currentHousingPayment?: number; // Current rent/mortgage
}

export interface LoanResult {
  monthsToPayoff: number;
  totalInterestPaid: number;
  monthlyPayment: number;
  effectivePrincipal?: number; // Only for AIO
}

export interface LoanComparison {
  traditional: LoanResult;
  aio: LoanResult;
  timeSavedMonths: number;
  timeSavedYears: number;
  interestSaved: number;
}

/**
 * Calculate monthly payment for a traditional fixed-rate mortgage
 * Formula: M = P[r(1+r)^n]/[(1+r)^n-1]
 */
function calculateMonthlyPayment(
  principal: number,
  annualRate: number,
  termYears: number = 30
): number {
  const monthlyRate = annualRate / 12;
  const numPayments = termYears * 12;

  if (monthlyRate === 0) {
    return principal / numPayments;
  }

  const payment =
    (principal * monthlyRate * Math.pow(1 + monthlyRate, numPayments)) /
    (Math.pow(1 + monthlyRate, numPayments) - 1);

  return payment;
}

/**
 * Calculate traditional fixed-rate loan payoff
 */
export function calculateTraditionalLoan(
  loanAmount: number,
  annualRate: number,
  termYears: number = 30
): LoanResult {
  const monthlyPayment = calculateMonthlyPayment(loanAmount, annualRate, termYears);
  const monthlyRate = annualRate / 12;

  let balance = loanAmount;
  let totalInterest = 0;
  let months = 0;
  const maxMonths = termYears * 12;

  while (balance > 0.01 && months < maxMonths) {
    const interestPayment = balance * monthlyRate;
    const principalPayment = monthlyPayment - interestPayment;

    totalInterest += interestPayment;
    balance -= principalPayment;
    months++;
  }

  return {
    monthsToPayoff: months,
    totalInterestPaid: totalInterest,
    monthlyPayment,
  };
}

/**
 * Calculate AIO loan payoff with average monthly balance offset
 *
 * Key concept: The average monthly balance (cash flow) acts as a permanent
 * offset against the principal, reducing the effective balance that accrues interest.
 *
 * Example:
 * - Loan: $634,000 at 8.375%
 * - Average Balance: $5,000
 * - Effective Principal: $629,000 (only this accrues interest)
 * - Net Cash Flow: $4,738/month (equivalent to traditional payment)
 * - This net flow reduces principal each month on top of the offset benefit
 */
export function calculateAIOLoan(
  loanAmount: number,
  annualRate: number,
  averageMonthlyBalance: number,
  monthlyNetCashFlow: number // Net cash flow available to pay down principal
): LoanResult {
  const monthlyRate = annualRate / 12;

  let balance = loanAmount;
  let totalInterest = 0;
  let months = 0;
  const maxMonths = 30 * 12; // Max 30 years

  while (balance > 0.01 && months < maxMonths) {
    // Effective principal is reduced by average balance floating in account
    const effectivePrincipal = Math.max(0, balance - averageMonthlyBalance);

    // Interest is calculated on effective principal only
    const interestPayment = effectivePrincipal * monthlyRate;

    // Net cash flow reduces the actual balance
    const principalReduction = monthlyNetCashFlow;

    totalInterest += interestPayment;
    balance -= principalReduction;
    months++;

    // Safety check
    if (balance < 0) balance = 0;
  }

  return {
    monthsToPayoff: months,
    totalInterestPaid: totalInterest,
    monthlyPayment: monthlyNetCashFlow, // Effective "payment" is the net cash flow
    effectivePrincipal: Math.max(0, loanAmount - averageMonthlyBalance),
  };
}

/**
 * Compare traditional loan vs AIO loan
 */
export function compareLoanOptions(inputs: LoanInputs): LoanComparison {
  const {
    loanAmount,
    traditionalRate,
    aioRate,
    averageMonthlyBalance,
  } = inputs;

  // Calculate traditional loan
  const traditional = calculateTraditionalLoan(loanAmount, traditionalRate, 30);

  // For AIO: Monthly net cash flow is what you'd pay on traditional loan
  // (since you're replacing your current housing payment with this loan)
  const monthlyNetCashFlow = traditional.monthlyPayment;

  // Calculate AIO loan
  const aio = calculateAIOLoan(
    loanAmount,
    aioRate,
    averageMonthlyBalance,
    monthlyNetCashFlow
  );

  // Calculate savings
  const timeSavedMonths = traditional.monthsToPayoff - aio.monthsToPayoff;
  const interestSaved = traditional.totalInterestPaid - aio.totalInterestPaid;

  return {
    traditional,
    aio,
    timeSavedMonths,
    timeSavedYears: timeSavedMonths / 12,
    interestSaved,
  };
}

/**
 * Format months to years and months display
 */
export function formatMonthsToYears(months: number): string {
  const years = Math.floor(months / 12);
  const remainingMonths = Math.round(months % 12);

  if (remainingMonths === 0) {
    return `${years} ${years === 1 ? 'year' : 'years'}`;
  }

  return `${years} ${years === 1 ? 'year' : 'years'}, ${remainingMonths} ${remainingMonths === 1 ? 'month' : 'months'}`;
}

/**
 * Format currency
 */
export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

/**
 * Weekly breakdown entry for detailed amortization
 */
export interface WeeklyBreakdownEntry {
  week: number;
  balance: number;
  effectivePrincipal: number;
  interest: number;
  principalReduced: number;
}

/**
 * Generate week-by-week breakdown for AIO loan
 */
export function generateWeeklyBreakdown(
  loanAmount: number,
  annualRate: number,
  averageMonthlyBalance: number,
  monthlyNetCashFlow: number
): WeeklyBreakdownEntry[] {
  const weeklyRate = annualRate / 52;
  const weeklyNetCashFlow = monthlyNetCashFlow / 4.33; // Average weeks per month

  let balance = loanAmount;
  const breakdown: WeeklyBreakdownEntry[] = [];
  let week = 0;
  const maxWeeks = 30 * 52; // Max 30 years

  while (balance > 0.01 && week < maxWeeks) {
    week++;

    // Effective principal is reduced by average balance floating in account
    const effectivePrincipal = Math.max(0, balance - averageMonthlyBalance);

    // Interest is calculated on effective principal only
    const interest = effectivePrincipal * weeklyRate;

    // Principal reduction is net cash flow minus interest
    const principalReduced = weeklyNetCashFlow - interest;

    // Update balance
    balance -= principalReduced;

    // Ensure balance doesn't go negative
    if (balance < 0) balance = 0;

    breakdown.push({
      week,
      balance: Math.max(0, balance),
      effectivePrincipal,
      interest,
      principalReduced: Math.max(0, principalReduced),
    });

    // Break if paid off
    if (balance <= 0.01) break;
  }

  return breakdown;
}
