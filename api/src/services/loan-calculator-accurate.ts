/**
 * Accurate AIO Loan Calculator
 *
 * This implementation matches the source-of-truth logic from the AIO Widget.
 * It uses a 11,020-day calendar with daily interest accrual, monthly posting,
 * and 21-day payment delay.
 */

import { CalendarGenerator, CalendarDay } from './calendar-generator.js';

export interface AccurateCalculationInput {
  // Loan details
  startingBalance: number;
  interestRate: number;          // Annual rate as decimal (e.g., 0.0725 for 7.25%)
  propertyValue: number;
  loanToValue: number;            // As decimal (e.g., 0.80 for 80%)

  // Cash flow
  monthlyIncome: number;
  monthlyExpenses: number;
  depositFrequency: 'weekly' | 'biweekly' | 'semi-monthly' | 'monthly' | 'quarterly' | 'semi-annual' | 'annual';

  // Additional features
  additionalPrincipal?: number;  // Extra monthly principal payment
  isHomesteadLoan?: boolean;     // If true, applies year-25 amortization switch
  isARM?: boolean;               // If true, interest rate adjusts yearly
  armMargin?: number;            // ARM margin over index (e.g., 0.025 for 2.5%)
  armIndex?: number;             // Current ARM index rate (e.g., 0.05 for 5%)

  // Start date
  startDate: Date;
}

export interface DailyCalculationResult {
  dayIndex: number;
  date: Date;

  // Balances
  startingBalance: number;
  netCashFlow: number;           // Daily net cash (deposits - withdrawals)
  interimBalance: number;        // Balance after cash flow, before interest

  // Interest
  dailyInterestRate: number;     // Annual rate / 365
  dailyInterestAccrued: number;  // Interest accrued this day
  accumulatedInterest: number;   // Total interest not yet posted
  interestPosted: number;        // Interest posted to balance (last day of month only)
  interestPaid: number;          // Interest paid (21 days after posting)

  // Credit facility
  creditLimit: number;           // Available credit (declines over 20 years)
  availableCredit: number;       // Credit limit - balance

  // Transactions
  deposits: number;              // Income deposits this day
  withdrawals: number;           // Expense withdrawals this day

  // Ending balance
  endingBalance: number;         // Balance at end of day (after all transactions)
}

export interface AccurateSimulationResult {
  dailyResults: DailyCalculationResult[];
  summary: {
    totalInterestPaid: number;
    totalInterestAccrued: number;
    finalBalance: number;
    payoffDayIndex: number | null;   // -1 if not paid off in 30 years
    payoffDate: Date | null;
    monthsToPayoff: number | null;
  };
}

export class AccurateLoanCalculator {
  /**
   * Run the accurate AIO loan simulation
   */
  static simulate(input: AccurateCalculationInput): AccurateSimulationResult {
    // Generate the 11,020-day calendar
    const calendar = CalendarGenerator.generateCalendar(input.startDate);

    // Initialize daily results array
    const dailyResults: DailyCalculationResult[] = [];

    // Initialize tracking variables
    let currentBalance = input.startingBalance;
    let accumulatedInterest = 0;
    let totalInterestPaid = 0;
    let payoffDayIndex: number | null = null;
    let currentInterestRate = input.interestRate;
    let homesteadSwitchApplied = false;

    // Create deposit and withdrawal schedules
    const depositSchedule = this.createDepositSchedule(
      calendar,
      input.monthlyIncome,
      input.depositFrequency
    );

    const withdrawalSchedule = this.createWithdrawalSchedule(
      calendar,
      input.monthlyExpenses
    );

    // Simulate each day
    for (let dayIndex = 0; dayIndex < calendar.length; dayIndex++) {
      const day = calendar[dayIndex];

      // ARM Rate Adjustment (yearly on January 1st)
      if (input.isARM && day.dayOfMonth === 1 && day.month === 1 && dayIndex > 0) {
        currentInterestRate = (input.armIndex || 0.05) + (input.armMargin || 0.025);
      }

      // Homestead Year-25 Amortization Switch
      const yearsElapsed = dayIndex / 365.25;
      if (input.isHomesteadLoan && yearsElapsed >= 25 && !homesteadSwitchApplied) {
        // At year 25, Homestead loans switch to traditional amortization
        // This would require calculating a new payment schedule
        // For now, flag that the switch has occurred
        homesteadSwitchApplied = true;
        // TODO: Implement amortization schedule calculation
      }

      // Get deposits and withdrawals for this day
      const deposits = depositSchedule[dayIndex] || 0;
      const withdrawals = withdrawalSchedule[dayIndex] || 0;
      let netCashFlow = deposits - withdrawals;

      // Additional Principal Payment (on 1st of each month)
      if (input.additionalPrincipal && day.dayOfMonth === 1) {
        netCashFlow += input.additionalPrincipal;
      }

      // Calculate credit limit (declines linearly over 20 years = 240 months)
      const monthsElapsed = Math.floor(dayIndex / 30.42);
      const creditLimit = this.calculateCreditLimit(
        input.propertyValue,
        input.loanToValue,
        monthsElapsed
      );

      // Calculate interim balance (balance - net cash flow)
      const interimBalance = currentBalance - netCashFlow;

      // Calculate daily interest accrual (use current rate for ARM loans)
      const dailyInterestRate = currentInterestRate / 365;
      const dailyInterestAccrued = interimBalance * dailyInterestRate;
      accumulatedInterest += dailyInterestAccrued;

      // Interest posting (only on last day of month)
      let interestPosted = 0;
      if (day.isLastDayOfMonth) {
        interestPosted = accumulatedInterest;
        currentBalance += interestPosted;
        accumulatedInterest = 0;
      }

      // Interest payment (21 days after posting)
      let interestPaid = 0;
      if (day.dayOfMonth === 21 && dayIndex >= 21) {
        // Find the interest that was posted 21 days ago
        const posted21DaysAgo = dailyResults[dayIndex - 21]?.interestPosted || 0;
        if (posted21DaysAgo > 0) {
          interestPaid = posted21DaysAgo;
          currentBalance -= interestPaid;
          totalInterestPaid += interestPaid;
        }
      }

      // Apply net cash flow to balance
      currentBalance -= netCashFlow;

      // Check for payoff
      if (currentBalance <= 0 && payoffDayIndex === null) {
        payoffDayIndex = dayIndex;
        currentBalance = 0;
      }

      // Store daily result
      dailyResults.push({
        dayIndex,
        date: day.date,
        startingBalance: currentBalance + netCashFlow - interestPosted + interestPaid,
        netCashFlow,
        interimBalance,
        dailyInterestRate,
        dailyInterestAccrued,
        accumulatedInterest,
        interestPosted,
        interestPaid,
        creditLimit,
        availableCredit: creditLimit - currentBalance,
        deposits,
        withdrawals,
        endingBalance: currentBalance
      });

      // Stop simulation if loan is paid off
      if (payoffDayIndex !== null) {
        break;
      }
    }

    // Calculate summary
    const finalBalance = currentBalance;
    const payoffDate = payoffDayIndex !== null ? calendar[payoffDayIndex].date : null;
    const monthsToPayoff = payoffDayIndex !== null ? Math.ceil(payoffDayIndex / 30.42) : null;

    return {
      dailyResults,
      summary: {
        totalInterestPaid,
        totalInterestAccrued: accumulatedInterest,
        finalBalance,
        payoffDayIndex,
        payoffDate,
        monthsToPayoff
      }
    };
  }

  /**
   * Create deposit schedule based on frequency
   */
  private static createDepositSchedule(
    calendar: CalendarDay[],
    monthlyIncome: number,
    frequency: AccurateCalculationInput['depositFrequency']
  ): number[] {
    const schedule = new Array(calendar.length).fill(0);

    switch (frequency) {
      case 'weekly':
        // Deposit every 7 days
        const weeklyAmount = monthlyIncome / 4.33; // ~4.33 weeks per month
        for (let i = 0; i < calendar.length; i += 7) {
          schedule[i] = weeklyAmount;
        }
        break;

      case 'biweekly':
        // Deposit every 14 days
        const biweeklyAmount = monthlyIncome / 2.17; // ~2.17 biweekly periods per month
        for (let i = 0; i < calendar.length; i += 14) {
          schedule[i] = biweeklyAmount;
        }
        break;

      case 'semi-monthly':
        // Deposit on 1st and 15th of each month
        const semiMonthlyAmount = monthlyIncome / 2;
        calendar.forEach((day, index) => {
          if (day.dayOfMonth === 1 || day.dayOfMonth === 15) {
            schedule[index] = semiMonthlyAmount;
          }
        });
        break;

      case 'monthly':
        // Deposit on 1st of each month
        calendar.forEach((day, index) => {
          if (day.dayOfMonth === 1) {
            schedule[index] = monthlyIncome;
          }
        });
        break;

      case 'quarterly':
        // Deposit every 3 months (1st of Jan, Apr, Jul, Oct)
        const quarterlyAmount = monthlyIncome * 3;
        calendar.forEach((day, index) => {
          if (day.dayOfMonth === 1 && [1, 4, 7, 10].includes(day.month)) {
            schedule[index] = quarterlyAmount;
          }
        });
        break;

      case 'semi-annual':
        // Deposit every 6 months (1st of Jan, Jul)
        const semiAnnualAmount = monthlyIncome * 6;
        calendar.forEach((day, index) => {
          if (day.dayOfMonth === 1 && [1, 7].includes(day.month)) {
            schedule[index] = semiAnnualAmount;
          }
        });
        break;

      case 'annual':
        // Deposit once per year (1st of Jan)
        const annualAmount = monthlyIncome * 12;
        calendar.forEach((day, index) => {
          if (day.dayOfMonth === 1 && day.month === 1) {
            schedule[index] = annualAmount;
          }
        });
        break;
    }

    return schedule;
  }

  /**
   * Create withdrawal schedule (expenses)
   * Weekly expenses are spread across 7 days, all other frequencies are lump-sum
   */
  private static createWithdrawalSchedule(
    calendar: CalendarDay[],
    monthlyExpenses: number,
    expenseFrequency: 'weekly' | 'biweekly' | 'monthly' | 'daily' = 'daily'
  ): number[] {
    const schedule = new Array(calendar.length).fill(0);

    switch (expenseFrequency) {
      case 'daily':
        // Spread evenly across all days
        const dailyExpenses = monthlyExpenses / 30.42;
        for (let i = 0; i < calendar.length; i++) {
          schedule[i] = dailyExpenses;
        }
        break;

      case 'weekly':
        // Weekly expenses spread across 7 days (per AIO Widget source)
        const weeklyExpenseAmount = monthlyExpenses / 4.33; // ~4.33 weeks per month
        const dailyFromWeekly = weeklyExpenseAmount / 7;

        for (let i = 0; i < calendar.length; i++) {
          schedule[i] = dailyFromWeekly;
        }
        break;

      case 'biweekly':
        // Withdrawal every 14 days (lump-sum)
        const biweeklyExpenseAmount = monthlyExpenses / 2.17;
        for (let i = 0; i < calendar.length; i += 14) {
          schedule[i] = biweeklyExpenseAmount;
        }
        break;

      case 'monthly':
        // Withdrawal on 1st of each month (lump-sum)
        calendar.forEach((day, index) => {
          if (day.dayOfMonth === 1) {
            schedule[index] = monthlyExpenses;
          }
        });
        break;
    }

    return schedule;
  }

  /**
   * Calculate credit limit with 20-year linear decline
   */
  private static calculateCreditLimit(
    propertyValue: number,
    loanToValue: number,
    monthsElapsed: number
  ): number {
    const maxCredit = propertyValue * loanToValue;
    const declineMonths = 240; // 20 years

    if (monthsElapsed > declineMonths) {
      return 0;
    }

    const remainingMonths = declineMonths - monthsElapsed;
    return maxCredit * (remainingMonths / declineMonths);
  }
}
