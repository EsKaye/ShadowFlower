/**
 * Core moderation types for ShadowFlower service
 */

export type ModerationItemType = 'post' | 'comment' | 'profile' | 'message' | 'image' | 'video';

export type ModerationSeverity = 'low' | 'medium' | 'high' | 'critical';

export type ModerationAction = 'approve' | 'review' | 'escalate' | 'remove' | 'suspend';

/**
 * Rule-based moderation categories
 */
export type RuleCategory =
  | 'offensive_language'
  | 'hate_abuse'
  | 'harassment'
  | 'nsfw_text'
  | 'spam_promo'
  | 'impersonation_signals'
  | 'suspicious_links'
  | 'other';

/**
 * Rule matching types
 */
export type RuleType = 'exact' | 'phrase' | 'case_insensitive' | 'normalized' | 'regex';

/**
 * Moderation rule definition
 */
export interface ModerationRule {
  id: string;
  category: RuleCategory;
  type: RuleType;
  pattern: string;
  severity: ModerationSeverity;
  weight: number;
  enabled: boolean;
  description?: string;
}

/**
 * Rule match result
 */
export interface RuleMatch {
  ruleId: string;
  category: RuleCategory;
  severity: ModerationSeverity;
  weight: number;
  matchedText: string;
}

/**
 * Scan state fields (stored in GameDin database)
 */
export interface ScanState {
  lastScannedAt?: string;
  scanVersion?: string;
  ruleMatchCount?: number;
  matchedCategories?: RuleCategory[];
  matchedRuleIds?: string[];
  ruleRiskScore?: number;
  aiReviewRequired?: boolean;
}

export interface ModerationItem {
  id: string;
  type: ModerationItemType;
  content: string;
  author: {
    id: string;
    username: string;
    reputation?: number;
  };
  metadata: {
    createdAt: string;
    updatedAt: string;
    reportCount: number;
    previousFlags?: string[];
    context?: Record<string, unknown>;
  };
}

export interface ModerationInput {
  items: ModerationItem[];
  batchSize: number;
  dryRun: boolean;
  provider: string;
  model?: string;
}

export interface ModerationResult {
  itemId: string;
  // AI fields (existing)
  aiSummary: string;
  aiReason: string;
  aiConfidence: number;
  aiRecommendedAction: ModerationAction;
  aiEscalateToAdmin: boolean;
  aiProvider: string;
  aiModel: string;
  // Rule-based fields (new)
  matchedRules: RuleMatch[];
  ruleRiskScore: number;
  matchedCategories: RuleCategory[];
  ruleMatchCount: number;
  aiReviewRequired: boolean;
  // Common fields
  processedAt: string;
  severity: ModerationSeverity;
  categories: {
    harassment?: boolean;
    hate?: boolean;
    violence?: boolean;
    sexual?: boolean;
    spam?: boolean;
    misinformation?: boolean;
  };
}

export interface ModerationOutput {
  results: ModerationResult[];
  summary: {
    totalProcessed: number;
    approved: number;
    escalated: number;
    removed: number;
    needsReview: number;
  };
  job: {
    id: string;
    startedAt: string;
    completedAt: string;
    duration: number;
    provider: string;
    model: string;
    dryRun: boolean;
  };
}

export interface ProviderResponse {
  summary: string;
  reasoning: string;
  confidence: number;
  recommendedAction: ModerationAction;
  escalateToAdmin: boolean;
  severity: ModerationSeverity;
  categories: ModerationResult['categories'];
}

export interface ProviderConfig {
  apiKey: string;
  model: string;
  timeout: number;
  maxRetries: number;
}

export interface GameDinModerationQueue {
  items: ModerationItem[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    hasMore: boolean;
  };
}

export interface GameDinAdvisoryPayload {
  results: ModerationResult[];
  job: ModerationOutput['job'];
  sentAt: string;
}
