import express from 'express';
import multer from 'multer';
import path from 'path';
import { analyzeStatements } from '../services/openai-service.js';
import { calculateEligibility } from '../services/eligibility-checker.js';
import { simulateLoan } from '../services/loan-calculator.js';
import type { MortgageDetails, CashFlowAnalysis } from '../types.js';

const router = express.Router();

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/');
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
    cb(null, `${file.fieldname}-${uniqueSuffix}${path.extname(file.original name)}`);
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

export default router;
