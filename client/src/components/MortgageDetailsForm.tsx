import { useState, useEffect } from 'react';
import type { MortgageDetails } from '../types';
import './MortgageDetailsForm.css';

interface MortgageDetailsFormProps {
  initialData: Partial<MortgageDetails>;
  onSubmit: (data: MortgageDetails) => void;
  onBack?: () => void;
}

export default function MortgageDetailsForm({
  initialData,
  onSubmit,
  onBack,
}: MortgageDetailsFormProps) {
  const [formData, setFormData] = useState<Partial<MortgageDetails>>({
    currentBalance: initialData.currentBalance || undefined,
    interestRate: initialData.interestRate || undefined,
    aioInterestRate: initialData.aioInterestRate || undefined,
    monthlyPayment: initialData.monthlyPayment || undefined,
    remainingTermMonths: initialData.remainingTermMonths || undefined,
    propertyValue: initialData.propertyValue || undefined,
    currentHousingPayment: initialData.currentHousingPayment || undefined,
  });

  // State for term input (years/months)
  const [termYears, setTermYears] = useState<number>(
    initialData.remainingTermMonths ? Math.floor(initialData.remainingTermMonths / 12) : 25
  );
  const [termMonths, setTermMonths] = useState<number>(
    initialData.remainingTermMonths ? initialData.remainingTermMonths % 12 : 0
  );

  // State for raw input values (to preserve decimal points while typing)
  const [interestRateInput, setInterestRateInput] = useState<string>(
    initialData.interestRate !== undefined ? String(initialData.interestRate) : ''
  );
  const [aioInterestRateInput, setAioInterestRateInput] = useState<string>(
    initialData.aioInterestRate !== undefined ? String(initialData.aioInterestRate) : ''
  );
  const [currentBalanceInput, setCurrentBalanceInput] = useState<string>(
    initialData.currentBalance !== undefined ? String(initialData.currentBalance) : ''
  );
  const [monthlyPaymentInput, setMonthlyPaymentInput] = useState<string>(
    initialData.monthlyPayment !== undefined ? String(initialData.monthlyPayment) : ''
  );
  const [propertyValueInput, setPropertyValueInput] = useState<string>(
    initialData.propertyValue !== undefined ? String(initialData.propertyValue) : ''
  );

  // Additional housing expenses (separate from P&I)
  const [additionalExpensesInput, setAdditionalExpensesInput] = useState<string>(() => {
    if (initialData.currentHousingPayment && initialData.monthlyPayment) {
      const additional = initialData.currentHousingPayment - initialData.monthlyPayment;
      return additional > 0 ? String(additional) : '';
    }
    return '';
  });
  const [additionalExpenses, setAdditionalExpenses] = useState<number>(() => {
    if (initialData.currentHousingPayment && initialData.monthlyPayment) {
      return Math.max(0, initialData.currentHousingPayment - initialData.monthlyPayment);
    }
    return 0;
  });

  const [errors, setErrors] = useState<Partial<Record<keyof MortgageDetails, string>>>({});

  // Market rate calculation state
  const [useMarketRateCalculation, setUseMarketRateCalculation] = useState(false);
  const [baseMarketRate, setBaseMarketRate] = useState<number>(6.5); // Default base rate
  const [baseMarketRateInput, setBaseMarketRateInput] = useState<string>('6.5');
  const [rateMargin, setRateMargin] = useState<number>(0.75); // Default margin (75 basis points)
  const [rateMarginInput, setRateMarginInput] = useState<string>('0.75');
  const [isFetchingRate, setIsFetchingRate] = useState(false);

  // Rate fetch modal state
  const [showRateModal, setShowRateModal] = useState(false);
  const [rateModalData, setRateModalData] = useState<{ rate: number; date: string; source: string } | null>(null);
  const [rateModalError, setRateModalError] = useState<string | null>(null);

  // Auto-calculate AIO rate when using market rate calculation
  const calculateAIORate = () => {
    if (useMarketRateCalculation) {
      const calculated = baseMarketRate + rateMargin;
      setFormData((prev) => ({ ...prev, aioInterestRate: calculated }));
      setAioInterestRateInput(String(calculated.toFixed(3)));
    }
  };

  // Effect to recalculate AIO rate when base rate or margin changes
  useEffect(() => {
    if (useMarketRateCalculation) {
      calculateAIORate();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [baseMarketRate, rateMargin, useMarketRateCalculation]);

  // Fetch current market rate from FRED API via backend
  const fetchMarketRate = async () => {
    setIsFetchingRate(true);
    setRateModalError(null);
    setRateModalData(null);

    try {
      const response = await fetch('/api/current-mortgage-rate');
      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(result.message || 'Failed to fetch mortgage rate');
      }

      const { rate, date, source } = result.data;
      console.log(`Fetched mortgage rate: ${rate}% (as of ${date} from ${source})`);

      setBaseMarketRate(rate);
      setBaseMarketRateInput(String(rate));

      // Show success modal
      setRateModalData({ rate, date, source });
      setShowRateModal(true);
    } catch (error) {
      console.error('Error fetching market rate:', error);
      setRateModalError(error instanceof Error ? error.message : 'Unknown error');
      setShowRateModal(true);
    } finally {
      setIsFetchingRate(false);
    }
  };

  // Debug function to pre-populate form with test data
  const fillTestData = () => {
    const testMonthlyPayment = 2200;
    const testAdditionalExpenses = 600; // taxes, insurance, HOA

    setFormData({
      currentBalance: 350000,
      interestRate: 6.5,
      aioInterestRate: 7.25, // Typically HIGHER than traditional
      monthlyPayment: testMonthlyPayment,
      remainingTermMonths: 300,
      propertyValue: 500000,
      currentHousingPayment: testMonthlyPayment + testAdditionalExpenses, // 2800
      productType: '25-year-fixed', // Default to 25-year for test data
    });
    setCurrentBalanceInput('350000');
    setInterestRateInput('6.5');
    setAioInterestRateInput('7.25');
    setMonthlyPaymentInput('2200');
    setPropertyValueInput('500000');
    setAdditionalExpensesInput('600');
    setAdditionalExpenses(600);
    setTermYears(25);
    setTermMonths(0);
    setErrors({});
  };

  const validateForm = (): boolean => {
    const newErrors: Partial<Record<keyof MortgageDetails, string>> = {};

    if (!formData.currentBalance || formData.currentBalance <= 0) {
      newErrors.currentBalance = 'Please enter a valid loan balance';
    }

    if (!formData.interestRate || formData.interestRate <= 0 || formData.interestRate > 20) {
      newErrors.interestRate = 'Please enter a valid interest rate (0-20%)';
    }

    if (!formData.aioInterestRate || formData.aioInterestRate <= 0 || formData.aioInterestRate > 20) {
      newErrors.aioInterestRate = 'Please enter a valid AIO interest rate (0-20%)';
    }

    if (!formData.monthlyPayment || formData.monthlyPayment <= 0) {
      newErrors.monthlyPayment = 'Please enter a valid monthly payment';
    }

    if (!formData.remainingTermMonths || formData.remainingTermMonths <= 0) {
      newErrors.remainingTermMonths = 'Please enter a valid term (at least 1 month)';
    }

    if (!formData.propertyValue || formData.propertyValue <= 0) {
      newErrors.propertyValue = 'Please enter a valid property value';
    }

    if (formData.propertyValue && formData.currentBalance && formData.propertyValue < formData.currentBalance) {
      newErrors.propertyValue = 'Property value must be greater than loan balance';
    }

    if (additionalExpenses < 0) {
      newErrors.currentHousingPayment = 'Additional expenses cannot be negative';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    // Calculate total housing payment before submitting
    const totalHousingPayment = (formData.monthlyPayment || 0) + additionalExpenses;
    const submissionData = {
      ...formData,
      currentHousingPayment: totalHousingPayment,
    };

    if (validateForm()) {
      onSubmit(submissionData as MortgageDetails);
    }
  };

  // Handle term changes
  const handleTermYearsChange = (value: string) => {
    const years = parseInt(value) || 0;
    setTermYears(years);
    const totalMonths = years * 12 + termMonths;
    setFormData((prev) => ({ ...prev, remainingTermMonths: totalMonths }));
    if (errors.remainingTermMonths) {
      setErrors((prev) => ({ ...prev, remainingTermMonths: undefined }));
    }
  };

  const handleTermMonthsChange = (value: string) => {
    const months = parseInt(value) || 0;
    setTermMonths(months);
    const totalMonths = termYears * 12 + months;
    setFormData((prev) => ({ ...prev, remainingTermMonths: totalMonths }));
    if (errors.remainingTermMonths) {
      setErrors((prev) => ({ ...prev, remainingTermMonths: undefined }));
    }
  };

  return (
    <div className="mortgage-form-container">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.75rem', gap: '1rem' }}>
        <div className="form-header" style={{ margin: 0, flex: 1, textAlign: 'left' }}>
          <h2>Current Mortgage Details</h2>
          <p>Enter information about the borrower's existing mortgage loan</p>
        </div>
        <button
            type="button"
            onClick={fillTestData}
            className="btn-secondary"
            style={{
              fontSize: '0.85rem',
              padding: '0.5rem 1rem',
              whiteSpace: 'nowrap'
            }}
            title="Fill with test data for quick testing"
          >
            🔧 Fill Test Data
          </button>
      </div>

      <form onSubmit={handleSubmit} className="mortgage-form">
        <div className="form-grid">
          {/* LEFT COLUMN: Loan Details */}
          <div className="form-column">
            {/* Comparison Product Type - Now in Left Column */}
            <div className="form-section">
              <div className="form-section-title">Comparison Product Type</div>
              <div className="form-group">
                <label htmlFor="productType" className="form-label required">
                  Mortgage Type
                </label>
                <select
                  id="productType"
                  className="form-input"
                  value={formData.productType || '30-year-fixed'}
                  onChange={(e) => {
                    const productType = e.target.value as any;
                    setFormData((prev) => ({ ...prev, productType }));

                    // Auto-adjust term based on product
                    const termMap: { [key: string]: number } = {
                      '15-year-fixed': 15,
                      '20-year-fixed': 20,
                      '25-year-fixed': 25,
                      '30-year-fixed': 30,
                    };
                    const years = termMap[productType] || 30;
                    setTermYears(years);
                    setTermMonths(0);
                    setFormData((prev) => ({
                      ...prev,
                      productType,
                      remainingTermMonths: years * 12
                    }));

                    // Clear term error if exists
                    if (errors.remainingTermMonths) {
                      setErrors((prev) => ({ ...prev, remainingTermMonths: undefined }));
                    }
                  }}
                >
                  <option value="15-year-fixed">15-Year Fixed Rate</option>
                  <option value="20-year-fixed">20-Year Fixed Rate</option>
                  <option value="25-year-fixed">25-Year Fixed Rate</option>
                  <option value="30-year-fixed">30-Year Fixed Rate</option>
                </select>
                <span className="form-help-text">
                  Select the traditional mortgage type to compare against the All-In-One loan
                </span>
              </div>
            </div>

            {/* Current Balance */}
            <div className="form-group">
            <label htmlFor="currentBalance" className="form-label required">
              Current Loan Balance
            </label>
            <div className="input-wrapper">
              <span className="input-prefix">$</span>
              <input
                type="text"
                inputMode="decimal"
                id="currentBalance"
                className={`form-input ${errors.currentBalance ? 'input-error' : ''}`}
                placeholder="350,000.00"
                value={currentBalanceInput}
                onChange={(e) => {
                  const value = e.target.value.replace(/[^0-9.]/g, '');
                  // Allow only one decimal point
                  const parts = value.split('.');
                  const sanitized = parts.length > 2
                    ? parts[0] + '.' + parts.slice(1).join('')
                    : value;
                  setCurrentBalanceInput(sanitized);

                  // Update form data if we have a valid number
                  const numValue = parseFloat(sanitized);
                  if (!isNaN(numValue)) {
                    setFormData((prev) => ({ ...prev, currentBalance: numValue }));
                  }

                  // Clear error for this field
                  if (errors.currentBalance) {
                    setErrors((prev) => ({ ...prev, currentBalance: undefined }));
                  }
                }}
                onBlur={(e) => {
                  const value = e.target.value.replace(/[^0-9.]/g, '');
                  if (value) {
                    const num = parseFloat(value);
                    if (!isNaN(num)) {
                      setFormData((prev) => ({ ...prev, currentBalance: num }));
                      setCurrentBalanceInput(String(num));
                    }
                  }
                }}
              />
            </div>
            {errors.currentBalance && <span className="error-text">{errors.currentBalance}</span>}
          </div>

          {/* Property Value */}
          <div className="form-group">
            <label htmlFor="propertyValue" className="form-label required">
              Property Value
            </label>
            <div className="input-wrapper">
              <span className="input-prefix">$</span>
              <input
                type="text"
                inputMode="decimal"
                id="propertyValue"
                className={`form-input ${errors.propertyValue ? 'input-error' : ''}`}
                placeholder="500,000.00"
                value={propertyValueInput}
                onChange={(e) => {
                  const value = e.target.value.replace(/[^0-9.]/g, '');
                  // Allow only one decimal point
                  const parts = value.split('.');
                  const sanitized = parts.length > 2
                    ? parts[0] + '.' + parts.slice(1).join('')
                    : value;
                  setPropertyValueInput(sanitized);

                  // Update form data if we have a valid number
                  const numValue = parseFloat(sanitized);
                  if (!isNaN(numValue)) {
                    setFormData((prev) => ({ ...prev, propertyValue: numValue }));
                  }

                  // Clear error for this field
                  if (errors.propertyValue) {
                    setErrors((prev) => ({ ...prev, propertyValue: undefined }));
                  }
                }}
                onBlur={(e) => {
                  const value = e.target.value.replace(/[^0-9.]/g, '');
                  if (value) {
                    const num = parseFloat(value);
                    if (!isNaN(num)) {
                      setFormData((prev) => ({ ...prev, propertyValue: num }));
                      setPropertyValueInput(String(num));
                    }
                  }
                }}
              />
            </div>
            {errors.propertyValue && <span className="error-text">{errors.propertyValue}</span>}
            {formData.propertyValue && formData.currentBalance && (
              <span className="form-help-text">
                LTV: {((formData.currentBalance / formData.propertyValue) * 100).toFixed(1)}%
              </span>
            )}
          </div>

          {/* SECTION 2: Loan Terms */}
          {/* Interest Rate */}
          <div className="form-group">
            <label htmlFor="interestRate" className="form-label required">
              Traditional Mortgage Interest Rate
            </label>
            <div className="input-wrapper">
              <input
                type="text"
                inputMode="decimal"
                id="interestRate"
                className={`form-input ${errors.interestRate ? 'input-error' : ''}`}
                placeholder="6.500"
                value={interestRateInput}
                onChange={(e) => {
                  const value = e.target.value.replace(/[^0-9.]/g, '');
                  // Allow only one decimal point
                  const parts = value.split('.');
                  const sanitized = parts.length > 2
                    ? parts[0] + '.' + parts.slice(1).join('')
                    : value;
                  setInterestRateInput(sanitized);

                  // Update form data if we have a valid number
                  const numValue = parseFloat(sanitized);
                  if (!isNaN(numValue)) {
                    setFormData((prev) => ({ ...prev, interestRate: numValue }));
                  }

                  // Clear error for this field
                  if (errors.interestRate) {
                    setErrors((prev) => ({ ...prev, interestRate: undefined }));
                  }
                }}
                onBlur={(e) => {
                  const value = e.target.value.replace(/[^0-9.]/g, '');
                  if (value) {
                    const num = parseFloat(value);
                    if (!isNaN(num)) {
                      setFormData((prev) => ({ ...prev, interestRate: num }));
                      setInterestRateInput(String(num));
                    }
                  }
                }}
              />
              <span className="input-suffix">%</span>
            </div>
            {errors.interestRate && <span className="error-text">{errors.interestRate}</span>}
            <span className="form-help-text">Current rate on their existing mortgage</span>
          </div>

          {/* Remaining Term - Years/Months */}
          <div className="form-group">
            <label htmlFor="termYears" className="form-label required">
              Remaining Term
            </label>
            <div style={{ display: 'flex', gap: '1rem' }}>
              <div className="input-wrapper" style={{ flex: 1 }}>
                <input
                  type="number"
                  id="termYears"
                  className={`form-input ${errors.remainingTermMonths ? 'input-error' : ''}`}
                  placeholder="25"
                  value={termYears || ''}
                  onChange={(e) => handleTermYearsChange(e.target.value)}
                  min="0"
                />
                <span className="input-suffix">years</span>
              </div>
              <div className="input-wrapper" style={{ flex: 1 }}>
                <input
                  type="number"
                  id="termMonths"
                  className={`form-input ${errors.remainingTermMonths ? 'input-error' : ''}`}
                  placeholder="0"
                  value={termMonths || ''}
                  onChange={(e) => handleTermMonthsChange(e.target.value)}
                  min="0"
                />
                <span className="input-suffix">months</span>
              </div>
            </div>
            {errors.remainingTermMonths && <span className="error-text">{errors.remainingTermMonths}</span>}
            <span className="form-help-text">
              {formData.remainingTermMonths
                ? `Total: ${formData.remainingTermMonths} months${formData.remainingTermMonths >= 12 ? ` (${Math.floor(formData.remainingTermMonths / 12)} years, ${formData.remainingTermMonths % 12} months)` : ''}`
                : 'Enter years and/or months (e.g., 25 years + 6 months, or just 345 months)'}
            </span>
            </div>
          </div>

          {/* RIGHT COLUMN: Payment Information */}
          <div className="form-column">
            {/* Monthly Payment */}
            <div className="form-group">
            <label htmlFor="monthlyPayment" className="form-label required">
              Monthly Mortgage Payment (P&I)
            </label>
            <div className="input-wrapper">
              <span className="input-prefix">$</span>
              <input
                type="text"
                inputMode="decimal"
                id="monthlyPayment"
                className={`form-input ${errors.monthlyPayment ? 'input-error' : ''}`}
                placeholder="2,200.00"
                value={monthlyPaymentInput}
                onChange={(e) => {
                  const value = e.target.value.replace(/[^0-9.]/g, '');
                  // Allow only one decimal point
                  const parts = value.split('.');
                  const sanitized = parts.length > 2
                    ? parts[0] + '.' + parts.slice(1).join('')
                    : value;
                  setMonthlyPaymentInput(sanitized);

                  // Update form data if we have a valid number
                  const numValue = parseFloat(sanitized);
                  if (!isNaN(numValue)) {
                    setFormData((prev) => ({ ...prev, monthlyPayment: numValue }));
                  }

                  // Clear error for this field
                  if (errors.monthlyPayment) {
                    setErrors((prev) => ({ ...prev, monthlyPayment: undefined }));
                  }
                }}
                onBlur={(e) => {
                  const value = e.target.value.replace(/[^0-9.]/g, '');
                  if (value) {
                    const num = parseFloat(value);
                    if (!isNaN(num)) {
                      setFormData((prev) => ({ ...prev, monthlyPayment: num }));
                      setMonthlyPaymentInput(String(num));
                    }
                  }
                }}
              />
            </div>
            {errors.monthlyPayment && <span className="error-text">{errors.monthlyPayment}</span>}
            <span className="form-help-text">Principal & Interest only (exclude taxes, insurance, HOA)</span>
          </div>

          {/* Total Housing Payment Breakdown */}
          <div className="form-group">
            <label className="form-label required">
              Total Monthly Housing Expense
            </label>

            {/* Bordered Container */}
            <div style={{
              border: '2px solid #cbd5e0',
              borderRadius: '12px',
              padding: '1rem',
              background: 'linear-gradient(135deg, #ffffff 0%, #f7fafc 100%)',
              boxShadow: '0 2px 8px rgba(0, 0, 0, 0.05)'
            }}>
              {/* P&I Display (from monthly payment field) */}
              <div style={{
                padding: '0.75rem',
                backgroundColor: '#f8f9fa',
                borderRadius: '0.375rem',
                marginBottom: '0.75rem',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center'
              }}>
                <span style={{ color: '#6c757d', fontSize: '0.9rem' }}>Monthly Mortgage (P&amp;I)</span>
                <span style={{ fontWeight: '600', fontSize: '1rem' }}>
                  ${formData.monthlyPayment ? formData.monthlyPayment.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '0.00'}
                </span>
              </div>

              {/* Additional Expenses Input */}
              <label htmlFor="additionalExpenses" style={{ fontSize: '0.9rem', color: '#6c757d', marginBottom: '0.5rem', display: 'block' }}>
                + Additional Expenses (taxes, insurance, HOA, etc.)
              </label>
              <div className="input-wrapper" style={{ marginBottom: '0.75rem' }}>
              <span className="input-prefix">$</span>
              <input
                type="text"
                inputMode="decimal"
                id="additionalExpenses"
                className={`form-input ${errors.currentHousingPayment ? 'input-error' : ''}`}
                placeholder="0.00"
                value={additionalExpensesInput}
                onChange={(e) => {
                  const value = e.target.value.replace(/[^0-9.]/g, '');
                  // Allow only one decimal point
                  const parts = value.split('.');
                  const sanitized = parts.length > 2
                    ? parts[0] + '.' + parts.slice(1).join('')
                    : value;
                  setAdditionalExpensesInput(sanitized);

                  // Update additional expenses if we have a valid number
                  const numValue = parseFloat(sanitized);
                  if (!isNaN(numValue)) {
                    setAdditionalExpenses(numValue);
                  } else {
                    setAdditionalExpenses(0);
                  }

                  // Clear error for this field
                  if (errors.currentHousingPayment) {
                    setErrors((prev) => ({ ...prev, currentHousingPayment: undefined }));
                  }
                }}
                onBlur={(e) => {
                  const value = e.target.value.replace(/[^0-9.]/g, '');
                  if (value) {
                    const num = parseFloat(value);
                    if (!isNaN(num)) {
                      setAdditionalExpenses(num);
                      setAdditionalExpensesInput(String(num));
                    }
                  } else {
                    setAdditionalExpenses(0);
                    setAdditionalExpensesInput('');
                  }
                }}
              />
            </div>

              {/* Total Display */}
              <div style={{
                padding: '0.75rem',
                backgroundColor: '#e7f3ff',
                borderRadius: '0.375rem',
                border: '2px solid #0066cc',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center'
              }}>
                <span style={{ fontWeight: '600', color: '#0066cc', fontSize: '1rem' }}>= Total Monthly Housing Expense</span>
                <span style={{ fontWeight: '700', fontSize: '1.1rem', color: '#0066cc' }}>
                  ${((formData.monthlyPayment || 0) + additionalExpenses).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </span>
              </div>

              {errors.currentHousingPayment && <span className="error-text">{errors.currentHousingPayment}</span>}
              <span className="form-help-text" style={{ marginTop: '0.5rem', display: 'block' }}>
                This total is used to exclude all housing costs from your cash flow analysis
              </span>
            </div>
            </div>

            {/* AIO Interest Rate - Moved to Right Column */}
            <div className="form-section" style={{
              border: '3px solid #9bc53d',
              background: 'linear-gradient(135deg, #f0fdf4 0%, #e8f5e9 100%)',
              marginTop: '1.5rem'
            }}>
          <div className="form-section-title" style={{ color: '#2f855a', marginBottom: '1rem' }}>
            📊 Calculate All-In-One Interest Rate
          </div>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '1rem',
            flexWrap: 'wrap',
            marginBottom: useMarketRateCalculation ? '1.25rem' : '0'
          }}>
            <label style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.75rem',
              cursor: 'pointer',
              flex: '0 0 auto'
            }}>
              <input
                type="checkbox"
                checked={useMarketRateCalculation}
                onChange={(e) => setUseMarketRateCalculation(e.target.checked)}
              />
              <span style={{ fontWeight: '600', color: '#1a202c', fontSize: '1rem' }}>
                Calculate from Market Rate + Margin
              </span>
            </label>
            {!useMarketRateCalculation && (
              <span className="form-help-text" style={{ margin: 0 }}>
                Or check the box to calculate from market rate
              </span>
            )}
          </div>

          {useMarketRateCalculation ? (
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
              gap: '1.5rem',
              alignItems: 'end'
            }}>
              {/* Base Market Rate */}
              <div>
                <label htmlFor="baseMarketRate" className="form-label" style={{ fontSize: '0.9rem', marginBottom: '0.5rem' }}>
                  Base Market Rate
                </label>
                <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                  <div className="input-wrapper" style={{ flex: 1 }}>
                    <input
                      type="text"
                      inputMode="decimal"
                      id="baseMarketRate"
                      className="form-input"
                      placeholder="6.500"
                      value={baseMarketRateInput}
                      onChange={(e) => {
                        const value = e.target.value.replace(/[^0-9.]/g, '');
                        const parts = value.split('.');
                        const sanitized = parts.length > 2 ? parts[0] + '.' + parts.slice(1).join('') : value;
                        setBaseMarketRateInput(sanitized);
                        const numValue = parseFloat(sanitized);
                        if (!isNaN(numValue)) {
                          setBaseMarketRate(numValue);
                        }
                      }}
                    />
                    <span className="input-suffix">%</span>
                  </div>
                  <button
                    type="button"
                    onClick={fetchMarketRate}
                    disabled={isFetchingRate}
                    style={{
                      padding: '0.625rem 1.25rem',
                      background: '#3b82f6',
                      color: 'white',
                      border: 'none',
                      borderRadius: '0.375rem',
                      cursor: isFetchingRate ? 'not-allowed' : 'pointer',
                      fontWeight: '600',
                      fontSize: '0.875rem',
                      whiteSpace: 'nowrap',
                      opacity: isFetchingRate ? 0.6 : 1,
                      transition: 'all 0.2s',
                      height: '42px'
                    }}
                    onMouseEnter={(e) => !isFetchingRate && (e.currentTarget.style.background = '#2563eb')}
                    onMouseLeave={(e) => (e.currentTarget.style.background = '#3b82f6')}
                  >
                    {isFetchingRate ? 'Fetching...' : 'Get Rate'}
                  </button>
                  <span
                        title={`Fetch Current Mortgage Rate\n\n` +
                          `📊 Source: Federal Reserve Economic Data (FRED)\n` +
                          `📅 Updates: Weekly (national average)\n` +
                          `🎯 Rate Type: 30-year fixed mortgage\n\n` +
                          `Click "Fetch Current Rate" to automatically retrieve the latest market rate from the official FRED database.`}
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        width: '18px',
                        height: '18px',
                        background: '#64748b',
                        color: 'white',
                        borderRadius: '50%',
                        fontSize: '0.65rem',
                        fontWeight: '700',
                        fontStyle: 'italic',
                        cursor: 'help',
                        flexShrink: 0
                      }}
                    >
                      i
                    </span>
                </div>
              </div>

              {/* Rate Margin */}
              <div>
                <label htmlFor="rateMargin" className="form-label" style={{ fontSize: '0.9rem', marginBottom: '0.5rem' }}>
                  Margin / Spread
                </label>
                <div className="input-wrapper">
                  <input
                    type="text"
                    inputMode="decimal"
                    id="rateMargin"
                    className="form-input"
                    placeholder="0.750"
                    value={rateMarginInput}
                    onChange={(e) => {
                      const value = e.target.value.replace(/[^0-9.]/g, '');
                      const parts = value.split('.');
                      const sanitized = parts.length > 2 ? parts[0] + '.' + parts.slice(1).join('') : value;
                      setRateMarginInput(sanitized);
                      const numValue = parseFloat(sanitized);
                      if (!isNaN(numValue)) {
                        setRateMargin(numValue);
                      }
                    }}
                  />
                  <span className="input-suffix">%</span>
                </div>
              </div>

              {/* Calculated AIO Rate Display */}
              <div style={{
                background: 'white',
                padding: '1rem 1.5rem',
                borderRadius: '0.5rem',
                border: '3px solid #9bc53d',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'center',
                minHeight: '70px'
              }}>
                <div style={{ fontSize: '0.8rem', color: '#718096', marginBottom: '0.25rem', fontWeight: '600' }}>
                  Calculated AIO Rate:
                </div>
                <div style={{ fontSize: '1.35rem', fontWeight: '700', color: '#2d3748', lineHeight: '1.2' }}>
                  {baseMarketRate.toFixed(3)}% + {rateMargin.toFixed(3)}% = <span style={{ color: '#9bc53d', fontSize: '1.5rem' }}>{(baseMarketRate + rateMargin).toFixed(3)}%</span>
                </div>
              </div>
            </div>
          ) : (
            <div>
              {/* Manual AIO Rate Input */}
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
                  <label htmlFor="aioInterestRate" className="form-label required" style={{ marginBottom: 0, fontSize: '0.9rem' }}>
                    All-In-One Loan Interest Rate
                  </label>
                  <span
                    title={`All-In-One Loan Rate\n\n` +
                      `💡 Why Higher Rate?\n` +
                      `   • Flexible banking features included\n` +
                      `   • Daily interest calculation (not monthly)\n` +
                      `   • Offset capability reduces principal\n\n` +
                      `💰 You Still Save Money:\n` +
                      `   Daily interest on reduced principal = Lower costs\n` +
                      `   Your cash flow directly offsets the balance\n\n` +
                      `📊 Typical Range: 0.5% - 2.5% above traditional rate`}
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      width: '18px',
                      height: '18px',
                      background: '#64748b',
                      color: 'white',
                      borderRadius: '50%',
                      fontSize: '0.65rem',
                      fontWeight: '700',
                      fontStyle: 'italic',
                      cursor: 'help',
                      flexShrink: 0
                    }}
                  >
                    i
                  </span>
                </div>
                <div style={{ display: 'flex', gap: '1rem', alignItems: 'flex-start', flexWrap: 'wrap' }}>
                  <div className="input-wrapper" style={{ flex: '0 0 200px' }}>
                    <input
                      type="text"
                      inputMode="decimal"
                      id="aioInterestRate"
                      className={`form-input ${errors.aioInterestRate ? 'input-error' : ''}`}
                      placeholder="7.250"
                      value={aioInterestRateInput}
                      onChange={(e) => {
                        const value = e.target.value.replace(/[^0-9.]/g, '');
                        const parts = value.split('.');
                        const sanitized = parts.length > 2 ? parts[0] + '.' + parts.slice(1).join('') : value;
                        setAioInterestRateInput(sanitized);
                        const numValue = parseFloat(sanitized);
                        if (!isNaN(numValue)) {
                          setFormData((prev) => ({ ...prev, aioInterestRate: numValue }));
                        }
                        if (errors.aioInterestRate) {
                          setErrors((prev) => ({ ...prev, aioInterestRate: undefined }));
                        }
                      }}
                      onBlur={(e) => {
                        const value = e.target.value.replace(/[^0-9.]/g, '');
                        if (value) {
                          const num = parseFloat(value);
                          if (!isNaN(num)) {
                            setFormData((prev) => ({ ...prev, aioInterestRate: num }));
                            setAioInterestRateInput(String(num));
                          }
                        }
                      }}
                    />
                    <span className="input-suffix">%</span>
                  </div>
                  <div style={{ flex: 1, display: 'flex', alignItems: 'center', minHeight: '42px' }}>
                    <span className="form-help-text" style={{ margin: 0, fontSize: '0.85rem' }}>
                      Typically 0.5% - 2.5% higher than traditional rate
                    </span>
                  </div>
                </div>
                {errors.aioInterestRate && (
                  <span className="error-text" style={{ display: 'block', marginTop: '0.5rem' }}>
                    {errors.aioInterestRate}
                  </span>
                )}
              </div>
            </div>
          )}
        </div>
          </div>
        </div>

        <div className="form-actions" style={{
          position: 'sticky',
          bottom: 0,
          zIndex: 99,
          background: 'white',
          padding: '1rem 0',
          boxShadow: '0 -2px 10px rgba(0, 0, 0, 0.1)',
          marginTop: '2rem'
        }}>
          {onBack && (
            <button type="button" className="btn-secondary" onClick={onBack}>
              <svg className="btn-icon" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
              Back
            </button>
          )}
          <button type="submit" className="btn-primary">
            Continue to Bank Statements
            <svg className="btn-icon" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>
        </div>
      </form>

      {/* Rate Fetch Modal */}
      {showRateModal && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(0, 0, 0, 0.6)',
            backdropFilter: 'blur(4px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 10000,
            animation: 'fadeIn 0.2s ease'
          }}
          onClick={() => setShowRateModal(false)}
        >
          <div
            style={{
              background: 'white',
              borderRadius: '16px',
              maxWidth: '500px',
              width: '90%',
              boxShadow: '0 20px 60px rgba(0, 0, 0, 0.3)',
              animation: 'slideUp 0.3s ease',
              overflow: 'hidden'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              padding: '1.5rem',
              borderBottom: '1px solid #e2e8f0'
            }}>
              <h3 style={{ margin: 0, color: '#2d3748', fontSize: '1.25rem', fontWeight: 600 }}>
                {rateModalError ? 'Unable to Fetch Rate' : 'Current Market Rate'}
              </h3>
              <button
                style={{
                  background: 'none',
                  border: 'none',
                  width: '32px',
                  height: '32px',
                  borderRadius: '8px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                  color: '#718096',
                  transition: 'all 0.2s ease'
                }}
                onClick={() => setShowRateModal(false)}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = '#f7fafc';
                  e.currentTarget.style.color = '#2d3748';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = 'none';
                  e.currentTarget.style.color = '#718096';
                }}
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Modal Body */}
            <div style={{ padding: '2rem 1.5rem', textAlign: 'center' }}>
              {rateModalError ? (
                <>
                  <div style={{
                    width: '64px',
                    height: '64px',
                    margin: '0 auto 1.5rem',
                    background: 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)',
                    borderRadius: '50%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: 'white'
                  }}>
                    <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <p style={{ color: '#4a5568', fontSize: '1rem', lineHeight: 1.6, margin: '0 0 1rem 0' }}>
                    Unable to fetch current market rate from FRED API.
                  </p>
                  <div style={{
                    padding: '1rem',
                    background: '#fef2f2',
                    borderRadius: '8px',
                    border: '1px solid #fecaca',
                    marginBottom: '1rem'
                  }}>
                    <strong style={{ color: '#991b1b', fontSize: '0.9rem' }}>Error:</strong>
                    <p style={{ color: '#991b1b', fontSize: '0.9rem', margin: '0.5rem 0 0 0' }}>{rateModalError}</p>
                  </div>
                  <p style={{ color: '#718096', fontSize: '0.9rem', lineHeight: 1.6, margin: 0 }}>
                    Please enter the rate manually or try again later.
                  </p>
                </>
              ) : rateModalData && (
                <>
                  <div style={{
                    width: '64px',
                    height: '64px',
                    margin: '0 auto 1.5rem',
                    background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                    borderRadius: '50%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: 'white'
                  }}>
                    <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                  <p style={{ color: '#4a5568', fontSize: '1rem', lineHeight: 1.6, margin: '0 0 1.5rem 0' }}>
                    Successfully updated to current market rate
                  </p>
                  <div style={{
                    padding: '1.5rem',
                    background: 'linear-gradient(135deg, #ecfdf5 0%, #d1fae5 100%)',
                    borderRadius: '12px',
                    border: '2px solid #10b981',
                    marginBottom: '1.5rem'
                  }}>
                    <div style={{ fontSize: '0.85rem', color: '#047857', textTransform: 'uppercase', fontWeight: 600, marginBottom: '0.5rem' }}>
                      Current Rate
                    </div>
                    <div style={{ fontSize: '3rem', fontWeight: 700, color: '#059669', lineHeight: 1 }}>
                      {rateModalData.rate}%
                    </div>
                  </div>
                  <div style={{ display: 'grid', gap: '0.75rem', textAlign: 'left', fontSize: '0.9rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.75rem', background: '#f7fafc', borderRadius: '8px' }}>
                      <span style={{ color: '#718096', fontWeight: 500 }}>As of:</span>
                      <span style={{ color: '#2d3748', fontWeight: 600 }}>{rateModalData.date}</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.75rem', background: '#f7fafc', borderRadius: '8px' }}>
                      <span style={{ color: '#718096', fontWeight: 500 }}>Source:</span>
                      <span style={{ color: '#2d3748', fontWeight: 600 }}>{rateModalData.source}</span>
                    </div>
                  </div>
                </>
              )}
            </div>

            {/* Modal Footer */}
            <div style={{
              padding: '1.5rem',
              borderTop: '1px solid #e2e8f0',
              display: 'flex',
              justifyContent: 'flex-end'
            }}>
              <button
                className="btn-primary"
                onClick={() => setShowRateModal(false)}
                style={{ padding: '0.75rem 2rem' }}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
