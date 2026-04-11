/**
 * Audit logging for security events
 * Provides structured logging for privileged actions and security events
 */

export enum AuditEventType {
  AUTH_SUCCESS = 'auth_success',
  AUTH_FAILURE = 'auth_failure',
  ADMIN_AUTH_SUCCESS = 'admin_auth_success',
  ADMIN_AUTH_FAILURE = 'admin_auth_failure',
  SIGNATURE_VERIFICATION_SUCCESS = 'signature_verification_success',
  SIGNATURE_VERIFICATION_FAILURE = 'signature_verification_failure',
  JOB_EXECUTION_SUCCESS = 'job_execution_success',
  JOB_EXECUTION_FAILURE = 'job_execution_failure',
  RATE_LIMIT_EXCEEDED = 'rate_limit_exceeded',
  CORS_REJECTED = 'cors_rejected',
  DISCORD_NOTIFICATION_SUCCESS = 'discord_notification_success',
  DISCORD_NOTIFICATION_FAILURE = 'discord_notification_failure',
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
export function logAuditEvent(event: AuditEvent): void {
  const sanitizedEvent = sanitizeAuditEvent(event);
  console.log(JSON.stringify(sanitizedEvent));
}

/**
 * Sanitize audit event to remove sensitive data
 */
function sanitizeAuditEvent(event: AuditEvent): AuditEvent {
  const sanitized = { ...event };

  if (sanitized.details) {
    // Remove sensitive keys from details
    const sensitiveKeys = [
      'apiKey',
      'secret',
      'token',
      'password',
      'authorization',
      'x-shadowflower-api-key',
      'x-shadowflower-admin-key',
      'x-shadowflower-signature',
      'signature',
      'webhookUrl',
      'botToken',
    ];

    const details = sanitized.details;
    Object.keys(details).forEach(key => {
      const lowerKey = key.toLowerCase();
      if (sensitiveKeys.some(sensitive => lowerKey.includes(sensitive.toLowerCase()))) {
        details[key] = '[REDACTED]';
      }
    });
  }

  return sanitized;
}

/**
 * Log authentication success
 */
export function logAuthSuccess(params: {
  requestId: string;
  clientId?: string;
  route?: string;
}): void {
  const event: AuditEvent = {
    eventType: AuditEventType.AUTH_SUCCESS,
    timestamp: new Date().toISOString(),
    requestId: params.requestId,
  };

  if (params.clientId) {
    event.clientId = params.clientId;
  }
  if (params.route) {
    event.route = params.route;
  }

  logAuditEvent(event);
}

/**
 * Log authentication failure
 */
export function logAuthFailure(params: {
  requestId: string;
  clientId?: string;
  route?: string;
  reason?: string;
}): void {
  const event: AuditEvent = {
    eventType: AuditEventType.AUTH_FAILURE,
    timestamp: new Date().toISOString(),
    requestId: params.requestId,
  };

  if (params.clientId) {
    event.clientId = params.clientId;
  }
  if (params.route) {
    event.route = params.route;
  }
  if (params.reason) {
    event.details = { reason: params.reason };
  }

  logAuditEvent(event);
}

/**
 * Log admin authentication success
 */
export function logAdminAuthSuccess(params: {
  requestId: string;
  clientId?: string;
  route?: string;
}): void {
  const event: AuditEvent = {
    eventType: AuditEventType.ADMIN_AUTH_SUCCESS,
    timestamp: new Date().toISOString(),
    requestId: params.requestId,
  };

  if (params.clientId) {
    event.clientId = params.clientId;
  }
  if (params.route) {
    event.route = params.route;
  }

  logAuditEvent(event);
}

/**
 * Log admin authentication failure
 */
export function logAdminAuthFailure(params: {
  requestId: string;
  clientId?: string;
  route?: string;
}): void {
  const event: AuditEvent = {
    eventType: AuditEventType.ADMIN_AUTH_FAILURE,
    timestamp: new Date().toISOString(),
    requestId: params.requestId,
  };

  if (params.clientId) {
    event.clientId = params.clientId;
  }
  if (params.route) {
    event.route = params.route;
  }

  logAuditEvent(event);
}

/**
 * Log signature verification success
 */
export function logSignatureVerificationSuccess(params: {
  requestId: string;
  clientId?: string;
  route?: string;
}): void {
  const event: AuditEvent = {
    eventType: AuditEventType.SIGNATURE_VERIFICATION_SUCCESS,
    timestamp: new Date().toISOString(),
    requestId: params.requestId,
  };

  if (params.clientId) {
    event.clientId = params.clientId;
  }
  if (params.route) {
    event.route = params.route;
  }

  logAuditEvent(event);
}

/**
 * Log signature verification failure
 */
export function logSignatureVerificationFailure(params: {
  requestId: string;
  clientId?: string;
  route?: string;
  reason?: string;
}): void {
  const event: AuditEvent = {
    eventType: AuditEventType.SIGNATURE_VERIFICATION_FAILURE,
    timestamp: new Date().toISOString(),
    requestId: params.requestId,
  };

  if (params.clientId) {
    event.clientId = params.clientId;
  }
  if (params.route) {
    event.route = params.route;
  }
  if (params.reason) {
    event.details = { reason: params.reason };
  }

  logAuditEvent(event);
}

/**
 * Log job execution success
 */
export function logJobExecutionSuccess(params: {
  requestId: string;
  jobId: string;
  itemsProcessed: number;
  duration: number;
}): void {
  logAuditEvent({
    eventType: AuditEventType.JOB_EXECUTION_SUCCESS,
    timestamp: new Date().toISOString(),
    requestId: params.requestId,
    details: {
      jobId: params.jobId,
      itemsProcessed: params.itemsProcessed,
      duration: params.duration,
    },
  });
}

/**
 * Log job execution failure
 */
export function logJobExecutionFailure(params: {
  requestId: string;
  jobId: string;
  error: string;
}): void {
  logAuditEvent({
    eventType: AuditEventType.JOB_EXECUTION_FAILURE,
    timestamp: new Date().toISOString(),
    requestId: params.requestId,
    details: {
      jobId: params.jobId,
      error: params.error,
    },
  });
}

/**
 * Log rate limit exceeded
 */
export function logRateLimitExceeded(params: {
  requestId: string;
  clientId: string;
  route?: string;
}): void {
  const event: AuditEvent = {
    eventType: AuditEventType.RATE_LIMIT_EXCEEDED,
    timestamp: new Date().toISOString(),
    requestId: params.requestId,
    clientId: params.clientId,
  };

  if (params.route) {
    event.route = params.route;
  }

  logAuditEvent(event);
}

/**
 * Log CORS rejection
 */
export function logCorsRejected(params: {
  requestId: string;
  origin?: string;
  route?: string;
}): void {
  const event: AuditEvent = {
    eventType: AuditEventType.CORS_REJECTED,
    timestamp: new Date().toISOString(),
    requestId: params.requestId,
  };

  if (params.origin) {
    event.details = { origin: params.origin };
  }
  if (params.route) {
    event.route = params.route;
  }

  logAuditEvent(event);
}

/**
 * Log Discord notification success
 */
export function logDiscordNotificationSuccess(params: {
  requestId?: string;
  notificationType: string;
}): void {
  const event: AuditEvent = {
    eventType: AuditEventType.DISCORD_NOTIFICATION_SUCCESS,
    timestamp: new Date().toISOString(),
    details: {
      notificationType: params.notificationType,
    },
  };

  if (params.requestId) {
    event.requestId = params.requestId;
  }

  logAuditEvent(event);
}

/**
 * Log Discord notification failure
 */
export function logDiscordNotificationFailure(params: {
  requestId?: string;
  notificationType: string;
  error: string;
}): void {
  const event: AuditEvent = {
    eventType: AuditEventType.DISCORD_NOTIFICATION_FAILURE,
    timestamp: new Date().toISOString(),
    details: {
      notificationType: params.notificationType,
      error: params.error,
    },
  };

  if (params.requestId) {
    event.requestId = params.requestId;
  }

  logAuditEvent(event);
}
