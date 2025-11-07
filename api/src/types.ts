// Mortgage and loan types
export interface MortgageDetails {
  currentBalance: number;
  interestRate: number;
  monthlyPayment: number;
  remainingTermMonths: number;
  propertyValue: number;
  currentHousingPayment: number;
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
  monthlyBreakdown: MonthlyBreakdown[]; // NEW: Month-by-month analysis
  flaggedTransactions: Transaction[]; // NEW: Transactions requiring review
  confidence: number;
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
  interestSavings?: number;
  monthsSaved?: number;
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

// OpenAI analysis types
export interface OpenAIAnalysisResult {
  transactions: Transaction[];
  summary: string;
  confidence: number;
}
