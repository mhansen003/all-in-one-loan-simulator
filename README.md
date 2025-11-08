# All-In-One Look Back Simulator

An intelligent look back simulation tool that helps loan officers demonstrate the power of CMG's All-In-One mortgage product by analyzing bank statements and projecting accelerated payoff timelines.

## 🚀 Features

### Borrower Analysis
- **Current Mortgage Input**: Capture existing loan details (balance, rate, payment, term)
- **Smart Bank Statement Analysis**: AI-powered extraction from PDFs, images, and CSV/Excel files
- **Intelligent Cash Flow Calculation**: Automatically identifies and excludes:
  - One-time expenses (vacations, large purchases)
  - Current housing payments (rent/mortgage)
  - Analyzes 12 months of transaction data

### Loan Simulation
- **Traditional Loan Projection**: Standard amortization with payoff timeline
- **All-In-One Projection**: Shows accelerated payoff using average daily balance offset
- **Savings Calculation**: Total interest saved with All-In-One product
- **Side-by-Side Comparison**: Visual comparison of both loan options

### Eligibility Check
- Flexible eligibility rules
- LTV ratio calculation
- Cash flow sufficiency validation

### Results Visualization
- Interactive charts and graphs
- Downloadable PDF reports
- Timeline comparisons
- Interest savings breakdowns

## 🛠️ Technology Stack

### Frontend
- **React 19** + **TypeScript** - Modern UI framework
- **Vite** - Lightning-fast build tool
- **Chart.js** - Data visualization
- **react-dropzone** - File upload interface
- **Axios** - API communication

### Backend
- **Node.js** + **Express** - RESTful API server
- **TypeScript** - Type-safe development
- **OpenAI GPT-4** - AI-powered document analysis
- **Multer** - File upload handling
- **pdf-parse** - PDF text extraction
- **xlsx** - Excel file processing
- **Sharp** - Image processing

### Database & Deployment
- **Redis (Vercel KV)** - Session storage and quote persistence
- **Vercel** - Serverless deployment platform

## 📦 Installation

### Prerequisites
- **Node.js** 18+ and npm
- **OpenAI API Key** (get one at https://platform.openai.com/api-keys)

### Setup Instructions

1. **Clone the repository**:
   ```bash
   cd C:\GitHub
   git clone https://github.com/mhansen003/all-in-one-loan-simulator.git
   cd all-in-one-loan-simulator
   ```

2. **Install all dependencies**:
   ```bash
   npm run install:all
   ```

3. **Configure Environment Variables**:

   Create `server/.env`:
   ```env
   OPENAI_API_KEY=your_openai_api_key_here
   FRED_API_KEY=your_fred_api_key_here
   PORT=3001
   NODE_ENV=development
   ```

   **API Keys Required:**
   - **OpenAI API Key**: Get from [OpenAI Platform](https://platform.openai.com/api-keys) - Required for bank statement analysis
   - **FRED API Key**: Get from [FRED API](https://fred.stlouisfed.org/docs/api/api_key.html) - Optional, enables automatic mortgage rate fetching (falls back to default rate if not configured)

## 🚀 Running the Application

### Development Mode

Run both frontend and backend concurrently:
```bash
npm run dev
```

Or run them separately:

**Backend** (runs on http://localhost:3001):
```bash
npm run dev:server
```

**Frontend** (runs on http://localhost:5173):
```bash
npm run dev:client
```

### Production Build

```bash
npm run build
```

## 📖 Usage Guide

### Step 1: Enter Current Mortgage Details
- Loan balance
- Interest rate
- Monthly payment
- Remaining term
- Property value

### Step 2: Upload Bank Statements
- Drag and drop PDF, images, or CSV/Excel files
- Upload 12 months of statements for best accuracy
- AI automatically analyzes transactions

### Step 3: Review Cash Flow Analysis
- See categorized income and expenses
- Exclude one-time expenses if needed
- Verify housing payment detection

### Step 4: Check Eligibility
- System validates loan qualifications
- See pass/fail on key requirements

### Step 5: View Simulations
- Compare traditional vs All-In-One timelines
- See total interest savings
- Review accelerated payoff date
- Download PDF report

## 🎯 API Endpoints

### GET `/api/health`
Health check endpoint

### POST `/api/analyze-statements`
Analyzes uploaded bank statements
- **Request**: Multipart form data with files
- **Response**: Categorized transactions and cash flow summary

### POST `/api/calculate-eligibility`
Checks loan eligibility
- **Request**: Borrower and loan data
- **Response**: Eligibility results with pass/fail indicators

### POST `/api/simulate-loan`
Runs loan simulations
- **Request**: Loan details and cash flow data
- **Response**: Traditional and All-In-One projections

### POST `/api/generate-report`
Generates downloadable PDF report
- **Request**: Complete simulation data
- **Response**: PDF file

## 🔧 Configuration

### Supported File Types
- **PDFs**: `.pdf`
- **Images**: `.jpg`, `.jpeg`, `.png`, `.gif`, `.webp`
- **Spreadsheets**: `.csv`, `.xlsx`, `.xls`

### File Size Limits
- Maximum file size: **10MB per file**
- Maximum files per upload: **20 files** (for 12+ months of statements)

### AI Models Used
- **GPT-4o**: Text analysis and transaction categorization
- **GPT-4o Vision**: Image OCR and scanned document analysis

## 🎨 Customization

### Modify Calculation Logic
Edit `server/src/services/loan-calculator.ts` to adjust:
- Amortization formulas
- All-In-One offset calculations
- Interest savings algorithms

### Adjust Eligibility Rules
Edit `server/src/services/eligibility-checker.ts` to customize:
- LTV requirements
- DTI ratios
- Cash flow thresholds

### Change Styling
Edit `client/src/App.css` to customize:
- CMG brand colors
- Component styling
- Responsive breakpoints

## 🐛 Troubleshooting

### "Failed to analyze bank statements"
- Check OpenAI API key is valid
- Ensure you have sufficient OpenAI credits
- Verify file formats are supported

### File Upload Errors
- Confirm file size is under 10MB
- Check file type is supported
- Ensure proper permissions

### Calculation Errors
- Verify all required fields are filled
- Check for valid numeric inputs
- Review browser console for details

## 🔐 Future Features (Roadmap)

- [x] Core simulation engine
- [x] Bank statement AI analysis
- [x] Results visualization
- [ ] User authentication (OTP via email)
- [ ] Quote persistence (Redis)
- [ ] Pipeline management
- [ ] Version control for quotes
- [ ] Quote sharing and collaboration
- [ ] Email notifications
- [ ] Advanced reporting

## 🤝 Contributing

This is an internal tool for CMG Financial. For questions or issues, contact the development team.

## 📄 License

Internal use only - CMG Financial Services

---

**Built with ❤️ using OpenAI GPT-4 and modern web technologies**
