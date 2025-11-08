/**
 * Calendar Generator for AIO Loan Calculator
 *
 * Generates a 11,020-day calendar (30+ years) with metadata for each day.
 * This matches the source-of-truth implementation from the AIO Widget.
 */

export interface CalendarDay {
  dayIndex: number;           // 0-based index (0 to 11,019)
  date: Date;                 // Actual date
  dayOfMonth: number;         // 1-31
  month: number;              // 1-12
  year: number;               // Full year (e.g., 2025)
  dayOfYear: number;          // 1-366
  isLastDayOfMonth: boolean;  // True if last day of month
  isLeapYear: boolean;        // True if leap year
  daysInMonth: number;        // 28-31
}

export class CalendarGenerator {
  /**
   * Generate a calendar array of 11,020 days starting from a given date
   * @param startDate - Starting date for the calendar
   * @returns Array of CalendarDay objects
   */
  static generateCalendar(startDate: Date = new Date()): CalendarDay[] {
    const calendar: CalendarDay[] = [];
    const totalDays = 11020; // 30+ years

    // Clone the start date to avoid mutation
    const currentDate = new Date(startDate);

    for (let dayIndex = 0; dayIndex < totalDays; dayIndex++) {
      const year = currentDate.getFullYear();
      const month = currentDate.getMonth() + 1; // 1-based
      const dayOfMonth = currentDate.getDate();

      // Calculate if it's the last day of the month
      const nextDay = new Date(currentDate);
      nextDay.setDate(nextDay.getDate() + 1);
      const isLastDayOfMonth = nextDay.getMonth() !== currentDate.getMonth();

      // Calculate day of year
      const startOfYear = new Date(year, 0, 1);
      const dayOfYear = Math.floor((currentDate.getTime() - startOfYear.getTime()) / (1000 * 60 * 60 * 24)) + 1;

      // Check if leap year
      const isLeapYear = this.isLeapYear(year);

      // Get days in current month
      const daysInMonth = this.getDaysInMonth(month, year);

      calendar.push({
        dayIndex,
        date: new Date(currentDate),
        dayOfMonth,
        month,
        year,
        dayOfYear,
        isLastDayOfMonth,
        isLeapYear,
        daysInMonth
      });

      // Move to next day
      currentDate.setDate(currentDate.getDate() + 1);
    }

    return calendar;
  }

  /**
   * Check if a year is a leap year
   */
  static isLeapYear(year: number): boolean {
    return (year % 4 === 0 && year % 100 !== 0) || (year % 400 === 0);
  }

  /**
   * Get number of days in a given month
   */
  static getDaysInMonth(month: number, year: number): number {
    // month is 1-based (1-12)
    const daysInMonth = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];

    if (month === 2 && this.isLeapYear(year)) {
      return 29;
    }

    return daysInMonth[month - 1];
  }

  /**
   * Find the calendar day index for a specific date
   * @param calendar - The generated calendar
   * @param targetDate - Date to find
   * @returns Day index or -1 if not found
   */
  static findDayIndex(calendar: CalendarDay[], targetDate: Date): number {
    const targetTime = targetDate.setHours(0, 0, 0, 0);

    for (let i = 0; i < calendar.length; i++) {
      const calendarTime = new Date(calendar[i].date).setHours(0, 0, 0, 0);
      if (calendarTime === targetTime) {
        return i;
      }
    }

    return -1;
  }

  /**
   * Get all days in a specific month
   * @param calendar - The generated calendar
   * @param month - Month (1-12)
   * @param year - Full year
   * @returns Array of CalendarDay objects for that month
   */
  static getDaysInMonthYear(calendar: CalendarDay[], month: number, year: number): CalendarDay[] {
    return calendar.filter(day => day.month === month && day.year === year);
  }

  /**
   * Get the last day of a specific month
   * @param calendar - The generated calendar
   * @param month - Month (1-12)
   * @param year - Full year
   * @returns CalendarDay object or undefined
   */
  static getLastDayOfMonth(calendar: CalendarDay[], month: number, year: number): CalendarDay | undefined {
    return calendar.find(day => day.month === month && day.year === year && day.isLastDayOfMonth);
  }
}
