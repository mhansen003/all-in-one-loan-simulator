import { useState } from 'react';
import './PitchOptionsModal.css';

export interface PitchOptions {
  tone: 'casual' | 'professional' | 'neutral';
  length: 'shorter' | 'standard' | 'longer';
  technicalLevel: 'simple' | 'moderate' | 'technical';
  focus: 'savings' | 'flexibility' | 'security' | 'balanced';
  urgency: 'low' | 'moderate' | 'high';
  style: 'data-driven' | 'balanced' | 'story-based';
  cta: 'soft' | 'moderate' | 'strong';
}

interface PitchOptionsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onApply: (options: PitchOptions) => void;
  currentOptions?: PitchOptions;
}

const defaultOptions: PitchOptions = {
  tone: 'neutral',
  length: 'standard',
  technicalLevel: 'moderate',
  focus: 'balanced',
  urgency: 'moderate',
  style: 'balanced',
  cta: 'moderate',
};

export default function PitchOptionsModal({
  isOpen,
  onClose,
  onApply,
  currentOptions = defaultOptions,
}: PitchOptionsModalProps) {
  const [options, setOptions] = useState<PitchOptions>(currentOptions);

  if (!isOpen) return null;

  const handleApply = () => {
    onApply(options);
    onClose();
  };

  const handleReset = () => {
    setOptions(defaultOptions);
  };

  return (
    <div className="pitch-options-overlay" onClick={onClose}>
      <div className="pitch-options-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>Customize Pitch Generation</h2>
          <button className="close-btn" onClick={onClose}>
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="modal-body">
          {/* Tone */}
          <div className="option-group">
            <label className="option-label">
              <span className="label-icon">💬</span>
              Tone
            </label>
            <div className="option-buttons">
              <button
                className={`option-btn ${options.tone === 'casual' ? 'active' : ''}`}
                onClick={() => setOptions({ ...options, tone: 'casual' })}
              >
                More Casual
              </button>
              <button
                className={`option-btn ${options.tone === 'neutral' ? 'active' : ''}`}
                onClick={() => setOptions({ ...options, tone: 'neutral' })}
              >
                Neutral
              </button>
              <button
                className={`option-btn ${options.tone === 'professional' ? 'active' : ''}`}
                onClick={() => setOptions({ ...options, tone: 'professional' })}
              >
                Professional
              </button>
            </div>
          </div>

          {/* Length */}
          <div className="option-group">
            <label className="option-label">
              <span className="label-icon">📏</span>
              Length
            </label>
            <div className="option-buttons">
              <button
                className={`option-btn ${options.length === 'shorter' ? 'active' : ''}`}
                onClick={() => setOptions({ ...options, length: 'shorter' })}
              >
                Shorter
              </button>
              <button
                className={`option-btn ${options.length === 'standard' ? 'active' : ''}`}
                onClick={() => setOptions({ ...options, length: 'standard' })}
              >
                Standard
              </button>
              <button
                className={`option-btn ${options.length === 'longer' ? 'active' : ''}`}
                onClick={() => setOptions({ ...options, length: 'longer' })}
              >
                Longer
              </button>
            </div>
          </div>

          {/* Technical Level */}
          <div className="option-group">
            <label className="option-label">
              <span className="label-icon">🎓</span>
              Technical Level
            </label>
            <div className="option-buttons">
              <button
                className={`option-btn ${options.technicalLevel === 'simple' ? 'active' : ''}`}
                onClick={() => setOptions({ ...options, technicalLevel: 'simple' })}
              >
                Simple
              </button>
              <button
                className={`option-btn ${options.technicalLevel === 'moderate' ? 'active' : ''}`}
                onClick={() => setOptions({ ...options, technicalLevel: 'moderate' })}
              >
                Moderate
              </button>
              <button
                className={`option-btn ${options.technicalLevel === 'technical' ? 'active' : ''}`}
                onClick={() => setOptions({ ...options, technicalLevel: 'technical' })}
              >
                Technical
              </button>
            </div>
          </div>

          {/* Focus */}
          <div className="option-group">
            <label className="option-label">
              <span className="label-icon">🎯</span>
              Primary Focus
            </label>
            <div className="option-buttons">
              <button
                className={`option-btn ${options.focus === 'savings' ? 'active' : ''}`}
                onClick={() => setOptions({ ...options, focus: 'savings' })}
              >
                Savings
              </button>
              <button
                className={`option-btn ${options.focus === 'flexibility' ? 'active' : ''}`}
                onClick={() => setOptions({ ...options, focus: 'flexibility' })}
              >
                Flexibility
              </button>
              <button
                className={`option-btn ${options.focus === 'security' ? 'active' : ''}`}
                onClick={() => setOptions({ ...options, focus: 'security' })}
              >
                Security
              </button>
              <button
                className={`option-btn ${options.focus === 'balanced' ? 'active' : ''}`}
                onClick={() => setOptions({ ...options, focus: 'balanced' })}
              >
                Balanced
              </button>
            </div>
          </div>

          {/* Urgency */}
          <div className="option-group">
            <label className="option-label">
              <span className="label-icon">⏰</span>
              Urgency
            </label>
            <div className="option-buttons">
              <button
                className={`option-btn ${options.urgency === 'low' ? 'active' : ''}`}
                onClick={() => setOptions({ ...options, urgency: 'low' })}
              >
                Low Pressure
              </button>
              <button
                className={`option-btn ${options.urgency === 'moderate' ? 'active' : ''}`}
                onClick={() => setOptions({ ...options, urgency: 'moderate' })}
              >
                Moderate
              </button>
              <button
                className={`option-btn ${options.urgency === 'high' ? 'active' : ''}`}
                onClick={() => setOptions({ ...options, urgency: 'high' })}
              >
                High Urgency
              </button>
            </div>
          </div>

          {/* Style */}
          <div className="option-group">
            <label className="option-label">
              <span className="label-icon">✨</span>
              Writing Style
            </label>
            <div className="option-buttons">
              <button
                className={`option-btn ${options.style === 'data-driven' ? 'active' : ''}`}
                onClick={() => setOptions({ ...options, style: 'data-driven' })}
              >
                Data-Driven
              </button>
              <button
                className={`option-btn ${options.style === 'balanced' ? 'active' : ''}`}
                onClick={() => setOptions({ ...options, style: 'balanced' })}
              >
                Balanced
              </button>
              <button
                className={`option-btn ${options.style === 'story-based' ? 'active' : ''}`}
                onClick={() => setOptions({ ...options, style: 'story-based' })}
              >
                Story-Based
              </button>
            </div>
          </div>

          {/* Call to Action */}
          <div className="option-group">
            <label className="option-label">
              <span className="label-icon">📢</span>
              Call to Action
            </label>
            <div className="option-buttons">
              <button
                className={`option-btn ${options.cta === 'soft' ? 'active' : ''}`}
                onClick={() => setOptions({ ...options, cta: 'soft' })}
              >
                Soft
              </button>
              <button
                className={`option-btn ${options.cta === 'moderate' ? 'active' : ''}`}
                onClick={() => setOptions({ ...options, cta: 'moderate' })}
              >
                Moderate
              </button>
              <button
                className={`option-btn ${options.cta === 'strong' ? 'active' : ''}`}
                onClick={() => setOptions({ ...options, cta: 'strong' })}
              >
                Strong
              </button>
            </div>
          </div>
        </div>

        <div className="modal-footer">
          <button className="btn-secondary" onClick={handleReset}>
            Reset to Defaults
          </button>
          <div style={{ display: 'flex', gap: '0.75rem' }}>
            <button className="btn-secondary" onClick={onClose}>
              Cancel
            </button>
            <button className="btn-primary" onClick={handleApply}>
              Apply & Regenerate
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
