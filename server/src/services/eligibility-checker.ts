import type { MortgageDetails, CashFlowAnalysis, EligibilityResult } from '../types.js';

/**
 * Check eligibility for All-In-One loan
 *
 * This is a flexible eligibility checker that can be customized based on
 * specific product requirements. Currently implements basic checks:
 * - Loan-to-Value (LTV) ratio
 * - Cash flow sufficiency
 */
export function calculateEligibility(
  mortgage: MortgageDetails,
  cashFlow: CashFlowAnalysis
): EligibilityResult {
  const reasons: string[] = [];

  // Calculate LTV
  const ltv = (mortgage.currentBalance / mortgage.propertyValue) * 100;

  // LTV Check (typically max 80% for All-In-One, but flexible)
  const MAX_LTV = 80;
  const ltvPassed = ltv <= MAX_LTV;

  if (!ltvPassed) {
    reasons.push(`LTV of ${ltv.toFixed(1)}% exceeds maximum of ${MAX_LTV}%`);
  } else {
    reasons.push(`LTV of ${ltv.toFixed(1)}% is within acceptable range`);
  }

  // Cash Flow Check (ensure positive cash flow exists)
  const MIN_CASH_FLOW = 500; // Minimum $500/month positive cash flow
  const cashFlowPassed = cashFlow.netCashFlow >= MIN_CASH_FLOW;

  if (!cashFlowPassed) {
    reasons.push(`Net cash flow of $${cashFlow.netCashFlow.toFixed(2)} is below minimum of $${MIN_CASH_FLOW}`);
  } else {
    reasons.push(`Net cash flow of $${cashFlow.netCashFlow.toFixed(2)} meets minimum requirements`);
  }

  // Additional checks can be added here:
  // - Credit score (would need to be passed in)
  // - DTI ratio (would need income data)
  // - Employment verification
  // - Property type restrictions
  // - Loan amount minimums/maximums

  const eligible = ltvPassed && cashFlowPassed;

  return {
    eligible,
    ltv,
    ltvPassed,
    cashFlowSufficient: cashFlow.netCashFlow >= MIN_CASH_FLOW,
    cashFlowPassed,
    reasons,
  };
}

/**
 * Calculate DTI (Debt-to-Income) ratio
 * Helper function for future implementation
 */
export function calculateDTI(
  monthlyDebts: number,
  monthlyIncome: number
): number {
  if (monthlyIncome === 0) return 100;
  return (monthlyDebts / monthlyIncome) * 100;
}

/**
 * Validate property value is reasonable relative to loan amount
 * Helper function for future implementation
 */
export function validatePropertyValue(
  propertyValue: number,
  loanAmount: number
): boolean {
  // Property value should be at least as much as the loan
  if (propertyValue < loanAmount) return false;

  // Property value shouldn't be unreasonably high (possible data entry error)
  if (propertyValue > loanAmount * 5) return false;

  return true;
}
