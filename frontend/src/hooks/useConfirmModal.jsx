import { useCallback, useState } from 'react';
import ConfirmModal from '../components/UI/ConfirmModal';

const CLOSED = {
  isOpen: false,
  title: '',
  message: '',
  entityName: '',
  confirmLabel: 'Confirm',
  variant: 'danger',
  showWarning: undefined,
  hideSubtitle: false,
  onConfirm: null,
};

/**
 * Shared confirm-dialog state used across admin CRUD pages.
 *
 * @returns {{ showConfirm: Function, closeConfirm: Function, ConfirmDialog: React.ComponentType }}
 */
export function useConfirmModal() {
  const [confirmModal, setConfirmModal] = useState(CLOSED);

  const showConfirm = useCallback((opts) => {
    setConfirmModal({
      ...CLOSED,
      ...opts,
      isOpen: true,
    });
  }, []);

  const closeConfirm = useCallback(() => {
    setConfirmModal((prev) => ({ ...prev, isOpen: false }));
  }, []);

  const ConfirmDialog = useCallback(
    () => (
      <ConfirmModal
        isOpen={confirmModal.isOpen}
        onClose={closeConfirm}
        onConfirm={async () => {
          if (confirmModal.onConfirm) {
            await confirmModal.onConfirm();
          }
          closeConfirm();
        }}
        title={confirmModal.title}
        message={confirmModal.message}
        entityName={confirmModal.entityName}
        confirmLabel={confirmModal.confirmLabel}
        variant={confirmModal.variant}
        showWarning={confirmModal.showWarning}
        hideSubtitle={confirmModal.hideSubtitle}
      />
    ),
    [confirmModal, closeConfirm],
  );

  return { confirmModal, showConfirm, closeConfirm, ConfirmDialog };
}

export default useConfirmModal;
