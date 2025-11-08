import { useState, useRef } from 'react';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import html2pdf from 'html2pdf.js';
import type { SimulationResult, MortgageDetails } from '../types';
import PitchOptionsModal, { PitchOptions } from './PitchOptionsModal';
import { CMG_BRANDING } from '../constants/cmgBranding';
import './ProposalBuilder.css';

interface ProposalComponent {
  id: string;
  label: string;
  description: string;
  enabled: boolean;
}

interface ProposalBuilderProps {
  simulation: SimulationResult;
  mortgageDetails: MortgageDetails;
  cashFlow?: CashFlowAnalysis;
  onBack: () => void;
}

// Sortable Item Component
function SortableItem({ id, component, onToggle }: {
  id: string;
  component: ProposalComponent;
  onToggle: (id: string) => void;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`sortable-item ${component.enabled ? 'enabled' : 'disabled'}`}
    >
      <div className="sortable-handle" {...attributes} {...listeners}>
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8h16M4 16h16" />
        </svg>
      </div>
      <div className="sortable-content">
        <label className="checkbox-label">
          <input
            type="checkbox"
            checked={component.enabled}
            onChange={() => onToggle(id)}
          />
          <div className="component-info">
            <span className="component-label">{component.label}</span>
            <span className="component-description">{component.description}</span>
          </div>
        </label>
      </div>
    </div>
  );
}

type WizardStep = 1 | 2 | 3 | 4;

export default function ProposalBuilder({
  simulation,
  mortgageDetails,
  cashFlow,
  onBack,
}: ProposalBuilderProps) {
  // Wizard state
  const [currentStep, setCurrentStep] = useState<WizardStep>(1);

  // Personalization state
  const [clientName, setClientName] = useState('');
  const [clientEmail, setClientEmail] = useState('');
  const [includeFooter, setIncludeFooter] = useState(true);

  // AI Pitch state
  const [aiPitch, setAiPitch] = useState('');
  const [isGeneratingPitch, setIsGeneratingPitch] = useState(false);
  const [isGeneratingPDF, setIsGeneratingPDF] = useState(false);
  const [showPitchOptions, setShowPitchOptions] = useState(false);
  const [isEditingPitch, setIsEditingPitch] = useState(false);
  const [editedPitch, setEditedPitch] = useState('');
  const [pitchOptions, setPitchOptions] = useState<PitchOptions>({
    tone: 'neutral',
    length: 'standard',
    technicalLevel: 'moderate',
    focus: 'balanced',
    urgency: 'moderate',
    style: 'balanced',
    cta: 'moderate',
  });

  // PDF content ref
  const pdfContentRef = useRef<HTMLDivElement>(null);

  // Available components (pitch is mandatory and always at top)
  const [components, setComponents] = useState<ProposalComponent[]>([
    {
      id: 'savings-highlight',
      label: 'Savings Highlight',
      description: 'Total interest savings banner with key metrics',
      enabled: true,
    },
    {
      id: 'comparison-cards',
      label: 'Side-by-Side Comparison',
      description: 'Traditional vs All-In-One loan cards',
      enabled: true,
    },
    {
      id: 'how-it-works',
      label: 'How It Works',
      description: 'Explanation of All-In-One loan benefits',
      enabled: true,
    },
    {
      id: 'cash-flow-details',
      label: 'Cash Flow Analysis',
      description: 'Detailed monthly cash flow breakdown',
      enabled: false,
    },
    {
      id: 'amortization-chart',
      label: 'Payoff Timeline Chart',
      description: 'Visual timeline comparison',
      enabled: false,
    },
    {
      id: 'signature',
      label: 'Email Signature',
      description: 'Professional email signature with contact details',
      enabled: false,
    },
  ]);

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      setComponents((items) => {
        const oldIndex = items.findIndex((item) => item.id === active.id);
        const newIndex = items.findIndex((item) => item.id === over.id);
        return arrayMove(items, oldIndex, newIndex);
      });
    }
  };

  const handleToggle = (id: string) => {
    setComponents((items) =>
      items.map((item) =>
        item.id === id ? { ...item, enabled: !item.enabled } : item
      )
    );
  };

  const handleGeneratePitch = async () => {
    setIsGeneratingPitch(true);
    try {
      // Call API to generate AI pitch
      const response = await fetch('/api/generate-pitch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          simulation,
          mortgageDetails,
          clientName: clientName || 'this client',
          options: pitchOptions,
        }),
      });

      if (!response.ok) throw new Error('Failed to generate pitch');

      const data = await response.json();
      setAiPitch(data.pitch);
    } catch (error) {
      console.error('Error generating pitch:', error);
      alert('Failed to generate pitch. Please try again.');
    } finally {
      setIsGeneratingPitch(false);
    }
  };

  const handleApplyPitchOptions = (options: PitchOptions) => {
    setPitchOptions(options);
    // Automatically regenerate pitch with new options
    setTimeout(() => {
      handleGeneratePitch();
    }, 100);
  };

  // Pitch editing handlers
  const handleStartEditPitch = () => {
    setEditedPitch(aiPitch);
    setIsEditingPitch(true);
  };

  const handleSavePitch = () => {
    setAiPitch(editedPitch);
    setIsEditingPitch(false);
  };

  const handleCancelEditPitch = () => {
    setEditedPitch('');
    setIsEditingPitch(false);
  };

  // Wizard navigation
  const steps = [
    { number: 1, title: 'Client Info', description: 'Enter client details' },
    { number: 2, title: 'AI Sales Pitch', description: 'Generate personalized pitch' },
    { number: 3, title: 'Select Components', description: 'Choose sections to include' },
    { number: 4, title: 'Preview & Download', description: 'Review and generate PDF' },
  ];

  const canProceedToNextStep = (): boolean => {
    switch (currentStep) {
      case 1:
        return clientName.trim().length > 0;
      case 2:
        return aiPitch.trim().length > 0;
      case 3:
        return true; // Always can proceed from component selection
      case 4:
        return true;
      default:
        return false;
    }
  };

  const handleNextStep = () => {
    if (canProceedToNextStep() && currentStep < 4) {
      setCurrentStep((currentStep + 1) as WizardStep);
    }
  };

  const handlePreviousStep = () => {
    if (currentStep > 1) {
      setCurrentStep((currentStep - 1) as WizardStep);
    }
  };

  const handleGeneratePDF = async () => {
    if (!pdfContentRef.current) return;

    setIsGeneratingPDF(true);

    try {
      const opt = {
        margin: 0.5,
        filename: `${clientName || 'Client'}-AIO-Proposal.pdf`,
        image: { type: 'jpeg' as const, quality: 0.98 },
        html2canvas: { scale: 2, useCORS: true, letterRendering: true },
        jsPDF: { unit: 'in', format: 'letter', orientation: 'portrait' as const },
      };

      await html2pdf().set(opt).from(pdfContentRef.current).save();
    } catch (error) {
      console.error('Error generating PDF:', error);
      alert('Failed to generate PDF. Please try again.');
    } finally {
      setIsGeneratingPDF(false);
    }
  };

  const formatCurrency = (amount: number): string => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const yearsMonthsFromMonths = (totalMonths: number) => {
    const years = Math.floor(totalMonths / 12);
    const months = totalMonths % 12;
    return `${years} yr${years !== 1 ? 's' : ''} ${months} mo`;
  };

  return (
    <div className="proposal-builder">
      <div className="proposal-header">
        <div className="header-icon">
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
        </div>
        <h1>Proposal Builder</h1>
        <p>Step-by-step wizard to create your client proposal</p>
      </div>

      {/* Step Indicator */}
      <div className="wizard-steps">
        {steps.map((step) => (
          <div
            key={step.number}
            className={`wizard-step ${currentStep === step.number ? 'active' : ''} ${currentStep > step.number ? 'completed' : ''}`}
          >
            <div className="step-number">
              {currentStep > step.number ? (
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              ) : (
                step.number
              )}
            </div>
            <div className="step-info">
              <div className="step-title">{step.title}</div>
              <div className="step-description">{step.description}</div>
            </div>
          </div>
        ))}
      </div>

      <div className="proposal-content">
        {/* Step 1: Client Information */}
        {currentStep === 1 && (
          <div className="section-card">
            <h2>Client Information</h2>
            <p className="section-description">Personalize the proposal for your client</p>

            <div className="form-row">
              <div className="form-group">
                <label htmlFor="clientName">Client Name *</label>
                <input
                  id="clientName"
                  type="text"
                  className="form-input"
                  placeholder="Enter client's name"
                  value={clientName}
                  onChange={(e) => setClientName(e.target.value)}
                />
              </div>

              <div className="form-group">
                <label htmlFor="clientEmail">Client Email (optional)</label>
                <input
                  id="clientEmail"
                  type="email"
                  className="form-input"
                  placeholder="client@example.com"
                  value={clientEmail}
                  onChange={(e) => setClientEmail(e.target.value)}
                />
              </div>
            </div>

            {!clientName.trim() && (
              <p className="validation-hint">* Client name is required to proceed</p>
            )}
          </div>
        )}

        {/* Step 2: AI Pitch Generation */}
        {currentStep === 2 && (
        <div className="section-card">
          <div className="section-header-with-action">
            <div>
              <h2>AI-Generated Sales Pitch</h2>
              <p className="section-description">
                {aiPitch
                  ? 'Personalized pitch generated - this will appear at the top of your proposal'
                  : 'Generate a personalized pitch highlighting the key benefits for this client'}
              </p>
            </div>
            <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
              <button
                className="btn-icon-only"
                onClick={() => setShowPitchOptions(true)}
                title="Customize pitch options"
              >
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" />
                </svg>
              </button>
              <button
                className="btn-primary"
                onClick={handleGeneratePitch}
                disabled={isGeneratingPitch}
              >
                {isGeneratingPitch ? (
                  <>
                    <div className="spinner-small"></div>
                    Generating...
                  </>
                ) : (
                  <>
                    <svg className="btn-icon" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                    </svg>
                    {aiPitch ? 'Regenerate' : 'Generate'} Pitch
                  </>
                )}
              </button>
            </div>
          </div>

          {aiPitch && (
            <div className="pitch-preview">
              <div className="pitch-label">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                {isEditingPitch ? 'Editing Pitch' : 'Preview'}
                {!isEditingPitch && (
                  <button
                    className="btn-icon-only"
                    onClick={handleStartEditPitch}
                    title="Edit pitch"
                    style={{ marginLeft: 'auto', padding: '0.5rem' }}
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" style={{ width: '18px', height: '18px' }}>
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                    </svg>
                  </button>
                )}
              </div>
              {isEditingPitch ? (
                <>
                  <textarea
                    className="pitch-content"
                    value={editedPitch}
                    onChange={(e) => setEditedPitch(e.target.value)}
                    rows={8}
                    style={{
                      width: '100%',
                      padding: '1rem',
                      border: '2px solid #3b82f6',
                      borderRadius: '8px',
                      fontSize: '1rem',
                      fontFamily: 'inherit',
                      lineHeight: '1.7',
                      resize: 'vertical'
                    }}
                  />
                  <div style={{ display: 'flex', gap: '0.75rem', marginTop: '1rem', justifyContent: 'flex-end' }}>
                    <button className="btn-secondary" onClick={handleCancelEditPitch}>
                      Cancel
                    </button>
                    <button className="btn-primary" onClick={handleSavePitch}>
                      Save Changes
                    </button>
                  </div>
                </>
              ) : (
                <div className="pitch-content">{aiPitch}</div>
              )}
            </div>
          )}

          {!aiPitch && (
            <div className="pitch-placeholder">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
              </svg>
              <p>No pitch generated yet. Click "Generate Pitch" to create a personalized message.</p>
            </div>
          )}
        </div>
        )}

        {/* Step 3: Component Selection & Ordering */}
        {currentStep === 3 && (
        <div className="section-card">
          <h2>Select Components</h2>
          <p className="section-description">
            Choose which sections to include and drag to reorder them
          </p>

          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={handleDragEnd}
          >
            <SortableContext
              items={components.map((c) => c.id)}
              strategy={verticalListSortingStrategy}
            >
              <div className="sortable-list">
                {components.map((component) => (
                  <SortableItem
                    key={component.id}
                    id={component.id}
                    component={component}
                    onToggle={handleToggle}
                  />
                ))}
              </div>
            </SortableContext>
          </DndContext>

          <div className="footer-option">
            <label className="checkbox-label">
              <input
                type="checkbox"
                checked={includeFooter}
                onChange={(e) => setIncludeFooter(e.target.checked)}
              />
              <span>Include CMG Financial footer with contact information</span>
            </label>
          </div>
        </div>
        )}

        {/* Step 4: Preview & Download */}
        {currentStep === 4 && (
          <div className="section-card">
            <h2>Preview Your Proposal</h2>
            <p className="section-description">
              Review the proposal below, then download as PDF
            </p>

            <div className="proposal-preview">
              <div className="preview-content">
                {/* Header with CMG Logo */}
                <div className="preview-header">
                  <img
                    src={CMG_BRANDING.logo.url}
                    alt={CMG_BRANDING.logo.alt}
                    style={{ maxWidth: '180px', marginBottom: '1rem' }}
                  />
                  <h1>All-In-One Loan Proposal</h1>
                  {clientName && <h2>Prepared for {clientName}</h2>}
                  <p>{new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</p>
                </div>

                {/* AI Pitch */}
                {aiPitch && (
                  <div className="preview-section pitch-section">
                    <h3>Why the All-In-One Loan is Right for You</h3>
                    <div className="preview-pitch">{aiPitch}</div>
                  </div>
                )}

                {/* Savings Highlight */}
                {components.find((c) => c.id === 'savings-highlight')?.enabled && (
                  <div className="preview-section savings-section">
                    <h3>Total Interest Savings</h3>
                    <div className="preview-savings-amount">{formatCurrency(simulation.comparison.interestSavings)}</div>
                    <div className="preview-stats">
                      <div>
                        <strong>Time Saved:</strong> {yearsMonthsFromMonths(simulation.comparison.timeSavedMonths)}
                      </div>
                      <div>
                        <strong>Interest Reduction:</strong> {simulation.comparison.percentageSavings.toFixed(1)}%
                      </div>
                    </div>
                  </div>
                )}

                {/* Comparison Table */}
                {components.find((c) => c.id === 'comparison-cards')?.enabled && (
                  <div className="preview-section">
                    <h3>Side-by-Side Comparison</h3>
                    <table className="preview-table">
                      <thead>
                        <tr>
                          <th>Metric</th>
                          <th>Traditional Mortgage</th>
                          <th>All-In-One Loan</th>
                        </tr>
                      </thead>
                      <tbody>
                        <tr>
                          <td>Monthly Payment</td>
                          <td>{formatCurrency(simulation.traditionalLoanLoan.monthlyPayment)}</td>
                          <td>{formatCurrency(simulation.allInOneLoanLoan.monthlyPayment)}</td>
                        </tr>
                        <tr>
                          <td>Total Interest</td>
                          <td>{formatCurrency(simulation.traditionalLoanLoan.totalInterestPaid)}</td>
                          <td className="savings-cell">{formatCurrency(simulation.allInOneLoanLoan.totalInterestPaid)}</td>
                        </tr>
                        <tr>
                          <td>Payoff Timeline</td>
                          <td>{yearsMonthsFromMonths(simulation.traditionalLoanLoan.payoffMonths)}</td>
                          <td className="savings-cell">{yearsMonthsFromMonths(simulation.allInOneLoanLoan.payoffMonths)}</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                )}

                {/* How It Works */}
                {components.find((c) => c.id === 'how-it-works')?.enabled && (
                  <div className="preview-section">
                    <h3>How the All-In-One Loan Works</h3>
                    <div className="preview-benefits">
                      <div className="benefit-item">
                        <h4>💰 Cash Flow Offset</h4>
                        <p>Your positive cash flow sits in the loan account, reducing the balance used for interest calculations.</p>
                      </div>
                      <div className="benefit-item">
                        <h4>📈 Accelerated Payoff</h4>
                        <p>You'll pay off your mortgage {yearsMonthsFromMonths(simulation.comparison.timeSavedMonths)} faster.</p>
                      </div>
                      <div className="benefit-item">
                        <h4>🔓 Full Flexibility</h4>
                        <p>Access your funds anytime while they work to reduce your interest.</p>
                      </div>
                    </div>
                  </div>
                )}

                {/* Cash Flow Analysis */}
                {components.find((c) => c.id === 'cash-flow-details')?.enabled && (
                  <div className="preview-section">
                    <h3>Cash Flow Analysis</h3>
                    <table className="preview-table">
                      <thead>
                        <tr>
                          <th>Item</th>
                          <th style={{textAlign: 'right'}}>Amount</th>
                        </tr>
                      </thead>
                      <tbody>
                        <tr>
                          <td>Monthly Income</td>
                          <td style={{textAlign: 'right'}}>{formatCurrency(cashFlow?.totalIncome || 0)}</td>
                        </tr>
                        <tr>
                          <td>Monthly Expenses</td>
                          <td style={{textAlign: 'right'}}>{formatCurrency(cashFlow?.totalExpenses || 0)}</td>
                        </tr>
                        <tr className="savings-cell">
                          <td><strong>Net Monthly Cash Flow</strong></td>
                          <td style={{textAlign: 'right'}}><strong>{formatCurrency(cashFlow?.netCashFlow || 0)}</strong></td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                )}

                {/* Payoff Timeline Chart */}
                {components.find((c) => c.id === 'amortization-chart')?.enabled && (
                  <div className="preview-section">
                    <h3>Payoff Timeline Comparison</h3>
                    <div style={{ background: '#f7fafc', padding: '2rem', borderRadius: '12px', textAlign: 'center' }}>
                      <p style={{ marginBottom: '1rem', color: '#64748b' }}>Visual timeline showing accelerated payoff</p>
                      <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center', alignItems: 'flex-end' }}>
                        <div style={{ flex: 1, maxWidth: '200px' }}>
                          <div style={{
                            height: `${(simulation.traditionalLoan.payoffMonths / simulation.traditionalLoan.payoffMonths) * 200}px`,
                            background: '#3b82f6',
                            borderRadius: '8px 8px 0 0',
                            marginBottom: '0.5rem',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            color: 'white',
                            fontWeight: '700'
                          }}>
                            {yearsMonthsFromMonths(simulation.traditionalLoan.payoffMonths)}
                          </div>
                          <div style={{ fontWeight: '600', color: '#475569' }}>Traditional</div>
                        </div>
                        <div style={{ flex: 1, maxWidth: '200px' }}>
                          <div style={{
                            height: `${(simulation.allInOneLoan.payoffMonths / simulation.traditionalLoan.payoffMonths) * 200}px`,
                            background: '#9bc53d',
                            borderRadius: '8px 8px 0 0',
                            marginBottom: '0.5rem',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            color: 'white',
                            fontWeight: '700'
                          }}>
                            {yearsMonthsFromMonths(simulation.allInOneLoan.payoffMonths)}
                          </div>
                          <div style={{ fontWeight: '600', color: '#475569' }}>All-In-One</div>
                        </div>
                      </div>
                      <p style={{ marginTop: '1.5rem', color: '#16a34a', fontWeight: '600', fontSize: '1.1rem' }}>
                        Pay off {yearsMonthsFromMonths(simulation.comparison.timeSavedMonths)} faster!
                      </p>
                    </div>
                  </div>
                )}

                {/* CMG Financial Footer */}
                {includeFooter && (
                  <div className="preview-footer">
                    <div style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
                      <img
                        src={CMG_BRANDING.logo.url}
                        alt={CMG_BRANDING.logo.alt}
                        style={{ maxWidth: '140px', marginBottom: '1rem' }}
                      />
                      <p style={{ fontWeight: 600, fontSize: '1rem', marginBottom: '0.5rem', color: '#333' }}>
                        {CMG_BRANDING.company.name}
                      </p>
                      <p style={{ fontSize: '0.85rem', color: '#666', margin: '0' }}>
                        {CMG_BRANDING.company.tagline}
                      </p>
                    </div>

                    <div style={{ textAlign: 'center', marginBottom: '1rem' }}>
                      <p style={{ margin: '0.25rem 0', fontSize: '0.85rem', color: '#666' }}>
                        {CMG_BRANDING.company.address}
                      </p>
                      <p style={{ margin: '0.25rem 0', fontSize: '0.85rem', color: '#666' }}>
                        Phone: {CMG_BRANDING.company.phone} | Website: <a href={CMG_BRANDING.company.website} style={{ color: CMG_BRANDING.colors.primary }}>{CMG_BRANDING.company.website}</a>
                      </p>
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'center', gap: '1rem', marginBottom: '1.5rem' }}>
                      <a href={CMG_BRANDING.socialMedia.linkedin} target="_blank" rel="noopener noreferrer" style={{ color: '#0077b5' }}>
                        <svg width="24" height="24" fill="currentColor" viewBox="0 0 24 24"><path d="M19 0h-14c-2.761 0-5 2.239-5 5v14c0 2.761 2.239 5 5 5h14c2.762 0 5-2.239 5-5v-14c0-2.761-2.238-5-5-5zm-11 19h-3v-11h3v11zm-1.5-12.268c-.966 0-1.75-.79-1.75-1.764s.784-1.764 1.75-1.764 1.75.79 1.75 1.764-.783 1.764-1.75 1.764zm13.5 12.268h-3v-5.604c0-3.368-4-3.113-4 0v5.604h-3v-11h3v1.765c1.396-2.586 7-2.777 7 2.476v6.759z"/></svg>
                      </a>
                      <a href={CMG_BRANDING.socialMedia.facebook} target="_blank" rel="noopener noreferrer" style={{ color: '#1877f2' }}>
                        <svg width="24" height="24" fill="currentColor" viewBox="0 0 24 24"><path d="M9 8h-3v4h3v12h5v-12h3.642l.358-4h-4v-1.667c0-.955.192-1.333 1.115-1.333h2.885v-5h-3.808c-3.596 0-5.192 1.583-5.192 4.615v3.385z"/></svg>
                      </a>
                      <a href={CMG_BRANDING.socialMedia.twitter} target="_blank" rel="noopener noreferrer" style={{ color: '#1da1f2' }}>
                        <svg width="24" height="24" fill="currentColor" viewBox="0 0 24 24"><path d="M24 4.557c-.883.392-1.832.656-2.828.775 1.017-.609 1.798-1.574 2.165-2.724-.951.564-2.005.974-3.127 1.195-.897-.957-2.178-1.555-3.594-1.555-3.179 0-5.515 2.966-4.797 6.045-4.091-.205-7.719-2.165-10.148-5.144-1.29 2.213-.669 5.108 1.523 6.574-.806-.026-1.566-.247-2.229-.616-.054 2.281 1.581 4.415 3.949 4.89-.693.188-1.452.232-2.224.084.626 1.956 2.444 3.379 4.6 3.419-2.07 1.623-4.678 2.348-7.29 2.04 2.179 1.397 4.768 2.212 7.548 2.212 9.142 0 14.307-7.721 13.995-14.646.962-.695 1.797-1.562 2.457-2.549z"/></svg>
                      </a>
                      <a href={CMG_BRANDING.socialMedia.instagram} target="_blank" rel="noopener noreferrer" style={{ color: '#e4405f' }}>
                        <svg width="24" height="24" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/></svg>
                      </a>
                    </div>

                    <div style={{ borderTop: '1px solid #e2e8f0', paddingTop: '1rem', textAlign: 'center', fontSize: '0.75rem', color: '#999' }}>
                      <p style={{ margin: '0.25rem 0' }}>{CMG_BRANDING.legal.nmls} | {CMG_BRANDING.legal.equalHousing}</p>
                      <p style={{ margin: '0.25rem 0' }}>{CMG_BRANDING.legal.licensing}</p>
                      <p style={{ margin: '0.5rem 0 0 0' }}>This proposal was generated using professional loan analysis software.</p>
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div className="download-actions">
              <button
                className="btn-primary btn-large"
                onClick={handleGeneratePDF}
                disabled={isGeneratingPDF}
              >
                {isGeneratingPDF ? (
                  <>
                    <div className="spinner-small"></div>
                    Generating PDF...
                  </>
                ) : (
                  <>
                    <svg className="btn-icon" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    Download PDF Proposal
                  </>
                )}
              </button>
            </div>
          </div>
        )}

        {/* Wizard Navigation Buttons */}
        <div className="wizard-actions">
          <button className="btn-secondary" onClick={currentStep === 1 ? onBack : handlePreviousStep}>
            <svg className="btn-icon" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            {currentStep === 1 ? 'Back to Results' : 'Previous Step'}
          </button>
          {currentStep < 4 && (
            <button
              className="btn-primary"
              onClick={handleNextStep}
              disabled={!canProceedToNextStep()}
            >
              Next Step
              <svg className="btn-icon" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </button>
          )}
        </div>
      </div>

      {/* Hidden PDF Content */}
      <div ref={pdfContentRef} className="pdf-content" style={{ position: 'absolute', left: '-9999px', width: '8.5in' }}>
        <div style={{ padding: '0.75in', fontFamily: 'Arial, sans-serif', color: '#333' }}>
          {/* CMG Header */}
          <div style={{ textAlign: 'center', marginBottom: '2rem', borderBottom: '3px solid #9bc53d', paddingBottom: '1rem' }}>
            <img src={CMG_BRANDING.logo.url} alt={CMG_BRANDING.logo.alt} style={{ maxWidth: '180px', marginBottom: '1rem' }} />
            <h1 style={{ margin: 0, fontSize: '2rem', color: '#2d3748' }}>All-In-One Loan Proposal</h1>
            {clientName && <h2 style={{ margin: '0.5rem 0 0 0', fontSize: '1.5rem', color: '#718096', fontWeight: 'normal' }}>Prepared for {clientName}</h2>}
            <p style={{ margin: '0.25rem 0 0 0', fontSize: '0.9rem', color: '#a0aec0' }}>{new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</p>
          </div>

          {/* AI Pitch */}
          {aiPitch && (
            <div style={{ marginBottom: '2rem', padding: '1.5rem', background: '#f0f9ff', border: '2px solid #9bc53d', borderRadius: '8px' }}>
              <h3 style={{ margin: '0 0 1rem 0', color: '#2d3748', fontSize: '1.25rem' }}>Why the All-In-One Loan is Right for You</h3>
              <div style={{ whiteSpace: 'pre-wrap', lineHeight: '1.6', fontSize: '0.95rem' }}>{aiPitch}</div>
            </div>
          )}

          {/* Savings Highlight */}
          {components.find((c) => c.id === 'savings-highlight')?.enabled && (
            <div style={{ marginBottom: '2rem', padding: '2rem', background: 'linear-gradient(135deg, #9bc53d 0%, #8ab62f 100%)', borderRadius: '12px', color: 'white', textAlign: 'center' }}>
              <div style={{ fontSize: '1rem', fontWeight: 600, opacity: 0.9, marginBottom: '0.5rem', textTransform: 'uppercase' }}>Total Interest Savings</div>
              <div style={{ fontSize: '3rem', fontWeight: 700 }}>{formatCurrency(simulation.comparison.interestSavings)}</div>
              <div style={{ display: 'flex', justifyContent: 'center', gap: '3rem', marginTop: '1.5rem' }}>
                <div>
                  <div style={{ fontSize: '0.85rem', opacity: 0.9 }}>Time Saved</div>
                  <div style={{ fontSize: '1.4rem', fontWeight: 700 }}>{yearsMonthsFromMonths(simulation.comparison.timeSavedMonths)}</div>
                </div>
                <div style={{ borderLeft: '2px solid rgba(255,255,255,0.3)', paddingLeft: '3rem' }}>
                  <div style={{ fontSize: '0.85rem', opacity: 0.9 }}>Interest Reduction</div>
                  <div style={{ fontSize: '1.4rem', fontWeight: 700 }}>{simulation.comparison.percentageSavings.toFixed(1)}%</div>
                </div>
              </div>
            </div>
          )}

          {/* Comparison Cards */}
          {components.find((c) => c.id === 'comparison-cards')?.enabled && (
            <div style={{ marginBottom: '2rem' }}>
              <h3 style={{ fontSize: '1.5rem', marginBottom: '1.5rem', textAlign: 'center', color: '#2d3748' }}>Side-by-Side Comparison</h3>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ background: '#f7fafc' }}>
                    <th style={{ padding: '1rem', border: '2px solid #e2e8f0', textAlign: 'left' }}>Metric</th>
                    <th style={{ padding: '1rem', border: '2px solid #e2e8f0', textAlign: 'left' }}>Traditional Mortgage</th>
                    <th style={{ padding: '1rem', border: '2px solid #e2e8f0', textAlign: 'left', background: '#f0f9ff' }}>All-In-One Loan</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td style={{ padding: '0.75rem', border: '1px solid #e2e8f0', fontWeight: 600 }}>Monthly Payment</td>
                    <td style={{ padding: '0.75rem', border: '1px solid #e2e8f0' }}>{formatCurrency(simulation.traditionalLoanLoan.monthlyPayment)}</td>
                    <td style={{ padding: '0.75rem', border: '1px solid #e2e8f0' }}>{formatCurrency(simulation.allInOneLoanLoan.monthlyPayment)}</td>
                  </tr>
                  <tr>
                    <td style={{ padding: '0.75rem', border: '1px solid #e2e8f0', fontWeight: 600 }}>Total Interest Paid</td>
                    <td style={{ padding: '0.75rem', border: '1px solid #e2e8f0' }}>{formatCurrency(simulation.traditionalLoanLoan.totalInterestPaid)}</td>
                    <td style={{ padding: '0.75rem', border: '1px solid #e2e8f0', background: '#f0f8e9', color: '#48bb78', fontWeight: 700 }}>{formatCurrency(simulation.allInOneLoanLoan.totalInterestPaid)}</td>
                  </tr>
                  <tr>
                    <td style={{ padding: '0.75rem', border: '1px solid #e2e8f0', fontWeight: 600 }}>Payoff Timeline</td>
                    <td style={{ padding: '0.75rem', border: '1px solid #e2e8f0' }}>{yearsMonthsFromMonths(simulation.traditionalLoanLoan.payoffMonths)}</td>
                    <td style={{ padding: '0.75rem', border: '1px solid #e2e8f0', background: '#f0f8e9', color: '#48bb78', fontWeight: 700 }}>{yearsMonthsFromMonths(simulation.allInOneLoanLoan.payoffMonths)}</td>
                  </tr>
                  <tr>
                    <td style={{ padding: '0.75rem', border: '1px solid #e2e8f0', fontWeight: 600 }}>Payoff Date</td>
                    <td style={{ padding: '0.75rem', border: '1px solid #e2e8f0' }}>{new Date(simulation.traditionalLoanLoan.payoffDate).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}</td>
                    <td style={{ padding: '0.75rem', border: '1px solid #e2e8f0', background: '#f0f8e9', color: '#48bb78', fontWeight: 700 }}>{new Date(simulation.allInOneLoanLoan.payoffDate).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          )}

          {/* How It Works */}
          {components.find((c) => c.id === 'how-it-works')?.enabled && (
            <div style={{ marginBottom: '2rem' }}>
              <h3 style={{ fontSize: '1.5rem', marginBottom: '1.5rem', textAlign: 'center', color: '#2d3748' }}>How the All-In-One Loan Works</h3>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
                <div style={{ padding: '1.5rem', border: '2px solid #e2e8f0', borderRadius: '8px' }}>
                  <h4 style={{ margin: '0 0 0.75rem 0', color: '#2d3748' }}>💰 Cash Flow Offset</h4>
                  <p style={{ margin: 0, fontSize: '0.9rem', lineHeight: '1.6' }}>Your positive cash flow sits in the loan account, reducing the balance used for interest calculations. This creates massive savings over time.</p>
                </div>
                <div style={{ padding: '1.5rem', border: '2px solid #e2e8f0', borderRadius: '8px' }}>
                  <h4 style={{ margin: '0 0 0.75rem 0', color: '#2d3748' }}>📈 Accelerated Payoff</h4>
                  <p style={{ margin: 0, fontSize: '0.9rem', lineHeight: '1.6' }}>Every dollar that stays in your account works to reduce interest. You'll pay off your mortgage {yearsMonthsFromMonths(simulation.comparison.timeSavedMonths)} faster.</p>
                </div>
              </div>
            </div>
          )}

          {/* Cash Flow Analysis */}
          {components.find((c) => c.id === 'cash-flow-details')?.enabled && (
            <div style={{ marginBottom: '2rem' }}>
              <h3 style={{ fontSize: '1.5rem', marginBottom: '1.5rem', textAlign: 'center', color: '#2d3748' }}>Cash Flow Analysis</h3>
              <table style={{ width: '100%', borderCollapse: 'collapse', marginTop: '1rem' }}>
                <thead>
                  <tr>
                    <th style={{ background: '#f8fafc', padding: '0.75rem 1rem', textAlign: 'left', fontWeight: 600, color: '#334155', border: '2px solid #e2e8f0' }}>Item</th>
                    <th style={{ background: '#f8fafc', padding: '0.75rem 1rem', textAlign: 'right', fontWeight: 600, color: '#334155', border: '2px solid #e2e8f0' }}>Amount</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td style={{ padding: '0.75rem 1rem', border: '1px solid #e2e8f0', color: '#475569' }}>Monthly Income</td>
                    <td style={{ padding: '0.75rem 1rem', border: '1px solid #e2e8f0', color: '#475569', textAlign: 'right' }}>{formatCurrency(cashFlow?.totalIncome || 0)}</td>
                  </tr>
                  <tr>
                    <td style={{ padding: '0.75rem 1rem', border: '1px solid #e2e8f0', color: '#475569' }}>Monthly Expenses</td>
                    <td style={{ padding: '0.75rem 1rem', border: '1px solid #e2e8f0', color: '#475569', textAlign: 'right' }}>{formatCurrency(cashFlow?.totalExpenses || 0)}</td>
                  </tr>
                  <tr style={{ background: '#f0f8e9' }}>
                    <td style={{ padding: '0.75rem 1rem', border: '1px solid #e2e8f0', color: '#16a34a', fontWeight: 600 }}><strong>Net Monthly Cash Flow</strong></td>
                    <td style={{ padding: '0.75rem 1rem', border: '1px solid #e2e8f0', color: '#16a34a', fontWeight: 600, textAlign: 'right' }}><strong>{formatCurrency(cashFlow?.netCashFlow || 0)}</strong></td>
                  </tr>
                </tbody>
              </table>
            </div>
          )}

          {/* Payoff Timeline Chart */}
          {components.find((c) => c.id === 'amortization-chart')?.enabled && (
            <div style={{ marginBottom: '2rem' }}>
              <h3 style={{ fontSize: '1.5rem', marginBottom: '1.5rem', textAlign: 'center', color: '#2d3748' }}>Payoff Timeline Comparison</h3>
              <div style={{ background: '#f7fafc', padding: '2rem', borderRadius: '12px', textAlign: 'center' }}>
                <p style={{ marginBottom: '1rem', color: '#64748b', fontSize: '0.95rem' }}>Visual timeline showing accelerated payoff with All-In-One loan</p>
                <div style={{ display: 'flex', gap: '2rem', justifyContent: 'center', alignItems: 'flex-end', marginTop: '1.5rem' }}>
                  <div style={{ flex: '0 0 180px' }}>
                    <div style={{
                      height: '200px',
                      background: '#3b82f6',
                      borderRadius: '8px 8px 0 0',
                      marginBottom: '0.75rem',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: 'white',
                      fontWeight: 700,
                      fontSize: '1.1rem'
                    }}>
                      {yearsMonthsFromMonths(simulation.traditionalLoan.payoffMonths)}
                    </div>
                    <div style={{ fontWeight: 600, color: '#475569', fontSize: '1rem' }}>Traditional Mortgage</div>
                  </div>
                  <div style={{ flex: '0 0 180px' }}>
                    <div style={{
                      height: `${(simulation.allInOneLoan.payoffMonths / simulation.traditionalLoan.payoffMonths) * 200}px`,
                      background: '#9bc53d',
                      borderRadius: '8px 8px 0 0',
                      marginBottom: '0.75rem',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: 'white',
                      fontWeight: 700,
                      fontSize: '1.1rem'
                    }}>
                      {yearsMonthsFromMonths(simulation.allInOneLoan.payoffMonths)}
                    </div>
                    <div style={{ fontWeight: 600, color: '#475569', fontSize: '1rem' }}>All-In-One Loan</div>
                  </div>
                </div>
                <p style={{ marginTop: '1.5rem', color: '#16a34a', fontWeight: 600, fontSize: '1.2rem' }}>
                  🎉 Pay off your mortgage {yearsMonthsFromMonths(simulation.comparison.timeSavedMonths)} faster!
                </p>
              </div>
            </div>
          )}

          {/* CMG Financial Footer */}
          {includeFooter && (
            <div style={{ marginTop: '3rem', paddingTop: '1.5rem', borderTop: '2px solid #e2e8f0', textAlign: 'center' }}>
              {/* CMG Logo */}
              <div style={{ marginBottom: '1rem' }}>
                <img src={CMG_BRANDING.logo.url} alt={CMG_BRANDING.logo.alt} style={{ maxWidth: '140px', marginBottom: '0.75rem' }} />
                <p style={{ fontWeight: 600, fontSize: '1rem', marginBottom: '0.25rem', color: '#333', margin: '0.25rem 0' }}>
                  {CMG_BRANDING.company.name}
                </p>
                <p style={{ fontSize: '0.85rem', color: '#666', margin: '0.25rem 0' }}>
                  {CMG_BRANDING.company.tagline}
                </p>
              </div>

              {/* Company Info */}
              <div style={{ marginBottom: '1rem' }}>
                <p style={{ margin: '0.25rem 0', fontSize: '0.85rem', color: '#666' }}>
                  {CMG_BRANDING.company.address}
                </p>
                <p style={{ margin: '0.25rem 0', fontSize: '0.85rem', color: '#666' }}>
                  Phone: {CMG_BRANDING.company.phone}
                </p>
                <p style={{ margin: '0.25rem 0', fontSize: '0.85rem', color: '#666' }}>
                  Website: {CMG_BRANDING.company.website}
                </p>
              </div>

              {/* Legal Disclaimers */}
              <div style={{ borderTop: '1px solid #e2e8f0', paddingTop: '1rem', fontSize: '0.75rem', color: '#999' }}>
                <p style={{ margin: '0.25rem 0' }}>{CMG_BRANDING.legal.nmls} | {CMG_BRANDING.legal.equalHousing}</p>
                <p style={{ margin: '0.25rem 0' }}>{CMG_BRANDING.legal.licensing}</p>
                <p style={{ margin: '0.25rem 0' }}>This proposal was generated using professional loan analysis software.</p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Pitch Options Modal */}
      <PitchOptionsModal
        isOpen={showPitchOptions}
        onClose={() => setShowPitchOptions(false)}
        onApply={handleApplyPitchOptions}
        currentOptions={pitchOptions}
      />
    </div>
  );
}
