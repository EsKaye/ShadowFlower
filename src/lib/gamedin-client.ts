/**
 * GameDin client wrapper for HTTP integration
 * Uses HMAC signing for privileged server-to-server requests
 */

import axios, { AxiosInstance } from 'axios';
import { ModerationItem, GameDinModerationQueue, GameDinAdvisoryPayload, GameDinAuthHeaders } from '../types';
import { signRequest, type SigningConfig } from '../security/signing';

export interface GameDinClientConfig {
  baseUrl: string;
  apiKey: string;
  timeout?: number;
  signingSecret?: string; // Optional HMAC signing secret for privileged requests
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
   * Uses HMAC signing if signing secret is configured
   */
  async sendAdvisoryResults(payload: GameDinAdvisoryPayload): Promise<void> {
    try {
      const headers: Record<string, string> = {
        ...(this.getAuthHeaders() as unknown as Record<string, string>),
      };

      // Add HMAC signature if signing secret is configured
      if (this.config.signingSecret) {
        const signatureHeaders = this.signRequest('POST', '/api/internal/moderation/advisory', payload);
        Object.entries(signatureHeaders).forEach(([key, value]) => {
          headers[key] = value;
        });
      }

      await this.client.post('/api/internal/moderation/advisory', payload, { headers });
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
   * Sign a request with HMAC-SHA256
   * Returns signature headers for privileged requests
   */
  private signRequest(method: string, path: string, body: any): Record<string, string> {
    if (!this.config.signingSecret) {
      return {};
    }

    const signingConfig: SigningConfig = {
      secretKey: this.config.signingSecret,
      maxTimestampDelta: 5 * 60 * 1000, // 5 minutes
    };

    const bodyString = typeof body === 'string' ? body : JSON.stringify(body || {});

    const signatureHeaders = signRequest(signingConfig, {
      method,
      path,
      body: bodyString,
    });

    // Convert SignatureHeaders to Record<string, string>
    return {
      'x-shadowflower-timestamp': signatureHeaders['x-shadowflower-timestamp'],
      'x-shadowflower-nonce': signatureHeaders['x-shadowflower-nonce'],
      'x-shadowflower-signature': signatureHeaders['x-shadowflower-signature'],
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
