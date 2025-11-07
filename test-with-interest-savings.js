/**
 * Test: Apply leftover PLUS interest savings to principal
 *
 * Theory: The offset reduces interest charged, and those savings
 * also go toward paying down principal
 */

function calculateAIOWithInterestSavings(loanAmount, annualRate, offsetAmount, monthlyLeftover) {
  const monthlyRate = annualRate / 12;
  let balance = loanAmount;
  let totalInterest = 0;
  let months = 0;
  const maxMonths = 360;

  console.log('\n📊 First 12 Months Breakdown:');
  console.log('Month | Balance     | Offset   | Effective   | Interest | Savings  | Left+Save | New Balance');
  console.log('-'.repeat(95));

  while (balance > 0.01 && months < maxMonths) {
    // Calculate interest on effective principal (with offset)
    const effectivePrincipal = Math.max(0, balance - offsetAmount);
    const interestWithOffset = effectivePrincipal * monthlyRate;

    // Calculate what interest WOULD BE without offset
    const interestWithoutOffset = balance * monthlyRate;

    // Interest savings from offset
    const interestSavings = interestWithoutOffset - interestWithOffset;

    // Total principal reduction = leftover + interest savings
    const principalReduction = monthlyLeftover + interestSavings;

    if (months < 12) {
      console.log(
        `${(months + 1).toString().padStart(5)} | ` +
        `${Math.round(balance).toLocaleString().padStart(11)} | ` +
        `${Math.round(offsetAmount).toLocaleString().padStart(8)} | ` +
        `${Math.round(effectivePrincipal).toLocaleString().padStart(11)} | ` +
        `${Math.round(interestWithOffset).toLocaleString().padStart(8)} | ` +
        `${Math.round(interestSavings).toLocaleString().padStart(8)} | ` +
        `${Math.round(principalReduction).toLocaleString().padStart(9)} | ` +
        `${Math.round(balance - principalReduction).toLocaleString().padStart(11)}`
      );
    }

    totalInterest += interestWithOffset;
    balance -= principalReduction;
    months++;

    if (balance < 0) balance = 0;
  }

  const avgMonthlyPrincipalReduction = loanAmount / months;

  return {
    monthsToPayoff: months,
    totalInterestPaid: totalInterest,
    avgMonthlyPrincipalReduction,
  };
}

const testData = {
  loanAmount: 650000,
  aioRate: 0.08201,
  monthlyDeposits: 12000,
  monthlyLeftover: 4800,
};

console.log('='.repeat(95));
console.log('🧪 TEST: Leftover + Interest Savings = Principal Reduction');
console.log('='.repeat(95));

console.log('\n📊 INPUT DATA:');
console.log(`   Loan Amount: $${testData.loanAmount.toLocaleString()}`);
console.log(`   AIO Rate: ${(testData.aioRate * 100).toFixed(3)}%`);
console.log(`   Monthly Deposits (OFFSET): $${testData.monthlyDeposits.toLocaleString()}`);
console.log(`   Monthly Leftover: $${testData.monthlyLeftover.toLocaleString()}`);

const result = calculateAIOWithInterestSavings(
  testData.loanAmount,
  testData.aioRate,
  testData.monthlyDeposits,
  testData.monthlyLeftover
);

console.log(`\n✨ ALL-IN-ONE LOAN RESULTS:`);
console.log(`   Months to Payoff: ${result.monthsToPayoff} (${(result.monthsToPayoff / 12).toFixed(1)} years)`);
console.log(`   Total Interest: $${Math.round(result.totalInterestPaid).toLocaleString()}`);
console.log(`   Avg Monthly Principal Reduction: $${Math.round(result.avgMonthlyPrincipalReduction).toLocaleString()}`);

const expectedMonths = 101;
const expectedInterest = 247895;
const expectedAvgPrincipalReduction = 6435.64;

console.log('\n📏 COMPARISON TO OFFICIAL:');
console.log(`   Expected Months: ${expectedMonths} (8.4 years)`);
console.log(`   Our Result: ${result.monthsToPayoff} (${(result.monthsToPayoff / 12).toFixed(1)} years)`);
console.log(`   Difference: ${Math.abs(result.monthsToPayoff - expectedMonths)} months (${((Math.abs(result.monthsToPayoff - expectedMonths) / expectedMonths) * 100).toFixed(1)}%)`);

console.log(`\n   Expected Interest: $${expectedInterest.toLocaleString()}`);
console.log(`   Our Result: $${Math.round(result.totalInterestPaid).toLocaleString()}`);
console.log(`   Difference: $${Math.abs(Math.round(result.totalInterestPaid) - expectedInterest).toLocaleString()}`);

console.log(`\n   Expected Avg Principal Reduction: $${expectedAvgPrincipalReduction.toLocaleString()}/month`);
console.log(`   Our Result: $${Math.round(result.avgMonthlyPrincipalReduction).toLocaleString()}/month`);
console.log(`   Difference: $${Math.abs(Math.round(result.avgMonthlyPrincipalReduction) - expectedAvgPrincipalReduction).toLocaleString()}`);

if (Math.abs(result.monthsToPayoff - expectedMonths) <= 5) {
  console.log('\n✅ EXCELLENT! Within 5 months of official calculator');
  console.log('\n💡 KEY INSIGHT:');
  console.log('   Interest savings from the offset are ALSO applied to principal reduction!');
  console.log('   Total Principal Reduction = Monthly Leftover + Interest Savings');
} else if (Math.abs(result.monthsToPayoff - expectedMonths) <= 12) {
  console.log('\n✓  GOOD! Within 1 year of official calculator');
} else {
  console.log('\n⚠️  Still needs adjustment');
}

console.log('\n' + '='.repeat(95));
