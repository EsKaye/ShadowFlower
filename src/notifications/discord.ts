/**
 * Discord webhook notification adapter
 */

import axios from 'axios';

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

export class DiscordNotifier {
  private config: DiscordConfig;

  constructor(config: DiscordConfig) {
    this.config = config;
  }

  /**
   * Send a message via Discord webhook
   */
  async sendMessage(message: DiscordMessage): Promise<void> {
    if (!this.config.webhookUrl) {
      console.warn('Discord webhook URL not configured, skipping notification');
      return;
    }

    try {
      await axios.post(this.config.webhookUrl, message, {
        headers: {
          'Content-Type': 'application/json',
        },
      });
    } catch (error) {
      console.error('Failed to send Discord notification:', error instanceof Error ? error.message : 'Unknown error');
    }
  }

  /**
   * Send moderation batch completed notification
   */
  async notifyBatchCompleted(data: {
    jobId: string;
    itemsProcessed: number;
    itemsApproved: number;
    itemsReviewed: number;
    itemsEscalated: number;
    duration: number;
  }): Promise<void> {
    const embed: DiscordEmbed = {
      title: '✅ Moderation Batch Completed',
      color: 0x00ff00,
      fields: [
        { name: 'Job ID', value: data.jobId, inline: true },
        { name: 'Items Processed', value: data.itemsProcessed.toString(), inline: true },
        { name: 'Duration', value: `${data.duration}ms`, inline: true },
        { name: 'Approved', value: data.itemsApproved.toString(), inline: true },
        { name: 'Reviewed', value: data.itemsReviewed.toString(), inline: true },
        { name: 'Escalated', value: data.itemsEscalated.toString(), inline: true },
      ],
      timestamp: new Date().toISOString(),
    };

    await this.sendMessage({ embeds: [embed] });
  }

  /**
   * Send moderation batch failed notification
   */
  async notifyBatchFailed(data: {
    jobId: string;
    error: string;
    itemsProcessed: number;
  }): Promise<void> {
    const embed: DiscordEmbed = {
      title: '❌ Moderation Batch Failed',
      color: 0xff0000,
      fields: [
        { name: 'Job ID', value: data.jobId, inline: true },
        { name: 'Error', value: data.error, inline: false },
        { name: 'Items Processed', value: data.itemsProcessed.toString(), inline: true },
      ],
      timestamp: new Date().toISOString(),
    };

    await this.sendMessage({ embeds: [embed] });
  }

  /**
   * Send high-risk escalation notification
   */
  async notifyHighRiskEscalation(data: {
    itemId: string;
    itemType: string;
    severity: string;
    reason: string;
    author: string;
  }): Promise<void> {
    const embed: DiscordEmbed = {
      title: '🚨 High-Risk Escalation',
      color: 0xff6600,
      fields: [
        { name: 'Item ID', value: data.itemId, inline: true },
        { name: 'Type', value: data.itemType, inline: true },
        { name: 'Severity', value: data.severity, inline: true },
        { name: 'Author', value: data.author, inline: true },
        { name: 'Reason', value: data.reason, inline: false },
      ],
      timestamp: new Date().toISOString(),
    };

    await this.sendMessage({ embeds: [embed] });
  }

  /**
   * Send admin escalation notification
   */
  async notifyAdminEscalation(data: {
    itemId: string;
    reason: string;
    context: string;
  }): Promise<void> {
    const embed: DiscordEmbed = {
      title: '🔴 Admin Escalation Required',
      color: 0xff0000,
      fields: [
        { name: 'Item ID', value: data.itemId, inline: true },
        { name: 'Reason', value: data.reason, inline: false },
        { name: 'Context', value: data.context, inline: false },
      ],
      timestamp: new Date().toISOString(),
    };

    await this.sendMessage({ embeds: [embed] });
  }

  /**
   * Send digest summary notification
   */
  async notifyDigest(data: {
    period: string;
    totalBatches: number;
    totalItems: number;
    totalEscalations: number;
    avgDuration: number;
  }): Promise<void> {
    const embed: DiscordEmbed = {
      title: '📊 Moderation Digest',
      color: 0x0099ff,
      fields: [
        { name: 'Period', value: data.period, inline: true },
        { name: 'Total Batches', value: data.totalBatches.toString(), inline: true },
        { name: 'Total Items', value: data.totalItems.toString(), inline: true },
        { name: 'Total Escalations', value: data.totalEscalations.toString(), inline: true },
        { name: 'Avg Duration', value: `${data.avgDuration}ms`, inline: true },
      ],
      footer: { text: 'ShadowFlower Moderation Service' },
      timestamp: new Date().toISOString(),
    };

    await this.sendMessage({ embeds: [embed] });
  }

  /**
   * Send a custom message
   */
  async sendCustomMessage(content: string, embed?: DiscordEmbed): Promise<void> {
    const message: DiscordMessage = { content };
    if (embed) {
      message.embeds = [embed];
    }
    await this.sendMessage(message);
  }
}
