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
                Preview
              </div>
              <div className="pitch-content">{aiPitch}</div>
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

          <div className="savings-summary">
            <div className="summary-item">
              <span>Interest Savings:</span>
              <strong>{formatCurrency(simulation.comparison.interestSavings)}</strong>
            </div>
            <div className="summary-item">
              <span>Time Saved:</span>
              <strong>{yearsMonthsFromMonths(simulation.comparison.timeSavedMonths)}</strong>
            </div>
          </div>

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
                {/* Header */}
                <div className="preview-header">
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
                          <td>{formatCurrency(simulation.traditionalLoan.monthlyPayment)}</td>
                          <td>{formatCurrency(simulation.allInOneLoan.monthlyPayment)}</td>
                        </tr>
                        <tr>
                          <td>Total Interest</td>
                          <td>{formatCurrency(simulation.traditionalLoan.totalInterestPaid)}</td>
                          <td className="savings-cell">{formatCurrency(simulation.allInOneLoan.totalInterestPaid)}</td>
                        </tr>
                        <tr>
                          <td>Payoff Timeline</td>
                          <td>{yearsMonthsFromMonths(simulation.traditionalLoan.payoffMonths)}</td>
                          <td className="savings-cell">{yearsMonthsFromMonths(simulation.allInOneLoan.payoffMonths)}</td>
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

                {/* Footer */}
                {includeFooter && (
                  <div className="preview-footer">
                    <p>This proposal was generated using professional loan analysis software.</p>
                    <p>For questions or to proceed, please contact your loan officer.</p>
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
          {/* Header */}
          <div style={{ textAlign: 'center', marginBottom: '2rem', borderBottom: '3px solid #9bc53d', paddingBottom: '1rem' }}>
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
                    <td style={{ padding: '0.75rem', border: '1px solid #e2e8f0' }}>{formatCurrency(simulation.traditionalLoan.monthlyPayment)}</td>
                    <td style={{ padding: '0.75rem', border: '1px solid #e2e8f0' }}>{formatCurrency(simulation.allInOneLoan.monthlyPayment)}</td>
                  </tr>
                  <tr>
                    <td style={{ padding: '0.75rem', border: '1px solid #e2e8f0', fontWeight: 600 }}>Total Interest Paid</td>
                    <td style={{ padding: '0.75rem', border: '1px solid #e2e8f0' }}>{formatCurrency(simulation.traditionalLoan.totalInterestPaid)}</td>
                    <td style={{ padding: '0.75rem', border: '1px solid #e2e8f0', background: '#f0f8e9', color: '#48bb78', fontWeight: 700 }}>{formatCurrency(simulation.allInOneLoan.totalInterestPaid)}</td>
                  </tr>
                  <tr>
                    <td style={{ padding: '0.75rem', border: '1px solid #e2e8f0', fontWeight: 600 }}>Payoff Timeline</td>
                    <td style={{ padding: '0.75rem', border: '1px solid #e2e8f0' }}>{yearsMonthsFromMonths(simulation.traditionalLoan.payoffMonths)}</td>
                    <td style={{ padding: '0.75rem', border: '1px solid #e2e8f0', background: '#f0f8e9', color: '#48bb78', fontWeight: 700 }}>{yearsMonthsFromMonths(simulation.allInOneLoan.payoffMonths)}</td>
                  </tr>
                  <tr>
                    <td style={{ padding: '0.75rem', border: '1px solid #e2e8f0', fontWeight: 600 }}>Payoff Date</td>
                    <td style={{ padding: '0.75rem', border: '1px solid #e2e8f0' }}>{new Date(simulation.traditionalLoan.payoffDate).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}</td>
                    <td style={{ padding: '0.75rem', border: '1px solid #e2e8f0', background: '#f0f8e9', color: '#48bb78', fontWeight: 700 }}>{new Date(simulation.allInOneLoan.payoffDate).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}</td>
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

          {/* Footer */}
          {includeFooter && (
            <div style={{ marginTop: '3rem', paddingTop: '1.5rem', borderTop: '2px solid #e2e8f0', textAlign: 'center', fontSize: '0.85rem', color: '#718096' }}>
              <p style={{ margin: 0 }}>This proposal was generated using professional loan analysis software.</p>
              <p style={{ margin: '0.5rem 0 0 0' }}>For questions or to proceed, please contact your loan officer.</p>
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
