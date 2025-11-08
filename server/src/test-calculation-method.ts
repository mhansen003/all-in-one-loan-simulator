/**
 * Test: Calculation Method Comparison
 *
 * Investigating why our calculator shows faster payoffs than chat engine.
 * Testing different interest calculation approaches.
 */

import { CalendarGenerator } from './services/calendar-generator.js';

const loanBalance = 350000;
const annualRate = 0.0725;
const monthlyIncome = 20000;
const monthlyExpenses = 15000; // $5k net
const dailyRate = annualRate / 365;

console.log('\n═══════════════════════════════════════════════════════════════');
console.log('  INTEREST CALCULATION METHOD COMPARISON');
console.log('═══════════════════════════════════════════════════════════════\n');

console.log('Parameters:');
console.log(`  Starting Balance: $${loanBalance.toLocaleString()}`);
console.log(`  Annual Rate: ${(annualRate * 100).toFixed(2)}%`);
console.log(`  Daily Rate: ${(dailyRate * 100).toFixed(6)}%`);
console.log(`  Monthly Income: $${monthlyIncome.toLocaleString()}`);
console.log(`  Monthly Expenses: $${monthlyExpenses.toLocaleString()}`);
console.log(`  Net Cash Flow: $${(monthlyIncome - monthlyExpenses).toLocaleString()}/month\n`);

// Generate one month of calendar
const calendar = CalendarGenerator.generateCalendar(new Date(2025, 0, 1));
const oneMonth = calendar.slice(0, 31);

console.log('═══════════════════════════════════════════════════════════════');
console.log('  METHOD 1: Our Current Method (Interim Balance Before Interest)');
console.log('═══════════════════════════════════════════════════════════════\n');

let balance1 = loanBalance;
let totalInterest1 = 0;
let accumulatedInterest1 = 0;

console.log('Day | Cash Flow | Interim Bal | Daily Int | Accum Int | End Balance');
console.log('--------------------------------------------------------------------');

for (let i = 0; i < Math.min(oneMonth.length, 10); i++) {
  const day = oneMonth[i];

  // Deposits on 1st and 15th (biweekly-ish)
  const deposits = (day.dayOfMonth === 1 || day.dayOfMonth === 15) ? monthlyIncome / 2 : 0;
  const withdrawals = monthlyExpenses / day.daysInMonth; // Daily expenses
  const netCash = deposits - withdrawals;

  // Calculate interim balance (BEFORE interest)
  const interimBalance = balance1 - netCash;

  // Daily interest on interim balance
  const dailyInterest = interimBalance * dailyRate;
  accumulatedInterest1 += dailyInterest;

  // Post interest on last day of month
  if (day.isLastDayOfMonth) {
    balance1 += accumulatedInterest1;
    totalInterest1 += accumulatedInterest1;
    accumulatedInterest1 = 0;
  }

  // Apply net cash
  balance1 -= netCash;

  console.log(`${day.dayOfMonth.toString().padStart(3)} | ${netCash.toFixed(2).padStart(9)} | ${interimBalance.toFixed(2).padStart(11)} | ${dailyInterest.toFixed(2).padStart(9)} | ${accumulatedInterest1.toFixed(2).padStart(9)} | ${balance1.toFixed(2).padStart(11)}`);
}

console.log('\n═══════════════════════════════════════════════════════════════');
console.log('  METHOD 2: Alternative (Interest Before Cash Flow)');
console.log('═══════════════════════════════════════════════════════════════\n');

let balance2 = loanBalance;
let totalInterest2 = 0;
let accumulatedInterest2 = 0;

console.log('Day | Start Bal | Daily Int | Accum Int | Cash Flow | End Balance');
console.log('--------------------------------------------------------------------');

for (let i = 0; i < Math.min(oneMonth.length, 10); i++) {
  const day = oneMonth[i];

  const deposits = (day.dayOfMonth === 1 || day.dayOfMonth === 15) ? monthlyIncome / 2 : 0;
  const withdrawals = monthlyExpenses / day.daysInMonth;
  const netCash = deposits - withdrawals;

  // Calculate interest on STARTING balance
  const dailyInterest = balance2 * dailyRate;
  accumulatedInterest2 += dailyInterest;

  // Post interest on last day of month
  if (day.isLastDayOfMonth) {
    balance2 += accumulatedInterest2;
    totalInterest2 += accumulatedInterest2;
    accumulatedInterest2 = 0;
  }

  // THEN apply net cash
  balance2 -= netCash;

  console.log(`${day.dayOfMonth.toString().padStart(3)} | ${(balance2 + netCash).toFixed(2).padStart(9)} | ${dailyInterest.toFixed(2).padStart(9)} | ${accumulatedInterest2.toFixed(2).padStart(9)} | ${netCash.toFixed(2).padStart(9)} | ${balance2.toFixed(2).padStart(11)}`);
}

console.log('\n═══════════════════════════════════════════════════════════════');
console.log('  METHOD 3: Average Daily Balance');
console.log('═══════════════════════════════════════════════════════════════\n');

let balance3 = loanBalance;
let totalInterest3 = 0;
let dailyBalances: number[] = [];

console.log('Day | Start Bal | Cash Flow | End Bal | Avg Bal | Monthly Int');
console.log('--------------------------------------------------------------------');

for (let i = 0; i < Math.min(oneMonth.length, 10); i++) {
  const day = oneMonth[i];

  const deposits = (day.dayOfMonth === 1 || day.dayOfMonth === 15) ? monthlyIncome / 2 : 0;
  const withdrawals = monthlyExpenses / day.daysInMonth;
  const netCash = deposits - withdrawals;

  const startBal = balance3;
  balance3 -= netCash;

  // Track daily balance for averaging
  dailyBalances.push(balance3);

  // Calculate interest on average balance at month end
  let monthlyInterest = 0;
  if (day.isLastDayOfMonth) {
    const avgBalance = dailyBalances.reduce((a, b) => a + b, 0) / dailyBalances.length;
    monthlyInterest = avgBalance * dailyRate * day.dayOfMonth;
    balance3 += monthlyInterest;
    totalInterest3 += monthlyInterest;
    dailyBalances = [];
  }

  const avgBalance = dailyBalances.length > 0
    ? dailyBalances.reduce((a, b) => a + b, 0) / dailyBalances.length
    : balance3;

  console.log(`${day.dayOfMonth.toString().padStart(3)} | ${startBal.toFixed(2).padStart(9)} | ${netCash.toFixed(2).padStart(9)} | ${balance3.toFixed(2).padStart(7)} | ${avgBalance.toFixed(2).padStart(7)} | ${monthlyInterest.toFixed(2).padStart(11)}`);
}

console.log('\n═══════════════════════════════════════════════════════════════');
console.log('  SUMMARY: Interest After 10 Days');
console.log('═══════════════════════════════════════════════════════════════\n');

console.log(`Method 1 (Our Method - Interim Before Interest): $${totalInterest1.toFixed(2)}`);
console.log(`Method 2 (Interest Before Cash Flow): $${totalInterest2.toFixed(2)}`);
console.log(`Method 3 (Average Daily Balance): $${totalInterest3.toFixed(2)}`);

const diff12 = ((totalInterest2 - totalInterest1) / totalInterest1 * 100).toFixed(2);
const diff13 = ((totalInterest3 - totalInterest1) / totalInterest1 * 100).toFixed(2);

console.log(`\nMethod 2 charges ${diff12}% MORE interest than Method 1`);
console.log(`Method 3 charges ${diff13}% MORE interest than Method 1\n`);

console.log('INSIGHT:');
console.log('If the chat engine uses Method 2 or 3, it would explain why their');
console.log('payoff times are LONGER (6.8 vs 5.8 years) and interest HIGHER');
console.log('($94k vs $72k) than our calculator.\n');

console.log('Our method gives the borrower maximum benefit by calculating interest');
console.log('on the interim balance AFTER deposits reduce it. This is how CMG describes');
console.log('the AIO working - your deposits immediately reduce the balance for interest calc.\n');

console.log('═══════════════════════════════════════════════════════════════\n');
