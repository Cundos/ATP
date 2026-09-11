// @vitest-environment jsdom
import '@testing-library/jest-dom';
import React from 'react';
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { BotanicalReferenceSection } from '../components/BotanicalReferenceSection';
import {
  parseBotanicalReferenceViewModel,
  BotanicalReferenceViewModel,
} from '../view-models/botanical-reference.vm';
import { PlantReferenceEntity } from '@/core/domain/entities';

describe('BotanicalReferenceSection Component (ATP-IMP-025)', () => {
  const mockReference: PlantReferenceEntity = {
    id: 'ref-uuid-001',
    provider: 'OPEN_PLANTBOOK',
    external_id: 'monstera deliciosa',
    scientific_name: 'Monstera deliciosa',
    common_names: ['Costilla de Adán', 'Ceriman'],
    image_url: 'https://open.plantbook.io/images/monstera.jpg',
    fetched_at: new Date('2026-09-10T14:30:00Z'),
    last_sync_at: new Date('2026-09-10T14:30:00Z'),
    reference_care: {
      min_temp: 18,
      max_temp: 27,
      min_light_lux: 1500,
      max_light_lux: 3000,
      min_env_humid: 60,
      max_env_humid: 80,
      min_soil_moist: 20,
      max_soil_moist: 45,
      min_soil_ec: 400,
      max_soil_ec: 1200,
      watering: 'Regar cuando el sustrato superior esté seco.',
      sunlight: 'Luz brillante indirecta.',
      soil: 'Sustrato aireado rico en materia orgánica.',
      pruning: 'Poda de limpieza de hojas viejas.',
      fertilization: 'Fertilizante foliar cada 15 días.',
    },
    raw_data: { secret_internal_payload: 'super_confidential_raw_json' },
  };

  it('A. renders botanical reference section when viewModel is provided', () => {
    const vm = parseBotanicalReferenceViewModel(mockReference)!;
    render(<BotanicalReferenceSection viewModel={vm} />);

    expect(
      screen.getByRole('heading', { name: /Conocimiento Botánico de Referencia/i })
    ).toBeInTheDocument();
    expect(screen.getByText('Monstera deliciosa')).toBeInTheDocument();
    expect(screen.getByText('Costilla de Adán · Ceriman')).toBeInTheDocument();
  });

  it('B. renders nothing if viewModel is null/undefined', () => {
    const { container } = render(
      <BotanicalReferenceSection viewModel={null as unknown as BotanicalReferenceViewModel} />
    );
    expect(container).toBeEmptyDOMElement();
  });

  it('C. renders temperature metric properly', () => {
    const vm = parseBotanicalReferenceViewModel(mockReference)!;
    render(<BotanicalReferenceSection viewModel={vm} />);
    expect(screen.getByText(/Temperatura/i)).toBeInTheDocument();
    expect(screen.getByText('18–27 °C')).toBeInTheDocument();
  });

  it('D. renders light metric properly', () => {
    const vm = parseBotanicalReferenceViewModel(mockReference)!;
    render(<BotanicalReferenceSection viewModel={vm} />);
    expect(screen.getByText(/Luminosidad/i)).toBeInTheDocument();
    expect(screen.getByText('1.500–3.000 lux')).toBeInTheDocument();
  });

  it('E. renders environmental humidity metric properly', () => {
    const vm = parseBotanicalReferenceViewModel(mockReference)!;
    render(<BotanicalReferenceSection viewModel={vm} />);
    expect(screen.getByText(/Humedad Ambiente/i)).toBeInTheDocument();
    expect(screen.getByText('60–80%')).toBeInTheDocument();
  });

  it('F. renders soil moisture metric properly', () => {
    const vm = parseBotanicalReferenceViewModel(mockReference)!;
    render(<BotanicalReferenceSection viewModel={vm} />);
    expect(screen.getByText(/Humedad de Suelo/i)).toBeInTheDocument();
    expect(screen.getByText('20–45%')).toBeInTheDocument();
  });

  it('G. renders soil EC metric properly', () => {
    const vm = parseBotanicalReferenceViewModel(mockReference)!;
    render(<BotanicalReferenceSection viewModel={vm} />);
    expect(screen.getByText(/EC de Suelo/i)).toBeInTheDocument();
    expect(screen.getByText('400–1200')).toBeInTheDocument();
  });

  it('H. renders watering guideline', () => {
    const vm = parseBotanicalReferenceViewModel(mockReference)!;
    render(<BotanicalReferenceSection viewModel={vm} />);
    expect(screen.getByText(/Riego Recomendado/i)).toBeInTheDocument();
    expect(
      screen.getByText('Regar cuando el sustrato superior esté seco.')
    ).toBeInTheDocument();
  });

  it('I. renders sunlight guideline', () => {
    const vm = parseBotanicalReferenceViewModel(mockReference)!;
    render(<BotanicalReferenceSection viewModel={vm} />);
    expect(screen.getByText(/Exposición Solar/i)).toBeInTheDocument();
    expect(screen.getByText('Luz brillante indirecta.')).toBeInTheDocument();
  });

  it('J. renders soil guideline', () => {
    const vm = parseBotanicalReferenceViewModel(mockReference)!;
    render(<BotanicalReferenceSection viewModel={vm} />);
    expect(screen.getByText(/Sustrato Sugerido/i)).toBeInTheDocument();
    expect(
      screen.getByText('Sustrato aireado rico en materia orgánica.')
    ).toBeInTheDocument();
  });

  it('K. renders pruning guideline', () => {
    const vm = parseBotanicalReferenceViewModel(mockReference)!;
    render(<BotanicalReferenceSection viewModel={vm} />);
    expect(screen.getByText('Poda')).toBeInTheDocument();
    expect(
      screen.getByText('Poda de limpieza de hojas viejas.')
    ).toBeInTheDocument();
  });

  it('L. renders fertilization guideline', () => {
    const vm = parseBotanicalReferenceViewModel(mockReference)!;
    render(<BotanicalReferenceSection viewModel={vm} />);
    expect(screen.getByText(/Fertilización/i)).toBeInTheDocument();
    expect(
      screen.getByText('Fertilizante foliar cada 15 días.')
    ).toBeInTheDocument();
  });

  it('M. does NOT render null/empty metrics or care items', () => {
    const partialRef: PlantReferenceEntity = {
      ...mockReference,
      reference_care: {
        min_temp: 20,
      },
    };
    const vm = parseBotanicalReferenceViewModel(partialRef)!;
    render(<BotanicalReferenceSection viewModel={vm} />);

    // Temperature is rendered
    expect(screen.getByText(/Temperatura/i)).toBeInTheDocument();
    expect(screen.getByText('Desde 20 °C')).toBeInTheDocument();

    // Others are completely omitted from DOM (no placeholders or "N/D")
    expect(screen.queryByText(/Luminosidad/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/Humedad Ambiente/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/Humedad de Suelo/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/EC de Suelo/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/Guía Teórica de Cuidados/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/Riego Recomendado/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/null °C/i)).not.toBeInTheDocument();
  });

  it('N. never renders or leaks raw_data or internal UUID in the DOM', () => {
    const vm = parseBotanicalReferenceViewModel(mockReference)!;
    render(<BotanicalReferenceSection viewModel={vm} />);

    expect(
      screen.queryByText(/super_confidential_raw_json/i)
    ).not.toBeInTheDocument();
    expect(screen.queryByText('ref-uuid-001')).not.toBeInTheDocument();
  });

  it('O. renders source provenance clearly with date', () => {
    const vm = parseBotanicalReferenceViewModel(mockReference)!;
    render(<BotanicalReferenceSection viewModel={vm} />);

    expect(
      screen.getByText(/Fuente: Open Plantbook · consultado el 10\/09\/2026/i)
    ).toBeInTheDocument();
  });

  it('P. renders reference image with caption and fallback safely via ReferenceBotanicalImage', () => {
    const vm = parseBotanicalReferenceViewModel(mockReference)!;
    render(<BotanicalReferenceSection viewModel={vm} />);

    const img = screen.getByRole('img', {
      name: /Referencia botánica para Monstera deliciosa/i,
    });
    expect(img).toBeInTheDocument();
    expect(img).toHaveAttribute('src', 'https://open.plantbook.io/images/monstera.jpg');
    expect(screen.getByText(/Imagen de referencia botánica/i)).toBeInTheDocument();
  });
});
