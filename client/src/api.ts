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

  // For 5+ files, use batch processing
  console.log(`📦 Using batch processing for ${files.length} files (${BATCH_SIZE} per batch)`);

  const batchId = `batch_${Date.now()}_${Math.random().toString(36).substring(7)}`;
  const batches: File[][] = [];

  // Split files into batches
  for (let i = 0; i < files.length; i += BATCH_SIZE) {
    batches.push(files.slice(i, i + BATCH_SIZE));
  }

  console.log(`📊 Created ${batches.length} batches`);

  // Process each batch sequentially
  for (let i = 0; i < batches.length; i++) {
    const batch = batches[i];
    const batchNumber = i + 1;

    if (onProgress) {
      onProgress({
        current: i + 1,
        total: batches.length,
        message: `Processing batch ${batchNumber} of ${batches.length} (${batch.length} files)...`,
      });
    }

    console.log(`🚀 Processing batch ${batchNumber}/${batches.length} (${batch.length} files)`);

    const formData = new FormData();
    batch.forEach((file) => {
      formData.append('files', file);
    });
    formData.append('currentHousingPayment', currentHousingPayment.toString());
    formData.append('batchId', batchId);
    formData.append('batchNumber', batchNumber.toString());
    formData.append('totalBatches', batches.length.toString());

    try {
      await api.post('/analyze-statements-batch', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
        timeout: 180000, // 3 minutes per batch
      });
      console.log(`✅ Batch ${batchNumber} completed`);
    } catch (error) {
      console.error(`❌ Batch ${batchNumber} failed:`, error);
      throw new Error(`Failed to process batch ${batchNumber}: ${error}`);
    }
  }

  // Combine all batch results
  if (onProgress) {
    onProgress({
      current: batches.length,
      total: batches.length,
      message: 'Combining results...',
    });
  }

  console.log(`🎯 Combining ${batches.length} batches...`);

  const response = await api.post(`/batch-complete/${batchId}`, {
    totalBatches: batches.length,
    currentHousingPayment,
  });

  console.log(`✅ All batches combined successfully`);

  return response.data.cashFlow;
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
