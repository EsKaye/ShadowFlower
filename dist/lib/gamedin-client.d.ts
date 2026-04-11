/**
 * GameDin client wrapper for HTTP integration
 * Uses HMAC signing for privileged server-to-server requests
 */
import { ModerationItem, GameDinModerationQueue, GameDinAdvisoryPayload } from '../types';
export interface GameDinClientConfig {
    baseUrl: string;
    apiKey: string;
    timeout?: number;
    signingSecret?: string;
}
export declare class GameDinClient {
    private client;
    private config;
    constructor(config: GameDinClientConfig);
    /**
     * Fetch moderation queue from GameDin
     */
    fetchModerationQueue(options?: {
        limit?: number;
        offset?: number;
        itemType?: string;
    }): Promise<GameDinModerationQueue>;
    /**
     * Send moderation advisory results back to GameDin
     * Uses HMAC signing if signing secret is configured
     */
    sendAdvisoryResults(payload: GameDinAdvisoryPayload): Promise<void>;
    /**
     * Get specific moderation item by ID
     */
    getModerationItem(itemId: string): Promise<ModerationItem>;
    /**
     * Update moderation item status (if needed)
     */
    updateModerationItemStatus(itemId: string, status: string): Promise<void>;
    /**
     * Health check for GameDin service
     */
    healthCheck(): Promise<boolean>;
    /**
     * Handshake with GameDin - fetch reviewable moderation reports
     * Uses exact GameDin contract: GET /api/private/moderation/reports/reviewable
     * Empty body for signature calculation
     */
    fetchReviewableReports(): Promise<any>;
    /**
     * Submit AI review advisory for a specific report
     * Uses exact GameDin contract: POST /api/private/moderation/reports/:id/ai-review
     * JSON body must be the exact raw body used for signature calculation
     */
    submitAiReview(reportId: string, advisoryData: {
        aiStatus: string;
        aiSummary: string;
        aiReason: string;
        aiConfidence: number;
        aiRecommendedAction: string;
        aiEscalateToAdmin: boolean;
        aiProvider: string;
        aiModel: string;
    }): Promise<void>;
    /**
     * Get authentication headers for server-to-server communication
     */
    private getAuthHeaders;
    /**
     * Sign a request with HMAC-SHA256 using exact GameDin contract
     * Returns signature headers for privileged requests
     * Uses timestamp:nonce:body format with Base64URL encoding
     */
    private signRequest;
    /**
     * Update client configuration (useful for testing)
     */
    updateConfig(newConfig: Partial<GameDinClientConfig>): void;
}
//# sourceMappingURL=gamedin-client.d.ts.map