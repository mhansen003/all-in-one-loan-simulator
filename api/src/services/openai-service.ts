import OpenAI from 'openai';
import fs from 'fs/promises';
import path from 'path';
import xlsx from 'xlsx';
import type { CashFlowAnalysis, Transaction, OpenAIAnalysisResult } from '../types.js';

// Configure OpenAI client to use OpenRouter
const openai = new OpenAI({
  apiKey: process.env.OPENROUTER_API_KEY,
  baseURL: 'https://openrouter.ai/api/v1',
  defaultHeaders: {
    'HTTP-Referer': process.env.YOUR_SITE_URL || 'https://aio-simulator.cmgfinancial.ai',
    'X-Title': 'All-In-One Loan Simulator',
  },
});

/**
 * Note: PDFs are now converted to images CLIENT-SIDE using pdf.js in the browser.
 * This eliminates server-side native dependency issues in serverless environments.
 * The analyzeImage function below handles the converted PDF images.
 */

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
 * Analyze image file using vision model via OpenRouter
 * Supports images from various sources including client-side PDF conversions
 */
async function analyzeImage(filePath: string): Promise<string> {
  try {
    console.log('Analyzing image with vision model via OpenRouter...');
    const imageBuffer = await fs.readFile(filePath);
    const base64Image = imageBuffer.toString('base64');
    const ext = path.extname(filePath).toLowerCase();
    const mimeType = ext === '.png' ? 'image/png' : 'image/jpeg';

    const response = await openai.chat.completions.create({
      model: 'openai/gpt-4o', // OpenRouter model format
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
      max_tokens: 4096,
    });

    console.log('Successfully extracted transaction data from image');
    return response.choices[0]?.message?.content || '';
  } catch (error) {
    console.error('Error analyzing image:', error);
    throw new Error('Failed to analyze image with vision model');
  }
}

/**
 * Process a single bank statement file
 * Note: PDFs are converted to images client-side before upload
 */
async function processFile(file: Express.Multer.File): Promise<string> {
  const ext = path.extname(file.originalname).toLowerCase();

  if (ext === '.csv' || ext === '.xlsx' || ext === '.xls') {
    return await extractDataFromSpreadsheet(file.path);
  } else if (['.jpg', '.jpeg', '.png', '.gif', '.webp'].includes(ext)) {
    return await analyzeImage(file.path);
  } else {
    throw new Error(`Unsupported file type: ${ext}. PDFs should be converted to images client-side.`);
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
    // Extract text/data from all files
    const extractedData: string[] = [];
    for (const file of files) {
      console.log(`Processing file: ${file.originalname}`);
      const content = await processFile(file);
      extractedData.push(content);
    }

    const combinedData = extractedData.join('\n\n---NEW DOCUMENT---\n\n');

    // Use GPT-4 to analyze the transactions with enhanced anomaly detection
    const prompt = `You are a financial analysis expert. Analyze the following bank statement data covering multiple months of transactions.

Current housing payment (to exclude): $${currentHousingPayment}

Bank Statement Data:
${combinedData}

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

4. **CALCULATE AVERAGES**:
   - Average monthly income
   - Average monthly expenses (EXCLUDING housing and flagged one-time items)
   - Average net monthly cash flow (available to offset mortgage principal)

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

    const response = await openai.chat.completions.create({
      model: 'openai/gpt-4o', // OpenRouter model format
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
    });

    const result = JSON.parse(response.choices[0]?.message?.content || '{}');

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

    console.log(`Analysis complete: ${result.transactions?.length || 0} total transactions, ${flaggedTransactions.length} flagged for review`);

    return {
      totalIncome: result.totalIncome || 0,
      totalExpenses: result.totalExpenses || 0,
      netCashFlow: result.netCashFlow || 0,
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
