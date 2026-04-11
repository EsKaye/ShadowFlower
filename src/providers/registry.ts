/**
 * Provider registry for managing moderation providers
 */

import { IModerationProvider } from './interface';
import { GeminiProvider } from './gemini';
import { ProviderConfig } from '../types';

export class ProviderRegistry {
  private providers = new Map<string, IModerationProvider>();

  constructor() {
    this.registerProvider('gemini', new GeminiProvider());
  }

  registerProvider(name: string, provider: IModerationProvider): void {
    this.providers.set(name.toLowerCase(), provider);
  }

  getProvider(name: string): IModerationProvider | undefined {
    return this.providers.get(name.toLowerCase());
  }

  async initializeProvider(name: string, config: ProviderConfig): Promise<void> {
    const provider = this.getProvider(name);
    if (!provider) {
      throw new Error(`Provider '${name}' not found`);
    }
    await provider.initialize(config);
  }

  getAvailableProviders(): string[] {
    return Array.from(this.providers.keys());
  }

  async healthCheckAll(): Promise<Record<string, boolean>> {
    const results: Record<string, boolean> = {};
    
    for (const [name, provider] of this.providers) {
      try {
        results[name] = await provider.healthCheck();
      } catch {
        results[name] = false;
      }
    }

    return results;
  }
}

// Singleton instance
export const providerRegistry = new ProviderRegistry();
