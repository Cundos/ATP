'use client';

import React, { useState, useEffect } from 'react';
import QRCode from 'qrcode';
import Link from 'next/link';
import { ArrowLeft, Printer } from 'lucide-react';
import { Button } from '@/components/ui';
import { getPlantCanonicalUrl } from '@/core/domain/services/canonicalUrl';
import styles from './PlantQrPrintView.module.css';

export interface PlantQrPrintViewProps {
  permanentCode: string;
  commonName: string;
  scientificName?: string | null;
  canonicalUrl?: string;
}

export const PlantQrPrintView: React.FC<PlantQrPrintViewProps> = ({
  permanentCode,
  commonName,
  scientificName,
  canonicalUrl: propCanonicalUrl,
}) => {
  const [svgContent, setSvgContent] = useState<string>('');
  const canonicalUrl = propCanonicalUrl || getPlantCanonicalUrl(permanentCode);

  useEffect(() => {
    let isMounted = true;

    QRCode.toString(canonicalUrl, {
      type: 'svg',
      margin: 1,
      errorCorrectionLevel: 'M',
      width: 220,
      color: {
        dark: '#000000',
        light: '#FFFFFF',
      },
    })
      .then((svg) => {
        if (isMounted) {
          setSvgContent(svg);
        }
      })
      .catch((err) => {
        console.error('Error generating printable QR:', err);
      });

    return () => {
      isMounted = false;
    };
  }, [canonicalUrl]);

  const handlePrint = () => {
    if (typeof window !== 'undefined') {
      window.print();
    }
  };

  return (
    <div className={styles.pageContainer} data-testid="plant-qr-print-page">
      {/* Navegación y controles en pantalla */}
      <div className={styles.screenNav}>
        <Link href={`/plants/${permanentCode}`} className={styles.backLink}>
          <ArrowLeft size={16} aria-hidden="true" />
          <span>Volver a la ficha</span>
        </Link>
        <div className={styles.screenActions}>
          <Button
            type="button"
            variant="primary"
            size="sm"
            onClick={handlePrint}
            leftIcon={<Printer size={15} />}
            data-testid="print-trigger-button"
          >
            Imprimir
          </Button>
        </div>
      </div>

      {/* Tarjeta Imprimible / Recortable */}
      <section
        className={styles.printCard}
        aria-label={`Identificador QR imprimible de ${commonName}`}
        data-testid="plant-qr-print-card"
      >
        <span className={styles.cutlineNotice} aria-hidden="true">
          — Línea de recorte —
        </span>

        <div
          className={styles.qrSvgWrapper}
          data-testid="printable-qr-svg"
          dangerouslySetInnerHTML={{ __html: svgContent }}
        />

        <h1 className={styles.permanentCode} data-testid="printable-qr-code">
          {permanentCode}
        </h1>

        <h2 className={styles.commonName} data-testid="printable-qr-common-name">
          {commonName}
        </h2>

        {scientificName && (
          <p className={styles.scientificName} data-testid="printable-qr-scientific-name">
            {scientificName}
          </p>
        )}

        <p className={styles.scanInstruction}>
          Escanear para abrir ficha
        </p>
      </section>
    </div>
  );
};
