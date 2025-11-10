import { useState, useEffect } from 'react';
import './FlipCard.css';

interface FlipCardProps {
  frontContent: React.ReactNode;
  backContent: React.ReactNode;
  className?: string;
}

export default function FlipCard({ frontContent, backContent, className = '' }: FlipCardProps) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isFlipped, setIsFlipped] = useState(false);

  const handleOpenModal = () => {
    setIsModalOpen(true);
    // Slight delay before flip animation for better effect
    setTimeout(() => setIsFlipped(true), 100);
  };

  const handleCloseModal = () => {
    setIsFlipped(false);
    // Wait for flip animation to complete before closing modal
    setTimeout(() => setIsModalOpen(false), 700);
  };

  // Close modal on Escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isModalOpen) {
        handleCloseModal();
      }
    };
    window.addEventListener('keydown', handleEscape);
    return () => window.removeEventListener('keydown', handleEscape);
  }, [isModalOpen]);

  // Prevent body scroll when modal is open
  useEffect(() => {
    if (isModalOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isModalOpen]);

  return (
    <>
      {/* Card Preview (always shows front) */}
      <div className={`flip-card-container ${className}`}>
        <div className="flip-card flip-card-preview" onClick={handleOpenModal}>
          <div className="flip-card-front">
            {frontContent}
            <div className="flip-indicator">
              <svg
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                style={{ marginRight: '4px' }}
              >
                <path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8" />
                <path d="M21 3v5h-5" />
                <path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16" />
                <path d="M3 21v-5h5" />
              </svg>
              <span>Flip for details</span>
            </div>
          </div>
        </div>
      </div>

      {/* Modal Overlay */}
      {isModalOpen && (
        <div className="flip-card-modal-overlay" onClick={handleCloseModal}>
          <div className="flip-card-modal-content" onClick={(e) => e.stopPropagation()}>
            <button className="modal-close-button" onClick={handleCloseModal} aria-label="Close">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M18 6L6 18M6 6l12 12" />
              </svg>
            </button>

            {/* Larger Flip Card in Modal */}
            <div className={`flip-card flip-card-modal ${isFlipped ? 'flipped' : ''}`}>
              {/* Front Side */}
              <div className="flip-card-front">
                {frontContent}
              </div>

              {/* Back Side */}
              <div className="flip-card-back" onClick={handleCloseModal} style={{ cursor: 'pointer' }}>
                {backContent}
                <div className="flip-back-hint">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ marginRight: '6px' }}>
                    <path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8" />
                    <path d="M21 3v5h-5" />
                    <path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16" />
                    <path d="M3 21v-5h5" />
                  </svg>
                  <span>Click anywhere to flip back & close</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
