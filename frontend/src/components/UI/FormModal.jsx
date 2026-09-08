import React from 'react';
import Modal from './Modal';

/**
 * Modal wrapper for CRUD forms with standard footer actions.
 */
const FormModal = ({
  isOpen,
  onClose,
  title,
  subtitle,
  children,
  onSubmit,
  submitLabel = 'Save',
  cancelLabel = 'Cancel',
  loading = false,
  maxWidth = '500px',
}) => (
  <Modal isOpen={isOpen} onClose={onClose} title={title} subtitle={subtitle} maxWidth={maxWidth}>
    <form
      onSubmit={(e) => {
        e.preventDefault();
        onSubmit?.(e);
      }}
    >
      {children}
      <div className="modal-footer" style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '20px' }}>
        <button type="button" className="cm-btn-secondary" onClick={onClose} disabled={loading}>
          {cancelLabel}
        </button>
        <button type="submit" className="cm-btn-primary" disabled={loading}>
          {loading ? 'Saving...' : submitLabel}
        </button>
      </div>
    </form>
  </Modal>
);

export default FormModal;
