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
  const BATCH_SIZE = 3; // Process 3 files at a time to stay under 3-minute timeout

  // If 4 or fewer files, use single request (faster)
  if (files.length <= 4) {
    console.log(`📤 Uploading ${files.length} files in single request`);
    const formData = new FormData();
    files.forEach((file) => {
      formData.append('files', file);
    });
    formData.append('currentHousingPayment', currentHousingPayment.toString());

    const response = await api.post('/analyze-statements', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
      timeout: 180000, // 3 minutes (Vercel limit)
    });

    return response.data.cashFlow;
  }

  // For 5+ files, use batch processing (client-side storage)
  console.log(`📦 Using batch processing for ${files.length} files (${BATCH_SIZE} per batch)`);

  const batches: File[][] = [];

  // Split files into batches
  for (let i = 0; i < files.length; i += BATCH_SIZE) {
    batches.push(files.slice(i, i + BATCH_SIZE));
  }

  console.log(`📊 Created ${batches.length} batches`);

  // Notify that all batches are starting in parallel
  if (onProgress) {
    onProgress({
      current: 1,
      total: batches.length,
      message: `Processing all ${batches.length} batches in parallel (${files.length} files total)...`,
    });
  }

  console.log(`🚀 Processing all ${batches.length} batches in PARALLEL`);

  // Process all batches in parallel using Promise.all
  const batchPromises = batches.map(async (batch, index) => {
    const batchNumber = index + 1;
    console.log(`📦 Starting batch ${batchNumber}/${batches.length} (${batch.length} files)`);

    const formData = new FormData();
    batch.forEach((file) => {
      formData.append('files', file);
    });
    formData.append('currentHousingPayment', currentHousingPayment.toString());

    try {
      // Use the regular analyze-statements endpoint
      const response = await api.post('/analyze-statements', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
        timeout: 180000, // 3 minutes per batch
      });

      console.log(`✅ Batch ${batchNumber} completed`);
      return response.data.cashFlow;
    } catch (error) {
      console.error(`❌ Batch ${batchNumber} failed:`, error);
      throw new Error(`Failed to process batch ${batchNumber}: ${error}`);
    }
  });

  // Wait for all batches to complete
  const batchResults = await Promise.all(batchPromises);
  console.log(`✅ All ${batches.length} batches completed in parallel`);

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
