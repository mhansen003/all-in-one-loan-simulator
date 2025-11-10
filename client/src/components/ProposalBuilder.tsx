import { useState, useEffect } from 'react';
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
import type { SimulationResult, MortgageDetails, CashFlowAnalysis } from '../types';
import PitchOptionsModal, { PitchOptions } from './PitchOptionsModal';
import { savePitchSettings, loadPitchSettings, getDefaultPitchOptions } from '../utils/userSettings';
import { CMG_BRANDING } from '../constants/cmgBranding';
import html2pdf from 'html2pdf.js';
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
function SortableItem({ id, component, onToggle, onPreview }: {
  id: string;
  component: ProposalComponent;
  onToggle: (id: string) => void;
  onPreview?: (id: string) => void;
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
        <button
          className="btn-icon-only"
          onClick={(e) => {
            e.stopPropagation();
            onPreview?.(id);
          }}
          title="Preview this component"
          style={{
            marginLeft: 'auto',
            padding: '0.5rem',
            background: '#f1f5f9',
            border: '1px solid #cbd5e1',
            borderRadius: '6px',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            transition: 'all 0.2s'
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = '#e2e8f0';
            e.currentTarget.style.borderColor = '#94a3b8';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = '#f1f5f9';
            e.currentTarget.style.borderColor = '#cbd5e1';
          }}
        >
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" style={{ width: '18px', height: '18px' }}>
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
          </svg>
        </button>
      </div>
    </div>
  );
}

type WizardStep = 1 | 2 | 3 | 4 | 5;

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

  // Loan Officer Email for signature lookup
  const [loanOfficerEmail, setLoanOfficerEmail] = useState('');
  const [signatureFound, setSignatureFound] = useState(false);
  const [isEditingSignature, setIsEditingSignature] = useState(false);

  // AI Pitch state
  const [aiPitch, setAiPitch] = useState('');
  const [isGeneratingPitch, setIsGeneratingPitch] = useState(false);
  const [showPitchOptions, setShowPitchOptions] = useState(false);
  const [isEditingPitch, setIsEditingPitch] = useState(false);
  const [editedPitch, setEditedPitch] = useState('');
  const [pitchOptions, setPitchOptions] = useState<PitchOptions>(getDefaultPitchOptions());

  // Component preview state
  const [showComponentPreview, setShowComponentPreview] = useState(false);
  const [previewComponentId, setPreviewComponentId] = useState<string | null>(null);

  // Email signature state - Enhanced with all CMG fields
  const [signatureName, setSignatureName] = useState('');
  const [signatureTitle, setSignatureTitle] = useState('');
  const [signatureEmail, setSignatureEmail] = useState('');
  const [signaturePhone, setSignaturePhone] = useState('');
  const [signatureCompany, setSignatureCompany] = useState('CMG Financial');
  const [signatureNMLS, setSignatureNMLS] = useState('');
  const [signatureWebsite, setSignatureWebsite] = useState('');
  const [signatureAddress, setSignatureAddress] = useState('');
  const [signatureTagline, setSignatureTagline] = useState('HOME LOANS SIMPLIFIED');
  const [signaturePhotoURL, setSignaturePhotoURL] = useState('');
  const [signatureLinkedIn, setSignatureLinkedIn] = useState('');
  const [signatureFacebook, setSignatureFacebook] = useState('');
  const [signatureTwitter, setSignatureTwitter] = useState('');
  const [signatureInstagram, setSignatureInstagram] = useState('');

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

  // Signature storage/lookup functions
  const loadSignatureFromStorage = (email: string): boolean => {
    try {
      const storageKey = `cmg_signature_${email.toLowerCase().trim()}`;
      const savedSignature = localStorage.getItem(storageKey);

      if (savedSignature) {
        const signature = JSON.parse(savedSignature);
        setSignatureName(signature.name || '');
        setSignatureTitle(signature.title || '');
        setSignatureEmail(signature.email || '');
        setSignaturePhone(signature.phone || '');
        setSignatureCompany(signature.company || 'CMG Financial');
        setSignatureNMLS(signature.nmls || '');
        setSignatureWebsite(signature.website || '');
        setSignatureAddress(signature.address || '');
        setSignatureTagline(signature.tagline || 'HOME LOANS SIMPLIFIED');
        setSignaturePhotoURL(signature.photoURL || '');
        setSignatureLinkedIn(signature.linkedIn || '');
        setSignatureFacebook(signature.facebook || '');
        setSignatureTwitter(signature.twitter || '');
        setSignatureInstagram(signature.instagram || '');
        setSignatureFound(true);
        return true;
      }
      return false;
    } catch (error) {
      console.error('Error loading signature:', error);
      return false;
    }
  };

  const saveSignatureToStorage = (email: string) => {
    try {
      const storageKey = `cmg_signature_${email.toLowerCase().trim()}`;
      const signature = {
        name: signatureName,
        title: signatureTitle,
        email: signatureEmail,
        phone: signaturePhone,
        company: signatureCompany,
        nmls: signatureNMLS,
        website: signatureWebsite,
        address: signatureAddress,
        tagline: signatureTagline,
        photoURL: signaturePhotoURL,
        linkedIn: signatureLinkedIn,
        facebook: signatureFacebook,
        twitter: signatureTwitter,
        instagram: signatureInstagram,
        savedAt: new Date().toISOString()
      };
      localStorage.setItem(storageKey, JSON.stringify(signature));
      console.log('✅ Signature saved for', email);
    } catch (error) {
      console.error('Error saving signature:', error);
    }
  };

  // Load user's saved pitch settings when email is entered
  useEffect(() => {
    if (loanOfficerEmail && loanOfficerEmail.includes('@')) {
      const savedSettings = loadPitchSettings(loanOfficerEmail);
      if (savedSettings) {
        setPitchOptions(savedSettings);
        console.log('✓ Loaded saved pitch preferences for', loanOfficerEmail);
      }
    }
  }, [loanOfficerEmail]);

  const handleLoanOfficerEmailChange = (email: string) => {
    setLoanOfficerEmail(email);
    setSignatureFound(false);

    // Try to load signature if email looks valid
    if (email.includes('@') && email.includes('.')) {
      const found = loadSignatureFromStorage(email);
      if (found) {
        console.log('✅ Signature found and loaded for', email);
      }
    }
  };

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

  const handlePreviewComponent = (id: string) => {
    setPreviewComponentId(id);
    setShowComponentPreview(true);
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

    // Save settings to user profile
    if (loanOfficerEmail) {
      savePitchSettings(loanOfficerEmail, options);
    }

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
    { number: 4, title: 'Email Signature', description: 'Add your signature' },
    { number: 5, title: 'Preview & Download', description: 'Review and generate PDF' },
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
        return true; // Email signature is optional
      case 5:
        return true;
      default:
        return false;
    }
  };

  const handleNextStep = () => {
    if (canProceedToNextStep() && currentStep < 5) {
      // Save signature when leaving step 4 if loan officer email is provided
      if (currentStep === 4 && loanOfficerEmail && signatureName) {
        saveSignatureToStorage(loanOfficerEmail);
      }
      setCurrentStep((currentStep + 1) as WizardStep);
    }
  };

  const handlePreviousStep = () => {
    if (currentStep > 1) {
      setCurrentStep((currentStep - 1) as WizardStep);
    }
  };

  const handleGeneratePDF = () => {
    const element = document.getElementById('proposal-content');
    if (!element) {
      console.error('Proposal content element not found');
      return;
    }

    // Store original styles to restore after PDF generation
    const originalMaxHeight = element.style.maxHeight;
    const originalOverflow = element.style.overflow;
    const originalHeight = element.style.height;

    // Temporarily remove height constraints to capture full content
    element.style.maxHeight = 'none';
    element.style.overflow = 'visible';
    element.style.height = 'auto';

    const options = {
      margin: [0.75, 0.5, 0.75, 0.5] as [number, number, number, number], // [top, left, bottom, right] in inches
      filename: `${clientName ? clientName.replace(/[^a-zA-Z0-9]/g, '_') + '_' : ''}AIO_Proposal_${new Date().toISOString().split('T')[0]}.pdf`,
      image: { type: 'jpeg' as const, quality: 0.98 },
      html2canvas: {
        scale: 2,
        useCORS: true,
        logging: false,
        scrollY: 0,
        scrollX: 0,
        windowHeight: element.scrollHeight,
        height: element.scrollHeight,
        letterRendering: true,
        allowTaint: true,
        backgroundColor: '#ffffff'
      },
      jsPDF: {
        unit: 'in' as const,
        format: 'letter' as const,
        orientation: 'portrait' as const,
        compress: true
      },
      pagebreak: {
        mode: ['avoid-all', 'css', 'legacy'] as any,
        before: '.page-break-before',
        after: '.page-break-after',
        avoid: ['.preview-section', '.preview-header', '.savings-section', '.pitch-section', 'table', 'tr', 'img']
      }
    };

    // Wait 500ms for DOM to fully reflow and render expanded content before capturing
    setTimeout(() => {
      // Generate PDF and restore original styles after completion
      html2pdf().set(options).from(element).save().then(() => {
        element.style.maxHeight = originalMaxHeight;
        element.style.overflow = originalOverflow;
        element.style.height = originalHeight;
      }).catch((error: Error) => {
        console.error('PDF generation failed:', error);
        // Restore styles even on error
        element.style.maxHeight = originalMaxHeight;
        element.style.overflow = originalOverflow;
        element.style.height = originalHeight;
      });
    }, 500);
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
    <div className="proposal-builder-layout">
      {/* Left Sidebar Navigation */}
      <aside className="sidebar-nav">
        <div className="sidebar-header">
          <div className="sidebar-icon">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          </div>
          <h2>Proposal Builder</h2>
          <p>Build your client proposal</p>
        </div>

        <nav className="sidebar-steps">
          {steps.map((step) => (
            <button
              key={step.number}
              onClick={() => setCurrentStep(step.number as WizardStep)}
              className={`sidebar-step ${currentStep === step.number ? 'active' : ''} ${currentStep > step.number ? 'completed' : ''}`}
              disabled={!canProceedToNextStep() && step.number > currentStep}
            >
              <div className="step-indicator">
                {currentStep > step.number ? (
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                ) : (
                  <span>{step.number}</span>
                )}
              </div>
              <div className="step-content">
                <div className="step-title">{step.title}</div>
                <div className="step-description">{step.description}</div>
              </div>
            </button>
          ))}
        </nav>

        <button
          className="btn-back"
          onClick={onBack}
          style={{
            marginTop: 'auto',
            width: '100%',
            padding: '0.75rem',
            background: '#f1f5f9',
            border: '1px solid #cbd5e1',
            borderRadius: '8px',
            color: '#475569',
            fontWeight: '600',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '0.5rem',
            transition: 'all 0.2s'
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = '#e2e8f0';
            e.currentTarget.style.borderColor = '#94a3b8';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = '#f1f5f9';
            e.currentTarget.style.borderColor = '#cbd5e1';
          }}
        >
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" style={{ width: '18px', height: '18px' }}>
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
          </svg>
          Back to Results
        </button>
      </aside>

      {/* Main Content Area */}
      <main className="main-content">
        <div className="proposal-content">
        {/* Step 1: Client Information & Loan Officer Email */}
        {currentStep === 1 && (
          <div className="section-card">
            <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
              <div style={{
                width: '80px',
                height: '80px',
                margin: '0 auto 1.5rem',
                background: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)',
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: '0 8px 20px rgba(59, 130, 246, 0.3)'
              }}>
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="white" style={{ width: '40px', height: '40px' }}>
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
              </div>
              <h2 style={{ fontSize: '2rem', marginBottom: '0.5rem', color: '#1e293b' }}>Let's Get Started</h2>
              <p className="section-description" style={{ fontSize: '1.1rem' }}>First, enter your email to look up your signature</p>
            </div>

            <div style={{ maxWidth: '600px', margin: '0 auto' }}>
              {/* Loan Officer Email - First */}
              <div className="form-group" style={{ marginBottom: '2rem' }}>
                <label htmlFor="loanOfficerEmail" style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  marginBottom: '0.75rem',
                  fontSize: '1rem',
                  fontWeight: '600',
                  color: '#334155'
                }}>
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" style={{ width: '20px', height: '20px', color: '#8b5cf6' }}>
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                  </svg>
                  Your Email (Loan Officer)
                </label>
                <input
                  id="loanOfficerEmail"
                  type="email"
                  className="form-input"
                  placeholder="your.email@cmgfi.com"
                  value={loanOfficerEmail}
                  onChange={(e) => handleLoanOfficerEmailChange(e.target.value)}
                  style={{
                    fontSize: '1.1rem',
                    padding: '1rem',
                    border: signatureFound ? '2px solid #10b981' : '2px solid #e2e8f0',
                    transition: 'all 0.2s'
                  }}
                />
                {signatureFound && (
                  <div style={{
                    marginTop: '0.5rem',
                    padding: '0.75rem',
                    background: '#f0fdf4',
                    border: '1px solid #86efac',
                    borderRadius: '6px',
                    color: '#15803d',
                    fontSize: '0.9rem',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem'
                  }}>
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" style={{ width: '18px', height: '18px' }}>
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    ✅ Signature found! Your details have been pre-filled.
                  </div>
                )}
                {!signatureFound && loanOfficerEmail.includes('@') && (
                  <div style={{ marginTop: '0.5rem', color: '#64748b', fontSize: '0.9rem' }}>
                    💡 No saved signature found. You'll build one in Step 4, and we'll save it for next time.
                  </div>
                )}
              </div>

              <div style={{
                margin: '2rem 0',
                height: '1px',
                background: 'linear-gradient(to right, transparent, #e2e8f0, transparent)'
              }} />

              <p style={{
                textAlign: 'center',
                color: '#64748b',
                fontSize: '1rem',
                marginBottom: '1.5rem'
              }}>
                Now, tell us who this proposal is for
              </p>

              {/* Client Name */}
              <div className="form-group" style={{ marginBottom: '1.5rem' }}>
                <label htmlFor="clientName" style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  marginBottom: '0.75rem',
                  fontSize: '1rem',
                  fontWeight: '600',
                  color: '#334155'
                }}>
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" style={{ width: '20px', height: '20px', color: '#3b82f6' }}>
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                  Client Name *
                </label>
                <input
                  id="clientName"
                  type="text"
                  className="form-input"
                  placeholder="John Smith"
                  value={clientName}
                  onChange={(e) => setClientName(e.target.value)}
                  style={{
                    fontSize: '1.1rem',
                    padding: '1rem',
                    border: clientName.trim() ? '2px solid #10b981' : '2px solid #e2e8f0',
                    transition: 'all 0.2s'
                  }}
                />
                {clientName.trim() && (
                  <div style={{
                    marginTop: '0.5rem',
                    color: '#10b981',
                    fontSize: '0.9rem',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem'
                  }}>
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" style={{ width: '16px', height: '16px' }}>
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    Looks good!
                  </div>
                )}
              </div>

              {/* Client Email */}
              <div className="form-group" style={{ marginBottom: '1.5rem' }}>
                <label htmlFor="clientEmail" style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  marginBottom: '0.75rem',
                  fontSize: '1rem',
                  fontWeight: '600',
                  color: '#334155'
                }}>
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" style={{ width: '20px', height: '20px', color: '#3b82f6' }}>
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                  </svg>
                  Client Email
                  <span style={{ fontSize: '0.85rem', fontWeight: '400', color: '#94a3b8' }}>(optional)</span>
                </label>
                <input
                  id="clientEmail"
                  type="email"
                  className="form-input"
                  placeholder="john.smith@example.com"
                  value={clientEmail}
                  onChange={(e) => setClientEmail(e.target.value)}
                  style={{
                    fontSize: '1.1rem',
                    padding: '1rem',
                    border: '2px solid #e2e8f0',
                    transition: 'all 0.2s'
                  }}
                />
              </div>

              {!clientName.trim() && (
                <div style={{
                  marginTop: '2rem',
                  padding: '1rem',
                  background: '#fef3c7',
                  border: '2px solid #fbbf24',
                  borderRadius: '8px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.75rem',
                  color: '#92400e'
                }}>
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" style={{ width: '24px', height: '24px', flexShrink: 0 }}>
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                  <span>Please enter a client name to continue</span>
                </div>
              )}
            </div>
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
                    onPreview={handlePreviewComponent}
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

        {/* Step 4: Email Signature */}
        {currentStep === 4 && (
          <div className="section-card">
            <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
              <div style={{
                width: '80px',
                height: '80px',
                margin: '0 auto 1.5rem',
                background: 'linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%)',
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: '0 8px 20px rgba(139, 92, 246, 0.3)'
              }}>
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="white" style={{ width: '40px', height: '40px' }}>
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                </svg>
              </div>
              <h2 style={{ fontSize: '2rem', marginBottom: '0.5rem', color: '#1e293b' }}>Add Your Signature</h2>
              <p className="section-description" style={{ fontSize: '1.1rem' }}>Customize your professional email signature</p>
            </div>

            <div style={{ maxWidth: '800px', margin: '0 auto' }}>
              {/* Show signature preview only (with edit button) if signature exists and user is not editing */}
              {signatureFound && !isEditingSignature && (signatureName || signatureTitle || signatureEmail || signaturePhone) ? (
                <div>
                  <div style={{
                    marginBottom: '1.5rem',
                    padding: '1rem',
                    background: '#f0fdf4',
                    border: '2px solid #86efac',
                    borderRadius: '8px',
                    color: '#15803d',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: '0.75rem'
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" style={{ width: '24px', height: '24px' }}>
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      <span><strong>Signature loaded!</strong> Your saved signature is ready to use.</span>
                    </div>
                    <button
                      onClick={() => setIsEditingSignature(true)}
                      style={{
                        padding: '0.5rem 1rem',
                        background: 'white',
                        border: '2px solid #10b981',
                        borderRadius: '6px',
                        color: '#059669',
                        fontWeight: '600',
                        cursor: 'pointer',
                        fontSize: '0.9rem',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.5rem',
                        transition: 'all 0.2s'
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.background = '#059669';
                        e.currentTarget.style.color = 'white';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.background = 'white';
                        e.currentTarget.style.color = '#059669';
                      }}
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" style={{ width: '16px', height: '16px' }}>
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                      </svg>
                      Edit Signature
                    </button>
                  </div>

                  {/* Signature Preview */}
                  <div style={{
                    padding: '2rem',
                    background: 'linear-gradient(135deg, #ffffff 0%, #f0f9e8 100%)',
                    border: '3px solid #9bc53d',
                    borderRadius: '12px',
                    boxShadow: '0 6px 16px rgba(155, 197, 61, 0.2)'
                  }}>
                    <h3 style={{ margin: '0 0 1.5rem 0', fontSize: '1.2rem', color: '#2d3748', fontWeight: '700', textAlign: 'center' }}>Your Professional Signature</h3>
                    <div style={{
                      fontFamily: 'Arial, sans-serif',
                      borderLeft: '5px solid #9bc53d',
                      paddingLeft: '1.5rem',
                      background: 'white',
                      padding: '1.5rem',
                      borderRadius: '8px',
                      boxShadow: '0 2px 8px rgba(0, 0, 0, 0.05)'
                    }}>
                      {signatureName && (
                        <div style={{ fontSize: '1.35rem', fontWeight: '700', color: '#1e293b', marginBottom: '0.25rem' }}>
                          {signatureName}
                        </div>
                      )}
                      {signatureTitle && (
                        <div style={{ fontSize: '1rem', color: '#475569', marginBottom: '0.5rem', fontStyle: 'italic' }}>
                          {signatureTitle}
                        </div>
                      )}
                      {signatureCompany && (
                        <div style={{ fontSize: '1.1rem', fontWeight: '700', color: '#9bc53d', marginBottom: '0.75rem' }}>
                          {signatureCompany}
                        </div>
                      )}
                      <div style={{ fontSize: '0.95rem', color: '#64748b', lineHeight: '1.6' }}>
                        {signatureEmail && (
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem' }}>
                            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" style={{ width: '16px', height: '16px', color: '#9bc53d' }}>
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                            </svg>
                            <a href={`mailto:${signatureEmail}`} style={{ color: '#9bc53d', textDecoration: 'none', fontWeight: '500' }}>{signatureEmail}</a>
                          </div>
                        )}
                        {signaturePhone && (
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem' }}>
                            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" style={{ width: '16px', height: '16px', color: '#9bc53d' }}>
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                            </svg>
                            <span>{signaturePhone}</span>
                          </div>
                        )}
                        {signatureWebsite && (
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem' }}>
                            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" style={{ width: '16px', height: '16px', color: '#9bc53d' }}>
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9" />
                            </svg>
                            <a href={`https://${signatureWebsite.replace(/^https?:\/\//, '')}`} style={{ color: '#9bc53d', textDecoration: 'none', fontWeight: '500' }}>{signatureWebsite.replace(/^https?:\/\//, '')}</a>
                          </div>
                        )}
                        {signatureAddress && (
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem' }}>
                            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" style={{ width: '16px', height: '16px', color: '#9bc53d' }}>
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                            </svg>
                            <span>{signatureAddress}</span>
                          </div>
                        )}
                        {signatureNMLS && (
                          <div style={{ marginTop: '0.5rem', fontSize: '0.85rem', color: '#94a3b8' }}>
                            NMLS# {signatureNMLS}
                          </div>
                        )}
                        {signatureTagline && (
                          <div style={{ marginTop: '0.75rem', fontSize: '0.9rem', fontWeight: '700', color: '#9bc53d', letterSpacing: '0.05em' }}>
                            {signatureTagline}
                          </div>
                        )}
                        {(signatureLinkedIn || signatureFacebook || signatureTwitter || signatureInstagram) && (
                          <div style={{ marginTop: '1rem', display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
                            {signatureLinkedIn && <span style={{ fontSize: '1.25rem' }}>💼</span>}
                            {signatureFacebook && <span style={{ fontSize: '1.25rem' }}>📘</span>}
                            {signatureTwitter && <span style={{ fontSize: '1.25rem' }}>🐦</span>}
                            {signatureInstagram && <span style={{ fontSize: '1.25rem' }}>📷</span>}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <>
                  {/* Show form when editing or no signature exists */}
                  {signatureFound && isEditingSignature && (
                    <div style={{
                      marginBottom: '2rem',
                      padding: '1rem',
                      background: '#fef3c7',
                      border: '2px solid #fbbf24',
                      borderRadius: '8px',
                      color: '#92400e',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.75rem'
                    }}>
                      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" style={{ width: '24px', height: '24px' }}>
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                      </svg>
                      <span><strong>Editing signature.</strong> Make your changes below, then click Next to save.</span>
                    </div>
                  )}

              {/* Basic Information */}
              <h3 style={{ fontSize: '1.2rem', marginBottom: '1rem', color: '#334155', fontWeight: '600' }}>Basic Information</h3>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem', marginBottom: '2rem' }}>
                {/* Full Name */}
                <div className="form-group">
                  <label htmlFor="signatureName" style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem',
                    marginBottom: '0.75rem',
                    fontSize: '0.95rem',
                    fontWeight: '600',
                    color: '#334155'
                  }}>
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" style={{ width: '18px', height: '18px', color: '#8b5cf6' }}>
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                    </svg>
                    Full Name
                  </label>
                  <input
                    id="signatureName"
                    type="text"
                    className="form-input"
                    placeholder="John Smith"
                    value={signatureName}
                    onChange={(e) => setSignatureName(e.target.value)}
                    style={{ fontSize: '0.95rem', padding: '0.75rem' }}
                  />
                </div>

                {/* Job Title */}
                <div className="form-group">
                  <label htmlFor="signatureTitle" style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem',
                    marginBottom: '0.75rem',
                    fontSize: '0.95rem',
                    fontWeight: '600',
                    color: '#334155'
                  }}>
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" style={{ width: '18px', height: '18px', color: '#8b5cf6' }}>
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                    </svg>
                    Job Title
                  </label>
                  <input
                    id="signatureTitle"
                    type="text"
                    className="form-input"
                    placeholder="Senior Loan Officer"
                    value={signatureTitle}
                    onChange={(e) => setSignatureTitle(e.target.value)}
                    style={{ fontSize: '0.95rem', padding: '0.75rem' }}
                  />
                </div>

                {/* Company Name */}
                <div className="form-group">
                  <label htmlFor="signatureCompany" style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem',
                    marginBottom: '0.75rem',
                    fontSize: '0.95rem',
                    fontWeight: '600',
                    color: '#334155'
                  }}>
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" style={{ width: '18px', height: '18px', color: '#8b5cf6' }}>
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                    </svg>
                    Company Name
                  </label>
                  <input
                    id="signatureCompany"
                    type="text"
                    className="form-input"
                    placeholder="CMG Financial"
                    value={signatureCompany}
                    onChange={(e) => setSignatureCompany(e.target.value)}
                    style={{ fontSize: '0.95rem', padding: '0.75rem' }}
                  />
                </div>

                {/* NMLS */}
                <div className="form-group">
                  <label htmlFor="signatureNMLS" style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem',
                    marginBottom: '0.75rem',
                    fontSize: '0.95rem',
                    fontWeight: '600',
                    color: '#334155'
                  }}>
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" style={{ width: '18px', height: '18px', color: '#8b5cf6' }}>
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    NMLS #
                    <span style={{ fontSize: '0.85rem', fontWeight: '400', color: '#94a3b8' }}>(optional)</span>
                  </label>
                  <input
                    id="signatureNMLS"
                    type="text"
                    className="form-input"
                    placeholder="123456"
                    value={signatureNMLS}
                    onChange={(e) => setSignatureNMLS(e.target.value)}
                    style={{ fontSize: '0.95rem', padding: '0.75rem' }}
                  />
                </div>
              </div>

              {/* Contact Information */}
              <h3 style={{ fontSize: '1.2rem', marginBottom: '1rem', color: '#334155', fontWeight: '600' }}>Contact Information</h3>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem', marginBottom: '2rem' }}>
                {/* Email */}
                <div className="form-group">
                  <label htmlFor="signatureEmail" style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem',
                    marginBottom: '0.75rem',
                    fontSize: '0.95rem',
                    fontWeight: '600',
                    color: '#334155'
                  }}>
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" style={{ width: '18px', height: '18px', color: '#8b5cf6' }}>
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                    </svg>
                    Email Address
                  </label>
                  <input
                    id="signatureEmail"
                    type="email"
                    className="form-input"
                    placeholder="john.smith@cmgfi.com"
                    value={signatureEmail}
                    onChange={(e) => setSignatureEmail(e.target.value)}
                    style={{ fontSize: '0.95rem', padding: '0.75rem' }}
                  />
                </div>

                {/* Phone */}
                <div className="form-group">
                  <label htmlFor="signaturePhone" style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem',
                    marginBottom: '0.75rem',
                    fontSize: '0.95rem',
                    fontWeight: '600',
                    color: '#334155'
                  }}>
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" style={{ width: '18px', height: '18px', color: '#8b5cf6' }}>
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                    </svg>
                    Phone Number
                  </label>
                  <input
                    id="signaturePhone"
                    type="tel"
                    className="form-input"
                    placeholder="(555) 123-4567"
                    value={signaturePhone}
                    onChange={(e) => setSignaturePhone(e.target.value)}
                    style={{ fontSize: '0.95rem', padding: '0.75rem' }}
                  />
                </div>

                {/* Website */}
                <div className="form-group">
                  <label htmlFor="signatureWebsite" style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem',
                    marginBottom: '0.75rem',
                    fontSize: '0.95rem',
                    fontWeight: '600',
                    color: '#334155'
                  }}>
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" style={{ width: '18px', height: '18px', color: '#8b5cf6' }}>
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9" />
                    </svg>
                    Website
                    <span style={{ fontSize: '0.85rem', fontWeight: '400', color: '#94a3b8' }}>(optional)</span>
                  </label>
                  <input
                    id="signatureWebsite"
                    type="url"
                    className="form-input"
                    placeholder="www.cmgfi.com"
                    value={signatureWebsite}
                    onChange={(e) => setSignatureWebsite(e.target.value)}
                    style={{ fontSize: '0.95rem', padding: '0.75rem' }}
                  />
                </div>

                {/* Address */}
                <div className="form-group">
                  <label htmlFor="signatureAddress" style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem',
                    marginBottom: '0.75rem',
                    fontSize: '0.95rem',
                    fontWeight: '600',
                    color: '#334155'
                  }}>
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" style={{ width: '18px', height: '18px', color: '#8b5cf6' }}>
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                    Address
                    <span style={{ fontSize: '0.85rem', fontWeight: '400', color: '#94a3b8' }}>(optional)</span>
                  </label>
                  <input
                    id="signatureAddress"
                    type="text"
                    className="form-input"
                    placeholder="San Ramon, CA"
                    value={signatureAddress}
                    onChange={(e) => setSignatureAddress(e.target.value)}
                    style={{ fontSize: '0.95rem', padding: '0.75rem' }}
                  />
                </div>
              </div>

              {/* Branding */}
              <h3 style={{ fontSize: '1.2rem', marginBottom: '1rem', color: '#334155', fontWeight: '600' }}>Branding</h3>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem', marginBottom: '2rem' }}>
                {/* Tagline */}
                <div className="form-group">
                  <label htmlFor="signatureTagline" style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem',
                    marginBottom: '0.75rem',
                    fontSize: '0.95rem',
                    fontWeight: '600',
                    color: '#334155'
                  }}>
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" style={{ width: '18px', height: '18px', color: '#8b5cf6' }}>
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z" />
                    </svg>
                    Tagline
                    <span style={{ fontSize: '0.85rem', fontWeight: '400', color: '#94a3b8' }}>(optional)</span>
                  </label>
                  <input
                    id="signatureTagline"
                    type="text"
                    className="form-input"
                    placeholder="HOME LOANS SIMPLIFIED"
                    value={signatureTagline}
                    onChange={(e) => setSignatureTagline(e.target.value)}
                    style={{ fontSize: '0.95rem', padding: '0.75rem' }}
                  />
                </div>

                {/* Photo URL */}
                <div className="form-group">
                  <label htmlFor="signaturePhotoURL" style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem',
                    marginBottom: '0.75rem',
                    fontSize: '0.95rem',
                    fontWeight: '600',
                    color: '#334155'
                  }}>
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" style={{ width: '18px', height: '18px', color: '#8b5cf6' }}>
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                    Photo URL
                    <span style={{ fontSize: '0.85rem', fontWeight: '400', color: '#94a3b8' }}>(optional)</span>
                  </label>
                  <input
                    id="signaturePhotoURL"
                    type="url"
                    className="form-input"
                    placeholder="https://example.com/photo.jpg"
                    value={signaturePhotoURL}
                    onChange={(e) => setSignaturePhotoURL(e.target.value)}
                    style={{ fontSize: '0.95rem', padding: '0.75rem' }}
                  />
                </div>
              </div>

              {/* Social Media Links */}
              <h3 style={{ fontSize: '1.2rem', marginBottom: '1rem', color: '#334155', fontWeight: '600' }}>Social Media <span style={{ fontSize: '0.9rem', fontWeight: '400', color: '#94a3b8' }}>(All optional)</span></h3>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem', marginBottom: '2rem' }}>
                {/* LinkedIn */}
                <div className="form-group">
                  <label htmlFor="signatureLinkedIn" style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem',
                    marginBottom: '0.75rem',
                    fontSize: '0.95rem',
                    fontWeight: '600',
                    color: '#334155'
                  }}>
                    <span style={{ fontSize: '1rem' }}>💼</span>
                    LinkedIn URL
                  </label>
                  <input
                    id="signatureLinkedIn"
                    type="url"
                    className="form-input"
                    placeholder="https://linkedin.com/in/yourname"
                    value={signatureLinkedIn}
                    onChange={(e) => setSignatureLinkedIn(e.target.value)}
                    style={{ fontSize: '0.95rem', padding: '0.75rem' }}
                  />
                </div>

                {/* Facebook */}
                <div className="form-group">
                  <label htmlFor="signatureFacebook" style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem',
                    marginBottom: '0.75rem',
                    fontSize: '0.95rem',
                    fontWeight: '600',
                    color: '#334155'
                  }}>
                    <span style={{ fontSize: '1rem' }}>📘</span>
                    Facebook URL
                  </label>
                  <input
                    id="signatureFacebook"
                    type="url"
                    className="form-input"
                    placeholder="https://facebook.com/yourname"
                    value={signatureFacebook}
                    onChange={(e) => setSignatureFacebook(e.target.value)}
                    style={{ fontSize: '0.95rem', padding: '0.75rem' }}
                  />
                </div>

                {/* Twitter */}
                <div className="form-group">
                  <label htmlFor="signatureTwitter" style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem',
                    marginBottom: '0.75rem',
                    fontSize: '0.95rem',
                    fontWeight: '600',
                    color: '#334155'
                  }}>
                    <span style={{ fontSize: '1rem' }}>🐦</span>
                    Twitter/X URL
                  </label>
                  <input
                    id="signatureTwitter"
                    type="url"
                    className="form-input"
                    placeholder="https://twitter.com/yourname"
                    value={signatureTwitter}
                    onChange={(e) => setSignatureTwitter(e.target.value)}
                    style={{ fontSize: '0.95rem', padding: '0.75rem' }}
                  />
                </div>

                {/* Instagram */}
                <div className="form-group">
                  <label htmlFor="signatureInstagram" style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem',
                    marginBottom: '0.75rem',
                    fontSize: '0.95rem',
                    fontWeight: '600',
                    color: '#334155'
                  }}>
                    <span style={{ fontSize: '1rem' }}>📷</span>
                    Instagram URL
                  </label>
                  <input
                    id="signatureInstagram"
                    type="url"
                    className="form-input"
                    placeholder="https://instagram.com/yourname"
                    value={signatureInstagram}
                    onChange={(e) => setSignatureInstagram(e.target.value)}
                    style={{ fontSize: '0.95rem', padding: '0.75rem' }}
                  />
                </div>
              </div>

              {/* Preview of Signature - Updated Design */}
              {(signatureName || signatureTitle || signatureEmail || signaturePhone) && (
                <div style={{
                  marginTop: '2rem',
                  padding: '2rem',
                  background: 'linear-gradient(135deg, #ffffff 0%, #f8fef0 100%)',
                  border: '3px solid #9bc53d',
                  borderRadius: '12px',
                  boxShadow: '0 6px 16px rgba(155, 197, 61, 0.2)'
                }}>
                  <h3 style={{ margin: '0 0 1.5rem 0', fontSize: '1.2rem', color: '#2d3748', fontWeight: '700', textAlign: 'center' }}>✨ Signature Preview</h3>
                  <div style={{
                    fontFamily: 'Arial, sans-serif',
                    background: 'white',
                    padding: '2rem',
                    borderRadius: '12px',
                    boxShadow: '0 4px 12px rgba(0, 0, 0, 0.08)',
                    border: '2px solid #e8f5e0'
                  }}>
                    <div style={{ display: 'flex', gap: '1.5rem', alignItems: 'flex-start' }}>
                      {/* Photo Section */}
                      {signaturePhotoURL ? (
                        <div style={{ flexShrink: 0 }}>
                          <img
                            src={signaturePhotoURL}
                            alt={signatureName || 'Loan Officer'}
                            style={{
                              width: '100px',
                              height: '100px',
                              borderRadius: '50%',
                              objectFit: 'cover',
                              border: '4px solid #9bc53d',
                              boxShadow: '0 4px 12px rgba(0, 0, 0, 0.1)'
                            }}
                          />
                        </div>
                      ) : (
                        <div style={{
                          flexShrink: 0,
                          width: '100px',
                          height: '100px',
                          borderRadius: '50%',
                          background: 'linear-gradient(135deg, #e8f5e0 0%, #d1ead1 100%)',
                          border: '3px dashed #9bc53d',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontSize: '2.5rem'
                        }}>
                          👤
                        </div>
                      )}

                      {/* Contact Info Section */}
                      <div style={{ flex: 1 }}>
                        {signatureName && (
                          <div style={{ fontSize: '1.4rem', fontWeight: '700', color: '#1e293b', marginBottom: '0.25rem' }}>
                            {signatureName}
                          </div>
                        )}
                        {signatureTitle && (
                          <div style={{ fontSize: '1rem', color: '#64748b', marginBottom: '0.5rem', fontStyle: 'italic' }}>
                            {signatureTitle}
                          </div>
                        )}
                        {signatureCompany && (
                          <div style={{ fontSize: '1.1rem', fontWeight: '700', color: '#9bc53d', marginBottom: '1rem' }}>
                            {signatureCompany}
                          </div>
                        )}

                        <div style={{ fontSize: '0.9rem', color: '#475569', lineHeight: '1.7' }}>
                          {signatureEmail && (
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.3rem' }}>
                              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" style={{ width: '16px', height: '16px', color: '#9bc53d' }}>
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                              </svg>
                              <span style={{ color: '#9bc53d', fontWeight: '600' }}>{signatureEmail}</span>
                            </div>
                          )}
                          {signaturePhone && (
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.3rem' }}>
                              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" style={{ width: '16px', height: '16px', color: '#9bc53d' }}>
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                              </svg>
                              <span style={{ fontWeight: '600' }}>{signaturePhone}</span>
                            </div>
                          )}
                          {signatureAddress && (
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.3rem' }}>
                              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" style={{ width: '16px', height: '16px', color: '#9bc53d' }}>
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                              </svg>
                              <span>{signatureAddress}</span>
                            </div>
                          )}
                          {signatureNMLS && (
                            <div style={{ marginTop: '0.5rem', fontSize: '0.8rem', color: '#94a3b8', fontWeight: '500' }}>
                              NMLS# {signatureNMLS}
                            </div>
                          )}
                        </div>

                        {signatureTagline && (
                          <div style={{
                            marginTop: '0.75rem',
                            paddingTop: '0.75rem',
                            borderTop: '2px solid #e8f5e0',
                            fontSize: '0.85rem',
                            fontWeight: '700',
                            color: '#9bc53d',
                            letterSpacing: '0.1em',
                            textTransform: 'uppercase'
                          }}>
                            {signatureTagline}
                          </div>
                        )}

                        {(signatureLinkedIn || signatureFacebook || signatureTwitter || signatureInstagram) && (
                          <div style={{ marginTop: '0.75rem', display: 'flex', gap: '0.4rem', alignItems: 'center' }}>
                            {signatureLinkedIn && (
                              <div style={{ width: '28px', height: '28px', borderRadius: '50%', background: '#0077b5', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontSize: '14px' }}>
                                in
                              </div>
                            )}
                            {signatureFacebook && (
                              <div style={{ width: '28px', height: '28px', borderRadius: '50%', background: '#1877f2', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontSize: '14px', fontWeight: '700' }}>
                                f
                              </div>
                            )}
                            {signatureTwitter && (
                              <div style={{ width: '28px', height: '28px', borderRadius: '50%', background: '#1da1f2', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontSize: '14px', fontWeight: '700' }}>
                                𝕏
                              </div>
                            )}
                            {signatureInstagram && (
                              <div style={{ width: '28px', height: '28px', borderRadius: '50%', background: 'linear-gradient(45deg, #f09433 0%,#e6683c 25%,#dc2743 50%,#cc2366 75%,#bc1888 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontSize: '16px', fontWeight: '700' }}>
                                ⓘ
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                  {!signaturePhotoURL && (
                    <div style={{
                      marginTop: '1rem',
                      padding: '0.75rem',
                      background: '#fff7ed',
                      border: '1px solid #fed7aa',
                      borderRadius: '8px',
                      fontSize: '0.85rem',
                      color: '#c2410c',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.5rem'
                    }}>
                      <span style={{ fontSize: '1.1rem' }}>💡</span>
                      <span><strong>Tip:</strong> Add a professional headshot photo URL above for a more personal touch!</span>
                    </div>
                  )}
                </div>
              )}

              <div style={{
                marginTop: '1.5rem',
                padding: '1rem',
                background: '#eff6ff',
                borderRadius: '8px',
                fontSize: '0.9rem',
                color: '#1e40af',
                display: 'flex',
                alignItems: 'flex-start',
                gap: '0.75rem'
              }}>
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" style={{ width: '20px', height: '20px', flexShrink: 0, marginTop: '2px' }}>
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span>This signature is optional. If you skip this step, the proposal will not include a personalized signature at the end.</span>
              </div>
                </>
              )}
            </div>
          </div>
        )}

        {/* Step 5: Preview & Download */}
        {currentStep === 5 && (
          <div className="section-card">
            <h2>Preview Your Proposal</h2>
            <p className="section-description">
              Review the proposal below, then download as PDF
            </p>

            <div className="proposal-preview">
              <div id="proposal-content" className="preview-content">
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
                  <div className="preview-section pitch-section" style={{ pageBreakInside: 'avoid' }}>
                    <h3>Why the All-In-One Loan is Right for You</h3>
                    <div className="preview-pitch">{aiPitch}</div>
                  </div>
                )}

                {/* Savings Highlight */}
                {components.find((c) => c.id === 'savings-highlight')?.enabled && (
                  <div className="preview-section savings-section" style={{ pageBreakInside: 'avoid' }}>
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
                  <div className="preview-section" style={{ pageBreakInside: 'avoid' }}>
                    <h3>Side-by-Side Comparison</h3>
                    <table className="preview-table" style={{ pageBreakInside: 'avoid' }}>
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
                          <td>{formatCurrency(simulation.traditionalLoan.monthlyPayment)}</td>
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
                  <div className="preview-section" style={{ pageBreakInside: 'avoid' }}>
                    <h3>How the All-In-One Loan Works</h3>
                    <div className="preview-benefits">
                      <div className="benefit-item" style={{ pageBreakInside: 'avoid' }}>
                        <h4>💰 Cash Flow Offset</h4>
                        <p>Your positive cash flow sits in the loan account, reducing the balance used for interest calculations.</p>
                      </div>
                      <div className="benefit-item" style={{ pageBreakInside: 'avoid' }}>
                        <h4>📈 Accelerated Payoff</h4>
                        <p>You'll pay off your mortgage {yearsMonthsFromMonths(simulation.comparison.timeSavedMonths)} faster.</p>
                      </div>
                      <div className="benefit-item" style={{ pageBreakInside: 'avoid' }}>
                        <h4>🔓 Full Flexibility</h4>
                        <p>Access your funds anytime while they work to reduce your interest.</p>
                      </div>
                    </div>
                  </div>
                )}

                {/* Cash Flow Analysis */}
                {components.find((c) => c.id === 'cash-flow-details')?.enabled && (
                  <div className="preview-section" style={{ pageBreakInside: 'avoid' }}>
                    <h3>Cash Flow Analysis</h3>
                    <table className="preview-table" style={{ pageBreakInside: 'avoid' }}>
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
                  <div className="preview-section" style={{ pageBreakInside: 'avoid' }}>
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

                {/* Email Signature - Redesigned with Photo */}
                {components.find((c) => c.id === 'signature')?.enabled && (signatureName || signatureEmail) && (
                  <div className="preview-section" style={{ marginTop: '3rem', pageBreakInside: 'avoid' }}>
                    <div style={{
                      fontFamily: 'Arial, sans-serif',
                      background: 'linear-gradient(135deg, #ffffff 0%, #f8fef0 100%)',
                      border: '2px solid #9bc53d',
                      borderRadius: '12px',
                      padding: '2rem',
                      boxShadow: '0 4px 12px rgba(155, 197, 61, 0.15)'
                    }}>
                      <div style={{ marginBottom: '1rem', color: '#64748b', fontSize: '0.95rem', fontStyle: 'italic' }}>
                        Best regards,
                      </div>

                      <div style={{ display: 'flex', gap: '1.5rem', alignItems: 'flex-start' }}>
                        {/* Photo Section */}
                        {signaturePhotoURL && (
                          <div style={{ flexShrink: 0 }}>
                            <img
                              src={signaturePhotoURL}
                              alt={signatureName || 'Loan Officer'}
                              style={{
                                width: '120px',
                                height: '120px',
                                borderRadius: '50%',
                                objectFit: 'cover',
                                border: '4px solid #9bc53d',
                                boxShadow: '0 4px 12px rgba(0, 0, 0, 0.1)'
                              }}
                            />
                          </div>
                        )}

                        {/* Contact Info Section */}
                        <div style={{ flex: 1 }}>
                          {signatureName && (
                            <div style={{ fontSize: '1.5rem', fontWeight: '700', color: '#1e293b', marginBottom: '0.25rem' }}>
                              {signatureName}
                            </div>
                          )}
                          {signatureTitle && (
                            <div style={{ fontSize: '1.05rem', color: '#64748b', marginBottom: '0.5rem', fontStyle: 'italic' }}>
                              {signatureTitle}
                            </div>
                          )}
                          {signatureCompany && (
                            <div style={{ fontSize: '1.15rem', fontWeight: '700', color: '#9bc53d', marginBottom: '1rem' }}>
                              {signatureCompany}
                            </div>
                          )}

                          <div style={{ fontSize: '0.95rem', color: '#475569', lineHeight: '1.8' }}>
                            {signatureEmail && (
                              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.35rem' }}>
                                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" style={{ width: '18px', height: '18px', color: '#9bc53d', flexShrink: 0 }}>
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                                </svg>
                                <span style={{ color: '#9bc53d', fontWeight: '600' }}>{signatureEmail}</span>
                              </div>
                            )}
                            {signaturePhone && (
                              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.35rem' }}>
                                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" style={{ width: '18px', height: '18px', color: '#9bc53d', flexShrink: 0 }}>
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                                </svg>
                                <span style={{ fontWeight: '600' }}>{signaturePhone}</span>
                              </div>
                            )}
                            {signatureAddress && (
                              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.35rem' }}>
                                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" style={{ width: '18px', height: '18px', color: '#9bc53d', flexShrink: 0 }}>
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                                </svg>
                                <span>{signatureAddress}</span>
                              </div>
                            )}
                            {signatureNMLS && (
                              <div style={{ marginTop: '0.75rem', fontSize: '0.85rem', color: '#94a3b8', fontWeight: '500' }}>
                                NMLS# {signatureNMLS}
                              </div>
                            )}
                          </div>

                          {signatureTagline && (
                            <div style={{
                              marginTop: '1rem',
                              paddingTop: '1rem',
                              borderTop: '2px solid #e8f5e0',
                              fontSize: '0.9rem',
                              fontWeight: '700',
                              color: '#9bc53d',
                              letterSpacing: '0.1em',
                              textTransform: 'uppercase'
                            }}>
                              {signatureTagline}
                            </div>
                          )}

                          {(signatureLinkedIn || signatureFacebook || signatureTwitter || signatureInstagram) && (
                            <div style={{ marginTop: '1rem', display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                              {signatureLinkedIn && (
                                <a href={signatureLinkedIn} target="_blank" rel="noopener noreferrer" style={{ textDecoration: 'none' }}>
                                  <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: '#0077b5', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontSize: '16px' }}>
                                    in
                                  </div>
                                </a>
                              )}
                              {signatureFacebook && (
                                <a href={signatureFacebook} target="_blank" rel="noopener noreferrer" style={{ textDecoration: 'none' }}>
                                  <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: '#1877f2', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontSize: '16px', fontWeight: '700' }}>
                                    f
                                  </div>
                                </a>
                              )}
                              {signatureTwitter && (
                                <a href={signatureTwitter} target="_blank" rel="noopener noreferrer" style={{ textDecoration: 'none' }}>
                                  <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: '#1da1f2', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontSize: '16px', fontWeight: '700' }}>
                                    𝕏
                                  </div>
                                </a>
                              )}
                              {signatureInstagram && (
                                <a href={signatureInstagram} target="_blank" rel="noopener noreferrer" style={{ textDecoration: 'none' }}>
                                  <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: 'linear-gradient(45deg, #f09433 0%,#e6683c 25%,#dc2743 50%,#cc2366 75%,#bc1888 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontSize: '18px', fontWeight: '700' }}>
                                    ⓘ
                                  </div>
                                </a>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
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
              <p style={{
                textAlign: 'center',
                color: '#64748b',
                fontSize: '0.95rem',
                marginBottom: '1rem',
                padding: '0.75rem',
                background: '#f1f5f9',
                borderRadius: '8px',
                lineHeight: '1.6'
              }}>
                💡 <strong>Tip:</strong> Click the button below to download your proposal as a PDF file. The PDF will be automatically generated and saved to your downloads folder.
              </p>
              <button
                className="btn-primary btn-large"
                onClick={handleGeneratePDF}
                title="Download proposal as PDF file"
              >
                <svg className="btn-icon" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
                </svg>
                Download as PDF
              </button>
            </div>
          </div>
        )}

        {/* Wizard Navigation Buttons */}
        <div className="wizard-actions" style={{
          position: 'sticky',
          bottom: 0,
          zIndex: 99,
          background: 'white',
          padding: '1rem 0',
          boxShadow: '0 -2px 10px rgba(0, 0, 0, 0.1)',
          marginTop: '2rem',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}>
          <button className="btn-secondary" onClick={onBack} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <svg className="btn-icon" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Back to Simulation
          </button>
          <div style={{ display: 'flex', gap: '1rem' }}>
            {currentStep > 1 && (
              <button className="btn-secondary" onClick={handlePreviousStep}>
                <svg className="btn-icon" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
                Previous Step
              </button>
            )}
            {currentStep < 5 && (
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
      </div>

      {/* Pitch Options Modal */}
      <PitchOptionsModal
        isOpen={showPitchOptions}
        onClose={() => setShowPitchOptions(false)}
        onApply={handleApplyPitchOptions}
        currentOptions={pitchOptions}
      />

      {/* Component Preview Modal */}
      {showComponentPreview && previewComponentId && (() => {
        const formatCurrency = (amount: number) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 0 }).format(amount);
        const component = components.find(c => c.id === previewComponentId);

        return (
          <div onClick={() => setShowComponentPreview(false)} style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '2rem' }}>
            <div onClick={(e) => e.stopPropagation()} style={{ background: 'white', borderRadius: '16px', maxWidth: '800px', width: '100%', maxHeight: '90vh', overflow: 'auto', boxShadow: '0 20px 60px rgba(0,0,0,0.3)' }}>
              <div style={{ padding: '2rem', borderBottom: '2px solid #e2e8f0', display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%)' }}>
                <div><h2 style={{ margin: 0, fontSize: '1.5rem', color: '#1e293b' }}>{component?.label}</h2><p style={{ margin: '0.5rem 0 0', color: '#64748b', fontSize: '0.95rem' }}>{component?.description}</p></div>
                <button onClick={() => setShowComponentPreview(false)} style={{ background: '#f1f5f9', border: '1px solid #cbd5e1', borderRadius: '8px', padding: '0.5rem', cursor: 'pointer' }}><svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" style={{ width: '24px', height: '24px' }}><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg></button>
              </div>
              <div style={{ padding: '2rem', background: '#f8fafc' }}>
                <div style={{ background: 'white', borderRadius: '12px', border: '2px solid #e2e8f0', padding: '2rem' }}>
                  {previewComponentId === 'savings-highlight' && <div style={{ textAlign: 'center', padding: '2rem', background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)', borderRadius: '12px', color: 'white' }}><div style={{ fontSize: '0.9rem', opacity: 0.9 }}>Total Interest Savings</div><div style={{ fontSize: '3rem', fontWeight: 'bold' }}>{formatCurrency(simulation.comparison.interestSavings)}</div></div>}
                  {previewComponentId === 'comparison-cards' && <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}><div style={{ padding: '1.5rem', background: '#f8fafc', borderRadius: '12px' }}><div style={{ fontSize: '1.5rem', fontWeight: '700', color: '#4299e1' }}>{formatCurrency(simulation.traditionalLoan.totalInterestPaid)}</div><div style={{ fontSize: '0.9rem', color: '#64748b' }}>Traditional Interest</div></div><div style={{ padding: '1.5rem', background: '#f0fdf4', borderRadius: '12px' }}><div style={{ fontSize: '1.5rem', fontWeight: '700', color: '#9bc53d' }}>{formatCurrency(simulation.allInOneLoan.totalInterestPaid)}</div><div style={{ fontSize: '0.9rem', color: '#64748b' }}>AIO Interest</div></div></div>}
                  {previewComponentId === 'how-it-works' && <div style={{ padding: '1.5rem' }}><h3 style={{ color: '#1e293b', marginBottom: '1rem' }}>How the All-In-One Loan Works</h3><div style={{ lineHeight: 1.6, color: '#475569' }}>The All-In-One loan combines your mortgage and bank account into one, allowing your income to offset your loan balance daily.</div></div>}
                  {previewComponentId === 'cash-flow-details' && cashFlow && <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1rem', padding: '1.5rem' }}><div style={{ padding: '1rem', background: '#f0fdf4', borderRadius: '8px' }}><div style={{ fontSize: '0.85rem', color: '#64748b' }}>Monthly Income</div><div style={{ fontSize: '1.25rem', fontWeight: '700', color: '#10b981' }}>{formatCurrency(cashFlow.totalIncome)}</div></div><div style={{ padding: '1rem', background: '#fef3c7', borderRadius: '8px' }}><div style={{ fontSize: '0.85rem', color: '#64748b' }}>Monthly Expenses</div><div style={{ fontSize: '1.25rem', fontWeight: '700', color: '#f59e0b' }}>{formatCurrency(cashFlow.totalExpenses)}</div></div><div style={{ padding: '1rem', background: '#dbeafe', borderRadius: '8px' }}><div style={{ fontSize: '0.85rem', color: '#64748b' }}>Net Cash Flow</div><div style={{ fontSize: '1.25rem', fontWeight: '700', color: '#3b82f6' }}>{formatCurrency(cashFlow.netCashFlow)}</div></div></div>}
                  {(!['savings-highlight', 'comparison-cards', 'how-it-works', 'cash-flow-details'].includes(previewComponentId)) && <div style={{ padding: '2rem', textAlign: 'center', color: '#94a3b8' }}>Preview rendering for {component?.label}</div>}
                </div>
                <div style={{ marginTop: '1.5rem', padding: '1rem', background: '#eff6ff', borderRadius: '8px', fontSize: '0.9rem', color: '#1e40af' }}>💡 This is a preview of how this component will appear in your proposal</div>
              </div>
            </div>
          </div>
        );
      })()}

      {/* Add CSS animations */}
      <style>{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
        @keyframes fadeIn {
          from { opacity: 0; transform: scale(0.95); }
          to { opacity: 1; transform: scale(1); }
        }
      `}</style>
    </main>
  </div>
);
}
