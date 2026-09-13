'use client';

import React, { useState, useEffect } from 'react';
import QRCode from 'qrcode';
import Link from 'next/link';
import { Download, Copy, Check, Printer } from 'lucide-react';
import { Button, Toast } from '@/components/ui';
import { getPlantCanonicalUrl } from '@/core/domain/services/canonicalUrl';
import styles from './PlantQrCode.module.css';

export interface PlantQrCodeProps {
  permanentCode: string;
  canonicalUrl?: string;
  size?: number;
  showLabel?: boolean;
  showActions?: boolean;
  showPrintButton?: boolean;
  className?: string;
}

export const PlantQrCode: React.FC<PlantQrCodeProps> = ({
  permanentCode,
  canonicalUrl: propCanonicalUrl,
  size = 160,
  showLabel = true,
  showActions = true,
  showPrintButton = true,
  className = '',
}) => {
  const [svgContent, setSvgContent] = useState<string>('');
  const [copied, setCopied] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const canonicalUrl = propCanonicalUrl || getPlantCanonicalUrl(permanentCode);

  useEffect(() => {
    let isMounted = true;

    QRCode.toString(canonicalUrl, {
      type: 'svg',
      margin: 1,
      errorCorrectionLevel: 'M',
      width: size,
      color: {
        dark: '#1C1E1B', // deep carbon primary
        light: '#FFFFFF', // pure white background for scan contrast
      },
    })
      .then((svg) => {
        if (isMounted) {
          setSvgContent(svg);
        }
      })
      .catch((err) => {
        console.error('Error generating QR code:', err);
      });

    return () => {
      isMounted = false;
    };
  }, [canonicalUrl, size]);

  const handleCopyLink = async () => {
    try {
      if (navigator?.clipboard?.writeText) {
        await navigator.clipboard.writeText(canonicalUrl);
        setCopied(true);
        setToastMessage('Enlace canónico copiado al portapapeles');
        setTimeout(() => setCopied(false), 2500);
      } else {
        // Fallback para entornos sin soporte de Clipboard API
        const textarea = document.createElement('textarea');
        textarea.value = canonicalUrl;
        document.body.appendChild(textarea);
        textarea.select();
        document.execCommand('copy');
        document.body.removeChild(textarea);
        setCopied(true);
        setToastMessage('Enlace canónico copiado al portapapeles');
        setTimeout(() => setCopied(false), 2500);
      }
    } catch {
      setToastMessage('No se pudo copiar el enlace.');
    }
  };

  const handleDownloadSvg = () => {
    if (!svgContent) return;

    const blob = new Blob([svgContent], { type: 'image/svg+xml;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${permanentCode}-qr.svg`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <div className={`${styles.qrWrapper} ${className}`} data-testid="plant-qr-code-wrapper">
      {toastMessage && (
        <div className={styles.toastOverlay}>
          <Toast
            type="success"
            message={toastMessage}
            onClose={() => setToastMessage(null)}
          />
        </div>
      )}

      <div
        className={styles.qrContainer}
        data-testid="plant-qr-container"
        aria-label={`Código QR para ficha ${permanentCode}`}
      >
        <div
          className={styles.qrSvgBox}
          data-testid="plant-qr-svg-box"
          // Safe SVG string generated purely from internal domain canonical URL and numeric coordinates
          dangerouslySetInnerHTML={{ __html: svgContent }}
        />

        {showLabel && (
          <span className={styles.qrLabel} data-testid="plant-qr-label">
            {permanentCode}
          </span>
        )}
      </div>

      <p className={styles.canonicalUrlPreview} title={canonicalUrl}>
        {canonicalUrl}
      </p>

      {showActions && (
        <div className={styles.actionsRow} data-testid="plant-qr-actions">
          <Button
            type="button"
            variant="secondary"
            size="sm"
            onClick={handleCopyLink}
            leftIcon={copied ? <Check size={15} /> : <Copy size={15} />}
            className={styles.actionButton}
            aria-label="Copiar enlace"
          >
            {copied ? 'Enlace copiado' : 'Copiar enlace'}
          </Button>

          <Button
            type="button"
            variant="secondary"
            size="sm"
            onClick={handleDownloadSvg}
            leftIcon={<Download size={15} />}
            disabled={!svgContent}
            className={styles.actionButton}
            aria-label="Descargar SVG"
          >
            Descargar SVG
          </Button>

          {showPrintButton && (
            <Link
              href={`/plants/${permanentCode}/qr`}
              className={styles.actionButton}
              style={{ textDecoration: 'none' }}
              data-testid="plant-qr-print-link"
            >
              <Button
                type="button"
                variant="ghost"
                size="sm"
                leftIcon={<Printer size={15} />}
                className={styles.actionButton}
              >
                Vista imprimible
              </Button>
            </Link>
          )}
        </div>
      )}
    </div>
  );
};
