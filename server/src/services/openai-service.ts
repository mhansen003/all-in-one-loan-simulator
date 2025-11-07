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
 * (legacy build designed for Node.js, no worker files needed)
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

    // Extract text from each page
    for (let pageNum = 1; pageNum <= numPages; pageNum++) {
      const page = await pdfDocument.getPage(pageNum);
      const textContent = await page.getTextContent();

      // Combine text items
      const pageText = textContent.items
        .map((item: any) => item.str)
        .join(' ');

      allText += pageText + '\n\n';
      console.log(`Extracted page ${pageNum}/${numPages}`);
    }

    console.log(`Successfully extracted text from ${numPages} pages`);
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
    const prompt = `You are a financial analysis expert. Analyze the following bank statement data covering multiple months of transactions.

Current housing payment (to exclude): $${currentHousingPayment}

Bank Statement Data:
${combinedData}

Please analyze these transactions and provide:

1. **All Transactions**: Extract and categorize every transaction as:
   - "income": Regular income deposits (salary, wages, business income)
   - "expense": Regular recurring expenses
   - "housing": Current rent or mortgage payments (around $${currentHousingPayment})
   - "one-time": One-time large expenses (vacations, large purchases, etc.)

2. **Transaction Flagging**: For each irregular/one-time transaction, provide:
   - "flagged": true/false
   - "flagReason": Why it was flagged (e.g., "Unusually large amount", "One-time purchase", "Irregular timing")

3. **Monthly Breakdown**: Group transactions by month and provide:
   - month: "YYYY-MM"
   - income: Total income for that month
   - expenses: Total expenses for that month
   - netCashFlow: Net for that month
   - transactionCount: Number of transactions

4. **Deposit Frequency Detection**: Analyze income deposits to determine:
   - "monthly": Deposits once per month
   - "biweekly": Deposits every 2 weeks (26 times/year)
   - "weekly": Deposits every week (52 times/year)

5. **Cash Flow Summary**:
   - Average monthly deposits/income
   - Average monthly expenses (EXCLUDING housing and flagged one-time)
   - Average monthly leftover (deposits - expenses)
   - Net monthly cash flow

6. **Confidence Score**: Your confidence in the analysis (0-1 scale)

IMPORTANT RULES:
- Exclude current housing payments (rent/mortgage around $${currentHousingPayment}) from recurring expenses
- Flag one-time expenses with specific reasons
- Only include recurring, predictable expenses in the total
- Calculate averages across the full period analyzed
- Detect deposit frequency by analyzing timing of income deposits

Return your response in the following JSON format:
{
  "transactions": [
    {
      "date": "YYYY-MM-DD",
      "description": "Transaction description",
      "amount": 1234.56,
      "category": "income" | "expense" | "housing" | "one-time",
      "flagged": true,
      "flagReason": "One-time vacation expense",
      "excluded": false
    }
  ],
  "monthlyBreakdown": [
    {
      "month": "2024-01",
      "income": 5000.00,
      "expenses": 3000.00,
      "netCashFlow": 2000.00,
      "transactionCount": 45
    }
  ],
  "depositFrequency": "biweekly",
  "monthlyDeposits": 5000.00,
  "monthlyExpenses": 3000.00,
  "monthlyLeftover": 2000.00,
  "totalIncome": 5000.00,
  "totalExpenses": 3000.00,
  "netCashFlow": 2000.00,
  "confidence": 0.85
}`;

    console.log('Analyzing combined transaction data with AI...');
    console.log(`Combined data length: ${combinedData.length} characters`);

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
      max_tokens: 4096, // Limit response size
    }, {
      timeout: 90000, // 90 second timeout
    });

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
    console.error('Error in analyzeStatements:', error);
    throw new Error(`Failed to analyze bank statements: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}
