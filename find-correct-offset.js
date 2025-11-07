/**
 * Work backwards to find the correct offset that gives us 101 months
 */

function calculateAIOMonthly(loanAmount, annualRate, offsetAmount, monthlyLeftover, maxMonths = 360) {
  const monthlyRate = annualRate / 12;
  let balance = loanAmount;
  let totalInterest = 0;
  let months = 0;

  while (balance > 0.01 && months < maxMonths) {
    const effectivePrincipal = Math.max(0, balance - offsetAmount);
    const interestPayment = effectivePrincipal * monthlyRate;
    totalInterest += interestPayment;
    balance -= monthlyLeftover;
    months++;

    if (balance < 0) balance = 0;
  }

  return {
    monthsToPayoff: months,
    totalInterestPaid: totalInterest,
  };
}

const testData = {
  loanAmount: 650000,
  aioRate: 0.08201,
  monthlyLeftover: 4800,
  targetMonths: 101,
};

console.log('='.repeat(70));
console.log('🔍 FINDING CORRECT OFFSET');
console.log('='.repeat(70));

console.log('\n📊 TARGET:');
console.log(`   Payoff: ${testData.targetMonths} months (8.4 years)`);
console.log(`   Interest: ~$247,895`);

console.log('\n🔬 TESTING DIFFERENT OFFSET VALUES:\n');

const offsetTests = [
  { label: 'Full Deposits', offset: 12000 },
  { label: 'Calculated Avg', offset: 8404 },
  { label: 'Test 15k', offset: 15000 },
  { label: 'Test 18k', offset: 18000 },
  { label: 'Test 20k', offset: 20000 },
  { label: 'Test 22k', offset: 22000 },
  { label: 'Test 25k', offset: 25000 },
];

offsetTests.forEach(test => {
  const result = calculateAIOMonthly(testData.loanAmount, testData.aioRate, test.offset, testData.monthlyLeftover);
  const monthsDiff = Math.abs(result.monthsToPayoff - testData.targetMonths);
  const status = monthsDiff <= 5 ? '✅' : monthsDiff <= 10 ? '✓' : '  ';

  console.log(
    `${status} ${test.label.padEnd(16)} ($${test.offset.toLocaleString().padStart(6)}): ` +
    `${result.monthsToPayoff.toString().padStart(3)} months (${(result.monthsToPayoff / 12).toFixed(1)} years), ` +
    `$${Math.round(result.totalInterestPaid).toLocaleString().padStart(7)} interest, ` +
    `${monthsDiff} months off`
  );
});

// Binary search for exact offset
console.log('\n🎯 BINARY SEARCH FOR EXACT OFFSET:\n');

let low = 10000;
let high = 30000;
let bestOffset = 12000;
let bestDiff = 1000;

for (let i = 0; i < 20; i++) {
  const mid = Math.round((low + high) / 2);
  const result = calculateAIOMonthly(testData.loanAmount, testData.aioRate, mid, testData.monthlyLeftover);
  const diff = result.monthsToPayoff - testData.targetMonths;

  if (Math.abs(diff) < bestDiff) {
    bestDiff = Math.abs(diff);
    bestOffset = mid;
  }

  if (diff > 0) {
    // Too many months, need more offset
    low = mid + 1;
  } else {
    // Too few months, need less offset
    high = mid - 1;
  }
}

const finalResult = calculateAIOMonthly(testData.loanAmount, testData.aioRate, bestOffset, testData.monthlyLeftover);

console.log(`Best Offset Found: $${bestOffset.toLocaleString()}`);
console.log(`Result: ${finalResult.monthsToPayoff} months (${(finalResult.monthsToPayoff / 12).toFixed(1)} years)`);
console.log(`Interest: $${Math.round(finalResult.totalInterestPaid).toLocaleString()}`);
console.log(`Difference from target: ${Math.abs(finalResult.monthsToPayoff - testData.targetMonths)} months`);

console.log('\n💡 INSIGHT:');
console.log(`   To get ${testData.targetMonths} months payoff, offset needs to be $${bestOffset.toLocaleString()}`);
console.log(`   That's ${(bestOffset / 12000).toFixed(2)}x the monthly deposits of $12,000`);
console.log(`   Or ${(bestOffset / 4800).toFixed(2)}x the monthly leftover of $4,800`);

console.log('\n' + '='.repeat(70));
