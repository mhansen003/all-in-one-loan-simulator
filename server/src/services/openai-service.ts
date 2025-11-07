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

    // Extract text from each page with intelligent filtering
    for (let pageNum = 1; pageNum <= numPages; pageNum++) {
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
        skippedPages++;
        continue;
      }

      allText += pageText + '\n\n';
      console.log(`Extracted page ${pageNum}/${numPages}`);
    }

    console.log(`Successfully extracted ${numPages - skippedPages}/${numPages} pages (skipped ${skippedPages} irrelevant pages)`);
    return allText;
  } catch (error) {
    console.error('Error extracting PDF text:', error);
    throw new Error('Failed to extract text from PDF');
  }
}

/**
 * Extract data from Excel/CSV file
 */
async function extractDataFromSpreadsheet(filePath: string): Promise<string> {
  try {
    const workbook = xlsx.readFile(filePath);
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    const jsonData = xlsx.utils.sheet_to_json(worksheet);
    return JSON.stringify(jsonData, null, 2);
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
 * Analyze bank statements using OpenAI GPT-4
 *
 * OPTIMIZATIONS:
 * - Parallel file processing for faster extraction
 * - Streamlined prompt for quicker AI response
 * - gpt-4o-mini model for 2-3x faster analysis with same accuracy
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

    // Streamlined prompt - shorter but retains all critical instructions (optimization #2)
    const prompt = `Analyze bank statement transactions. Housing payment to exclude: $${currentHousingPayment}

DATA:
${combinedData}

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

    console.log('Analyzing combined transaction data with AI...');
    console.log(`[TIMING] Combined data length: ${combinedData.length} characters (~${Math.ceil(combinedData.length/4)} tokens)`);

    const aiStart = Date.now();
    // Use gpt-4o-mini: 2-3x faster with same accuracy for structured tasks (optimization #3)
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
      max_tokens: 3000, // Reduced from 4096 (optimization #4)
    }, {
      timeout: 60000, // Reduced from 90s to 60s due to faster model
    });

    const aiTime = Date.now() - aiStart;
    console.log(`[TIMING] AI analysis took ${aiTime}ms (${(aiTime/1000).toFixed(1)}s)`);
    console.log('AI analysis completed successfully');

    const result = JSON.parse(response.choices[0]?.message?.content || '{}');
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
