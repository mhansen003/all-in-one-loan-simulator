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
}

export interface CashFlowAnalysis {
  totalIncome: number;
  totalExpenses: number;
  netCashFlow: number;
  averageMonthlyBalance: number;
  transactions: Transaction[];
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
  | 'upload-statements'
  | 'analyzing'
  | 'cash-flow-review'
  | 'eligibility'
  | 'simulation'
  | 'results';

export interface AppState {
  currentStep: AppStep;
  mortgageDetails: Partial<MortgageDetails>;
  bankStatements: File[];
  cashFlowAnalysis: CashFlowAnalysis | null;
  eligibilityResult: EligibilityResult | null;
  simulationResult: SimulationResult | null;
}
