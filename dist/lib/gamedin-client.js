/**
 * GameDin client wrapper for HTTP integration
 * Uses HMAC signing for privileged server-to-server requests
 */
import axios from 'axios';
import { signRequest } from '../security/signing';
export class GameDinClient {
    client;
    config;
    constructor(config) {
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
        this.client.interceptors.response.use((response) => response, (error) => {
            throw new Error(`GameDin API error: ${error.response?.data?.message || error.message}`);
        });
    }
    /**
     * Fetch moderation queue from GameDin
     */
    async fetchModerationQueue(options = {}) {
        try {
            const response = await this.client.get('/api/internal/moderation/queue', {
                params: {
                    limit: options.limit || 50,
                    offset: options.offset || 0,
                    itemType: options.itemType,
                },
            });
            return response.data;
        }
        catch (error) {
            throw new Error(`Failed to fetch moderation queue: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }
    /**
     * Send moderation advisory results back to GameDin
     * Uses HMAC signing if signing secret is configured
     */
    async sendAdvisoryResults(payload) {
        try {
            const headers = {
                ...this.getAuthHeaders(),
            };
            // Add HMAC signature if signing secret is configured
            if (this.config.signingSecret) {
                const bodyString = JSON.stringify(payload);
                const signatureHeaders = this.signRequest(bodyString);
                Object.entries(signatureHeaders).forEach(([key, value]) => {
                    headers[key] = value;
                });
            }
            await this.client.post('/api/internal/moderation/advisory', payload, { headers });
        }
        catch (error) {
            throw new Error(`Failed to send advisory results: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }
    /**
     * Get specific moderation item by ID
     */
    async getModerationItem(itemId) {
        try {
            const response = await this.client.get(`/api/internal/moderation/items/${itemId}`);
            return response.data;
        }
        catch (error) {
            throw new Error(`Failed to fetch moderation item: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }
    /**
     * Update moderation item status (if needed)
     */
    async updateModerationItemStatus(itemId, status) {
        try {
            await this.client.patch(`/api/internal/moderation/items/${itemId}`, {
                status,
                updatedAt: new Date().toISOString(),
            });
        }
        catch (error) {
            throw new Error(`Failed to update moderation item: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }
    /**
     * Health check for GameDin service
     */
    async healthCheck() {
        try {
            const response = await this.client.get('/api/internal/health');
            return response.status === 200;
        }
        catch {
            return false;
        }
    }
    /**
     * Handshake with GameDin - fetch reviewable moderation reports
     * Uses exact GameDin contract: GET /api/private/moderation/reports/reviewable
     * Empty body for signature calculation
     */
    async fetchReviewableReports() {
        try {
            const headers = {
                ...this.getAuthHeaders(),
            };
            // Add HMAC signature if signing secret is configured
            if (this.config.signingSecret) {
                // For GET requests, body must be empty string for signature calculation
                const signatureHeaders = this.signRequest('');
                Object.entries(signatureHeaders).forEach(([key, value]) => {
                    headers[key] = value;
                });
            }
            const response = await this.client.get('/api/private/moderation/reports/reviewable', { headers });
            console.log('Handshake successful: fetched reviewable reports from GameDin');
            return response.data;
        }
        catch (error) {
            const status = error instanceof Error && 'response' in error ? error.response?.status : 'unknown';
            const message = error instanceof Error ? error.message : 'Unknown error';
            console.error(`Handshake failed: GET /api/private/moderation/reports/reviewable - Status: ${status}, Error: ${message}`);
            throw new Error(`Failed to fetch reviewable reports: ${message}`);
        }
    }
    /**
     * Submit AI review advisory for a specific report
     * Uses exact GameDin contract: POST /api/private/moderation/reports/:id/ai-review
     * JSON body must be the exact raw body used for signature calculation
     */
    async submitAiReview(reportId, advisoryData) {
        try {
            const headers = {
                ...this.getAuthHeaders(),
            };
            // Add HMAC signature if signing secret is configured
            if (this.config.signingSecret) {
                // Use exact raw JSON string for signature calculation
                const bodyString = JSON.stringify(advisoryData);
                const signatureHeaders = this.signRequest(bodyString);
                Object.entries(signatureHeaders).forEach(([key, value]) => {
                    headers[key] = value;
                });
            }
            await this.client.post(`/api/private/moderation/reports/${reportId}/ai-review`, advisoryData, { headers });
            console.log(`Advisory write-back successful: submitted AI review for report ${reportId}`);
        }
        catch (error) {
            const status = error instanceof Error && 'response' in error ? error.response?.status : 'unknown';
            const message = error instanceof Error ? error.message : 'Unknown error';
            console.error(`Advisory write-back failed: POST /api/private/moderation/reports/${reportId}/ai-review - Status: ${status}, Error: ${message}`);
            throw new Error(`Failed to submit AI review for report ${reportId}: ${message}`);
        }
    }
    /**
     * Get authentication headers for server-to-server communication
     */
    getAuthHeaders() {
        return {
            'authorization': `Bearer ${this.config.apiKey}`,
            'x-service': 'shadowflower',
            'content-type': 'application/json',
        };
    }
    /**
     * Sign a request with HMAC-SHA256 using exact GameDin contract
     * Returns signature headers for privileged requests
     * Uses timestamp:nonce:body format with Base64URL encoding
     */
    signRequest(body) {
        if (!this.config.signingSecret) {
            return {};
        }
        const signingConfig = {
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
    updateConfig(newConfig) {
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
//# sourceMappingURL=gamedin-client.js.map