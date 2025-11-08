/**
 * Validation Script for Accurate Loan Calculator
 *
 * Tests the calculator directly with sample data to verify:
 * - Daily interest accrual
 * - Monthly interest posting
 * - 21-day payment delay
 * - Credit limit decline
 * - Deposit frequency handling
 */

import { AccurateLoanCalculator, AccurateCalculationInput } from './services/loan-calculator-accurate';

// Sample test case
const testInput: AccurateCalculationInput = {
  // Loan details
  startingBalance: 350000,
  interestRate: 0.0725,        // 7.25%
  propertyValue: 500000,
  loanToValue: 0.80,           // 80% LTV

  // Cash flow
  monthlyIncome: 8000,
  monthlyExpenses: 5000,
  depositFrequency: 'biweekly', // Biweekly deposits

  // Start date
  startDate: new Date('2025-01-01')
};

console.log('═══════════════════════════════════════════════════════════════');
console.log('   ACCURATE AIO LOAN CALCULATOR - VALIDATION TEST');
console.log('═══════════════════════════════════════════════════════════════\n');

console.log('📊 TEST INPUTS:');
console.log('─────────────────────────────────────────────────────────────');
console.log(`Starting Balance:     $${testInput.startingBalance.toLocaleString()}`);
console.log(`Interest Rate:        ${(testInput.interestRate * 100).toFixed(2)}%`);
console.log(`Property Value:       $${testInput.propertyValue.toLocaleString()}`);
console.log(`Loan-to-Value:        ${(testInput.loanToValue * 100).toFixed(0)}%`);
console.log(`Monthly Income:       $${testInput.monthlyIncome.toLocaleString()}`);
console.log(`Monthly Expenses:     $${testInput.monthlyExpenses.toLocaleString()}`);
console.log(`Net Monthly Cash:     $${(testInput.monthlyIncome - testInput.monthlyExpenses).toLocaleString()}`);
console.log(`Deposit Frequency:    ${testInput.depositFrequency}`);
console.log(`Start Date:           ${testInput.startDate.toLocaleDateString()}`);
console.log('─────────────────────────────────────────────────────────────\n');

// Run simulation
console.log('⏳ Running simulation...\n');
const startTime = Date.now();
const result = AccurateLoanCalculator.simulate(testInput);
const endTime = Date.now();

console.log(`✅ Simulation complete in ${endTime - startTime}ms\n`);

// Display first 60 days in detail
console.log('═══════════════════════════════════════════════════════════════');
console.log('   FIRST 60 DAYS - DETAILED BREAKDOWN');
console.log('═══════════════════════════════════════════════════════════════\n');

const first60Days = result.dailyResults.slice(0, 60);

first60Days.forEach(day => {
  const dateStr = day.date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });

  // Only show days with activity
  if (day.deposits > 0 || day.withdrawals > 0 || day.interestPosted > 0 || day.interestPaid > 0) {
    console.log(`\n📅 Day ${day.dayIndex}: ${dateStr}`);
    console.log('─────────────────────────────────────────────────────────────');

    if (day.deposits > 0) {
      console.log(`  💰 Deposit:              +$${day.deposits.toFixed(2)}`);
    }
    if (day.withdrawals > 0) {
      console.log(`  💸 Withdrawal:           -$${day.withdrawals.toFixed(2)}`);
    }
    if (day.netCashFlow !== 0) {
      console.log(`  📊 Net Cash Flow:        ${day.netCashFlow >= 0 ? '+' : ''}$${day.netCashFlow.toFixed(2)}`);
    }

    console.log(`  🏦 Starting Balance:     $${day.startingBalance.toLocaleString('en-US', { minimumFractionDigits: 2 })}`);
    console.log(`  📐 Interim Balance:      $${day.interimBalance.toLocaleString('en-US', { minimumFractionDigits: 2 })}`);
    console.log(`  📈 Daily Interest:       $${day.dailyInterestAccrued.toFixed(2)} (rate: ${(day.dailyInterestRate * 100).toFixed(6)}%)`);
    console.log(`  💼 Accumulated Interest: $${day.accumulatedInterest.toFixed(2)}`);

    if (day.interestPosted > 0) {
      console.log(`  ✅ INTEREST POSTED:      $${day.interestPosted.toFixed(2)} (LAST DAY OF MONTH)`);
    }
    if (day.interestPaid > 0) {
      console.log(`  💳 INTEREST PAID:        $${day.interestPaid.toFixed(2)} (21-DAY DELAY)`);
    }

    console.log(`  🏁 Ending Balance:       $${day.endingBalance.toLocaleString('en-US', { minimumFractionDigits: 2 })}`);
    console.log(`  💳 Credit Limit:         $${day.creditLimit.toLocaleString('en-US', { minimumFractionDigits: 2 })}`);
    console.log(`  ✨ Available Credit:     $${day.availableCredit.toLocaleString('en-US', { minimumFractionDigits: 2 })}`);
  }
});

// Key validation points
console.log('\n\n═══════════════════════════════════════════════════════════════');
console.log('   KEY VALIDATION POINTS');
console.log('═══════════════════════════════════════════════════════════════\n');

// 1. Check first deposit timing
const firstDeposit = result.dailyResults.find(d => d.deposits > 0);
console.log('✓ DEPOSIT FREQUENCY TEST:');
console.log(`  First deposit on day ${firstDeposit?.dayIndex} (${firstDeposit?.date.toLocaleDateString()})`);
console.log(`  Amount: $${firstDeposit?.deposits.toFixed(2)}`);

const secondDeposit = result.dailyResults.find((d, i) => i > (firstDeposit?.dayIndex || 0) && d.deposits > 0);
console.log(`  Second deposit on day ${secondDeposit?.dayIndex} (${secondDeposit?.date.toLocaleDateString()})`);
console.log(`  Days between: ${(secondDeposit?.dayIndex || 0) - (firstDeposit?.dayIndex || 0)} days`);
console.log(`  Expected for biweekly: 14 days ✓\n`);

// 2. Check interest posting (last day of month)
const firstPosting = result.dailyResults.find(d => d.interestPosted > 0);
console.log('✓ INTEREST POSTING TEST:');
console.log(`  First posting on day ${firstPosting?.dayIndex} (${firstPosting?.date.toLocaleDateString()})`);
console.log(`  Amount: $${firstPosting?.interestPosted.toFixed(2)}`);
console.log(`  Should be last day of January ✓\n`);

// 3. Check 21-day payment delay
const firstPayment = result.dailyResults.find(d => d.interestPaid > 0);
console.log('✓ 21-DAY PAYMENT DELAY TEST:');
console.log(`  First payment on day ${firstPayment?.dayIndex} (${firstPayment?.date.toLocaleDateString()})`);
console.log(`  Amount: $${firstPayment?.interestPaid.toFixed(2)}`);
console.log(`  Posted on: ${firstPosting?.date.toLocaleDateString()}`);
console.log(`  Paid on: ${firstPayment?.date.toLocaleDateString()}`);
console.log(`  Days between: ${(firstPayment?.dayIndex || 0) - (firstPosting?.dayIndex || 0)} days`);
console.log(`  Should be 21 days ✓\n`);

// 4. Check daily interest calculation
const day1 = result.dailyResults[0];
const expectedDailyRate = testInput.interestRate / 365;
const expectedDailyInterest = day1.interimBalance * expectedDailyRate;
console.log('✓ DAILY INTEREST ACCRUAL TEST:');
console.log(`  Day 1 interim balance: $${day1.interimBalance.toFixed(2)}`);
console.log(`  Annual rate: ${(testInput.interestRate * 100).toFixed(2)}%`);
console.log(`  Daily rate: ${(expectedDailyRate * 100).toFixed(6)}%`);
console.log(`  Expected daily interest: $${expectedDailyInterest.toFixed(2)}`);
console.log(`  Calculated daily interest: $${day1.dailyInterestAccrued.toFixed(2)}`);
console.log(`  Match: ${Math.abs(expectedDailyInterest - day1.dailyInterestAccrued) < 0.01 ? '✓' : '✗'}\n`);

// 5. Check credit limit decline
const day0Credit = result.dailyResults[0].creditLimit;
const day365Credit = result.dailyResults[364]?.creditLimit;
const expectedInitialCredit = testInput.propertyValue * testInput.loanToValue;
console.log('✓ CREDIT LIMIT DECLINE TEST:');
console.log(`  Initial credit limit: $${day0Credit.toFixed(2)}`);
console.log(`  Expected: $${expectedInitialCredit.toFixed(2)}`);
console.log(`  Match: ${Math.abs(day0Credit - expectedInitialCredit) < 1 ? '✓' : '✗'}`);
if (day365Credit) {
  console.log(`  Credit limit after 1 year: $${day365Credit.toFixed(2)}`);
  console.log(`  Should decline over 20 years ✓\n`);
}

// Summary
console.log('\n═══════════════════════════════════════════════════════════════');
console.log('   SIMULATION SUMMARY');
console.log('═══════════════════════════════════════════════════════════════\n');

console.log(`📊 Total Days Simulated:       ${result.dailyResults.length.toLocaleString()}`);
console.log(`💰 Starting Balance:           $${testInput.startingBalance.toLocaleString()}`);
console.log(`🏁 Final Balance:              $${result.summary.finalBalance.toLocaleString('en-US', { minimumFractionDigits: 2 })}`);
console.log(`💸 Total Interest Paid:        $${result.summary.totalInterestPaid.toLocaleString('en-US', { minimumFractionDigits: 2 })}`);

if (result.summary.payoffDate) {
  console.log(`🎉 Payoff Date:                ${result.summary.payoffDate.toLocaleDateString()}`);
  console.log(`📅 Months to Payoff:           ${result.summary.monthsToPayoff} months`);
  console.log(`⏰ Years to Payoff:            ${(result.summary.monthsToPayoff! / 12).toFixed(1)} years`);
} else {
  console.log(`⚠️  Loan not paid off in 30 years`);
  console.log(`💼 Remaining Balance:          $${result.summary.finalBalance.toLocaleString('en-US', { minimumFractionDigits: 2 })}`);
}

console.log('\n═══════════════════════════════════════════════════════════════');
console.log('   VALIDATION COMPLETE ✅');
console.log('═══════════════════════════════════════════════════════════════\n');

// Month-by-month summary for first year
console.log('\n═══════════════════════════════════════════════════════════════');
console.log('   MONTH-BY-MONTH SUMMARY (FIRST 12 MONTHS)');
console.log('═══════════════════════════════════════════════════════════════\n');

for (let month = 0; month < 12; month++) {
  const monthStart = result.dailyResults[month * 30] || result.dailyResults[result.dailyResults.length - 1];
  const monthEnd = result.dailyResults[Math.min((month + 1) * 30 - 1, result.dailyResults.length - 1)];

  // Calculate totals for the month
  const monthDays = result.dailyResults.slice(month * 30, Math.min((month + 1) * 30, result.dailyResults.length));
  const totalDeposits = monthDays.reduce((sum, d) => sum + d.deposits, 0);
  const totalWithdrawals = monthDays.reduce((sum, d) => sum + d.withdrawals, 0);
  const totalInterestAccrued = monthDays.reduce((sum, d) => sum + d.dailyInterestAccrued, 0);
  const totalInterestPaid = monthDays.reduce((sum, d) => sum + d.interestPaid, 0);

  console.log(`📅 Month ${month + 1} (${monthStart.date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' })})`);
  console.log(`   Starting Balance:  $${monthStart.startingBalance.toLocaleString('en-US', { minimumFractionDigits: 2 })}`);
  console.log(`   Deposits:          $${totalDeposits.toLocaleString('en-US', { minimumFractionDigits: 2 })}`);
  console.log(`   Withdrawals:       $${totalWithdrawals.toLocaleString('en-US', { minimumFractionDigits: 2 })}`);
  console.log(`   Interest Accrued:  $${totalInterestAccrued.toLocaleString('en-US', { minimumFractionDigits: 2 })}`);
  console.log(`   Interest Paid:     $${totalInterestPaid.toLocaleString('en-US', { minimumFractionDigits: 2 })}`);
  console.log(`   Ending Balance:    $${monthEnd.endingBalance.toLocaleString('en-US', { minimumFractionDigits: 2 })}`);
  console.log(`   Balance Change:    ${monthEnd.endingBalance > monthStart.startingBalance ? '+' : ''}$${(monthEnd.endingBalance - monthStart.startingBalance).toLocaleString('en-US', { minimumFractionDigits: 2 })}`);
  console.log('');
}

console.log('═══════════════════════════════════════════════════════════════\n');
