/**
 * Test v3: Try using FULL monthly deposits as offset
 */

function calculateAIOLoanV3(loanAmount, annualRate, offsetAmount, monthlyLeftover) {
  const monthlyRate = annualRate / 12;
  let balance = loanAmount;
  let totalInterest = 0;
  let months = 0;
  const maxMonths = 30 * 12;

  console.log('\n📊 AIO Calculation Details (First 12 months):');
  console.log('Month | Balance     | Offset      | Effective   | Interest   | Leftover   | New Balance');
  console.log('-'.repeat(95));

  while (balance > 0.01 && months < maxMonths) {
    const effectivePrincipal = Math.max(0, balance - offsetAmount);
    const interestPayment = effectivePrincipal * monthlyRate;
    const principalReduction = monthlyLeftover;

    if (months < 12) {
      console.log(
        `${(months + 1).toString().padStart(5)} | ` +
        `${Math.round(balance).toLocaleString().padStart(11)} | ` +
        `${Math.round(offsetAmount).toLocaleString().padStart(11)} | ` +
        `${Math.round(effectivePrincipal).toLocaleString().padStart(11)} | ` +
        `${Math.round(interestPayment).toLocaleString().padStart(10)} | ` +
        `${Math.round(monthlyLeftover).toLocaleString().padStart(10)} | ` +
        `${Math.round(balance - principalReduction).toLocaleString().padStart(11)}`
      );
    }

    totalInterest += interestPayment;
    balance -= principalReduction;
    months++;

    if (balance < 0) balance = 0;
  }

  return {
    monthsToPayoff: months,
    totalInterestPaid: totalInterest,
    effectivePrincipal: Math.max(0, loanAmount - offsetAmount)
  };
}

// Official calculator test data
const testData = {
  loanAmount: 650000,
  traditionalRate: 0.065,
  aioRate: 0.08201,
  monthlyDeposits: 12000,
  monthlyExpenses: 7192.14,
  monthlyLeftover: 4800,
  depositFrequency: 'monthly'
};

console.log('='.repeat(95));
console.log('🧪 TEST V3: Using FULL Monthly Deposits as Offset');
console.log('='.repeat(95));

console.log('\n📊 INPUT DATA:');
console.log(`   Loan Amount: $${testData.loanAmount.toLocaleString()}`);
console.log(`   AIO Rate: ${(testData.aioRate * 100).toFixed(3)}%`);
console.log(`   Monthly Deposits (OFFSET): $${testData.monthlyDeposits.toLocaleString()}`);
console.log(`   Monthly Expenses: $${testData.monthlyExpenses.toLocaleString()}`);
console.log(`   Monthly Leftover (PRINCIPAL REDUCTION): $${testData.monthlyLeftover.toLocaleString()}`);

console.log('\n💡 KEY INSIGHT:');
console.log('   Offset (reduces effective principal): $12,000 (full deposits)');
console.log('   Principal Reduction (reduces balance): $4,800 (leftover)');
console.log('   Effective Principal: $650,000 - $12,000 = $638,000');

const aio = calculateAIOLoanV3(testData.loanAmount, testData.aioRate, testData.monthlyDeposits, testData.monthlyLeftover);

console.log(`\n✨ ALL-IN-ONE LOAN RESULTS:`);
console.log(`   Effective Principal: $${Math.round(aio.effectivePrincipal).toLocaleString()}`);
console.log(`   Months to Payoff: ${aio.monthsToPayoff} (${(aio.monthsToPayoff / 12).toFixed(1)} years)`);
console.log(`   Total Interest: $${Math.round(aio.totalInterestPaid).toLocaleString()}`);

const expectedMonths = 101;
const expectedInterest = 247895;

console.log('\n📏 COMPARISON TO OFFICIAL:');
console.log(`   Expected: ${expectedMonths} months (8.4 years), $${expectedInterest.toLocaleString()} interest`);
console.log(`   Our Result: ${aio.monthsToPayoff} months (${(aio.monthsToPayoff / 12).toFixed(1)} years), $${Math.round(aio.totalInterestPaid).toLocaleString()} interest`);
console.log(`   Month Difference: ${Math.abs(aio.monthsToPayoff - expectedMonths)} months (${((Math.abs(aio.monthsToPayoff - expectedMonths) / expectedMonths) * 100).toFixed(1)}%)`);
console.log(`   Interest Difference: $${Math.abs(Math.round(aio.totalInterestPaid) - expectedInterest).toLocaleString()} (${((Math.abs(Math.round(aio.totalInterestPaid) - expectedInterest) / expectedInterest) * 100).toFixed(1)}%)`);

if (Math.abs(aio.monthsToPayoff - expectedMonths) <= 5) {
  console.log('\n✅ EXCELLENT! Within 5 months of official calculator');
} else if (Math.abs(aio.monthsToPayoff - expectedMonths) <= 12) {
  console.log('\n✓  GOOD! Within 1 year of official calculator');
} else {
  console.log('\n⚠️  Still needs adjustment');
}

console.log('\n' + '='.repeat(95));
