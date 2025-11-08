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

    // Compress data: Extract only essential fields
    const compressedData = jsonData.map((row: any) => {
      // Try common field names for date, description, amount
      const date = row['Posting Date'] || row['Date'] || row['Transaction Date'] || row['date'];
      const description = row['Description'] || row['Merchant'] || row['description'] || row['memo'];
      const amount = row['Amount'] || row['amount'] || row['Debit'] || row['Credit'];
      const type = row['Type'] || row['Transaction Type'] || row['Category'];

      return { date, description, amount, type };
    }).filter(row => row.date && row.amount); // Filter out invalid rows

    // Sort by date (newest first) and limit to recent 18 months
    // Extended from 6 to 18 months to accommodate full year lookbacks
    const eighteenMonthsAgo = new Date();
    eighteenMonthsAgo.setMonth(eighteenMonthsAgo.getMonth() - 18);

    const recentData = compressedData.filter((row: any) => {
      try {
        const transactionDate = new Date(row.date);
        return transactionDate >= eighteenMonthsAgo;
      } catch {
        return true; // Keep if date parsing fails (let AI handle it)
      }
    });

    console.log(`Filtered to ${recentData.length} recent transactions (last 18 months)`);
    console.log(`Data reduction: ${jsonData.length} → ${recentData.length} rows (${((1 - recentData.length/jsonData.length) * 100).toFixed(1)}% reduction)`);

    // If we filtered out too much data, warn and use all data
    if (recentData.length === 0 && compressedData.length > 0) {
      console.log(`⚠️  Warning: All transactions filtered out by date. Using all ${compressedData.length} transactions instead.`);
      return JSON.stringify(compressedData);
    }

    return JSON.stringify(recentData);
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
              text: `Extract ALL transaction data from this bank statement image.

For each transaction, provide:
- Date (YYYY-MM-DD format)
- Description
- Amount (positive for deposits, negative for withdrawals)

Include:
- All deposits (income, paychecks, transfers in)
- All withdrawals (purchases, payments, transfers out)
- Account balance information if visible

Format each transaction on a new line like:
2024-08-15 | Paycheck Deposit | +3500.00
2024-08-16 | Grocery Store | -125.50

Be thorough and extract EVERY transaction visible in the image.`,
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
      max_tokens: 4096, // GPT-4o uses max_tokens
    }, {
      timeout: TIMEOUT_MS, // SDK timeout as backup
    });

    console.log('   ⏳ Waiting for response...');
    // Race the API call against the timeout
    const response = await Promise.race([apiCallPromise, timeoutPromise]);

    const elapsedTime = Date.now() - startTime;
    console.log(`✅ [5/5] API response received in ${(elapsedTime / 1000).toFixed(2)}s`);
    console.log(`   📝 Response length: ${response.choices[0]?.message?.content?.length || 0} chars`);

    return response.choices[0]?.message?.content || '';
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
              text: `Extract ALL transaction data from this bank statement PDF.

For each transaction, provide:
- Date (YYYY-MM-DD format)
- Description
- Amount (positive for deposits, negative for withdrawals)

Include:
- All deposits (income, paychecks, transfers in)
- All withdrawals (purchases, payments, transfers out)
- Account balance information if visible

Format each transaction on a new line like:
2024-08-15 | Paycheck Deposit | +3500.00
2024-08-16 | Grocery Store | -125.50

Be thorough and extract EVERY transaction visible in the PDF.`,
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
      max_tokens: 16000, // Higher limit for multi-page PDFs
    } as any, {
      timeout: TIMEOUT_MS,
    });

    console.log('   ⏳ Waiting for response...');
    const response = await Promise.race([apiCallPromise, timeoutPromise]);

    const elapsedTime = Date.now() - startTime;
    console.log(`✅ [4/4] API response received in ${(elapsedTime / 1000).toFixed(2)}s`);
    console.log(`   📝 Response length: ${response.choices[0]?.message?.content?.length || 0} chars`);

    return response.choices[0]?.message?.content || '';
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
 * Analyze bank statements using OpenAI GPT-4
 */
export async function analyzeStatements(
  files: Express.Multer.File[],
  currentHousingPayment: number
): Promise<CashFlowAnalysis> {
  try {
    console.log(`Processing ${files.length} files...`);

    // Extract text/data from all files, with error handling for individual files
    const extractedData: string[] = [];
    const failedFiles: string[] = [];

    for (const file of files) {
      console.log(`Processing file: ${file.originalname}`);
      try {
        const content = await processFile(file);
        extractedData.push(content);
        console.log(`✓ Successfully processed ${file.originalname}`);
      } catch (error) {
        console.error(`✗ Failed to process ${file.originalname}:`, error instanceof Error ? error.message : error);
        failedFiles.push(file.originalname);
        // Continue processing other files instead of failing completely
      }
    }

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

    // Check if data needs chunking
    const chunks = chunkData(combinedData, 12000); // Conservative 12K tokens per chunk (leaves room for prompt)

    // For chunked data, process the first chunk for now (simplified approach)
    // Future enhancement: Process all chunks and merge results
    const dataToAnalyze = chunks.length > 1
      ? `${chunks[0]}\n\n[NOTE: This is chunk 1 of ${chunks.length}. Analysis is based on recent transactions.]`
      : combinedData;

    console.log(chunks.length > 1
      ? `⚠️  Using first chunk only (${chunks.length} chunks total). Recent transactions prioritized.`
      : `✓ Processing all data in single request`);

    // Use GPT-4 to analyze the transactions with enhanced anomaly detection
    const prompt = `You are a financial analysis expert. Analyze the following bank statement data covering multiple months of transactions.

Current housing payment (to exclude): $${currentHousingPayment}

Bank Statement Data:
${dataToAnalyze}

Please perform a COMPREHENSIVE analysis with the following objectives:

1. **EXTRACT & CATEGORIZE ALL TRANSACTIONS**:
   - "income": Regular income deposits (salary, wages, business income)
   - "expense": Regular recurring monthly expenses (groceries, utilities, insurance, subscriptions, etc.)
   - "housing": Current rent/mortgage payments (around $${currentHousingPayment})
   - "one-time": One-time or irregular transactions

2. **IDENTIFY ANOMALIES & FLAG FOR REVIEW**:
   Flag transactions that are:
   - **Luxury items**: High-end dining, designer purchases, jewelry, luxury travel
   - **Unusually large**: 2x or more above typical spending in that category
   - **One-time purchases**: Major purchases, large cash withdrawals, large deposits
   - **Irregular deposits**: Tax refunds, bonuses, gifts, large transfers
   - **Non-essential**: Entertainment, hobbies, discretionary spending above normal patterns

   For each flagged transaction, provide a specific reason (e.g., "Luxury dining - $500 at upscale restaurant", "One-time: New laptop purchase", "Irregular: Large tax refund")

3. **MONTHLY BREAKDOWN**:
   Provide month-by-month summary showing:
   - Total income per month
   - Total expenses per month (excluding housing and flagged items)
   - Net cash flow per month
   - Transaction count per month

4. **CALCULATE TOTALS** (Frontend will calculate monthly averages):
   - SUM of all income transactions across the entire data period
   - SUM of all expense transactions (EXCLUDING housing and flagged one-time items)
   - Net cash flow (total income - total expenses)

5. **CONFIDENCE SCORE**: Your confidence in the analysis (0-1 scale)

CRITICAL RULES:
- EXCLUDE current housing payments ($${currentHousingPayment}) from expense calculations
- FLAG any transaction that seems irregular, luxury, or one-time
- Only include predictable recurring expenses in the final average
- Look back at as much historical data as possible
- Be conservative: when in doubt, flag it for user review

Return your response in the following JSON format:
{
  "transactions": [
    {
      "date": "YYYY-MM-DD",
      "description": "Transaction description",
      "amount": 1234.56,
      "category": "income" | "expense" | "housing" | "one-time",
      "flagged": true/false,
      "flagReason": "Luxury dining - $500 at upscale restaurant" (only if flagged),
      "monthYear": "2024-08"
    }
  ],
  "monthlyBreakdown": [
    {
      "month": "2024-08",
      "income": 5000.00,
      "expenses": 2500.00,
      "netCashFlow": 2500.00,
      "transactionCount": 45
    }
  ],
  "totalIncome": 5000.00,
  "totalExpenses": 2500.00,
  "netCashFlow": 2500.00,
  "confidence": 0.85
}`;

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
    const analysisApiCallPromise = openaiDirect.chat.completions.create({
      model: TEXT_MODEL,
      messages: [
        {
          role: 'system',
          content: 'You are a financial analyst specialized in cash flow analysis. Always respond with valid JSON.',
        },
        {
          role: 'user',
          content: prompt,
        },
      ],
      response_format: { type: 'json_object' },
      temperature: 0.1,
      max_tokens: 8000,
    }, {
      timeout: ANALYSIS_TIMEOUT_MS,
    });

    console.log(`🏁 Racing main analysis against ${ANALYSIS_TIMEOUT_MS / 1000}s timeout...`);
    // Race the API call against the timeout
    const response = await Promise.race([analysisApiCallPromise, analysisTimeoutPromise]);
    console.log('✅ AI analysis completed successfully');

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

    console.log('📈 Analysis Results:');
    console.log(`  ✓ Total transactions: ${result.transactions?.length || 0}`);
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
      transactions: result.transactions || [],
      monthlyBreakdown: result.monthlyBreakdown || [],
      flaggedTransactions,
      confidence: result.confidence || 0.7,
    };
  } catch (error) {
    console.error('Error in analyzeStatements:', error);
    throw new Error(`Failed to analyze bank statements: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}
