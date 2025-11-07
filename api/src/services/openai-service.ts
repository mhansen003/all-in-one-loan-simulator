import OpenAI from 'openai';
import fs from 'fs/promises';
import path from 'path';
import xlsx from 'xlsx';
import type { CashFlowAnalysis, Transaction, OpenAIAnalysisResult } from '../types.js';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

/**
 * Extract text from PDF file using GPT-4 Vision
 * This is the most reliable method for serverless environments
 * Works with both text-based and scanned/image-based PDFs
 */
async function extractTextFromPDF(filePath: string): Promise<string> {
  try {
    console.log('Extracting text from PDF using GPT-4 Vision...');

    // Read the PDF file
    const fileBuffer = await fs.readFile(filePath);
    const base64Pdf = fileBuffer.toString('base64');

    // Use GPT-4 Vision to extract transaction data
    const response = await openai.chat.completions.create({
      model: 'gpt-4o',
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
              type: 'image_url',
              image_url: {
                url: `data:application/pdf;base64,${base64Pdf}`,
              },
            },
          ],
        },
      ],
      max_tokens: 4096,
    });

    const extractedText = response.choices[0]?.message?.content || '';
    console.log(`Successfully extracted transaction data from PDF`);
    return extractedText;
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
 * Analyze image file using GPT-4 Vision
 */
async function analyzeImage(filePath: string): Promise<string> {
  try {
    const imageBuffer = await fs.readFile(filePath);
    const base64Image = imageBuffer.toString('base64');
    const ext = path.extname(filePath).toLowerCase();
    const mimeType = ext === '.png' ? 'image/png' : 'image/jpeg';

    const response = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'text',
              text: 'Extract all transaction data from this bank statement image. Return the transactions in a structured format with date, description, and amount.',
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

    return response.choices[0]?.message?.content || '';
  } catch (error) {
    console.error('Error analyzing image:', error);
    throw new Error('Failed to analyze image with GPT-4 Vision');
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

    // Use GPT-4 to analyze the transactions
    const prompt = `You are a financial analysis expert. Analyze the following bank statement data covering 12 months of transactions.

Current housing payment (to exclude): $${currentHousingPayment}

Bank Statement Data:
${combinedData}

Please analyze these transactions and provide:

1. **All Transactions**: Extract and categorize every transaction as:
   - "income": Regular income deposits (salary, wages, business income)
   - "expense": Regular recurring expenses
   - "housing": Current rent or mortgage payments (around $${currentHousingPayment})
   - "one-time": One-time large expenses (vacations, large purchases, etc.)

2. **Cash Flow Summary**:
   - Total monthly income (average)
   - Total monthly expenses (average, EXCLUDING housing and one-time)
   - Net monthly cash flow

3. **Confidence Score**: Your confidence in the analysis (0-1 scale)

IMPORTANT RULES:
- Exclude current housing payments (rent/mortgage around $${currentHousingPayment}) from recurring expenses
- Flag one-time expenses separately (vacations, major purchases)
- Only include recurring, predictable expenses in the total
- Calculate averages across the full 12-month period

Return your response in the following JSON format:
{
  "transactions": [
    {
      "date": "YYYY-MM-DD",
      "description": "Transaction description",
      "amount": 1234.56,
      "category": "income" | "expense" | "housing" | "one-time"
    }
  ],
  "totalIncome": 5000.00,
  "totalExpenses": 3000.00,
  "netCashFlow": 2000.00,
  "confidence": 0.85
}`;

    const response = await openai.chat.completions.create({
      model: 'gpt-4o',
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

    return {
      totalIncome: result.totalIncome || 0,
      totalExpenses: result.totalExpenses || 0,
      netCashFlow: result.netCashFlow || 0,
      averageMonthlyBalance,
      transactions: result.transactions || [],
      confidence: result.confidence || 0.7,
    };
  } catch (error) {
    console.error('Error in analyzeStatements:', error);
    throw new Error(`Failed to analyze bank statements: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}
