'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Search,
  X,
  BookOpen,
  AlertCircle,
  Loader2,
  Check,
  Leaf,
  Trash2,
  RefreshCw,
} from 'lucide-react';
import { Button } from '@/components/ui';
import styles from './BotanicalReferencePicker.module.css';

export interface BotanicalSearchResult {
  pid: string;
  displayName: string;
  alias: string | null;
  imageUrl: string | null;
}

export interface SelectedBotanicalReference {
  pid: string;
  displayName: string;
  alias?: string | null;
  imageUrl?: string | null;
  isExistingLocal?: boolean;
}

export interface BotanicalReferencePickerProps {
  selectedReference?: SelectedBotanicalReference | null;
  onSelectReference: (result: BotanicalSearchResult) => void;
  onClearReference: () => void;
  disabled?: boolean;
}

export function BotanicalReferencePicker({
  selectedReference,
  onSelectReference,
  onClearReference,
  disabled = false,
}: BotanicalReferencePickerProps) {
  const [query, setQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [results, setResults] = useState<BotanicalSearchResult[]>([]);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [hasSearched, setHasSearched] = useState(false);
  const [isSelectingAnother, setIsSelectingAnother] = useState(false);
  const [imageLoadFailed, setImageLoadFailed] = useState(false);

  const abortControllerRef = useRef<AbortController | null>(null);
  const latestRequestIdRef = useRef<number>(0);

  const performSearch = useCallback(async (searchQuery: string) => {
    const trimmed = searchQuery.trim();
    if (trimmed.length < 2) {
      setResults([]);
      setIsSearching(false);
      setErrorMessage(null);
      setHasSearched(false);
      return;
    }

    // Cancel in-flight request to avoid race conditions
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    const abortController = new AbortController();
    abortControllerRef.current = abortController;
    const currentRequestId = ++latestRequestIdRef.current;

    setIsSearching(true);
    setErrorMessage(null);
    setHasSearched(true);

    try {
      const encodedQuery = encodeURIComponent(trimmed);
      const res = await fetch(`/api/integrations/plantbook/search?q=${encodedQuery}`, {
        signal: abortController.signal,
      });

      // Ignore if a newer request was dispatched
      if (currentRequestId !== latestRequestIdRef.current) {
        return;
      }

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        const message =
          errorData.error ||
          (res.status === 429
            ? 'Open Plantbook alcanzó temporalmente su límite. Podés continuar sin referencia.'
            : 'Open Plantbook no está disponible en este momento. Podés continuar sin referencia.');
        setErrorMessage(message);
        setResults([]);
        return;
      }

      const data = await res.json();
      setResults(data.results || []);
    } catch (err: unknown) {
      if ((err as { name?: string })?.name === 'AbortError') {
        return; // Normal cancellation
      }
      if (currentRequestId === latestRequestIdRef.current) {
        setErrorMessage('Open Plantbook no está disponible en este momento. Podés continuar sin referencia.');
        setResults([]);
      }
    } finally {
      if (currentRequestId === latestRequestIdRef.current) {
        setIsSearching(false);
      }
    }
  }, []);

  // Debounced search trigger (400ms)
  useEffect(() => {
    const timer = setTimeout(() => {
      if (query.trim().length >= 2) {
        performSearch(query);
      } else {
        setResults([]);
        setErrorMessage(null);
        setHasSearched(false);
        setIsSearching(false);
      }
    }, 400);

    return () => clearTimeout(timer);
  }, [query, performSearch]);

  // Clean up abort controller on unmount
  useEffect(() => {
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, []);

  const handleSelect = (item: BotanicalSearchResult) => {
    setImageLoadFailed(false);
    onSelectReference(item);
    setQuery('');
    setResults([]);
    setErrorMessage(null);
    setHasSearched(false);
    setIsSelectingAnother(false);
  };

  const handleDismissSearch = () => {
    setQuery('');
    setResults([]);
    setErrorMessage(null);
    setHasSearched(false);
    setIsSelectingAnother(false);
  };

  const handleClear = () => {
    setImageLoadFailed(false);
    onClearReference();
    setQuery('');
    setResults([]);
    setErrorMessage(null);
    setHasSearched(false);
    setIsSelectingAnother(false);
  };

  // If a reference is already selected and user is not actively searching to change it
  if (selectedReference && !isSelectingAnother) {
    return (
      <div className={styles.container}>
        <div className={styles.selectedCard}>
          <div className={styles.selectedHeader}>
            <div className={styles.badgeGroup}>
              <span className={styles.referenceBadge}>
                <BookOpen size={13} />
                Referencia Botánica
              </span>
              <span className={styles.pidBadge}>{selectedReference.pid}</span>
            </div>
            <Check size={16} color="var(--color-primary-600, #16a34a)" />
          </div>

          <div className={styles.selectedBody}>
            <div className={styles.imageContainer}>
              {selectedReference.imageUrl && !imageLoadFailed ? (
                /* eslint-disable-next-line @next/next/no-img-element */
                <img
                  src={selectedReference.imageUrl}
                  alt={`Referencia botánica para ${selectedReference.displayName}`}
                  className={styles.referenceImage}
                  onError={() => setImageLoadFailed(true)}
                />
              ) : (
                <div className={styles.imagePlaceholder}>
                  <Leaf size={24} />
                </div>
              )}
            </div>

            <div className={styles.selectedInfo}>
              <h3 className={styles.scientificName}>{selectedReference.displayName}</h3>
              {selectedReference.alias && (
                <p className={styles.commonName}>{selectedReference.alias}</p>
              )}
              <span className={styles.imageDisclaimer}>Imagen de referencia botánica</span>
            </div>
          </div>

          <div className={styles.selectedActions}>
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={() => setIsSelectingAnother(true)}
              disabled={disabled}
              leftIcon={<RefreshCw size={14} />}
            >
              Cambiar referencia
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={handleClear}
              disabled={disabled}
              leftIcon={<Trash2 size={14} />}
            >
              Quitar referencia
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <div className={styles.searchBox}>
        <div className={styles.searchInputWrapper}>
          <Search size={18} className={styles.searchIcon} aria-hidden="true" />
          <input
            type="text"
            className={styles.searchInput}
            placeholder="Buscar especie (ej. Monstera, Ficus, Pothos)..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            disabled={disabled}
            aria-label="Buscar especie botánica en Open Plantbook"
            autoComplete="off"
            maxLength={100}
          />
          {query.length > 0 && (
            <button
              type="button"
              className={styles.clearQueryButton}
              onClick={handleDismissSearch}
              aria-label="Limpiar búsqueda botánica"
              disabled={disabled}
            >
              <X size={16} />
            </button>
          )}
        </div>

        {query.trim().length === 1 && (
          <p className={styles.helperText}>
            Ingresá al menos 2 caracteres para buscar en Open Plantbook.
          </p>
        )}

        {/* Loading state */}
        {isSearching && (
          <div className={styles.loadingState} aria-live="polite">
            <Loader2 size={16} className={styles.spinner} />
            <span>Consultando Open Plantbook...</span>
          </div>
        )}

        {/* Error message */}
        {errorMessage && !isSearching && (
          <div className={`${styles.messageBox} ${styles.messageBoxError}`} role="alert">
            <div className={styles.messageHeader}>
              <AlertCircle size={16} />
              <span>{errorMessage}</span>
            </div>
            <div className={styles.continueWithoutRefButton}>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={handleDismissSearch}
              >
                Continuar sin referencia
              </Button>
            </div>
          </div>
        )}

        {/* No results message */}
        {hasSearched && !isSearching && !errorMessage && results.length === 0 && query.trim().length >= 2 && (
          <div className={styles.messageBox}>
            <div className={styles.messageHeader}>
              <Leaf size={16} color="var(--color-text-secondary, #64748b)" />
              <span>No encontramos coincidencias para &ldquo;{query.trim()}&rdquo;.</span>
            </div>
            <div className={styles.continueWithoutRefButton}>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={handleDismissSearch}
              >
                Continuar sin referencia
              </Button>
            </div>
          </div>
        )}

        {/* Results list */}
        {!isSearching && results.length > 0 && (
          <div className={styles.resultsList} role="listbox" aria-label="Resultados de especies botánicas">
            {results.map((item) => (
              <button
                key={item.pid}
                type="button"
                className={styles.resultItemButton}
                onClick={() => handleSelect(item)}
                disabled={disabled}
                role="option"
                aria-selected={false}
              >
                {item.imageUrl ? (
                  /* eslint-disable-next-line @next/next/no-img-element */
                  <img
                    src={item.imageUrl}
                    alt=""
                    className={styles.resultThumbnail}
                    loading="lazy"
                  />
                ) : (
                  <div className={`${styles.resultThumbnail} ${styles.imagePlaceholder}`}>
                    <Leaf size={20} />
                  </div>
                )}

                <div className={styles.resultDetails}>
                  <span className={styles.resultScientific}>{item.displayName}</span>
                  {item.alias && (
                    <span className={styles.resultAlias}>{item.alias}</span>
                  )}
                  <span className={styles.resultPid}>{item.pid}</span>
                </div>
              </button>
            ))}
          </div>
        )}

        {/* Cancel selection if changing existing */}
        {isSelectingAnother && selectedReference && (
          <div>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setIsSelectingAnother(false)}
            >
              Mantener referencia actual
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
