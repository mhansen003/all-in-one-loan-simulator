/**
 * Test v2: Try using traditional payment for AIO principal reduction
 */

function calculateAverageBalance(monthlyDeposits, monthlyExpenses, frequency) {
  const monthlyLeftover = monthlyDeposits - monthlyExpenses;
  let averageBalance = (monthlyDeposits + monthlyLeftover) / 2;

  if (frequency === 'biweekly') averageBalance *= 1.15;
  if (frequency === 'weekly') averageBalance *= 1.25;

  return averageBalance;
}

function calculateTraditionalLoan(loanAmount, annualRate, termYears = 30) {
  const monthlyRate = annualRate / 12;
  const numPayments = termYears * 12;

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

function calculateAIOLoanV2(loanAmount, annualRate, averageBalance, traditionalPayment) {
  const monthlyRate = annualRate / 12;
  let balance = loanAmount;
  let totalInterest = 0;
  let months = 0;
  const maxMonths = 30 * 12;

  console.log('\n📊 AIO Calculation Details (First 12 months):');
  console.log('Month | Balance     | Effective   | Interest   | Payment    | New Balance');
  console.log('-'.repeat(80));

  while (balance > 0.01 && months < maxMonths) {
    const effectivePrincipal = Math.max(0, balance - averageBalance);
    const interestPayment = effectivePrincipal * monthlyRate;
    const principalPayment = traditionalPayment - interestPayment;

    if (months < 12) {
      console.log(
        `${(months + 1).toString().padStart(5)} | ` +
        `${Math.round(balance).toLocaleString().padStart(11)} | ` +
        `${Math.round(effectivePrincipal).toLocaleString().padStart(11)} | ` +
        `${Math.round(interestPayment).toLocaleString().padStart(10)} | ` +
        `${Math.round(traditionalPayment).toLocaleString().padStart(10)} | ` +
        `${Math.round(balance - principalPayment).toLocaleString().padStart(11)}`
      );
    }

    totalInterest += interestPayment;
    balance -= principalPayment;
    months++;

    if (balance < 0) balance = 0;
  }

  return {
    monthsToPayoff: months,
    totalInterestPaid: totalInterest,
    effectivePrincipal: Math.max(0, loanAmount - averageBalance)
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

console.log('='.repeat(80));
console.log('🧪 TEST V2: Using Traditional Payment for AIO Principal Reduction');
console.log('='.repeat(80));

console.log('\n📊 INPUT DATA:');
console.log(`   Loan Amount: $${testData.loanAmount.toLocaleString()}`);
console.log(`   Traditional Rate: ${(testData.traditionalRate * 100).toFixed(3)}%`);
console.log(`   AIO Rate: ${(testData.aioRate * 100).toFixed(3)}%`);
console.log(`   Monthly Deposits: $${testData.monthlyDeposits.toLocaleString()}`);
console.log(`   Monthly Expenses: $${testData.monthlyExpenses.toLocaleString()}`);
console.log(`   Monthly Leftover: $${testData.monthlyLeftover.toLocaleString()}`);

const averageBalance = calculateAverageBalance(
  testData.monthlyDeposits,
  testData.monthlyExpenses,
  testData.depositFrequency
);

console.log(`\n💡 CALCULATED AVERAGE BALANCE: $${Math.round(averageBalance).toLocaleString()}`);

const traditional = calculateTraditionalLoan(testData.loanAmount, testData.traditionalRate);
console.log(`\n🏦 TRADITIONAL PAYMENT: $${Math.round(traditional.monthlyPayment).toLocaleString()}/month`);
console.log(`   (Official shows $4,167.14, we calculated $${Math.round(traditional.monthlyPayment).toLocaleString()})`);

// Try using the traditional payment for AIO
const aio = calculateAIOLoanV2(testData.loanAmount, testData.aioRate, averageBalance, traditional.monthlyPayment);

console.log(`\n✨ ALL-IN-ONE LOAN RESULTS:`);
console.log(`   Effective Principal: $${Math.round(aio.effectivePrincipal).toLocaleString()}`);
console.log(`   Months to Payoff: ${aio.monthsToPayoff} (${(aio.monthsToPayoff / 12).toFixed(1)} years)`);
console.log(`   Total Interest: $${Math.round(aio.totalInterestPaid).toLocaleString()}`);

console.log('\n📏 COMPARISON TO OFFICIAL:');
console.log(`   Expected: 101 months (8.4 years), $247,895 interest`);
console.log(`   Our Result: ${aio.monthsToPayoff} months (${(aio.monthsToPayoff / 12).toFixed(1)} years), $${Math.round(aio.totalInterestPaid).toLocaleString()} interest`);
console.log(`   Difference: ${Math.abs(aio.monthsToPayoff - 101)} months (${((Math.abs(aio.monthsToPayoff - 101) / 101) * 100).toFixed(1)}%)`);

console.log('\n' + '='.repeat(80));
