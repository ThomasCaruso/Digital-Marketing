/**
 * FORM Phase 2B — Rakuten HTTP layer.
 *
 * One place for the concerns every Rakuten call shares:
 *
 *   - per-attempt timeout (AbortController);
 *   - MINIMAL TRANSIENT-ONLY retry: 429 (honoring Retry-After, capped),
 *     500/502/503/504, timeouts and network errors. Never 4xx config/auth
 *     errors, never infinite retries (bounded by `maxRetries`);
 *   - typed failures (`RakutenHttpError`) so the adapter can separate AUTH
 *     failures (401/403) from search/provider failures;
 *   - secret redaction: no caller-built error message may carry a bearer
 *     token, token key, client id or client secret — every message that can
 *     embed response text goes through `redactSecrets` first.
 *
 * Network is always injectable (`FetchLike`): tests never touch the real
 * endpoints, and no live call exists anywhere in this module by default.
 */

/** Minimal fetch signature so tests can inject a stub without DOM types. */
export type FetchLike = (url: string, init: RequestInit) => Promise<Response>;

export const DEFAULT_TIMEOUT_MS = 10_000;
/** Transient-only retries on TOP of the first attempt. */
export const DEFAULT_MAX_RETRIES = 2;
export const DEFAULT_RETRY_DELAY_MS = 500;
/** Retry-After is honored up to this cap so a bad header cannot stall a run. */
export const MAX_RETRY_AFTER_MS = 30_000;

const RETRYABLE_STATUS = new Set([429, 500, 502, 503, 504]);

/**
 * Replace every occurrence of each secret with "[redacted]". Secrets shorter
 * than 4 characters are ignored — redacting "a" would mangle text without
 * protecting anything.
 */
export function redactSecrets(text: string, secrets: readonly (string | undefined)[]): string {
  let out = text;
  for (const secret of secrets) {
    if (typeof secret === "string" && secret.length >= 4) {
      out = out.split(secret).join("[redacted]");
    }
  }
  return out;
}

/** Keep an error snippet short AND secret-free before it enters a message. */
export function redactedSnippet(text: string, secrets: readonly (string | undefined)[], max = 200): string {
  return redactSecrets(text, secrets).slice(0, max);
}

export type RakutenFailureKind =
  /** The request exceeded its per-attempt timeout. */
  | "timeout"
  /** fetch itself rejected (connection refused, DNS, TLS, reset). */
  | "network"
  /** The server answered with a non-2xx status. */
  | "status"
  /** A 2xx response could not be decoded as expected. */
  | "invalid_response";

export class RakutenHttpError extends Error {
  readonly kind: RakutenFailureKind;
  readonly status: number | null;
  /** Parsed from a 429 Retry-After header when present (already capped). */
  readonly retryAfterMs: number | null;
  readonly retryable: boolean;

  constructor(
    kind: RakutenFailureKind,
    message: string,
    options: { status?: number | null; retryAfterMs?: number | null; retryable?: boolean } = {},
  ) {
    super(message);
    this.name = "RakutenHttpError";
    this.kind = kind;
    this.status = options.status ?? null;
    this.retryAfterMs = options.retryAfterMs ?? null;
    this.retryable = options.retryable ?? false;
  }
}

export interface RakutenRequest {
  method?: "GET" | "POST";
  url: string;
  /** Auth headers live here; they are NEVER copied into error messages. */
  headers: Record<string, string>;
  body?: string;
  /** Every secret that must never appear in a thrown message. */
  secrets: readonly (string | undefined)[];
  timeoutMs: number;
  maxRetries: number;
  retryDelayMs: number;
  fetchImpl: FetchLike;
  sleep: (ms: number) => Promise<void>;
}

/** Sleep used between retries; tests inject a no-op to stay instant. */
export function defaultSleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function parseRetryAfterMs(value: string | null): number | null {
  if (value === null) return null;
  const seconds = Number(value);
  if (!Number.isFinite(seconds) || seconds < 0) return null;
  return Math.min(MAX_RETRY_AFTER_MS, seconds * 1000);
}

async function attemptOnce(request: RakutenRequest): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), request.timeoutMs);
  try {
    return await request.fetchImpl(request.url, {
      method: request.method ?? "GET",
      headers: request.headers,
      body: request.body,
      signal: controller.signal,
    });
  } catch (err) {
    if (controller.signal.aborted || (err instanceof Error && err.name === "AbortError")) {
      throw new RakutenHttpError("timeout", `request timed out after ${request.timeoutMs}ms`, {
        retryable: true,
      });
    }
    const detail = err instanceof Error ? err.message : String(err);
    throw new RakutenHttpError("network", `network failure: ${redactSecrets(detail, request.secrets)}`, {
      retryable: true,
    });
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Run one Rakuten request with timeout + bounded transient retry. Returns
 * the ok Response or throws RakutenHttpError. Auth/config statuses
 * (401/403 and any non-retryable status) throw immediately — they can only
 * succeed again if the caller changes something.
 */
export async function requestWithResilience(request: RakutenRequest): Promise<Response> {
  const maxAttempts = 1 + Math.max(0, request.maxRetries);
  for (let attempt = 1; ; attempt++) {
    let response: Response;
    try {
      response = await attemptOnce(request);
    } catch (err) {
      // Timeouts and network failures are the transient case: retry within
      // the same bounded budget, then surface the typed error.
      if (err instanceof RakutenHttpError && err.retryable && attempt < maxAttempts) {
        await request.sleep(Math.min(MAX_RETRY_AFTER_MS, request.retryDelayMs * 2 ** (attempt - 1)));
        continue;
      }
      throw err;
    }
    if (response.ok) return response;

    const retryable = RETRYABLE_STATUS.has(response.status);
    const retryAfterMs =
      response.status === 429 ? parseRetryAfterMs(response.headers.get("retry-after")) : null;
    const snippet = await safeText(response, request.secrets);

    if (!retryable || attempt >= maxAttempts) {
      throw new RakutenHttpError("status", `HTTP ${response.status} from ${request.url}${snippet ? `: ${snippet}` : ""}`, {
        status: response.status,
        retryable,
      });
    }

    const delay = retryAfterMs ?? Math.min(MAX_RETRY_AFTER_MS, request.retryDelayMs * 2 ** (attempt - 1));
    await request.sleep(delay);
  }
}

async function safeText(response: Response, secrets: readonly (string | undefined)[]): Promise<string> {
  try {
    const text = await response.text();
    return redactedSnippet(text, secrets);
  } catch {
    return "";
  }
}

/**
 * Decode a 2xx JSON body, with a typed failure instead of a syntax crash.
 * The body is redacted before it can reach any error message.
 */
export async function requestJson(
  request: RakutenRequest,
): Promise<Record<string, unknown>> {
  const response = await requestWithResilience(request);
  let text: string;
  try {
    text = await response.text();
  } catch {
    throw new RakutenHttpError("invalid_response", "2xx response body could not be read");
  }
  try {
    const parsed: unknown = JSON.parse(text);
    if (parsed === null || typeof parsed !== "object" || Array.isArray(parsed)) {
      throw new Error("not a JSON object");
    }
    return parsed as Record<string, unknown>;
  } catch {
    throw new RakutenHttpError(
      "invalid_response",
      `response was not a JSON object: ${redactedSnippet(text, request.secrets)}`,
    );
  }
}

/** Run `fn` over `items` with at most `limit` concurrent executions.
 *  Results keep input order regardless of completion order. Failures
 *  propagate after all in-flight work settles. */
export async function mapWithConcurrency<T, R>(
  items: readonly T[],
  limit: number,
  fn: (item: T) => Promise<R>,
): Promise<R[]> {
  const results = new Array<R>(items.length);
  let next = 0;
  const workerCount = Math.max(1, Math.min(limit, items.length));
  const workers: Promise<void>[] = [];
  for (let w = 0; w < workerCount; w++) {
    workers.push(
      (async () => {
        for (;;) {
          const index = next++;
          if (index >= items.length) return;
          const item = items[index];
          if (item === undefined) return;
          results[index] = await fn(item);
        }
      })(),
    );
  }
  await Promise.all(workers);
  return results;
}
