/**
 * Configuration management for ShadowFlower service
 */
import { ServiceConfig, EnvironmentConfig, ModerationConfig } from '../types';
/**
 * Validate secret strength
 * Ensures secrets meet minimum security requirements
 */
declare function validateSecretStrength(secret: string, secretName: string): void;
declare function getEnvironmentConfig(): EnvironmentConfig;
declare function getModerationConfig(): ModerationConfig;
export declare function getConfig(): ServiceConfig;
export { getEnvironmentConfig, getModerationConfig, validateSecretStrength };
//# sourceMappingURL=index.d.ts.map