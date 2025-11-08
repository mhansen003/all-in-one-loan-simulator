/**
 * Test Comparison - Chat Engine vs Accurate Calculator
 *
 * Comparing results from chat engine scenarios with our accurate calculator
 */

import { AccurateLoanCalculator, AccurateCalculationInput } from './services/loan-calculator-accurate.js';

// Test parameters from chat scenarios
const propertyValue = 500000;
const loanBalance = 350000;
const aioRate = 0.0725; // 7.25%
const traditionalRate = 0.065; // 6.5%

console.log('\n═══════════════════════════════════════════════════════════════');
console.log('  COMPARISON TEST: Chat Engine vs Accurate Calculator');
console.log('═══════════════════════════════════════════════════════════════\n');

console.log('Test Parameters:');
console.log(`  Property Value: $${propertyValue.toLocaleString()}`);
console.log(`  Loan Balance: $${loanBalance.toLocaleString()}`);
console.log(`  AIO Rate: ${(aioRate * 100).toFixed(2)}%`);
console.log(`  Traditional Rate: ${(traditionalRate * 100).toFixed(2)}%`);

// ============================================================================
// SCENARIO 1: Full Cash Flow (~$20k/month net)
// ============================================================================
console.log('\n\n┌─────────────────────────────────────────────────────────────┐');
console.log('│ SCENARIO 1: FULL CASH FLOW (~$20k/month net)                │');
console.log('└─────────────────────────────────────────────────────────────┘\n');

console.log('Chat Engine Results:');
console.log('  Payoff Time: 6.8 years');
console.log('  AIO Interest: $94,000');
console.log('  Traditional Interest: $446,000');
console.log('  Savings: $352,000 in interest, 23 years faster\n');

// Run accurate calculator with full cash flow
const fullCashFlowInput: AccurateCalculationInput = {
  startingBalance: loanBalance,
  interestRate: aioRate,
  propertyValue: propertyValue,
  loanToValue: 0.80,
  monthlyIncome: 20000, // $20k net cash flow
  monthlyExpenses: 0, // Already netted out
  depositFrequency: 'biweekly', // Matching bank statement bi-weekly paychecks
  startDate: new Date(),
};

const fullResult = AccurateLoanCalculator.simulate(fullCashFlowInput);

console.log('Our Accurate Calculator Results:');
console.log(`  Payoff Time: ${(fullResult.summary.monthsToPayoff! / 12).toFixed(1)} years (${fullResult.summary.monthsToPayoff} months)`);
console.log(`  AIO Interest: $${fullResult.summary.totalInterestPaid.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`);
console.log(`  Payoff Date: ${fullResult.summary.payoffDate?.toLocaleDateString()}`);

// Calculate traditional mortgage for comparison
const traditionalMonthlyRate = traditionalRate / 12;
const traditionalMonths = 360; // 30 years
const traditionalMonthlyPayment = loanBalance * (traditionalMonthlyRate * Math.pow(1 + traditionalMonthlyRate, traditionalMonths)) / (Math.pow(1 + traditionalMonthlyRate, traditionalMonths) - 1);
const traditionalTotalPayment = traditionalMonthlyPayment * traditionalMonths;
const traditionalTotalInterest = traditionalTotalPayment - loanBalance;

console.log(`\nTraditional 30-Year Fixed at ${(traditionalRate * 100).toFixed(2)}%:`);
console.log(`  Monthly Payment: $${traditionalMonthlyPayment.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`);
console.log(`  Total Interest: $${traditionalTotalInterest.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`);
console.log(`  Payoff Time: 30 years`);

const fullSavings = traditionalTotalInterest - fullResult.summary.totalInterestPaid;
const fullTimeSaved = traditionalMonths - fullResult.summary.monthsToPayoff!;

console.log(`\nSavings with AIO:`);
console.log(`  Interest Saved: $${fullSavings.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`);
console.log(`  Time Saved: ${(fullTimeSaved / 12).toFixed(1)} years (${fullTimeSaved} months)`);

console.log('\n📊 Comparison to Chat Engine:');
const chatPayoffYears = 6.8;
const chatInterest = 94000;
const chatSavings = 352000;

const payoffDiff = Math.abs((fullResult.summary.monthsToPayoff! / 12) - chatPayoffYears);
const interestDiff = Math.abs(fullResult.summary.totalInterestPaid - chatInterest);
const savingsDiff = Math.abs(fullSavings - chatSavings);

console.log(`  Payoff Time Difference: ${payoffDiff.toFixed(1)} years`);
console.log(`  Interest Difference: $${interestDiff.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`);
console.log(`  Savings Difference: $${savingsDiff.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`);

// ============================================================================
// SCENARIO 2: Reduced Cash Flow ($5k/month)
// ============================================================================
console.log('\n\n┌─────────────────────────────────────────────────────────────┐');
console.log('│ SCENARIO 2: REDUCED CASH FLOW ($5k/month)                   │');
console.log('└─────────────────────────────────────────────────────────────┘\n');

console.log('Chat Engine Results:');
console.log('  Payoff Time: 17.2 years');
console.log('  AIO Interest: $260,000');
console.log('  Traditional Interest: $446,000');
console.log('  Savings: $186,000 in interest, 13 years faster\n');

// Run accurate calculator with reduced cash flow
const reducedCashFlowInput: AccurateCalculationInput = {
  startingBalance: loanBalance,
  interestRate: aioRate,
  propertyValue: propertyValue,
  loanToValue: 0.80,
  monthlyIncome: 5000, // $5k net cash flow
  monthlyExpenses: 0, // Already netted out
  depositFrequency: 'monthly',
  startDate: new Date(),
};

const reducedResult = AccurateLoanCalculator.simulate(reducedCashFlowInput);

console.log('Our Accurate Calculator Results:');
console.log(`  Payoff Time: ${(reducedResult.summary.monthsToPayoff! / 12).toFixed(1)} years (${reducedResult.summary.monthsToPayoff} months)`);
console.log(`  AIO Interest: $${reducedResult.summary.totalInterestPaid.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`);
console.log(`  Payoff Date: ${reducedResult.summary.payoffDate?.toLocaleDateString()}`);

console.log(`\nTraditional 30-Year Fixed at ${(traditionalRate * 100).toFixed(2)}%:`);
console.log(`  Same as above: $${traditionalTotalInterest.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })} interest over 30 years`);

const reducedSavings = traditionalTotalInterest - reducedResult.summary.totalInterestPaid;
const reducedTimeSaved = traditionalMonths - reducedResult.summary.monthsToPayoff!;

console.log(`\nSavings with AIO:`);
console.log(`  Interest Saved: $${reducedSavings.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`);
console.log(`  Time Saved: ${(reducedTimeSaved / 12).toFixed(1)} years (${reducedTimeSaved} months)`);

console.log('\n📊 Comparison to Chat Engine:');
const chatPayoffYears2 = 17.2;
const chatInterest2 = 260000;
const chatSavings2 = 186000;

const payoffDiff2 = Math.abs((reducedResult.summary.monthsToPayoff! / 12) - chatPayoffYears2);
const interestDiff2 = Math.abs(reducedResult.summary.totalInterestPaid - chatInterest2);
const savingsDiff2 = Math.abs(reducedSavings - chatSavings2);

console.log(`  Payoff Time Difference: ${payoffDiff2.toFixed(1)} years`);
console.log(`  Interest Difference: $${interestDiff2.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`);
console.log(`  Savings Difference: $${savingsDiff2.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`);

// ============================================================================
// OVERALL ASSESSMENT
// ============================================================================
console.log('\n\n═══════════════════════════════════════════════════════════════');
console.log('  OVERALL ASSESSMENT');
console.log('═══════════════════════════════════════════════════════════════\n');

const avgPayoffDiff = (payoffDiff + payoffDiff2) / 2;
const avgInterestDiff = (interestDiff + interestDiff2) / 2;
const avgSavingsDiff = (savingsDiff + savingsDiff2) / 2;

console.log('Average Differences:');
console.log(`  Payoff Time: ${avgPayoffDiff.toFixed(2)} years`);
console.log(`  Interest: $${avgInterestDiff.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`);
console.log(`  Savings: $${avgSavingsDiff.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`);

if (avgPayoffDiff < 1 && avgInterestDiff < 20000) {
  console.log('\n✅ PASS: Results are within reasonable range of chat engine');
} else if (avgPayoffDiff < 2 && avgInterestDiff < 50000) {
  console.log('\n⚠️  CAUTION: Results differ moderately from chat engine');
} else {
  console.log('\n❌ FAIL: Results differ significantly from chat engine');
}

console.log('\n═══════════════════════════════════════════════════════════════\n');
