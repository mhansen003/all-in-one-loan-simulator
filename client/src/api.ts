import axios from 'axios';
import type {
  MortgageDetails,
  CashFlowAnalysis,
  EligibilityResult,
  SimulationResult,
} from './types';

const API_BASE_URL = import.meta.env.VITE_API_URL || '/api';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 600000, // 10 minutes default timeout for all API calls
});

// Health check
export const checkHealth = async (): Promise<{ status: string }> => {
  const response = await api.get('/health');
  return response.data;
};

/**
 * HOTFIX: Using old single-file batch architecture until server TypeScript errors are fixed
 * Sends 1 file at a time to /api/analyze-statements (old endpoint that works)
 */
export const analyzeStatements = async (
  files: File[],
  currentHousingPayment: number,
  onProgress?: (progress: { current: number; total: number; message: string }) => void
): Promise<CashFlowAnalysis> => {
  const BATCH_SIZE = 1; // Process 1 file at a time to stay under Vercel's 4.5MB body size limit

  console.log(`📦 Using batch processing for ${files.length} file${files.length === 1 ? '' : 's'} (${BATCH_SIZE} per batch)`);

  const batches: File[][] = [];

  // Split files into batches
  for (let i = 0; i < files.length; i += BATCH_SIZE) {
    batches.push(files.slice(i, i + BATCH_SIZE));
  }

  console.log(`📊 Created ${batches.length} batches`);

  // Notify that batches are starting with controlled concurrency
  if (onProgress) {
    onProgress({
      current: 0,
      total: batches.length,
      message: `Processing ${batches.length} batches (2 at a time to avoid rate limits)...`,
    });
  }

  console.log(`🚀 Processing ${batches.length} batches with controlled concurrency (2 at a time)`);

  // Helper function to process a single batch with retry logic
  const processBatchWithRetry = async (
    batch: File[],
    batchNumber: number,
    maxRetries = 3
  ): Promise<CashFlowAnalysis> => {
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        console.log(`📦 Starting batch ${batchNumber}/${batches.length} (${batch.length} files) - Attempt ${attempt}`);

        const formData = new FormData();
        batch.forEach((file) => {
          formData.append('files', file);
        });
        formData.append('currentHousingPayment', currentHousingPayment.toString());

        const response = await api.post('/analyze-statements', formData, {
          headers: {
            'Content-Type': 'multipart/form-data',
          },
          timeout: 300000, // 5 minutes
        });

        console.log(`✅ Batch ${batchNumber} completed successfully`);
        return response.data.cashFlow;
      } catch (error: any) {
        console.error(`❌ Batch ${batchNumber} failed (attempt ${attempt}/${maxRetries}):`, error.message);

        if (attempt === maxRetries) {
          throw error;
        }

        // Exponential backoff: 2s, 4s, 8s
        const delay = Math.pow(2, attempt) * 1000;
        console.log(`⏳ Retrying batch ${batchNumber} in ${delay / 1000} seconds...`);
        await new Promise((resolve) => setTimeout(resolve, delay));
      }
    }

    throw new Error(`Failed to process batch ${batchNumber} after ${maxRetries} attempts`);
  };

  // Process batches with controlled concurrency (2 at a time)
  const CONCURRENT_BATCHES = 2;
  const results: CashFlowAnalysis[] = [];

  for (let i = 0; i < batches.length; i += CONCURRENT_BATCHES) {
    const currentBatchGroup = batches.slice(i, i + CONCURRENT_BATCHES);
    const batchNumbers = currentBatchGroup.map((_, idx) => i + idx + 1);

    console.log(`🔄 Processing batch group: ${batchNumbers.join(', ')} of ${batches.length}`);

    const groupPromises = currentBatchGroup.map((batch, idx) =>
      processBatchWithRetry(batch, i + idx + 1)
    );

    const groupResults = await Promise.all(groupPromises);
    results.push(...groupResults);

    // Update progress
    if (onProgress) {
      onProgress({
        current: Math.min(i + CONCURRENT_BATCHES, batches.length),
        total: batches.length,
        message: `Processed ${Math.min(i + CONCURRENT_BATCHES, batches.length)}/${batches.length} batches`,
      });
    }
  }

  console.log(`✅ All ${batches.length} batches completed. Aggregating results...`);

  // Aggregate results from all batches
  const allTransactions = results.flatMap((r) => r.transactions || []);
  const totalIncome = results.reduce((sum, r) => sum + (r.totalIncome || 0), 0);
  const totalExpenses = results.reduce((sum, r) => sum + (r.totalExpenses || 0), 0);
  const monthlyDeposits = results.reduce((sum, r) => sum + (r.monthlyDeposits || 0), 0) / Math.max(results.length, 1);
  const monthlyExpenses = results.reduce((sum, r) => sum + (r.monthlyExpenses || 0), 0) / Math.max(results.length, 1);
  const monthlyLeftover = monthlyDeposits - monthlyExpenses - currentHousingPayment;

  // Combine monthly breakdowns
  const monthlyMap = new Map<string, any>();
  results.forEach((result) => {
    result.monthlyBreakdown?.forEach((monthData) => {
      const existing = monthlyMap.get(monthData.month);
      if (existing) {
        existing.income += monthData.income;
        existing.expenses += monthData.expenses;
        existing.netCashFlow += monthData.netCashFlow;
        existing.transactionCount += monthData.transactionCount;
      } else {
        monthlyMap.set(monthData.month, { ...monthData });
      }
    });
  });

  const monthlyBreakdown = Array.from(monthlyMap.values()).sort((a, b) =>
    a.month.localeCompare(b.month)
  );

  // Combine flagged transactions
  const flaggedTransactions = results.flatMap((r) => r.flaggedTransactions || []);
  const duplicateTransactions = results.flatMap((r) => r.duplicateTransactions || []);

  const avgConfidence = results.reduce((sum, r) => sum + (r.confidence || 0.8), 0) / results.length;

  console.log(`📊 Aggregated ${allTransactions.length} total transactions`);

  return {
    transactions: allTransactions,
    totalIncome,
    totalExpenses,
    monthlyDeposits,
    monthlyExpenses,
    netCashFlow: monthlyLeftover,
    depositFrequency: 'monthly',
    monthlyLeftover,
    averageMonthlyBalance: Math.max(0, monthlyLeftover),
    monthlyBreakdown,
    flaggedTransactions,
    duplicateTransactions,
    confidence: avgConfidence,
  };
};

// Check eligibility
export const checkEligibility = async (
  mortgageDetails: MortgageDetails,
  cashFlow: CashFlowAnalysis
): Promise<EligibilityResult> => {
  const response = await api.post('/calculate-eligibility', {
    mortgageDetails,
    cashFlow,
  });

  return response.data.eligibility;
};

// Run loan simulation
export const simulateLoan = async (
  mortgageDetails: MortgageDetails,
  cashFlow: CashFlowAnalysis
): Promise<SimulationResult> => {
  const response = await api.post('/simulate-loan', {
    mortgageDetails,
    cashFlow,
  });

  return response.data.simulation;
};

export default api;
