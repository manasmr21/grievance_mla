import React from 'react';

const PasswordResetSection = ({
  email,
  sending,
  message,
  error,
  onRequestReset,
  variant = 'standalone',
  title = 'Password & Security',
  description = 'We will email a secure link to set a new password. The link expires in 15 minutes.',
  buttonLabel = 'Send Reset Link',
}) => {
  const buttonContent = sending ? (
    <>
      <i className="fa-solid fa-spinner fa-spin" aria-hidden="true" />
      Sending...
    </>
  ) : (
    <>
      <i className="fa-solid fa-key" aria-hidden="true" />
      {buttonLabel}
    </>
  );

  const body = (
    <>
      <div className="password-reset-row">
        <div className="setting-label">
          <span>Password</span>
          <strong>**********</strong>
          {email ? (
            <p className="reset-email-label">
              Reset link will be sent to <strong>{email}</strong>
            </p>
          ) : (
            <p className="reset-email-label reset-email-label--missing">No email on file for this account.</p>
          )}
        </div>
        <button
          type="button"
          className={variant === 'embedded' ? 'outline-btn' : 'reset-password-btn'}
          onClick={onRequestReset}
          disabled={sending || !email}
        >
          {buttonContent}
        </button>
      </div>

      {message && (
        <div className="success-banner" role="status">
          <i className="fa-solid fa-circle-check" aria-hidden="true" />
          <span>{message}</span>
        </div>
      )}

      {error && (
        <div className="error-banner" role="alert">
          <i className="fa-solid fa-circle-exclamation" aria-hidden="true" />
          <span>{error}</span>
        </div>
      )}
    </>
  );

  if (variant === 'embedded') {
    return <div className="password-reset-embedded">{body}</div>;
  }

  return (
    <section className="dashboard-card password-reset-card">
      <div className="card-head">
        <h3>{title}</h3>
        <p className="card-head-description">{description}</p>
      </div>
      <div className="password-reset-body">{body}</div>
    </section>
  );
};

export default PasswordResetSection;
