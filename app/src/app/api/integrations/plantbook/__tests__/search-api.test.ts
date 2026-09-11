import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { NextRequest } from 'next/server';
import { GET } from '../search/route';
import * as serviceContainer from '@/infrastructure/services/serviceContainer';
import { IOpenPlantbookClient } from '@/core/domain/services';
import {
  OpenPlantbookRateLimitError,
  OpenPlantbookAuthorizationError,
  OpenPlantbookServiceUnavailableError,
  OpenPlantbookResponseError,
} from '@/core/domain/errors/OpenPlantbookClientErrors';

describe('GET /api/integrations/plantbook/search Route Handler', () => {
  let mockClient: IOpenPlantbookClient;

  beforeEach(() => {
    mockClient = {
      searchPlants: vi.fn(),
      getPlantDetail: vi.fn(),
    };
    serviceContainer.setOpenPlantbookClient(mockClient);
  });

  afterEach(() => {
    serviceContainer.setOpenPlantbookClient(null);
  });

  function createRequest(queryParam: string): NextRequest {
    return new NextRequest(`http://localhost:3000/api/integrations/plantbook/search?${queryParam}`);
  }

  it('A. returns empty results array without calling client if query is shorter than 2 characters', async () => {
    const req = createRequest('q=a');
    const res = await GET(req);
    expect(res.status).toBe(200);

    const body = await res.json();
    expect(body).toEqual({ results: [] });
    expect(mockClient.searchPlants).not.toHaveBeenCalled();
  });

  it('B. returns empty results array when query is empty or whitespace', async () => {
    const req = createRequest('q=   ');
    const res = await GET(req);
    expect(res.status).toBe(200);

    const body = await res.json();
    expect(body).toEqual({ results: [] });
    expect(mockClient.searchPlants).not.toHaveBeenCalled();
  });

  it('C. returns 400 Bad Request when query exceeds 100 characters', async () => {
    const longQuery = 'a'.repeat(101);
    const req = createRequest(`q=${longQuery}`);
    const res = await GET(req);
    expect(res.status).toBe(400);

    const body = await res.json();
    expect(body.error).toMatch(/no puede superar los 100 caracteres/i);
    expect(mockClient.searchPlants).not.toHaveBeenCalled();
  });

  it('D. returns mapped results DTO on successful search with alias or q param', async () => {
    vi.mocked(mockClient.searchPlants).mockResolvedValue({
      count: 2,
      results: [
        {
          pid: 'monstera deliciosa',
          display_pid: 'Monstera deliciosa',
          alias: 'Costilla de Adán',
          image_url: 'https://open.plantbook.io/images/monstera.jpg',
        },
        {
          pid: 'monstera adansonii',
          display_pid: '',
          alias: '',
          image_url: null,
        },
      ],
    });

    const req = createRequest('q=monstera');
    const res = await GET(req);
    expect(res.status).toBe(200);

    const body = await res.json();
    expect(mockClient.searchPlants).toHaveBeenCalledWith('monstera');
    expect(body.results).toHaveLength(2);
    expect(body.results[0]).toEqual({
      pid: 'monstera deliciosa',
      displayName: 'Monstera deliciosa',
      alias: 'Costilla de Adán',
      imageUrl: 'https://open.plantbook.io/images/monstera.jpg',
    });
    // Fallback display_pid -> pid, empty alias -> null
    expect(body.results[1]).toEqual({
      pid: 'monstera adansonii',
      displayName: 'monstera adansonii',
      alias: null,
      imageUrl: null,
    });
  });

  it('E. maps OpenPlantbookRateLimitError to HTTP 429 with sanitized user message', async () => {
    vi.mocked(mockClient.searchPlants).mockRejectedValue(
      new OpenPlantbookRateLimitError('Rate limit exceeded', 60)
    );

    const req = createRequest('q=monstera');
    const res = await GET(req);
    expect(res.status).toBe(429);

    const body = await res.json();
    expect(body.error).toBe('Open Plantbook alcanzó temporalmente su límite. Podés continuar sin referencia.');
    expect(JSON.stringify(body)).not.toContain('secret');
  });

  it('F. maps OpenPlantbookAuthorizationError to HTTP 503 without exposing credentials', async () => {
    vi.mocked(mockClient.searchPlants).mockRejectedValue(
      new OpenPlantbookAuthorizationError('Unauthorized client credentials', 401)
    );

    const req = createRequest('q=ficus');
    const res = await GET(req);
    expect(res.status).toBe(503);

    const body = await res.json();
    expect(body.error).toBe('Referencia botánica no disponible.');
    expect(JSON.stringify(body)).not.toContain('credentials');
    expect(JSON.stringify(body)).not.toContain('secret');
  });

  it('G. maps OpenPlantbookServiceUnavailableError (timeout/5xx) to HTTP 503', async () => {
    vi.mocked(mockClient.searchPlants).mockRejectedValue(
      new OpenPlantbookServiceUnavailableError('Gateway timeout', 'timeout', 504)
    );

    const req = createRequest('q=pothos');
    const res = await GET(req);
    expect(res.status).toBe(503);

    const body = await res.json();
    expect(body.error).toBe('Open Plantbook no está disponible en este momento. Podés continuar sin referencia.');
  });

  it('H. maps OpenPlantbookResponseError to HTTP 502 Bad Gateway', async () => {
    vi.mocked(mockClient.searchPlants).mockRejectedValue(
      new OpenPlantbookResponseError('Invalid HTML received instead of JSON')
    );

    const req = createRequest('q=pothos');
    const res = await GET(req);
    expect(res.status).toBe(502);

    const body = await res.json();
    expect(body.error).toBe('Respuesta inválida del proveedor botánico.');
  });
});
