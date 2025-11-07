import type { MortgageDetails, CashFlowAnalysis, SimulationResult, LoanProjection } from '../types.js';

/**
 * Calculate traditional loan amortization
 */
function calculateTraditionalLoan(mortgage: MortgageDetails): LoanProjection {
  const { currentBalance, interestRate, monthlyPayment, remainingTermMonths } = mortgage;

  const monthlyRate = interestRate / 100 / 12;
  let balance = currentBalance;
  let totalInterest = 0;
  let monthsToPayoff = 0;

  // Calculate month by month
  while (balance > 0 && monthsToPayoff < remainingTermMonths) {
    const interestPayment = balance * monthlyRate;
    const principalPayment = monthlyPayment - interestPayment;

    totalInterest += interestPayment;
    balance -= principalPayment;
    monthsToPayoff++;

    // Prevent infinite loop
    if (monthsToPayoff > 360) break;
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
 * Calculate All-In-One loan with cash flow offset
 *
 * The All-In-One loan uses average daily balance methodology:
 * - Borrower's available cash flow sits in the loan account
 * - This reduces the principal used for interest calculation
 * - Interest is calculated on: principal - average cash flow balance
 * - Results in significant interest savings and faster payoff
 */
function calculateAllInOneLoan(
  mortgage: MortgageDetails,
  cashFlow: CashFlowAnalysis
): LoanProjection {
  const { currentBalance, interestRate, monthlyPayment } = mortgage;
  const { averageMonthlyBalance } = cashFlow;

  const monthlyRate = interestRate / 100 / 12;
  let balance = currentBalance;
  let totalInterest = 0;
  let monthsToPayoff = 0;

  // The key difference: Cash flow offsets the principal for interest calculation
  // Assume cash flow stays in the account throughout the month
  const effectiveCashFlowOffset = Math.min(averageMonthlyBalance, balance);

  while (balance > 0) {
    // Calculate interest on reduced balance (principal minus cash flow offset)
    const effectiveBalance = Math.max(0, balance - effectiveCashFlowOffset);
    const interestPayment = effectiveBalance * monthlyRate;

    // Principal payment is the full monthly payment minus interest
    const principalPayment = monthlyPayment - interestPayment;

    totalInterest += interestPayment;
    balance -= principalPayment;
    monthsToPayoff++;

    // Prevent infinite loop and handle edge cases
    if (monthsToPayoff > 360 || balance < 0) break;
  }

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
 * Simulate both traditional and All-In-One loans and compare results
 */
export function simulateLoan(
  mortgage: MortgageDetails,
  cashFlow: CashFlowAnalysis
): SimulationResult {
  // Calculate both loan types
  const traditionalLoan = calculateTraditionalLoan(mortgage);
  const allInOneLoan = calculateAllInOneLoan(mortgage, cashFlow);

  // Calculate comparison metrics
  const interestSavings = traditionalLoan.totalInterestPaid - allInOneLoan.totalInterestPaid;
  const timeSavedMonths = traditionalLoan.payoffMonths - allInOneLoan.payoffMonths;
  const percentageSavings = (interestSavings / traditionalLoan.totalInterestPaid) * 100;

  // Add comparison data to All-In-One projection
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
 * Calculate monthly payment given loan amount, rate, and term
 * Helper function for future features
 */
export function calculateMonthlyPayment(
  principal: number,
  annualRate: number,
  termMonths: number
): number {
  const monthlyRate = annualRate / 100 / 12;

  if (monthlyRate === 0) {
    return principal / termMonths;
  }

  const numerator = monthlyRate * Math.pow(1 + monthlyRate, termMonths);
  const denominator = Math.pow(1 + monthlyRate, termMonths) - 1;

  return principal * (numerator / denominator);
}
