import express from 'express';
import multer from 'multer';
import path from 'path';
import { existsSync, mkdirSync } from 'fs';
import { analyzeStatements } from '../services/openai-service.js';
import { calculateEligibility } from '../services/eligibility-checker.js';
import { simulateLoan } from '../services/loan-calculator-v3.js';
import type { MortgageDetails, CashFlowAnalysis } from '../types.js';

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
    const { simulation, mortgageDetails, clientName } = req.body;

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

    const prompt = `You are a professional mortgage loan officer at CMG Financial. Write a compelling, personalized sales pitch for ${clientName} about the All-In-One loan product based on their specific financial situation.

KEY BENEFITS TO HIGHLIGHT:
- They will save ${interestSavings} in total interest (${percentageSavings}% reduction)
- They will pay off their mortgage ${timeSaved} faster
- Current loan balance: ${loanBalance}
- The All-In-One works like a checking account - deposits reduce interest immediately
- Full flexibility - funds remain accessible unlike traditional extra payments
- No prepayment penalties

TONE:
- Professional but conversational
- Enthusiastic about the savings opportunity
- Focus on the "why" not just the numbers
- Address ${clientName} directly
- Keep it concise (2-3 paragraphs, around 150-200 words)

Write a compelling pitch that would excite ${clientName} about this opportunity. Focus on the life-changing impact of saving ${interestSavings} and paying off the mortgage ${timeSaved} earlier.`;

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

export default router;
