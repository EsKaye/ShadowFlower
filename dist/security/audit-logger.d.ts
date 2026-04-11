/**
 * Audit logging for security events
 * Provides structured logging for privileged actions and security events
 */
export declare enum AuditEventType {
    AUTH_SUCCESS = "auth_success",
    AUTH_FAILURE = "auth_failure",
    ADMIN_AUTH_SUCCESS = "admin_auth_success",
    ADMIN_AUTH_FAILURE = "admin_auth_failure",
    SIGNATURE_VERIFICATION_SUCCESS = "signature_verification_success",
    SIGNATURE_VERIFICATION_FAILURE = "signature_verification_failure",
    JOB_EXECUTION_SUCCESS = "job_execution_success",
    JOB_EXECUTION_FAILURE = "job_execution_failure",
    RATE_LIMIT_EXCEEDED = "rate_limit_exceeded",
    CORS_REJECTED = "cors_rejected",
    DISCORD_NOTIFICATION_SUCCESS = "discord_notification_success",
    DISCORD_NOTIFICATION_FAILURE = "discord_notification_failure"
}
export interface AuditEvent {
    eventType: AuditEventType;
    timestamp: string;
    requestId?: string;
    clientId?: string;
    route?: string;
    method?: string;
    statusCode?: number;
    duration?: number;
    details?: Record<string, unknown>;
}
/**
 * Log an audit event
 * Sanitizes the event to ensure no secrets are logged
 */
export declare function logAuditEvent(event: AuditEvent): void;
/**
 * Log authentication success
 */
export declare function logAuthSuccess(params: {
    requestId: string;
    clientId?: string;
    route?: string;
}): void;
/**
 * Log authentication failure
 */
export declare function logAuthFailure(params: {
    requestId: string;
    clientId?: string;
    route?: string;
    reason?: string;
}): void;
/**
 * Log admin authentication success
 */
export declare function logAdminAuthSuccess(params: {
    requestId: string;
    clientId?: string;
    route?: string;
}): void;
/**
 * Log admin authentication failure
 */
export declare function logAdminAuthFailure(params: {
    requestId: string;
    clientId?: string;
    route?: string;
}): void;
/**
 * Log signature verification success
 */
export declare function logSignatureVerificationSuccess(params: {
    requestId: string;
    clientId?: string;
    route?: string;
}): void;
/**
 * Log signature verification failure
 */
export declare function logSignatureVerificationFailure(params: {
    requestId: string;
    clientId?: string;
    route?: string;
    reason?: string;
}): void;
/**
 * Log job execution success
 */
export declare function logJobExecutionSuccess(params: {
    requestId: string;
    jobId: string;
    itemsProcessed: number;
    duration: number;
}): void;
/**
 * Log job execution failure
 */
export declare function logJobExecutionFailure(params: {
    requestId: string;
    jobId: string;
    error: string;
}): void;
/**
 * Log rate limit exceeded
 */
export declare function logRateLimitExceeded(params: {
    requestId: string;
    clientId: string;
    route?: string;
}): void;
/**
 * Log CORS rejection
 */
export declare function logCorsRejected(params: {
    requestId: string;
    origin?: string;
    route?: string;
}): void;
/**
 * Log Discord notification success
 */
export declare function logDiscordNotificationSuccess(params: {
    requestId?: string;
    notificationType: string;
}): void;
/**
 * Log Discord notification failure
 */
export declare function logDiscordNotificationFailure(params: {
    requestId?: string;
    notificationType: string;
    error: string;
}): void;
//# sourceMappingURL=audit-logger.d.ts.map