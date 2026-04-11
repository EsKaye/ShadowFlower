/**
 * Route classification and access control policy
 * Defines explicit trust boundaries for all ShadowFlower routes
 */
export declare enum RouteClassification {
    /** Public route - no authentication required, minimal information only */
    PUBLIC = "public",
    /** Protected route - requires SHADOWFLOWER_API_KEY for server-to-server auth */
    PROTECTED = "protected",
    /** Admin route - requires SHADOWFLOWER_ADMIN_KEY, returns 404 on failure */
    ADMIN = "admin",
    /** Disabled route - not exposed, returns 404 */
    DISABLED = "disabled"
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
export declare const ROUTE_POLICY: RoutePolicy[];
/**
 * Get route policy by path
 */
export declare function getRoutePolicy(path: string): RoutePolicy | undefined;
/**
 * Check if route requires authentication
 */
export declare function routeRequiresAuth(path: string): boolean;
/**
 * Check if route requires admin authentication
 */
export declare function routeRequiresAdmin(path: string): boolean;
/**
 * Get all routes by classification
 */
export declare function getRoutesByClassification(classification: RouteClassification): RoutePolicy[];
//# sourceMappingURL=route-policy.d.ts.map