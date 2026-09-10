/**
 * DTO for an individual item returned in the Open Plantbook search results list.
 */
export interface OpenPlantbookSearchResultItem {
  pid: string;
  display_pid?: string;
  alias?: string;
  image_url?: string | null;
}

/**
 * DTO for the paginated search response from Open Plantbook.
 */
export interface OpenPlantbookSearchResponse {
  count: number;
  next?: string | null;
  previous?: string | null;
  results: OpenPlantbookSearchResultItem[];
}

/**
 * Normalized botanical care and threshold data from Open Plantbook species detail.
 */
export interface OpenPlantbookDetailData {
  pid: string;
  display_pid?: string;
  alias?: string;
  image_url?: string | null;

  // Temperature ranges (Celsius)
  min_temp?: number | null;
  max_temp?: number | null;

  // Light lux ranges
  min_light_lux?: number | null;
  max_light_lux?: number | null;

  // Soil moisture ranges (%)
  min_soil_moist?: number | null;
  max_soil_moist?: number | null;

  // Soil electrical conductivity (uS/cm)
  min_soil_ec?: number | null;
  max_soil_ec?: number | null;

  // Environment humidity ranges (%)
  min_env_humid?: number | null;
  max_env_humid?: number | null;

  // Qualitative care texts
  watering?: string | null;
  sunlight?: string | null;
  soil?: string | null;
  pruning?: string | null;
  fertilization?: string | null;
}

/**
 * DTO for the detail response from Open Plantbook.
 * Retains the parsed data along with the raw payload for audit and snapshot persistence.
 */
export interface OpenPlantbookDetailResponse {
  data: OpenPlantbookDetailData;
  raw: unknown;
}

/**
 * Contract for the server-side Open Plantbook HTTP client.
 */
export interface IOpenPlantbookClient {
  /**
   * Searches botanical species by alias/common/scientific name.
   *
   * @param query Search query text (e.g. "monstera", "ficus", "pothos").
   * @returns Paginated search response with matching species.
   *          If query is empty or whitespace, resolves with an empty list without performing HTTP requests.
   */
  searchPlants(query: string): Promise<OpenPlantbookSearchResponse>;

  /**
   * Retrieves full species detail and theoretical care guidelines by PID.
   *
   * @param pid Species identifier in Open Plantbook (e.g. "monstera deliciosa").
   * @returns Detailed species data and raw payload snapshot.
   * @throws {OpenPlantbookPlantNotFoundError} if species does not exist (HTTP 404).
   * @throws {OpenPlantbookRateLimitError} on HTTP 429.
   * @throws {OpenPlantbookServiceUnavailableError} on HTTP 5xx, network error or timeout.
   * @throws {OpenPlantbookResponseError} on malformed or non-JSON response.
   */
  getPlantDetail(pid: string): Promise<OpenPlantbookDetailResponse>;
}
