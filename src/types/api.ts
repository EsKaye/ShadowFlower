/**
 * API request/response types for ShadowFlower service
 */

import { ModerationInput, ModerationOutput } from './moderation';

export interface HealthResponse {
  status: 'healthy' | 'unhealthy';
  timestamp: string;
  version: string;
  uptime: number;
  services: {
    gamedin: 'connected' | 'disconnected';
    provider: 'connected' | 'disconnected';
  };
}

export interface ModerationJobRequest {
  dryRun?: boolean;
  batchSize?: number;
  provider?: string;
  model?: string;
}

export interface ModerationJobResponse {
  success: boolean;
  data?: ModerationOutput;
  error?: string;
  jobId: string;
}

export interface ApiError {
  error: string;
  message: string;
  timestamp: string;
  requestId: string;
}

export interface AuthHeaders {
  'x-shadowflower-api-key': string;
  'content-type': 'application/json';
}

export interface GameDinAuthHeaders {
  'authorization': string;
  'x-service': 'shadowflower';
  'content-type': 'application/json';
}
