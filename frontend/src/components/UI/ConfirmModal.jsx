import React, { useState } from 'react';

/**
 * Reusable confirmation modal.
 *
 * Props:
 *   isOpen        {boolean}         – controls visibility
 *   onClose       {function}        – called on Cancel
 *   onConfirm     {function}        – called on Confirm (may be async)
 *   title         {string}          – modal heading
 *   message       {string}          – main body question (use {entityName} placeholder or write full sentence)
 *   entityName    {string}          – highlighted name shown in red inside the message (optional)
 *   confirmLabel  {string}          – confirm button text (default "Confirm")
 *   variant       {string}          – "danger" | "warning"  (default "danger")
 *   showWarning   {boolean}         – show "Related records may be affected." alert (default true for danger)
 */
const ConfirmModal = ({
  isOpen,
  onClose,
  onConfirm,
  title = 'Are you sure?',
  message,
  entityName,
  confirmLabel = 'Confirm',
  variant = 'danger',
  showWarning,
  hideSubtitle = false,
}) => {
  const [loading, setLoading] = useState(false);

  if (!isOpen) return null;

  const isDanger = variant !== 'warning';
  const accentColor  = isDanger ? '#ef4444' : '#f59e0b';
  const iconBg       = isDanger ? '#fee2e2' : '#fef3c7';
  const headerIcon   = isDanger ? 'fa-solid fa-trash' : 'fa-solid fa-triangle-exclamation';
  const confirmIcon  = isDanger ? 'fa-solid fa-trash' : 'fa-solid fa-check';
  const displayWarning = showWarning !== undefined ? showWarning : isDanger;

  const handleConfirm = async () => {
    setLoading(true);
    try {
      await onConfirm();
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="cfm-overlay">
      <div className="cfm-modal">
        {/* Header */}
        <div className="cfm-header">
          <div className="cfm-header-left">
            <div className="cfm-icon-circle" style={{ background: iconBg }}>
              <i className={headerIcon} style={{ color: accentColor, fontSize: '1.1rem' }} />
            </div>
            <h3 className="cfm-title">{title}</h3>
          </div>
          <button className="cfm-close" onClick={onClose} disabled={loading} aria-label="Close">
            <i className="fa-solid fa-xmark" />
          </button>
        </div>

        <div className="cfm-divider" />

        {/* Body */}
        <div className="cfm-body">
          <div className="cfm-body-content">
            <div className="cfm-left-bar" style={{ background: accentColor }} />
            <div className="cfm-text-block">
              <p className="cfm-question">
                {entityName ? (
                  <>
                    {message || 'Are you sure you want to proceed with'}{' '}
                    <span style={{ color: accentColor, fontWeight: 700 }}>"{entityName}"</span>?
                  </>
                ) : (
                  message
                )}
              </p>
              {!hideSubtitle && <p className="cfm-subtitle">This action cannot be undone.</p>}

              {displayWarning && (
                <div className="cfm-warning-box">
                  <i className="fa-solid fa-triangle-exclamation cfm-warning-icon" />
                  <span>Related records may be affected.</span>
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="cfm-divider" />

        {/* Footer */}
        <div className="cfm-footer">
          <button className="cfm-btn-cancel" type="button" onClick={onClose} disabled={loading}>
            Cancel
          </button>
          <button
            className="cfm-btn-confirm"
            type="button"
            onClick={handleConfirm}
            disabled={loading}
            style={{ background: accentColor }}
          >
            {loading ? (
              <>
                <i className="fa-solid fa-spinner fa-spin" />
                Please wait...
              </>
            ) : (
              <>
                <i className={confirmIcon} />
                {confirmLabel}
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ConfirmModal;
