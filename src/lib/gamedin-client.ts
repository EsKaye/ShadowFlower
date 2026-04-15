/**
 * GameDin client wrapper for HTTP integration
 * Uses HMAC signing for privileged server-to-server requests
 * Uses native https module to match the working direct test
 */

import https from 'https';
import { ModerationItem, GameDinModerationQueue, GameDinAdvisoryPayload } from '../types';
import { signRequest, type SigningConfig } from '../security/signing';

export interface GameDinClientConfig {
  baseUrl: string;
  signingSecret: string; // Required HMAC signing secret for GameDin internal API authentication (SHADOWFLOWER_SIGNING_SECRET)
  timeout?: number;
}

export class GameDinClient {
  private config: GameDinClientConfig;

  constructor(config: GameDinClientConfig) {
    this.config = config;
  }

  private makeRequest(method: string, path: string, body: string = '', queryParams: Record<string, string> = {}): Promise<any> {
    return new Promise((resolve, reject) => {
      const url = new URL(path, this.config.baseUrl);
      
      // Add query parameters
      Object.keys(queryParams).forEach(key => {
        if (queryParams[key] !== undefined) {
          url.searchParams.append(key, queryParams[key]);
        }
      });

      const headers = this.getAuthHeaders(body);

      // Add content-type header for POST/PATCH requests with body
      if (body && method !== 'GET') {
        headers['content-type'] = 'application/json';
      }

      const options = {
        hostname: url.hostname,
        port: url.port || 443,
        path: url.pathname + url.search,
        method: method,
        headers: headers,
        timeout: this.config.timeout || 10000,
      };

      const req = https.request(options, (res) => {
        let data = '';
        res.on('data', (chunk) => {
          data += chunk;
        });

        res.on('end', () => {
          if (res.statusCode && res.statusCode >= 200 && res.statusCode < 300) {
            try {
              const jsonData = JSON.parse(data);
              resolve(jsonData);
            } catch {
              resolve(data);
            }
          } else {
            reject(new Error(`GameDin API error: ${res.statusCode || 'unknown'} - ${data}`));
          }
        });
      });

      req.on('error', (error) => {
        reject(new Error(`GameDin API error: ${error.message}`));
      });

      req.on('timeout', () => {
        req.destroy();
        reject(new Error('GameDin API timeout'));
      });

      if (body && method !== 'GET') {
        req.write(body);
      }

      req.end();
    });
  }

  /**
   * Fetch moderation queue from GameDin
   * Supports filtering for incremental scanning
   */
  async fetchModerationQueue(options: {
    limit?: number;
    offset?: number;
    itemType?: string;
    unscanned?: boolean;
    changedSince?: string;
    reportedSince?: string;
  } = {}): Promise<GameDinModerationQueue> {
    try {
      const queryParams: Record<string, string> = {
        limit: String(options.limit || 50),
        offset: String(options.offset || 0),
      };

      if (options.itemType) {
        queryParams['itemType'] = options.itemType;
      }

      // Incremental scanning filters
      if (options.unscanned !== undefined) {
        queryParams['unscanned'] = String(options.unscanned);
      }

      if (options.changedSince) {
        queryParams['changedSince'] = options.changedSince;
      }

      if (options.reportedSince) {
        queryParams['reportedSince'] = options.reportedSince;
      }

      return await this.makeRequest('GET', '/api/internal/moderation/queue', '', queryParams);
    } catch (error) {
      throw new Error(`Failed to fetch moderation queue: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Send moderation advisory results back to GameDin
   * Uses pure HMAC signature authentication for POST request with JSON body
   */
  async sendAdvisoryResults(payload: GameDinAdvisoryPayload): Promise<void> {
    try {
      const bodyString = JSON.stringify(payload);
      await this.makeRequest('POST', '/api/internal/moderation/advisory', bodyString);
    } catch (error) {
      throw new Error(`Failed to send advisory results: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Get specific moderation item by ID
   * Uses HMAC signature authentication for GET request with empty body
   */
  async getModerationItem(itemId: string): Promise<ModerationItem> {
    try {
      return await this.makeRequest('GET', `/api/internal/moderation/items/${itemId}`, '');
    } catch (error) {
      throw new Error(`Failed to fetch moderation item: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Update moderation item status (if needed)
   * Uses HMAC signature authentication for PATCH request with JSON body
   */
  async updateModerationItemStatus(itemId: string, status: string): Promise<void> {
    try {
      const body = {
        status,
        updatedAt: new Date().toISOString(),
      };
      const bodyString = JSON.stringify(body);
      await this.makeRequest('PATCH', `/api/internal/moderation/items/${itemId}`, bodyString);
    } catch (error) {
      throw new Error(`Failed to update moderation item: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Health check for GameDin service
   * Uses HMAC signature authentication for GET request with empty body
   */
  async healthCheck(): Promise<boolean> {
    try {
      await this.makeRequest('GET', '/api/internal/health', '');
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Handshake with GameDin - fetch reviewable moderation reports
   * Uses exact GameDin contract: GET /api/private/moderation/reports/reviewable
   * Empty body for signature calculation
   */
  async fetchReviewableReports(): Promise<any> {
    try {
      // For GET requests, body must be empty string for signature calculation
      const response = await this.makeRequest('GET', '/api/private/moderation/reports/reviewable', '');
      console.log('Handshake successful: fetched reviewable reports from GameDin');
      return response;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      console.error(`Handshake failed: GET /api/private/moderation/reports/reviewable - Error: ${message}`);
      throw new Error(`Failed to fetch reviewable reports: ${message}`);
    }
  }

  /**
   * Submit AI review advisory for a specific report
   * Uses exact GameDin contract: POST /api/private/moderation/reports/:id/ai-review
   * JSON body must be the exact raw body used for signature calculation
   */
  async submitAiReview(reportId: string, advisoryData: {
    aiStatus: string;
    aiSummary: string;
    aiReason: string;
    aiConfidence: number;
    aiRecommendedAction: string;
    aiEscalateToAdmin: boolean;
    aiProvider: string;
    aiModel: string;
  }): Promise<void> {
    try {
      // Use exact raw JSON string for signature calculation
      const bodyString = JSON.stringify(advisoryData);
      await this.makeRequest('POST', `/api/private/moderation/reports/${reportId}/ai-review`, bodyString);
      console.log(`Advisory write-back successful: submitted AI review for report ${reportId}`);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      console.error(`Advisory write-back failed: POST /api/private/moderation/reports/${reportId}/ai-review - Error: ${message}`);
      throw new Error(`Failed to submit AI review for report ${reportId}: ${message}`);
    }
  }

  /**
   * Get HMAC signature headers for GameDin internal API authentication
   * GameDin requires pure HMAC signature authentication only
   */
  private getAuthHeaders(body: string = ''): Record<string, string> {
    if (!this.config.signingSecret) {
      throw new Error('SHADOWFLOWER_SIGNING_SECRET is required for GameDin internal API authentication');
    }

    return this.signRequest(body);
  }

  /**
   * Sign a request with HMAC-SHA256 using exact GameDin contract
   * Returns signature headers for privileged requests
   * Uses timestamp:nonce:body format with Base64URL encoding
   */
  private signRequest(body: string): Record<string, string> {
    const signingConfig: SigningConfig = {
      secretKey: this.config.signingSecret,
      maxTimestampDelta: 300 * 1000, // 300 seconds
    };

    const signatureHeaders = signRequest(signingConfig, {
      body: body,
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
  }
}
