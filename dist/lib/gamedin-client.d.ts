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
     * Get authentication headers for server-to-server communication
     */
    private getAuthHeaders;
    /**
     * Sign a request with HMAC-SHA256
     * Returns signature headers for privileged requests
     */
    private signRequest;
    /**
     * Update client configuration (useful for testing)
     */
    updateConfig(newConfig: Partial<GameDinClientConfig>): void;
}
//# sourceMappingURL=gamedin-client.d.ts.map