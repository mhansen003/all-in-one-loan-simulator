// Test CORRECTED math with P&I payment included
// User's parameters: $350k balance, 7.25% AIO rate, $2,200 P&I payment, $1,076 cash flow

const startingBalance = 350000;
const aioRate = 0.0725;
const monthlyPIPayment = 2200;  // Traditional P&I payment (already being paid!)
const monthlyCashFlow = 1076;   // EXTRA cash flow beyond P&I
const monthlyIncome = 18294;
const monthlyExpenses = 17218;

console.log('='.repeat(70));
console.log('CORRECTED AIO CALCULATION - WITH P&I PAYMENT');
console.log('='.repeat(70));
console.log(`Starting Balance: $${startingBalance.toLocaleString()}`);
console.log(`AIO Interest Rate: ${(aioRate * 100).toFixed(2)}%`);
console.log(`Monthly P&I Payment: $${monthlyPIPayment.toLocaleString()} (already being paid!)`);
console.log(`Monthly Cash Flow: $${monthlyCashFlow.toLocaleString()} (EXTRA principal reduction)`);
console.log('='.repeat(70));

let balance = startingBalance;
let month = 0;
const maxMonths = 360;
const avgDaysPerMonth = 30.42;
let totalInterestPaid = 0;

console.log('\nSimulating first 12 months...\n');

while (balance > 0.01 && month < maxMonths) {
  month++;

  // Simulate daily interest with cash offset
  let totalDailyInterest = 0;

  for (let day = 1; day <= avgDaysPerMonth; day++) {
    const dayProgress = day / avgDaysPerMonth;
    const expensesToDate = monthlyExpenses * dayProgress;
    const cashAvailable = Math.max(0, monthlyIncome - expensesToDate);
    const effectiveBalance = Math.max(0, balance - cashAvailable);
    const dailyInterest = effectiveBalance * (aioRate / 365);
    totalDailyInterest += dailyInterest;
  }

  // CORRECTED FORMULA:
  // New Balance = Balance + AIO Interest - P&I Payment - Extra Cash Flow
  const oldBalance = balance;
  balance = Math.max(0, balance + totalDailyInterest - monthlyPIPayment - monthlyCashFlow);
  const principalReduction = oldBalance - balance;
  totalInterestPaid += totalDailyInterest;

  if (month <= 12 || month % 12 === 0) {
    console.log(`Month ${month.toString().padStart(3)}:  Balance: $${oldBalance.toLocaleString().padStart(12)}  Interest: $${totalDailyInterest.toFixed(2).padStart(8)}  P&I: $${monthlyPIPayment.toFixed(2).padStart(8)}  Cash: $${monthlyCashFlow.toFixed(2).padStart(8)}  Reduction: $${principalReduction.toFixed(2).padStart(10)}`);
  }
}

console.log('\n' + '='.repeat(70));
if (balance <= 0) {
  const years = Math.floor(month / 12);
  const months = month % 12;
  console.log(`✅ PAID OFF in ${month} months (${years} years, ${months} months)`);
  console.log(`   Total Interest Paid: $${totalInterestPaid.toLocaleString(undefined, {maximumFractionDigits: 2})}`);
  console.log(`\n🎯 This is MUCH more reasonable!`);
  console.log(`   With $${monthlyPIPayment} P&I + $${monthlyCashFlow} extra = $${(monthlyPIPayment + monthlyCashFlow).toLocaleString()}/mo total`);
} else {
  console.log(`❌ NOT PAID OFF after ${month} months`);
  console.log(`   Remaining balance: $${balance.toLocaleString()}`);
}
console.log('='.repeat(70));
