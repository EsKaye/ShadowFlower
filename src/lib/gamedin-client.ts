/**
 * GameDin client wrapper for HTTP integration
 */

import axios, { AxiosInstance } from 'axios';
import { ModerationItem, GameDinModerationQueue, GameDinAdvisoryPayload, GameDinAuthHeaders } from '../types';

export interface GameDinClientConfig {
  baseUrl: string;
  apiKey: string;
  timeout?: number;
}

export class GameDinClient {
  private client: AxiosInstance;
  private config: GameDinClientConfig;

  constructor(config: GameDinClientConfig) {
    this.config = config;
    this.client = axios.create({
      baseURL: config.baseUrl,
      timeout: config.timeout || 10000,
    });

    // Set headers separately to avoid type issues
    const authHeaders = this.getAuthHeaders();
    Object.entries(authHeaders).forEach(([key, value]) => {
      this.client.defaults.headers.common[key] = value;
    });

    // Add response interceptor for error handling
    this.client.interceptors.response.use(
      (response) => response,
      (error) => {
        throw new Error(`GameDin API error: ${error.response?.data?.message || error.message}`);
      }
    );
  }

  /**
   * Fetch moderation queue from GameDin
   */
  async fetchModerationQueue(options: {
    limit?: number;
    offset?: number;
    itemType?: string;
  } = {}): Promise<GameDinModerationQueue> {
    try {
      const response = await this.client.get('/api/internal/moderation/queue', {
        params: {
          limit: options.limit || 50,
          offset: options.offset || 0,
          itemType: options.itemType,
        },
      });

      return response.data;
    } catch (error) {
      throw new Error(`Failed to fetch moderation queue: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Send moderation advisory results back to GameDin
   */
  async sendAdvisoryResults(payload: GameDinAdvisoryPayload): Promise<void> {
    try {
      await this.client.post('/api/internal/moderation/advisory', payload);
    } catch (error) {
      throw new Error(`Failed to send advisory results: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Get specific moderation item by ID
   */
  async getModerationItem(itemId: string): Promise<ModerationItem> {
    try {
      const response = await this.client.get(`/api/internal/moderation/items/${itemId}`);
      return response.data;
    } catch (error) {
      throw new Error(`Failed to fetch moderation item: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Update moderation item status (if needed)
   */
  async updateModerationItemStatus(itemId: string, status: string): Promise<void> {
    try {
      await this.client.patch(`/api/internal/moderation/items/${itemId}`, {
        status,
        updatedAt: new Date().toISOString(),
      });
    } catch (error) {
      throw new Error(`Failed to update moderation item: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Health check for GameDin service
   */
  async healthCheck(): Promise<boolean> {
    try {
      const response = await this.client.get('/api/internal/health');
      return response.status === 200;
    } catch {
      return false;
    }
  }

  /**
   * Get authentication headers for server-to-server communication
   */
  private getAuthHeaders(): GameDinAuthHeaders {
    return {
      'authorization': `Bearer ${this.config.apiKey}`,
      'x-service': 'shadowflower',
      'content-type': 'application/json',
    };
  }

  /**
   * Update client configuration (useful for testing)
   */
  updateConfig(newConfig: Partial<GameDinClientConfig>): void {
    this.config = { ...this.config, ...newConfig };
    this.client.defaults.baseURL = this.config.baseUrl;
    this.client.defaults.timeout = this.config.timeout || 10000;

    // Set headers separately to avoid type issues
    const authHeaders = this.getAuthHeaders();
    Object.entries(authHeaders).forEach(([key, value]) => {
      this.client.defaults.headers.common[key] = value;
    });
  }
}
