import './PageNavigation.css';

interface PageNavigationProps {
  // Back button (left side - grey)
  onBack?: () => void;
  backLabel?: string;
  showBack?: boolean;

  // Next/Continue button (right side - blue)
  onNext?: () => void;
  nextLabel?: string;
  showNext?: boolean;
  nextDisabled?: boolean;
  nextLoading?: boolean;

  // Additional styling
  className?: string;
}

export default function PageNavigation({
  onBack,
  backLabel = 'Back',
  showBack = true,
  onNext,
  nextLabel = 'Next',
  showNext = true,
  nextDisabled = false,
  nextLoading = false,
  className = '',
}: PageNavigationProps) {
  return (
    <div className={`page-navigation ${className}`}>
      {/* Left side - Back button (grey) */}
      <div className="nav-left">
        {showBack && onBack && (
          <button
            type="button"
            onClick={onBack}
            className="nav-btn nav-btn-back"
          >
            <svg className="nav-icon" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            {backLabel}
          </button>
        )}
      </div>

      {/* Right side - Next button (blue) */}
      <div className="nav-right">
        {showNext && onNext && (
          <button
            type="button"
            onClick={onNext}
            className="nav-btn nav-btn-next"
            disabled={nextDisabled || nextLoading}
          >
            {nextLoading ? (
              <>
                <span className="nav-spinner"></span>
                Loading...
              </>
            ) : (
              <>
                {nextLabel}
                <svg className="nav-icon" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </>
            )}
          </button>
        )}
      </div>
    </div>
  );
}
