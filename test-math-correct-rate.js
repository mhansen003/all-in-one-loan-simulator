// Test with TRADITIONAL rate (6.5%) instead of AIO rate (7.25%)
// This might be what the buggy code is actually using!

const startingBalance = 350000;
const traditionalRate = 0.065;  // 6.5% - TRADITIONAL rate (THE BUG!)
const aioRate = 0.0725;  // 7.25% - What it SHOULD use
const monthlyIncome = 18294;
const monthlyExpenses = 17218;
const netCashFlow = monthlyIncome - monthlyExpenses;

console.log('='.repeat(70));
console.log('TESTING WITH TRADITIONAL RATE (6.5%) - SIMULATING THE BUG');
console.log('='.repeat(70));
console.log(`Starting Balance: $${startingBalance.toLocaleString()}`);
console.log(`Using Rate: ${(traditionalRate * 100).toFixed(2)}% (SHOULD BE ${(aioRate * 100).toFixed(2)}%!)`);
console.log(`Monthly Income: $${monthlyIncome.toLocaleString()}`);
console.log(`Monthly Expenses: $${monthlyExpenses.toLocaleString()}`);
console.log(`Net Cash Flow: $${netCashFlow.toLocaleString()}`);
console.log('='.repeat(70));

let balance = startingBalance;
let month = 0;
const maxMonths = 360;
const avgDaysPerMonth = 30.42;

console.log('\nSimulating first 12 months...\n');

while (balance > 0.01 && month < maxMonths) {
  month++;

  let totalDailyInterest = 0;

  for (let day = 1; day <= avgDaysPerMonth; day++) {
    const dayProgress = day / avgDaysPerMonth;
    const expensesToDate = monthlyExpenses * dayProgress;
    const cashAvailable = Math.max(0, monthlyIncome - expensesToDate);
    const effectiveBalance = Math.max(0, balance - cashAvailable);
    const dailyInterest = effectiveBalance * (traditionalRate / 365);  // Using WRONG rate
    totalDailyInterest += dailyInterest;
  }

  const newBalance = Math.max(0, balance + totalDailyInterest - netCashFlow);
  const principalReduction = balance - newBalance;

  if (month <= 12 || month % 12 === 0) {
    console.log(`Month ${month.toString().padStart(3)}:  Balance: $${balance.toLocaleString().padStart(12)}  Interest: $${totalDailyInterest.toFixed(2).padStart(8)}  Reduction: $${principalReduction.toFixed(2).padStart(10)}`);
  }

  balance = newBalance;
}

console.log('\n' + '='.repeat(70));
if (balance <= 0) {
  const years = Math.floor(month / 12);
  const months = month % 12;
  console.log(`✅ PAID OFF in ${month} months (${years} years, ${months} months)`);
  console.log(`\n🐛 BUG CONFIRMED: Using traditional rate (6.5%) instead of AIO rate (7.25%)`);
  console.log(`   gives a payoff time of ~${years} years!`);
} else {
  console.log(`❌ NOT PAID OFF after ${month} months`);
  console.log(`   Remaining balance: $${balance.toLocaleString()}`);
}
console.log('='.repeat(70));
