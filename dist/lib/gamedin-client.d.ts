/**
 * GameDin client wrapper for HTTP integration
 */
import { ModerationItem, GameDinModerationQueue, GameDinAdvisoryPayload } from '../types';
export interface GameDinClientConfig {
    baseUrl: string;
    apiKey: string;
    timeout?: number;
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
     * Update client configuration (useful for testing)
     */
    updateConfig(newConfig: Partial<GameDinClientConfig>): void;
}
//# sourceMappingURL=gamedin-client.d.ts.map