/**
 * Route classification and access control policy
 * Defines explicit trust boundaries for all ShadowFlower routes
 */
export var RouteClassification;
(function (RouteClassification) {
    /** Public route - no authentication required, minimal information only */
    RouteClassification["PUBLIC"] = "public";
    /** Protected route - requires SHADOWFLOWER_API_KEY for server-to-server auth */
    RouteClassification["PROTECTED"] = "protected";
    /** Admin route - requires SHADOWFLOWER_ADMIN_KEY, returns 404 on failure */
    RouteClassification["ADMIN"] = "admin";
    /** Disabled route - not exposed, returns 404 */
    RouteClassification["DISABLED"] = "disabled";
})(RouteClassification || (RouteClassification = {}));
/**
 * Central route policy for ShadowFlower
 * This is the source of truth for route access control
 */
export const ROUTE_POLICY = [
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
export function getRoutePolicy(path) {
    return ROUTE_POLICY.find(policy => policy.path === path);
}
/**
 * Check if route requires authentication
 */
export function routeRequiresAuth(path) {
    const policy = getRoutePolicy(path);
    return policy?.requiresAuth || false;
}
/**
 * Check if route requires admin authentication
 */
export function routeRequiresAdmin(path) {
    const policy = getRoutePolicy(path);
    return policy?.requiresAdmin || false;
}
/**
 * Get all routes by classification
 */
export function getRoutesByClassification(classification) {
    return ROUTE_POLICY.filter(policy => policy.classification === classification);
}
//# sourceMappingURL=route-policy.js.map