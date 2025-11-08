/**
 * Loan Calculator V3 - Accurate Integration
 *
 * Wraps the AccurateLoanCalculator with the existing API interface
 */

import { AccurateLoanCalculator, AccurateCalculationInput } from './loan-calculator-accurate.js';
import { calculateMonthlyPayment } from './loan-calculator.js';
import type { MortgageDetails, CashFlowAnalysis, SimulationResult, LoanProjection } from '../types.js';

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
  const remainingMonths = mortgageDetails.remainingTermMonths || 300;

  // Calculate traditional mortgage projection
  const traditionalMonthlyPayment = mortgageDetails.monthlyPayment ||
    calculateMonthlyPayment(loanBalance, tradRate, remainingMonths);

  const traditionalTotalInterest = (traditionalMonthlyPayment * remainingMonths) - loanBalance;
  const traditionalPayoffDate = new Date();
  traditionalPayoffDate.setMonth(traditionalPayoffDate.getMonth() + remainingMonths);

  const traditionalLoan: LoanProjection = {
    type: 'traditional',
    monthlyPayment: traditionalMonthlyPayment,
    totalInterestPaid: Math.max(0, traditionalTotalInterest),
    payoffDate: traditionalPayoffDate,
    payoffMonths: remainingMonths,
  };

  // Run accurate AIO simulation
  const accurateInput: AccurateCalculationInput = {
    startingBalance: loanBalance,
    interestRate: aioRate,
    propertyValue: mortgageDetails.propertyValue || loanBalance / 0.8,
    loanToValue: 0.80,
    monthlyIncome: cashFlow.totalIncome || cashFlow.monthlyDeposits || 0,
    monthlyExpenses: cashFlow.totalExpenses || cashFlow.monthlyExpenses || 0,
    depositFrequency: (cashFlow.depositFrequency as any) || 'monthly',
    startDate: new Date(),
  };

  const accurateResult = AccurateLoanCalculator.simulate(accurateInput);

  // Build AIO projection from accurate results
  const aioPayoffMonths = accurateResult.summary.monthsToPayoff || remainingMonths;
  const aioPayoffDate = accurateResult.summary.payoffDate || traditionalPayoffDate;
  const aioTotalInterest = accurateResult.summary.totalInterestPaid;

  const allInOneLoan: LoanProjection = {
    type: 'all-in-one',
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
