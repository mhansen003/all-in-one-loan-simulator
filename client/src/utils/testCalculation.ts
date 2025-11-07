/**
 * Test calculation against official All-In-One calculator data
 *
 * Official Data (from PDF):
 * - Loan Balance: $650,000
 * - Home Value: $800,000
 * - Comparison Rate: 6.5% (30-year fixed)
 * - Comparison Payment: $4,167.14
 * - AIO Rate: 8.201%
 * - Monthly Deposits: $12,000
 * - Taxes & Insurance: $1,025
 * - Other Expenses: $2,007.86
 * - Total Expenses: $7,192.14
 * - Percentage Leftover: 40%
 * - Monthly Leftover: $4,800
 *
 * Expected Results:
 * - AIO: 8.4 years (101 payments)
 * - AIO Total Interest: $247,895
 * - Traditional: 28.8 years (345 payments)
 * - Traditional Total Interest: $787,666
 * - Savings: $539,771 and 20.4 years
 * - Effective APR: 2.279% (from 8.201% actual)
 */

import { compareLoanOptions, type LoanInputs } from './loanCalculations';

export function testOfficialCalculatorData() {
  const inputs: LoanInputs = {
    loanAmount: 650000,
    traditionalRate: 0.065, // 6.5%
    aioRate: 0.08201, // 8.201%
    monthlyDeposits: 12000,
    monthlyExpenses: 7192.14, // $4,167.14 loan + $1,025 taxes + $2,007.86 other
    monthlyLeftover: 4800, // 40% of $12,000
    depositFrequency: 'monthly',
  };

  const result = compareLoanOptions(inputs);

  console.log('='.repeat(60));
  console.log('🧪 OFFICIAL CALCULATOR TEST');
  console.log('='.repeat(60));
  console.log('\n📊 INPUTS:');
  console.log(`  Loan Amount: $${inputs.loanAmount.toLocaleString()}`);
  console.log(`  Traditional Rate: ${(inputs.traditionalRate * 100).toFixed(3)}%`);
  console.log(`  AIO Rate: ${(inputs.aioRate * 100).toFixed(3)}%`);
  console.log(`  Monthly Deposits: $${inputs.monthlyDeposits.toLocaleString()}`);
  console.log(`  Monthly Expenses: $${inputs.monthlyExpenses.toLocaleString()}`);
  console.log(`  Monthly Leftover: $${inputs.monthlyLeftover.toLocaleString()}`);
  console.log(`  Deposit Frequency: ${inputs.depositFrequency}`);

  console.log('\n🏦 TRADITIONAL LOAN:');
  console.log(`  Monthly Payment: $${result.traditional.monthlyPayment.toLocaleString()}`);
  console.log(`  Time to Payoff: ${result.traditional.monthsToPayoff} months (${(result.traditional.monthsToPayoff / 12).toFixed(1)} years)`);
  console.log(`  Total Interest: $${result.traditional.totalInterestPaid.toLocaleString()}`);

  console.log('\n✨ ALL-IN-ONE LOAN:');
  console.log(`  Effective Principal: $${result.aio.effectivePrincipal?.toLocaleString()}`);
  console.log(`  Time to Payoff: ${result.aio.monthsToPayoff} months (${(result.aio.monthsToPayoff / 12).toFixed(1)} years)`);
  console.log(`  Total Interest: $${result.aio.totalInterestPaid.toLocaleString()}`);

  console.log('\n💰 SAVINGS:');
  console.log(`  Time Saved: ${result.timeSavedMonths} months (${result.timeSavedYears.toFixed(1)} years)`);
  console.log(`  Interest Saved: $${result.interestSaved.toLocaleString()}`);

  console.log('\n🎯 COMPARISON TO OFFICIAL CALCULATOR:');
  console.log('  Expected AIO Payoff: 101 months (8.4 years)');
  console.log(`  Our AIO Payoff: ${result.aio.monthsToPayoff} months (${(result.aio.monthsToPayoff / 12).toFixed(1)} years)`);
  console.log(`  Difference: ${Math.abs(result.aio.monthsToPayoff - 101)} months`);

  console.log('\n  Expected Traditional Payoff: 345 months (28.8 years)');
  console.log(`  Our Traditional Payoff: ${result.traditional.monthsToPayoff} months (${(result.traditional.monthsToPayoff / 12).toFixed(1)} years)`);
  console.log(`  Difference: ${Math.abs(result.traditional.monthsToPayoff - 345)} months`);

  console.log('\n  Expected AIO Interest: $247,895');
  console.log(`  Our AIO Interest: $${Math.round(result.aio.totalInterestPaid).toLocaleString()}`);
  console.log(`  Difference: $${Math.abs(Math.round(result.aio.totalInterestPaid) - 247895).toLocaleString()}`);

  console.log('\n  Expected Traditional Interest: $787,666');
  console.log(`  Our Traditional Interest: $${Math.round(result.traditional.totalInterestPaid).toLocaleString()}`);
  console.log(`  Difference: $${Math.abs(Math.round(result.traditional.totalInterestPaid) - 787666).toLocaleString()}`);

  console.log('\n' + '='.repeat(60));

  return result;
}

// Run test if executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  testOfficialCalculatorData();
}
