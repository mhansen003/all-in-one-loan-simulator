// Loan and borrower information types
export interface MortgageDetails {
  currentBalance: number;
  interestRate: number;
  monthlyPayment: number;
  remainingTermMonths: number;
  propertyValue: number;
  currentHousingPayment: number; // To exclude from cash flow
}

export interface BankStatement {
  file: File;
  month: string;
  year: string;
}

export interface Transaction {
  date: string;
  description: string;
  amount: number;
  category: 'income' | 'expense' | 'housing' | 'one-time' | 'recurring';
  excluded?: boolean;
  flagged?: boolean; // AI flagged as potentially irregular
  flagReason?: string; // Why it was flagged (luxury, one-time, unusually large, etc.)
  monthYear?: string; // Month/Year for grouping (e.g., "2024-08")
}

export interface MonthlyBreakdown {
  month: string; // "2024-08"
  income: number;
  expenses: number;
  netCashFlow: number;
  transactionCount: number;
}

export interface CashFlowAnalysis {
  totalIncome: number;
  totalExpenses: number;
  netCashFlow: number;
  averageMonthlyBalance: number;
  transactions: Transaction[];
  monthlyBreakdown: MonthlyBreakdown[];
  flaggedTransactions: Transaction[];
  confidence: number;
  // NEW: Detailed breakdown for AIO calculation
  monthlyDeposits?: number;        // Total monthly income/deposits
  monthlyExpenses?: number;        // Total monthly expenses (including housing)
  monthlyLeftover?: number;        // Net leftover (deposits - expenses)
  depositFrequency?: 'monthly' | 'biweekly' | 'weekly';
}

export interface EligibilityResult {
  eligible: boolean;
  ltv: number;
  ltvPassed: boolean;
  cashFlowSufficient: boolean;
  cashFlowPassed: boolean;
  reasons: string[];
}

export interface LoanProjection {
  type: 'traditional' | 'all-in-one';
  monthlyPayment: number;
  totalInterestPaid: number;
  payoffDate: Date;
  payoffMonths: number;
  interestSavings?: number; // For All-In-One comparison
  monthsSaved?: number; // For All-In-One comparison
}

export interface SimulationResult {
  traditionalLoan: LoanProjection;
  allInOneLoan: LoanProjection;
  comparison: {
    interestSavings: number;
    timeSavedMonths: number;
    percentageSavings: number;
  };
}

// API response types
export interface AnalysisResponse {
  cashFlow: CashFlowAnalysis;
  message: string;
}

export interface EligibilityResponse {
  eligibility: EligibilityResult;
  message: string;
}

export interface SimulationResponse {
  simulation: SimulationResult;
  message: string;
}

// App state types
export type AppStep =
  | 'mortgage-details'
  | 'manual-cash-flow'
  | 'aio-proposal'
  | 'comparison'
  | 'upload-statements'
  | 'analyzing'
  | 'cash-flow-review'
  | 'eligibility'
  | 'simulation'
  | 'results'
  | 'proposal-builder';

export interface AppState {
  currentStep: AppStep;
  mortgageDetails: Partial<MortgageDetails>;
  bankStatements: File[];
  cashFlowAnalysis: CashFlowAnalysis | null;
  eligibilityResult: EligibilityResult | null;
  simulationResult: SimulationResult | null;
}
