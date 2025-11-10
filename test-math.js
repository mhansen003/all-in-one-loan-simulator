// Manual calculation test for AIO loan with user's inputs
// Purpose: Verify if $1,075/month net cash flow can pay off $350k at 7.25% in 27 years

const startingBalance = 350000;
const aioRate = 0.0725;  // 7.25% annual
const monthlyIncome = 18294;
const monthlyExpenses = 17218;
const netCashFlow = monthlyIncome - monthlyExpenses;  // $1,076

console.log('='.repeat(70));
console.log('AIO LOAN SIMULATION - MANUAL CALCULATION');
console.log('='.repeat(70));
console.log(`Starting Balance: $${startingBalance.toLocaleString()}`);
console.log(`AIO Interest Rate: ${(aioRate * 100).toFixed(2)}%`);
console.log(`Monthly Income: $${monthlyIncome.toLocaleString()}`);
console.log(`Monthly Expenses: $${monthlyExpenses.toLocaleString()}`);
console.log(`Net Cash Flow: $${netCashFlow.toLocaleString()}`);
console.log('='.repeat(70));

// Simulate monthly with daily interest calculation
let balance = startingBalance;
let month = 0;
const maxMonths = 360;  // 30 years
const avgDaysPerMonth = 30.42;

console.log('\nSimulating first 12 months...\n');

while (balance > 0 && month < maxMonths) {
  month++;

  // Simulate daily cash flow and interest
  let totalDailyInterest = 0;

  for (let day = 1; day <= avgDaysPerMonth; day++) {
    // Cash available decreases throughout month as expenses are paid
    const dayProgress = day / avgDaysPerMonth;
    const expensesToDate = monthlyExpenses * dayProgress;
    const cashAvailable = Math.max(0, monthlyIncome - expensesToDate);

    // Effective balance for interest calculation
    const effectiveBalance = Math.max(0, balance - cashAvailable);

    // Daily interest
    const dailyInterest = effectiveBalance * (aioRate / 365);
    totalDailyInterest += dailyInterest;
  }

  // At month end: New Balance = Starting Balance + Interest - Net Cash Flow
  const newBalance = Math.max(0, balance + totalDailyInterest - netCashFlow);
  const principalReduction = balance - newBalance;

  if (month <= 12) {
    console.log(`Month ${month.toString().padStart(3)}:  Balance: $${balance.toLocaleString().padStart(12)}  Interest: $${totalDailyInterest.toFixed(2).padStart(8)}  Reduction: $${principalReduction.toFixed(2).padStart(10)}  New: $${newBalance.toLocaleString().padStart(12)}`);
  }

  balance = newBalance;

  // Safety check
  if (principalReduction <= 0 && month > 12) {
    console.log(`\n⚠️  WARNING: Balance is not decreasing after month ${month}`);
    console.log(`   Monthly interest ($${totalDailyInterest.toFixed(2)}) exceeds net cash flow ($${netCashFlow})`);
    console.log(`   This loan will NEVER pay off with current parameters!`);
    break;
  }
}

console.log('\n' + '='.repeat(70));
if (balance <= 0) {
  console.log(`✅ PAID OFF in ${month} months (${Math.floor(month/12)} years, ${month % 12} months)`);
} else {
  console.log(`❌ NOT PAID OFF after ${month} months`);
  console.log(`   Remaining balance: $${balance.toLocaleString()}`);
}
console.log('='.repeat(70));
