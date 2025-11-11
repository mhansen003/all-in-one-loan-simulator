import { useCallback, useState, useEffect } from 'react';
import { useDropzone } from 'react-dropzone';
import Papa from 'papaparse';
import type { CashFlowAnalysis } from '../types';
import PageNavigation from './PageNavigation';
import './FileUpload.css';

interface FileWithData {
  file: File;
  parsedData?: any[]; // For CSV/XLSX files parsed on client
  rowCount?: number;
}

interface FileUploadProps {
  files: File[];
  onFilesSelected: (files: File[]) => void;
  onSubmit: () => void;
  onBack?: () => void;
  isAnalyzing?: boolean;
  existingAnalysis?: CashFlowAnalysis | null;
  onSkipToReview?: () => void;
}

export default function FileUpload({
  files,
  onFilesSelected,
  onSubmit,
  onBack,
  isAnalyzing = false,
  existingAnalysis,
  onSkipToReview,
}: FileUploadProps) {
  const [selectedFiles, setSelectedFiles] = useState<File[]>(files);
  const [filesWithData, setFilesWithData] = useState<FileWithData[]>(files.map(f => ({ file: f })));
  const [isProcessingPdf, setIsProcessingPdf] = useState(false);
  const [showManualEntryModal, setShowManualEntryModal] = useState(false);

  // Analyzing animation state
  const [currentStep, setCurrentStep] = useState(0);
  const [currentTip, setCurrentTip] = useState(0);

  const analyzingSteps = [
    { label: 'Extracting text from documents', duration: 3000 },
    { label: 'Analyzing transactions', duration: 4000 },
    { label: 'Detecting deposit patterns', duration: 2500 },
    { label: 'Calculating monthly averages', duration: 2000 },
    { label: 'Flagging irregular transactions', duration: 2500 },
    { label: 'Finalizing analysis', duration: 2000 },
  ];

  const analyzingTips = [
    {
      title: "What is an All-In-One Loan?",
      content: "An All-In-One (AIO) loan combines your mortgage and bank account into one, allowing your income to offset your loan balance daily, reducing interest charges."
    },
    {
      title: "How Does Cash Flow Matter?",
      content: "The more positive cash flow you have each month, the greater your interest savings. Every dollar in your account works to reduce the balance that accrues interest."
    },
    {
      title: "What About Access to My Money?",
      content: "You have complete access to your funds anytime with checks, debit cards, and online transfers. Your money remains fully liquid while saving you interest."
    },
    {
      title: "How Much Can I Save?",
      content: "Most borrowers save 30-50% on total interest and pay off their mortgage 8-12 years faster, depending on their cash flow."
    },
    {
      title: "Is This Right for Everyone?",
      content: "AIO loans work best for borrowers with consistent positive cash flow. Our analysis will show your suitability based on your transaction history."
    },
    {
      title: "What Makes This Different?",
      content: "Unlike traditional mortgages that calculate interest monthly, AIO loans calculate daily. This means every deposit immediately starts reducing your interest."
    },
  ];

  // Cycle through analyzing steps when analyzing
  useEffect(() => {
    if (!isAnalyzing) return;

    let stepTimeout: NodeJS.Timeout;
    let currentIndex = 0;

    const nextStep = () => {
      if (currentIndex < analyzingSteps.length) {
        setCurrentStep(currentIndex);
        currentIndex++;
        stepTimeout = setTimeout(nextStep, analyzingSteps[currentIndex - 1]?.duration || 2000);
      }
    };

    nextStep();

    return () => {
      clearTimeout(stepTimeout);
    };
  }, [isAnalyzing]);

  // Rotate through tips every 6 seconds when analyzing
  useEffect(() => {
    if (!isAnalyzing) return;

    const tipInterval = setInterval(() => {
      setCurrentTip((prev) => (prev + 1) % analyzingTips.length);
    }, 6000);

    return () => clearInterval(tipInterval);
  }, [isAnalyzing]);

  const parseCSV = (file: File): Promise<any[]> => {
    return new Promise((resolve, reject) => {
      Papa.parse(file, {
        header: true,
        dynamicTyping: true,
        skipEmptyLines: true,
        complete: (results) => {
          console.log(`✅ CSV Parsed: ${file.name}`);
          console.log(`   📊 Rows: ${results.data.length}`);
          console.log(`   📋 Columns:`, Object.keys(results.data[0] || {}));
          console.log(`   🔍 First 3 rows:`, results.data.slice(0, 3));
          resolve(results.data);
        },
        error: (error) => {
          console.error(`❌ CSV Parse Error: ${file.name}`, error);
          reject(error);
        }
      });
    });
  };

  const onDrop = useCallback(
    async (acceptedFiles: File[]) => {
      try {
        setIsProcessingPdf(true);

        // Parse CSV files immediately on client side
        const processedFiles: FileWithData[] = [];

        for (const file of acceptedFiles) {
          const ext = file.name.toLowerCase().split('.').pop();

          if (ext === 'csv') {
            try {
              const parsedData = await parseCSV(file);
              processedFiles.push({
                file,
                parsedData,
                rowCount: parsedData.length
              });
            } catch (error) {
              console.error(`Failed to parse CSV: ${file.name}`, error);
              alert(`Failed to parse CSV file "${file.name}". Please check the file format.`);
            }
          } else {
            // Images, PDFs, XLSX - keep as-is
            processedFiles.push({ file });
          }
        }

        // Update state with both file list and parsed data
        const newFiles = [...selectedFiles, ...processedFiles.map(f => f.file)];
        const newFilesWithData = [...filesWithData, ...processedFiles];

        setSelectedFiles(newFiles);
        setFilesWithData(newFilesWithData);
        onFilesSelected(newFiles);
      } catch (error) {
        console.error('Error processing files:', error);
        alert(`Error processing files: ${error instanceof Error ? error.message : 'Unknown error'}`);
      } finally {
        setIsProcessingPdf(false);
      }
    },
    [selectedFiles, filesWithData, onFilesSelected]
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'application/pdf': ['.pdf'],
      'image/*': ['.jpg', '.jpeg', '.png', '.gif', '.webp'],
      'text/csv': ['.csv'],
      'application/vnd.ms-excel': ['.xls'],
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'],
    },
    maxSize: 10 * 1024 * 1024, // 10MB
  });

  const removeFile = (index: number) => {
    const newFiles = selectedFiles.filter((_, i) => i !== index);
    const newFilesWithData = filesWithData.filter((_, i) => i !== index);
    setSelectedFiles(newFiles);
    setFilesWithData(newFilesWithData);
    onFilesSelected(newFiles);
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
  };

  const getFileIcon = (fileName: string) => {
    const ext = fileName.split('.').pop()?.toLowerCase();
    if (ext === 'pdf') {
      return (
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
        </svg>
      );
    } else if (['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(ext || '')) {
      return (
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
        </svg>
      );
    } else {
      return (
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
      );
    }
  };

  return (
    <div className="file-upload-container">
      <div className="form-header">
        <h2>Upload Bank Statements</h2>
        <p>
          Upload 12 months of bank statements for accurate cash flow analysis.
          PDFs are automatically converted to images for processing.
        </p>
      </div>

      {/* Top Navigation */}
      <PageNavigation
        onBack={onBack}
        showBack={!!onBack}
        onNext={selectedFiles.length > 0 ? onSubmit : undefined}
        nextLabel={`Analyze ${selectedFiles.length > 0 ? selectedFiles.length : ''} ${selectedFiles.length === 1 ? 'File' : 'Files'}`}
        showNext={selectedFiles.length > 0}
        nextDisabled={isAnalyzing || isProcessingPdf}
        nextLoading={isAnalyzing || isProcessingPdf}
      />

      {/* Existing Analysis Banner */}
      {existingAnalysis && onSkipToReview && (
        <div className="existing-analysis-banner">
          <div className="banner-icon">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <div className="banner-content">
            <h3>Analysis Already Complete</h3>
            <p>
              You've already analyzed your bank statements ({existingAnalysis.transactions?.length || 0} transactions found).
              You can continue to review or upload new files to re-analyze.
            </p>
            <div className="banner-actions">
              <button
                type="button"
                className="btn-continue-review"
                onClick={onSkipToReview}
              >
                <svg className="btn-icon" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
                Continue to Review
              </button>
              <span className="banner-divider">or upload new files below to re-analyze</span>
            </div>
          </div>
        </div>
      )}

      {isAnalyzing ? (
        /* Inline Analyzing Animation */
        <div className="analyzing-inline">
          {/* AI Brain Animation */}
          <div className="ai-brain-container">
            <div className="ai-brain">
              <div className="brain-pulse"></div>
              <div className="brain-pulse pulse-2"></div>
              <div className="brain-pulse pulse-3"></div>
              <svg
                className="brain-icon"
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1.5}
                  d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
                />
              </svg>
            </div>
          </div>

          {/* Content */}
          <div className="analyzing-content">
            <h2 className="analyzing-title">🤖 AI Analysis in Progress</h2>
            <p className="analyzing-subtitle">
              Analyzing {selectedFiles.length} {selectedFiles.length === 1 ? 'document' : 'documents'} with advanced AI
            </p>

            {/* Knight Rider Progress Bar */}
            <div className="progress-container">
              <div className="progress-bar knight-rider">
                <div className="knight-rider-bar"></div>
              </div>
            </div>

            {/* Current Step */}
            <div className="current-step">
              <div className="step-indicator">
                <span className="step-icon">✨</span>
                <span className="step-text">{analyzingSteps[currentStep]?.label}</span>
              </div>
            </div>

            {/* FAQ Tips Carousel */}
            <div className="tips-carousel">
              <div className="tip-content-wrapper">
                <div className="tip-icon">💡</div>
                <div className="tip-text">
                  <h4 className="tip-title">{analyzingTips[currentTip].title}</h4>
                  <p className="tip-description">{analyzingTips[currentTip].content}</p>
                </div>
              </div>
              <div className="tip-dots">
                {analyzingTips.map((_, index) => (
                  <div
                    key={index}
                    className={`tip-dot ${index === currentTip ? 'active' : ''}`}
                  />
                ))}
              </div>
            </div>

            <p className="analyzing-note">
              Sit back, this might take a few minutes...
            </p>
          </div>
        </div>
      ) : (
        /* Normal Dropzone */
        <div
          {...getRootProps()}
          className={`dropzone ${isDragActive ? 'active' : ''} ${isProcessingPdf ? 'disabled' : ''}`}
        >
          <input {...getInputProps()} disabled={isProcessingPdf} />
          <div className="dropzone-content">
            <div className="upload-icon">
              {isProcessingPdf ? (
                <div className="spinner-small"></div>
              ) : (
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                </svg>
              )}
            </div>
            <p className="dropzone-text">
              {isProcessingPdf
                ? 'Converting PDF pages to images...'
                : isDragActive
                ? 'Drop files here...'
                : 'Drag & drop bank statements here'}
            </p>
            {!isProcessingPdf && (
              <>
                <p className="dropzone-subtext">or click to browse</p>
                <p className="dropzone-formats">PDF, JPG, PNG, CSV, XLSX (max 10MB each)</p>
              </>
            )}
          </div>
        </div>
      )}

      {selectedFiles.length > 0 && (
        <div className="file-list">
          <div className="file-list-header">
            <h3>Uploaded Files ({selectedFiles.length})</h3>
            <p className="file-list-subtext">Review and remove any unwanted files</p>
          </div>

          <div className="file-cards">
            {filesWithData.map((fileData, index) => {
              const { file, rowCount } = fileData;
              return (
                <div key={index} className="file-card">
                  <div className="file-card-icon">{getFileIcon(file.name)}</div>
                  <div className="file-card-info">
                    <div className="file-card-name" title={file.name}>
                      {file.name}
                    </div>
                    <div className="file-card-size">
                      {formatFileSize(file.size)}
                      {rowCount && (
                        <span style={{ marginLeft: '0.5rem', color: '#10b981', fontWeight: 600 }}>
                          • {rowCount} rows parsed ✓
                        </span>
                      )}
                    </div>
                  </div>
                  <button
                    type="button"
                    className="file-remove-btn"
                    onClick={() => removeFile(index)}
                    disabled={isAnalyzing}
                    title="Remove file"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      )}

      <div className="upload-info-box">
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        <div>
          <strong>Tips for best results:</strong>
          <ul>
            <li>Upload 12 consecutive months of statements</li>
            <li>Ensure all pages are clear and readable</li>
            <li>Multiple formats accepted (PDF, images, CSV/Excel)</li>
            <li>AI will automatically categorize and analyze transactions</li>
          </ul>
        </div>
      </div>

      {/* Manual Entry Redirect Button */}
      <div style={{ textAlign: 'center', marginTop: '1.5rem' }}>
        <button
          type="button"
          className="btn-manual-entry"
          onClick={() => setShowManualEntryModal(true)}
          disabled={isAnalyzing || isProcessingPdf}
        >
          Don't have bank statements?
        </button>
      </div>

      {/* Manual Entry Modal */}
      {showManualEntryModal && (
        <div className="modal-overlay" onClick={() => setShowManualEntryModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Manual Entry</h3>
              <button
                className="modal-close"
                onClick={() => setShowManualEntryModal(false)}
                aria-label="Close modal"
              >
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="modal-body">
              <div className="modal-icon-info">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <p>
                If you want to enter your cash flow information manually, please use the existing <strong>All-In-One Calculator</strong>.
              </p>
              <p style={{ marginTop: '1rem', fontSize: '0.9rem', color: '#718096' }}>
                The Look Back Simulator is designed for detailed analysis using actual bank statements. For quick estimates with manual entry, our main calculator is better suited.
              </p>
            </div>
            <div className="modal-actions">
              <button
                className="btn-secondary"
                onClick={() => setShowManualEntryModal(false)}
              >
                Cancel
              </button>
              <a
                href="https://www.allinoneloan.com/#calculator"
                target="_blank"
                rel="noopener noreferrer"
                className="btn-primary"
                style={{ textDecoration: 'none' }}
              >
                Go to Calculator
                <svg className="btn-icon" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                </svg>
              </a>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
