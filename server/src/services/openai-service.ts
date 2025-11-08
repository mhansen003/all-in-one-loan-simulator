import OpenAI from 'openai';
import fs from 'fs/promises';
import path from 'path';
import xlsx from 'xlsx';
// Use legacy build for Node.js - doesn't require worker files
import * as pdfjsLib from 'pdfjs-dist/legacy/build/pdf.mjs';
import type { CashFlowAnalysis, Transaction, OpenAIAnalysisResult } from '../types.js';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

/**
 * Extract text from PDF file using pdfjs-dist legacy build
 *
 * OPTIMIZATION: Skip irrelevant pages (disclosures, blank pages)
 * to reduce processing time and AI token usage
 */
async function extractTextFromPDF(filePath: string): Promise<string> {
  try {
    console.log('Extracting text from PDF using pdfjs-dist legacy...');
    const pdfBuffer = await fs.readFile(filePath);

    // Load the PDF document (legacy build doesn't require worker)
    const loadingTask = pdfjsLib.getDocument({
      data: new Uint8Array(pdfBuffer),
      useSystemFonts: true,
      isEvalSupported: false, // Disable eval for serverless security
    });

    const pdfDocument = await loadingTask.promise;
    const numPages = pdfDocument.numPages;
    console.log(`PDF has ${numPages} pages`);

    let allText = '';
    let skippedPages = 0;

    // Keywords that indicate non-transaction pages to skip
    const skipKeywords = [
      'IN CASE OF ERRORS',
      'INTENTIONALLY LEFT BLANK',
      'MEMBER FDIC',
      'DISCLOSURE',
      'PRIVACY NOTICE',
      'TERMS AND CONDITIONS',
      'IMPORTANT INFORMATION',
    ];

    // Extract text from each page in parallel with intelligent filtering
    const pagePromises = Array.from({ length: numPages }, async (_, i) => {
      const pageNum = i + 1;
      const page = await pdfDocument.getPage(pageNum);
      const textContent = await page.getTextContent();

      // Combine text items
      const pageText = textContent.items
        .map((item: any) => item.str)
        .join(' ');

      // Check if page should be skipped (disclosures, blank pages, etc.)
      const shouldSkip = skipKeywords.some(keyword =>
        pageText.toUpperCase().includes(keyword)
      ) || pageText.trim().length < 100; // Skip if very little content

      if (shouldSkip) {
        console.log(`Skipped page ${pageNum}/${numPages} (disclosure/blank page)`);
        return null; // Return null for skipped pages
      }

      console.log(`Extracted page ${pageNum}/${numPages}`);
      return pageText;
    });

    // Wait for all pages to be processed in parallel
    const pageTexts = await Promise.all(pagePromises);

    // Filter out skipped pages and join
    const validPages = pageTexts.filter((text): text is string => text !== null);
    allText = validPages.join('\n\n');
    skippedPages = numPages - validPages.length;

    console.log(`Successfully extracted ${validPages.length}/${numPages} pages (skipped ${skippedPages} irrelevant pages)`);
    return allText;
  } catch (error) {
    console.error('Error extracting PDF text:', error);
    throw new Error('Failed to extract text from PDF');
  }
}

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

    // Sort by date (newest first) and limit to recent 6 months (180 days)
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

    const recentData = compressedData.filter((row: any) => {
      try {
        const transactionDate = new Date(row.date);
        return transactionDate >= sixMonthsAgo;
      } catch {
        return true; // Keep if date parsing fails (let AI handle it)
      }
    });

    console.log(`Filtered to ${recentData.length} recent transactions (last 6 months)`);
    console.log(`Data reduction: ${jsonData.length} → ${recentData.length} rows (${((1 - recentData.length/jsonData.length) * 100).toFixed(1)}% reduction)`);

    return JSON.stringify(recentData);
  } catch (error) {
    console.error('Error extracting spreadsheet data:', error);
    throw new Error('Failed to extract data from spreadsheet');
  }
}

/**
 * Analyze image file using GPT-4o-mini Vision (faster, same accuracy)
 */
async function analyzeImage(filePath: string): Promise<string> {
  try {
    const imageBuffer = await fs.readFile(filePath);
    const base64Image = imageBuffer.toString('base64');
    const ext = path.extname(filePath).toLowerCase();
    const mimeType = ext === '.png' ? 'image/png' : 'image/jpeg';

    // gpt-4o-mini also supports vision with faster processing
    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'text',
              text: 'Extract transaction data: date, description, amount. Format as structured text.',
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
      max_tokens: 3000,
    });

    return response.choices[0]?.message?.content || '';
  } catch (error) {
    console.error('Error analyzing image:', error);
    throw new Error('Failed to analyze image with GPT-4o-mini Vision');
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
 * Process a single bank statement file
 */
async function processFile(file: Express.Multer.File): Promise<string> {
  const ext = path.extname(file.originalname).toLowerCase();

  if (ext === '.pdf') {
    return await extractTextFromPDF(file.path);
  } else if (ext === '.csv' || ext === '.xlsx' || ext === '.xls') {
    return await extractDataFromSpreadsheet(file.path);
  } else if (['.jpg', '.jpeg', '.png', '.gif', '.webp'].includes(ext)) {
    return await analyzeImage(file.path);
  } else {
    throw new Error(`Unsupported file type: ${ext}`);
  }
}

/**
 * Analyze a single chunk of transaction data
 */
async function analyzeChunk(
  chunkData: string,
  chunkIndex: number,
  totalChunks: number,
  currentHousingPayment: number
): Promise<OpenAIAnalysisResult> {
  console.log(`[CHUNK ${chunkIndex + 1}/${totalChunks}] Analyzing...`);

  const prompt = `Analyze bank statement transactions. Housing payment to exclude: $${currentHousingPayment}

DATA:
${chunkData}

Extract all transactions and categorize as:
- "income": Regular income/deposits
- "expense": Recurring expenses
- "housing": Rent/mortgage (~$${currentHousingPayment})
- "one-time": Irregular large expenses

Flag one-time/irregular transactions with reason. Group by month (YYYY-MM). Detect deposit frequency (monthly/biweekly/weekly). Calculate averages EXCLUDING housing and flagged items.

JSON format:
{
  "transactions": [{"date": "YYYY-MM-DD", "description": "...", "amount": 0, "category": "income|expense|housing|one-time", "flagged": false, "flagReason": "...", "excluded": false}],
  "monthlyBreakdown": [{"month": "YYYY-MM", "income": 0, "expenses": 0, "netCashFlow": 0, "transactionCount": 0}],
  "depositFrequency": "monthly",
  "monthlyDeposits": 0,
  "monthlyExpenses": 0,
  "monthlyLeftover": 0,
  "totalIncome": 0,
  "totalExpenses": 0,
  "netCashFlow": 0,
  "confidence": 0.85
}`;

  const response = await openai.chat.completions.create({
    model: 'gpt-4o-mini',
    messages: [
      {
        role: 'system',
        content: 'You are a financial analyst. Respond with valid JSON only.',
      },
      {
        role: 'user',
        content: prompt,
      },
    ],
    response_format: { type: 'json_object' },
    temperature: 0.1,
    max_tokens: 3000,
  }, {
    timeout: 60000,
  });

  const result = JSON.parse(response.choices[0]?.message?.content || '{}');
  console.log(`[CHUNK ${chunkIndex + 1}/${totalChunks}] Completed: ${result.transactions?.length || 0} transactions analyzed`);

  return result;
}

/**
 * Merge multiple analysis results from chunks
 */
function mergeAnalysisResults(results: OpenAIAnalysisResult[]): OpenAIAnalysisResult {
  const merged: OpenAIAnalysisResult = {
    transactions: [],
    monthlyBreakdown: [],
    depositFrequency: results[0]?.depositFrequency || 'monthly',
    monthlyDeposits: 0,
    monthlyExpenses: 0,
    monthlyLeftover: 0,
    totalIncome: 0,
    totalExpenses: 0,
    netCashFlow: 0,
    confidence: 0,
  };

  // Merge all transactions
  results.forEach(result => {
    merged.transactions.push(...(result.transactions || []));
  });

  // Merge monthly breakdowns by month
  const monthlyMap = new Map<string, any>();
  results.forEach(result => {
    (result.monthlyBreakdown || []).forEach((month: any) => {
      const existing = monthlyMap.get(month.month);
      if (existing) {
        existing.income += month.income || 0;
        existing.expenses += month.expenses || 0;
        existing.netCashFlow += month.netCashFlow || 0;
        existing.transactionCount += month.transactionCount || 0;
      } else {
        monthlyMap.set(month.month, { ...month });
      }
    });
  });
  merged.monthlyBreakdown = Array.from(monthlyMap.values()).sort();

  // Calculate totals
  merged.totalIncome = results.reduce((sum, r) => sum + (r.totalIncome || 0), 0);
  merged.totalExpenses = results.reduce((sum, r) => sum + (r.totalExpenses || 0), 0);
  merged.netCashFlow = merged.totalIncome - merged.totalExpenses;

  // Calculate monthly averages
  const monthCount = merged.monthlyBreakdown.length || 1;
  merged.monthlyDeposits = merged.totalIncome / monthCount;
  merged.monthlyExpenses = merged.totalExpenses / monthCount;
  merged.monthlyLeftover = merged.netCashFlow / monthCount;

  // Average confidence
  merged.confidence = results.reduce((sum, r) => sum + (r.confidence || 0), 0) / results.length;

  console.log(`Merged ${results.length} chunk results: ${merged.transactions.length} total transactions`);

  return merged;
}

/**
 * Analyze bank statements using OpenAI GPT-4
 *
 * OPTIMIZATIONS:
 * - Parallel file processing for faster extraction
 * - Streamlined prompt for quicker AI response
 * - gpt-4o-mini model for 2-3x faster analysis with same accuracy
 * - Smart data sampling (last 6 months) to reduce token usage
 * - Intelligent chunking for large files to avoid rate limits
 */
export async function analyzeStatements(
  files: Express.Multer.File[],
  currentHousingPayment: number
): Promise<CashFlowAnalysis> {
  const startTime = Date.now();
  try {
    // Extract text/data from all files IN PARALLEL (optimization #1)
    console.log(`[TIMING] Starting analysis at ${new Date().toISOString()}`);
    console.log(`Processing ${files.length} files in parallel...`);

    const extractionStart = Date.now();
    const extractionPromises = files.map(file => {
      console.log(`Starting: ${file.originalname}`);
      return processFile(file);
    });

    const extractedData = await Promise.all(extractionPromises);
    const extractionTime = Date.now() - extractionStart;
    console.log(`[TIMING] File extraction took ${extractionTime}ms (${(extractionTime/1000).toFixed(1)}s)`);
    console.log(`All ${files.length} files processed successfully`);

    const combinedData = extractedData.join('\n\n---NEW DOCUMENT---\n\n');

    // Check if data needs to be chunked (optimization: avoid rate limits)
    console.log('Analyzing combined transaction data with AI...');
    console.log(`[TIMING] Combined data length: ${combinedData.length} characters (~${estimateTokens(combinedData)} tokens)`);

    const chunks = chunkData(combinedData, 12000); // Conservative 12K tokens per chunk (leaves room for prompt)

    const aiStart = Date.now();
    let result: OpenAIAnalysisResult;

    if (chunks.length === 1) {
      // Single chunk - process normally
      console.log('Processing as single chunk');
      result = await analyzeChunk(chunks[0], 0, 1, currentHousingPayment);
    } else {
      // Multiple chunks - process sequentially with delay to respect rate limits
      console.log(`Processing ${chunks.length} chunks sequentially...`);
      const chunkResults: OpenAIAnalysisResult[] = [];

      for (let i = 0; i < chunks.length; i++) {
        // Add delay between chunks to respect rate limits (except for first chunk)
        if (i > 0) {
          const delayMs = 3000; // 3 second delay between chunks
          console.log(`Waiting ${delayMs}ms before next chunk...`);
          await new Promise(resolve => setTimeout(resolve, delayMs));
        }

        const chunkResult = await analyzeChunk(chunks[i], i, chunks.length, currentHousingPayment);
        chunkResults.push(chunkResult);
      }

      // Merge all chunk results
      result = mergeAnalysisResults(chunkResults);
    }

    const aiTime = Date.now() - aiStart;
    console.log(`[TIMING] AI analysis took ${aiTime}ms (${(aiTime/1000).toFixed(1)}s)`);
    console.log('AI analysis completed successfully');
    console.log(`Parsed ${result.transactions?.length || 0} transactions`);
    console.log(`Monthly deposits: $${result.monthlyDeposits || 0}`);
    console.log(`Monthly expenses: $${result.monthlyExpenses || 0}`);
    console.log(`Confidence score: ${result.confidence || 0}`);

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

    // Extract flagged transactions
    const flaggedTransactions = (result.transactions || []).filter((t: any) => t.flagged);

    const totalTime = Date.now() - startTime;
    console.log(`[TIMING] ✅ Total analysis completed in ${totalTime}ms (${(totalTime/1000).toFixed(1)}s)`);
    console.log(`[TIMING] Breakdown: Extraction=${extractionTime}ms, AI=${aiTime}ms, Overhead=${totalTime-extractionTime-aiTime}ms`);

    return {
      totalIncome: result.totalIncome || 0,
      totalExpenses: result.totalExpenses || 0,
      netCashFlow: result.netCashFlow || 0,
      averageMonthlyBalance,
      transactions: result.transactions || [],
      flaggedTransactions,
      monthlyBreakdown: result.monthlyBreakdown || [],
      depositFrequency: result.depositFrequency || 'monthly',
      monthlyDeposits: result.monthlyDeposits || result.totalIncome || 0,
      monthlyExpenses: result.monthlyExpenses || result.totalExpenses || 0,
      monthlyLeftover: result.monthlyLeftover || result.netCashFlow || 0,
      confidence: result.confidence || 0.7,
    };
  } catch (error) {
    const errorTime = Date.now() - startTime;
    console.error(`[TIMING] ❌ Analysis failed after ${errorTime}ms`);
    console.error('Error in analyzeStatements:', error);
    throw new Error(`Failed to analyze bank statements: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}
