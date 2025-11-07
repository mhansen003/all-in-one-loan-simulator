import { useState } from 'react';
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
import type { SimulationResult, MortgageDetails } from '../types';
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

export default function ProposalBuilder({
  simulation,
  mortgageDetails,
  onBack,
}: ProposalBuilderProps) {
  // Personalization state
  const [clientName, setClientName] = useState('');
  const [clientEmail, setClientEmail] = useState('');
  const [includeFooter, setIncludeFooter] = useState(true);

  // AI Pitch state
  const [aiPitch, setAiPitch] = useState('');
  const [isGeneratingPitch, setIsGeneratingPitch] = useState(false);

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

  const handleGeneratePDF = () => {
    // TODO: Implement PDF generation with html2pdf.js
    alert('PDF generation coming soon!');
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
        <p>Customize your client presentation and generate a professional PDF</p>
      </div>

      <div className="proposal-content">
        {/* Personalization Section */}
        <div className="section-card">
          <h2>Client Information</h2>
          <p className="section-description">Personalize the proposal for your client</p>

          <div className="form-group">
            <label htmlFor="clientName">Client Name</label>
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

        {/* AI Pitch Generation */}
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

        {/* Component Selection & Ordering */}
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

        {/* Action Buttons */}
        <div className="proposal-actions">
          <button className="btn-secondary" onClick={onBack}>
            <svg className="btn-icon" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Back to Results
          </button>
          <button
            className="btn-primary"
            onClick={handleGeneratePDF}
            disabled={!aiPitch}
            title={!aiPitch ? 'Generate AI pitch first' : ''}
          >
            <svg className="btn-icon" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            Generate PDF Proposal
          </button>
        </div>
      </div>
    </div>
  );
}
