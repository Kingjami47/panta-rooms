/**
 * Panta API client — server-side only.
 *
 * Source of truth: https://docs.panta.market (verified live 2026-09-21)
 * - Base URL: https://live-api.panta.market/api/v1
 * - Trailing slashes are REQUIRED on every path.
 * - Auth: X-Api-Key header (pk_live_… mainnet / pk_test_… sandbox fixtures).
 * - Errors: { code, message?, field?, fields? } — switch on `code`.
 * - Panta never holds user keys: it returns unsigned transactions or
 *   instruction lists; the user's wallet signs client-side.
 */

/**
 * Dev-server safety net (verified 2026-09-21): `next dev` (Turbopack) can compile and
 * serve route handlers BEFORE .env values land in process.env — requests then fail as
 * if no API key existed, while the file on disk is perfectly valid. A later recompile
 * "heals" it, which makes the failure look random.
 *
 * ensureEnv() reads .env from the project root once and backfills ONLY the keys that
 * are still missing, so real environment variables always win. Server-side only.
 *
 * SECURITY (post-rotation policy): the API key has exactly ONE source — the
 * PANTA_API_KEY / PANTA_API_KEY_TEST environment variables (set via .env locally,
 * via the Vercel dashboard in production). The former scripts/panta_key*.json
 * file fallback was removed: keys must never be persisted in project files.
 */
import { readFileSync } from "node:fs";
import path from "node:path";

let envFileCache: Record<string, string> | null | undefined;

function envFileMap(): Record<string, string> | null {
  if (envFileCache !== undefined) return envFileCache;
  envFileCache = null;
  try {
    const raw = readFileSync(path.join(process.cwd(), ".env"), "utf8");
    const map: Record<string, string> = {};
    for (const line of raw.split(/\r?\n/)) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) continue;
      const m = trimmed.match(/^([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)$/);
      if (!m) continue;
      let v = m[2].trim();
      if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) {
        v = v.slice(1, -1);
      }
      map[m[1]] = v;
    }
    envFileCache = map;
  } catch {
    envFileCache = null;
  }
  return envFileCache;
}

function backfillEnv(name: string): void {
  if (process.env[name]) return;
  const v = envFileMap()?.[name];
  if (v !== undefined) process.env[name] = v;
}

let cachedBase: string | undefined;

function baseUrl(): string {
  if (cachedBase === undefined) {
    backfillEnv("PANTA_API_BASE_URL");
    cachedBase =
      process.env.PANTA_API_BASE_URL?.replace(/\/$/, "") ||
      "https://live-api.panta.market/api/v1";
  }
  return cachedBase;
}

export type PantaEnv = "live" | "test";

export function activeEnv(): PantaEnv {
  backfillEnv("PANTA_MODE");
  return process.env.PANTA_MODE === "test" ? "test" : "live";
}

export function apiKeyFor(env: PantaEnv = activeEnv()): string {
  const keyName = env === "test" ? "PANTA_API_KEY_TEST" : "PANTA_API_KEY";
  backfillEnv(keyName);
  const key = process.env[keyName];
  if (!key) {
    // 503: OUR server is missing configuration — distinct from Panta rejecting a key.
    throw new PantaError(
      "PANTA_NOT_CONFIGURED",
      "Panta API key is not configured on the server",
      503
    );
  }
  return key;
}

/** True when the specific env's key is configured (per-request mode resolution). */
export function hasKeyFor(env: PantaEnv): boolean {
  const keyName = env === "test" ? "PANTA_API_KEY_TEST" : "PANTA_API_KEY";
  backfillEnv(keyName);
  return Boolean(process.env[keyName]);
}

/** True when no Panta API key has been configured at all. */
export function isPantaConfigured(): boolean {
  return hasKeyFor("live") || hasKeyFor("test");
}

export class PantaError extends Error {
  code: string;
  status: number;
  field?: string;
  fields?: Record<string, string[]>;

  constructor(code: string, message: string, status = 400, field?: string, fields?: Record<string, string[]>) {
    super(message);
    this.code = code;
    this.status = status;
    this.field = field;
    this.fields = fields;
  }
}

export interface PantaCallOptions {
  method?: "GET" | "POST";
  body?: unknown;
  env?: PantaEnv;
  /** attribution id forwarded as X-User-Id (optional per docs) */
  userId?: string;
  timeoutMs?: number;
  retries?: number;
}

const DEFAULT_TIMEOUT = 30_000;

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

/** Low-level call. Trailing slash is inserted BEFORE the query string (per docs). */
export async function pantaCall<T = unknown>(path: string, opts: PantaCallOptions = {}): Promise<T> {
  const { method = "GET", body, env = activeEnv(), userId, timeoutMs = DEFAULT_TIMEOUT, retries = 0 } = opts;

  const clean = path.startsWith("/") ? path.slice(1) : path;
  const [rawPath, search = ""] = clean.split("?");
  const url = `${baseUrl()}/${rawPath}${rawPath.endsWith("/") ? "" : "/"}${search ? `?${search}` : ""}`;
  const key = apiKeyFor(env);

  let lastError: unknown;
  for (let attempt = 0; attempt <= retries; attempt++) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const headers: Record<string, string> = {
        "X-Api-Key": key,
        Accept: "application/json",
      };
      if (userId) headers["X-User-Id"] = userId;
      if (body !== undefined) headers["Content-Type"] = "application/json";

      const res = await fetch(url, {
        method,
        headers,
        body: body !== undefined ? JSON.stringify(body) : undefined,
        cache: "no-store",
        signal: controller.signal,
      });

      const text = await res.text();
      let json: unknown = null;
      try {
        json = text ? JSON.parse(text) : null;
      } catch {
        json = null;
      }

      if (!res.ok) {
        const err = (json ?? {}) as { code?: string; message?: string; field?: string; fields?: Record<string, string[]> };
        const code = err.code || (res.status === 401 ? "UNAUTHORIZED" : res.status === 429 ? "RATE_LIMITED" : "INTERNAL_ERROR");
        // Retry idempotent GETs on transient upstream failures (502/504) or rate limits
        const transient = res.status === 502 || res.status === 504;
        if (method === "GET" && (transient || code === "RATE_LIMITED") && attempt < retries) {
          await sleep(800 * (attempt + 1));
          continue;
        }
        throw new PantaError(code, err.message || `Panta request failed (${res.status})`, res.status, err.field, err.fields);
      }

      return json as T;
    } catch (e) {
      lastError = e;
      if (e instanceof PantaError) throw e;
      // Network/abort — retry GETs
      if (method === "GET" && attempt < retries) {
        await sleep(800 * (attempt + 1));
        continue;
      }
      if (e instanceof Error && e.name === "AbortError") {
        throw new PantaError("PANTA_TIMEOUT", "Panta API did not respond in time. Please try again.", 504);
      }
      throw new PantaError("PANTA_UNREACHABLE", "Could not reach the Panta API. Check your connection and try again.", 502);
    }
  }
  throw lastError instanceof Error ? lastError : new PantaError("INTERNAL_ERROR", "Unknown Panta failure", 500);
}
