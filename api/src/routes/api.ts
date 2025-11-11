import express from 'express';
import multer from 'multer';
import path from 'path';
import { existsSync, mkdirSync } from 'fs';
import { analyzeStatements } from '../services/openai-service.js';
import { calculateEligibility } from '../services/eligibility-checker.js';
import { simulateLoan } from '../services/loan-calculator-v3.js';
import type { MortgageDetails, CashFlowAnalysis } from '../types.js';
import { nanoid } from 'nanoid';
import { kv } from '@vercel/kv';

const router = express.Router();

// Determine upload directory based on environment
// Vercel serverless functions can only write to /tmp
const UPLOAD_DIR = process.env.VERCEL ? '/tmp' : 'uploads';

// Ensure upload directory exists (for local development)
if (!process.env.VERCEL && !existsSync(UPLOAD_DIR)) {
  mkdirSync(UPLOAD_DIR, { recursive: true });
}

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, UPLOAD_DIR);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
    cb(null, `${file.fieldname}-${uniqueSuffix}${path.extname(file.originalname)}`);
  },
});

const upload = multer({
  storage,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB max file size
  },
  fileFilter: (req, file, cb) => {
    // Accept PDF, images, and Excel files
    const allowedTypes = /pdf|jpg|jpeg|png|gif|webp|csv|xlsx|xls/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);

    if (extname && mimetype) {
      cb(null, true);
    } else {
      cb(new Error('Only PDF, image, and Excel files are allowed'));
    }
  },
});

// Health check
router.get('/health', (req, res) => {
  res.json({ status: 'ok', message: 'API is running' });
});

// Test AI connectivity (OpenRouter or OpenAI direct)
router.get('/test-ai', async (req, res) => {
  try {
    const USE_OPENROUTER = process.env.USE_OPENROUTER === 'true';
    console.log(`🧪 Testing AI connectivity (${USE_OPENROUTER ? 'OpenRouter' : 'OpenAI Direct'})...`);

    const { default: OpenAI } = await import('openai');

    const openai = USE_OPENROUTER
      ? new OpenAI({
          apiKey: process.env.OPENROUTER_API_KEY,
          baseURL: 'https://openrouter.ai/api/v1',
          defaultHeaders: {
            'HTTP-Referer': process.env.YOUR_SITE_URL || 'https://aio-simulator.cmgfinancial.ai',
            'X-Title': 'All-In-One Look Back Simulator',
          },
        })
      : new OpenAI({
          apiKey: process.env.OPENAI_API_KEY,
        });

    const MODEL = USE_OPENROUTER ? 'google/gemini-2.0-flash-001' : 'gpt-4o';

    console.log('   📡 Endpoint:', openai.baseURL || 'https://api.openai.com/v1');
    console.log('   🔑 API Key configured:', USE_OPENROUTER ? !!process.env.OPENROUTER_API_KEY : !!process.env.OPENAI_API_KEY);
    console.log(`   🚀 Sending test request to ${MODEL}...`);

    const startTime = Date.now();
    const response = await openai.chat.completions.create({
      model: MODEL,
      messages: [
        {
          role: 'user',
          content: 'Say "Hello" in exactly one word.',
        },
      ],
      max_tokens: 10, // GPT-4o uses max_tokens
    }, {
      timeout: 30000, // 30 second timeout for test
    });

    const elapsedTime = Date.now() - startTime;
    const result = response.choices[0]?.message?.content || '';

    console.log(`   ✅ Response received in ${(elapsedTime / 1000).toFixed(2)}s`);
    console.log(`   📝 Result: "${result}"`);

    res.json({
      status: 'success',
      message: `AI is responding (${USE_OPENROUTER ? 'OpenRouter/Claude' : 'OpenAI/GPT-4o Direct'})`,
      responseTime: `${(elapsedTime / 1000).toFixed(2)}s`,
      result: result,
      endpoint: openai.baseURL || 'https://api.openai.com/v1',
      model: MODEL,
      provider: USE_OPENROUTER ? 'OpenRouter' : 'OpenAI Direct',
    });
  } catch (error: any) {
    console.error('❌ AI test failed:', error);
    res.status(500).json({
      status: 'error',
      message: 'AI connectivity test failed',
      error: error.message || 'Unknown error',
      details: error.toString(),
    });
  }
});

// Analyze bank statements - BATCH PROCESSING
// This endpoint processes files in batches to avoid Vercel's 180s timeout
router.post('/analyze-statements-batch', upload.array('files', 4), async (req, res) => {
  try {
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({
        error: 'No files uploaded',
        message: 'Please upload at least one bank statement',
      });
    }

    const files = req.files as Express.Multer.File[];
    const currentHousingPayment = parseFloat(req.body.currentHousingPayment) || 0;
    const batchId = req.body.batchId || nanoid(10);
    const batchNumber = parseInt(req.body.batchNumber) || 1;
    const totalBatches = parseInt(req.body.totalBatches) || 1;

    console.log(`📦 Processing batch ${batchNumber}/${totalBatches} (ID: ${batchId})`);
    console.log(`📁 Files in this batch: ${files.length}`);
    console.log(`💰 Current housing payment: $${currentHousingPayment}`);

    // Analyze this batch of files
    const cashFlow = await analyzeStatements(files, currentHousingPayment);

    // Store batch result in KV with 1-hour expiration
    const batchKey = `batch:${batchId}:${batchNumber}`;
    await kv.set(batchKey, {
      batchNumber,
      cashFlow,
      fileCount: files.length,
      processedAt: new Date().toISOString(),
    }, { ex: 3600 }); // 1 hour expiration

    // Update batch progress
    const progressKey = `batch:${batchId}:progress`;
    await kv.set(progressKey, {
      completed: batchNumber,
      total: totalBatches,
      lastUpdate: new Date().toISOString(),
    }, { ex: 3600 });

    console.log(`✅ Batch ${batchNumber}/${totalBatches} completed`);

    res.json({
      success: true,
      batchId,
      batchNumber,
      totalBatches,
      cashFlow, // Return this batch's results
      message: `Batch ${batchNumber}/${totalBatches} processed successfully`,
    });
  } catch (error: any) {
    console.error(`❌ Error analyzing batch:`, error);
    res.status(500).json({
      error: 'Batch analysis failed',
      message: error.message || 'Failed to analyze batch',
    });
  }
});

// Get batch processing status
router.get('/batch-status/:batchId', async (req, res) => {
  try {
    const { batchId } = req.params;
    const progressKey = `batch:${batchId}:progress`;
    const progress = await kv.get(progressKey);

    if (!progress) {
      return res.status(404).json({
        error: 'Batch not found',
        message: 'No batch found with this ID',
      });
    }

    res.json({
      success: true,
      progress,
    });
  } catch (error: any) {
    console.error('Error getting batch status:', error);
    res.status(500).json({
      error: 'Status check failed',
      message: error.message,
    });
  }
});

// Combine all batch results into final cash flow analysis
router.post('/batch-complete/:batchId', async (req, res) => {
  try {
    const { batchId } = req.params;
    const { totalBatches, currentHousingPayment } = req.body;

    console.log(`🎯 Combining results for batch ID: ${batchId}`);

    // Retrieve all batch results
    const batchResults = [];
    for (let i = 1; i <= totalBatches; i++) {
      const batchKey = `batch:${batchId}:${i}`;
      const batchData: any = await kv.get(batchKey);
      if (batchData) {
        batchResults.push(batchData.cashFlow);
      }
    }

    if (batchResults.length === 0) {
      return res.status(404).json({
        error: 'No batch results found',
        message: 'Could not find any batch results to combine',
      });
    }

    // Combine all transactions from all batches
    const allTransactions = batchResults.flatMap(cf => cf.transactions || []);

    // Calculate combined totals
    const totalIncome = allTransactions
      .filter(t => ['income', 'salary', 'deposit'].includes(t.category?.toLowerCase()) && !t.excluded)
      .reduce((sum, t) => sum + Math.abs(t.amount), 0);

    const totalExpenses = allTransactions
      .filter(t => ['expense', 'recurring', 'payment'].includes(t.category?.toLowerCase()) && !t.excluded)
      .reduce((sum, t) => sum + Math.abs(t.amount), 0);

    const monthlyDeposits = batchResults[0].monthlyDeposits || 0;
    const monthlyExpenses = batchResults[0].monthlyExpenses || 0;
    const netCashFlow = monthlyDeposits - monthlyExpenses - currentHousingPayment;

    // Use first batch's deposit frequency
    const depositFrequency = batchResults[0].depositFrequency || 'monthly';

    const combinedCashFlow = {
      transactions: allTransactions,
      totalIncome,
      totalExpenses,
      monthlyDeposits,
      monthlyExpenses,
      netCashFlow,
      depositFrequency,
      monthlyLeftover: netCashFlow,
      currentHousingPayment,
    };

    // Clean up batch data from KV
    for (let i = 1; i <= totalBatches; i++) {
      await kv.del(`batch:${batchId}:${i}`);
    }
    await kv.del(`batch:${batchId}:progress`);

    console.log(`✅ Combined ${batchResults.length} batches with ${allTransactions.length} total transactions`);

    res.json({
      success: true,
      cashFlow: combinedCashFlow,
      message: 'All batches combined successfully',
    });
  } catch (error: any) {
    console.error('Error combining batches:', error);
    res.status(500).json({
      error: 'Batch combination failed',
      message: error.message,
    });
  }
});

// Analyze bank statements - LEGACY (single request, may timeout with many files)
router.post('/analyze-statements', upload.array('files', 20), async (req, res) => {
  try {
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({
        error: 'No files uploaded',
        message: 'Please upload at least one bank statement',
      });
    }

    const files = req.files as Express.Multer.File[];
    const currentHousingPayment = parseFloat(req.body.currentHousingPayment) || 0;

    console.log(`Processing ${files.length} files...`);
    console.log(`Current housing payment to exclude: $${currentHousingPayment}`);

    // Analyze the bank statements using OpenAI
    const cashFlow = await analyzeStatements(files, currentHousingPayment);

    res.json({
      cashFlow,
      message: 'Bank statements analyzed successfully',
    });
  } catch (error: any) {
    console.error('Error analyzing statements:', error);
    res.status(500).json({
      error: 'Analysis failed',
      message: error.message || 'Failed to analyze bank statements',
    });
  }
});

// Calculate eligibility
router.post('/calculate-eligibility', async (req, res) => {
  try {
    const { mortgageDetails, cashFlow } = req.body;

    if (!mortgageDetails || !cashFlow) {
      return res.status(400).json({
        error: 'Missing required data',
        message: 'Please provide mortgage details and cash flow analysis',
      });
    }

    const eligibility = calculateEligibility(
      mortgageDetails as MortgageDetails,
      cashFlow as CashFlowAnalysis
    );

    res.json({
      eligibility,
      message: 'Eligibility calculated successfully',
    });
  } catch (error: any) {
    console.error('Error calculating eligibility:', error);
    res.status(500).json({
      error: 'Calculation failed',
      message: error.message || 'Failed to calculate eligibility',
    });
  }
});

// Simulate loan
router.post('/simulate-loan', async (req, res) => {
  try {
    const { mortgageDetails, cashFlow } = req.body;

    if (!mortgageDetails || !cashFlow) {
      return res.status(400).json({
        error: 'Missing required data',
        message: 'Please provide mortgage details and cash flow analysis',
      });
    }

    const simulation = simulateLoan(
      mortgageDetails as MortgageDetails,
      cashFlow as CashFlowAnalysis
    );

    res.json({
      simulation,
      message: 'Loan simulation completed successfully',
    });
  } catch (error: any) {
    console.error('Error simulating loan:', error);
    res.status(500).json({
      error: 'Simulation failed',
      message: error.message || 'Failed to simulate loan',
    });
  }
});

// Generate PDF Proposal (server-side using Puppeteer)
router.post('/generate-pdf', async (req, res) => {
  try {
    const { simulation, mortgageDetails, clientName, loanOfficerName, loanOfficerEmail, aiPitch, components } = req.body;

    if (!simulation || !mortgageDetails || !components) {
      return res.status(400).json({
        error: 'Missing required data',
        message: 'Please provide simulation, mortgageDetails, and components',
      });
    }

    console.log('📄 Generating PDF proposal...');

    const { generateProposalPDF } = await import('../services/pdf-generator.js');

    const pdfBuffer = await generateProposalPDF({
      simulation,
      mortgageDetails,
      clientName,
      loanOfficerName,
      loanOfficerEmail,
      aiPitch,
      components,
    });

    // Generate filename
    const dateStr = new Date().toISOString().split('T')[0];
    const safeClientName = (clientName || 'Client').replace(/[^a-zA-Z0-9]/g, '-');
    const filename = `${safeClientName}-AIO-Proposal-${dateStr}.pdf`;

    // Set headers for file download
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.setHeader('Content-Length', pdfBuffer.length);

    // Send the PDF
    res.send(pdfBuffer);
  } catch (error: any) {
    console.error('Error generating PDF:', error);
    res.status(500).json({
      error: 'PDF generation failed',
      message: error.message || 'Failed to generate PDF proposal',
    });
  }
});

// Get detailed amortization schedule
router.post('/amortization-schedule', async (req, res) => {
  try {
    const { mortgageDetails, cashFlow, months } = req.body;

    if (!mortgageDetails || !cashFlow) {
      return res.status(400).json({
        error: 'Missing required data',
        message: 'Please provide mortgage details and cash flow analysis',
      });
    }

    const { getDetailedAmortization } = await import('../services/loan-calculator.js');

    const schedule = getDetailedAmortization(
      mortgageDetails as MortgageDetails,
      cashFlow as CashFlowAnalysis,
      months || 12
    );

    res.json({
      schedule,
      message: 'Amortization schedule generated successfully',
    });
  } catch (error: any) {
    console.error('Error generating schedule:', error);
    res.status(500).json({
      error: 'Schedule generation failed',
      message: error.message || 'Failed to generate amortization schedule',
    });
  }
});

// Quick savings estimate (no bank statement analysis required)
router.post('/estimate-savings', async (req, res) => {
  try {
    const { loanBalance, interestRate, avgMonthlyCashFlow, remainingMonths } = req.body;

    if (!loanBalance || !interestRate || !avgMonthlyCashFlow || !remainingMonths) {
      return res.status(400).json({
        error: 'Missing required parameters',
        message: 'Please provide: loanBalance, interestRate, avgMonthlyCashFlow, remainingMonths',
      });
    }

    const { estimateSavingsPotential } = await import('../services/loan-calculator.js');

    const estimate = estimateSavingsPotential(
      parseFloat(loanBalance),
      parseFloat(interestRate),
      parseFloat(avgMonthlyCashFlow),
      parseInt(remainingMonths)
    );

    res.json({
      estimate,
      message: 'Savings estimate calculated successfully',
    });
  } catch (error: any) {
    console.error('Error estimating savings:', error);
    res.status(500).json({
      error: 'Estimation failed',
      message: error.message || 'Failed to estimate savings',
    });
  }
});

// Calculate monthly payment
router.post('/calculate-payment', async (req, res) => {
  try {
    const { principal, annualRate, termMonths } = req.body;

    if (!principal || !annualRate || !termMonths) {
      return res.status(400).json({
        error: 'Missing required parameters',
        message: 'Please provide: principal, annualRate, termMonths',
      });
    }

    const { calculateMonthlyPayment } = await import('../services/loan-calculator.js');

    const payment = calculateMonthlyPayment(
      parseFloat(principal),
      parseFloat(annualRate),
      parseInt(termMonths)
    );

    res.json({
      monthlyPayment: payment,
      message: 'Monthly payment calculated successfully',
    });
  } catch (error: any) {
    console.error('Error calculating payment:', error);
    res.status(500).json({
      error: 'Calculation failed',
      message: error.message || 'Failed to calculate monthly payment',
    });
  }
});

// AI Pitch Guide - Get AI-powered answers about the All-In-One loan
router.post('/pitch-guide', async (req, res) => {
  try {
    const { question, conversationHistory } = req.body;

    if (!question) {
      return res.status(400).json({
        error: 'Missing required parameter',
        message: 'Please provide a question',
      });
    }

    const { OpenAI } = await import('openai');
    const openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });

    // Build conversation context
    const messages: any[] = [
      {
        role: 'system',
        content: `You are an expert loan officer and financial advisor specializing in CMG Financial's All-In-One loan product.

PRODUCT OVERVIEW:
The All-In-One loan is a revolutionary 30-year HELOC (Home Equity Line of Credit) that functions as the borrower's primary checking account. It calculates interest DAILY on the effective balance (Loan Balance - Available Cash), allowing borrowers to save significant interest compared to traditional mortgages.

KEY FEATURES:
- Daily interest calculation: (Balance - Cash) × (Rate / 365)
- Functions as full checking account with debit card, checks, online banking
- Deposits immediately reduce interest-bearing balance
- Funds remain fully accessible (unlike extra principal payments)
- No prepayment penalties
- Typical savings: 30-40% on total interest, 5-10 years faster payoff

QUALIFICATION:
- Maximum 80% LTV
- Positive monthly cash flow (minimum $500)
- Good credit score
- Sufficient home equity

YOUR ROLE:
Answer questions about the All-In-One loan with enthusiasm and clarity. Help loan officers craft compelling pitches, overcome objections, and explain benefits to borrowers. Use real examples, comparisons to traditional mortgages, and emphasize the unique daily calculation advantage.

Be conversational, professional, and persuasive. Focus on the "why" not just the "what".`,
      },
    ];

    // Add conversation history if provided
    if (conversationHistory && Array.isArray(conversationHistory)) {
      conversationHistory.forEach((msg: any) => {
        messages.push({
          role: msg.role,
          content: msg.content,
        });
      });
    }

    // Add current question
    messages.push({
      role: 'user',
      content: question,
    });

    // Call OpenAI
    const completion = await openai.chat.completions.create({
      model: 'gpt-4',
      messages: messages,
      temperature: 0.7,
      max_tokens: 500,
    });

    const answer = completion.choices[0]?.message?.content || 'I apologize, but I could not generate a response. Please try again.';

    res.json({
      answer,
      message: 'Pitch guide response generated successfully',
    });
  } catch (error: any) {
    console.error('Error in pitch guide:', error);
    res.status(500).json({
      error: 'Pitch guide failed',
      message: error.message || 'Failed to generate pitch response',
    });
  }
});

// Generate AI Sales Pitch for Proposal
router.post('/generate-pitch', async (req, res) => {
  try {
    const { simulation, mortgageDetails, clientName, options } = req.body;

    // Default options if not provided
    const pitchOptions = options || {
      tone: 'neutral',
      length: 'standard',
      technicalLevel: 'moderate',
      focus: 'balanced',
      urgency: 'moderate',
      style: 'balanced',
      cta: 'moderate'
    };

    if (!simulation || !mortgageDetails) {
      return res.status(400).json({
        error: 'Missing required data',
        message: 'Please provide simulation results and mortgage details',
      });
    }

    const USE_OPENROUTER = process.env.USE_OPENROUTER === 'true';
    const { default: OpenAI } = await import('openai');

    const openai = USE_OPENROUTER
      ? new OpenAI({
          apiKey: process.env.OPENROUTER_API_KEY,
          baseURL: 'https://openrouter.ai/api/v1',
          defaultHeaders: {
            'HTTP-Referer': process.env.YOUR_SITE_URL || 'https://aio-simulator.cmgfinancial.ai',
            'X-Title': 'All-In-One Look Back Simulator',
          },
        })
      : new OpenAI({
          apiKey: process.env.OPENAI_API_KEY,
        });

    const MODEL = USE_OPENROUTER ? 'google/gemini-2.0-flash-001' : 'gpt-4o';

    // Build context for the AI
    const formatCurrency = (amount: number) =>
      new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD',
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
      }).format(amount);

    const yearsMonths = (months: number) => {
      const years = Math.floor(months / 12);
      const mos = months % 12;
      return years > 0 ? `${years} year${years > 1 ? 's' : ''}${mos > 0 ? ` ${mos} months` : ''}` : `${mos} months`;
    };

    const interestSavings = formatCurrency(simulation.comparison.interestSavings);
    const timeSaved = yearsMonths(simulation.comparison.timeSavedMonths);
    const loanBalance = formatCurrency(mortgageDetails.currentBalance);
    const percentageSavings = simulation.comparison.percentageSavings.toFixed(1);

    // Build prompt based on options
    const toneMap = {
      casual: 'friendly and conversational, like talking to a friend',
      neutral: 'professional yet warm and conversational',
      professional: 'highly professional and business-focused'
    };

    const lengthMap = {
      shorter: '1-2 concise paragraphs (100-150 words)',
      standard: '2-3 well-structured paragraphs (175-225 words)',
      longer: '3-4 detailed paragraphs (250-325 words)'
    };

    const technicalMap = {
      simple: 'Use simple, everyday language. Avoid financial jargon. Explain concepts like you would to a friend.',
      moderate: 'Use some technical terms but explain them clearly. Balance between simple and expert.',
      technical: 'Use industry terminology and detailed financial concepts. Assume financial sophistication.'
    };

    const focusMap = {
      savings: 'Focus heavily on the dollar savings and interest reduction',
      flexibility: 'Emphasize the liquidity and access to funds advantages',
      security: 'Highlight the financial freedom and control benefits',
      balanced: 'Balance savings, flexibility, and security equally'
    };

    const urgencyMap = {
      low: 'Take a consultative, educational approach with no time pressure',
      moderate: 'Suggest the benefits warrant consideration without being pushy',
      high: 'Emphasize the opportunity cost of waiting and recommend prompt action'
    };

    const styleMap = {
      'data-driven': 'Lead with numbers, statistics, and concrete savings figures',
      balanced: 'Balance data with storytelling and real-world scenarios',
      'story-based': 'Use narrative and paint a picture of their future financial freedom'
    };

    const ctaMap = {
      soft: 'End with an open-ended invitation to learn more',
      moderate: 'End with a forward-looking statement about their financial future',
      strong: 'End with a clear call to action and next steps'
    };

    const prompt = `You are a professional mortgage loan officer at CMG Financial. Write a compelling, personalized sales pitch for ${clientName} about the All-In-One loan product based on their specific financial situation.

CLIENT'S SPECIFIC SAVINGS:
- Total Interest Savings: ${interestSavings} (${percentageSavings}% reduction)
- Payoff Acceleration: ${timeSaved} faster than traditional mortgage
- Current Loan Balance: ${loanBalance}

ALL-IN-ONE LOAN PRODUCT ADVANTAGES (weave these naturally into the pitch):

1. DAILY INTEREST CALCULATION ADVANTAGE
   - Interest calculated on (Balance - Available Cash) EVERY DAY
   - Traditional mortgages calculate monthly on full balance
   - Every deposit immediately reduces interest-bearing balance
   - Your paycheck works for you 24/7, not just on payment day

2. FINANCIAL FLEXIBILITY & LIQUIDITY
   - Works as your primary checking account (debit card, checks, online banking)
   - All funds remain 100% accessible - withdraw anytime
   - Unlike extra principal payments that lock funds away forever
   - True financial freedom while accelerating payoff

3. CASH FLOW OPTIMIZATION
   - Deposits reduce interest the moment they hit the account
   - Keep your money working for you between expenses
   - No need to choose between liquidity and savings
   - Smart money management built into the loan structure

4. ZERO RESTRICTIONS & PENALTIES
   - No prepayment penalties ever
   - No minimum payment above interest
   - No restrictions on deposits or withdrawals
   - Complete control of your financial strategy

5. PROVEN SAVINGS MODEL
   - Typical clients save 30-40% on total interest
   - Average 5-10 years faster payoff
   - Based on their ACTUAL cash flow patterns
   - Real results, not projections

PITCH REQUIREMENTS:
- Tone: ${toneMap[pitchOptions.tone]}
- Length: ${lengthMap[pitchOptions.length]}
- Technical Level: ${technicalMap[pitchOptions.technicalLevel]}
- Focus: ${focusMap[pitchOptions.focus]}
- Urgency: ${urgencyMap[pitchOptions.urgency]}
- Style: ${styleMap[pitchOptions.style]}
- Call to Action: ${ctaMap[pitchOptions.cta]}
- Address ${clientName} directly and personally
- Emphasize how DAILY interest calculation is revolutionary

CRITICAL FORMATTING INSTRUCTIONS:
- DO NOT include a subject line
- DO NOT include "Subject:" or any header
- DO NOT write "I wanted to reach out..." or "I'd like to share..."
- Start IMMEDIATELY with the pitch content
- Jump straight into the value proposition

Write a pitch that makes ${clientName} excited about saving ${interestSavings} and becoming mortgage-free ${timeSaved} earlier.`;

    const completion = await openai.chat.completions.create({
      model: MODEL,
      messages: [
        {
          role: 'system',
          content:
            'You are an expert loan officer specializing in All-In-One mortgages. Write compelling, personalized sales pitches that help clients understand the transformational benefits of this product. IMPORTANT: Start directly with the pitch content - no subject lines, no headers, no preamble like "I wanted to reach out". Jump straight into the value proposition.',
        },
        {
          role: 'user',
          content: prompt,
        },
      ],
      temperature: 0.7,
      max_tokens: 500,
    });

    const pitch = completion.choices[0]?.message?.content || 'Unable to generate pitch. Please try again.';

    res.json({
      pitch,
      message: 'Sales pitch generated successfully',
    });
  } catch (error: any) {
    console.error('Error generating pitch:', error);
    res.status(500).json({
      error: 'Pitch generation failed',
      message: error.message || 'Failed to generate sales pitch',
    });
  }
});

// Get current mortgage rate from FRED API
router.get('/current-mortgage-rate', async (req, res) => {
  try {
    const { getCurrentMortgageRate } = await import('../services/fred-api-service.js');
    const rateData = await getCurrentMortgageRate();

    res.json({
      success: true,
      data: rateData,
      message: 'Current mortgage rate fetched successfully',
    });
  } catch (error: any) {
    console.error('Error fetching current mortgage rate:', error);
    res.status(500).json({
      success: false,
      error: 'Rate fetch failed',
      message: error.message || 'Failed to fetch current mortgage rate',
    });
  }
});

// Save a proposal and generate a shareable link
router.post('/save-proposal', async (req, res) => {
  try {
    const proposalData = req.body;

    if (!proposalData.simulation || !proposalData.mortgageDetails) {
      return res.status(400).json({
        error: 'Missing required data',
        message: 'Please provide simulation and mortgage details',
      });
    }

    // Extract loan officer email and client name
    const loanOfficerEmail = proposalData.loanOfficerEmail;
    const clientName = proposalData.clientName || 'Unnamed Client';

    if (!loanOfficerEmail) {
      return res.status(400).json({
        error: 'Missing loan officer email',
        message: 'Loan officer email is required to save proposals',
      });
    }

    // Generate unique ID for the proposal (10 characters, URL-safe)
    const proposalId = nanoid(10);

    // Create proposal metadata
    const proposalMetadata = {
      id: proposalId,
      clientName,
      loanOfficerEmail,
      createdAt: new Date().toISOString(),
      expiresAt: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString(),
    };

    // Store the full proposal data in Vercel KV with 90-day expiration
    await kv.set(`proposal:${proposalId}`, {
      ...proposalData,
      metadata: proposalMetadata,
    }, {
      ex: 90 * 24 * 60 * 60, // 90 days in seconds
    });

    // Add this proposal to the loan officer's list
    const userProposalsKey = `user:proposals:${loanOfficerEmail}`;
    const existingProposals = (await kv.get(userProposalsKey)) as any[] || [];

    // Add new proposal to the beginning of the array
    const updatedProposals = [proposalMetadata, ...existingProposals];

    // Store updated list (no expiration on user list)
    await kv.set(userProposalsKey, updatedProposals);

    // Generate the shareable URL
    const baseUrl = process.env.CLIENT_URL || 'http://localhost:5173';
    const shareableUrl = `${baseUrl}/proposal/${proposalId}`;

    console.log(`📎 Proposal saved: ${proposalId} for ${loanOfficerEmail}`);

    res.json({
      success: true,
      proposalId,
      shareableUrl,
      expiresIn: '90 days',
      message: 'Proposal saved successfully',
    });
  } catch (error: any) {
    console.error('Error saving proposal:', error);
    res.status(500).json({
      success: false,
      error: 'Save failed',
      message: error.message || 'Failed to save proposal',
    });
  }
});

// Retrieve a proposal by ID (public endpoint)
router.get('/proposals/:id', async (req, res) => {
  try {
    const { id } = req.params;

    if (!id || id.length !== 10) {
      return res.status(400).json({
        error: 'Invalid proposal ID',
        message: 'Proposal ID must be 10 characters',
      });
    }

    // Retrieve the proposal from Vercel KV
    const proposalData = await kv.get(`proposal:${id}`);

    if (!proposalData) {
      return res.status(404).json({
        error: 'Proposal not found',
        message: 'This proposal does not exist or has expired',
      });
    }

    console.log(`📖 Proposal retrieved: ${id}`);

    res.json({
      success: true,
      proposal: proposalData,
      message: 'Proposal retrieved successfully',
    });
  } catch (error: any) {
    console.error('Error retrieving proposal:', error);
    res.status(500).json({
      success: false,
      error: 'Retrieval failed',
      message: error.message || 'Failed to retrieve proposal',
    });
  }
});

// Get all proposals for a loan officer by email
router.get('/my-proposals/:email', async (req, res) => {
  try {
    const { email } = req.params;

    if (!email) {
      return res.status(400).json({
        error: 'Missing email',
        message: 'Email is required',
      });
    }

    // Retrieve the user's proposals list
    const userProposalsKey = `user:proposals:${email}`;
    const proposals = (await kv.get(userProposalsKey)) as any[] || [];

    console.log(`📋 Retrieved ${proposals.length} proposals for ${email}`);

    res.json({
      success: true,
      proposals,
      count: proposals.length,
      message: 'Proposals retrieved successfully',
    });
  } catch (error: any) {
    console.error('Error retrieving user proposals:', error);
    res.status(500).json({
      success: false,
      error: 'Retrieval failed',
      message: error.message || 'Failed to retrieve proposals',
    });
  }
});

// Delete a proposal
router.delete('/proposals/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { email } = req.body;

    if (!id || id.length !== 10) {
      return res.status(400).json({
        error: 'Invalid proposal ID',
        message: 'Proposal ID must be 10 characters',
      });
    }

    if (!email) {
      return res.status(400).json({
        error: 'Missing email',
        message: 'Loan officer email is required',
      });
    }

    // Get the proposal to verify ownership
    const proposalData = await kv.get(`proposal:${id}`) as any;

    if (!proposalData) {
      return res.status(404).json({
        error: 'Proposal not found',
        message: 'This proposal does not exist or has expired',
      });
    }

    // Verify ownership
    if (proposalData.loanOfficerEmail !== email && proposalData.metadata?.loanOfficerEmail !== email) {
      return res.status(403).json({
        error: 'Unauthorized',
        message: 'You can only delete your own proposals',
      });
    }

    // Delete the proposal from KV
    await kv.del(`proposal:${id}`);

    // Remove from user's proposal list
    const userProposalsKey = `user:proposals:${email}`;
    const existingProposals = (await kv.get(userProposalsKey)) as any[] || [];
    const updatedProposals = existingProposals.filter((p: any) => p.id !== id);
    await kv.set(userProposalsKey, updatedProposals);

    console.log(`🗑️ Proposal deleted: ${id} by ${email}`);

    res.json({
      success: true,
      message: 'Proposal deleted successfully',
    });
  } catch (error: any) {
    console.error('Error deleting proposal:', error);
    res.status(500).json({
      success: false,
      error: 'Deletion failed',
      message: error.message || 'Failed to delete proposal',
    });
  }
});

export default router;
