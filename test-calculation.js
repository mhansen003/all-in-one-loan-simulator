/**
 * Quick test of calculation logic against official data
 */

// Simplified version of the calculation for testing
function calculateAverageBalance(monthlyDeposits, monthlyExpenses, frequency) {
  const monthlyLeftover = monthlyDeposits - monthlyExpenses;
  let averageBalance = (monthlyDeposits + monthlyLeftover) / 2;

  if (frequency === 'biweekly') averageBalance *= 1.15;
  if (frequency === 'weekly') averageBalance *= 1.25;

  return averageBalance;
}

function calculateTraditionalLoan(loanAmount, annualRate) {
  const monthlyRate = annualRate / 12;
  const numPayments = 30 * 12;

  const monthlyPayment = (loanAmount * monthlyRate * Math.pow(1 + monthlyRate, numPayments)) /
    (Math.pow(1 + monthlyRate, numPayments) - 1);

  let balance = loanAmount;
  let totalInterest = 0;
  let months = 0;

  while (balance > 0.01 && months < numPayments) {
    const interestPayment = balance * monthlyRate;
    const principalPayment = monthlyPayment - interestPayment;
    totalInterest += interestPayment;
    balance -= principalPayment;
    months++;
  }

  return { monthsToPayoff: months, totalInterestPaid: totalInterest, monthlyPayment };
}

function calculateAIOLoan(loanAmount, annualRate, averageBalance, monthlyLeftover) {
  const monthlyRate = annualRate / 12;
  let balance = loanAmount;
  let totalInterest = 0;
  let months = 0;
  const maxMonths = 30 * 12;

  while (balance > 0.01 && months < maxMonths) {
    const effectivePrincipal = Math.max(0, balance - averageBalance);
    const interestPayment = effectivePrincipal * monthlyRate;
    totalInterest += interestPayment;
    balance -= monthlyLeftover;
    months++;

    if (balance < 0) balance = 0;
  }

  return { monthsToPayoff: months, totalInterestPaid: totalInterest, effectivePrincipal: Math.max(0, loanAmount - averageBalance) };
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

console.log('='.repeat(70));
console.log('🧪 OFFICIAL CALCULATOR TEST - All-In-One Look Back Simulator');
console.log('='.repeat(70));

console.log('\n📊 INPUT DATA:');
console.log(`   Loan Amount: $${testData.loanAmount.toLocaleString()}`);
console.log(`   Traditional Rate: ${(testData.traditionalRate * 100).toFixed(3)}%`);
console.log(`   AIO Rate: ${(testData.aioRate * 100).toFixed(3)}%`);
console.log(`   Monthly Deposits: $${testData.monthlyDeposits.toLocaleString()}`);
console.log(`   Monthly Expenses: $${testData.monthlyExpenses.toLocaleString()}`);
console.log(`   Monthly Leftover: $${testData.monthlyLeftover.toLocaleString()}`);
console.log(`   Deposit Frequency: ${testData.depositFrequency}`);

const averageBalance = calculateAverageBalance(
  testData.monthlyDeposits,
  testData.monthlyExpenses,
  testData.depositFrequency
);

console.log(`\n💡 CALCULATED AVERAGE BALANCE: $${Math.round(averageBalance).toLocaleString()}`);

const traditional = calculateTraditionalLoan(testData.loanAmount, testData.traditionalRate);
const aio = calculateAIOLoan(testData.loanAmount, testData.aioRate, averageBalance, testData.monthlyLeftover);

console.log('\n🏦 TRADITIONAL LOAN RESULTS:');
console.log(`   Monthly Payment: $${Math.round(traditional.monthlyPayment).toLocaleString()}`);
console.log(`   Months to Payoff: ${traditional.monthsToPayoff} (${(traditional.monthsToPayoff / 12).toFixed(1)} years)`);
console.log(`   Total Interest: $${Math.round(traditional.totalInterestPaid).toLocaleString()}`);

console.log('\n✨ ALL-IN-ONE LOAN RESULTS:');
console.log(`   Effective Principal: $${Math.round(aio.effectivePrincipal).toLocaleString()}`);
console.log(`   Months to Payoff: ${aio.monthsToPayoff} (${(aio.monthsToPayoff / 12).toFixed(1)} years)`);
console.log(`   Total Interest: $${Math.round(aio.totalInterestPaid).toLocaleString()}`);

const timeSaved = traditional.monthsToPayoff - aio.monthsToPayoff;
const interestSaved = traditional.totalInterestPaid - aio.totalInterestPaid;

console.log('\n💰 SAVINGS:');
console.log(`   Time Saved: ${timeSaved} months (${(timeSaved / 12).toFixed(1)} years)`);
console.log(`   Interest Saved: $${Math.round(interestSaved).toLocaleString()}`);

console.log('\n' + '='.repeat(70));
console.log('📏 COMPARISON TO OFFICIAL CALCULATOR:');
console.log('='.repeat(70));

const expectedAIOMonths = 101;
const expectedAIOYears = 8.4;
const expectedAIOInterest = 247895;
const expectedTradMonths = 345;
const expectedTradYears = 28.8;
const expectedTradInterest = 787666;

console.log('\n   ALL-IN-ONE LOAN:');
console.log(`   Expected: ${expectedAIOMonths} months (${expectedAIOYears} years), $${expectedAIOInterest.toLocaleString()} interest`);
console.log(`   Our Result: ${aio.monthsToPayoff} months (${(aio.monthsToPayoff / 12).toFixed(1)} years), $${Math.round(aio.totalInterestPaid).toLocaleString()} interest`);
console.log(`   Month Difference: ${Math.abs(aio.monthsToPayoff - expectedAIOMonths)} months (${((Math.abs(aio.monthsToPayoff - expectedAIOMonths) / expectedAIOMonths) * 100).toFixed(1)}%)`);
console.log(`   Interest Difference: $${Math.abs(Math.round(aio.totalInterestPaid) - expectedAIOInterest).toLocaleString()} (${((Math.abs(Math.round(aio.totalInterestPaid) - expectedAIOInterest) / expectedAIOInterest) * 100).toFixed(1)}%)`);

console.log('\n   TRADITIONAL LOAN:');
console.log(`   Expected: ${expectedTradMonths} months (${expectedTradYears} years), $${expectedTradInterest.toLocaleString()} interest`);
console.log(`   Our Result: ${traditional.monthsToPayoff} months (${(traditional.monthsToPayoff / 12).toFixed(1)} years), $${Math.round(traditional.totalInterestPaid).toLocaleString()} interest`);
console.log(`   Month Difference: ${Math.abs(traditional.monthsToPayoff - expectedTradMonths)} months (${((Math.abs(traditional.monthsToPayoff - expectedTradMonths) / expectedTradMonths) * 100).toFixed(1)}%)`);
console.log(`   Interest Difference: $${Math.abs(Math.round(traditional.totalInterestPaid) - expectedTradInterest).toLocaleString()} (${((Math.abs(Math.round(traditional.totalInterestPaid) - expectedTradInterest) / expectedTradInterest) * 100).toFixed(1)}%)`);

console.log('\n' + '='.repeat(70));

const aioAccurate = Math.abs(aio.monthsToPayoff - expectedAIOMonths) < 5;
const tradAccurate = Math.abs(traditional.monthsToPayoff - expectedTradMonths) < 5;

if (aioAccurate && tradAccurate) {
  console.log('✅ TEST PASSED: Results within 5 months of official calculator!');
} else {
  console.log('⚠️  TEST ATTENTION NEEDED: Results differ by more than 5 months');
  if (!aioAccurate) {
    console.log(`   - AIO loan is off by ${Math.abs(aio.monthsToPayoff - expectedAIOMonths)} months`);
  }
  if (!tradAccurate) {
    console.log(`   - Traditional loan is off by ${Math.abs(traditional.monthsToPayoff - expectedTradMonths)} months`);
  }
}

console.log('='.repeat(70));
