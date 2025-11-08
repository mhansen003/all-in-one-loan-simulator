import puppeteer from 'puppeteer';
import type { SimulationResult, MortgageDetails } from '../types.js';

interface ProposalData {
  simulation: SimulationResult;
  mortgageDetails: MortgageDetails;
  clientName?: string;
  loanOfficerName?: string;
  loanOfficerEmail?: string;
  aiPitch?: string;
  components: {
    id: string;
    enabled: boolean;
  }[];
}

const CMG_BRANDING = {
  logo: {
    url: 'https://www.cmgfi.com/sites/default/files/CMGLogo.png',
    alt: 'CMG Financial',
  },
  colors: {
    primary: '#9bc53d',
    secondary: '#2d3748',
    accent: '#f0f9ff',
  },
};

/**
 * Format a number as currency
 */
function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

/**
 * Convert months to years and months string
 */
function yearsMonthsFromMonths(months: number): string {
  const years = Math.floor(months / 12);
  const remainingMonths = months % 12;

  if (years > 0 && remainingMonths > 0) {
    return `${years} year${years > 1 ? 's' : ''} ${remainingMonths} month${remainingMonths > 1 ? 's' : ''}`;
  } else if (years > 0) {
    return `${years} year${years > 1 ? 's' : ''}`;
  } else {
    return `${remainingMonths} month${remainingMonths > 1 ? 's' : ''}`;
  }
}

/**
 * Generate HTML content for the PDF proposal
 */
function generateProposalHTML(data: ProposalData): string {
  const { simulation, mortgageDetails, clientName, loanOfficerName, loanOfficerEmail, aiPitch, components } = data;

  const isComponentEnabled = (id: string) => components.find(c => c.id === id)?.enabled ?? false;

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <style>
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }

    body {
      font-family: Arial, sans-serif;
      color: #333;
      line-height: 1.6;
      background: white;
    }

    .container {
      padding: 0.75in;
      max-width: 8.5in;
    }

    .header {
      text-align: center;
      margin-bottom: 2rem;
      border-bottom: 3px solid ${CMG_BRANDING.colors.primary};
      padding-bottom: 1rem;
    }

    .logo {
      max-width: 180px;
      margin-bottom: 1rem;
    }

    h1 {
      margin: 0;
      font-size: 2rem;
      color: ${CMG_BRANDING.colors.secondary};
    }

    h2 {
      margin: 0.5rem 0 0 0;
      font-size: 1.5rem;
      color: #718096;
      font-weight: normal;
    }

    .date {
      margin: 0.25rem 0 0 0;
      font-size: 0.9rem;
      color: #a0aec0;
    }

    .pitch-section {
      margin-bottom: 2rem;
      padding: 1.5rem;
      background: ${CMG_BRANDING.colors.accent};
      border: 2px solid ${CMG_BRANDING.colors.primary};
      border-radius: 8px;
    }

    .pitch-section h3 {
      margin: 0 0 1rem 0;
      color: ${CMG_BRANDING.colors.secondary};
      font-size: 1.25rem;
    }

    .pitch-section p {
      white-space: pre-wrap;
      line-height: 1.6;
      font-size: 0.95rem;
    }

    .savings-highlight {
      margin-bottom: 2rem;
      padding: 2rem;
      background: linear-gradient(135deg, ${CMG_BRANDING.colors.primary} 0%, #8ab62f 100%);
      border-radius: 12px;
      color: white;
      text-align: center;
    }

    .savings-highlight .label {
      font-size: 1rem;
      font-weight: 600;
      opacity: 0.9;
      margin-bottom: 0.5rem;
      text-transform: uppercase;
    }

    .savings-highlight .value {
      font-size: 3rem;
      font-weight: 700;
    }

    .savings-stats {
      display: flex;
      justify-content: center;
      gap: 3rem;
      margin-top: 1.5rem;
    }

    .savings-stats .stat {
      text-align: center;
    }

    .savings-stats .stat-label {
      font-size: 0.85rem;
      opacity: 0.9;
    }

    .savings-stats .stat-value {
      font-size: 1.4rem;
      font-weight: 700;
    }

    .comparison-table {
      margin-bottom: 2rem;
    }

    .comparison-table h3 {
      font-size: 1.5rem;
      margin-bottom: 1.5rem;
      text-align: center;
      color: ${CMG_BRANDING.colors.secondary};
    }

    table {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 2rem;
    }

    th, td {
      padding: 1rem;
      border: 2px solid #e2e8f0;
      text-align: left;
    }

    thead th {
      background: #f7fafc;
      font-weight: 600;
    }

    .highlight-col {
      background: ${CMG_BRANDING.colors.accent};
    }

    .footer {
      margin-top: 3rem;
      padding-top: 1.5rem;
      border-top: 2px solid #e2e8f0;
      text-align: center;
      color: #718096;
      font-size: 0.85rem;
    }

    .footer .contact {
      margin-top: 0.5rem;
      font-weight: 600;
      color: ${CMG_BRANDING.colors.secondary};
    }

    .page-break {
      page-break-before: always;
    }
  </style>
</head>
<body>
  <div class="container">
    <!-- Header -->
    <div class="header">
      <img src="${CMG_BRANDING.logo.url}" alt="${CMG_BRANDING.logo.alt}" class="logo" />
      <h1>All-In-One Loan Proposal</h1>
      ${clientName ? `<h2>Prepared for ${clientName}</h2>` : ''}
      <p class="date">${new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</p>
    </div>

    <!-- AI Pitch -->
    ${aiPitch ? `
    <div class="pitch-section">
      <h3>Why the All-In-One Loan is Right for You</h3>
      <p>${aiPitch}</p>
    </div>
    ` : ''}

    <!-- Savings Highlight -->
    ${isComponentEnabled('savings-highlight') ? `
    <div class="savings-highlight">
      <div class="label">Total Interest Savings</div>
      <div class="value">${formatCurrency(simulation.comparison.interestSavings)}</div>
      <div class="savings-stats">
        <div class="stat">
          <div class="stat-label">Time Saved</div>
          <div class="stat-value">${yearsMonthsFromMonths(simulation.comparison.timeSavedMonths)}</div>
        </div>
        <div class="stat">
          <div class="stat-label">Interest Reduction</div>
          <div class="stat-value">${simulation.comparison.percentageSavings.toFixed(1)}%</div>
        </div>
      </div>
    </div>
    ` : ''}

    <!-- Comparison Table -->
    ${isComponentEnabled('comparison-cards') ? `
    <div class="comparison-table">
      <h3>Side-by-Side Comparison</h3>
      <table>
        <thead>
          <tr>
            <th>Metric</th>
            <th>Traditional Mortgage</th>
            <th class="highlight-col">All-In-One Loan</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td><strong>Total Interest Paid</strong></td>
            <td>${formatCurrency(simulation.traditionalLoan.totalInterestPaid)}</td>
            <td class="highlight-col">${formatCurrency(simulation.allInOneLoan.totalInterestPaid)}</td>
          </tr>
          <tr>
            <td><strong>Time to Payoff</strong></td>
            <td>${yearsMonthsFromMonths(simulation.traditionalLoan.payoffMonths)}</td>
            <td class="highlight-col">${yearsMonthsFromMonths(simulation.allInOneLoan.payoffMonths)}</td>
          </tr>
          <tr>
            <td><strong>Monthly Payment</strong></td>
            <td>${formatCurrency(simulation.traditionalLoan.monthlyPayment)}</td>
            <td class="highlight-col">${formatCurrency(simulation.allInOneLoan.monthlyPayment)}</td>
          </tr>
          <tr>
            <td><strong>Current Balance</strong></td>
            <td colspan="2">${formatCurrency(mortgageDetails.currentBalance)}</td>
          </tr>
          <tr>
            <td><strong>Interest Rate</strong></td>
            <td colspan="2">${mortgageDetails.interestRate.toFixed(3)}%</td>
          </tr>
        </tbody>
      </table>
    </div>
    ` : ''}

    <!-- How It Works -->
    ${isComponentEnabled('how-it-works') ? `
    <div style="margin-bottom: 2rem;">
      <h3 style="font-size: 1.5rem; margin-bottom: 1rem; color: ${CMG_BRANDING.colors.secondary};">How the All-In-One Loan Works</h3>
      <div style="background: #f7fafc; padding: 1.5rem; border-radius: 8px; border-left: 4px solid ${CMG_BRANDING.colors.primary};">
        <p style="margin-bottom: 1rem;"><strong>Think of it as a checking account that pays off your mortgage.</strong></p>
        <ul style="margin-left: 1.5rem; line-height: 1.8;">
          <li>Your income deposits immediately reduce your interest-bearing balance</li>
          <li>Interest is calculated DAILY on (Balance - Available Cash)</li>
          <li>Full checking account features: debit card, checks, online banking</li>
          <li>Your money remains accessible - unlike traditional extra payments</li>
          <li>No prepayment penalties or restrictions</li>
        </ul>
      </div>
    </div>
    ` : ''}

    <!-- Footer -->
    <div class="footer">
      <p>This proposal is based on your current financial situation and is subject to final underwriting approval.</p>
      ${loanOfficerName || loanOfficerEmail ? `
      <div class="contact">
        ${loanOfficerName ? `<div>${loanOfficerName}</div>` : ''}
        ${loanOfficerEmail ? `<div>${loanOfficerEmail}</div>` : ''}
      </div>
      ` : ''}
      <p style="margin-top: 1rem; font-size: 0.75rem; color: #a0aec0;">
        CMG Financial | NMLS #1820 | Equal Housing Opportunity
      </p>
    </div>
  </div>
</body>
</html>
  `;
}

/**
 * Generate a PDF from proposal data using Puppeteer
 */
export async function generateProposalPDF(data: ProposalData): Promise<Buffer> {
  let browser;

  try {
    console.log('🚀 Launching browser for PDF generation...');

    // Launch Puppeteer
    browser = await puppeteer.launch({
      headless: true,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-gpu',
      ],
    });

    const page = await browser.newPage();

    // Generate HTML content
    const html = generateProposalHTML(data);

    // Set page content
    await page.setContent(html, {
      waitUntil: 'networkidle0',
    });

    console.log('📄 Generating PDF...');

    // Generate PDF
    const pdfBuffer = await page.pdf({
      format: 'Letter',
      printBackground: true,
      margin: {
        top: '0.5in',
        right: '0.5in',
        bottom: '0.5in',
        left: '0.5in',
      },
    });

    console.log('✅ PDF generated successfully!');

    return Buffer.from(pdfBuffer);
  } catch (error) {
    console.error('❌ Error generating PDF:', error);
    throw new Error(`Failed to generate PDF: ${error instanceof Error ? error.message : 'Unknown error'}`);
  } finally {
    if (browser) {
      await browser.close();
    }
  }
}
