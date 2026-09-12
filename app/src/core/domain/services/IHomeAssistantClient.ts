/**
 * HomeAssistantState — Sanitized internal DTO representing the read-only state of a Home Assistant entity.
 *
 * Design & Security Principles:
 * - Only safe primitive values and strictly allowed attributes are exposed.
 * - Raw internal tokens, server secrets, and uncontrolled nested payloads are discarded.
 */
export interface HomeAssistantState {
  /**
   * Fully qualified entity identifier (e.g. "sensor.humedad_suelo_palta", "plant.sensor_humedad_beta").
   */
  entityId: string;

  /**
   * Primary string representation of the state (e.g. "80.1", "ok", "problem", "unavailable", "on", "off").
   */
  state: string;

  /**
   * Optional unit of measurement extracted from `unit_of_measurement` attribute (e.g. "%", "V", "°C").
   */
  unit?: string;

  /**
   * Optional human-readable name extracted from `friendly_name` attribute.
   */
  friendlyName?: string;

  /**
   * ISO 8601 timestamp string representing the last time the state value actually changed.
   */
  lastChanged: string;

  /**
   * ISO 8601 timestamp string representing the last time the entity state or attributes were updated.
   */
  lastUpdated: string;

  /**
   * Strict allowlist of safe primitive attributes: `friendly_name`, `unit_of_measurement`, `device_class`.
   * Unapproved or arbitrary attributes from Home Assistant are explicitly filtered out.
   */
  attributes?: Record<string, string | number | boolean | null>;
}

/**
 * Contract for the server-side Home Assistant HTTP / REST Client (ATP-HA-001).
 *
 * Operates strictly server-side (via Nabu Casa Remote UI or local LAN).
 * Never exposed directly to the browser or as an open proxy endpoint.
 */
export interface IHomeAssistantClient {
  /**
   * Retrieves the current state and sanitized attributes for a specific entity ID.
   *
   * @param entityId Entity identifier in Home Assistant (e.g. "sensor.humedad_suelo_palta").
   * @returns Sanitized HomeAssistantState DTO.
   * @throws {HomeAssistantAuthenticationError} on HTTP 401 (Invalid/expired token).
   * @throws {HomeAssistantForbiddenError} on HTTP 403 (Permission denied).
   * @throws {HomeAssistantEntityNotFoundError} on HTTP 404 (Entity not found).
   * @throws {HomeAssistantRateLimitError} on HTTP 429 (Rate limit exceeded).
   * @throws {HomeAssistantServiceUnavailableError} on HTTP 5xx, network error, or timeout.
   * @throws {HomeAssistantResponseError} on malformed or non-JSON response.
   * @throws {HomeAssistantConfigurationError} if base URL or access token is missing or misconfigured.
   */
  getState(entityId: string): Promise<HomeAssistantState>;
}
