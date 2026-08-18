import { z } from "zod";

import type { ProviderId } from "@/types/catalog";

const RETRYABLE_STATUS = new Set([408, 425, 429, 500, 502, 503, 504]);

interface CircuitState {
  consecutiveFailures: number;
  openUntil: number;
}

const circuits = new Map<ProviderId, CircuitState>();

export class ProviderRequestError extends Error {
  constructor(
    message: string,
    readonly provider: ProviderId,
    readonly status: number | null,
    readonly url: string,
  ) {
    super(message);
    this.name = "ProviderRequestError";
  }
}

export interface RequestJsonOptions<T> {
  provider: ProviderId;
  url: string;
  schema: z.ZodType<T>;
  timeoutMs?: number;
  retries?: number;
  retry404?: boolean;
}

function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function safeUrl(rawUrl: string) {
  const url = new URL(rawUrl);
  if (url.protocol !== "https:" && url.protocol !== "http:") {
    throw new Error(`Unsupported provider protocol: ${url.protocol}`);
  }
  return url;
}

function noteSuccess(provider: ProviderId) {
  circuits.set(provider, { consecutiveFailures: 0, openUntil: 0 });
}

function noteFailure(provider: ProviderId) {
  const previous = circuits.get(provider) ?? {
    consecutiveFailures: 0,
    openUntil: 0,
  };
  const consecutiveFailures = previous.consecutiveFailures + 1;
  circuits.set(provider, {
    consecutiveFailures,
    openUntil:
      consecutiveFailures >= 5 ? Date.now() + Math.min(30_000, consecutiveFailures * 3_000) : 0,
  });
}

export async function requestJson<T>({
  provider,
  url: rawUrl,
  schema,
  timeoutMs = 12_000,
  retries = 2,
  retry404 = false,
}: RequestJsonOptions<T>): Promise<T> {
  const url = safeUrl(rawUrl);
  const circuit = circuits.get(provider);
  if (circuit && circuit.openUntil > Date.now()) {
    throw new ProviderRequestError(
      "Provider circuit is temporarily open",
      provider,
      null,
      url.toString(),
    );
  }

  let lastError: unknown;

  for (let attempt = 0; attempt <= retries; attempt += 1) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const response = await fetch(url, {
        method: "GET",
        headers: { Accept: "application/json" },
        signal: controller.signal,
        cache: "no-store",
      });

      const shouldRetry =
        RETRYABLE_STATUS.has(response.status) || (retry404 && response.status === 404);

      if (!response.ok) {
        const error = new ProviderRequestError(
          `${provider} returned HTTP ${response.status}`,
          provider,
          response.status,
          url.toString(),
        );
        if (!shouldRetry || attempt === retries) throw error;
        lastError = error;
      } else {
        const contentType = response.headers.get("content-type") ?? "";
        if (!contentType.toLowerCase().includes("json")) {
          throw new ProviderRequestError(
            `${provider} returned non-JSON content`,
            provider,
            response.status,
            url.toString(),
          );
        }

        const parsed = schema.safeParse(await response.json());
        if (!parsed.success) {
          throw new ProviderRequestError(
            `${provider} response failed validation: ${parsed.error.issues[0]?.message ?? "unknown shape"}`,
            provider,
            response.status,
            url.toString(),
          );
        }

        noteSuccess(provider);
        return parsed.data;
      }
    } catch (error) {
      lastError = error;
      const retryable =
        error instanceof DOMException ||
        error instanceof TypeError ||
        (error instanceof ProviderRequestError &&
          (error.status === null ||
            RETRYABLE_STATUS.has(error.status) ||
            (retry404 && error.status === 404)));
      if (!retryable || attempt === retries) break;
    } finally {
      clearTimeout(timeout);
    }

    const jitter = Math.floor(Math.random() * 120);
    await delay(Math.min(2_000, 250 * 2 ** attempt + jitter));
  }

  noteFailure(provider);
  if (lastError instanceof Error) throw lastError;
  throw new ProviderRequestError(
    `${provider} request failed`,
    provider,
    null,
    url.toString(),
  );
}

export function withQuery(
  baseUrl: string,
  pathname: string,
  params: Record<string, string | number | null | undefined>,
) {
  const url = new URL(pathname, baseUrl.endsWith("/") ? baseUrl : `${baseUrl}/`);
  for (const [key, value] of Object.entries(params)) {
    if (value !== null && value !== undefined && value !== "") {
      url.searchParams.set(key, String(value));
    }
  }
  return url.toString();
}
