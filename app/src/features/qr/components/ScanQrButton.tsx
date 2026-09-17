'use client';

import React from 'react';
import { QrCode } from 'lucide-react';
import { Button } from '@/components/ui';
import { useQrScanner } from '../hooks/useQrScanner';
import styles from './ScanQrButton.module.css';

export interface ScanQrButtonProps {
  variant?: 'primary' | 'secondary' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  fullWidth?: boolean;
  className?: string;
  label?: string;
}

export const ScanQrButton: React.FC<ScanQrButtonProps> = ({
  variant = 'secondary',
  size = 'md',
  fullWidth = false,
  className = '',
  label = 'Escanear QR',
}) => {
  const { isScanning, isProcessing, errorMessage, startScan } = useQrScanner();

  return (
    <div className={fullWidth ? styles.containerFullWidth : styles.container}>
      <Button
        type="button"
        variant={variant}
        size={size}
        fullWidth={fullWidth}
        onClick={startScan}
        isLoading={isScanning || isProcessing}
        disabled={isScanning || isProcessing}
        leftIcon={<QrCode size={size === 'sm' ? 16 : 18} />}
        className={`${styles.button} ${className}`}
        aria-label={label}
      >
        {isScanning ? 'Escaneando...' : isProcessing ? 'Cargando planta...' : label}
      </Button>

      {errorMessage && (
        <div className={styles.errorToast} role="alert">
          {errorMessage}
        </div>
      )}
    </div>
  );
};
