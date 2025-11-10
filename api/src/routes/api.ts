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

// Analyze bank statements
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

Write a pitch that makes ${clientName} excited about saving ${interestSavings} and becoming mortgage-free ${timeSaved} earlier.`;

    const completion = await openai.chat.completions.create({
      model: MODEL,
      messages: [
        {
          role: 'system',
          content:
            'You are an expert loan officer specializing in All-In-One mortgages. Write compelling, personalized sales pitches that help clients understand the transformational benefits of this product.',
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

    // Generate unique ID for the proposal (10 characters, URL-safe)
    const proposalId = nanoid(10);

    // Store the proposal in Vercel KV with 90-day expiration
    await kv.set(`proposal:${proposalId}`, proposalData, {
      ex: 90 * 24 * 60 * 60, // 90 days in seconds
    });

    // Generate the shareable URL
    const baseUrl = process.env.CLIENT_URL || 'http://localhost:5173';
    const shareableUrl = `${baseUrl}/proposal/${proposalId}`;

    console.log(`📎 Proposal saved: ${proposalId}`);

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

export default router;
