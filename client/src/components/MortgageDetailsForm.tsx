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

  const [errors, setErrors] = useState<Partial<Record<keyof MortgageDetails, string>>>({});

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

  return (
    <div className="mortgage-form-container">
      <div className="form-header">
        <h2>Current Mortgage Details</h2>
        <p>Enter information about the borrower's existing mortgage loan</p>
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
                type="number"
                id="currentBalance"
                className={`form-input ${errors.currentBalance ? 'input-error' : ''}`}
                placeholder="350,000"
                value={formData.currentBalance || ''}
                onChange={(e) => handleChange('currentBalance', e.target.value)}
                step="1000"
                min="0"
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
                type="number"
                id="interestRate"
                className={`form-input ${errors.interestRate ? 'input-error' : ''}`}
                placeholder="6.5"
                value={formData.interestRate || ''}
                onChange={(e) => handleChange('interestRate', e.target.value)}
                step="0.125"
                min="0"
                max="20"
              />
              <span className="input-suffix">%</span>
            </div>
            {errors.interestRate && <span className="error-text">{errors.interestRate}</span>}
          </div>

          {/* Monthly Payment */}
          <div className="form-group">
            <label htmlFor="monthlyPayment" className="form-label required">
              Monthly Payment (P&I)
            </label>
            <div className="input-wrapper">
              <span className="input-prefix">$</span>
              <input
                type="number"
                id="monthlyPayment"
                className={`form-input ${errors.monthlyPayment ? 'input-error' : ''}`}
                placeholder="2,200"
                value={formData.monthlyPayment || ''}
                onChange={(e) => handleChange('monthlyPayment', e.target.value)}
                step="10"
                min="0"
              />
            </div>
            {errors.monthlyPayment && <span className="error-text">{errors.monthlyPayment}</span>}
            <span className="form-help-text">Principal and Interest only (exclude taxes and insurance)</span>
          </div>

          {/* Remaining Term */}
          <div className="form-group">
            <label htmlFor="remainingTermMonths" className="form-label required">
              Remaining Term
            </label>
            <div className="input-wrapper">
              <input
                type="number"
                id="remainingTermMonths"
                className={`form-input ${errors.remainingTermMonths ? 'input-error' : ''}`}
                placeholder="300"
                value={formData.remainingTermMonths || ''}
                onChange={(e) => handleChange('remainingTermMonths', e.target.value)}
                step="1"
                min="1"
                max="360"
              />
              <span className="input-suffix">months</span>
            </div>
            {errors.remainingTermMonths && <span className="error-text">{errors.remainingTermMonths}</span>}
            <span className="form-help-text">
              {formData.remainingTermMonths
                ? `${Math.floor(formData.remainingTermMonths / 12)} years, ${formData.remainingTermMonths % 12} months`
                : 'E.g., 25 years = 300 months'}
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
                type="number"
                id="propertyValue"
                className={`form-input ${errors.propertyValue ? 'input-error' : ''}`}
                placeholder="500,000"
                value={formData.propertyValue || ''}
                onChange={(e) => handleChange('propertyValue', e.target.value)}
                step="5000"
                min="0"
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
              Current Housing Payment
            </label>
            <div className="input-wrapper">
              <span className="input-prefix">$</span>
              <input
                type="number"
                id="currentHousingPayment"
                className={`form-input ${errors.currentHousingPayment ? 'input-error' : ''}`}
                placeholder="2,500"
                value={formData.currentHousingPayment || ''}
                onChange={(e) => handleChange('currentHousingPayment', e.target.value)}
                step="10"
                min="0"
              />
            </div>
            {errors.currentHousingPayment && <span className="error-text">{errors.currentHousingPayment}</span>}
            <span className="form-help-text">
              Total rent or mortgage (will be excluded from cash flow analysis)
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
