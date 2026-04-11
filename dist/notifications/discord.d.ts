/**
 * Discord webhook notification adapter
 */
export interface DiscordMessage {
    content?: string;
    username?: string;
    avatar_url?: string;
    embeds?: DiscordEmbed[];
    allowed_mentions?: {
        parse?: string[];
    };
}
export interface DiscordEmbed {
    title?: string;
    description?: string;
    color?: number;
    fields?: Array<{
        name: string;
        value: string;
        inline?: boolean;
    }>;
    footer?: {
        text: string;
    };
    timestamp?: string;
}
export interface DiscordConfig {
    webhookUrl: string;
    alertChannelId?: string;
    digestChannelId?: string;
    adminChannelId?: string;
}
export declare class DiscordNotifier {
    private config;
    constructor(config: DiscordConfig);
    /**
     * Send a message via Discord webhook
     */
    sendMessage(message: DiscordMessage): Promise<void>;
    /**
     * Send moderation batch completed notification
     */
    notifyBatchCompleted(data: {
        jobId: string;
        itemsProcessed: number;
        itemsApproved: number;
        itemsReviewed: number;
        itemsEscalated: number;
        duration: number;
    }): Promise<void>;
    /**
     * Send moderation batch failed notification
     */
    notifyBatchFailed(data: {
        jobId: string;
        error: string;
        itemsProcessed: number;
    }): Promise<void>;
    /**
     * Send high-risk escalation notification
     */
    notifyHighRiskEscalation(data: {
        itemId: string;
        itemType: string;
        severity: string;
        reason: string;
        author: string;
    }): Promise<void>;
    /**
     * Send admin escalation notification
     */
    notifyAdminEscalation(data: {
        itemId: string;
        reason: string;
        context: string;
    }): Promise<void>;
    /**
     * Send digest summary notification
     */
    notifyDigest(data: {
        period: string;
        totalBatches: number;
        totalItems: number;
        totalEscalations: number;
        avgDuration: number;
    }): Promise<void>;
    /**
     * Send a custom message
     */
    sendCustomMessage(content: string, embed?: DiscordEmbed): Promise<void>;
}
//# sourceMappingURL=discord.d.ts.map