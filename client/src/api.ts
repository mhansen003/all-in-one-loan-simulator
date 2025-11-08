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

// Analyze bank statements
export const analyzeStatements = async (
  files: File[],
  currentHousingPayment: number
): Promise<CashFlowAnalysis> => {
  const formData = new FormData();
  files.forEach((file) => {
    formData.append('files', file);
  });
  formData.append('currentHousingPayment', currentHousingPayment.toString());

  const response = await api.post('/analyze-statements', formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
    timeout: 900000, // 15 minutes for statement analysis (processing multiple images)
  });

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
