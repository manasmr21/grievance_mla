import React, { useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { publicGrievanceApi } from '../../services/api/api';
import { getApiError } from '../../services/api/axios.services';
import '../../styles/PublicGrievanceForm.css';
import '../../styles/TrackGrievance.css';

const MOBILE_MAX = 10;
const digitsOnly = (value, max) => String(value || '').replace(/\D/g, '').slice(0, max);

const formatDate = (value) => {
  if (!value) return '—';
  return new Date(value).toLocaleString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
};

const statusLabel = (status) => {
  const map = {
    SUBMITTED: 'Submitted',
    UNDER_REVIEW: 'Under Review',
    IN_PROGRESS: 'In Progress',
    RESOLVED: 'Resolved',
    REJECTED: 'Rejected',
  };
  return map[String(status || '').toUpperCase()] || status;
};

const TrackGrievance = () => {
  const [searchParams] = useSearchParams();
  const [ticketNo, setTicketNo] = useState(searchParams.get('ticket') || '');
  const [mobile, setMobile] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [fieldErrors, setFieldErrors] = useState({});
  const [result, setResult] = useState(null);

  const validate = () => {
    const errors = {};
    if (!ticketNo.trim()) errors.ticketNo = 'Ticket number is required.';
    const mobileDigits = digitsOnly(mobile, MOBILE_MAX);
    if (!mobileDigits) errors.mobile = 'Mobile number is required.';
    else if (!/^\d{10}$/.test(mobileDigits)) errors.mobile = 'Mobile number must be exactly 10 digits.';
    return errors;
  };

  const handleTrack = async (e) => {
    e.preventDefault();
    setError('');
    setResult(null);
    const errors = validate();
    setFieldErrors(errors);
    if (Object.keys(errors).length) return;

    setLoading(true);
    try {
      const res = await publicGrievanceApi.track(ticketNo.trim(), digitsOnly(mobile, MOBILE_MAX));
      if (res?.success) {
        setResult(res.data);
      } else {
        throw new Error(res?.message || 'Unable to track grievance');
      }
    } catch (err) {
      setError(getApiError(err).message || 'Unable to track grievance');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="public-grievance-page">
      <div className="public-grievance-container track-grievance-container">
        <div className="public-grievance-header">
          <h1>Track Grievance / ଅଭିଯୋଗ ଟ୍ରାକ୍</h1>
          <p>Enter your ticket number and mobile number to view application status</p>
        </div>

        <div className="pg-section">
          <div className="pg-section-title">
            <i className="fa-solid fa-magnifying-glass" />
            <span>Track Application / ଆବେଦନ ଟ୍ରାକ୍ କରନ୍ତୁ</span>
          </div>
          <div className="pg-section-body track-form-body">
            {error && <div className="pg-error pg-field-full">{error}</div>}

            <form onSubmit={handleTrack} noValidate className="track-form pg-field-full">
              <div className="track-form-grid">
                <div>
                  <label className="pg-label">
                    Ticket Number / ଟିକେଟ୍ ନମ୍ବର <span className="required">*</span>
                  </label>
                  <input
                    className={`pg-input${fieldErrors.ticketNo ? ' pg-input-invalid' : ''}`}
                    value={ticketNo}
                    onChange={(e) => { setTicketNo(e.target.value); setFieldErrors((p) => ({ ...p, ticketNo: undefined })); }}
                    placeholder="e.g. GRV-123456-7890"
                  />
                  {fieldErrors.ticketNo && <p className="pg-field-error">{fieldErrors.ticketNo}</p>}
                </div>
                <div>
                  <label className="pg-label">
                    Mobile Number / ମୋବାଇଲ୍ ନମ୍ବର <span className="required">*</span>
                  </label>
                  <div className="pg-phone-row">
                    <input className="pg-input pg-phone-prefix" value="+91" readOnly tabIndex={-1} />
                    <input
                      className={`pg-input${fieldErrors.mobile ? ' pg-input-invalid' : ''}`}
                      value={mobile}
                      type="tel"
                      inputMode="numeric"
                      maxLength={MOBILE_MAX}
                      onChange={(e) => { setMobile(digitsOnly(e.target.value, MOBILE_MAX)); setFieldErrors((p) => ({ ...p, mobile: undefined })); }}
                      placeholder="10-digit number"
                    />
                  </div>
                  {fieldErrors.mobile && <p className="pg-field-error">{fieldErrors.mobile}</p>}
                </div>
              </div>
              <button type="submit" className="pg-submit-btn track-submit-btn" disabled={loading}>
                {loading ? 'Searching...' : 'Track Status / ସ୍ଥିତି ଦେଖନ୍ତୁ'}
              </button>
            </form>
          </div>
        </div>

        {result && (
          <div className="pg-section track-result-section">
            <div className="pg-section-title">
              <i className="fa-solid fa-clock-rotate-left" />
              <span>Application Timeline / ଆବେଦନ ସମୟରେଖା</span>
            </div>
            <div className="pg-section-body track-result-body">
              <div className="track-summary">
                <div>
                  <span className="track-summary-label">Ticket No</span>
                  <strong className="track-ticket">{result.public_ticket_no}</strong>
                </div>
                <div>
                  <span className="track-summary-label">Current Status</span>
                  <span className={`track-status-badge status-${String(result.status || '').toLowerCase()}`}>
                    {statusLabel(result.status)}
                  </span>
                </div>
              </div>

              <div className="track-details-grid">
                <p><strong>Subject:</strong> {result.subject}</p>
                <p><strong>Category:</strong> {result.category?.name || '—'}</p>
                <p><strong>Jurisdiction:</strong> {result.jurisdiction_type === 'municipality' ? 'Municipality' : 'Block'}</p>
                <p><strong>State:</strong> {result.state?.name || '—'}</p>
                <p><strong>District:</strong> {result.district?.name || '—'}</p>
                <p><strong>{result.jurisdiction_type === 'municipality' ? 'Municipality' : 'Block'}:</strong> {result.area?.name || '—'}</p>
                {result.sub_area?.name && (
                  <p><strong>{result.jurisdiction_type === 'municipality' ? 'Ward' : 'Gram Panchayat'}:</strong> {result.sub_area.name}</p>
                )}
                {result.settlement?.name && (
                  <p><strong>{result.jurisdiction_type === 'municipality' ? 'Locality' : 'Village'}:</strong> {result.settlement.name}</p>
                )}
                {result.description && (
                  <p className="track-detail-full"><strong>Description:</strong> {result.description}</p>
                )}
              </div>

              <div className="track-timeline">
                {(result.timeline || []).map((step, index) => (
                  <div key={step.key || index} className={`track-timeline-item ${step.status}`}>
                    <div className="track-timeline-marker">
                      <span className="track-timeline-dot" />
                      {index < (result.timeline?.length || 0) - 1 && <span className="track-timeline-line" />}
                    </div>
                    <div className="track-timeline-content">
                      <div className="track-timeline-head">
                        <h3>{step.title}</h3>
                        <span className={`track-step-badge ${step.status}`}>{step.status}</span>
                      </div>
                      <p>{step.description}</p>
                      {step.at && <time>{formatDate(step.at)}</time>}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        <div className="track-footer-links">
          <Link to="/submit-grievance">Submit a new grievance</Link>
          <Link to="/login">Go to login</Link>
        </div>
      </div>
    </div>
  );
};

export default TrackGrievance;
