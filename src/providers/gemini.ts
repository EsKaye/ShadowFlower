/**
 * Gemini AI provider implementation for moderation
 */

import axios from 'axios';
import { IModerationProvider } from './interface';
import { ModerationItem, ProviderResponse, ProviderConfig, ModerationAction, ModerationSeverity } from '../types';

export class GeminiProvider implements IModerationProvider {
  private config: ProviderConfig | null = null;
  private readonly baseUrl = 'https://generativelanguage.googleapis.com/v1beta';

  async initialize(config: ProviderConfig): Promise<void> {
    this.config = config;
    
    // Validate configuration
    if (!config.apiKey) {
      throw new Error('Gemini API key is required');
    }

    // Test connection with health check
    const isHealthy = await this.healthCheck();
    if (!isHealthy) {
      throw new Error('Failed to initialize Gemini provider');
    }
  }

  async analyzeItem(item: ModerationItem): Promise<ProviderResponse> {
    if (!this.config) {
      throw new Error('Provider not initialized');
    }

    const prompt = this.buildModerationPrompt(item);
    
    try {
      const response = await axios.post(
        `${this.baseUrl}/models/${this.config.model}:generateContent?key=${this.config.apiKey}`,
        {
          contents: [{
            parts: [{
              text: prompt
            }]
          }],
          generationConfig: {
            temperature: 0.3,
            maxOutputTokens: 1000,
          }
        },
        {
          timeout: this.config.timeout,
        }
      );

      const generatedText = response.data.candidates?.[0]?.content?.parts?.[0]?.text;
      if (!generatedText) {
        throw new Error('No response from Gemini');
      }

      return this.parseResponse(generatedText);
    } catch (error) {
      throw new Error(`Gemini analysis failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async analyzeBatch(items: ModerationItem[]): Promise<ProviderResponse[]> {
    const responses: ProviderResponse[] = [];
    
    // Process items individually for now (Gemini has rate limits)
    for (const item of items) {
      try {
        const response = await this.analyzeItem(item);
        responses.push(response);
      } catch (error) {
        // Return a safe default response for failed items
        responses.push(this.createDefaultResponse(item.id, error instanceof Error ? error.message : 'Unknown error'));
      }
    }

    return responses;
  }

  async healthCheck(): Promise<boolean> {
    if (!this.config) {
      return false;
    }

    try {
      const response = await axios.get(
        `${this.baseUrl}/models/${this.config.model}?key=${this.config.apiKey}`,
        { timeout: 5000 }
      );
      return response.status === 200;
    } catch {
      return false;
    }
  }

  getProviderInfo() {
    return {
      name: 'Gemini',
      models: ['gemini-1.5-pro', 'gemini-1.5-flash', 'gemini-pro'],
      maxBatchSize: 1, // Process individually due to rate limits
      supportedTypes: ['post', 'comment', 'profile', 'message', 'image', 'video']
    };
  }

  private buildModerationPrompt(item: ModerationItem): string {
    return `
You are a content moderation AI for GameDin.xyz. Analyze the following content and provide moderation guidance.

Content Details:
- Type: ${item.type}
- Content: "${item.content}"
- Author: ${item.author.username} (ID: ${item.author.id})
- Report Count: ${item.metadata.reportCount}
- Created: ${item.metadata.createdAt}

Instructions:
1. Analyze for policy violations (harassment, hate, violence, sexual content, spam, misinformation)
2. Consider context and author reputation
3. Provide a clear recommendation
4. Estimate confidence level (0-1)

Respond in JSON format:
{
  "summary": "Brief summary of findings",
  "reasoning": "Detailed explanation of analysis",
  "confidence": 0.85,
  "recommendedAction": "approve|review|escalate|remove|suspend",
  "escalateToAdmin": false,
  "severity": "low|medium|high|critical",
  "categories": {
    "harassment": false,
    "hate": false,
    "violence": false,
    "sexual": false,
    "spam": false,
    "misinformation": false
  }
}
`;
  }

  private parseResponse(responseText: string): ProviderResponse {
    try {
      // Extract JSON from response
      const jsonMatch = responseText.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('No JSON found in response');
      }

      const parsed = JSON.parse(jsonMatch[0]);
      
      return {
        summary: parsed.summary || 'Analysis completed',
        reasoning: parsed.reasoning || 'Content analyzed',
        confidence: typeof parsed.confidence === 'number' ? parsed.confidence : 0.5,
        recommendedAction: this.validateAction(parsed.recommendedAction),
        escalateToAdmin: Boolean(parsed.escalateToAdmin),
        severity: this.validateSeverity(parsed.severity),
        categories: {
          harassment: Boolean(parsed.categories?.harassment),
          hate: Boolean(parsed.categories?.hate),
          violence: Boolean(parsed.categories?.violence),
          sexual: Boolean(parsed.categories?.sexual),
          spam: Boolean(parsed.categories?.spam),
          misinformation: Boolean(parsed.categories?.misinformation),
        }
      };
    } catch (error) {
      throw new Error(`Failed to parse Gemini response: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  private validateAction(action: string): ModerationAction {
    const validActions: ModerationAction[] = ['approve', 'review', 'escalate', 'remove', 'suspend'];
    return validActions.includes(action as ModerationAction) ? action as ModerationAction : 'review';
  }

  private validateSeverity(severity: string): ModerationSeverity {
    const validSeverities: ModerationSeverity[] = ['low', 'medium', 'high', 'critical'];
    return validSeverities.includes(severity as ModerationSeverity) ? severity as ModerationSeverity : 'medium';
  }

  private createDefaultResponse(_itemId: string, error: string): ProviderResponse {
    return {
      summary: `Analysis failed: ${error}`,
      reasoning: 'Unable to analyze content due to provider error',
      confidence: 0,
      recommendedAction: 'review',
      escalateToAdmin: true,
      severity: 'medium',
      categories: {
        harassment: false,
        hate: false,
        violence: false,
        sexual: false,
        spam: false,
        misinformation: false,
      }
    };
  }
}
