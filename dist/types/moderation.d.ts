/**
 * Core moderation types for ShadowFlower service
 */
export type ModerationItemType = 'post' | 'comment' | 'profile' | 'message' | 'image' | 'video';
export type ModerationSeverity = 'low' | 'medium' | 'high' | 'critical';
export type ModerationAction = 'approve' | 'review' | 'escalate' | 'remove' | 'suspend';
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
    aiSummary: string;
    aiReason: string;
    aiConfidence: number;
    aiRecommendedAction: ModerationAction;
    aiEscalateToAdmin: boolean;
    aiProvider: string;
    aiModel: string;
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
//# sourceMappingURL=moderation.d.ts.map