# ⚠️ Calculation Validation Requirements

## Overview

**CRITICAL:** The All-In-One Look Back Simulator calculations MUST match the existing CMG production simulator EXACTLY.

## Background

From meeting with Paul Akinmade (2025-01-07):
> "What I don't wanna have happen Mark, is that on the simulator you get a different response than in here, so it needs to be the exact calculation."

The Look Back Simulator is designed to show **historical** what-if scenarios, NOT to replace the existing forward-looking simulator. Both tools must produce identical results for the same inputs to maintain consistency and credibility.

## What Needs Validation

### 1. Traditional Loan Calculations
- [ ] Monthly payment calculation (P&I)
- [ ] Amortization schedule generation
- [ ] Total interest calculation over loan term
- [ ] Payoff timeline calculation
- [ ] Early payoff scenarios

**Location:** `api/src/services/loan-calculator.ts` - `calculateTraditionalLoan()`

### 2. All-In-One Loan Calculations
- [ ] Daily interest formula: `(Loan Balance - Cash Available) × (Annual Rate / 365)`
- [ ] Cash flow offset logic (deposits vs expenses)
- [ ] Effective balance calculation
- [ ] Accelerated payoff timeline
- [ ] Interest savings calculation
- [ ] Impact of deposit frequency (monthly/biweekly/weekly)

**Location:** `api/src/services/loan-calculator.ts` - `calculateAllInOneLoan()`

### 3. Cash Flow Analysis
- [ ] Monthly deposit calculation
- [ ] Monthly expense calculation
- [ ] Net leftover calculation
- [ ] Average balance throughout month
- [ ] Impact of timing (when deposits arrive)

**Location:** `client/src/utils/loanCalculations.ts`

## Action Items

### Immediate (High Priority)
1. **Obtain C# Source Code** from existing production simulator
   - Contact: Paul Akinmade or CMG Development Team
   - Request: Complete loan calculation logic from production app
   - Focus on: Daily interest calculation, amortization formulas

2. **Create Test Suite** comparing outputs
   - Input same borrower data to both simulators
   - Compare results for:
     - Monthly payments
     - Payoff dates
     - Total interest
     - Savings calculations
   - Document any discrepancies

3. **Line-by-Line Code Review**
   - Compare TypeScript implementation to C# logic
   - Ensure formula parity
   - Check for rounding differences
   - Verify edge cases

### Secondary (Medium Priority)
4. **Create Automated Tests**
   - Unit tests with known-good outputs from production
   - Integration tests for full simulation flow
   - Regression tests to catch future drift

5. **Document Assumptions**
   - Any differences between implementations
   - Rounding strategies
   - Edge case handling

## Testing Strategy

### Test Scenarios
Create test cases using actual data:

1. **Basic Scenario**
   - Loan: $300,000 @ 7.5% interest
   - Term: 25 years remaining
   - Current payment: $2,098.50
   - Monthly cash flow: $4,800 leftover
   - Expected: Match production simulator exactly

2. **Edge Cases**
   - Very low balance (< $1,000)
   - Very high balance (> $1,000,000)
   - Near-payoff scenarios
   - Negative cash flow
   - Biweekly deposit patterns

3. **Real Borrower Data**
   - Use anonymized actual customer scenarios
   - Validate against known results from production

## Files Requiring Validation

### API/Backend
```
api/src/services/loan-calculator.ts     - Main calculation engine
api/src/services/eligibility-checker.ts - LTV and qualification logic
```

### Client/Frontend
```
client/src/utils/loanCalculations.ts    - Client-side calc utilities
client/src/utils/testCalculation.ts     - Test harness
```

### Test Files
```
test-calculation.js                      - Manual testing script
test-calculation-v*.js                   - Historical test versions
```

## Contact Information

**For C# Source Code:**
- Paul Akinmade (CMG Leadership)
- CMG Development Team

**For Questions:**
- Mark Hansen (Developer)
- Document any findings in this file

## Status

- [x] Validation requirements documented
- [ ] C# source code obtained
- [ ] Test suite created
- [ ] Calculations validated
- [ ] Automated tests added
- [ ] Production approval obtained

---

**Last Updated:** 2025-01-07
**Created By:** Claude Code (based on meeting transcript)
