import OpenAI from 'openai';
import fs from 'fs/promises';
import path from 'path';
import xlsx from 'xlsx';
import type { CashFlowAnalysis, Transaction, OpenAIAnalysisResult } from '../types.js';

// ==================== SMART AI ROUTING ====================
// We use TWO AI clients for optimal performance:
// 1. OpenAI Direct (GPT-4) → CSV/XLSX structured data analysis
// 2. OpenRouter (Gemini) → Images/PDFs vision processing

// Client 1: OpenAI Direct for structured data (CSV/XLSX)
const openaiDirect = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Client 2: OpenRouter with Gemini for vision tasks (images/PDFs)
const openRouter = new OpenAI({
  apiKey: process.env.OPENROUTER_API_KEY,
  baseURL: 'https://openrouter.ai/api/v1',
  defaultHeaders: {
    'HTTP-Referer': process.env.YOUR_SITE_URL || 'https://aio-simulator.cmgfinancial.ai',
    'X-Title': 'All-In-One Look Back Simulator',
  },
});

// Model configurations
const TEXT_MODEL = 'gpt-4o'; // OpenAI Direct - excellent for structured data, JSON analysis
const VISION_MODEL = 'google/gemini-2.0-flash-001'; // OpenRouter Gemini - superior vision, fast, cost-effective

console.log(`🔧 Smart AI Routing Enabled:`);
console.log(`   📊 Text/CSV/XLSX → OpenAI Direct (${TEXT_MODEL})`);
console.log(`   👁️  Images/PDFs → OpenRouter (${VISION_MODEL})`);

/**
 * Note: PDFs are now processed NATIVELY using Gemini 2.0 Flash's PDF capabilities.
 * This eliminates the need for client-side PDF-to-image conversion.
 * The analyzePdf function handles direct PDF analysis.
 */

/**
 * Extract data from Excel/CSV file with intelligent compression
 *
 * OPTIMIZATION: Extract only essential fields and limit to recent months
 * to dramatically reduce token usage while maintaining analysis quality
 */
async function extractDataFromSpreadsheet(filePath: string): Promise<string> {
  try {
    const workbook = xlsx.readFile(filePath);
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    const jsonData = xlsx.utils.sheet_to_json(worksheet);

    console.log(`Original spreadsheet has ${jsonData.length} rows`);

    // Debug: Log first row to see column names
    if (jsonData.length > 0) {
      console.log(`📋 CSV Column names:`, Object.keys(jsonData[0]));
      console.log(`📋 First row sample:`, jsonData[0]);
    }

    // Helper to convert Excel serial date to ISO date string
    const excelDateToISO = (excelDate: any): string | null => {
      // If it's already a string date, return as-is
      if (typeof excelDate === 'string') return excelDate;

      // If it's a number, it's an Excel serial date
      if (typeof excelDate === 'number') {
        // Excel dates are days since 12/31/1899
        // JavaScript dates are milliseconds since 1/1/1970
        // Difference: 25569 days
        const jsDate = new Date((excelDate - 25569) * 86400 * 1000);

        // Verify it's a valid date
        if (!isNaN(jsDate.getTime())) {
          return jsDate.toISOString().split('T')[0]; // Return YYYY-MM-DD
        }
      }

      return null;
    };

    // Compress data: Extract only essential fields
    const compressedData = jsonData.map((row: any) => {
      // Try common field names for date, description, amount
      const rawDate = row['Posting Date'] || row['Date'] || row['Transaction Date'] || row['date'];
      const date = excelDateToISO(rawDate);
      const description = row['Description'] || row['Merchant'] || row['description'] || row['memo'];
      const amount = row['Amount'] || row['amount'] || row['Debit'] || row['Credit'];
      const type = row['Type'] || row['Transaction Type'] || row['Category'];

      return { date, description, amount, type };
    }).filter(row => row.date && row.amount); // Filter out invalid rows

    console.log(`📊 After field extraction: ${compressedData.length} rows with valid date+amount`);

    // Sample first few dates to verify parsing
    if (compressedData.length > 0) {
      const sample = compressedData.slice(0, 3);
      console.log(`📅 Sample dates from CSV:`, sample.map(r => ({
        raw: r.date,
        parsed: new Date(r.date).toISOString(),
        valid: !isNaN(new Date(r.date).getTime())
      })));
    }

    // Return ALL valid transactions - no date filtering
    // The AI will analyze the entire history provided by the user
    console.log(`✓ Using all ${compressedData.length} transactions (no date filtering)`);

    return JSON.stringify(compressedData);
  } catch (error) {
    console.error('Error extracting spreadsheet data:', error);
    throw new Error('Failed to extract data from spreadsheet');
  }
}

/**
 * Analyze image file using vision model via OpenRouter
 * Supports images from various sources including client-side PDF conversions
 */
async function analyzeImage(filePath: string): Promise<string> {
  const TIMEOUT_MS = 60000; // 60 seconds

  try {
    console.log('🔍 [1/5] Starting image analysis...');
    console.log(`   📁 File: ${filePath}`);

    console.log('📖 [2/5] Reading image file...');
    const imageBuffer = await fs.readFile(filePath);
    console.log(`   ✓ File read successfully (${imageBuffer.length} bytes)`);

    console.log('🔄 [3/5] Converting to base64...');
    const base64Image = imageBuffer.toString('base64');
    const ext = path.extname(filePath).toLowerCase();
    const mimeType = ext === '.png' ? 'image/png' : 'image/jpeg';
    console.log(`   ✓ Converted to base64 (${base64Image.length} chars, type: ${mimeType})`);

    console.log('🌐 [4/5] Calling OpenRouter (Gemini) for vision...');
    console.log(`   📡 Endpoint: ${openRouter.baseURL}`);
    console.log(`   🤖 Model: ${VISION_MODEL}`);
    console.log(`   ⏱️  Timeout: ${TIMEOUT_MS / 1000}s`);

    // Create a timeout promise that rejects after TIMEOUT_MS
    const timeoutPromise = new Promise<never>((_, reject) => {
      setTimeout(() => {
        console.error(`⏱️  ❌ TIMEOUT FIRED - No response after ${TIMEOUT_MS / 1000}s`);
        reject(new Error(`Image analysis timed out after ${TIMEOUT_MS / 1000} seconds`));
      }, TIMEOUT_MS);
    });

    console.log('   🚀 Sending API request NOW...');
    const startTime = Date.now();

    // Create the API call promise using OpenRouter with Gemini
    const apiCallPromise = openRouter.chat.completions.create({
      model: VISION_MODEL,
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'text',
              text: `⚠️ CRITICAL INSTRUCTIONS FOR IMAGE TRANSACTION EXTRACTION ⚠️

You are extracting transaction data from a bank statement image. This data will be used for financial analysis.

🔴 MANDATORY REQUIREMENTS:
1. Extract EVERY SINGLE TRANSACTION - no sampling, no skipping
2. Use EXACT dates as shown in the image (do not modify or hallucinate dates)
3. Use EXACT descriptions as shown in the image (do not summarize or shorten)
4. Use EXACT amounts as shown in the image (preserve decimal precision)
5. If the image has 200 transactions, your output must have 200 transactions
6. Count transactions as you extract to ensure completeness

FORMAT REQUIREMENT - Each transaction on a new line:
YYYY-MM-DD | Full Description Text | +/-Amount

EXAMPLES:
2024-10-24 | CMG MORTGAGE INC PAYROLL PPD ID: 9999922657 | +9233.45
2024-10-24 | SO CAL EDISON CO BILL PAYMT 700689315083 | -155.38
2024-10-23 | Payment to Chase card ending in 8435 10/23 | -295.88

CRITICAL RULES:
✓ EXTRACT EVERY TRANSACTION - Do not skip any rows
✓ PRESERVE EXACT DATES - Copy dates exactly as shown (MM/DD/YYYY → YYYY-MM-DD)
✓ PRESERVE EXACT DESCRIPTIONS - Do not abbreviate or summarize merchant names
✓ PRESERVE EXACT AMOUNTS - Keep full precision (e.g., -155.38 not -155)
✓ DETERMINISTIC - Same image must produce same output every time
✓ NO FILTERING - Include all transaction types (credits, debits, transfers, fees)

⚠️ VERIFICATION: After extraction, count your transactions and state the total count at the end.

Begin extraction now:`,
            },
            {
              type: 'image_url',
              image_url: {
                url: `data:${mimeType};base64,${base64Image}`,
              },
            },
          ],
        },
      ],
      max_tokens: 16000, // Increased to handle large statements with many transactions
      temperature: 0, // Deterministic output for consistent results
      top_p: 1, // Disable nucleus sampling for maximum consistency
      seed: 42, // Fixed seed for reproducibility (may not be supported by all models)
    }, {
      timeout: TIMEOUT_MS, // SDK timeout as backup
    });

    console.log('   ⏳ Waiting for response...');
    // Race the API call against the timeout
    const response = await Promise.race([apiCallPromise, timeoutPromise]);

    const elapsedTime = Date.now() - startTime;
    const extractedContent = response.choices[0]?.message?.content || '';
    console.log(`✅ [5/5] API response received in ${(elapsedTime / 1000).toFixed(2)}s`);
    console.log(`   📝 Response length: ${extractedContent.length} chars`);

    // Count transactions in extracted data for verification
    const transactionLines = extractedContent.split('\n').filter(line => line.includes('|')).length;
    console.log(`   📊 Extracted transactions: ${transactionLines} lines`);

    return extractedContent;
  } catch (error) {
    console.error('❌ Error analyzing image:', error);

    // Provide more specific error messages
    if (error instanceof Error) {
      if (error.message.includes('timeout') || error.message.includes('timed out')) {
        throw new Error(`Image analysis timed out after ${TIMEOUT_MS / 1000} seconds. Please try again or use a smaller image.`);
      }
      throw new Error(`Failed to analyze image: ${error.message}`);
    }
    throw new Error('Failed to analyze image with vision model');
  }
}

/**
 * Analyze PDF file using vision model via OpenAI
 * TESTING: Native PDF support (no conversion to images)
 */
async function analyzePdf(filePath: string): Promise<string> {
  const TIMEOUT_MS = 120000; // 120 seconds for PDFs (can be multi-page)

  try {
    console.log('📄 [1/4] Starting PDF analysis...');
    console.log(`   📁 File: ${filePath}`);

    console.log('📖 [2/4] Reading PDF file...');
    const pdfBuffer = await fs.readFile(filePath);
    console.log(`   ✓ File read successfully (${pdfBuffer.length} bytes)`);

    console.log('🔄 [3/4] Converting to base64...');
    const base64Pdf = pdfBuffer.toString('base64');
    console.log(`   ✓ Converted to base64 (${base64Pdf.length} chars)`);

    console.log('🌐 [4/4] Calling OpenRouter (Gemini) with native PDF...');
    console.log(`   📡 Endpoint: ${openRouter.baseURL}`);
    console.log(`   🤖 Model: ${VISION_MODEL}`);
    console.log(`   ⏱️  Timeout: ${TIMEOUT_MS / 1000}s`);

    const timeoutPromise = new Promise<never>((_, reject) => {
      setTimeout(() => {
        console.error(`⏱️  ❌ TIMEOUT FIRED - No response after ${TIMEOUT_MS / 1000}s`);
        reject(new Error(`PDF analysis timed out after ${TIMEOUT_MS / 1000} seconds`));
      }, TIMEOUT_MS);
    });

    console.log('   🚀 Sending API request NOW with native PDF...');
    const startTime = Date.now();

    // Send PDF directly to OpenRouter (Gemini) using proper file format
    const apiCallPromise = openRouter.chat.completions.create({
      model: VISION_MODEL,
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'text',
              text: `⚠️ CRITICAL INSTRUCTIONS FOR PDF TRANSACTION EXTRACTION ⚠️

You are extracting transaction data from a bank statement PDF. This data will be used for financial analysis.

🔴 MANDATORY REQUIREMENTS:
1. Extract EVERY SINGLE TRANSACTION - no sampling, no skipping
2. Use EXACT dates as shown in the PDF (do not modify or hallucinate dates)
3. Use EXACT descriptions as shown in the PDF (do not summarize or shorten)
4. Use EXACT amounts as shown in the PDF (preserve decimal precision)
5. If the PDF has 500 transactions, your output must have 500 transactions
6. Count transactions as you extract to ensure completeness

FORMAT REQUIREMENT - Each transaction on a new line:
YYYY-MM-DD | Full Description Text | +/-Amount

EXAMPLES:
2024-10-24 | CMG MORTGAGE INC PAYROLL PPD ID: 9999922657 | +9233.45
2024-10-24 | SO CAL EDISON CO BILL PAYMT 700689315083 | -155.38
2024-10-23 | Payment to Chase card ending in 8435 10/23 | -295.88

CRITICAL RULES:
✓ EXTRACT EVERY TRANSACTION - Do not skip any rows
✓ PRESERVE EXACT DATES - Copy dates exactly as shown (MM/DD/YYYY → YYYY-MM-DD)
✓ PRESERVE EXACT DESCRIPTIONS - Do not abbreviate or summarize merchant names
✓ PRESERVE EXACT AMOUNTS - Keep full precision (e.g., -155.38 not -155)
✓ DETERMINISTIC - Same PDF must produce same output every time
✓ NO FILTERING - Include all transaction types (credits, debits, transfers, fees)

⚠️ VERIFICATION: After extraction, count your transactions and state the total count at the end.

Begin extraction now:`,
            },
            {
              type: 'file' as any, // OpenRouter-specific file type
              file: {
                filename: path.basename(filePath),
                file_data: `data:application/pdf;base64,${base64Pdf}`,
              },
            } as any,
          ],
        },
      ],
      max_tokens: 16000, // Increased to handle 500+ transactions
      temperature: 0, // Deterministic output for consistent results
      top_p: 1, // Disable nucleus sampling for maximum consistency
      seed: 42, // Fixed seed for reproducibility (may not be supported by all models)
    } as any, {
      timeout: TIMEOUT_MS,
    });

    console.log('   ⏳ Waiting for response...');
    const response = await Promise.race([apiCallPromise, timeoutPromise]);

    const elapsedTime = Date.now() - startTime;
    const extractedContent = response.choices[0]?.message?.content || '';
    console.log(`✅ [4/4] API response received in ${(elapsedTime / 1000).toFixed(2)}s`);
    console.log(`   📝 Response length: ${extractedContent.length} chars`);

    // Count transactions in extracted data for verification
    const transactionLines = extractedContent.split('\n').filter(line => line.includes('|')).length;
    console.log(`   📊 Extracted transactions: ${transactionLines} lines`);

    return extractedContent;
  } catch (error) {
    console.error('❌ Error analyzing PDF:', error);

    if (error instanceof Error) {
      if (error.message.includes('timeout') || error.message.includes('timed out')) {
        throw new Error(`PDF analysis timed out after ${TIMEOUT_MS / 1000} seconds. Please try again.`);
      }
      throw new Error(`Failed to analyze PDF: ${error.message}`);
    }
    throw new Error('Failed to analyze PDF with vision model');
  }
}

/**
 * Estimate token count (rough approximation: 1 token ≈ 4 characters)
 */
function estimateTokens(text: string): number {
  return Math.ceil(text.length / 4);
}

/**
 * Chunk transactions into batches for processing
 * Ensures each chunk stays under token limits
 */
function chunkTransactions(transactions: any[], maxTransactionsPerChunk: number = 250): any[][] {
  const chunks: any[][] = [];

  for (let i = 0; i < transactions.length; i += maxTransactionsPerChunk) {
    const chunk = transactions.slice(i, i + maxTransactionsPerChunk);
    chunks.push(chunk);
  }

  console.log(`📦 Split ${transactions.length} transactions into ${chunks.length} chunks of ~${maxTransactionsPerChunk} each`);

  return chunks;
}

/**
 * Process a single chunk of transactions with AI categorization
 */
async function analyzeTransactionChunk(
  chunkData: any[],
  chunkNumber: number,
  totalChunks: number,
  currentHousingPayment: number
): Promise<OpenAIAnalysisResult> {
  const chunkDataStr = JSON.stringify(chunkData);

  console.log(`\n🔄 [Chunk ${chunkNumber}/${totalChunks}] Processing ${chunkData.length} transactions...`);
  console.log(`   📊 Chunk size: ${chunkDataStr.length} characters (~${estimateTokens(chunkDataStr)} tokens)`);

  const prompt = `You are a financial analysis expert analyzing a BATCH of transactions from bank statements.

⚠️ CRITICAL: This is CHUNK ${chunkNumber} of ${totalChunks}. Analyze ONLY these transactions independently.
⚠️ The data is ALREADY EXTRACTED as JSON. Your job: Categorize and analyze these transactions.
⚠️ PRESERVE ALL TRANSACTIONS: Include EVERY transaction in your output.

Current housing payment (to exclude from expenses): $${currentHousingPayment}

Pre-Parsed Transaction Data for Chunk ${chunkNumber}:
${chunkDataStr}

Your task: CATEGORIZE and ANALYZE these transactions:

CATEGORIZATION RULES:
- "income": Deposits, paychecks, Zelle/transfers IN (positive amounts or credits)
- "expense": Regular recurring expenses like utilities, bills, subscriptions, groceries
- "housing": Rent or mortgage payments (around $${currentHousingPayment})
- "one-time": Irregular purchases, large transfers, one-time payments

FLAG ANOMALIES:
- Luxury items, unusually large purchases, one-time events, irregular deposits
- Provide specific flag reasons when flagged=true

MONTHLY BREAKDOWN:
- Group by month (YYYY-MM) and calculate income, expenses, net cash flow, transaction count

CRITICAL RULES:
✓ PRESERVE EVERY TRANSACTION - Output count must match input count (${chunkData.length} transactions)
✓ USE EXACT DATES/AMOUNTS/DESCRIPTIONS from input
✓ DETERMINISTIC - Same input = same output
✓ NO SAMPLING - Include 100% of transactions

Return COMPACT JSON (omit flagReason when flagged=false):
{
  "transactions": [
    {"date": "YYYY-MM-DD", "description": "Description", "amount": 1234.56, "category": "income", "flagged": false, "monthYear": "2024-08"}
  ],
  "monthlyBreakdown": [
    {"month": "2024-08", "income": 5000.00, "expenses": 2500.00, "netCashFlow": 2500.00, "transactionCount": 45}
  ],
  "totalIncome": 5000.00,
  "totalExpenses": 2500.00,
  "netCashFlow": 2500.00,
  "confidence": 0.85
}`;

  const CHUNK_TIMEOUT_MS = 90000; // 90 seconds per chunk

  try {
    const response = await openaiDirect.chat.completions.create({
      model: TEXT_MODEL,
      messages: [
        {
          role: 'system',
          content: 'You are a financial analyst specialized in cash flow analysis. Always respond with valid JSON. Be consistent and deterministic.',
        },
        {
          role: 'user',
          content: prompt,
        },
      ],
      response_format: { type: 'json_object' },
      temperature: 0,
      top_p: 1,
      seed: 42,
      max_tokens: 16384,
    }, {
      timeout: CHUNK_TIMEOUT_MS,
    });

    const rawContent = response.choices[0]?.message?.content || '{}';
    const result = JSON.parse(rawContent);

    console.log(`✅ [Chunk ${chunkNumber}/${totalChunks}] Completed:`);
    console.log(`   📊 Transactions returned: ${result.transactions?.length || 0}/${chunkData.length}`);
    console.log(`   💰 Income: $${result.totalIncome?.toFixed(2) || 0}, Expenses: $${result.totalExpenses?.toFixed(2) || 0}`);

    if (result.transactions?.length !== chunkData.length) {
      console.warn(`⚠️  [Chunk ${chunkNumber}] Transaction count mismatch! Expected ${chunkData.length}, got ${result.transactions?.length || 0}`);
    }

    return result;
  } catch (error) {
    console.error(`❌ [Chunk ${chunkNumber}/${totalChunks}] Failed:`, error);
    throw error;
  }
}

/**
 * Merge results from multiple chunks
 */
function mergeChunkResults(chunkResults: OpenAIAnalysisResult[]): OpenAIAnalysisResult {
  console.log(`\n🔀 Merging ${chunkResults.length} chunk results...`);

  // Combine all transactions
  const allTransactions = chunkResults.flatMap(chunk => chunk.transactions || []);

  // Merge monthly breakdowns (group by month and sum values)
  const monthlyMap = new Map<string, any>();

  chunkResults.forEach(chunk => {
    (chunk.monthlyBreakdown || []).forEach(monthData => {
      if (monthlyMap.has(monthData.month)) {
        const existing = monthlyMap.get(monthData.month);
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

  // Calculate merged totals
  const totalIncome = chunkResults.reduce((sum, chunk) => sum + (chunk.totalIncome || 0), 0);
  const totalExpenses = chunkResults.reduce((sum, chunk) => sum + (chunk.totalExpenses || 0), 0);
  const netCashFlow = totalIncome - totalExpenses;

  // Average confidence scores
  const avgConfidence = chunkResults.reduce((sum, chunk) => sum + (chunk.confidence || 0), 0) / chunkResults.length;

  console.log(`✅ Merge complete:`);
  console.log(`   📊 Total transactions: ${allTransactions.length}`);
  console.log(`   📅 Months covered: ${monthlyBreakdown.length}`);
  console.log(`   💰 Total Income: $${totalIncome.toFixed(2)}`);
  console.log(`   💰 Total Expenses: $${totalExpenses.toFixed(2)}`);
  console.log(`   💰 Net Cash Flow: $${netCashFlow.toFixed(2)}`);
  console.log(`   🎯 Avg Confidence: ${(avgConfidence * 100).toFixed(1)}%`);

  return {
    transactions: allTransactions,
    monthlyBreakdown,
    totalIncome,
    totalExpenses,
    netCashFlow,
    confidence: avgConfidence,
  };
}

/**
 * Split large data into chunks to stay under token limits
 *
 * OPTIMIZATION: Process data in smaller batches to avoid rate limits
 * Each chunk stays under 15K tokens to safely fit within 30K TPM limit
 */
function chunkData(data: string, maxTokensPerChunk: number = 15000): string[] {
  const estimatedTokens = estimateTokens(data);

  if (estimatedTokens <= maxTokensPerChunk) {
    console.log(`Data fits in single chunk (${estimatedTokens} tokens)`);
    return [data];
  }

  console.log(`Data too large (${estimatedTokens} tokens), splitting into chunks...`);

  try {
    // Parse JSON array
    const transactions = JSON.parse(data);

    if (!Array.isArray(transactions)) {
      console.log('Data is not an array, returning as single chunk');
      return [data];
    }

    // Calculate transactions per chunk
    const avgCharsPerTransaction = data.length / transactions.length;
    const avgTokensPerTransaction = avgCharsPerTransaction / 4;
    const transactionsPerChunk = Math.floor(maxTokensPerChunk / avgTokensPerTransaction);

    console.log(`Splitting ${transactions.length} transactions into chunks of ~${transactionsPerChunk} each`);

    const chunks: string[] = [];
    for (let i = 0; i < transactions.length; i += transactionsPerChunk) {
      const chunk = transactions.slice(i, i + transactionsPerChunk);
      chunks.push(JSON.stringify(chunk));
      console.log(`Chunk ${chunks.length}: ${chunk.length} transactions (~${estimateTokens(JSON.stringify(chunk))} tokens)`);
    }

    return chunks;
  } catch (error) {
    console.error('Error chunking data:', error);
    // If parsing fails, return original data as single chunk
    return [data];
  }
}

/**
 * Process a single bank statement file with retry logic
 * Supports native PDF processing via Gemini 2.0 Flash
 */
async function processFile(file: Express.Multer.File, retries = 2): Promise<string> {
  const ext = path.extname(file.originalname).toLowerCase();

  if (ext === '.csv' || ext === '.xlsx' || ext === '.xls') {
    return await extractDataFromSpreadsheet(file.path);
  } else if (ext === '.pdf') {
    // Retry logic for PDF analysis with native PDF support
    let lastError: Error | null = null;
    for (let attempt = 1; attempt <= retries; attempt++) {
      try {
        console.log(`Attempt ${attempt}/${retries} for PDF ${file.originalname}`);
        return await analyzePdf(file.path);
      } catch (error) {
        lastError = error as Error;
        console.error(`Attempt ${attempt}/${retries} failed:`, error instanceof Error ? error.message : error);
        if (attempt < retries) {
          console.log(`Retrying in 2 seconds...`);
          await new Promise(resolve => setTimeout(resolve, 2000));
        }
      }
    }
    throw lastError || new Error('Failed to process PDF after retries');
  } else if (['.jpg', '.jpeg', '.png', '.gif', '.webp'].includes(ext)) {
    // Retry logic for image analysis
    let lastError: Error | null = null;
    for (let attempt = 1; attempt <= retries; attempt++) {
      try {
        console.log(`Attempt ${attempt}/${retries} for ${file.originalname}`);
        return await analyzeImage(file.path);
      } catch (error) {
        lastError = error as Error;
        console.error(`Attempt ${attempt}/${retries} failed:`, error instanceof Error ? error.message : error);
        if (attempt < retries) {
          console.log(`Retrying in 2 seconds...`);
          await new Promise(resolve => setTimeout(resolve, 2000));
        }
      }
    }
    throw lastError || new Error('Failed to process image after retries');
  } else {
    throw new Error(`Unsupported file type: ${ext}`);
  }
}

/**
 * Deduplicate transactions based on date, amount, and description similarity
 * Returns unique transactions and duplicates separately
 */
function deduplicateTransactions(transactions: any[]): {
  uniqueTransactions: any[];
  duplicateTransactions: any[];
} {
  const uniqueTransactions: any[] = [];
  const duplicateTransactions: any[] = [];
  const transactionKeys = new Map<string, any>();

  // Helper to create a transaction key
  const createTransactionKey = (t: any): string => {
    // Normalize description: lowercase, remove extra spaces, remove special chars
    const normalizedDesc = (t.description || '')
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, '')
      .replace(/\s+/g, ' ')
      .trim()
      .substring(0, 50); // First 50 chars for comparison

    // Normalize amount to 2 decimal places
    const normalizedAmount = Math.abs(parseFloat(t.amount) || 0).toFixed(2);

    // Parse and normalize date
    const date = new Date(t.date);
    const normalizedDate = isNaN(date.getTime()) ? t.date : date.toISOString().split('T')[0];

    return `${normalizedDate}|${normalizedAmount}|${normalizedDesc}`;
  };

  console.log(`🔍 Deduplication: Processing ${transactions.length} transactions...`);

  transactions.forEach((transaction, index) => {
    const key = createTransactionKey(transaction);

    if (transactionKeys.has(key)) {
      // This is a duplicate
      const originalTransaction = transactionKeys.get(key);
      duplicateTransactions.push({
        ...transaction,
        isDuplicate: true,
        duplicateOf: key,
      });
      console.log(`  ⚠️  Duplicate found: ${transaction.date} - ${transaction.description} - $${transaction.amount}`);
    } else {
      // This is unique
      transactionKeys.set(key, transaction);
      uniqueTransactions.push({
        ...transaction,
        isDuplicate: false,
      });
    }
  });

  console.log(`  ✓ Unique: ${uniqueTransactions.length}, Duplicates: ${duplicateTransactions.length}`);

  return { uniqueTransactions, duplicateTransactions };
}

/**
 * Analyze bank statements using OpenAI GPT-4
 */
export async function analyzeStatements(
  files: Express.Multer.File[],
  currentHousingPayment: number
): Promise<CashFlowAnalysis> {
  try {
    console.log(`Processing ${files.length} files...`);
    console.log(`⚡ Using parallel processing for ${files.length} files simultaneously`);

    // Process ALL files in PARALLEL for maximum performance
    const filePromises = files.map(async (file) => {
      console.log(`📄 Starting: ${file.originalname}`);
      try {
        const content = await processFile(file);
        console.log(`✓ Completed: ${file.originalname}`);
        return { success: true, content, filename: file.originalname };
      } catch (error) {
        console.error(`✗ Failed: ${file.originalname}:`, error instanceof Error ? error.message : error);
        return { success: false, error, filename: file.originalname };
      }
    });

    // Wait for all files to process (or fail) in parallel
    const fileResults = await Promise.allSettled(filePromises);

    // Extract successful results and failed files
    const extractedData: string[] = [];
    const failedFiles: string[] = [];

    fileResults.forEach((result) => {
      if (result.status === 'fulfilled') {
        const fileResult = result.value;
        if (fileResult.success && 'content' in fileResult) {
          extractedData.push(fileResult.content);
        } else if (!fileResult.success) {
          failedFiles.push(fileResult.filename);
        }
      } else {
        failedFiles.push('unknown file');
      }
    });

    console.log(`⚡ Parallel processing complete: ${extractedData.length} successful, ${failedFiles.length} failed`);

    if (extractedData.length === 0) {
      throw new Error(`Failed to process any files. ${failedFiles.length} file(s) failed: ${failedFiles.join(', ')}`);
    }

    if (failedFiles.length > 0) {
      console.log(`⚠️  Warning: ${failedFiles.length} file(s) failed to process: ${failedFiles.join(', ')}`);
      console.log(`✓ Successfully processed ${extractedData.length} file(s), continuing with analysis...`);
    }

    const combinedData = extractedData.join('\n\n---NEW DOCUMENT---\n\n');

    console.log('🔍 Analyzing combined transaction data with AI...');
    console.log(`📊 Combined data length: ${combinedData.length} characters (~${estimateTokens(combinedData)} tokens)`);

    // DECISION POINT: Use chunking for large datasets
    // Try to parse as JSON to count transactions
    let parsedTransactions: any[] = [];
    let shouldUseChunking = false;

    try {
      // Attempt to parse as JSON array
      parsedTransactions = JSON.parse(combinedData);

      if (Array.isArray(parsedTransactions)) {
        console.log(`📊 Detected ${parsedTransactions.length} transactions`);

        // Use chunking if > 500 transactions (to ensure each chunk fits in 16K token output)
        if (parsedTransactions.length > 500) {
          console.log(`⚡ Using CHUNKED processing (${parsedTransactions.length} > 500 transactions)`);
          shouldUseChunking = true;
        } else {
          console.log(`✓ Using SINGLE-REQUEST processing (${parsedTransactions.length} <= 500 transactions)`);
        }
      }
    } catch (parseError) {
      console.log('📝 Data is not a JSON array, using single-request processing');
    }

    // CHUNKED PROCESSING for large datasets
    if (shouldUseChunking && parsedTransactions.length > 0) {
      const chunks = chunkTransactions(parsedTransactions, 250);

      console.log(`\n🚀 Processing ${chunks.length} chunks in parallel...`);
      const startTime = Date.now();

      // Process all chunks in parallel
      const chunkPromises = chunks.map((chunk, index) =>
        analyzeTransactionChunk(chunk, index + 1, chunks.length, currentHousingPayment)
      );

      const chunkResults = await Promise.all(chunkPromises);
      const elapsedTime = Date.now() - startTime;

      console.log(`\n⚡ All chunks processed in ${(elapsedTime / 1000).toFixed(1)}s`);

      // Merge chunk results
      const result = mergeChunkResults(chunkResults);

      // Continue with deduplication and final processing...
      const { uniqueTransactions, duplicateTransactions } = deduplicateTransactions(result.transactions || []);
      const flaggedTransactions = uniqueTransactions.filter((t: any) => t.flagged === true);
      const averageMonthlyBalance = Math.max(0, result.netCashFlow);

      console.log('📈 Final Analysis Results:');
      console.log(`  ✓ Total transactions: ${result.transactions?.length || 0}`);
      console.log(`  ✓ Unique transactions: ${uniqueTransactions.length}`);
      console.log(`  ✓ Duplicate transactions: ${duplicateTransactions.length}`);
      console.log(`  ✓ Flagged for review: ${flaggedTransactions.length}`);
      console.log(`  ✓ Net cash flow: $${result.netCashFlow || 0}`);

      // Clean up files
      for (const file of files) {
        try {
          await fs.unlink(file.path);
        } catch (error) {
          console.error(`Error deleting file ${file.path}:`, error);
        }
      }

      return {
        totalIncome: result.totalIncome || 0,
        totalExpenses: result.totalExpenses || 0,
        netCashFlow: result.netCashFlow || 0,
        averageMonthlyBalance,
        transactions: uniqueTransactions,
        monthlyBreakdown: result.monthlyBreakdown || [],
        flaggedTransactions,
        duplicateTransactions,
        confidence: result.confidence || 0.7,
      };
    }

    // SINGLE-REQUEST PROCESSING for smaller datasets (original code path)
    const dataToAnalyze = combinedData;
    const estimatedTokens = estimateTokens(dataToAnalyze);

    console.log(`✓ Processing all data in single request (~${estimatedTokens} tokens)`);

    if (estimatedTokens > 100000) {
      console.log(`⚠️  Warning: Large dataset (${estimatedTokens} tokens). This may take longer to process.`);
    }

    // Use GPT-4 to analyze the transactions with enhanced anomaly detection
    const prompt = `You are a financial analysis expert. You are receiving PRE-PARSED STRUCTURED DATA from bank statements.

⚠️ CRITICAL: The data below is ALREADY EXTRACTED as JSON. Each transaction is already parsed with date, description, and amount.
⚠️ YOUR JOB: Categorize and analyze these existing transactions. DO NOT extract or re-interpret them.
⚠️ PRESERVE ALL TRANSACTIONS: You must include EVERY transaction in your output. Do not drop any transactions.

IMPORTANT: You must be CONSISTENT and DETERMINISTIC. Analyze the same data the same way every time.

Current housing payment (to exclude from expenses): $${currentHousingPayment}

Pre-Parsed Transaction Data (JSON Array):
${dataToAnalyze}

Your task is to CATEGORIZE and ANALYZE the above transactions:

1. **PRESERVE & CATEGORIZE EVERY TRANSACTION**:
   - The data is already extracted - keep ALL transactions in your output
   - Use the EXACT date, description, and amount from the input
   - DO NOT drop transactions, modify dates, or change amounts
   - DO NOT hallucinate new transactions or dates

   CATEGORIZATION RULES - APPLY IN THIS EXACT ORDER:

   ⚠️ CRITICAL: You MUST be 100% consistent. Same transaction = same category every time.

   SUMMARY OF CATEGORIES:
   - "income" = Regular recurring paychecks ONLY
   - "one-time" = Irregular deposits (Zelle, tax refunds, etc.) AND one-time expenses (>$500 purchases, travel, etc.)
   - "housing" = Mortgage/rent payments matching the expected amount
   - "expense" = All other regular recurring expenses

   NOTE: Both one-time income AND one-time expenses use category "one-time" and are EXCLUDED from totals.

   STEP 1 - Check if REGULAR INCOME (recurring paychecks only):
   For a deposit to be considered REGULAR income, it must match these patterns:
   - Contains keywords: "PAYROLL", "SALARY", "DIRECT DEP", "ACH CREDIT", "PAYCHECK", "PAY CHECK"
   - OR: Regular bi-weekly/monthly deposits of similar amounts (e.g., $2,500 every 2 weeks)
   - OR: Employer name in description (if you can identify the employer pattern)

   Do NOT categorize as regular income:
   - Zelle, Venmo, Cash App, PayPal transfers (these are usually reimbursements or paybacks)
   - Wire transfers IN (usually one-time)
   - Tax refunds
   - Large irregular deposits
   - Refunds or reimbursements

   → Category: "income" (only for regular, recurring employment income)

   STEP 1B - Check if ONE-TIME INCOME (irregular deposits):
   If it's a positive amount (deposit/credit) but NOT regular income, check if it's irregular:

   One-Time Income Rules:
   - Zelle, Venmo, Cash App, PayPal deposits (look for: "ZELLE", "VENMO", "CASH APP", "PAYPAL")
   - Wire transfers IN (look for: "WIRE", "WIRE TRANSFER IN", "INCOMING WIRE")
   - Tax refunds (look for: "IRS", "TAX REFUND", "FEDERAL TAX", "STATE TAX")
   - Large irregular deposits (>$1000 that don't match paycheck pattern)
   - Refunds and reimbursements (look for: "REFUND", "REIMBURSEMENT", "REBATE")
   - Bonuses (look for: "BONUS", "COMMISSION")
   - Large check deposits (>$2000 if not identified as payroll)
   - Gifts, inheritance, settlements
   - Side income that's irregular (freelance, gig work if not consistent)

   → Category: "one-time" + SET flagged=true + flagReason: "One-Time Income: [reason]"

   Examples of flag reasons:
   - "One-Time Income: Zelle transfer - likely reimbursement"
   - "One-Time Income: Tax refund"
   - "One-Time Income: Large irregular deposit"
   - "One-Time Income: Wire transfer in"

   STEP 2 - Check if HOUSING (if not income or one-time income):
   - Housing payment MUST be within $50 OR 2% of $${currentHousingPayment} (whichever is larger)
   - Example: If housing = $2000, accept $1960-$2040 OR $1900-$2100 (use wider range)
   - Look for descriptions containing: "MORTGAGE", "RENT", "PROPERTY MGMT", "LANDLORD", "HOUSING"
   - If amount matches AND description suggests housing → Category: "housing"
   - If only description matches but amount is far off → NOT housing, continue to next step
   → Category: "housing"

   STEP 3 - Check if ONE-TIME EXPENSE (if not income or housing):
   Apply ALL of these rules - if ANY rule matches, categorize as "one-time":

   Rule A - Large irregular purchases (>$500 for single transaction):
   - Large retail purchases (>$500 at Target, Walmart, Amazon, etc.)
   - Electronics purchases (Apple, Best Buy, electronics stores)
   - Furniture/home improvement (Home Depot, Lowe's, IKEA, furniture stores)
   - Medical bills, dental bills, veterinary bills
   - Car repairs, maintenance >$500
   - Moving expenses, storage fees
   → flagReason: "One-Time Expense: Large purchase >$500"

   Rule B - Financial movements:
   - Wire transfers OUT (look for: "WIRE", "WIRE TRF", "OUTGOING WIRE")
   - Large transfers OUT to external accounts (>$1000)
   - Cash withdrawals >$500
   - Check deposits >$1000
   - Loan payments (student loans, car loans, personal loans)
   - Credit card payments (payments TO credit cards, not purchases with cards)
   - Investment/brokerage transfers (Vanguard, Fidelity, Schwab, etc.)
   → flagReason: "One-Time Expense: Wire transfer/financial movement"

   Rule C - Irregular/Annual expenses:
   - Insurance payments (auto, life, umbrella - but NOT monthly health insurance)
   - Property tax payments
   - HOA special assessments (NOT regular HOA fees)
   - Annual subscriptions/memberships (if >$200)
   - Vacation/travel expenses (hotels, flights, vacation rentals)
   - Tuition, education expenses
   - Holiday spending (if unusually large)
   - Gifts, donations >$200
   - Legal fees, tax preparation
   → flagReason: "One-Time Expense: Annual/irregular payment"

   Rule D - Luxury & discretionary:
   - High-end dining (>$150 per meal)
   - Designer purchases (luxury brands, jewelry stores)
   - Entertainment >$200 (concerts, sports events, shows)
   - Spa, salon services >$150
   → flagReason: "One-Time Expense: Luxury/discretionary purchase"

   → Category: "one-time" + SET flagged=true with appropriate flagReason from above

   STEP 4 - Otherwise, RECURRING EXPENSE (everything else):
   - Utilities (electric, gas, water, trash, sewer)
   - Internet, cable, phone bills
   - Subscriptions (Netflix, Spotify, Amazon Prime, etc. - if <$200/year)
   - Groceries (supermarkets, grocery stores)
   - Regular dining (<$150 per meal)
   - Gas stations, fuel
   - Regular retail (<$500)
   - Monthly HOA fees
   - Monthly health insurance premiums
   - Gym memberships, childcare (if monthly)
   - Regular transportation (Uber, Lyft, public transit)
   - Pet supplies, pet care (routine, <$500)
   → Category: "expense"

2. **FLAGGING - Apply to transactions that need review**:
   - ALL "one-time" transactions (both income AND expenses) must have flagged=true with specific flagReason
   - Also flag any income transactions >$10,000 with flagReason: "Large deposit - verify source"
   - Use clear flag reasons that cite the specific rule:

     Examples for ONE-TIME INCOME:
     * "One-Time Income: Zelle transfer - likely reimbursement"
     * "One-Time Income: Tax refund"
     * "One-Time Income: Wire transfer in"
     * "One-Time Income: Large irregular deposit"
     * "One-Time Income: Refund/reimbursement"

     Examples for ONE-TIME EXPENSES:
     * "One-Time Expense: Large retail purchase >$500"
     * "One-Time Expense: Wire transfer out"
     * "One-Time Expense: Annual insurance payment"
     * "One-Time Expense: Vacation/travel expense"
     * "One-Time Expense: Luxury dining >$150"

3. **MONTHLY BREAKDOWN**:
   Group by month (YYYY-MM format) and calculate:
   - Total income per month (sum of all "income" category only - EXCLUDE "one-time" deposits)
   - Total expenses per month (sum of ONLY "expense" category - EXCLUDE "housing" and "one-time")
   - Net cash flow per month (income - expenses)
   - Transaction count per month (all transactions)

4. **CALCULATE TOTALS**:
   - totalIncome: SUM of ONLY "income" category transactions (EXCLUDE "one-time" deposits)
   - totalExpenses: SUM of ONLY "expense" category transactions (EXCLUDE "housing" and "one-time")
   - netCashFlow: totalIncome - totalExpenses

   ⚠️ CRITICAL: Only "income" and "expense" categories are included in totals!
   ⚠️ EXCLUDED from totals: "housing", "one-time" (whether income or expense)

5. **CONFIDENCE SCORE**: Your confidence in categorization accuracy (0-1 scale)

CRITICAL RULES - READ CAREFULLY:
✓ PRESERVE EVERY TRANSACTION - Your output must have the SAME number of transactions as the input
✓ USE EXACT DATES - Do not change or hallucinate dates (use YYYY-MM-DD format from input)
✓ USE EXACT AMOUNTS - Do not modify transaction amounts
✓ USE EXACT DESCRIPTIONS - Keep original descriptions from input
✓ DETERMINISTIC - Same input MUST produce same output every time
✓ NO SAMPLING - Include 100% of transactions, not a sample
✓ CATEGORIZE ONLY - You are categorizing existing data, not extracting new data

Return COMPACT JSON (minimize whitespace, omit empty flagReason for unflagged items):
{
  "transactions": [
    {"date": "YYYY-MM-DD", "description": "Description", "amount": 1234.56, "category": "income", "flagged": false, "monthYear": "2024-08"},
    {"date": "YYYY-MM-DD", "description": "Description", "amount": -125.50, "category": "expense", "flagged": true, "flagReason": "One-time: Large purchase", "monthYear": "2024-08"}
  ],
  "monthlyBreakdown": [
    {"month": "2024-08", "income": 5000.00, "expenses": 2500.00, "netCashFlow": 2500.00, "transactionCount": 45}
  ],
  "totalIncome": 5000.00,
  "totalExpenses": 2500.00,
  "netCashFlow": 2500.00,
  "confidence": 0.85
}

⚠️ IMPORTANT: Use compact formatting. Omit "flagReason" key entirely when flagged=false to save tokens.`;

    // Create a timeout promise for the main analysis call
    const ANALYSIS_TIMEOUT_MS = 120000; // 120 seconds
    const analysisTimeoutPromise = new Promise<never>((_, reject) => {
      setTimeout(() => {
        console.error(`⏱️  Timeout reached for main analysis (${ANALYSIS_TIMEOUT_MS / 1000}s)`);
        reject(new Error(`Transaction analysis timed out after ${ANALYSIS_TIMEOUT_MS / 1000} seconds`));
      }, ANALYSIS_TIMEOUT_MS);
    });

    // Use OpenAI Direct (GPT-4o) for final text analysis
    // This analyzes the extracted transaction text (from CSV or vision extraction)
    console.log(`🧠 Using OpenAI Direct (${TEXT_MODEL}) for transaction analysis...`);
    console.log(`🔒 Deterministic mode: temperature=0, top_p=1, seed=42 for consistent results`);
    const analysisApiCallPromise = openaiDirect.chat.completions.create({
      model: TEXT_MODEL,
      messages: [
        {
          role: 'system',
          content: 'You are a financial analyst specialized in cash flow analysis. You must be consistent and deterministic. Always respond with valid JSON. Extract the same transactions from the same data every time.',
        },
        {
          role: 'user',
          content: prompt,
        },
      ],
      response_format: { type: 'json_object' },
      temperature: 0, // Fully deterministic for consistent JSON formatting
      top_p: 1, // Disable nucleus sampling for maximum determinism
      seed: 42, // Fixed seed for reproducible results across identical inputs
      max_tokens: 16384, // GPT-4o's maximum output token limit
    }, {
      timeout: ANALYSIS_TIMEOUT_MS,
    });

    console.log(`🏁 Racing main analysis against ${ANALYSIS_TIMEOUT_MS / 1000}s timeout...`);
    // Race the API call against the timeout
    const response = await Promise.race([analysisApiCallPromise, analysisTimeoutPromise]);
    console.log('✅ AI analysis completed successfully');

    // Log system fingerprint for reproducibility verification
    if (response.system_fingerprint) {
      console.log(`🔑 System fingerprint: ${response.system_fingerprint} (use this to verify consistent backend)`);
    }

    // Parse JSON with better error handling
    const rawContent = response.choices[0]?.message?.content || '{}';
    console.log(`📝 Raw response length: ${rawContent.length} chars`);

    let result;
    try {
      result = JSON.parse(rawContent);
    } catch (parseError) {
      console.error('❌ JSON Parse Error:', parseError);
      console.log('🔍 Attempting to extract JSON from response...');

      // Try to find JSON in markdown code blocks
      const jsonMatch = rawContent.match(/```(?:json)?\s*(\{[\s\S]*\})\s*```/);
      if (jsonMatch) {
        console.log('✓ Found JSON in markdown code block, retrying parse...');
        result = JSON.parse(jsonMatch[1]);
      } else {
        // Log first and last 500 chars for debugging
        console.error('First 500 chars:', rawContent.substring(0, 500));
        console.error('Last 500 chars:', rawContent.substring(rawContent.length - 500));
        throw parseError;
      }
    }

    // Clean up uploaded files after processing
    for (const file of files) {
      try {
        await fs.unlink(file.path);
      } catch (error) {
        console.error(`Error deleting file ${file.path}:`, error);
      }
    }

    // Calculate average monthly balance (net cash flow that can offset principal)
    const averageMonthlyBalance = Math.max(0, result.netCashFlow);

    // Extract flagged transactions for review
    const flaggedTransactions = (result.transactions || []).filter((t: any) => t.flagged === true);

    // Deduplicate transactions across files
    const { uniqueTransactions, duplicateTransactions } = deduplicateTransactions(result.transactions || []);

    console.log('📈 Analysis Results:');
    console.log(`  ✓ Total transactions: ${result.transactions?.length || 0}`);
    console.log(`  ✓ Unique transactions: ${uniqueTransactions.length}`);
    console.log(`  ✓ Duplicate transactions: ${duplicateTransactions.length}`);
    console.log(`  ✓ Flagged for review: ${flaggedTransactions.length}`);
    console.log(`  ✓ Monthly deposits: $${result.totalIncome || 0}`);
    console.log(`  ✓ Monthly expenses: $${result.totalExpenses || 0}`);
    console.log(`  ✓ Net cash flow: $${result.netCashFlow || 0}`);
    console.log(`  ✓ Confidence: ${((result.confidence || 0) * 100).toFixed(0)}%`);

    return {
      totalIncome: result.totalIncome || 0,           // Sum of all income (frontend divides by months)
      totalExpenses: result.totalExpenses || 0,       // Sum of all expenses (frontend divides by months)
      netCashFlow: result.netCashFlow || 0,           // Total net (frontend divides by months)
      averageMonthlyBalance,
      transactions: uniqueTransactions,
      monthlyBreakdown: result.monthlyBreakdown || [],
      flaggedTransactions,
      duplicateTransactions,
      confidence: result.confidence || 0.7,
    };
  } catch (error) {
    console.error('Error in analyzeStatements:', error);
    throw new Error(`Failed to analyze bank statements: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}
