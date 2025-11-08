/**
 * Test Comparison V2 - Realistic Expense Modeling
 *
 * The chat engine likely uses NET cash flow after ALL expenses,
 * including the traditional mortgage payment that gets "converted" to AIO.
 */

import { AccurateLoanCalculator, AccurateCalculationInput } from './services/loan-calculator-accurate.js';

// Test parameters from chat scenarios
const propertyValue = 500000;
const loanBalance = 350000;
const aioRate = 0.0725; // 7.25%
const traditionalRate = 0.065; // 6.5%

// Calculate traditional mortgage payment (this would be an "expense" in traditional scenario)
const traditionalMonthlyRate = traditionalRate / 12;
const traditionalMonths = 360;
const traditionalMonthlyPayment = loanBalance * (traditionalMonthlyRate * Math.pow(1 + traditionalMonthlyRate, traditionalMonths)) / (Math.pow(1 + traditionalMonthlyRate, traditionalMonths) - 1);

console.log('\n═══════════════════════════════════════════════════════════════');
console.log('  COMPARISON TEST V2: Realistic Expense Modeling');
console.log('═══════════════════════════════════════════════════════════════\n');

console.log('Test Parameters:');
console.log(`  Property Value: $${propertyValue.toLocaleString()}`);
console.log(`  Loan Balance: $${loanBalance.toLocaleString()}`);
console.log(`  AIO Rate: ${(aioRate * 100).toFixed(2)}%`);
console.log(`  Traditional Rate: ${(traditionalRate * 100).toFixed(2)}%`);
console.log(`  Traditional Payment: $${traditionalMonthlyPayment.toLocaleString('en-US', { minimumFractionDigits: 2 })}/month\n`);

// ============================================================================
// SCENARIO 1: Full Cash Flow (~$20k/month net available)
// Chat engine shows: 6.8 years, $94k interest
// ============================================================================
console.log('\n┌─────────────────────────────────────────────────────────────┐');
console.log('│ SCENARIO 1: FULL CASH FLOW                                  │');
console.log('└─────────────────────────────────────────────────────────────┘\n');

console.log('Modeling Approach:');
console.log('  The $20k/month "net" likely means total income minus non-housing expenses');
console.log('  In AIO, this entire $20k sits in the account, reducing daily interest');
console.log('  But typical expenses withdraw ~$17-18k, leaving ~$2-3k net reduction\n');

// Model 1: Conservative - $20k net means $2k truly available after all expenses
console.log('Test 1A: Conservative ($2k/month net toward principal)');
const conservativeInput1: AccurateCalculationInput = {
  startingBalance: loanBalance,
  interestRate: aioRate,
  propertyValue: propertyValue,
  loanToValue: 0.80,
  monthlyIncome: 20000,
  monthlyExpenses: 18000, // Leaves $2k net
  depositFrequency: 'biweekly',
  startDate: new Date(),
};

const conservative1 = AccurateLoanCalculator.simulate(conservativeInput1);
console.log(`  Payoff: ${(conservative1.summary.monthsToPayoff! / 12).toFixed(1)} years, Interest: $${conservative1.summary.totalInterestPaid.toLocaleString('en-US', { maximumFractionDigits: 0 })}`);

// Model 2: Moderate - $20k net means $3k truly available
console.log('\nTest 1B: Moderate ($3k/month net toward principal)');
const moderateInput1: AccurateCalculationInput = {
  startingBalance: loanBalance,
  interestRate: aioRate,
  propertyValue: propertyValue,
  loanToValue: 0.80,
  monthlyIncome: 20000,
  monthlyExpenses: 17000, // Leaves $3k net
  depositFrequency: 'biweekly',
  startDate: new Date(),
};

const moderate1 = AccurateLoanCalculator.simulate(moderateInput1);
console.log(`  Payoff: ${(moderate1.summary.monthsToPayoff! / 12).toFixed(1)} years, Interest: $${moderate1.summary.totalInterestPaid.toLocaleString('en-US', { maximumFractionDigits: 0 })}`);

// Model 3: Aggressive - $20k net means $5k truly available
console.log('\nTest 1C: Aggressive ($5k/month net toward principal)');
const aggressiveInput1: AccurateCalculationInput = {
  startingBalance: loanBalance,
  interestRate: aioRate,
  propertyValue: propertyValue,
  loanToValue: 0.80,
  monthlyIncome: 20000,
  monthlyExpenses: 15000, // Leaves $5k net
  depositFrequency: 'biweekly',
  startDate: new Date(),
};

const aggressive1 = AccurateLoanCalculator.simulate(aggressiveInput1);
console.log(`  Payoff: ${(aggressive1.summary.monthsToPayoff! / 12).toFixed(1)} years, Interest: $${aggressive1.summary.totalInterestPaid.toLocaleString('en-US', { maximumFractionDigits: 0 })}`);

console.log('\n📊 Chat Engine Result: 6.8 years, $94,000 interest');
console.log('📊 Traditional Interest: $446,406 over 30 years\n');

// ============================================================================
// SCENARIO 2: Reduced Cash Flow ($5k/month)
// Chat engine shows: 17.2 years, $260k interest
// ============================================================================
console.log('\n┌─────────────────────────────────────────────────────────────┐');
console.log('│ SCENARIO 2: REDUCED CASH FLOW ($5k/month)                   │');
console.log('└─────────────────────────────────────────────────────────────┘\n');

console.log('Modeling Approach:');
console.log('  The $5k/month likely means gross income of $5k');
console.log('  With typical expenses of $4k, leaves ~$1k net reduction\n');

// Model 1: Conservative - $5k income with $4.5k expenses = $500 net
console.log('Test 2A: Conservative ($500/month net toward principal)');
const conservativeInput2: AccurateCalculationInput = {
  startingBalance: loanBalance,
  interestRate: aioRate,
  propertyValue: propertyValue,
  loanToValue: 0.80,
  monthlyIncome: 5000,
  monthlyExpenses: 4500,
  depositFrequency: 'monthly',
  startDate: new Date(),
};

const conservative2 = AccurateLoanCalculator.simulate(conservativeInput2);
console.log(`  Payoff: ${(conservative2.summary.monthsToPayoff! / 12).toFixed(1)} years, Interest: $${conservative2.summary.totalInterestPaid.toLocaleString('en-US', { maximumFractionDigits: 0 })}`);

// Model 2: Moderate - $5k income with $4k expenses = $1k net
console.log('\nTest 2B: Moderate ($1k/month net toward principal)');
const moderateInput2: AccurateCalculationInput = {
  startingBalance: loanBalance,
  interestRate: aioRate,
  propertyValue: propertyValue,
  loanToValue: 0.80,
  monthlyIncome: 5000,
  monthlyExpenses: 4000,
  depositFrequency: 'monthly',
  startDate: new Date(),
};

const moderate2 = AccurateLoanCalculator.simulate(moderateInput2);
console.log(`  Payoff: ${(moderate2.summary.monthsToPayoff! / 12).toFixed(1)} years, Interest: $${moderate2.summary.totalInterestPaid.toLocaleString('en-US', { maximumFractionDigits: 0 })}`);

// Model 3: Aggressive - $5k income with $3k expenses = $2k net
console.log('\nTest 2C: Aggressive ($2k/month net toward principal)');
const aggressiveInput2: AccurateCalculationInput = {
  startingBalance: loanBalance,
  interestRate: aioRate,
  propertyValue: propertyValue,
  loanToValue: 0.80,
  monthlyIncome: 5000,
  monthlyExpenses: 3000,
  depositFrequency: 'monthly',
  startDate: new Date(),
};

const aggressive2 = AccurateLoanCalculator.simulate(aggressiveInput2);
console.log(`  Payoff: ${(aggressive2.summary.monthsToPayoff! / 12).toFixed(1)} years, Interest: $${aggressive2.summary.totalInterestPaid.toLocaleString('en-US', { maximumFractionDigits: 0 })}`);

console.log('\n📊 Chat Engine Result: 17.2 years, $260,000 interest');
console.log('📊 Traditional Interest: $446,406 over 30 years\n');

// ============================================================================
// ANALYSIS
// ============================================================================
console.log('\n═══════════════════════════════════════════════════════════════');
console.log('  ANALYSIS');
console.log('═══════════════════════════════════════════════════════════════\n');

console.log('The chat engine results suggest they are using a MUCH LESS aggressive');
console.log('cash flow model than pure net cash flow. Possible explanations:\n');
console.log('1. They may be including the traditional mortgage payment as an expense');
console.log('2. They may be using average daily balance instead of interim balance');
console.log('3. They may not be compounding the daily interest reduction effect');
console.log('4. They may be using a simpler monthly interest calculation\n');

// Let's try one more model: Traditional payment as expense
console.log('\n┌─────────────────────────────────────────────────────────────┐');
console.log('│ ALTERNATIVE MODEL: Traditional Payment as Ongoing Expense   │');
console.log('└─────────────────────────────────────────────────────────────┘\n');

console.log('Theory: The chat engine might still be charging the equivalent of');
console.log(`the traditional mortgage payment ($${traditionalMonthlyPayment.toFixed(2)}/month) as an expense\n`);

// Scenario 1 with traditional payment as expense
console.log('Scenario 1 with Traditional Payment:');
const altInput1: AccurateCalculationInput = {
  startingBalance: loanBalance,
  interestRate: aioRate,
  propertyValue: propertyValue,
  loanToValue: 0.80,
  monthlyIncome: 20000,
  monthlyExpenses: 17787.76, // 20000 - 2212.24 = leaves same net as if paying traditional mortgage
  depositFrequency: 'biweekly',
  startDate: new Date(),
};

const alt1 = AccurateLoanCalculator.simulate(altInput1);
console.log(`  With Trad Payment as Expense: ${(alt1.summary.monthsToPayoff! / 12).toFixed(1)} years, $${alt1.summary.totalInterestPaid.toLocaleString('en-US', { maximumFractionDigits: 0 })}`);
console.log(`  Chat Engine: 6.8 years, $94,000`);

console.log('\n═══════════════════════════════════════════════════════════════\n');
