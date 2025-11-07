import { useState } from 'react';
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

  const [errors, setErrors] = useState<Partial<Record<keyof MortgageDetails, string>>>({});

  // Debug function to pre-populate form with test data
  const fillTestData = () => {
    setFormData({
      currentBalance: 350000,
      interestRate: 6.5,
      monthlyPayment: 2200,
      remainingTermMonths: 300,
      propertyValue: 500000,
      currentHousingPayment: 2800,
    });
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

    if (!formData.monthlyPayment || formData.monthlyPayment <= 0) {
      newErrors.monthlyPayment = 'Please enter a valid monthly payment';
    }

    if (!formData.remainingTermMonths || formData.remainingTermMonths <= 0 || formData.remainingTermMonths > 360) {
      newErrors.remainingTermMonths = 'Please enter a valid term (1-360 months)';
    }

    if (!formData.propertyValue || formData.propertyValue <= 0) {
      newErrors.propertyValue = 'Please enter a valid property value';
    }

    if (formData.propertyValue && formData.currentBalance && formData.propertyValue < formData.currentBalance) {
      newErrors.propertyValue = 'Property value must be greater than loan balance';
    }

    if (!formData.currentHousingPayment || formData.currentHousingPayment < 0) {
      newErrors.currentHousingPayment = 'Please enter your current housing payment (or 0 if none)';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (validateForm()) {
      onSubmit(formData as MortgageDetails);
    }
  };

  const handleChange = (field: keyof MortgageDetails, value: string) => {
    const numValue = parseFloat(value) || undefined;
    setFormData((prev) => ({ ...prev, [field]: numValue }));
    // Clear error for this field
    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: undefined }));
    }
  };

  // Format currency on blur
  const formatCurrency = (value: number | undefined): string => {
    if (!value) return '';
    return new Intl.NumberFormat('en-US').format(value);
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
      <div className="form-header">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
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
      </div>

      <form onSubmit={handleSubmit} className="mortgage-form">
        <div className="form-grid">
          {/* Current Balance */}
          <div className="form-group">
            <label htmlFor="currentBalance" className="form-label required">
              Current Loan Balance
            </label>
            <div className="input-wrapper">
              <span className="input-prefix">$</span>
              <input
                type="text"
                inputMode="numeric"
                id="currentBalance"
                className={`form-input ${errors.currentBalance ? 'input-error' : ''}`}
                placeholder="350,000"
                value={formData.currentBalance ? formatCurrency(formData.currentBalance) : ''}
                onChange={(e) => {
                  const value = e.target.value.replace(/[^0-9.]/g, '');
                  handleChange('currentBalance', value);
                }}
                onBlur={(e) => {
                  const value = e.target.value.replace(/[^0-9.]/g, '');
                  if (value) {
                    setFormData((prev) => ({ ...prev, currentBalance: parseFloat(value) }));
                  }
                }}
              />
            </div>
            {errors.currentBalance && <span className="error-text">{errors.currentBalance}</span>}
          </div>

          {/* Interest Rate */}
          <div className="form-group">
            <label htmlFor="interestRate" className="form-label required">
              Interest Rate
            </label>
            <div className="input-wrapper">
              <input
                type="text"
                inputMode="decimal"
                id="interestRate"
                className={`form-input ${errors.interestRate ? 'input-error' : ''}`}
                placeholder="6.500"
                value={formData.interestRate !== undefined ? String(formData.interestRate) : ''}
                onChange={(e) => {
                  const value = e.target.value.replace(/[^0-9.]/g, '');
                  handleChange('interestRate', value);
                }}
                onBlur={(e) => {
                  const value = e.target.value.replace(/[^0-9.]/g, '');
                  if (value) {
                    const num = parseFloat(value);
                    setFormData((prev) => ({ ...prev, interestRate: num }));
                  }
                }}
              />
              <span className="input-suffix">%</span>
            </div>
            {errors.interestRate && <span className="error-text">{errors.interestRate}</span>}
          </div>

          {/* Monthly Payment */}
          <div className="form-group">
            <label htmlFor="monthlyPayment" className="form-label required">
              Monthly Mortgage Payment (P&I)
            </label>
            <div className="input-wrapper">
              <span className="input-prefix">$</span>
              <input
                type="text"
                inputMode="numeric"
                id="monthlyPayment"
                className={`form-input ${errors.monthlyPayment ? 'input-error' : ''}`}
                placeholder="2,200"
                value={formData.monthlyPayment ? formatCurrency(formData.monthlyPayment) : ''}
                onChange={(e) => {
                  const value = e.target.value.replace(/[^0-9.]/g, '');
                  handleChange('monthlyPayment', value);
                }}
                onBlur={(e) => {
                  const value = e.target.value.replace(/[^0-9.]/g, '');
                  if (value) {
                    setFormData((prev) => ({ ...prev, monthlyPayment: parseFloat(value) }));
                  }
                }}
              />
            </div>
            {errors.monthlyPayment && <span className="error-text">{errors.monthlyPayment}</span>}
            <span className="form-help-text">Principal & Interest only (exclude taxes, insurance, HOA)</span>
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
                  max="30"
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
                  max="11"
                />
                <span className="input-suffix">months</span>
              </div>
            </div>
            {errors.remainingTermMonths && <span className="error-text">{errors.remainingTermMonths}</span>}
            <span className="form-help-text">
              {formData.remainingTermMonths
                ? `Total: ${formData.remainingTermMonths} months`
                : 'Enter years and months remaining on the loan'}
            </span>
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
                inputMode="numeric"
                id="propertyValue"
                className={`form-input ${errors.propertyValue ? 'input-error' : ''}`}
                placeholder="500,000"
                value={formData.propertyValue ? formatCurrency(formData.propertyValue) : ''}
                onChange={(e) => {
                  const value = e.target.value.replace(/[^0-9.]/g, '');
                  handleChange('propertyValue', value);
                }}
                onBlur={(e) => {
                  const value = e.target.value.replace(/[^0-9.]/g, '');
                  if (value) {
                    setFormData((prev) => ({ ...prev, propertyValue: parseFloat(value) }));
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

          {/* Current Housing Payment */}
          <div className="form-group">
            <label htmlFor="currentHousingPayment" className="form-label required">
              Total Monthly Housing Expense
            </label>
            <div className="input-wrapper">
              <span className="input-prefix">$</span>
              <input
                type="text"
                inputMode="numeric"
                id="currentHousingPayment"
                className={`form-input ${errors.currentHousingPayment ? 'input-error' : ''}`}
                placeholder="2,500"
                value={formData.currentHousingPayment ? formatCurrency(formData.currentHousingPayment) : ''}
                onChange={(e) => {
                  const value = e.target.value.replace(/[^0-9.]/g, '');
                  handleChange('currentHousingPayment', value);
                }}
                onBlur={(e) => {
                  const value = e.target.value.replace(/[^0-9.]/g, '');
                  if (value) {
                    setFormData((prev) => ({ ...prev, currentHousingPayment: parseFloat(value) }));
                  }
                }}
              />
            </div>
            {errors.currentHousingPayment && <span className="error-text">{errors.currentHousingPayment}</span>}
            <span className="form-help-text">
              Include P&I + taxes + insurance + HOA (used to exclude housing costs from cash flow)
            </span>
          </div>
        </div>

        <div className="form-actions">
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
    </div>
  );
}
