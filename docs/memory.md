# ShadowFlower System Memory

## System Architecture Summary

ShadowFlower is a backend moderation and trust/safety service for GameDin.xyz, designed as a lightweight, secure, server-to-server moderation worker.

### Active Components and Roles

- **Provider Abstraction Layer**: Manages AI providers (Gemini, future providers)
- **GameDin Client**: HTTP wrapper for server-to-server communication with GameDin
- **Moderation Pipeline**: Orchestrates batch processing and job execution
- **Security Layer**: Handles authentication, rate limiting, and request validation
- **API Routes**: RESTful endpoints for health checks and job management
- **Configuration Management**: Environment-based service configuration

### Core Responsibilities

1. **Content Analysis**: Fetches moderation items from GameDin and analyzes them using AI providers
2. **Advisory Generation**: Creates structured recommendations for human moderators
3. **Batch Processing**: Handles configurable batch sizes with proper error handling
4. **Secure Communication**: Maintains server-to-server authentication with GameDin
5. **Health Monitoring**: Provides service status and connectivity information

### Constraints and Invariants

- **No User-Facing Features**: ShadowFlower is strictly a backend service
- **Advisory Only**: Never performs autonomous destructive actions (bans, deletions)
- **Server-to-Server Only**: No user session dependencies or direct user interactions
- **Root Deployment**: Designed for Vercel deployment from repository root
- **Provider Agnostic**: Must support multiple AI providers through abstraction layer

### Key Assumptions

- GameDin provides private API endpoints for moderation queue access
- AI providers return structured, parseable responses
- Environment variables contain all necessary configuration
- Vercel serverless functions can handle the required processing time
- Network connectivity between ShadowFlower and GameDin is reliable

### Integration Points

- **GameDin API**: Moderation queue fetching and advisory result posting
- **AI Providers**: Content analysis and classification
- **Vercel Platform**: Serverless function deployment and scaling
- **Monitoring Systems**: Health checks and error tracking

### Security Model

- **API Key Authentication**: Separate keys for ShadowFlower and GameDin communication
- **Rate Limiting**: Prevents abuse and ensures fair usage
- **Request Validation**: All inputs validated and sanitized
- **Minimal Logging**: No sensitive data logged, security events tracked

### Performance Characteristics

- **Batch Processing**: Configurable batch sizes (default: 10 items)
- **Timeout Management**: Provider timeouts and retry logic
- **Error Isolation**: Failed items don't block entire batches
- **Graceful Degradation**: Service continues operating with partial failures

## Current State

The system is a development scaffold requiring testing and validation before production deployment:
- TypeScript implementation builds cleanly
- Vercel deployment structure configured for root deployment
- Comprehensive documentation
- Security middleware with API key authentication
- Provider abstraction with Gemini implementation (untested with real API)
- Full API surface (health, job execution, dry-run)
- Rate limiting is in-memory only (not production-grade)
- CORS configuration requires ALLOWED_ORIGIN environment variable

**Known Limitations:**
- Provider integration not validated against real AI provider APIs
- GameDin client not tested against actual GameDin endpoints
- In-memory rate limiting resets on function restart
- Security middleware requires proper environment configuration
