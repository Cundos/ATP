'use client';

import React from 'react';
import { CheckCircle2, AlertCircle, Info, X } from 'lucide-react';
import styles from './Toast.module.css';

export interface ToastProps {
  type?: 'success' | 'error' | 'info';
  message: string;
  onClose?: () => void;
  className?: string;
}

export function Toast({
  type = 'info',
  message,
  onClose,
  className = '',
}: ToastProps) {
  const icons = {
    success: <CheckCircle2 size={20} className={styles.icon} />,
    error: <AlertCircle size={20} className={styles.icon} />,
    info: <Info size={20} className={styles.icon} />,
  };

  return (
    <div
      className={`${styles.toast} ${styles[type]} ${className}`}
      role="status"
      aria-live="polite"
    >
      {icons[type]}
      <span className={styles.message}>{message}</span>
      {onClose && (
        <button
          type="button"
          onClick={onClose}
          className={styles.closeButton}
          aria-label="Cerrar notificación"
        >
          <X size={16} />
        </button>
      )}
    </div>
  );
}
