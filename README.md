# 🌸 ShadowFlower

Backend moderation and trust/safety service for GameDin.xyz. ShadowFlower is a lightweight, secure, server-to-server moderation worker that analyzes content and provides advisory recommendations to the GameDin moderator dashboard.

## What ShadowFlower Is

- **Backend Service**: Server-to-server moderation API for GameDin
- **AI-Powered**: Uses AI providers (Gemini, etc.) to analyze content
- **Advisory Only**: Provides recommendations, does not take autonomous destructive actions
- **Secure**: Server-to-server authentication with proper API key management
- **Scalable**: Batch processing with configurable limits and timeouts

## What ShadowFlower Is Not

- **User-Facing**: No direct user chat or public interface
- **Autonomous Moderator**: Does not automatically ban/delete content
- **Social Assistant**: Not the public voice of GameDin
- **Full Platform**: Not a comprehensive moderation dashboard
- **Monolith**: Lightweight and focused, not over-engineered

## Current Status

### Development Scaffold - Requires Testing and Validation

ShadowFlower is currently a development scaffold with the following characteristics:

**What Works:**
- TypeScript implementation builds cleanly
- Vercel deployment structure configured for root deployment
- API endpoints properly structured and protected
- Security middleware with API key authentication
- Provider abstraction interface implemented
- GameDin HTTP client wrapper implemented

**What Requires Validation:**
- Provider integration not tested against real AI provider APIs
- GameDin client not tested against actual GameDin endpoints
- End-to-end moderation workflow not validated
- Environment configuration not tested in deployment
- Error handling not tested in production scenarios

**Known Limitations:**
- Rate limiting is in-memory only (resets on function restart)
- CORS configuration requires ALLOWED_ORIGIN environment variable
- No persistent storage for rate limiting or request tracking
- Security middleware assumes proper environment configuration

**Before Production Deployment:**
- Test provider integration with real AI provider APIs
- Validate GameDin client against actual GameDin endpoints
- Implement production-grade rate limiting with persistent storage
- Add comprehensive integration tests
- Validate error handling in production scenarios
- Set up monitoring and alerting

## Architecture

### Core Components

- **Provider Abstraction**: Swappable AI providers (Gemini, etc.)
- **GameDin Client**: HTTP wrapper for GameDin API integration with HMAC signing
- **Moderation Pipeline**: Batch processing with job locking and idempotency
- **Security Layer**: Authentication, HMAC verification, rate limiting
- **Infrastructure**: Upstash Redis for distributed coordination
- **API Routes**: RESTful endpoints for health checks and job execution

### Directory Structure

```
src/
  config/          # Environment and service configuration
  infrastructure/  # Upstash Redis wrapper for distributed coordination
  lib/             # GameDin client and utilities
  providers/       # AI provider implementations
  jobs/            # Moderation job pipeline
  routes/          # API endpoints
  security/        # Authentication, HMAC signing, audit logging
  types/           # TypeScript type definitions
```

### Infrastructure

ShadowFlower uses the following infrastructure:

- **Runtime**: Vercel serverless functions
- **Persistent Coordination**: Upstash Redis for distributed rate limiting, replay protection, job locking, and idempotency
- **Logging**: Vercel Runtime Logs with structured JSON output
- **GameDin Integration**: HTTPS with HMAC-SHA256 signing for privileged requests
- **Scheduler Support**: Scheduler-agnostic job execution (supports Vercel cron, QStash, or manual triggers)

### Degradation When Redis Unavailable

If Upstash Redis is not configured or becomes unavailable, the following protections degrade gracefully:

- **Rate Limiting**: Falls back to in-memory rate limiting (per-function-instance only)
- **Replay Protection**: Falls back to timestamp-only validation (no nonce tracking)
- **Job Locking**: Allows concurrent job execution (no distributed lock)
- **Idempotency**: No idempotency checks (repeated requests execute fully)

## API Endpoints

### Public Endpoints

- `GET /api/health` - Service health check and connectivity status (minimal, safe)

### Protected Endpoints

All protected endpoints require `x-shadowflower-api-key` header.

- `POST /api/jobs/moderation/run` - Execute moderation job (sends results to GameDin)
- `POST /api/jobs/moderation/dry-run` - Execute moderation job in dry-run mode
- `POST /api/jobs/moderation/schedule` - Scheduler-triggered moderation job (supports Vercel cron, QStash, or manual triggers)

### Admin Endpoints

Admin endpoints require `x-shadowflower-admin-key` header. If the key is invalid, the endpoint returns 404 instead of 401 to avoid revealing admin endpoints.

- No admin endpoints currently implemented (reserved for future use)

### Scheduler Integration

ShadowFlower supports scheduler-agnostic job execution through the `/api/jobs/moderation/schedule` endpoint:

- **Vercel Cron**: Can be triggered daily via Vercel cron jobs (Hobby plan limited to once per day)
- **External Schedulers**: Can be triggered hourly by external schedulers like QStash
- **Manual Execution**: Can be triggered manually with API authentication

The scheduler endpoint supports:
- Idempotency keys to prevent duplicate executions
- Optional lock skipping for manual execution
- Scheduler ID tracking for observability

## Security Hardening

ShadowFlower has undergone comprehensive security hardening with the following measures:

### Route Classification

All routes are explicitly classified by access level:

- **Public**: `/api/health` - Minimal operational status only
- **Protected**: `/api/jobs/moderation/run`, `/api/jobs/moderation/dry-run`, `/api/jobs/moderation/schedule` - Require `SHADOWFLOWER_API_KEY`
- **Admin**: Reserved endpoints - Require `SHADOWFLOWER_ADMIN_KEY` (returns 404 if invalid)

### HMAC Signature Verification

ShadowFlower supports HMAC-SHA256 signature verification for enhanced inter-service security:

- **Optional**: Only active when `SHADOWFLOWER_SIGNING_SECRET` is configured
- **Headers Required**: `x-shadowflower-timestamp`, `x-shadowflower-nonce`, `x-shadowflower-signature`
- **Replay Protection**: Nonces tracked in Upstash Redis with 5-minute TTL
- **Timestamp Validation**: Rejects requests with timestamps outside 5-minute window
- **Degrades Gracefully**: Falls back to API key-only auth if Redis unavailable

### Distributed Rate Limiting

ShadowFlower uses Upstash Redis for production-grade distributed rate limiting:

- **Scope**: Per-IP rate limiting across all function instances
- **Fallback**: In-memory rate limiting if Redis unavailable (per-instance only)
- **Configurable**: Window size and request limits per endpoint
- **Audit Logging**: All rate limit violations logged with request context

### Job Locking and Idempotency

ShadowFlower uses Redis for job coordination:

- **Distributed Locks**: Prevents concurrent moderation job execution
- **Idempotency Keys**: Cache job results to prevent duplicate processing
- **Lock TTL**: 5-minute lock timeout with automatic release
- **Safe Fallback**: Allows concurrent execution if Redis unavailable

### GameDin Integration Security

All privileged requests to GameDin use enhanced security:

- **HTTPS Only**: All GameDin communication over HTTPS
- **HMAC Signing**: Optional HMAC-SHA256 signing for privileged requests
- **Server-to-Server**: Uses dedicated inter-service API keys
- **Timeout Handling**: Configurable timeouts with proper error handling
- **No Direct DB Access**: All data access through GameDin API only

### Authentication and Authorization

- **API Key Authentication**: Protected routes require `x-shadowflower-api-key` header
- **Admin Gate**: Admin routes require `x-shadowflower-admin-key` header (returns 404 on failure)
- **HMAC Signing**: Inter-service requests can use HMAC-SHA256 signatures for enhanced security (optional)
- **CORS Validation**: Strict CORS checking against allowed origins (rejects invalid origins with 403)

### Audit Logging

All security events are logged in structured JSON format:

- Authentication successes and failures
- Admin authentication attempts
- Signature verification failures
- Rate limit exceeded events
- CORS rejections
- Discord notification successes and failures

Logs are sanitized to remove sensitive data (API keys, secrets, tokens).

### Information Disclosure

- Health endpoint no longer exposes version or uptime
- Error messages are generic in production
- Stack traces never exposed in responses
- Root endpoint returns 404 with minimal response

### Rate Limiting

Current rate limiting is in-memory only (dev-grade):
- Resets on function restart
- No distributed coordination
- Documented limitation in code comments

For production-grade rate limiting, implement distributed rate limiting with persistent storage.

### Discord Integration

- Webhook URL stored in environment variables only
- 10-second timeout on webhook requests
- Audit logging for all notification attempts
- Error handling prevents notification spam loops

### Dependencies

- Minimal dependency footprint (only @vercel/node and axios)
- Removed unnecessary crypto dependency (built into Node.js)
- All dependencies actively maintained and security-reviewed

### Current Limitations

- **Rate Limiting**: In-memory only, resets on function restart
- **HMAC Signing**: Implemented but not yet integrated into route middleware
- **Audit Logs**: Console output only, not centralized or persistent
- **Secret Validation**: No secret strength validation at startup
- **Discord Integration**: Not yet integrated into moderation pipeline

### What Remains Before Production Readiness

- Integrate HMAC signature verification into protected route middleware
- Implement distributed rate limiting with persistent storage
- Set up centralized audit log aggregation
- Add secret strength validation at startup
- Integrate Discord notifications into moderation pipeline
- Add comprehensive integration tests
- Set up monitoring and alerting for security events

## Environment Variables

### Required

```bash
GAMEDIN_BASE_URL=https://api.gamedin.xyz
SHADOWFLOWER_API_KEY=your_shadowflower_api_key
GAMEDIN_SHADOWFLOWER_API_KEY=your_gamedin_shadowflower_api_key
ALLOWED_ORIGIN=http://localhost:3000
```

### Optional

```bash
GEMINI_API_KEY=your_gemini_api_key
NODE_ENV=development
DEFAULT_BATCH_SIZE=10
DEFAULT_PROVIDER=gemini
DEFAULT_MODEL=gemini-2.5-flash
PROVIDER_TIMEOUT=30000
MAX_RETRIES=3
DRY_RUN_DEFAULT=true
SHADOWFLOWER_ADMIN_KEY=your_shadowflower_admin_key
DISCORD_WEBHOOK_URL=your_discord_webhook_url
DISCORD_ALERT_CHANNEL_ID=your_alert_channel_id
DISCORD_DIGEST_CHANNEL_ID=your_digest_channel_id
DISCORD_ADMIN_CHANNEL_ID=your_admin_channel_id
```

## Local Development

### Setup

1. Clone the repository
2. Copy environment configuration: `cp .env.example .env`
3. Install dependencies: `npm install`
4. Fill in your API keys in `.env`

### Running Locally

```bash
# Development mode with hot reload
npm run dev

# Build for production
npm run build

# Type checking
npm run type-check

# Linting
npm run lint
```

### Testing Endpoints

```bash
# Health check (public)
curl http://localhost:3000/api/health

# Moderation job (protected)
curl -X POST http://localhost:3000/api/jobs/moderation/run \
  -H "x-shadowflower-api-key: your_api_key" \
  -H "Content-Type: application/json" \
  -d '{"batchSize": 5, "dryRun": true}'
```

## Vercel Deployment

### Root Deployment

This repository is configured for **root-level deployment** on Vercel. The entire service deploys from the repository root, not from a subdirectory.

### Deployment Steps

1. **Configure Environment Variables**
   - Go to Vercel dashboard
   - Add all required environment variables
   - Set production API keys

2. **Deploy**
   ```bash
   # Deploy to production
   vercel --prod
   
   # Preview deployment
   vercel
   ```

3. **Verify Deployment**
   - Test `/api/health` endpoint
   - Test protected endpoints with API keys
   - Check Vercel function logs

### Vercel Configuration

- `vercel.json` - Vercel deployment configuration
- Functions located in `src/routes/`
- TypeScript builds to `dist/`
- Automatic API routing from `/api/*` to route handlers

## GameDin Integration

### Authentication

ShadowFlower uses server-to-server authentication with GameDin:

```typescript
// ShadowFlower -> GameDin
Authorization: Bearer <GAMEDIN_SHADOWFLOWER_API_KEY>
X-Service: shadowflower
```

### Moderation Flow

1. **Fetch Queue**: ShadowFlower requests moderation items from GameDin
2. **Analyze Content**: AI provider analyzes each item
3. **Generate Advisory**: Creates structured recommendations
4. **Send Results**: Posts advisory results back to GameDin
5. **Human Review**: GameDin moderators review and take action

### Advisory Payload

```typescript
{
  results: [{
    itemId: string,
    aiSummary: string,
    aiReason: string,
    aiConfidence: number,
    aiRecommendedAction: 'approve' | 'review' | 'escalate' | 'remove' | 'suspend',
    aiEscalateToAdmin: boolean,
    aiProvider: string,
    aiModel: string,
    severity: 'low' | 'medium' | 'high' | 'critical',
    categories: {
      harassment: boolean,
      hate: boolean,
      violence: boolean,
      sexual: boolean,
      spam: boolean,
      misinformation: boolean
    }
  }],
  job: {
    id: string,
    startedAt: string,
    completedAt: string,
    duration: number,
    provider: string,
    model: string,
    dryRun: boolean
  }
}
```

## Discord Notifications

ShadowFlower supports sending notifications to Discord via webhooks for moderation events and admin alerts.

### Discord Setup

1. Create a Discord webhook in your server settings
2. Set the `DISCORD_WEBHOOK_URL` environment variable
3. Optionally set channel IDs for different notification types

### Notification Types

The Discord adapter supports sending structured messages for:

- **Moderation Batch Completed**: Summary of batch processing results
- **Moderation Batch Failed**: Error notifications for failed batches
- **High-Risk Escalation**: Notifications for items requiring immediate attention
- **Admin Escalation**: Notifications requiring admin intervention
- **Digest Summary**: Periodic summaries of moderation activity

### Usage

```typescript
import { DiscordNotifier } from '../notifications';

const notifier = new DiscordNotifier({
  webhookUrl: process.env['DISCORD_WEBHOOK_URL'] || '',
});

await notifier.notifyBatchCompleted({
  jobId: 'job-123',
  itemsProcessed: 10,
  itemsApproved: 8,
  itemsReviewed: 2,
  itemsEscalated: 0,
  duration: 1500,
});
```

### Configuration

Environment variables for Discord notifications:

- `DISCORD_WEBHOOK_URL`: Discord webhook URL (required for notifications)
- `DISCORD_ALERT_CHANNEL_ID`: Channel for alert notifications
- `DISCORD_DIGEST_CHANNEL_ID`: Channel for digest summaries
- `DISCORD_ADMIN_CHANNEL_ID`: Channel for admin escalations

## Discord Bot/App Integration

ShadowFlower can also operate as a Discord bot/app for private moderator/admin use, allowing trusted moderators to interact with ShadowFlower from Discord.

### Discord Bot Features

**Slash Commands Only:**
- `/shadowflower status` - Service health status
- `/shadowflower queue` - Moderation queue summary
- `/shadowflower summary <report_id>` - AI advisory summary for a specific report
- `/shadowflower review <report_id>` - Mark report as reviewed
- `/shadowflower dismiss <report_id>` - Dismiss a report
- `/shadowflower escalate <report_id>` - Escalate report for admin review

**Security Features:**
- Discord signature verification (Ed25519) for all interactions
- Permission allowlists (guild, channel, role, user restrictions)
- Redis replay protection for duplicate interactions
- Ephemeral responses for sensitive commands
- No general chatbot behavior or message listening

### Discord Bot Setup

1. **Create Discord Application:**
   - Go to [Discord Developer Portal](https://discord.com/developers/applications)
   - Create a new application
   - Enable bot functionality
   - Copy Application ID, Public Key, and Bot Token

2. **Configure Environment Variables:**
   ```bash
   DISCORD_APPLICATION_ID=your_application_id
   DISCORD_PUBLIC_KEY=your_public_key
   DISCORD_BOT_TOKEN=your_bot_token
   DISCORD_ALLOWED_GUILD_ID=your_guild_id
   DISCORD_ALLOWED_CHANNEL_IDS=channel_id_1,channel_id_2
   DISCORD_ALLOWED_ROLE_IDS=role_id_1,role_id_2
   DISCORD_ALLOWED_USER_IDS=user_id_1,user_id_2
   ```

3. **Set Interaction Endpoint:**
   - In Discord Developer Portal, set the interaction URL to:
   - `https://your-shadowflower-url.vercel.app/api/discord/interactions`

4. **Register Slash Commands:**
   - Use Discord API to register slash commands
   - Configure command permissions for restricted access

### Discord Bot Configuration

Environment variables for Discord bot:

- `DISCORD_APPLICATION_ID`: Discord Application ID (required for slash commands)
- `DISCORD_PUBLIC_KEY`: Discord Public Key (required for signature verification)
- `DISCORD_BOT_TOKEN`: Discord Bot Token (required for bot functionality)
- `DISCORD_ALLOWED_GUILD_ID`: Restrict bot to specific guild (recommended)
- `DISCORD_ALLOWED_CHANNEL_IDS`: Comma-separated channel IDs for command access
- `DISCORD_ALLOWED_ROLE_IDS`: Comma-separated role IDs for command access
- `DISCORD_ALLOWED_USER_IDS`: Comma-separated user IDs for admin override

### Security Model

**Discord Signature Verification:**
- All Discord interactions verified using Ed25519 public key
- Rejects unsigned or invalid signatures
- Prevents replay attacks with Redis nonce tracking

**Permission Enforcement:**
- Server-side validation of guild, channel, role, and user permissions
- Rejects unauthorized command attempts
- Configurable allowlists for fine-grained access control

**Command Safety:**
- Read-mostly operations (status, queue, summary)
- Low-risk state changes (review, dismiss, escalate) only if supported by GameDin
- No destructive actions (deletion, banning, account mutations)
- Human review central - GameDin remains source of truth

**Response Behavior:**
- Ephemeral responses for sensitive moderation commands
- Minimal output to avoid leaking internal state
- Report IDs, status, and AI summaries presented cleanly

### Current Limitations

**Discord Bot (v1):**
- Slash command handlers are placeholders with TODO comments
- GameDin integration for commands not yet implemented
- Proper Ed25519 verification needs `@noble/ed25519` library (currently using HMAC fallback)
- Role-based permission checking requires Discord API calls (not yet implemented)
- Commands return "not yet implemented" messages

**What Requires Implementation:**
- Integrate slash commands with GameDin client patterns
- Install `@noble/ed25519` for proper signature verification
- Implement Discord API calls for role-based permission checking
- Add command cooldowns and rate limiting
- Implement proper error handling for GameDin integration failures

## Security Model

### Private Service Posture

ShadowFlower is designed as a **private backend service**, not a public website:

- **Root endpoint**: Returns 404 (no public UI exposed)
- **Health endpoint**: Minimal and safe, no sensitive information
- **Job endpoints**: Require server-to-server authentication
- **Admin endpoints**: Require admin key, return 404 if invalid to avoid revealing endpoints
- **No public frontend**: ShadowFlower has no user-facing interface

### Vercel Deployment Privacy

On Vercel Hobby tier:
- Deployments are not password-protected by default
- Service relies on API key authentication for security
- Root endpoint returns 404 to avoid revealing service information
- CORS is restricted to specific origins via ALLOWED_ORIGIN

**Important**: Do not expose sensitive information in health endpoints or error responses.

### API Key Management

- **ShadowFlower API Key**: Authenticates requests to ShadowFlower
- **GameDin API Key**: Authenticates ShadowFlower requests to GameDin
- **Provider API Keys**: AI provider authentication (Gemini, etc.)

### Security Rules

1. **Never commit secrets** to version control
2. **Use different keys** for different environments
3. **Rotate keys regularly** and monitor usage
4. **Server-to-server only** - no user session dependencies
5. **Rate limiting** and request validation
6. **Minimal logging** of sensitive data
7. **CORS restriction** - configure ALLOWED_ORIGIN for production
8. **Private service posture** - root returns 404, no public UI
9. **Admin gate** - use SHADOWFLOWER_ADMIN_KEY for admin endpoints
10. **Never expose secrets** in logs, errors, or responses

### Current Limitations

- **Rate limiting** is in-memory only (resets on function restart)
- **Provider integration** not validated against real AI provider APIs
- **GameDin client** not tested against actual GameDin endpoints
- **Security middleware** requires proper environment configuration
- **Discord notifications** not integrated into moderation pipeline yet

## Provider Configuration

### Gemini Provider

```typescript
// Configuration
{
  apiKey: string,
  model: 'gemini-1.5-pro' | 'gemini-1.5-flash' | 'gemini-pro',
  timeout: number,
  maxRetries: number
}
```

### Adding New Providers

1. Implement `IModerationProvider` interface
2. Add to provider registry
3. Configure environment variables
4. Update documentation

## Monitoring and Debugging

### Health Checks

The `/api/health` endpoint provides:

- Service status
- GameDin connectivity
- Provider connectivity
- Uptime and version info

### Logging

- Request/response logging with unique IDs
- Error tracking and context
- Performance metrics
- Security events

### Job Tracking

Each moderation job includes:

- Unique job ID
- Start/end timestamps
- Processing duration
- Provider used
- Results summary

## Contributing

### Development Guidelines

1. **Keep it simple** - prefer explicit over clever
2. **Type safety** - all TypeScript code strictly typed
3. **Security first** - never expose secrets or bypass auth
4. **Test locally** - verify endpoints before deploying
5. **Document changes** - update README and type definitions

### Pull Request Process

1. Fork and create feature branch
2. Implement changes with tests
3. Update documentation
4. Submit PR with clear description
5. Address review feedback

## Future Roadmap

### v1.1
- Additional AI providers (OpenAI, Anthropic)
- Enhanced rate limiting
- Job scheduling/cron support
- Metrics and analytics

### v1.2
- Multi-tenant support
- Advanced filtering options
- Batch optimization
- Provider failover

### v2.0
- Real-time streaming
- Custom rule engine
- Advanced analytics
- Multi-region deployment

## Support

### Issues and Bugs

- Check environment variables
- Review API key configuration
- Test with dry-run mode first
- Check Vercel function logs

### Security Issues

Report security vulnerabilities through private channels only. Do not open public issues for security matters.

---

**License**: MIT License  
**Version**: 1.0.0  
**Status**: Development scaffold - requires testing and validation before production deployment
