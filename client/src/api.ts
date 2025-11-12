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

// Analyze bank statements - with automatic batch processing for large uploads
export const analyzeStatements = async (
  files: File[],
  currentHousingPayment: number,
  onProgress?: (progress: { current: number; total: number; message: string }) => void
): Promise<CashFlowAnalysis> => {
  const BATCH_SIZE = 1; // Process 1 file at a time to stay under Vercel's 4.5MB body size limit

  // Always use batch processing for consistent UI (even for single files)
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
          timeout: 180000, // 3 minutes per batch
        });

        console.log(`✅ Batch ${batchNumber} completed`);
        return response.data.cashFlow;
      } catch (error) {
        console.error(`❌ Batch ${batchNumber} failed (attempt ${attempt}/${maxRetries}):`, error);

        // If this was the last attempt, throw the error
        if (attempt === maxRetries) {
          throw new Error(`Failed to process batch ${batchNumber} after ${maxRetries} attempts: ${error}`);
        }

        // Wait before retrying (exponential backoff: 2s, 4s, 8s)
        const delayMs = Math.pow(2, attempt) * 1000;
        console.log(`⏳ Retrying batch ${batchNumber} in ${delayMs / 1000} seconds...`);
        await new Promise(resolve => setTimeout(resolve, delayMs));
      }
    }

    throw new Error(`Failed to process batch ${batchNumber}`);
  };

  // Process batches with controlled concurrency (2 at a time)
  const CONCURRENT_BATCHES = 2;
  const batchResults: CashFlowAnalysis[] = [];
  let completedCount = 0;

  for (let i = 0; i < batches.length; i += CONCURRENT_BATCHES) {
    // Get the next 2 batches (or fewer if we're at the end)
    const currentBatchGroup = batches.slice(i, i + CONCURRENT_BATCHES);
    const batchNumbersInGroup = currentBatchGroup.map((_, idx) => i + idx + 1);

    console.log(`🔄 Processing batch group: [${batchNumbersInGroup.join(', ')}]`);

    // Process this group of batches in parallel
    const groupPromises = currentBatchGroup.map((batch, idx) =>
      processBatchWithRetry(batch, i + idx + 1)
    );

    // Wait for this group to complete
    const groupResults = await Promise.all(groupPromises);
    batchResults.push(...groupResults);

    completedCount += currentBatchGroup.length;

    // Update progress
    if (onProgress) {
      onProgress({
        current: completedCount,
        total: batches.length,
        message: `Completed ${completedCount}/${batches.length} batches...`,
      });
    }

    // Add a small delay between batch groups to avoid overwhelming the API
    if (i + CONCURRENT_BATCHES < batches.length) {
      console.log('⏳ Short delay before next batch group...');
      await new Promise(resolve => setTimeout(resolve, 1000)); // 1 second delay
    }
  }

  console.log(`✅ All ${batches.length} batches completed`);

  // Combine all batch results (client-side)
  if (onProgress) {
    onProgress({
      current: batches.length,
      total: batches.length,
      message: 'Combining results...',
    });
  }

  console.log(`🎯 Combining ${batches.length} batch results...`);

  // Merge all transactions from all batches
  const allTransactions = batchResults.flatMap(result => result.transactions || []);

  // Calculate totals from all transactions
  const totalIncome = allTransactions
    .filter(t => ['income', 'salary', 'deposit'].includes(t.category?.toLowerCase()) && !t.excluded)
    .reduce((sum, t) => sum + Math.abs(t.amount), 0);

  const totalExpenses = allTransactions
    .filter(t => ['expense', 'recurring', 'payment'].includes(t.category?.toLowerCase()) && !t.excluded)
    .reduce((sum, t) => sum + Math.abs(t.amount), 0);

  // Use the first batch's calculated monthly averages as baseline
  const firstBatch = batchResults[0];

  const combinedCashFlow: CashFlowAnalysis = {
    transactions: allTransactions,
    totalIncome,
    totalExpenses,
    monthlyDeposits: firstBatch.monthlyDeposits || 0,
    monthlyExpenses: firstBatch.monthlyExpenses || 0,
    netCashFlow: (firstBatch.monthlyDeposits || 0) - (firstBatch.monthlyExpenses || 0) - currentHousingPayment,
    depositFrequency: firstBatch.depositFrequency || 'monthly',
    monthlyLeftover: (firstBatch.monthlyDeposits || 0) - (firstBatch.monthlyExpenses || 0) - currentHousingPayment,
    averageMonthlyBalance: firstBatch.averageMonthlyBalance || 0,
    monthlyBreakdown: firstBatch.monthlyBreakdown || [],
    flaggedTransactions: allTransactions.filter(t => t.flagged),
    duplicateTransactions: allTransactions.filter(t => t.isDuplicate),
    confidence: firstBatch.confidence || 0.8,
  };

  console.log(`✅ Combined ${allTransactions.length} transactions from ${batches.length} batches`);

  return combinedCashFlow;
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

// Note: PDF generation is handled client-side in ProposalBuilder.tsx using html2pdf.js
// This API function is not used and backend endpoint returns 501
// Keeping for reference in case server-side PDF generation is needed in the future
/*
export const generateReport = async (
  mortgageDetails: MortgageDetails,
  cashFlow: CashFlowAnalysis,
  simulation: SimulationResult
): Promise<Blob> => {
  const response = await api.post(
    '/generate-report',
    {
      mortgageDetails,
      cashFlow,
      simulation,
    },
    {
      responseType: 'blob',
    }
  );

  return response.data;
};
*/

export default api;
