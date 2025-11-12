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
 * TWO-PHASE ARCHITECTURE: Extract-then-categorize pattern
 * Phase 1: Extract transactions from PDFs (slow, parallelized 2 at a time)
 * Phase 2: Categorize in small 15-transaction chunks (fast, 10 concurrent)
 * Phase 3: Aggregate results locally on frontend
 */
export const analyzeStatements = async (
  files: File[],
  currentHousingPayment: number,
  onProgress?: (progress: { current: number; total: number; message: string; phase?: string }) => void
): Promise<CashFlowAnalysis> => {
  console.log(`\n🚀 ===== TWO-PHASE ANALYSIS =====`);
  console.log(`📁 Files to process: ${files.length}`);
  console.log(`💰 Housing payment: $${currentHousingPayment}`);

  // ===== PHASE 1: EXTRACTION =====
  console.log(`\n📄 PHASE 1: Extracting transactions from ${files.length} file(s)...`);

  if (onProgress) {
    onProgress({
      current: 0,
      total: files.length,
      message: `Extracting transactions from ${files.length} file${files.length === 1 ? '' : 's'}...`,
      phase: 'extraction',
    });
  }

  // Process files one at a time for extraction (to stay under Vercel's 4.5MB body limit)
  const EXTRACTION_BATCH_SIZE = 1;
  const extractionBatches: File[][] = [];

  for (let i = 0; i < files.length; i += EXTRACTION_BATCH_SIZE) {
    extractionBatches.push(files.slice(i, i + EXTRACTION_BATCH_SIZE));
  }

  console.log(`📦 Created ${extractionBatches.length} extraction batches (${EXTRACTION_BATCH_SIZE} file per batch)`);

  let allTransactions: any[] = [];
  let filesProcessed = 0;

  // Process extraction batches with controlled concurrency (2 at a time)
  const CONCURRENT_EXTRACTIONS = 2;
  for (let i = 0; i < extractionBatches.length; i += CONCURRENT_EXTRACTIONS) {
    const currentBatchGroup = extractionBatches.slice(i, i + CONCURRENT_EXTRACTIONS);

    const groupPromises = currentBatchGroup.map(async (batch, idx) => {
      const batchNum = i + idx + 1;
      console.log(`\n📦 Processing extraction batch ${batchNum}/${extractionBatches.length} (${batch.length} file)...`);

      const formData = new FormData();
      batch.forEach((file) => {
        formData.append('files', file);
      });

      try {
        const response = await api.post('/extract-transactions', formData, {
          headers: {
            'Content-Type': 'multipart/form-data',
          },
          timeout: 300000, // 5 minutes per extraction batch
        });

        const extractedTransactions = response.data.transactions;
        console.log(`✅ Batch ${batchNum} extracted ${extractedTransactions.length} transactions`);

        return {
          success: true,
          transactions: extractedTransactions,
          batchNum,
        };
      } catch (error) {
        console.error(`❌ Extraction batch ${batchNum} failed:`, error);
        return {
          success: false,
          batchNum,
          error,
        };
      }
    });

    const groupResults = await Promise.all(groupPromises);

    // Check for failures
    const failures = groupResults.filter(r => !r.success);
    if (failures.length > 0) {
      throw new Error(`Failed to extract transactions from batch(es): ${failures.map(f => f.batchNum).join(', ')}`);
    }

    // Add successful results
    groupResults.forEach(result => {
      if (result.success) {
        allTransactions = allTransactions.concat(result.transactions);
        filesProcessed++;

        if (onProgress) {
          onProgress({
            current: filesProcessed,
            total: files.length,
            message: `Extracted ${allTransactions.length} transactions from ${filesProcessed}/${files.length} files`,
            phase: 'extraction',
          });
        }
      }
    });
  }

  console.log(`\n✅ PHASE 1 COMPLETE: Extracted ${allTransactions.length} total transactions from ${files.length} files`);

  // ===== PHASE 2: CATEGORIZATION =====
  console.log(`\n🏷️  PHASE 2: Categorizing ${allTransactions.length} transactions...`);

  const CATEGORIZATION_CHUNK_SIZE = 15; // Small chunks for fast, reliable categorization
  const chunks: any[][] = [];

  for (let i = 0; i < allTransactions.length; i += CATEGORIZATION_CHUNK_SIZE) {
    chunks.push(allTransactions.slice(i, i + CATEGORIZATION_CHUNK_SIZE));
  }

  console.log(`📦 Created ${chunks.length} categorization chunks (${CATEGORIZATION_CHUNK_SIZE} transactions per chunk)`);

  if (onProgress) {
    onProgress({
      current: 0,
      total: allTransactions.length,
      message: `Categorizing transactions in ${chunks.length} chunks...`,
      phase: 'categorization',
    });
  }

  // Process chunks with controlled concurrency (10 at a time for fast processing)
  const CONCURRENT_CHUNKS = 10;
  const categorizedChunks: any[] = [];
  let transactionsProcessed = 0;

  for (let i = 0; i < chunks.length; i += CONCURRENT_CHUNKS) {
    const currentChunkGroup = chunks.slice(i, i + CONCURRENT_CHUNKS);
    const chunkNumbersInGroup = currentChunkGroup.map((_, idx) => i + idx + 1);

    console.log(`\n🔄 Processing categorization group: chunks [${chunkNumbersInGroup.join(', ')}] of ${chunks.length}`);

    // Process this group in parallel
    const groupPromises = currentChunkGroup.map(async (chunk, idx) => {
      const chunkNumber = i + idx + 1;
      const startIdx = (chunkNumber - 1) * CATEGORIZATION_CHUNK_SIZE;
      const endIdx = Math.min(startIdx + CATEGORIZATION_CHUNK_SIZE, allTransactions.length);

      console.log(`   📝 Chunk ${chunkNumber}: transactions ${startIdx + 1}-${endIdx} of ${allTransactions.length}`);

      try {
        const response = await api.post('/categorize-chunk', {
          transactions: chunk,
          currentHousingPayment,
          chunkNumber,
          totalChunks: chunks.length,
        }, {
          timeout: 60000, // 60 seconds per chunk (plenty of time for small chunks)
        });

        return {
          success: true,
          data: response.data,
          chunkNumber,
          startIdx,
          endIdx,
        };
      } catch (error) {
        console.error(`❌ Chunk ${chunkNumber} failed:`, error);
        return {
          success: false,
          error,
          chunkNumber,
          startIdx,
          endIdx,
        };
      }
    });

    const groupResults = await Promise.all(groupPromises);

    // Check for failures
    const failures = groupResults.filter(r => !r.success);
    if (failures.length > 0) {
      throw new Error(`Failed to categorize ${failures.length} chunk(s): ${failures.map(f => f.chunkNumber).join(', ')}`);
    }

    // Add successful results
    groupResults.forEach(result => {
      if (result.success) {
        categorizedChunks.push(result.data);
        transactionsProcessed += result.data.transactions.length;

        console.log(`   ✅ Chunk ${result.chunkNumber} done: ${result.data.transactions.length} transactions categorized`);

        if (onProgress) {
          onProgress({
            current: transactionsProcessed,
            total: allTransactions.length,
            message: `Processing transactions ${result.startIdx + 1}-${result.endIdx} of ${allTransactions.length}`,
            phase: 'categorization',
          });
        }
      }
    });

    console.log(`✅ Group complete: ${transactionsProcessed}/${allTransactions.length} transactions categorized`);
  }

  console.log(`\n✅ PHASE 2 COMPLETE: Categorized all ${allTransactions.length} transactions`);

  // ===== PHASE 3: AGGREGATION (Local) =====
  console.log(`\n📊 PHASE 3: Aggregating results...`);

  if (onProgress) {
    onProgress({
      current: allTransactions.length,
      total: allTransactions.length,
      message: 'Aggregating results...',
      phase: 'aggregation',
    });
  }

  // Combine all categorized transactions
  const allCategorizedTransactions = categorizedChunks.flatMap(chunk => chunk.transactions || []);

  // Calculate totals
  const totalIncome = categorizedChunks.reduce((sum, chunk) => sum + (chunk.totalIncome || 0), 0);
  const totalExpenses = categorizedChunks.reduce((sum, chunk) => sum + (chunk.totalExpenses || 0), 0);
  const avgConfidence = categorizedChunks.reduce((sum, chunk) => sum + (chunk.confidence || 0.8), 0) / categorizedChunks.length;

  // Calculate monthly breakdown
  const monthlyMap = new Map<string, any>();
  allCategorizedTransactions.forEach(t => {
    const month = t.monthYear || t.date?.substring(0, 7); // YYYY-MM
    if (!month) return;

    if (!monthlyMap.has(month)) {
      monthlyMap.set(month, {
        month,
        income: 0,
        expenses: 0,
        netCashFlow: 0,
        transactionCount: 0,
      });
    }

    const monthData = monthlyMap.get(month);
    monthData.transactionCount++;

    if (t.category === 'income') {
      monthData.income += Math.abs(t.amount);
    } else if (t.category === 'expense' || t.category === 'housing' || t.category === 'one-time') {
      // Count ALL non-income transactions as expenses for cash flow calculation
      monthData.expenses += Math.abs(t.amount);
    }

    monthData.netCashFlow = monthData.income - monthData.expenses;
  });

  const monthlyBreakdown = Array.from(monthlyMap.values()).sort((a, b) => a.month.localeCompare(b.month));

  // Extract flagged transactions
  const flaggedTransactions = allCategorizedTransactions.filter(t => t.flagged === true);

  // Deduplicate transactions
  const { uniqueTransactions, duplicateTransactions } = deduplicateTransactions(allCategorizedTransactions);

  // Calculate monthly averages
  const monthsAnalyzed = monthlyBreakdown.length || 1;
  const monthlyDeposits = totalIncome / monthsAnalyzed;
  const monthlyExpenses = totalExpenses / monthsAnalyzed;
  // Note: monthlyExpenses now includes housing, one-time, and regular expenses
  // Don't subtract currentHousingPayment again to avoid double-counting
  const monthlyLeftover = monthlyDeposits - monthlyExpenses;
  const averageMonthlyBalance = Math.max(0, monthlyLeftover);

  console.log(`\n📈 FINAL RESULTS:`);
  console.log(`   ✓ Total transactions: ${uniqueTransactions.length}`);
  console.log(`   ✓ Duplicates removed: ${duplicateTransactions.length}`);
  console.log(`   ✓ Flagged for review: ${flaggedTransactions.length}`);
  console.log(`   ✓ Months analyzed: ${monthsAnalyzed}`);
  console.log(`   ✓ Monthly income: $${monthlyDeposits.toFixed(2)}`);
  console.log(`   ✓ Monthly expenses: $${monthlyExpenses.toFixed(2)}`);
  console.log(`   ✓ Monthly leftover: $${monthlyLeftover.toFixed(2)}`);
  console.log(`   ✓ Confidence: ${(avgConfidence * 100).toFixed(0)}%`);

  return {
    transactions: uniqueTransactions,
    totalIncome,
    totalExpenses,
    monthlyDeposits,
    monthlyExpenses,
    netCashFlow: monthlyLeftover,
    depositFrequency: 'monthly',
    monthlyLeftover,
    averageMonthlyBalance,
    monthlyBreakdown,
    flaggedTransactions,
    duplicateTransactions,
    confidence: avgConfidence,
  };
};

/**
 * Deduplicate transactions based on date, amount, and description similarity
 */
function deduplicateTransactions(transactions: any[]): {
  uniqueTransactions: any[];
  duplicateTransactions: any[];
} {
  const uniqueTransactions: any[] = [];
  const duplicateTransactions: any[] = [];
  const transactionKeys = new Map<string, any>();

  const createTransactionKey = (t: any): string => {
    const normalizedDesc = (t.description || '')
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, '')
      .replace(/\s+/g, ' ')
      .trim()
      .substring(0, 50);

    const normalizedAmount = Math.abs(parseFloat(t.amount) || 0).toFixed(2);
    const date = new Date(t.date);
    const normalizedDate = isNaN(date.getTime()) ? t.date : date.toISOString().split('T')[0];

    return `${normalizedDate}|${normalizedAmount}|${normalizedDesc}`;
  };

  transactions.forEach((transaction) => {
    const key = createTransactionKey(transaction);

    if (transactionKeys.has(key)) {
      duplicateTransactions.push({
        ...transaction,
        isDuplicate: true,
        duplicateOf: key,
      });
    } else {
      transactionKeys.set(key, transaction);
      uniqueTransactions.push({
        ...transaction,
        isDuplicate: false,
      });
    }
  });

  return { uniqueTransactions, duplicateTransactions };
}

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
