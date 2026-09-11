// @vitest-environment jsdom
import '@testing-library/jest-dom';
import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
import {
  BotanicalReferencePicker,
  BotanicalSearchResult,
  SelectedBotanicalReference,
} from '../components/BotanicalReferencePicker';

describe('BotanicalReferencePicker Component (ATP-IMP-024)', () => {
  let mockFetch: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    vi.useFakeTimers();
    mockFetch = vi.fn();
    global.fetch = mockFetch as unknown as typeof fetch;
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it('A. does not trigger search when query is less than 2 characters', async () => {
    const onSelect = vi.fn();
    const onClear = vi.fn();

    render(
      <BotanicalReferencePicker
        onSelectReference={onSelect}
        onClearReference={onClear}
      />
    );

    const input = screen.getByLabelText(/Buscar especie botánica/i);
    fireEvent.change(input, { target: { value: 'm' } });

    act(() => {
      vi.advanceTimersByTime(500);
    });

    expect(mockFetch).not.toHaveBeenCalled();
    expect(
      screen.getByText(/Ingresá al menos 2 caracteres para buscar en Open Plantbook/i)
    ).toBeInTheDocument();
  });

  it('B. triggers debounced search (400ms) when query has 2 or more characters', async () => {
    const onSelect = vi.fn();
    const onClear = vi.fn();

    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ results: [] }),
    });

    render(
      <BotanicalReferencePicker
        onSelectReference={onSelect}
        onClearReference={onClear}
      />
    );

    const input = screen.getByLabelText(/Buscar especie botánica/i);
    fireEvent.change(input, { target: { value: 'monstera' } });

    // After 200ms, should NOT have fetched yet
    act(() => {
      vi.advanceTimersByTime(200);
    });
    expect(mockFetch).not.toHaveBeenCalled();

    // After 400ms total, should have fetched
    act(() => {
      vi.advanceTimersByTime(250);
    });

    expect(mockFetch).toHaveBeenCalledWith(
      '/api/integrations/plantbook/search?q=monstera',
      expect.objectContaining({ signal: expect.any(AbortSignal) })
    );
  });

  it('C. renders results list and allows selecting a botanical reference', async () => {
    const onSelect = vi.fn();
    const onClear = vi.fn();

    const sampleResults: BotanicalSearchResult[] = [
      {
        pid: 'monstera deliciosa',
        displayName: 'Monstera deliciosa',
        alias: 'Costilla de Adán',
        imageUrl: 'https://open.plantbook.io/images/monstera.jpg',
      },
    ];

    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ results: sampleResults }),
    });

    render(
      <BotanicalReferencePicker
        onSelectReference={onSelect}
        onClearReference={onClear}
      />
    );

    const input = screen.getByLabelText(/Buscar especie botánica/i);
    fireEvent.change(input, { target: { value: 'monstera' } });

    await act(async () => {
      vi.advanceTimersByTime(450);
    });

    expect(screen.getByText('Monstera deliciosa')).toBeInTheDocument();
    expect(screen.getByText('Costilla de Adán')).toBeInTheDocument();
    expect(screen.getByText('monstera deliciosa')).toBeInTheDocument();

    const optionButton = screen.getByRole('option');
    fireEvent.click(optionButton);

    expect(onSelect).toHaveBeenCalledWith(sampleResults[0]);
  });

  it('D. displays empty state when no matches are found with option to continue without reference', async () => {
    const onSelect = vi.fn();
    const onClear = vi.fn();

    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ results: [] }),
    });

    render(
      <BotanicalReferencePicker
        onSelectReference={onSelect}
        onClearReference={onClear}
      />
    );

    const input = screen.getByLabelText(/Buscar especie botánica/i);
    fireEvent.change(input, { target: { value: 'nonexistent-plant' } });

    await act(async () => {
      vi.advanceTimersByTime(450);
    });

    expect(
      screen.getByText(/No encontramos coincidencias para “nonexistent-plant”/i)
    ).toBeInTheDocument();

    const continueButton = screen.getByRole('button', { name: /Continuar sin referencia/i });
    expect(continueButton).toBeInTheDocument();

    fireEvent.click(continueButton);
    expect(screen.queryByText(/No encontramos coincidencias/i)).not.toBeInTheDocument();
  });

  it('E. handles 429 rate limit error gracefully with non-blocking message', async () => {
    const onSelect = vi.fn();
    const onClear = vi.fn();

    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 429,
      json: async () => ({
        error: 'Open Plantbook alcanzó temporalmente su límite. Podés continuar sin referencia.',
      }),
    });

    render(
      <BotanicalReferencePicker
        onSelectReference={onSelect}
        onClearReference={onClear}
      />
    );

    const input = screen.getByLabelText(/Buscar especie botánica/i);
    fireEvent.change(input, { target: { value: 'ficus' } });

    await act(async () => {
      vi.advanceTimersByTime(450);
    });

    expect(
      screen.getByText(/Open Plantbook alcanzó temporalmente su límite/i)
    ).toBeInTheDocument();
    expect(screen.getByRole('alert')).toBeInTheDocument();

    const continueBtn = screen.getByRole('button', { name: /Continuar sin referencia/i });
    fireEvent.click(continueBtn);
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('F. renders selected reference card with options to change or remove reference', async () => {
    const onSelect = vi.fn();
    const onClear = vi.fn();

    const selectedRef: SelectedBotanicalReference = {
      pid: 'monstera deliciosa',
      displayName: 'Monstera deliciosa',
      alias: 'Costilla de Adán',
      imageUrl: 'https://open.plantbook.io/images/monstera.jpg',
      isExistingLocal: true,
    };

    render(
      <BotanicalReferencePicker
        selectedReference={selectedRef}
        onSelectReference={onSelect}
        onClearReference={onClear}
      />
    );

    expect(screen.getByText('Referencia Botánica')).toBeInTheDocument();
    expect(screen.getByText('Monstera deliciosa')).toBeInTheDocument();
    expect(screen.getByText('Costilla de Adán')).toBeInTheDocument();
    expect(screen.getByText('monstera deliciosa')).toBeInTheDocument();
    expect(screen.getByText('Imagen de referencia botánica')).toBeInTheDocument();

    const removeBtn = screen.getByRole('button', { name: /Quitar referencia/i });
    fireEvent.click(removeBtn);
    expect(onClear).toHaveBeenCalledOnce();
  });

  it('G. prevents race conditions: older in-flight request does not overwrite newer results', async () => {
    const onSelect = vi.fn();
    const onClear = vi.fn();

    let resolveFirst: (value: unknown) => void;
    const firstPromise = new Promise((resolve) => {
      resolveFirst = resolve;
    });

    let resolveSecond: (value: unknown) => void;
    const secondPromise = new Promise((resolve) => {
      resolveSecond = resolve;
    });

    mockFetch
      .mockImplementationOnce(() => firstPromise)
      .mockImplementationOnce(() => secondPromise);

    render(
      <BotanicalReferencePicker
        onSelectReference={onSelect}
        onClearReference={onClear}
      />
    );

    const input = screen.getByLabelText(/Buscar especie botánica/i);

    // 1. Type "fic"
    fireEvent.change(input, { target: { value: 'fic' } });
    act(() => {
      vi.advanceTimersByTime(450);
    });

    // 2. Type "monstera" before "fic" finishes
    fireEvent.change(input, { target: { value: 'monstera' } });
    act(() => {
      vi.advanceTimersByTime(450);
    });

    // 3. Resolve second request (monstera) first
    await act(async () => {
      resolveSecond!({
        ok: true,
        json: async () => ({
          results: [
            {
              pid: 'monstera deliciosa',
              displayName: 'Monstera deliciosa',
              alias: 'Costilla de Adán',
              imageUrl: null,
            },
          ],
        }),
      });
    });

    expect(screen.getByText('Monstera deliciosa')).toBeInTheDocument();

    // 4. Resolve first request (fic) later
    await act(async () => {
      resolveFirst!({
        ok: true,
        json: async () => ({
          results: [
            {
              pid: 'ficus elastica',
              displayName: 'Ficus elastica',
              alias: 'Gomero',
              imageUrl: null,
            },
          ],
        }),
      });
    });

    // Monstera should STILL be displayed, NOT overwritten by the stale ficus response!
    expect(screen.getByText('Monstera deliciosa')).toBeInTheDocument();
    expect(screen.queryByText('Ficus elastica')).not.toBeInTheDocument();
  });
});
