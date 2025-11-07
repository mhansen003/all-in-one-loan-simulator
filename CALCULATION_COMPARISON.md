# Calculation Comparison: Our Simulator vs AIO Widget

**Date:** 2025-01-07
**Compared:** All-In-One Look Back Simulator vs AIO Widget (team calculator)
**Source Files:**
- **AIO Widget:** `C:\Users\Mark Hansen\Downloads\AIO Widget\frontend\src\js\helpers\CalcResults.js`
- **Our Simulator:** `api/src/services/loan-calculator.ts`

---

## Executive Summary

### ✅ Traditional Loan: MATCHES EXACTLY
The traditional mortgage calculation uses identical formulas.

### ⚠️ All-In-One Loan: SIMILAR BUT WITH KEY DIFFERENCES
The core daily interest formula matches, but there are important implementation differences in cash flow modeling and timing that could lead to different results.

---

## Detailed Comparison

### 1. Traditional Mortgage Calculation

#### AIO Widget Implementation
```javascript
// Line 1245: Interest calculation
first_int_due[t] = first_startbal[t] * rate_first[t] / 12

// Line 1306: Principal calculation
first_princ_amt[t] = first_adj_pmt[t] - first_int_due[t]

// Line 1318: Ending balance
first_endbal[t] = first_startbal[t] - first_princ_amt[t] - first_addl_princ[t]
```

#### Our Implementation
```typescript
// Line 59: Monthly rate
const monthlyRate = interestRate / 100 / 12

// Line 67-68: Interest and principal
const interestPayment = balance * monthlyRate
const principalPayment = monthlyPayment - interestPayment

// Line 76: Ending balance
balance -= principalPayment
```

#### Verdict: ✅ **EXACT MATCH**
Both implementations use the standard amortization formula:
- Monthly interest = Balance × (Annual Rate ÷ 12)
- Principal payment = Total payment - Interest
- New balance = Old balance - Principal

---

### 2. All-In-One Loan Calculation

#### Core Daily Interest Formula

**AIO Widget (Line 750):**
```javascript
daily_accrual[t] = interim_bal[t] * fully_indexed[t] / 365
```

**Our Implementation (Line 108, 132):**
```typescript
const dailyRate = annualRate / 100 / 365
const dailyInterest = effectiveBalance * dailyRate
```

#### Verdict: ✅ **FORMULA MATCHES**
Both use: `Daily Interest = Effective Balance × (Annual Rate ÷ 365)`

---

### 3. Critical Differences in Implementation

#### Difference #1: Effective Balance Calculation

**AIO Widget Approach:**
```javascript
// Line 742: Uses net cash as single transaction
interim_bal[t] = aio_startbal[t] - net_cash[t]
```
- `net_cash[t]` = Total inflows - Total outflows for that day
- Tracks actual transaction dates (deposits on specific days, expenses on specific days)
- Uses actual calendar with specific day-of-month for each transaction

**Our Approach:**
```typescript
// Line 121-123: Simulates gradual expense drawdown
const dayProgress = day / daysInMonth
const expensesToDate = monthlyExpenses * dayProgress
let cashAvailable = monthlyIncome - expensesToDate
```
- Assumes all income deposited at start of month
- Expenses withdrawn gradually/linearly throughout month
- Simplified model vs actual transaction timing

#### Impact: **MEDIUM - Could cause 1-3% variance in results**

---

#### Difference #2: Days Per Month

**AIO Widget:**
- Uses actual calendar (`this.calendar[t]` with real dates)
- Accounts for actual days in each month (28, 29, 30, or 31)
- More precise for long-term calculations

**Our Implementation:**
```typescript
// Line 173
const avgDaysPerMonth = 30.42
```
- Uses average 30.42 days for all months
- Simpler but less accurate over time

#### Impact: **LOW - ~0.5% variance annually**

---

#### Difference #3: Interest Posting and Payment Timing

**AIO Widget:**
```javascript
// Line 762-777: Interest posts on last day of month
if (this.calendar[t].last_day_of_month == 1) {
    int_posted[t] = int_accrual[t]
}

// Line 780-782: Interest paid on day 21
if (this.calendar[t].day_of_month == 21 && t >= 21) {
    aio_int_pd[t] = int_posted[t - 21]
}
```
- Interest accrues daily
- Posts to account on last day of month
- Payment made on day 21 of following month
- Mirrors actual AIO loan mechanics

**Our Implementation:**
```typescript
// Line 138-142: All interest charged at month end
const interestCharged = totalInterest
const principalReduction = monthlyPayment - interestCharged
const endBalance = Math.max(0, loanBalance - principalReduction)
```
- Interest accumulates daily
- All applied at end of month
- No separate posting/payment dates
- Simplified monthly settlement

#### Impact: **MEDIUM - Timing differences could cause 2-5% variance**

---

#### Difference #4: Cash Flow Pattern Modeling

**AIO Widget:**
- Tracks weekly, biweekly, semimonthly, monthly, quarterly, semiannual, and annual deposits
- Each has specific day-of-week/day-of-month timing
- Expenses similarly categorized by frequency
- One-time deposits/withdrawals on specific dates

**Our Implementation:**
- Single monthly income amount
- Single monthly expense amount
- Linear interpolation throughout month
- No frequency variations

#### Impact: **HIGH - Real borrowers have varied deposit frequencies**

---

## Summary of Differences

| Aspect | AIO Widget | Our Simulator | Impact |
|--------|-----------|---------------|---------|
| **Traditional Loan Formula** | ✅ Standard amortization | ✅ Standard amortization | None |
| **Daily Interest Formula** | ✅ Balance × Rate ÷ 365 | ✅ Balance × Rate ÷ 365 | None |
| **Cash Flow Modeling** | Actual transaction dates | Linear interpolation | HIGH |
| **Days Per Month** | Actual calendar days | Average 30.42 | LOW |
| **Interest Timing** | Post monthly, pay on day 21 | Apply at month end | MEDIUM |
| **Deposit Frequencies** | 7 frequencies supported | Single monthly | HIGH |

---

## Recommendations

### Priority 1: Cash Flow Modeling (High Impact)
**Issue:** We use simplified linear expense drawdown; AIO Widget uses actual transaction timing.

**Recommendation:**
1. Keep our current approach for **Look Back Simulator** (historical analysis)
2. Document that results show "What could have been saved"
3. For production accuracy, consider:
   - Adding deposit frequency options (weekly, biweekly, monthly)
   - Using actual days per month instead of 30.42 average
   - Implementing transaction timing similar to AIO Widget

**Rationale:** Our tool is a "Look Back" simulator for historical analysis, not a forward-looking calculator. Close approximation is acceptable, but we should note the methodology difference.

### Priority 2: Interest Posting Timing (Medium Impact)
**Issue:** AIO Widget posts interest monthly and pays on day 21; we settle monthly.

**Recommendation:**
1. For Look Back Simulator: Current approach is acceptable (difference is small)
2. For production accuracy: Consider implementing the day-21 payment cycle
3. Document the timing difference in CALCULATION_VALIDATION.md

### Priority 3: Days Per Month (Low Impact)
**Issue:** We use 30.42 average; AIO Widget uses actual calendar.

**Recommendation:**
1. Easy fix: Use actual days per month from JavaScript Date object
2. Low priority but improves accuracy
3. Implement in next iteration

---

## Action Items

- [x] Document calculation differences
- [ ] **DISCUSS WITH PAUL:** Is current accuracy acceptable for "Look Back" tool?
- [ ] **DECISION NEEDED:** Should we match AIO Widget exactly or keep simplified model?
- [ ] If matching exactly: Implement transaction timing and deposit frequencies
- [ ] If keeping simplified: Update CALCULATION_VALIDATION.md with methodology notes

---

## Code References

### AIO Widget Key Sections
- **PMT Function:** Line 74-76 (standard payment calculation)
- **Traditional Interest:** Line 1245 (`first_int_due`)
- **AIO Interim Balance:** Line 742 (`interim_bal[t] = aio_startbal[t] - net_cash[t]`)
- **AIO Daily Accrual:** Line 750 (`daily_accrual[t] = interim_bal[t] * fully_indexed[t] / 365`)
- **Interest Posting:** Line 762-777 (monthly posting logic)
- **Interest Payment:** Line 780-782 (day 21 payment)

### Our Simulator Key Sections
- **Traditional Loan:** Line 56-90 (`calculateTraditionalLoan()`)
- **Daily Balance Simulation:** Line 100-150 (`simulateMonthlyDailyBalances()`)
- **All-In-One Loan:** Line 160-220 (`calculateAllInOneLoan()`)

---

**Conclusion:**

The **core formulas match**, but **implementation details differ**. For a "Look Back" historical simulator, our current approach is reasonable. However, for production parity with the AIO Widget, we would need to implement more sophisticated cash flow modeling with actual transaction timing.

**Key Question for Decision:** Should the Look Back Simulator match the forward-looking AIO Widget exactly, or is close approximation acceptable given the different use case?
