/**
 * Provider registry for managing moderation providers
 */
import { GeminiProvider } from './gemini';
export class ProviderRegistry {
    providers = new Map();
    constructor() {
        this.registerProvider('gemini', new GeminiProvider());
    }
    registerProvider(name, provider) {
        this.providers.set(name.toLowerCase(), provider);
    }
    getProvider(name) {
        return this.providers.get(name.toLowerCase());
    }
    async initializeProvider(name, config) {
        const provider = this.getProvider(name);
        if (!provider) {
            throw new Error(`Provider '${name}' not found`);
        }
        await provider.initialize(config);
    }
    getAvailableProviders() {
        return Array.from(this.providers.keys());
    }
    async healthCheckAll() {
        const results = {};
        for (const [name, provider] of this.providers) {
            try {
                results[name] = await provider.healthCheck();
            }
            catch {
                results[name] = false;
            }
        }
        return results;
    }
}
// Singleton instance
export const providerRegistry = new ProviderRegistry();
//# sourceMappingURL=registry.js.map