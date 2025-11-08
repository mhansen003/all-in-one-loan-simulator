import express from 'express';
import multer from 'multer';
import path from 'path';
import { existsSync, mkdirSync } from 'fs';
import { analyzeStatements } from '../services/openai-service.js';
import { calculateEligibility } from '../services/eligibility-checker.js';
import { simulateLoan } from '../services/loan-calculator.js';
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

// Generate PDF report (placeholder - to be implemented)
router.post('/generate-report', async (req, res) => {
  try {
    // TODO: Implement PDF generation
    res.status(501).json({
      error: 'Not implemented',
      message: 'PDF report generation coming soon',
    });
  } catch (error: any) {
    console.error('Error generating report:', error);
    res.status(500).json({
      error: 'Report generation failed',
      message: error.message || 'Failed to generate report',
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

// Generate AI pitch for proposal
router.post('/generate-pitch', async (req, res) => {
  try {
    const { simulation, mortgageDetails, clientName, options } = req.body;

    if (!simulation || !mortgageDetails) {
      return res.status(400).json({
        error: 'Missing required data',
        message: 'Please provide simulation and mortgage details',
      });
    }

    const { OpenAI } = await import('openai');
    const openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });

    // Build prompt based on options with proper type checking
    const toneGuide: Record<string, string> = {
      casual: 'Use a friendly, conversational tone like talking to a friend. Use contractions and approachable language.',
      professional: 'Use formal, professional language appropriate for a financial proposal. Maintain authority and expertise.',
      neutral: 'Use clear, straightforward language that is neither too casual nor overly formal.',
    };

    const lengthGuide: Record<string, string> = {
      shorter: 'Keep it concise - 2-3 short paragraphs maximum (150-200 words).',
      standard: 'Write 3-4 well-developed paragraphs (250-350 words).',
      longer: 'Provide comprehensive detail in 4-5 substantial paragraphs (400-500 words).',
    };

    const technicalGuide: Record<string, string> = {
      simple: 'Avoid jargon. Explain everything in simple terms anyone can understand.',
      moderate: 'Use some financial terminology but explain complex concepts clearly.',
      technical: 'Use precise financial terminology and assume the reader has mortgage knowledge.',
    };

    const focusGuide: Record<string, string> = {
      savings: 'Emphasize the dollar amount saved and interest reduction.',
      flexibility: 'Emphasize the access to funds and financial flexibility.',
      security: 'Emphasize the stability, safety, and long-term financial security.',
      balanced: 'Provide balanced coverage of savings, flexibility, and security.',
    };

    const urgencyGuide: Record<string, string> = {
      low: 'Maintain a calm, informative tone without creating pressure.',
      moderate: 'Gently suggest this is a valuable opportunity worth acting on.',
      high: 'Create urgency about the benefits of acting now and potential opportunity cost.',
    };

    const styleGuide: Record<string, string> = {
      'data-driven': 'Lead with numbers, statistics, and concrete facts. Be analytical.',
      balanced: 'Mix data points with relatable explanations and real-world context.',
      'story-based': 'Use narrative, relatable scenarios, and paint a picture of their future.',
    };

    const ctaGuide: Record<string, string> = {
      soft: 'End with an open invitation to learn more or ask questions.',
      moderate: 'End with a clear next step like scheduling a follow-up conversation.',
      strong: 'End with a compelling call to action that encourages immediate response.',
    };

    const formatCurrency = (amount: number) => {
      return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD',
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
      }).format(amount);
    };

    const formatMonths = (totalMonths: number) => {
      const years = Math.floor(totalMonths / 12);
      const months = totalMonths % 12;
      return `${years} year${years !== 1 ? 's' : ''} and ${months} month${months !== 1 ? 's' : ''}`;
    };

    const prompt = `You are an expert loan officer creating a personalized sales pitch for the All-In-One loan.

CLIENT: ${clientName || 'this client'}

KEY NUMBERS:
- Total Interest Savings: ${formatCurrency(simulation.comparison.interestSavings)}
- Time Saved: ${formatMonths(simulation.comparison.timeSavedMonths)}
- Interest Reduction: ${simulation.comparison.percentageSavings.toFixed(1)}%
- Current Loan Balance: ${formatCurrency(mortgageDetails.loanBalance)}
- Traditional Total Interest: ${formatCurrency(simulation.traditionalLoan.totalInterestPaid)}
- AIO Total Interest: ${formatCurrency(simulation.allInOneLoan.totalInterestPaid)}

CUSTOMIZATION PREFERENCES:
- Tone: ${toneGuide[options?.tone] || toneGuide['neutral']}
- Length: ${lengthGuide[options?.length] || lengthGuide['standard']}
- Technical Level: ${technicalGuide[options?.technicalLevel] || technicalGuide['moderate']}
- Focus: ${focusGuide[options?.focus] || focusGuide['balanced']}
- Urgency: ${urgencyGuide[options?.urgency] || urgencyGuide['moderate']}
- Style: ${styleGuide[options?.style] || styleGuide['balanced']}
- Call to Action: ${ctaGuide[options?.cta] || ctaGuide['moderate']}

Write a compelling sales pitch that will appear at the top of the proposal. Focus on why the All-In-One loan is right for this client based on their specific numbers.

DO NOT use a greeting or signature. Start directly with the pitch content. Do not use markdown formatting.`;

    const completion = await openai.chat.completions.create({
      model: 'gpt-4',
      messages: [
        {
          role: 'system',
          content: 'You are an expert loan officer who creates compelling, personalized sales pitches for the All-In-One loan product.',
        },
        {
          role: 'user',
          content: prompt,
        },
      ],
      temperature: 0.7,
      max_tokens: 600,
    });

    const pitch = completion.choices[0]?.message?.content || 'Unable to generate pitch. Please try again.';

    res.json({
      pitch,
      message: 'Pitch generated successfully',
    });
  } catch (error: any) {
    console.error('Error generating pitch:', error);
    res.status(500).json({
      error: 'Pitch generation failed',
      message: error.message || 'Failed to generate pitch',
    });
  }
});

// ===== SIGNATURE MANAGEMENT ENDPOINTS =====

// Check if signature exists for email
router.get('/signature/exists/:email', async (req, res) => {
  try {
    const { email } = req.params;

    if (!email || !email.includes('@')) {
      return res.status(400).json({
        error: 'Invalid email',
        message: 'Please provide a valid email address',
      });
    }

    const { signatureExists } = await import('../services/redis-service.js');
    const exists = await signatureExists(email);

    res.json({
      exists,
      email,
      message: exists ? 'Signature found' : 'No signature found for this email',
    });
  } catch (error: any) {
    console.error('Error checking signature:', error);
    res.status(500).json({
      error: 'Check failed',
      message: error.message || 'Failed to check signature',
    });
  }
});

// Get signature by email
router.get('/signature/:email', async (req, res) => {
  try {
    const { email } = req.params;

    if (!email || !email.includes('@')) {
      return res.status(400).json({
        error: 'Invalid email',
        message: 'Please provide a valid email address',
      });
    }

    const { getSignature } = await import('../services/redis-service.js');
    const signature = await getSignature(email);

    if (!signature) {
      return res.status(404).json({
        error: 'Not found',
        message: 'No signature found for this email',
      });
    }

    res.json({
      signature,
      message: 'Signature retrieved successfully',
    });
  } catch (error: any) {
    console.error('Error getting signature:', error);
    res.status(500).json({
      error: 'Retrieval failed',
      message: error.message || 'Failed to retrieve signature',
    });
  }
});

// Save or update signature
router.post('/signature', async (req, res) => {
  try {
    const { email, name, title, phone, nmls, officeAddress, photoUrl } = req.body;

    // Validate required fields
    if (!email || !email.includes('@')) {
      return res.status(400).json({
        error: 'Invalid email',
        message: 'Please provide a valid email address',
      });
    }

    if (!name || name.trim().length === 0) {
      return res.status(400).json({
        error: 'Invalid name',
        message: 'Please provide a name',
      });
    }

    if (!phone || phone.trim().length === 0) {
      return res.status(400).json({
        error: 'Invalid phone',
        message: 'Please provide a phone number',
      });
    }

    const { saveSignature } = await import('../services/redis-service.js');
    const success = await saveSignature({
      email,
      name,
      title: title || '',
      phone,
      nmls: nmls || undefined,
      officeAddress: officeAddress || undefined,
      photoUrl: photoUrl || undefined,
    });

    if (!success) {
      return res.status(500).json({
        error: 'Save failed',
        message: 'Redis is not configured or save operation failed',
      });
    }

    res.json({
      success: true,
      message: 'Signature saved successfully',
    });
  } catch (error: any) {
    console.error('Error saving signature:', error);
    res.status(500).json({
      error: 'Save failed',
      message: error.message || 'Failed to save signature',
    });
  }
});

// Delete signature
router.delete('/signature/:email', async (req, res) => {
  try {
    const { email } = req.params;

    if (!email || !email.includes('@')) {
      return res.status(400).json({
        error: 'Invalid email',
        message: 'Please provide a valid email address',
      });
    }

    const { deleteSignature } = await import('../services/redis-service.js');
    const success = await deleteSignature(email);

    if (!success) {
      return res.status(500).json({
        error: 'Delete failed',
        message: 'Redis is not configured or delete operation failed',
      });
    }

    res.json({
      success: true,
      message: 'Signature deleted successfully',
    });
  } catch (error: any) {
    console.error('Error deleting signature:', error);
    res.status(500).json({
      error: 'Delete failed',
      message: error.message || 'Failed to delete signature',
    });
  }
});

export default router;
