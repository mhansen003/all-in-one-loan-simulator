import { useState } from 'react';
import { CMG_BRANDING } from '../constants/cmgBranding';
import './SignatureGenerator.css';

interface SignatureData {
  name: string;
  title: string;
  phone: string;
  email: string;
  nmls: string;
  officeAddress: string;
  photoUrl: string;
}

export function SignatureGenerator() {
  const [signatureData, setSignatureData] = useState<SignatureData>({
    name: '',
    title: '',
    phone: '',
    email: '',
    nmls: '',
    officeAddress: '',
    photoUrl: '',
  });

  const [showPreview, setShowPreview] = useState(false);
  const [copySuccess, setCopySuccess] = useState(false);

  const handleInputChange = (field: keyof SignatureData, value: string) => {
    setSignatureData(prev => ({ ...prev, [field]: value }));
  };

  const generateSignatureHTML = (): string => {
    return `<table cellpadding="0" cellspacing="0" border="0" style="font-family: Arial, sans-serif; font-size: 14px; line-height: 1.4; color: #333;">
  <tr>
    <td style="padding-right: 20px; vertical-align: top;">
      ${signatureData.photoUrl ? `<img src="${signatureData.photoUrl}" alt="${signatureData.name}" style="width: 120px; height: 120px; border-radius: 60px; object-fit: cover;" />` : `<div style="width: 120px; height: 120px; border-radius: 60px; background: ${CMG_BRANDING.colors.primary}; display: flex; align-items: center; justify-content: center; color: white; font-size: 36px; font-weight: bold;">${signatureData.name.split(' ').map(n => n[0]).join('').toUpperCase()}</div>`}
    </td>
    <td style="vertical-align: top; border-left: 3px solid ${CMG_BRANDING.colors.primary}; padding-left: 20px;">
      <div style="margin-bottom: 10px;">
        <div style="font-size: 18px; font-weight: bold; color: ${CMG_BRANDING.colors.secondary}; margin-bottom: 4px;">${signatureData.name}</div>
        <div style="font-size: 14px; color: ${CMG_BRANDING.colors.darkGray}; margin-bottom: 2px;">${signatureData.title}</div>
        ${signatureData.nmls ? `<div style="font-size: 13px; color: ${CMG_BRANDING.colors.darkGray};">NMLS# ${signatureData.nmls}</div>` : ''}
      </div>
      <div style="margin-bottom: 10px;">
        <img src="${CMG_BRANDING.logo.url}" alt="${CMG_BRANDING.logo.alt}" style="height: 30px; margin-bottom: 8px;" /><br />
        <div style="font-size: 12px; color: ${CMG_BRANDING.colors.primary}; font-weight: 600; margin-bottom: 4px;">${CMG_BRANDING.company.tagline}</div>
      </div>
      <div style="font-size: 13px; color: ${CMG_BRANDING.colors.text};">
        ${signatureData.phone ? `<div style="margin-bottom: 3px;">📞 <a href="tel:${signatureData.phone.replace(/\D/g, '')}" style="color: ${CMG_BRANDING.colors.text}; text-decoration: none;">${signatureData.phone}</a></div>` : ''}
        ${signatureData.email ? `<div style="margin-bottom: 3px;">✉️ <a href="mailto:${signatureData.email}" style="color: ${CMG_BRANDING.colors.primary}; text-decoration: none;">${signatureData.email}</a></div>` : ''}
        ${signatureData.officeAddress ? `<div style="margin-bottom: 3px;">📍 ${signatureData.officeAddress}</div>` : ''}
        <div style="margin-bottom: 3px;">🌐 <a href="${CMG_BRANDING.company.website}" style="color: ${CMG_BRANDING.colors.primary}; text-decoration: none;">${CMG_BRANDING.company.website}</a></div>
      </div>
      <div style="margin-top: 10px; padding-top: 10px; border-top: 1px solid #e0e0e0;">
        <div style="font-size: 11px; color: #999;">
          ${CMG_BRANDING.legal.nmls} | ${CMG_BRANDING.legal.equalHousing}
        </div>
      </div>
    </td>
  </tr>
</table>`;
  };

  const handleCopySignature = async () => {
    const htmlSignature = generateSignatureHTML();

    try {
      // Copy as HTML (works in most modern browsers)
      const blob = new Blob([htmlSignature], { type: 'text/html' });
      const clipboardItem = new ClipboardItem({ 'text/html': blob });
      await navigator.clipboard.write([clipboardItem]);

      setCopySuccess(true);
      setTimeout(() => setCopySuccess(false), 3000);
    } catch (err) {
      // Fallback: copy as plain text
      await navigator.clipboard.writeText(htmlSignature);
      setCopySuccess(true);
      setTimeout(() => setCopySuccess(false), 3000);
    }
  };

  const isFormValid = signatureData.name && signatureData.email && signatureData.phone;

  return (
    <div className="signature-generator">
      <div className="signature-form-section">
        <h3>Your Information</h3>
        <p className="signature-help-text">
          Enter your details to generate a professional CMG Financial email signature
        </p>

        <div className="signature-form">
          <div className="form-group">
            <label htmlFor="sig-name" className="form-label required">Full Name</label>
            <input
              type="text"
              id="sig-name"
              className="form-input"
              placeholder="John Doe"
              value={signatureData.name}
              onChange={(e) => handleInputChange('name', e.target.value)}
            />
          </div>

          <div className="form-group">
            <label htmlFor="sig-title" className="form-label required">Title/Position</label>
            <input
              type="text"
              id="sig-title"
              className="form-input"
              placeholder="Senior Loan Officer"
              value={signatureData.title}
              onChange={(e) => handleInputChange('title', e.target.value)}
            />
          </div>

          <div className="signature-form-row">
            <div className="form-group">
              <label htmlFor="sig-phone" className="form-label required">Phone</label>
              <input
                type="tel"
                id="sig-phone"
                className="form-input"
                placeholder="(555) 123-4567"
                value={signatureData.phone}
                onChange={(e) => handleInputChange('phone', e.target.value)}
              />
            </div>

            <div className="form-group">
              <label htmlFor="sig-email" className="form-label required">Email</label>
              <input
                type="email"
                id="sig-email"
                className="form-input"
                placeholder="you@cmghomeloans.com"
                value={signatureData.email}
                onChange={(e) => handleInputChange('email', e.target.value)}
              />
            </div>
          </div>

          <div className="form-group">
            <label htmlFor="sig-nmls" className="form-label">NMLS Number</label>
            <input
              type="text"
              id="sig-nmls"
              className="form-input"
              placeholder="123456"
              value={signatureData.nmls}
              onChange={(e) => handleInputChange('nmls', e.target.value)}
            />
            <span className="form-help-text">Your NMLS license number (optional)</span>
          </div>

          <div className="form-group">
            <label htmlFor="sig-address" className="form-label">Office Address</label>
            <input
              type="text"
              id="sig-address"
              className="form-input"
              placeholder="123 Main Street, City, ST 12345"
              value={signatureData.officeAddress}
              onChange={(e) => handleInputChange('officeAddress', e.target.value)}
            />
          </div>

          <div className="form-group">
            <label htmlFor="sig-photo" className="form-label">Photo URL</label>
            <input
              type="url"
              id="sig-photo"
              className="form-input"
              placeholder="https://example.com/photo.jpg"
              value={signatureData.photoUrl}
              onChange={(e) => handleInputChange('photoUrl', e.target.value)}
            />
            <span className="form-help-text">Direct link to your professional photo (optional)</span>
          </div>

          <div className="signature-actions">
            <button
              className="btn-secondary"
              onClick={() => setShowPreview(!showPreview)}
              disabled={!isFormValid}
            >
              {showPreview ? 'Hide Preview' : 'Preview Signature'}
            </button>
            <button
              className="btn-primary"
              onClick={handleCopySignature}
              disabled={!isFormValid}
            >
              {copySuccess ? '✓ Copied!' : 'Copy HTML Signature'}
            </button>
          </div>
        </div>
      </div>

      {showPreview && isFormValid && (
        <div className="signature-preview-section">
          <h3>Preview</h3>
          <p className="signature-help-text">
            This is how your signature will appear in emails
          </p>
          <div className="signature-preview-box">
            <div dangerouslySetInnerHTML={{ __html: generateSignatureHTML() }} />
          </div>
          <div className="signature-instructions">
            <h4>How to Add to Your Email Client:</h4>
            <div className="instructions-list">
              <div className="instruction-item">
                <strong>Outlook Desktop:</strong>
                <ol>
                  <li>Click "Copy HTML Signature" button above</li>
                  <li>Open Outlook → File → Options → Mail → Signatures</li>
                  <li>Click "New" to create a signature</li>
                  <li>Paste (Ctrl+V) into the signature editor</li>
                  <li>Click "OK" to save</li>
                </ol>
              </div>
              <div className="instruction-item">
                <strong>Gmail:</strong>
                <ol>
                  <li>Click "Copy HTML Signature" button above</li>
                  <li>Open Gmail → Settings (gear icon) → See all settings</li>
                  <li>Scroll to "Signature" section</li>
                  <li>Click "+ Create new" signature</li>
                  <li>Paste (Ctrl+V) into the signature box</li>
                  <li>Scroll down and click "Save Changes"</li>
                </ol>
              </div>
              <div className="instruction-item">
                <strong>Outlook 365 (Web):</strong>
                <ol>
                  <li>Click "Copy HTML Signature" button above</li>
                  <li>Open Outlook.com → Settings → View all Outlook settings</li>
                  <li>Go to Mail → Compose and reply</li>
                  <li>Under "Email signature", paste (Ctrl+V)</li>
                  <li>Click "Save"</li>
                </ol>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
