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
                const signatureHeaders = this.signRequest('POST', '/api/internal/moderation/advisory', payload);
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
     * Sign a request with HMAC-SHA256
     * Returns signature headers for privileged requests
     */
    signRequest(method, path, body) {
        if (!this.config.signingSecret) {
            return {};
        }
        const signingConfig = {
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