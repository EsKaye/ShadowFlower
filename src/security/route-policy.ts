/**
 * Route classification and access control policy
 * Defines explicit trust boundaries for all ShadowFlower routes
 */

export enum RouteClassification {
  /** Public route - no authentication required, minimal information only */
  PUBLIC = 'public',
  /** Protected route - requires SHADOWFLOWER_API_KEY for server-to-server auth */
  PROTECTED = 'protected',
  /** Admin route - requires SHADOWFLOWER_ADMIN_KEY, returns 404 on failure */
  ADMIN = 'admin',
  /** Disabled route - not exposed, returns 404 */
  DISABLED = 'disabled',
}

export interface RoutePolicy {
  path: string;
  classification: RouteClassification;
  description: string;
  allowedMethods: string[];
  requiresAuth: boolean;
  requiresAdmin: boolean;
}

/**
 * Central route policy for ShadowFlower
 * This is the source of truth for route access control
 */
export const ROUTE_POLICY: RoutePolicy[] = [
  {
    path: '/',
    classification: RouteClassification.PUBLIC,
    description: 'Root endpoint - returns 404 to avoid information disclosure',
    allowedMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    requiresAuth: false,
    requiresAdmin: false,
  },
  {
    path: '/api/health',
    classification: RouteClassification.PUBLIC,
    description: 'Health check endpoint - minimal operational status only',
    allowedMethods: ['GET'],
    requiresAuth: false,
    requiresAdmin: false,
  },
  {
    path: '/api/jobs/moderation/run',
    classification: RouteClassification.PROTECTED,
    description: 'Execute moderation job - requires server-to-server authentication',
    allowedMethods: ['POST'],
    requiresAuth: true,
    requiresAdmin: false,
  },
  {
    path: '/api/jobs/moderation/dry-run',
    classification: RouteClassification.PROTECTED,
    description: 'Execute moderation job in dry-run mode - requires server-to-server authentication',
    allowedMethods: ['POST'],
    requiresAuth: true,
    requiresAdmin: false,
  },
];

/**
 * Get route policy by path
 */
export function getRoutePolicy(path: string): RoutePolicy | undefined {
  return ROUTE_POLICY.find(policy => policy.path === path);
}

/**
 * Check if route requires authentication
 */
export function routeRequiresAuth(path: string): boolean {
  const policy = getRoutePolicy(path);
  return policy?.requiresAuth || false;
}

/**
 * Check if route requires admin authentication
 */
export function routeRequiresAdmin(path: string): boolean {
  const policy = getRoutePolicy(path);
  return policy?.requiresAdmin || false;
}

/**
 * Get all routes by classification
 */
export function getRoutesByClassification(classification: RouteClassification): RoutePolicy[] {
  return ROUTE_POLICY.filter(policy => policy.classification === classification);
}
