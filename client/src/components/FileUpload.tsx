import { useCallback, useState } from 'react';
import { useDropzone } from 'react-dropzone';
import './FileUpload.css';

interface FileUploadProps {
  files: File[];
  onFilesSelected: (files: File[]) => void;
  onSubmit: () => void;
  onBack?: () => void;
  isAnalyzing?: boolean;
}

export default function FileUpload({
  files,
  onFilesSelected,
  onSubmit,
  onBack,
  isAnalyzing = false,
}: FileUploadProps) {
  const [selectedFiles, setSelectedFiles] = useState<File[]>(files);

  const onDrop = useCallback(
    (acceptedFiles: File[]) => {
      const newFiles = [...selectedFiles, ...acceptedFiles];
      setSelectedFiles(newFiles);
      onFilesSelected(newFiles);
    },
    [selectedFiles, onFilesSelected]
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
    setSelectedFiles(newFiles);
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
          We accept PDF, images, and Excel/CSV files.
        </p>
      </div>

      <div
        {...getRootProps()}
        className={`dropzone ${isDragActive ? 'active' : ''} ${isAnalyzing ? 'disabled' : ''}`}
      >
        <input {...getInputProps()} disabled={isAnalyzing} />
        <div className="dropzone-content">
          <div className="upload-icon">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
            </svg>
          </div>
          <p className="dropzone-text">
            {isDragActive ? 'Drop files here...' : 'Drag & drop bank statements here'}
          </p>
          <p className="dropzone-subtext">or click to browse</p>
          <p className="dropzone-formats">PDF, JPG, PNG, CSV, XLSX (max 10MB each)</p>
        </div>
      </div>

      {selectedFiles.length > 0 && (
        <div className="file-list">
          <div className="file-list-header">
            <h3>Uploaded Files ({selectedFiles.length})</h3>
            <p className="file-list-subtext">Review files before analyzing</p>
          </div>

          <div className="file-cards">
            {selectedFiles.map((file, index) => (
              <div key={index} className="file-card">
                <div className="file-card-icon">{getFileIcon(file.name)}</div>
                <div className="file-card-info">
                  <div className="file-card-name" title={file.name}>
                    {file.name}
                  </div>
                  <div className="file-card-size">{formatFileSize(file.size)}</div>
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
            ))}
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

      <div className="form-actions">
        {onBack && (
          <button type="button" className="btn-secondary" onClick={onBack} disabled={isAnalyzing}>
            <svg className="btn-icon" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Back
          </button>
        )}
        <button
          type="button"
          className="btn-primary"
          onClick={onSubmit}
          disabled={selectedFiles.length === 0 || isAnalyzing}
        >
          {isAnalyzing ? (
            <>
              <div className="spinner-small"></div>
              Analyzing Statements...
            </>
          ) : (
            <>
              Analyze with AI
              <svg className="btn-icon" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            </>
          )}
        </button>
      </div>
    </div>
  );
}
