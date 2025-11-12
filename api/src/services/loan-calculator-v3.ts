/**
 * Loan Calculator V3 - Accurate Integration
 *
 * Wraps the AccurateLoanCalculator with the existing API interface
 */

import { AccurateLoanCalculator, AccurateCalculationInput } from './loan-calculator-accurate.js';
import { calculateMonthlyPayment } from './loan-calculator.js';
import type { MortgageDetails, CashFlowAnalysis, SimulationResult, LoanProjection, TraditionalProductType } from '../types.js';

/**
 * Get product display name from product type
 */
function getProductDisplayName(productType: TraditionalProductType): string {
  const displayNames: Record<TraditionalProductType, string> = {
    '15-year-fixed': '15-Year Fixed',
    '20-year-fixed': '20-Year Fixed',
    '25-year-fixed': '25-Year Fixed',
    '30-year-fixed': '30-Year Fixed',
  };
  return displayNames[productType] || '30-Year Fixed';
}

/**
 * Get term in months from product type
 */
function getTermMonths(productType: TraditionalProductType): number {
  const termMap: Record<TraditionalProductType, number> = {
    '15-year-fixed': 180,  // 15 years
    '20-year-fixed': 240,  // 20 years
    '25-year-fixed': 300,  // 25 years
    '30-year-fixed': 360,  // 30 years
  };
  return termMap[productType] || 360;
}

/**
 * Simulate loan using the accurate calculator
 */
export function simulateLoan(
  mortgageDetails: MortgageDetails,
  cashFlow: CashFlowAnalysis
): SimulationResult {
  const loanBalance = mortgageDetails.currentBalance || 0;
  const tradRate = (mortgageDetails.interestRate || 0) / 100;
  const aioRate = tradRate; // Use same interest rate for AIO

  // Get product type and determine term
  const productType = (mortgageDetails.productType || '30-year-fixed') as TraditionalProductType;
  const productDisplayName = getProductDisplayName(productType);
  const remainingMonths = getTermMonths(productType);

  // Calculate traditional mortgage projection
  const traditionalMonthlyPayment = mortgageDetails.monthlyPayment ||
    calculateMonthlyPayment(loanBalance, tradRate, remainingMonths);

  const traditionalTotalInterest = (traditionalMonthlyPayment * remainingMonths) - loanBalance;
  const traditionalPayoffDate = new Date();
  traditionalPayoffDate.setMonth(traditionalPayoffDate.getMonth() + remainingMonths);

  const traditionalLoan: LoanProjection = {
    type: 'traditional',
    productName: productDisplayName,
    monthlyPayment: traditionalMonthlyPayment,
    totalInterestPaid: Math.max(0, traditionalTotalInterest),
    payoffDate: traditionalPayoffDate,
    payoffMonths: remainingMonths,
  };

  // Run accurate AIO simulation
  // CRITICAL: cashFlow contains the correct MONTHLY values (monthlyDeposits/monthlyExpenses)
  // DO NOT use totalIncome/totalExpenses as those are TOTALS across all statement months!
  const depositFreq = (cashFlow.depositFrequency as any) || 'monthly';

  console.log(`[loan-calculator-v3] ========== CASHFLOW RECEIVED ==========`);
  console.log(`[loan-calculator-v3] cashFlow.monthlyDeposits: ${cashFlow.monthlyDeposits}`);
  console.log(`[loan-calculator-v3] cashFlow.monthlyExpenses: ${cashFlow.monthlyExpenses}`);
  console.log(`[loan-calculator-v3] cashFlow.totalIncome: ${cashFlow.totalIncome}`);
  console.log(`[loan-calculator-v3] cashFlow.totalExpenses: ${cashFlow.totalExpenses}`);
  console.log(`[loan-calculator-v3] cashFlow.netCashFlow: ${cashFlow.netCashFlow}`);

  const monthlyIncome = cashFlow.monthlyDeposits || cashFlow.totalIncome || 0;
  const monthlyExpenses = cashFlow.monthlyExpenses || cashFlow.totalExpenses || 0;
  const netCashFlow = monthlyIncome - monthlyExpenses;

  console.log(`[loan-calculator-v3] ========== SIMULATION INPUT ==========`);
  console.log(`[loan-calculator-v3] Starting Balance: $${loanBalance.toFixed(2)}`);
  console.log(`[loan-calculator-v3] Interest Rate: ${(aioRate * 100).toFixed(3)}%`);
  console.log(`[loan-calculator-v3] Deposit Frequency: ${depositFreq}`);
  console.log(`[loan-calculator-v3] Monthly Income (using): $${monthlyIncome.toFixed(2)}`);
  console.log(`[loan-calculator-v3] Monthly Expenses (using): $${monthlyExpenses.toFixed(2)}`);
  console.log(`[loan-calculator-v3] Net Cash Flow (calculated): $${netCashFlow.toFixed(2)}`);

  const accurateInput: AccurateCalculationInput = {
    startingBalance: loanBalance,
    interestRate: aioRate,
    propertyValue: mortgageDetails.propertyValue || loanBalance / 0.8,
    loanToValue: 0.80,
    monthlyIncome: monthlyIncome,
    monthlyExpenses: monthlyExpenses,
    depositFrequency: depositFreq,
    startDate: new Date(),
  };

  const accurateResult = AccurateLoanCalculator.simulate(accurateInput);

  console.log(`[loan-calculator-v3] ========== SIMULATION RESULT ==========`);
  console.log(`[loan-calculator-v3] Total Interest Paid: $${accurateResult.summary.totalInterestPaid.toFixed(2)}`);
  console.log(`[loan-calculator-v3] Months to Payoff (from accurate): ${accurateResult.summary.monthsToPayoff}`);
  console.log(`[loan-calculator-v3] Payoff Day Index: ${accurateResult.summary.payoffDayIndex}`);
  console.log(`[loan-calculator-v3] Payoff Date: ${accurateResult.summary.payoffDate?.toISOString()}`);
  console.log(`[loan-calculator-v3] Final Balance: $${accurateResult.summary.finalBalance.toFixed(2)}`);
  console.log(`[loan-calculator-v3] =======================================`);

  // Build AIO projection from accurate results
  const aioPayoffMonths = accurateResult.summary.monthsToPayoff || remainingMonths;
  const aioPayoffDate = accurateResult.summary.payoffDate || traditionalPayoffDate;
  const aioTotalInterest = accurateResult.summary.totalInterestPaid;

  console.log(`[loan-calculator-v3] ========== FINAL VALUES USED ==========`);
  console.log(`[loan-calculator-v3] aioPayoffMonths (final): ${aioPayoffMonths}`);
  console.log(`[loan-calculator-v3] remainingMonths (fallback): ${remainingMonths}`);
  console.log(`[loan-calculator-v3] Used fallback?: ${!accurateResult.summary.monthsToPayoff}`);
  console.log(`[loan-calculator-v3] =======================================`);

  const allInOneLoan: LoanProjection = {
    type: 'all-in-one',
    productName: 'All-In-One',
    monthlyPayment: 0, // AIO doesn't have fixed monthly payment
    totalInterestPaid: Math.max(0, aioTotalInterest),
    payoffDate: aioPayoffDate,
    payoffMonths: aioPayoffMonths,
    interestSavings: Math.max(0, traditionalTotalInterest - aioTotalInterest),
    monthsSaved: Math.max(0, remainingMonths - aioPayoffMonths),
  };

  // Calculate comparison
  const interestSavings = Math.max(0, traditionalTotalInterest - aioTotalInterest);
  const timeSavedMonths = Math.max(0, remainingMonths - aioPayoffMonths);
  const percentageSavings = traditionalTotalInterest > 0
    ? (interestSavings / traditionalTotalInterest) * 100
    : 0;

  return {
    traditionalLoan,
    allInOneLoan,
    comparison: {
      interestSavings: Math.max(0, interestSavings),
      timeSavedMonths: Math.max(0, timeSavedMonths),
      percentageSavings: Math.max(0, percentageSavings),
    },
  };
}
