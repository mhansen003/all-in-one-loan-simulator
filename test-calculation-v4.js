/**
 * Test v4: Weekly calculation model (matches official calculator)
 */

function calculateAIOWeekly(loanAmount, annualRate, weeklyOffset, weeklyLeftover) {
  const weeklyRate = annualRate / 52;
  let balance = loanAmount;
  let totalInterest = 0;
  let weeks = 0;
  const maxWeeks = 30 * 52;

  console.log('\n📊 AIO Weekly Calculation (First 12 weeks):');
  console.log('Week | Balance     | Offset   | Effective   | Interest | Leftover | New Balance');
  console.log('-'.repeat(85));

  while (balance > 0.01 && weeks < maxWeeks) {
    const effectivePrincipal = Math.max(0, balance - weeklyOffset);
    const interestPayment = effectivePrincipal * weeklyRate;
    const principalReduction = weeklyLeftover;

    if (weeks < 12) {
      console.log(
        `${(weeks + 1).toString().padStart(4)} | ` +
        `${Math.round(balance).toLocaleString().padStart(11)} | ` +
        `${Math.round(weeklyOffset).toLocaleString().padStart(8)} | ` +
        `${Math.round(effectivePrincipal).toLocaleString().padStart(11)} | ` +
        `${Math.round(interestPayment).toLocaleString().padStart(8)} | ` +
        `${Math.round(weeklyLeftover).toLocaleString().padStart(8)} | ` +
        `${Math.round(balance - principalReduction).toLocaleString().padStart(11)}`
      );
    }

    totalInterest += interestPayment;
    balance -= principalReduction;
    weeks++;

    if (balance < 0) balance = 0;
  }

  const months = weeks / 4.33; // Average weeks per month

  return {
    weeksToPayoff: weeks,
    monthsToPayoff: Math.round(months),
    totalInterestPaid: totalInterest,
    effectivePrincipal: Math.max(0, loanAmount - weeklyOffset)
  };
}

// Official calculator test data
const testData = {
  loanAmount: 650000,
  aioRate: 0.08201,
  monthlyDeposits: 12000,
  monthlyExpenses: 7192.14,
  monthlyLeftover: 4800,
};

// Convert to weekly
const weeklyDeposits = testData.monthlyDeposits / 4.33;
const weeklyLeftover = testData.monthlyLeftover / 4.33;

console.log('='.repeat(85));
console.log('🧪 TEST V4: Weekly Calculation Model');
console.log('='.repeat(85));

console.log('\n📊 INPUT DATA:');
console.log(`   Loan Amount: $${testData.loanAmount.toLocaleString()}`);
console.log(`   AIO Rate: ${(testData.aioRate * 100).toFixed(3)}%`);
console.log(`   Monthly Deposits: $${testData.monthlyDeposits.toLocaleString()}`);
console.log(`   Monthly Leftover: $${testData.monthlyLeftover.toLocaleString()}`);

console.log('\n📊 CONVERTED TO WEEKLY:');
console.log(`   Weekly Deposits (OFFSET): $${Math.round(weeklyDeposits).toLocaleString()}`);
console.log(`   Weekly Leftover (PRINCIPAL REDUCTION): $${Math.round(weeklyLeftover).toLocaleString()}`);

const aio = calculateAIOWeekly(testData.loanAmount, testData.aioRate, weeklyDeposits, weeklyLeftover);

console.log(`\n✨ ALL-IN-ONE LOAN RESULTS:`);
console.log(`   Effective Principal: $${Math.round(aio.effectivePrincipal).toLocaleString()}`);
console.log(`   Weeks to Payoff: ${aio.weeksToPayoff} weeks`);
console.log(`   Months to Payoff: ${aio.monthsToPayoff} (${(aio.monthsToPayoff / 12).toFixed(1)} years)`);
console.log(`   Total Interest: $${Math.round(aio.totalInterestPaid).toLocaleString()}`);

const expectedMonths = 101;
const expectedInterest = 247895;

console.log('\n📏 COMPARISON TO OFFICIAL:');
console.log(`   Expected: ${expectedMonths} months (8.4 years), $${expectedInterest.toLocaleString()} interest`);
console.log(`   Our Result: ${aio.monthsToPayoff} months (${(aio.monthsToPayoff / 12).toFixed(1)} years), $${Math.round(aio.totalInterestPaid).toLocaleString()} interest`);
console.log(`   Month Difference: ${Math.abs(aio.monthsToPayoff - expectedMonths)} months (${((Math.abs(aio.monthsToPayoff - expectedMonths) / expectedMonths) * 100).toFixed(1)}%)`);
console.log(`   Interest Difference: $${Math.abs(Math.round(aio.totalInterestPaid) - expectedInterest).toLocaleString()} (${((Math.abs(Math.round(aio.totalInterestPaid) - expectedInterest) / expectedInterest) * 100).toFixed(1)}%)`);

// Check monthly averages
const avgMonthlyPrincipalReduction = (testData.loanAmount / aio.monthsToPayoff);
const avgMonthlyInterest = (aio.totalInterestPaid / aio.monthsToPayoff);
const avgMonthlyPayment = avgMonthlyPrincipalReduction + avgMonthlyInterest;

console.log('\n📊 CALCULATED MONTHLY AVERAGES:');
console.log(`   Average Monthly Payment: $${Math.round(avgMonthlyPayment).toLocaleString()}`);
console.log(`   Average Principal Reduced Monthly: $${Math.round(avgMonthlyPrincipalReduction).toLocaleString()}`);
console.log(`   Average Monthly Interest: $${Math.round(avgMonthlyInterest).toLocaleString()}`);

console.log('\n📊 OFFICIAL CALCULATOR SHOWS:');
console.log(`   Average Minimum Monthly Payment (AIO): $2,454.41`);
console.log(`   Average Principal Reduced Monthly: $6,435.64`);

if (Math.abs(aio.monthsToPayoff - expectedMonths) <= 5) {
  console.log('\n✅ EXCELLENT! Within 5 months of official calculator');
} else if (Math.abs(aio.monthsToPayoff - expectedMonths) <= 12) {
  console.log('\n✓  GOOD! Within 1 year of official calculator');
} else {
  console.log('\n⚠️  Still needs adjustment');
}

console.log('\n' + '='.repeat(85));
