/** Client-side API helpers with friendly, honest error mapping (spec §19). */

export class ApiError extends Error {
  code: string;
  status: number;
  /** user-facing friendly message — never raw stack traces */
  friendly: string;
  /**
   * True when the failure is Panta's own transient hiccup (observed 2026-09-22:
   * "unexpected create quote failure" when their server-side image soft-check
   * fetch hiccups). The same payload succeeds on retry — flows may safely
   * auto-retry once instead of showing an error.
   */
  transient: boolean;

  constructor(code: string, status: number, friendly: string, transient = false) {
    super(friendly);
    this.code = code;
    this.status = status;
    this.friendly = friendly;
    this.transient = transient;
  }
}

const FRIENDLY: Record<string, string> = {
  UNAUTHORIZED: "Panta rejected the credentials for this request.",
  PANTA_NOT_CONFIGURED:
    "The server is missing its Panta credentials right now, so creation and trading are temporarily unavailable. Please try again in a moment.",
  RATE_LIMITED: "Too many requests right now. Please wait a moment and try again.",
  INVALID_MARKET_PARAMS: "Some market details are invalid. Please review the form and try again.",
  DUPLICATE_MARKET: "A market with this exact question already exists for your wallet. Try a slightly different question.",
  CREATE_NOT_PERMITTED: "This Panta account is not permitted to create markets.",
  CREATE_EXPIRED: "The creation session expired. We'll re-quote — try again.",
  QUOTE_EXPIRED: "The quote expired. Please re-quote and try again.",
  QUOTE_STALE: "The market moved while you were reviewing. Re-quote to get the fresh price.",
  AMOUNT_TOO_SMALL: "That amount is below the minimum trade size. Try a larger amount.",
  MARKET_NOT_FOUND: "This market could not be found on Panta.",
  MARKET_NOT_IN_PRIMARY: "This market is no longer accepting primary buys.",
  NOT_CLAIMABLE: "This position is not claimable yet.",
  NOT_MARKET_CREATOR: "Only the market creator can claim these fees.",
  MARKET_NOT_GRADUATED: "Creator fees become claimable after the market graduates.",
  NO_CREATOR_FEES: "There are no accumulated creator fees to claim yet.",
  TX_NOT_FOUND: "The transaction was not seen on-chain. It may still confirm — check back shortly.",
  TX_FAILED: "The transaction failed on-chain. No trade was submitted.",
  TX_MISMATCH: "The transaction did not match the expected details.",
  TX_FEE_MISMATCH: "The on-chain amount did not match the quote.",
  PANTA_TIMEOUT: "Panta took too long to respond. Please try again.",
  PANTA_UNREACHABLE: "Could not reach the Panta API. Check your connection and try again.",
  WALLET_REJECTED: "Your wallet rejected the transaction. No trade was submitted.",
  WALLET_BLOCKED:
    'Phantom blocked or declined the signing popup \u2014 this happens on preview/sandbox domains. In the Phantom popup choose "Proceed anyway (unsafe)", then try again.',
  INSUFFICIENT_FUNDS: "Your wallet does not have enough USDC (plus fees) for this transaction.",
  DEMO_READ_ONLY:
    "That action is disabled in Demo mode — it serves sample data only. Switch the environment (Testing & Funding → Environment) to Live or Sandbox.",
  INVALID_ADDRESS: "That wallet address is not a valid Solana address.",
  RPC_UNREACHABLE:
    "Couldn't read balances — the Solana RPC is unreachable right now. Live trading would also fail until this recovers.",
  CONFIG_ERROR: "The server's token configuration is invalid. Balances cannot be read.",
  NETWORK_ERROR: "Network error. Please check your connection and try again.",
};

export function friendlyMessage(code: string, fallback = "Something went wrong. Please try again."): string {
  return FRIENDLY[code] ?? fallback;
}

async function parseError(res: Response): Promise<ApiError> {
  let code = "NETWORK_ERROR";
  let friendly: string | undefined;
  let transient = false;
  try {
    const j = await res.json();
    code = j.code || "NETWORK_ERROR";
    // Our own API routes (e.g. /api/balance) ship a ready-made friendly line —
    // prefer it so wording stays in one place.
    if (typeof j.friendly === "string" && j.friendly) friendly = j.friendly;
    // Panta's internal quote hiccup: no field validation errors, message is
    // their generic "unexpected create quote failure". The form is NOT at
    // fault — the same request succeeds on retry, so say that instead.
    if (
      code === "INVALID_MARKET_PARAMS" &&
      !j.fields &&
      typeof j.message === "string" &&
      j.message.toLowerCase().includes("unexpected")
    ) {
      friendly =
        "Panta couldn't prepare the quote just now — a background check on their side hiccuped. This usually works on the next attempt.";
      transient = true;
    }
  } catch {
    /* non-JSON error */
  }
  return new ApiError(code, res.status, friendly ?? friendlyMessage(code), transient);
}

async function jsonFetch<T>(input: string, init?: RequestInit): Promise<T> {
  let res: Response;
  try {
    res = await fetch(input, init);
  } catch {
    throw new ApiError("NETWORK_ERROR", 0, friendlyMessage("NETWORK_ERROR"));
  }
  if (!res.ok) throw await parseError(res);
  return res.json() as Promise<T>;
}

// ---- Config / discovery / rooms ----

export type AppEnvMode = "live" | "test" | "demo";

export function fetchStatus() {
  return jsonFetch<{
    mode: AppEnvMode;
    /** the user's raw switcher choice (cookie), null when unset */
    requested?: AppEnvMode | null;
    /** which Panta key sets exist on the server (drives switcher availability) */
    available?: { live: boolean; test: boolean };
    categories: string[];
    poweredByPanta: boolean;
    environment?: import("./environment").EnvironmentInfo;
    usdcMint?: string;
    rpcHost?: string;
  }>("/api/config");
}

/** Switch the user's environment (live / sandbox / demo) — cookie-backed, server-honored. */
export async function setEnvironment(mode: AppEnvMode) {
  return jsonFetch<{ ok: true; mode: AppEnvMode }>("/api/environment", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ mode }),
  });
}

// ---- REAL wallet balances (Solana RPC, server-proxied) ----

export interface BalancesResponse {
  ok: true;
  sol: string;
  solLamports: string;
  /** null when the token lookup failed — the UI must show "unavailable", never 0 */
  usdc: string | null;
  usdcRaw: string | null;
  usdcMint: string;
  rpcHost: string;
  network: string;
}

export function fetchBalances(address: string) {
  return jsonFetch<BalancesResponse>(`/api/balance?address=${encodeURIComponent(address)}`);
}

export interface DiscoveryParams {
  category?: string;
  status?: string;
  cursor?: string;
  limit?: number;
}

export function fetchDiscovery(params: DiscoveryParams = {}, signal?: AbortSignal) {
  const q = new URLSearchParams();
  if (params.category && params.category !== "all") q.set("category", params.category);
  if (params.status && params.status !== "all") q.set("status", params.status);
  if (params.cursor) q.set("cursor", params.cursor);
  q.set("limit", String(params.limit ?? 24));
  return jsonFetch<{ items: import("./types").FeedCard[]; nextCursor: string | null; demo: boolean }>(
    `/api/discovery?${q.toString()}`,
    { signal }
  );
}

export function fetchRoomBundle(marketId: string) {
  return jsonFetch<import("./types").RoomBundle>(`/api/rooms/${encodeURIComponent(marketId)}`);
}

export function fetchComments(marketId: string) {
  return jsonFetch<{ comments: import("./types").CommentItem[] }>(
    `/api/rooms/${encodeURIComponent(marketId)}/comments`
  );
}

export function postComment(marketId: string, body: string, wallet: string | null, displayName?: string) {
  return jsonFetch<{ comment: import("./types").CommentItem }>(`/api/rooms/${encodeURIComponent(marketId)}/comments`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ body, wallet, displayName }),
  });
}

export function toggleReaction(marketId: string, commentId: string, emoji: string, voter: string) {
  return jsonFetch<{ toggled: boolean; counts: Record<string, number> }>(
    `/api/rooms/${encodeURIComponent(marketId)}/reactions`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ commentId, emoji, voter }),
    }
  );
}

export function registerRoom(payload: {
  marketId: string;
  title: string;
  description?: string | null;
  category?: string;
  imageUrl?: string | null;
  creatorName?: string;
  creatorWallet?: string | null;
  demo?: boolean;
}) {
  return jsonFetch<{ room: import("./types").RoomInfo }>("/api/rooms", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
}

export function fetchMyRooms(wallet?: string | null) {
  const q = wallet ? `?wallet=${encodeURIComponent(wallet)}` : "";
  return jsonFetch<{ rooms: (import("./types").RoomInfo & { _count?: { comments: number } })[] }>(`/api/rooms${q}`);
}

// ---- Community leaderboard ----

export type CommunityWindow = "week" | "all";

export function fetchCommunity(window: CommunityWindow, signal?: AbortSignal) {
  return jsonFetch<import("./types").CommunityBoard>(`/api/community?window=${window}`, { signal });
}

// ---- AI structuring ----

export function structureQuestion(question: string) {
  return jsonFetch<{ result: import("./types").AIProposal }>("/api/ai/structure", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ question }),
  });
}

// ---- Panta proxy (server injects the API key) ----

export async function pantaProxy<T>(path: string, body?: unknown): Promise<T> {
  // Our own proxy routes have no trailing slash — requesting "/x/" would trigger a
  // needless 308 redirect from Next before the request ever reaches the handler.
  const cleanPath = path.split("?")[0].replace(/\/+$/, "");
  const qs = path.includes("?") ? `?${path.split("?")[1]}` : "";
  return jsonFetch<T>(`/api/panta/${cleanPath}${qs}`, {
    method: body !== undefined ? "POST" : "GET",
    headers: body !== undefined ? { "Content-Type": "application/json" } : undefined,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
}

// ---- Positions ----

export function fetchPositions(wallet: string) {
  return jsonFetch<{ wallet: string; positions: import("./types").PositionItem[]; note?: string | null }>(
    `/api/panta/positions?wallet=${encodeURIComponent(wallet)}`
  );
}

export function fetchMarketDetail(marketId: string) {
  return jsonFetch<import("./types").FeedCard>(`/api/panta/markets/${encodeURIComponent(marketId)}`);
}
