import { useState } from 'react';
import './FileUpload.css';

interface Proposal {
  id: string;
  clientName: string;
  loanOfficerEmail: string;
  createdAt: string;
  expiresAt: string;
}

export default function MyProposals() {
  const [email, setEmail] = useState('');
  const [proposals, setProposals] = useState<Proposal[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!email || !email.includes('@')) {
      setError('Please enter a valid email address');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:3001';
      const response = await fetch(`${API_BASE}/api/my-proposals/${encodeURIComponent(email)}`);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Failed to fetch proposals');
      }

      setProposals(data.proposals || []);
      setIsAuthenticated(true);
    } catch (err: any) {
      console.error('Error fetching proposals:', err);
      setError(err.message || 'Failed to load proposals');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async (proposalId: string) => {
    if (!confirm('Are you sure you want to delete this proposal? This action cannot be undone.')) {
      return;
    }

    try {
      const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:3001';
      const response = await fetch(`${API_BASE}/api/proposals/${proposalId}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Failed to delete proposal');
      }

      // Remove from local state
      setProposals(proposals.filter((p) => p.id !== proposalId));
    } catch (err: any) {
      console.error('Error deleting proposal:', err);
      alert(`Failed to delete proposal: ${err.message}`);
    }
  };

  const handleCopyLink = (proposalId: string) => {
    const baseUrl = window.location.origin;
    const shareableUrl = `${baseUrl}/proposal/${proposalId}`;

    navigator.clipboard.writeText(shareableUrl);
    setCopiedId(proposalId);

    // Reset copied state after 2 seconds
    setTimeout(() => {
      setCopiedId(null);
    }, 2000);
  };

  const handleLogout = () => {
    setIsAuthenticated(false);
    setEmail('');
    setProposals([]);
    setError(null);
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const isExpired = (expiresAt: string) => {
    return new Date(expiresAt) < new Date();
  };

  if (!isAuthenticated) {
    return (
      <div className="file-upload-container">
        <div className="form-header">
          <h2>📋 My Proposals</h2>
          <p>Enter your email to view and manage your saved proposals</p>
        </div>

        <form onSubmit={handleLogin} style={{ maxWidth: '500px', margin: '0 auto' }}>
          <div className="input-card">
            <label htmlFor="email" className="input-label">
              <span className="label-text">Loan Officer Email</span>
              <span className="label-hint">The email you used when creating proposals</span>
            </label>

            <div className="input-wrapper">
              <span className="input-prefix">@</span>
              <input
                type="email"
                id="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                className="cash-flow-input"
                autoFocus
                required
              />
            </div>

            {error && (
              <div className="input-error">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
                {error}
              </div>
            )}
          </div>

          <button
            type="submit"
            className="btn-primary"
            disabled={isLoading}
            style={{ width: '100%', marginTop: '1rem' }}
          >
            {isLoading ? (
              <>
                <div className="spinner-small"></div>
                Loading...
              </>
            ) : (
              <>
                <svg
                  className="btn-icon"
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 5l7 7-7 7"
                  />
                </svg>
                View My Proposals
              </>
            )}
          </button>
        </form>

        <div className="upload-info-box" style={{ marginTop: '2rem' }}>
          <svg
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
          <div>
            <strong>About My Proposals</strong>
            <p style={{ marginTop: '0.5rem', lineHeight: '1.6' }}>
              This is where you can view all proposals you've created and shared with clients. You can:
            </p>
            <ul style={{ marginTop: '0.75rem' }}>
              <li>View a list of all your proposals</li>
              <li>Copy shareable links to send to clients</li>
              <li>Delete old or unwanted proposals</li>
              <li>Proposals automatically expire after 90 days</li>
            </ul>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="file-upload-container">
      <div className="form-header">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
          <div>
            <h2>📋 My Proposals</h2>
            <p style={{ marginBottom: 0 }}>Logged in as: <strong>{email}</strong></p>
          </div>
          <button
            onClick={handleLogout}
            style={{
              padding: '0.5rem 1rem',
              background: '#f1f5f9',
              border: '1px solid #cbd5e1',
              borderRadius: '6px',
              color: '#475569',
              fontSize: '0.875rem',
              fontWeight: '600',
              cursor: 'pointer',
            }}
          >
            Logout
          </button>
        </div>
        <p>{proposals.length} proposal{proposals.length !== 1 ? 's' : ''} found</p>
      </div>

      {proposals.length === 0 ? (
        <div
          style={{
            textAlign: 'center',
            padding: '4rem 2rem',
            background: '#f8fafc',
            borderRadius: '12px',
            border: '2px dashed #cbd5e1',
          }}
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            style={{ width: '64px', height: '64px', margin: '0 auto 1rem', color: '#94a3b8' }}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.5}
              d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
            />
          </svg>
          <h3 style={{ color: '#64748b', marginBottom: '0.5rem' }}>No Proposals Yet</h3>
          <p style={{ color: '#94a3b8' }}>
            Create your first proposal in the Proposal Builder to see it here!
          </p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {proposals.map((proposal) => {
            const expired = isExpired(proposal.expiresAt);
            const baseUrl = window.location.origin;
            const shareableUrl = `${baseUrl}/proposal/${proposal.id}`;

            return (
              <div
                key={proposal.id}
                style={{
                  background: expired ? '#fef2f2' : 'white',
                  border: `2px solid ${expired ? '#fecaca' : '#e2e8f0'}`,
                  borderRadius: '12px',
                  padding: '1.5rem',
                  opacity: expired ? 0.7 : 1,
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', gap: '1rem' }}>
                  <div style={{ flex: 1 }}>
                    <h3 style={{ margin: '0 0 0.5rem 0', fontSize: '1.25rem', color: '#1e293b' }}>
                      {proposal.clientName}
                    </h3>
                    <div style={{ fontSize: '0.875rem', color: '#64748b', marginBottom: '0.75rem' }}>
                      <div>Created: {formatDate(proposal.createdAt)}</div>
                      <div>
                        {expired ? (
                          <span style={{ color: '#dc2626', fontWeight: '600' }}>⚠️ Expired</span>
                        ) : (
                          <>Expires: {formatDate(proposal.expiresAt)}</>
                        )}
                      </div>
                    </div>

                    {!expired && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: '1rem' }}>
                        <input
                          type="text"
                          value={shareableUrl}
                          readOnly
                          style={{
                            flex: 1,
                            padding: '0.5rem',
                            border: '1px solid #cbd5e1',
                            borderRadius: '6px',
                            fontSize: '0.875rem',
                            color: '#475569',
                            background: '#f8fafc',
                          }}
                        />
                        <button
                          onClick={() => handleCopyLink(proposal.id)}
                          style={{
                            padding: '0.5rem 1rem',
                            background: copiedId === proposal.id ? '#10b981' : '#3b82f6',
                            color: 'white',
                            border: 'none',
                            borderRadius: '6px',
                            fontSize: '0.875rem',
                            fontWeight: '600',
                            cursor: 'pointer',
                            whiteSpace: 'nowrap',
                            transition: 'all 0.2s',
                          }}
                        >
                          {copiedId === proposal.id ? '✓ Copied!' : 'Copy Link'}
                        </button>
                      </div>
                    )}
                  </div>

                  <button
                    onClick={() => handleDelete(proposal.id)}
                    style={{
                      padding: '0.5rem',
                      background: '#fef2f2',
                      border: '1px solid #fecaca',
                      borderRadius: '6px',
                      color: '#dc2626',
                      cursor: 'pointer',
                      transition: 'all 0.2s',
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.background = '#fee2e2';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = '#fef2f2';
                    }}
                    title="Delete proposal"
                  >
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      style={{ width: '20px', height: '20px' }}
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                      />
                    </svg>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
