/** Shared client-side types for Panta Rooms. */

export interface FeedCard {
  marketId: string;
  title: string;
  description: string | null;
  category: string;
  phase: string;
  resolved: boolean;
  outcome: string | null;
  yesCents: number | null;
  noCents: number | null;
  volumeUsdc: string | null;
  image: string | null;
  endTime: number | null;
  resolutionTime: number | null;
  creatorAddress: string | null;
  resolutionRule: string | null;
  /** Explicitly false only when Panta's card says so — absent/null = unknown. */
  onChain?: boolean | null;
  demo: boolean;
  hasRoom: boolean;
  commentCount: number;
}

export interface TapeRow {
  id: string | number;
  marketId: string;
  wallet: string;
  isPrimary: boolean;
  yesAmount: number | string;
  noAmount: number | string;
  feePaid: number | string;
  blockTime: number | null;
  signature: string;
  quoteAsset: string;
  kind?: string;
  side?: string;
  shares?: string;
  demo?: boolean;
}

export interface RoomInfo {
  id: string;
  marketId: string;
  title: string;
  description: string | null;
  category: string;
  imageUrl: string | null;
  creatorName: string;
  creatorWallet: string | null;
  demo: boolean;
  createdAt: string;
  commentCount: number;
}

export interface RoomBundle {
  market: FeedCard;
  tape: TapeRow[];
  room: RoomInfo | null;
  demo: boolean;
  notice: string | null;
}

export interface CommentItem {
  id: string;
  displayName: string;
  wallet: string | null;
  body: string;
  createdAt: string;
  reactions: Record<string, number>;
}

export interface AppStatus {
  mode: "live" | "test" | "demo";
  categories: string[];
  poweredByPanta: boolean;
}

// ---- My Activity ----

export interface PositionItem {
  marketId: string;
  category: string | null;
  side: "yes" | "no";
  shares: string;
  phase: string;
  claimable: boolean;
  claimed: boolean;
  outcome: string | null;
  title?: string;
  estValue?: number | null;
  demo?: boolean;
}

export interface DemoTrade {
  id: string;
  marketId: string;
  title: string;
  side: "yes" | "no";
  amountUsdc: string;
  shares: string;
  at: number;
  /** demo-only simulated transaction id (`demo-sim-…`) — never a real signature */
  demoTxId?: string;
}

export interface AIProposal {
  measurable: boolean;
  question: string;
  title: string;
  description: string;
  category: string;
  resolutionRule: string;
  sourcesOfTruth: string[];
  suggestedDays: number;
  ambiguityNote: string | null;
  clarifiedQuestion: string | null;
  reasoning: string;
}

export interface CreateStepState {
  phase: "idle" | "quoting" | "quoted" | "building" | "signing" | "broadcasting" | "registering" | "done" | "error";
  createId?: string;
  expectedEventPda?: string;
  feeUsdc?: number;
  signature?: string;
  marketId?: string;
  error?: string;
  /** demo-only simulated transaction id (`demo-sim-…`) — labeled as such in the UI */
  demoTxId?: string;
}
